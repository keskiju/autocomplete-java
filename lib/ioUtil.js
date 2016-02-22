'use babel';

import { exec } from 'child_process';
const fs = require('fs');

class IOUtil {

  readDir(path) {
    return new Promise((resolve) => {
      fs.readdir(path, (err, names) => {
        if (err) {
          // TODO reject promise on error and notify user about error afterwards
          atom.notifications.addError('autocomplete-java:\n' + err,
            { dismissable: true });
          resolve([]);
        } else {
          resolve(names);
        }
      });
    });
  }

  readFile(path, noErrorMessage) {
    return new Promise((resolve) => {
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
          // TODO reject promise on error and notify user about error afterwards
          if (!noErrorMessage) {
            atom.notifications.addError('autocomplete-java:\n' + err,
              { dismissable: true });
          }
          resolve('');
        } else {
          resolve(data);
        }
      });
    });
  }

  // TODO avoid large maxBuffer by using spawn instead
  exec(command, ignoreError, noErrorMessage) {
    return new Promise((resolve) => {
      exec(command, { maxBuffer: 2000 * 1024 }, (err, stdout) => {
        if (err && !ignoreError) {
          // TODO reject promise on error and notify user about error afterwards
          if (!noErrorMessage) {
            atom.notifications.addError('autocomplete-java:\n' + err,
              { dismissable: true });
          } else {
            console.warn('autocomplete-java: ' + err);
          }
          resolve('');
        } else {
          resolve(stdout);
        }
      });
    });
  }

}

export default new IOUtil();
