'use babel';

import { _ } from 'lodash';
import { Point } from 'atom';
import { Dictionary } from './Dictionary';
import { JavaClassReader } from './JavaClassReader';
import atomUtil from './atomUtil';
import ioUtil from './ioUtil';
import javaUtil from './javaUtil';

//let dict = Symbol('dict');

export class JavaAutocompleteProvider {

  constructor() {
    this.dict = new Dictionary();

    // settings for autocomplete-plus
    this.selector = '.source.java';
    this.disableForSelector = '.source.java .comment';
    this.inclusionPriority = 1;
    this.excludeLowerPriority = false;
  }

  loadSuggestions(loadClassMembers) {
    if (!this.loading) {
      console.log('autocomplete-java load start');
      this.loading = true;
      this.dict = new Dictionary();

      // Load basic descriptions
      this._loadSuggestionsImpl(false)
      .then(() => {
        // Load class members if requested
        if (loadClassMembers) return this._loadSuggestionsImpl(true);
      }).then(() => {
        // Loading finished
        this.loading = false;
        console.log('autocomplete-java load end');
      });
    } else {
      return Promise.resolve();
    }
  }

  _loadSuggestionsImpl(loadClassMembers) {
    let classReader = new JavaClassReader(loadClassMembers, true);
    let rootDir = atomUtil.getProjectRootDir();

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
      member = member.replace('public','');
      let memberName = (member.match(/\s[^\s]*;/g) || [''])[0].trim();
      //console.log(className + ' ' + simpleName + ' ' + memberName);
      this.dict.add(className, memberName, {
        snippet: memberName, // TODO params as snippet: ${1:Object object}
        type: memberName.indexOf('(') !== -1 ? 'method' : 'property',
        leftLabel: (member.match(/^.*\s/g) || [''])[0].trim()
      });
    });
    return Promise.resolve(className);
  }

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
      results = this.dict.find(className, prefix);
    } else {
      // Find class
      results = this.dict.find('class', longPrefix);
    }
    return _.each(_.cloneDeep(results), (desc) => {
      desc.replacementPrefix = (desc.type === 'class' ? longPrefix : prefix);
    });
  }

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
