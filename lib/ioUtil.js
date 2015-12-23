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

  exec(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        resolve(!error ? stdout : '');
      });
    });
  }


}

export default new IOUtil();
