'use babel';

import { _ } from 'lodash';
import { Point } from 'atom';
import { Dictionary } from './Dictionary';
import { JavaClassReader } from './JavaClassReader';
import ioUtil from './ioUtil';
import javaUtil from './javaUtil';

//let dict = Symbol('dict');

export class JavaAutocompleteProvider {

  constructor() {
    this.dict = new Dictionary();
    this.classpath = '.';
    // settings for autocomplete-plus
    this.selector = '.source.java';
    this.disableForSelector = '.source.java .comment';
  }

  configure(config) {
    // settings for autocomplete-plus
    this.inclusionPriority = config.inclusionPriority;
    this.excludeLowerPriority = config.excludeLowerPriority;
  }

  loadClassDescription(className, loadClassMembers) {
    let classReader = new JavaClassReader(loadClassMembers, true);
    return classReader.readClass(this.classpath, className,
    (classpath, className, classMembers) => {
      return this._addClassDescription(className, classMembers, Date.now());
    });
  }

  loadClassDesciptions(rootDir, loadClassMembers) {
    if (!this.loading) {
      console.log('autocomplete-java load start');
      this.loading = true;
      this.dict = new Dictionary();

      // Load basic class descriptions
      return this._loadClassDesciptionsImpl(false, rootDir)
      .then(() => {
        // Optionally load class members
        if (loadClassMembers) {
          return this._loadClassDesciptionsImpl(true, rootDir);
        }
      }).then(() => {
        // Loading finished
        this.loading = false;
        console.log('autocomplete-java load end');
      });
    } else {
      return Promise.resolve();
    }
  }

  _loadClassDesciptionsImpl(loadClassMembers, rootDir) {
    let classReader = new JavaClassReader(loadClassMembers, true);

    // Load classpath from .classpath file
    return ioUtil.readFile(rootDir + '/.classpath', 'utf8')
    .then(classpath => {
      // Load project classes using classpath
      this.classpath = classpath = classpath.replace(/\./g, rootDir + '/.').trim();
      console.log('autocomplete-java loading project classes. loadMembers: ' +
        loadClassMembers);
      return classReader.readClasses(
        classpath.trim(), (classpath, className, classMembers) => {
          return this._addClassDescription(className, classMembers,
            classpath.indexOf('.jar') !== -1 ? 0 : 2);
      });
    }).then(() => {
      // Determine location of rt.jar
      return ioUtil.exec("java -verbose 2>/dev/null | sed -ne '1 s/\\[Opened \\(.*\\)\\]/\\1/p'")
    }).then((rtJarPath) => {
      // Load system classes from rt.jar
      console.log('autocomplete-java loading system classes. loadMembers: ' +
        loadClassMembers);
      if (rtJarPath) {
        return classReader.readJarClasses(rtJarPath.trim(), (classpath, className, classMembers) => {
          return this._addClassDescription(className, classMembers, 1);
        }, 'grep ^java');
      }
    });
  }

  _addClassDescription(className, classMembers, lastUsed) {
    let simpleName = javaUtil.getSimpleName(className);
    let inverseName = javaUtil.getInverseName(className);
    let classDesc = {
      type: 'class',
      name: simpleName,
      simpleName: simpleName,
      className: className,
      lastUsed: lastUsed || 0
    };
    this.dict.add('class', className, classDesc);
    this.dict.add('class', inverseName, classDesc);
    // TODO remove existing member descriptions
    _.each(classMembers, prototype => {
      this._addClassMemberDescription(className, prototype, lastUsed);
    });
    return Promise.resolve();
  }

  _addClassMemberDescription(className, prototype, lastUsed) {
    let simpleName = javaUtil.getSimpleName(className);
    try {
      prototype = prototype.replace('public','').replace('static','')
        .replace(/,\s/g, ',').trim();
      // Skipping constructors for now...
      if (prototype.indexOf(className) === -1) {
        let key = (prototype.match(/\s([^\s]*\(.*\));/) || prototype.match(/\s([^\s]*);/))[1];
        let name =  prototype.match(/\s([^\(\s]*)[\(;]/)[1];
        let isMethod = prototype.indexOf('(') !== -1;
        this.dict.add(className, key, {
          type: isMethod ? 'method' : 'property',
          name: name,
          simpleName: simpleName,
          className: className,
          lastUsed: lastUsed || 0,
          member: {
            name: name,
            returnType: prototype.match(/^(.*)\s/)[1],
            params: isMethod ? prototype.match(/\((.*)\)/)[1].split(',') : null,
            prototype: prototype
          }
        });
      }
    } catch (err) {
      console.warn(err);
    }
  }

  // autocomplete-plus
  getSuggestions({editor, bufferPosition, scopeDescriptor,
      prefix, activatedManually}) {
    let results = null;
    let longPrefix = javaUtil.getFullName(editor, bufferPosition);
    let findClassMember = javaUtil.isClassMemberName(longPrefix);
    let isFullClassNamePrefix = findClassMember ? longPrefix.match(/\..*\./) : longPrefix.match(/\./);
    if (findClassMember) {
      // Find member of a class
      let classSimpleName = longPrefix.substring(0,
        longPrefix.lastIndexOf('.'));
      let className = javaUtil.inferClassName(editor, classSimpleName);
      results = this.dict.find(className, prefix.replace('.', ''));
    } else {
      // Find class
      results = this.dict.find('class', longPrefix);
    }
    // TODO do this in dictionary
    results = _.sortByOrder(results, ['lastUsed', 'key'], ['desc', 'asc']);
    return _.map(results, (desc) => {
      return {
        snippet: this._createSuggestionSnippet(desc, isFullClassNamePrefix),
        replacementPrefix: longPrefix,
        leftLabel: desc.member ? desc.member.returnType : desc.className,
        type: desc.type,
        desc: desc
      };
    });
  }

  _createSuggestionSnippet(desc, isFullClassNamePrefix) {
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
      return _.reduce(params, (result, param, index) => {
        return result + param + ', ';
      }, member.name + '(').replace(/, $/, ')');
    }
  }

  // autocomplete-plus
  onDidInsertSuggestion({editor, triggerPosition, suggestion}) {
    if (suggestion.type === 'class') {
      // Add import statement if it does not already exist
      // and simple class name was used as a completion text
      if (suggestion.snippet.indexOf('.') === -1 &&
          !suggestion.desc.className.startsWith('java.lang.') &&
          !javaUtil.getImportClassName(editor, suggestion.desc.className)) {
        editor.getBuffer().insert(new Point(2,0),
          'import ' + suggestion.desc.className + ';\n');
      }
    }
    // TODO do this in dictionary
    suggestion.desc.lastUsed = Date.now();
  }

}
