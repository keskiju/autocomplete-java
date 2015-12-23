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
    this.classReader = null;
    this.dict = new Dictionary();

    // settings for autocomplete-plus
    this.selector = '.source.java';
    this.disableForSelector = '.source.java .comment';
    this.inclusionPriority = 1;
    this.excludeLowerPriority = false;
  }

  loadSuggestions(fetchMembers) {
    if (!this.loading) {
      console.log('autocomplete-java load start');
      this.loading = true;
      this.classReader = new JavaClassReader(fetchMembers);
      this.dict = new Dictionary();

      // Load system classes
      this.loadSystemClass('java.lang.Object');
      this.loadSystemClass('java.lang.String');
      this.loadSystemClass('java.lang.Long');
      this.loadSystemClass('java.lang.Integer');
      this.loadSystemClass('java.util.ArrayList');
      this.loadSystemClass('java.util.Map');
      this.loadSystemClass('java.util.Set');

      // Load project classes
      let rootDir = this.getProjectRootDir();

      return ioUtil.readFile(rootDir + '/.classpath', 'utf8')
      .then(data => {
        let serialPromise = Promise.resolve();
        if (data) {
          serialPromise = serialPromise.then(() => {
            return this.classReader.readClasses(
              data.replace(/\s/g, ''), rootDir, (className, classMembers) => {
                return this.addClassDescription(className, classMembers);
            });
          });
        }
        return serialPromise;
      }).then(() => {
        this.loading = false;
        console.log('autocomplete-java load end');
      });
    } else {
      return Promise.resolve();
    }
  }

  loadSystemClass(className) {
    this.classReader.readClass('.', className,
    (className, classMembers) => {
      return this.addClassDescription(className, classMembers);
    });
  }

  getProjectRootDir() {
    let textEditor = atom.workspace.getActiveTextEditor();
    return atom.project.getPaths().sort((a, b) => {
      return (b.length - a.length)
    }).find((p) => {
      let realpath = fs.realpathSync(p);
      return textEditor.getPath().substr(0, realpath.length) == realpath;
    });
  }

  addClassDescription(className, classMembers) {
    let simpleName = javaUtil.getSimpleName(className);
    let classDesc = {
      text: simpleName,
      type: 'class',
      rightLabel: className
    };
    this.dict.add('class', simpleName, classDesc);
    this.dict.add('class', className, classDesc);
    _.each(classMembers, member => {
      member = member.replace('public','');
      let memberName = (member.match(/\s[^\s]*;/g) || [''])[0].trim();
      //console.log(className + ' ' + simpleName + ' ' + memberName);
      this.dict.add(className, memberName, {
        snippet: memberName,
          // 'add(${1:Object object})',
        type: 'method',
        leftLabel: (member.match(/^.*\s/g) || [''])[0].trim()
      });
    });
    return Promise.resolve(className);
  }

  getSuggestions({editor, bufferPosition, scopeDescriptor, prefix, activatedManually}) {
    let results = null;
    let fullName = javaUtil.getFullName(editor, bufferPosition);
    if (javaUtil.isClassMemberName(fullName)) {
      // Find member of a class
      let classSimpleName = fullName.substring(0, fullName.lastIndexOf('.'));
      let className = javaUtil.inferClassName(editor, classSimpleName);
      results = this.dict.find(className, prefix);
    } else {
      // Find class
      results = this.dict.find('class', fullName);
    }
    return _.cloneDeep(results);
  }

  onDidInsertSuggestion({editor, triggerPosition, suggestion}) {
    if (suggestion.type === 'class') {
      // Add import if it does not already exist and simple class name was used
      let fullName = javaUtil.getFullName(editor, triggerPosition);
      if (fullName.indexOf('.') === -1 &&
          !javaUtil.getImportClassName(editor, suggestion.rightLabel)) {
        editor.getBuffer().insert(new Point(2,0),
          'import ' + suggestion.rightLabel + ';\n');
      }
    }
  }

}
