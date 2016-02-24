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

  findSuperClassName(className) {
    const classes = this.findClass(className);
    const clazz = _.find(classes, c => {
      return c.className === className;
    });
    return clazz ? clazz.extend : null;
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
    return classReader.readClassesByName(classpath, [ className ], true,
    (cp, classDesc) => {
      return this._addClass(classDesc, Date.now());
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

  _addClass(desc, lastUsed) {
    const simpleName = javaUtil.getSimpleName(desc.className);
    const inverseName = javaUtil.getInverseName(desc.className);
    const classDesc = {
      type: 'class',
      name: simpleName,
      simpleName: simpleName,
      className: desc.className,
      extend: desc.extend,
      packageName: javaUtil.getPackageName(desc.className),
      lastUsed: lastUsed || 0,
      constructors: [],
      members: [],
    };
    this.dict.remove('class', desc.className);
    this.dict.remove('class', inverseName);
    this.dict.add('class', desc.className, classDesc);
    this.dict.add('class', inverseName, classDesc);
    if (desc.members) {
      this.dict.removeCategory(desc.className);
      _.each(desc.members, prototype => {
        this._addClassMember(classDesc, prototype, lastUsed);
      });
    }
    return Promise.resolve();
  }

  _addClassMember(classDesc, member, lastUsed) {
    try {
      const simpleName = javaUtil.getSimpleName(classDesc.className);
      const prototype = member.replace(/\).*/, ');')
        .replace(/,\s/g, ',').trim();
      if (prototype.indexOf('{') !== -1) {
        // console.log('?? ' + prototype);
      } else {
        let type = null;
        if (prototype.indexOf(classDesc.className + '(') !== -1) {
          type = 'constructor';
        } else if (prototype.indexOf('(') !== -1) {
          type = 'method';
        } else {
          type = 'property';
        }

        const name = type !== 'constructor' ?
          prototype.match(/\s([^\(\s]*)[\(;]/)[1] : classDesc.simpleName;
        const paramStr = type !== 'property' ?
          prototype.match(/\((.*)\)/)[1] : null;
        const key = name + (type !== 'property' ? '(' + paramStr + ')' : '');

        const memberDesc = {
          type: type,
          name: name,
          simpleName: simpleName,
          className: classDesc.className,
          packageName: classDesc.packageName,
          lastUsed: lastUsed || 0,
          classDesc: classDesc,
          member: {
            name: name,
            returnType: type !== 'constructor'
              ? _.last(prototype.replace(/\(.*\)/, '')
                  .match(/([^\s]+)\s/g)).trim()
              : classDesc.className,
            visibility: this._determineVisibility(prototype),
            params: paramStr ? paramStr.split(',') : null,
            prototype: prototype,
          },
        };
        if (type === 'constructor') {
          classDesc.constructors.push(memberDesc);
        } else {
          // const key = (prototype.match(/\s([^\s]*\(.*\));/) ||
          //   prototype.match(/\s([^\s]*);/))[1];
          this.dict.add(classDesc.className, key, memberDesc);
          classDesc.members.push(memberDesc);
        }
      }
    } catch (err) {
      // console.warn(err);
    }
  }

  _determineVisibility(prototype) {
    const v = prototype.split(/\s/)[0];
    return /public|private|protected/.test(v) ? v : 'package';
  }

}
