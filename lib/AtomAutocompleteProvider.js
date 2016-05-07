'use babel';

import { _ } from 'lodash';
import atomJavaUtil from './atomJavaUtil';
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
    this.foldImports = config.foldImports;
  }

  // autocomplete-plus
  getSuggestions({editor, bufferPosition, prefix: origPrefix}) {
    // text: 'package.Class.me', prefix: 'package.Class', suffix: 'me'
    // text: 'package.Cla', prefix: 'package', suffix: 'Cla'
    // text: 'Cla', prefix: '', suffix: 'Cla'
    // line: 'new Cla', text: 'Cla', prevWord: 'new'
    const line = atomJavaUtil.getLine(editor, bufferPosition);
    const prevWord = atomJavaUtil.getPrevWord(editor, bufferPosition);
    const text = atomJavaUtil.getWord(editor, bufferPosition, true)
    .replace('@', '');
    const prefix = text.substring(0, text.lastIndexOf('.'));
    const suffix = origPrefix.replace('.', '');
    const couldBeClass = /^[A-Z]/.test(suffix) || prefix;
    let isInstance = false;

    let results = null;
    if (couldBeClass) {
      const classes = this.classLoader.findClass(text);
      if (prevWord === 'new' && classes && classes.length) {
        // Class constructor suggestions
        results = [];
        _.each(classes, classDesc => {
          _.each(classDesc.constructors, constructor => {
            results.push(constructor);
          });
        });
      } else {
        // Class suggestions
        results = classes;
      }
    }

    if ((!results || !results.length)) {
      // Find member of a class
      // TODO ugly. refactor.
      const stat = atomJavaUtil.determineClassName(editor, bufferPosition,
        text, prefix, suffix, this.prevReturnType);
      isInstance = stat.isInstance;
      _.every(stat.classNames, className => {
        // methods of this class
        results = this.classLoader.findClassMember(className, suffix) || [];
        // methods of extending classes
        let superClass = this.classLoader.findSuperClassName(className);
        while (superClass) {
          const r = this.classLoader.findClassMember(superClass, suffix);
          if (r) {
            results.push(...r);
          }
          superClass = this.classLoader.findSuperClassName(superClass);
        }
        return !results.length;
      });
    }

    // Autocomplete-plus filters all duplicates. This is a workaround for that.
    const duplicateWorkaround = {};

    // Map results to autocomplete-plus suggestions
    return _.map(results, (desc) => {
      const snippet = this._createSnippet(desc, line, prefix,
        !isInstance && desc.type !== 'constructor');
      if (!duplicateWorkaround[snippet]) {
        duplicateWorkaround[snippet] = 1;
      }
      const counter = duplicateWorkaround[snippet]++;
      const typeName = (couldBeClass ? desc.className : desc.simpleName);
      return {
        snippet: snippet + (counter > 1 ? ' (' + counter + ')' : ''),
        replacementPrefix: isInstance ? suffix : text,
        leftLabel: desc.member
        ? this._getFormattedReturnType(desc.member)
        : typeName,
        type: desc.type !== 'constructor' ? desc.type : 'method',
        desc: desc,
      };
    });
  }

  _getFormattedReturnType(member) {
    return member.visibility + ' ' + javaUtil.getSimpleName(member.returnType);
  }

  _createSnippet(desc, line, prefix, addMemberClass) {
    // TODO use full class name in case of a name conflict
    // Use full class name in case of class import or method with long prefix
    const useFullClassName =
      desc.type === 'class' ? /^import/.test(line) : prefix.indexOf('.') !== -1;
    let text = useFullClassName ? desc.className : desc.simpleName;
    if (desc.member) {
      text = (addMemberClass ? '${1:' + text + '}.' : '') +
        this._createMemberSnippet(desc.member, desc.type);
    }
    return text;
  }

  _createMemberSnippet(member, type) {
    let snippet = null;
    if (!member.params) {
      snippet = (type === 'property')
        ? member.name : member.name + '()';
    } else {
      let index = 2;
      const params = _.map(member.params, (param) => {
        return '${' + (index++) + ':' + javaUtil.getSimpleName(param) + '}';
      });
      snippet = _.reduce(params, (result, param) => {
        return result + param + ', ';
      }, member.name + '(').replace(/, $/, ')');
      snippet = snippet + '${' + index + ':}';
    }
    return snippet;
  }

  // autocomplete-plus
  onDidInsertSuggestion({editor, suggestion}) {
    if (suggestion.type === 'class') {
      // Add import statement if simple class name was used as a completion text
      if (suggestion.snippet.indexOf('.') === -1) {
        atomJavaUtil.importClass(editor, suggestion.desc.className,
          this.foldImports);
      }
    } else if (suggestion.desc.member) {
      // Save snippet return type for later use (type determination)
      this.prevReturnType = suggestion.desc.member.returnType;
    }
    this.classLoader.touch(suggestion.desc);
  }

}
