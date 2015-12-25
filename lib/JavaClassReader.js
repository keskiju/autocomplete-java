'use babel';

import { _ } from 'lodash';
//import { walk } from 'walk';
import ioUtil from './ioUtil';
let walk = require('walk');

export class JavaClassReader {

  constructor(loadClassMembers, ignoreInnerClasses) {
    this.loadClassMembers = loadClassMembers;
    this.ignoreInnerClasses = ignoreInnerClasses;
  }

  readClassesFromClasspath(classpath, callback) {
    let results = [];
    let serialPromise = Promise.resolve();
    _.each(classpath.split(':'), path => {
      if (path) {
        // TODO
        serialPromise = serialPromise.then(() => {
          return this.readClassesFromPath(path, callback);
        });
      }
    });
    return serialPromise;
  }

  readClassesFromPath(path, callback) {
    if (path.endsWith('.jar')) {
      // Read classes from a jar file
      return this.readClassesFromJar(path, callback);

    } else if (path.endsWith('*')) {
      // List jar files and read classes from them
      path = path.replace('*','');
      return ioUtil.readDir(path).then(names => {
        let serialPromise = Promise.resolve();
        _.each(names, name => {
          if (name.endsWith('.jar')) {
            // TODO
            serialPromise = serialPromise.then(() => {
              return this.readClassesFromJar(path + name, callback);
            });
          }
        });
        return serialPromise;
      });
    } else {
      // Read all class files from a directory and its subdirectories
      return new Promise((resolve, reject) => {
        let walker = walk.walk(path, () => {
        });
        walker.on("directories", (root, dirStatsArray, next) => {
          next();
        });
        walker.on("file", (root, fileStats, next) => {
          let classFilePath = (root + '/' + fileStats.name)
            .replace(path+'/','');
          if (fileStats.name.endsWith('.class')) {
            this.readClass(path, classFilePath, callback)
            .then(() => {
              next();
            });
          } else {
            next();
          }
        });
        walker.on("errors", (root, nodeStatsArray, next) => {
          next();
        });
        walker.on("end", () => {
          resolve();
        });
      });
    }
  }

  readClassesFromJar(jarPath, callback, classFilter) {
    return ioUtil.exec('unzip -l ' + jarPath +
      ' | grep .class | awk \'{print $NF}\' ' +
      (classFilter ? ' | ' + classFilter : ''))
    .then(stdout => {
      // TODO
      let serialPromise = Promise.resolve();
      _.each(stdout.split('\n'), filePath => {
        serialPromise = serialPromise.then(() => {
          return this.readClass(jarPath, filePath, callback);
        });
      });
      return serialPromise;
    });
  }

  readClass(classpath, className, callback) {
    className = className.replace('.class','').replace(/\//g,'.');
    if (className && (className.indexOf('$') === -1 || !this.ignoreInnerClasses)) {
      if (!this.loadClassMembers) {
        return callback(classpath, className, []);
      } else {
        // TODO optimize: feed multiple classes to javap command at the same time
        return ioUtil.exec('javap -classpath \'' + classpath + '\' ' + className)
        .then(stdout => {
          return callback(classpath, className, stdout.match(/(\S.*);/g));
        });
      }
    } else {
      return Promise.resolve();
    }
  }

}
