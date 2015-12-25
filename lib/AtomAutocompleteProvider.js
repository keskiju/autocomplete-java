'use babel';

import { _ } from 'lodash';
import javaUtil from './javaUtil';

export class AtomAutocompleteProvider {

  constructor(classLoader) {
    this.classLoader = classLoader;

    // settings for autocomplete-plus
    this.selector = '.source.java';
    this.disableForSelector = '.source.java .comment';
  }

  configure(config) {
    // settings for autocomplete-plus
    this.inclusionPriority = config.inclusionPriority;
    this.excludeLowerPriority = config.excludeLowerPriority;
  }

  // autocomplete-plus
  getSuggestions({editor, bufferPosition, scopeDescriptor,
      prefix, activatedManually}) {
    let results = null;
    // TODO
    let longPrefix = javaUtil.getFullName(editor, bufferPosition);
    let findClassMember = javaUtil.isClassMemberName(longPrefix);
    let isFullClassNamePrefix = findClassMember ?
      /\..*\./.test(longPrefix) : /\./.test(longPrefix);
    if (findClassMember) {
      // Find member of a class
      let classSimpleName = longPrefix.substring(0,
        longPrefix.lastIndexOf('.'));
      let className = javaUtil.inferClassName(editor, classSimpleName);
      results = this.classLoader.findClassMember(className, prefix.replace('.', ''));
    } else if (/^[A-Z]/.test(prefix) || longPrefix.indexOf('.') !== -1) {
      // Find class
      results = this.classLoader.findClass(longPrefix);
    }
    return _.map(results, (desc) => {
      return {
        snippet: this._createSnippet(desc, isFullClassNamePrefix),
        replacementPrefix: longPrefix,
        leftLabel: desc.member ? desc.member.returnType : desc.className,
        type: desc.type,
        desc: desc
      };
    });
  }

  _createSnippet(desc, isFullClassNamePrefix) {
    let text = isFullClassNamePrefix ? desc.className : desc.simpleName;
    if (desc.member) {
      text = '${1:' + text + '}.' + this._createMemberSnippet(desc.member);
    }
    return text;
  }

  _createMemberSnippet(member) {
    if (!member.params) {
      return member.name;
    } else {
      let params = _.map(member.params, (param, index) => {
        return '${' + (index+2) + ':' + param + '}';
      });
      return _.reduce(params, (result, param) => {
        return result + param + ', ';
      }, member.name + '(').replace(/, $/, ')');
    }
  }

  // autocomplete-plus
  onDidInsertSuggestion({editor, triggerPosition, suggestion}) {
    if (suggestion.type === 'class') {
      // Add import statement if it does not already exist
      // and simple class name was used as a completion text.
      // And java.lang.* classes need not be imported.
      if (suggestion.snippet.indexOf('.') === -1 &&
          !suggestion.desc.className.startsWith('java.lang.') &&
          !javaUtil.getImportClassName(editor, suggestion.desc.className)) {
        this.organizeImports(editor, 'import ' + suggestion.desc.className+';');
      }
    }
    this.classLoader.touch(suggestion.desc);
  }

  organizeImports(editor, newImport) {
    let buffer = editor.getBuffer();
    buffer.transact(() => {
      // Get current imports
      let imports = buffer.getText().match(/import\s.*;/g) || [];
      if (newImport) {
        imports.push(newImport);
      }
      // Remove current imports
      buffer.replace(/import\s.*;[\r\n]+/g, '');
      // Add sorted imports
      buffer.insert([1,0], '\n');
      _.each(_.sortBy(imports), (value,index) => {
        buffer.insert([index+2,0], value + '\n');
      });
    });
  }

}
