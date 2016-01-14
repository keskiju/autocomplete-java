'use babel';

import { _ } from 'lodash';
import ioUtil from './ioUtil';
const walk = require('walk');

export class JavaClassReader {

  constructor(loadClassMembers, ignoreInnerClasses, javaHome) {
    this.loadClassMembers = loadClassMembers;
    this.ignoreInnerClasses = ignoreInnerClasses;
    this.javaHome = javaHome;
  }

  readAllClassesFromClasspath(classpath, skipLibs, callback) {
    let serialPromise = Promise.resolve();
    // We split with ; on Windows
    const paths = classpath.split(classpath.indexOf(';') !== -1 ? ';' : ':');
    _.each(paths, path => {
      if (path) {
        // TODO
        serialPromise = serialPromise.then(() => {
          return this.readAllClassesFromPath(path, skipLibs, callback);
        });
      }
    });
    return serialPromise;
  }

  readAllClassesFromPath(path, skipLibs, callback) {
    let promise = null;
    if (skipLibs && (path.endsWith('.jar') || path.endsWith('*'))) {
      return Promise.resolve();
    } else if (path.endsWith('.jar')) {
      // Read classes from a jar file
      promise = this.readAllClassesFromJar(path, callback);
    } else if (path.endsWith('*')) {
      // List jar files and read classes from them
      const dir = path.replace('*', '');
      promise = ioUtil.readDir(dir).then(names => {
        let serialPromise = Promise.resolve();
        _.each(names, name => {
          if (name.endsWith('.jar')) {
            // TODO
            serialPromise = serialPromise.then(() => {
              return this.readAllClassesFromJar(dir + name, callback);
            });
          }
        });
        return serialPromise;
      });
    } else {
      // Gather all class files from a directory and its subdirectories
      const classFilePaths = [];
      promise = new Promise((resolve) => {
        const walker = walk.walk(path, () => { });
        walker.on('directories', (root, dirStatsArray, next) => {
          next();
        });
        walker.on('file', (root, fileStats, next) => {
          if (fileStats.name.endsWith('.class')) {
            const classFilePath = (root + '/' + fileStats.name)
              .replace(path + '/', '').replace(path + '\\', '');
            classFilePaths.push(classFilePath);
          }
          next();
        });
        walker.on('errors', (root, nodeStatsArray, next) => {
          next();
        });
        walker.on('end', () => {
          resolve();
        });
      });
      // Read classes
      return promise.then(() => {
        return this.readClassesByName(path, classFilePaths, callback);
      });
    }
    return promise;
  }

  readAllClassesFromJar(jarPath, callback) {
    return ioUtil.exec('"' + this.javaBinDir() + 'jar" tf "' + jarPath + '"')
    .then(stdout => {
      const filePaths = stdout.match(new RegExp('[\\S]*\\.class', 'g'));
      return this.readClassesByName(jarPath, filePaths, callback);
    });
  }

  readClassesByName(classpath, cNames, callback) {
    // Filter and format class names from cNames that can be either
    // class names or file paths
    const classNames = _(cNames).filter((className) => {
      return className && (className.indexOf('$') === -1 ||
        !this.ignoreInnerClasses);
    }).map((className) => {
      return className.replace('.class', '').replace(/[\/\\]/g, '.').trim();
    }).value();

    let promise = null;
    if (this.loadClassMembers) {
      // Read class info with javap
      promise = this.readClassesByNameWithJavap(
        classpath, classNames, callback);
    } else {
      // Just do callback with class name only
      _.each(classNames, (className) => {
        callback(classpath, className, null);
      });
      promise = Promise.resolve();
    }
    return promise;
  }

  readClassesByNameWithJavap(classpath, classNamesArray, callback) {
    let serialPromise = Promise.resolve();

    // Group array in multiple arrays of max length 50
    _.each(_.chunk(classNamesArray, 50), classNames => {
      // Read classes with javap
      serialPromise = serialPromise.then(() => {
        const classNamesStr = _.reduce(classNames, (className, result) => {
          return result + ' ' + className;
        }, '');
        return ioUtil.exec('"' + this.javaBinDir() + 'javap" -classpath "' +
          classpath + '" ' + classNamesStr, false, true)
        .then(stdout => {
          _.each(stdout.match(/Compiled from [^\}]*\}/gm), javapClass => {
            try {
              const classDesc = this.parseJavapClass(javapClass);
              callback(classpath, classDesc.className, classDesc.members);
            } catch (err) {
              console.warn(err);
            }
          });
        });
      });
    });

    return serialPromise;
  }

  parseJavapClass(javapClass) {
    return {
      className: javapClass.match(/(class|interface)\s(\S*)\s/)[2]
        .replace(/\<.*/g, ''),
      members: javapClass.match(/(\S.*);/g),
    };
  }

  javaBinDir() {
    const baseDir = this.javaHome || process.env.JAVA_HOME;
    if (baseDir) {
      return baseDir.replace(/[\/\\]$/, '') + '/bin/';
    }
    return '';
  }

}
