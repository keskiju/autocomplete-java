'use babel';

import { _ } from 'lodash';

class JavaUtil {

  getCurrentPackageName(editor) {
    return this._lastMatch(editor.getText(), /package ([^;]*);/));
  }

  inferClassName(editor, classSimpleName) {
    // Get package name from import
    let className = this.getImportClassName(editor, classSimpleName);
    if (!className) {
      if (classSimpleName.indexOf('.') === -1) {
        // Use package of current file
        className = this.getCurrentPackageName(editor) + '.' + classSimpleName;
      } else {
        className = classSimpleName;
      }
    }
    return className;
  }

  getImportClassName(editor, classSimpleName) {
    return this._lastMatch(editor.getText(),
      new RegExp('import (.*' + classSimpleName + ');'));
  }

  getSimpleName(className) {
    return className.match(/[^\.]*$/g)[0];
  }

  getInverseName(className) {
    return _.reduceRight(className.split('.'), (result, next) => {
      return result + next; //result ? result + '.' + next : next;
    }, '');
  }

  getFullName(editor, bufferPosition) {
    let line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    return this._lastMatch(line, /[^\s-]+$/);
  }

  isClassMemberName(name) {
    return /^[A-Z].*\./.test(name) || /\.[A-Z].*\./.test(name);
  }

  _lastMatch(str, regex) {
    let array = str.match(regex) || [''];
    return array[array.length-1];
  }

}

export default new JavaUtil();
