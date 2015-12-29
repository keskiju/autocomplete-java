'use babel';

import { _ } from 'lodash';
import ioUtil from './ioUtil';
const walk = require('walk');

export class JavaClassReader {

  constructor(loadClassMembers, ignoreInnerClasses) {
    this.loadClassMembers = loadClassMembers;
    this.ignoreInnerClasses = ignoreInnerClasses;
  }

  readClassesFromClasspath(classpath, skipLibs, callback) {
    let serialPromise = Promise.resolve();
    // We split with ; on Windows
    const paths = classpath.split(classpath.indexOf(';') !== -1 ? ';' : ':');
    _.each(paths, path => {
      if (path) {
        // TODO
        serialPromise = serialPromise.then(() => {
          return this.readClassesFromPath(path, skipLibs, callback);
        });
      }
    });
    return serialPromise;
  }

  readClassesFromPath(path, skipLibs, callback) {
    let promise = null;
    if (skipLibs && (path.endsWith('.jar') || path.endsWith('*'))) {
      return Promise.resolve();
    } else if (path.endsWith('.jar')) {
      // Read classes from a jar file
      promise = this.readClassesFromJar(path, callback);
    } else if (path.endsWith('*')) {
      // List jar files and read classes from them
      const dir = path.replace('*', '');
      promise = ioUtil.readDir(dir).then(names => {
        let serialPromise = Promise.resolve();
        _.each(names, name => {
          if (name.endsWith('.jar')) {
            // TODO
            serialPromise = serialPromise.then(() => {
              return this.readClassesFromJar(dir + name, callback);
            });
          }
        });
        return serialPromise;
      });
    } else {
      // Read all class files from a directory and its subdirectories
      promise = new Promise((resolve) => {
        const walker = walk.walk(path, () => { });
        walker.on('directories', (root, dirStatsArray, next) => {
          next();
        });
        walker.on('file', (root, fileStats, next) => {
          const classFilePath = (root + '/' + fileStats.name)
            .replace(path + '/', '').replace(path + '\\', '');
          if (fileStats.name.endsWith('.class')) {
            this.readClass(path, classFilePath, callback)
            .then(() => {
              next();
            });
          } else {
            next();
          }
        });
        walker.on('errors', (root, nodeStatsArray, next) => {
          next();
        });
        walker.on('end', () => {
          resolve();
        });
      });
    }
    return promise;
  }

  readClassesFromJar(jarPath, callback, packageFilter) {
    return ioUtil.exec('"' + this.javaBinDir() + 'jar" tf "' + jarPath + '"')
    .then(stdout => {
      // TODO
      let serialPromise = Promise.resolve();
      const filePaths = stdout.match(
        new RegExp('[\\r\\n\\s]' + (packageFilter || '') +
          '[\\S]*\\.class[\\r\\n\\s]', 'g'));
      _.each(filePaths, filePath => {
        serialPromise = serialPromise.then(() => {
          return this.readClass(jarPath, filePath.trim(), callback);
        });
      });
      return serialPromise;
    });
  }

  readClass(classpath, cName, callback) {
    let promise = null;
    const className = cName.replace('.class', '').replace(/[\/\\]/g, '.');
    if (className && (className.indexOf('$') === -1 ||
        !this.ignoreInnerClasses)) {
      if (!this.loadClassMembers) {
        promise = callback(classpath, className, null);
      } else {
        // TODO optimize: feed multiple classes to javap command
        promise = ioUtil.exec('"' + this.javaBinDir() + 'javap" -classpath "' +
          classpath + '" ' + className)
        .then(stdout => {
          return callback(classpath, className, stdout.match(/(\S.*);/g));
        });
      }
    } else {
      promise = Promise.resolve();
    }
    return promise;
  }

  javaBinDir() {
    if (process.env.JAVA_HOME) {
      return process.env.JAVA_HOME.replace(/[\/\\]$/, '') + '/bin/';
    }
    return '';
  }

}
