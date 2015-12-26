'use babel';

import { _ } from 'lodash';

class AtomJavaUtil {

  determineClassName(editor, bufferPosition, text, prefix, suffix,
      prevReturnType, classLoader) {
    try {
      let className = null;
      let isInstance = false;

      // Get class name from prefix
      let classSimpleName = prefix.match(/[^\)]*/)[0];

      if (!this._isValidClassName(classSimpleName) &&
          prefix.indexOf('.') === -1) {
        // Find class name by variable name
        // TODO bad regexp
        // TODO global regexp
        classSimpleName = this._lastMatch(
          editor.getTextInRange([[bufferPosition.row-10, 0], bufferPosition]),
          new RegExp('([A-Z][^\\(\\)\\s;]*)\\s+' + prefix));
        isInstance = true;
      }

      if (this._isValidClassName(classSimpleName)) {
        // Convert simple name to a full class name and use that
        className = this.getImportClassName(editor, classSimpleName);
        if (!className) {
          if (prefix.indexOf('.') === -1) {
            // Use package name of current file
            className = this.getCurrentPackageName(editor) + '.' + classSimpleName;
          } else {
            // Use the whole prefix as classname
            className = prefix;
          }
        }
      } else {
        // Just use return type of previous snippet
        className = prevReturnType;
        isInstance = true;
      }

      return { className, isInstance };

    } catch (err) {
      console.error(err);
      return {};
    }
  }

  _isValidClassName(text) {
    return /^[A-Z][^\.]*$/.test(text) || /\.[A-Z][^\.]*$/.test(text);
  }

  getCurrentPackageName(editor) {
    return this._lastMatch(editor.getText(), /package ([^;]*);/);
  }

  getImportClassName(editor, classSimpleName) {
    // TODO bad regexp
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

export default new AtomJavaUtil();
