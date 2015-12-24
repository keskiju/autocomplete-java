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
    // settings for autocomplete-plus
    this.selector = '.source.java';
    this.disableForSelector = '.source.java .comment';
  }

  configure(config) {
    // settings for autocomplete-plus
    this.inclusionPriority = config.inclusionPriority;
    this.excludeLowerPriority = config.excludeLowerPriority;
  }

  loadClassDesciptions(loadClassMembers, rootDir) {
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
      console.log('autocomplete-java loading project classes. loadMembers: ' +
        loadClassMembers);
      return classReader.readClasses(
        classpath.trim(), rootDir, (className, classMembers) => {
          return this._addClassDescription(className, classMembers, loadClassMembers);
      });
    }).then(() => {
      // Determine location of rt.jar
      return ioUtil.exec("java -verbose 2>/dev/null | sed -ne '1 s/\\[Opened \\(.*\\)\\]/\\1/p'")
    }).then((rtJarPath) => {
      // Load system classes from rt.jar
      console.log('autocomplete-java loading system classes. loadMembers: ' +
        loadClassMembers);
      if (rtJarPath) {
        return classReader.readJarClasses(rtJarPath.trim(), (className, classMembers) => {
          return this._addClassDescription(className, classMembers, loadClassMembers);
        }, 'grep ^java');
      }
    });
  }

  _addClassDescription(className, classMembers, addMembersOnly) {
    let simpleName = javaUtil.getSimpleName(className);
    let inverseName = javaUtil.getInverseName(className);
    if (!addMembersOnly) {
      this.dict.add('class', inverseName, {
        text: simpleName,
        type: 'class',
        leftLabel: className,
        className: className
      });
      this.dict.add('class', className, {
        text: className,
        type: 'class',
        className: className
      });
    }
    _.each(classMembers, member => {
      member = member.replace('public','').replace(/,\s/g, ',').trim();
      let memberName = (member.match(/\s[^\s]*;/g) || [''])[0].trim();
      // Skipping constructors for now...
      if (!memberName.startsWith(className)) {
        let isMethod = memberName.indexOf('(') !== -1;
        this.dict.add(className, memberName, {
          snippet: isMethod ? this._createSnippet(memberName) : memberName,
          type: isMethod ? 'method' : 'property',
          leftLabel: (member.match(/^.*\s/g) || [''])[0].trim()
        });
      }
    });
    return Promise.resolve(className);
  }

  _createSnippet(methodPrototype) {
    let params = this._createSnippetParams(methodPrototype);
    if (!params.length) {
      return methodPrototype;
    } else {
      return _.reduce(params, (result, param, index) => {
        return result + param + ', ';
      }, methodPrototype.match(/^.*\(/g)[0]).replace(/, $/, ')');
    }
  }

  _createSnippetParams(methodPrototype) {
    // Create array of snippet params e.g.
    // [ '${1:java.lang.String}', '${2:java.lang.Long}' ]
    let params = [];
    let paramsStr = methodPrototype.match(/\((.*)\)/)[1];
    if (paramsStr) {
      params = _.map(paramsStr.split(','), (param, index) => {
        return '${' + (index+1) + ':' + param + '}';
      });
    }
    return params;
  }

  // autocomplete-plus
  getSuggestions({editor, bufferPosition, scopeDescriptor,
      prefix, activatedManually}) {
    let results = null;
    let longPrefix = javaUtil.getFullName(editor, bufferPosition);
    let findClassMember = javaUtil.isClassMemberName(longPrefix);
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
    return _.each(_.cloneDeep(results), (desc) => {
      if (desc.type === 'class') {
        desc.replacementPrefix = longPrefix;
      } else if (prefix === '.') {
        desc.text = '.' + desc.text;
      }
    });
  }

  // autocomplete-plus
  onDidInsertSuggestion({editor, triggerPosition, suggestion}) {
    if (suggestion.type === 'class') {
      // Add import statement if it does not already exist
      // and simple class name was used as a completion text
      if (suggestion.text.indexOf('.') === -1 &&
          !suggestion.className.startsWith('java.lang.') &&
          !javaUtil.getImportClassName(editor, suggestion.className)) {
        editor.getBuffer().insert(new Point(2,0),
          'import ' + suggestion.className + ';\n');
      }
    }
  }

}
