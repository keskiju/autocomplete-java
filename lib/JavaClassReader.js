'use babel';

import { _ } from 'lodash';
//import { walk } from 'walk';
import ioUtil from './ioUtil';
let walk = require('walk');

export class JavaClassReader {

  constructor(fetchMembers) {
    this.fetchMembers = fetchMembers;
  }

  readClasses(classpath, rootDir, callback) {
    let results = [];
    let serialPromise = Promise.resolve();
    _.each(classpath.split(':'), path => {
      if (path) {
        serialPromise = serialPromise.then(() => {
          return this.readPathClasses(
            path.startsWith('.') ? rootDir + '/' + path : path, path, callback);
        });
      }
    });
    return serialPromise;
  }

  readPathClasses(fullPath, origPath, callback) {
    if (fullPath.endsWith('.jar')) {
      // Read classes from jar file
      return this.readJarClasses(fullPath, callback);

    } else if (fullPath.endsWith('*')) {
      // List jar files and read classes from them
      fullPath = fullPath.replace('*','');
      return ioUtil.readDir(fullPath).then(names => {
        let serialPromise = Promise.resolve();
        _.each(names, name => {
          if (name.endsWith('.jar')) {
            serialPromise = serialPromise.then(() => {
              return this.readJarClasses(fullPath + name, callback);
            });
          }
        });
        return serialPromise;
      });
    } else {
      // Add all class files in directory and its subdirectories
      return new Promise((resolve, reject) => {
        let walker = walk.walk(fullPath, () => {
        });
        walker.on("directories", (root, dirStatsArray, next) => {
          next();
        });
        walker.on("file", (root, fileStats, next) => {
          let classFilePath = (root + '/' + fileStats.name)
            .replace(fullPath+'/','');
          if (fileStats.name.endsWith('.class')) {
            this.readClass(fullPath, classFilePath, callback)
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

  readJarClasses(jarPath, callback) {
    return ioUtil.exec('unzip -l ' + jarPath + ' | grep .class | awk \'{print $NF}\'')
    .then(stdout => {
      let serialPromise = Promise.resolve();
      _.each(stdout.split('\n'), filePath => {
        serialPromise = serialPromise.then(() => {
          return this.readClass(jarPath, filePath, callback);
        });
      });
      return serialPromise;
    });
  }

  readClass(classpath, classFilePath, callback) {
    let classname = classFilePath.replace('.class','').replace(/\//g,'.');
    if (classname) {
      if (!this.fetchMembers) {
        return callback(classname, []);
      } else {
        return ioUtil.exec('javap -classpath ' + classpath + ' ' + classname)
        .then(stdout => {
          return callback(classname, stdout.match(/(\S.*);/g));
        });
      }
    } else {
      return Promise.resolve();
    }
  }

}
