'use babel';

import { exec } from 'child_process';
const fs = require('fs');

class IOUtil {

  // TODO reject promise on error and log error afterwards
  readDir(path) {
    return new Promise((resolve) => {
      fs.readdir(path, (err, names) => {
        if (err) {
          console.error('autocomplete-java: ' + err);
          resolve([]);
        } else {
          resolve(names);
        }
      });
    });
  }

  // TODO reject promise on error and log error afterwards
  readFile(path) {
    return new Promise((resolve) => {
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
          console.error('autocomplete-java: ' + err);
          resolve('');
        } else {
          resolve(data);
        }
      });
    });
  }

  // TODO avoid large maxBuffer by using spawn instead
  // TODO reject promise on error and log error afterwards
  exec(command, ignoreError) {
    return new Promise((resolve) => {
      exec(command, { maxBuffer: 2000 * 1024 }, (err, stdout) => {
        if (err && !ignoreError) {
          console.error('autocomplete-java: ' + err);
          resolve('');
        } else {
          resolve(stdout);
        }
      });
    });
  }

}

export default new IOUtil();
