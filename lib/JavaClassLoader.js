'use babel';

import { _ } from 'lodash';
import { Dictionary } from './Dictionary';
import { JavaClassReader } from './JavaClassReader';
import ioUtil from './ioUtil';
import javaUtil from './javaUtil';

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
    const classReader = new JavaClassReader(loadClassMembers, true);
    return classReader.readClass(classpath, className,
    (cp, cName, classMembers) => {
      return this._addClass(cName, classMembers, Date.now());
    });
  }

  loadClasses(classpath, loadClassMembers) {
    let promise = Promise.resolve();
    if (!this.loading) {
      console.log('autocomplete-java load start');
      this.loading = true;
      this.dict = new Dictionary();

      // Load basic class descriptions
      promise = this._loadClassesImpl(classpath, false)
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
    }
    return promise;
  }

  _loadClassesImpl(classpath, loadClassMembers) {
    const classReader = new JavaClassReader(loadClassMembers, true);

    console.log('autocomplete-java loading project classes. loadMembers: ' +
      loadClassMembers);
    return classReader.readClassesFromClasspath(classpath,
    (cp, className, classMembers) => {
      return this._addClass(className, classMembers,
        cp.indexOf('.jar') !== -1 ? 0 : 2);
    }).then(() => {
      // Read java system info
      return ioUtil.exec('"' + classReader.javaBinDir() +
        'java" -verbose', true);
    }).then((javaSystemInfo) => {
      // Load system classes from rt.jar
      console.log('autocomplete-java loading system classes. loadMembers: ' +
        loadClassMembers);
      const rtJarPath = (javaSystemInfo.match(/Opened (.*jar)/) || [])[1];
      let promise = null;
      if (rtJarPath) {
        promise = classReader.readClassesFromJar(rtJarPath,
        (cp, className, classMembers) => {
          return this._addClass(className, classMembers, 1);
        }, loadClassMembers ? 'java[\\/\\\\]' : 'java');
      } else {
        console.error('autocomplete-java: java system lib not found');
        promise = Promise.resolve();
      }
      return promise;
    });
  }

  _addClass(className, classMembers, lastUsed) {
    const simpleName = javaUtil.getSimpleName(className);
    const inverseName = javaUtil.getInverseName(className);
    const classDesc = {
      type: 'class',
      name: simpleName,
      simpleName: simpleName,
      className: className,
      packageName: javaUtil.getPackageName(className),
      lastUsed: lastUsed || 0,
    };
    this.dict.add('class', className, classDesc);
    this.dict.add('class', inverseName, classDesc);
    // TODO remove existing member descriptions
    _.each(classMembers, prototype => {
      this._addClassMember(className, prototype, lastUsed);
    });
    return Promise.resolve();
  }

  _addClassMember(className, member, lastUsed) {
    const simpleName = javaUtil.getSimpleName(className);
    try {
      const prototype = member.replace('public', '').replace('static', '')
        .replace(/,\s/g, ',').trim();
      // Skipping constructors for now...
      if (prototype.indexOf(className) === -1 &&
          prototype.indexOf('{') === -1) {
        const key = (prototype.match(/\s([^\s]*\(.*\));/) ||
          prototype.match(/\s([^\s]*);/))[1];
        const name = prototype.match(/\s([^\(\s]*)[\(;]/)[1];
        const isMethod = prototype.indexOf('(') !== -1;
        this.dict.add(className, key, {
          type: isMethod ? 'method' : 'property',
          name: name,
          simpleName: simpleName,
          className: className,
          packageName: javaUtil.getPackageName(className),
          lastUsed: lastUsed || 0,
          member: {
            name: name,
            returnType: prototype.match(/^(.*)\s/)[1],
            params: isMethod ? prototype.match(/\((.*)\)/)[1].split(',') : null,
            prototype: prototype,
          },
        });
      }
    } catch (err) {
      console.warn(err);
    }
  }

}
