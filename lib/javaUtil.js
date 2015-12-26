'use babel';

import { _ } from 'lodash';

class JavaUtil {

  determineClassName(editor, bufferPosition, text, prefix, suffix,
      prevReturnType) {
    let className = null;

    // TODO determine type of variable --> lastMatch from buffer to this position

    let classSimpleName = prefix.match(/[^\)]*/)[0];
    if (/^[A-Z][^\.]*$/.test(classSimpleName) ||
        /\.[A-Z][^\.]*$/.test(classSimpleName)) {
      // Convert simple name to full class name
      className = this.getImportClassName(editor, classSimpleName);
      if (!className) {
        if (prefix.indexOf('.') === -1) {
          // Use package of current file
          className = this.getCurrentPackageName(editor) + '.' + classSimpleName;
        } else {
          // Use whole prefix as classname
          className = prefix;
        }
      }
    } else {
      // Just use return type of previous snippet
      className = prevReturnType;
    }

    return className;
  }

  getCurrentPackageName(editor) {
    return this._lastMatch(editor.getText(), /package ([^;]*);/);
  }

  getImportClassName(editor, classSimpleName) {
    return this._lastMatch(editor.getText(),
      new RegExp('import (.*' + classSimpleName + ');'));
  }

  getSimpleName(className) {
    return className.match(/[^\.]*$/g)[0];
  }

  getPackageName(className) {
    return className.replace('.' + this.getSimpleName(className), '');
  }

  getInverseName(className) {
    return _.reduceRight(className.split('.'), (result, next) => {
      return result + next; //result ? result + '.' + next : next;
    }, '');
  }

  getWord(editor, bufferPosition) {
    let line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    return this._lastMatch(line, /[^\s-]+$/).replace(/.*\(/, '');
  }

  _lastMatch(str, regex) {
    let array = str.match(regex) || [''];
    return array[array.length-1];
  }

}

export default new JavaUtil();
