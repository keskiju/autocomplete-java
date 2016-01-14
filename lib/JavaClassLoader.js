'use babel';

import { _ } from 'lodash';
import { Dictionary } from './Dictionary';
import { JavaClassReader } from './JavaClassReader';
import ioUtil from './ioUtil';
import javaUtil from './javaUtil';

export class JavaClassLoader {

  constructor(javaHome) {
    this.javaHome = javaHome;
    this.dict = new Dictionary();
  }

  setJavaHome(javaHome) {
    this.javaHome = javaHome;
  }

  findClass(namePrefix) {
    return this.dict.find('class', namePrefix);
  }

  findClassMember(className, namePrefix) {
    return this.dict.find(className, namePrefix);
  }

  touchClass(className) {
    const classDescs = this.findClass(className);
    if (classDescs.length) {
      this.touch(classDescs[0]);
    }
  }

  touch(classDesc) {
    this.dict.touch(classDesc);
  }

  loadClass(className, classpath, loadClassMembers) {
    console.log('autocomplete-java load class: ' + className);
    const classReader = new JavaClassReader(loadClassMembers, true,
      this.javaHome);
    return classReader.readClassesByName(classpath, [ className ],
    (cp, cName, classMembers) => {
      return this._addClass(cName, classMembers, Date.now());
    });
  }

  loadClasses(classpath, loadClassMembers, fullRefresh) {
    let promise = null;
    if (fullRefresh && this.fullRefreshOngoing) {
      // TODO reject promise on warning and notify about warning afterwards
      atom.notifications.addWarning('autocomplete-java:\n ' +
        'Full refresh already in progress. Execute normal refresh or ' +
        'try full refresh again later.', { dismissable: true });
      promise = Promise.resolve();
    } else {
      console.log('autocomplete-java load start, full refresh: ' + fullRefresh);
      if (fullRefresh) {
        this.fullRefreshOngoing = true;
        this.dict = new Dictionary();
      }

      // First load basic class descriptions
      promise = this._loadClassesImpl(classpath, false, fullRefresh)
      .then(() => {
        // Then, optionally, load also class members
        if (loadClassMembers) {
          return this._loadClassesImpl(classpath, true, fullRefresh);
        }
      }).then(() => {
        // Loading finished
        if (fullRefresh) {
          this.fullRefreshOngoing = false;
        }
        console.log('autocomplete-java load end, full refresh: ' + fullRefresh);
      });
    }
    return promise;
  }

  _loadClassesImpl(classpath, loadClassMembers, fullRefresh) {
    const classReader = new JavaClassReader(loadClassMembers, true,
      this.javaHome);

    // First load project classes
    console.log('autocomplete-java loading project classes. loadMembers: ' +
      loadClassMembers);
    return classReader.readAllClassesFromClasspath(classpath, !fullRefresh,
    (cp, className, classMembers) => {
      // Add class
      // 0 / 2 = class files have a priority over jars among suggestions
      return this._addClass(className, classMembers,
        cp.indexOf('.jar') !== -1 ? 0 : 2);
    }).then(() => {
      // Then load system libs
      return fullRefresh ? this._loadSystemLibsImpl(classReader) :
        Promise.resolve();
    });
  }

  _loadSystemLibsImpl(classReader) {
    // Read java system info
    return ioUtil.exec('"' + classReader.javaBinDir() + 'java" -verbose', true)
    .then((javaSystemInfo) => {
      // Load system classes from rt.jar
      let promise = null;
      console.log('autocomplete-java loading system classes.');
      const rtJarPath = (javaSystemInfo.match(/Opened (.*jar)/) || [])[1];
      if (rtJarPath) {
        promise = classReader.readAllClassesFromJar(rtJarPath,
        (cp, className, classMembers) => {
          return this._addClass(className, classMembers, 1);
        });
      } else {
        // TODO reject promise on error and notify about error afterwards
        atom.notifications.addError('autocomplete-java:\njava rt.jar not found',
          { dismissable: true });
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
    this.dict.remove('class', className);
    this.dict.remove('class', inverseName);
    this.dict.add('class', className, classDesc);
    this.dict.add('class', inverseName, classDesc);
    if (classMembers) {
      this.dict.removeCategory(className);
      _.each(classMembers, prototype => {
        this._addClassMember(className, prototype, lastUsed);
      });
    }
    return Promise.resolve();
  }

  _addClassMember(className, member, lastUsed) {
    try {
      const simpleName = javaUtil.getSimpleName(className);
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
