'use babel';

import { _ } from 'lodash';
import { Dictionary } from './Dictionary';
import { JavaClassReader } from './JavaClassReader';
import ioUtil from './ioUtil';
import javaUtil from './javaUtil';

//let dict = Symbol('dict');

export class JavaClassLoader {

  constructor() {
    this.dict = new Dictionary();
  }

  findClass(namePrefix) {
    return this.dict.find('class', namePrefix);
  }

  findClassMember(className, namePrefix) {
    return this.dict.find(className, namePrefix);
  }

  touch(classDesc) {
    this.dict.touch(classDesc);
  }

  loadClass(className, classpath, loadClassMembers) {
    let classReader = new JavaClassReader(loadClassMembers, true);
    return classReader.readClass(classpath, className,
    (classpath, className, classMembers) => {
      return this._addClass(className, classMembers, Date.now());
    });
  }

  loadClasses(classpath, loadClassMembers) {
    if (!this.loading) {
      console.log('autocomplete-java load start');
      this.loading = true;
      this.dict = new Dictionary();

      // Load basic class descriptions
      return this._loadClassesImpl(classpath, false)
      .then(() => {
        // Optionally load class members
        if (loadClassMembers) {
          return this._loadClassesImpl(classpath, true);
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

  _loadClassesImpl(classpath, loadClassMembers) {
    let classReader = new JavaClassReader(loadClassMembers, true);

    console.log('autocomplete-java loading project classes. loadMembers: ' +
      loadClassMembers);
    return classReader.readClassesFromClasspath(classpath, (classpath, className, classMembers) => {
        return this._addClass(className, classMembers,
          classpath.indexOf('.jar') !== -1 ? 0 : 2);
    }).then(() => {
      // Determine location of rt.jar
      return ioUtil.exec("java -verbose 2>/dev/null | sed -ne '1 s/\\[Opened \\(.*\\)\\]/\\1/p'")
    }).then((rtJarPath) => {
      // Load system classes from rt.jar
      console.log('autocomplete-java loading system classes. loadMembers: ' +
        loadClassMembers);
      if (rtJarPath) {
        return classReader.readClassesFromJar(rtJarPath.trim(), (classpath, className, classMembers) => {
          return this._addClass(className, classMembers, 1);
        }, 'grep ^java');
      }
    });
  }

  _addClass(className, classMembers, lastUsed) {
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
      this._addClassMember(className, prototype, lastUsed);
    });
    return Promise.resolve();
  }

  _addClassMember(className, prototype, lastUsed) {
    let simpleName = javaUtil.getSimpleName(className);
    try {
      prototype = prototype.replace('public','').replace('static','')
        .replace(/,\s/g, ',').trim();
      // Skipping constructors for now...
      if (prototype.indexOf(className) === -1 && prototype.indexOf('{') === -1) {
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

}
