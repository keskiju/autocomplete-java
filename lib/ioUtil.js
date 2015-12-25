'use babel';

import { exec } from 'child_process';
let fs = require('fs');

class IOUtil {

  readDir(path) {
    return new Promise((resolve, reject) => {
      fs.readdir(path, (err, names) => {
        resolve(!err ? names : []);
      });
    });
  }

  readFile(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, 'utf8', (err, data) => {
        resolve(!err ? data : '');
      });
    });
  }

  // TODO avoid maxBuffer setting by using spawn instead
  // TODO replace most execs with node libs
  exec(command) {
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 1200*1024 }, (error, stdout, stderr) => {
        resolve(!error ? stdout : '');
      });
    });
  }

}

export default new IOUtil();
