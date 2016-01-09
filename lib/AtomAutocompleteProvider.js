'use babel';

import { _ } from 'lodash';
import atomJavaUtil from './atomJavaUtil';

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
  getSuggestions({editor, bufferPosition, prefix: origPrefix}) {
    // text: 'package.Class.me', prefix: 'package.Class', suffix: 'me'
    // text: 'package.Cla', prefix: 'package', suffix: 'Cla'
    // text: 'Cla', prefix: '', suffix: 'Cla'
    const line = atomJavaUtil.getLine(editor, bufferPosition);
    const text = atomJavaUtil.getWord(editor, bufferPosition, true);
    const prefix = text.substring(0, text.lastIndexOf('.'));
    const suffix = origPrefix.replace('.', '');
    const couldBeClass = /^[A-Z]/.test(suffix) || prefix;
    let isInstance = false;

    let results = null;
    if (couldBeClass) {
      // Find class
      results = this.classLoader.findClass(text);
    }

    if ((!results || !results.length) && prefix) {
      // Find member of a class
      const stat = atomJavaUtil.determineClassName(editor, bufferPosition,
        text, prefix, suffix, this.prevReturnType);
      isInstance = stat.isInstance;
      _.each(stat.classNames, className => {
        if (!results || !results.length) {
          results = this.classLoader.findClassMember(className, suffix);
        }
      });
    }

    // Autocomplete-plus filters all duplicates. This is a workaround for that.
    const duplicateWorkaround = {};

    // Map results to autocomplete-plus suggestions
    return _.map(results, (desc) => {
      const snippet = this._createSnippet(desc, line, prefix, !isInstance);
      if (!duplicateWorkaround[snippet]) {
        duplicateWorkaround[snippet] = 1;
      }
      const counter = duplicateWorkaround[snippet]++;
      return {
        snippet: snippet + (counter > 1 ? ' (' + counter + ')' : ''),
        replacementPrefix: isInstance ? suffix : text,
        leftLabel: desc.member ? desc.member.returnType : desc.className,
        type: desc.type,
        desc: desc,
      };
    });
  }

  _createSnippet(desc, line, prefix, addMemberClass) {
    // TODO use full class name in case of a name conflict
    // Use full class name in case of class import or method with long prefix
    const useFullClassName =
      desc.type === 'class' ? /^import/.test(line) : prefix.indexOf('.') !== -1;
    let text = useFullClassName ? desc.className : desc.simpleName;
    if (desc.member) {
      text = (addMemberClass ? '${1:' + text + '}.' : '') +
        this._createMemberSnippet(desc.member);
    }
    return text;
  }

  _createMemberSnippet(member) {
    let snippet = null;
    if (!member.params) {
      snippet = member.name;
    } else {
      const params = _.map(member.params, (param, index) => {
        return '${' + (index + 2) + ':' + param + '}';
      });
      snippet = _.reduce(params, (result, param) => {
        return result + param + ', ';
      }, member.name + '(').replace(/, $/, ')');
    }
    return snippet;
  }

  // autocomplete-plus
  onDidInsertSuggestion({editor, suggestion}) {
    if (suggestion.type === 'class') {
      // Add import statement if simple class name was used as a completion text
      if (suggestion.snippet.indexOf('.') === -1) {
        atomJavaUtil.importClass(editor, suggestion.desc.className);
      }
    } else if (suggestion.desc.member) {
      // Save snippet return type for later use (type determination)
      this.prevReturnType = suggestion.desc.member.returnType;
    }
    this.classLoader.touch(suggestion.desc);
  }

}
