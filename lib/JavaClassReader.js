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
        return this.readClassesByName(path, classFilePaths, true, callback);
      });
    }
    return promise;
  }

  readAllClassesFromJar(jarPath, callback) {
    return ioUtil.exec('"' + this.javaBinDir() + 'jar" tf "' + jarPath + '"')
    .then(stdout => {
      const filePaths = stdout.match(new RegExp('[\\S]*\\.class', 'g'));
      return this.readClassesByName(jarPath, filePaths, false, callback);
    });
  }

  readClassesByName(classpath, cNames, parseArgs, callback) {
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
        classpath, classNames, parseArgs, callback);
    } else {
      // Just do callback with class name only
      _.each(classNames, (className) => {
        callback(classpath, { className: className });
      });
      promise = Promise.resolve();
    }
    return promise;
  }

  readClassesByNameWithJavap(classpath, classNamesArray, parseArgs, callback) {
    let serialPromise = Promise.resolve();

    // Group array in multiple arrays of limited max length
    _.each(_.chunk(classNamesArray, parseArgs ? 20 : 50), classNames => {
      // Read classes with javap
      serialPromise = serialPromise.then(() => {
        const classNamesStr = _.reduce(classNames, (className, result) => {
          return result + ' ' + className;
        }, '');
        return ioUtil.exec('"' + this.javaBinDir()
          + 'javap" '
          + (parseArgs ? '-verbose -private ' : ' ')
          + '-classpath "'
          + classpath + '" ' + classNamesStr, false, true)
        .then(stdout => {
          _.each(stdout.match(/Compiled from [^\}]*\}/gm), javapClass => {
            try {
              const classDesc = this.parseJavapClass(javapClass, parseArgs);
              callback(classpath, classDesc);
            } catch (err) {
              console.warn(err);
            }
          });
        });
      });
    });

    return serialPromise;
  }

  // TODO: This is a quick and ugly hack. Replace with an separate
  // javap parser module
  parseJavapClass(javapClass, parseArgs) {
    let desc = null;

    if (!parseArgs) {
      const extend = javapClass.match(/extends ([^\s]+)/);
      desc = {
        className: javapClass.match(/(class|interface)\s(\S*)\s/)[2]
          .replace(/\<.*/g, ''),
        extend: extend ? extend[1] : null,
        members: javapClass.match(/(\S.*);/g),
      };
    } else {
      desc = {
        className: null,
        extend: null,
        members: [],
        members2: [],
      };

      let status = 'header';
      let parsingArgs = false;

      _.each(javapClass.split(/[\r\n]+/), l => {
        const line = l.trim();
        const lineIndent = l.match(/^\s*/)[0].length;

        if (status === 'header') {
          if (/class|interface/.test(line)) {
            // Parse class/interface name and extends
            const extend = javapClass.match(/extends ([^\s]+)/);
            desc.extend = extend ? extend[1] : null;
            desc.className = javapClass.match(/(class|interface)\s(\S*)\s/)[2]
              .replace(/\<.*/g, '');
          }
          if (line.indexOf('{') !== -1) {
            // Start parsing class members
            status = 'members';
          }
        } else if (status === 'members') {
          if (lineIndent === 2) {
            // Add new member
            desc.members2.push({
              prototype: line,
              args: [],
            });
            parsingArgs = false;
          } else if (lineIndent === 4) {
            parsingArgs = /MethodParameters/.test(line);
          } else if (lineIndent === 6 && parsingArgs &&
              line.indexOf(' ') === -1) {
            desc.members2[desc.members2.length - 1].args.push(line);
          } else if (line === '}') {
            status = 'end';
          }
        }
      });

      _.each(desc.members2, member => {
        let tmp = member.prototype;

        // NOTE: quick hack for generics support
        for (let i = 0; i < 5; i++) {
          const t = tmp.replace(/<(.*),\s+(.*)>/, '&lt;$1|comma|$2&gt;');
          tmp = t;
        }

        _.each(member.args, arg => {
          if (tmp.indexOf(',') !== -1) {
            tmp = tmp.replace(',', ' ' + arg + '=');
          } else {
            tmp = tmp.replace(')', ' ' + arg + ')');
          }
        });
        tmp = tmp.replace(/=/g, ',');

        // NOTE: quick hack for generics support
        tmp = tmp.replace(/&lt;/g, '<');
        tmp = tmp.replace(/&gt;/g, '>');
        tmp = tmp.replace(/\|comma\|/g, ',');

        member.prototype = tmp;
        desc.members.push(tmp);
      });
    }

    return desc;
  }

  javaBinDir() {
    const baseDir = this.javaHome || process.env.JAVA_HOME;
    if (baseDir) {
      return baseDir.replace(/[\/\\]$/, '') + '/bin/';
    }
    return '';
  }

}
