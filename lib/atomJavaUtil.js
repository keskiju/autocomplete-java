'use babel';

import { _ } from 'lodash';

class AtomJavaUtil {

  getCurrentPackageName(editor) {
    return this._lastMatch(editor.getText(), /package ([^;]*);/);
  }

  getImportClassName(editor, classSimpleName) {
    // TODO bad regexp
    return this._lastMatch(editor.getText(),
      new RegExp('import (.*' + classSimpleName + ');'));
  }

  getWord(editor, bufferPosition, removeParenthesis) {
    let line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    let result = this._lastMatch(line, /[^\s-]+$/);
    return removeParenthesis ? result.replace(/.*\(/, '') : result;
  }

  determineClassName(editor, bufferPosition, text, prefix, suffix,
      prevReturnType, classLoader) {
    try {
      let className = null;
      let isInstance = /\)$/.test(prefix);

      // Get class name from prefix with support for ((ClassName)var) syntax.
      let classSimpleName =
        this.getWord(editor, bufferPosition).indexOf('((') !== -1 ?
          prefix.match(/[^\)]*/)[0] : prefix;

      if (!this._isValidClassName(classSimpleName) &&
          !/[\.\)]/.test(prefix)) {
        // Find class name by variable name
        // TODO bad regexp
        // TODO global regexp
        classSimpleName = this._lastMatch(
          editor.getTextInRange([[bufferPosition.row-10, 0], bufferPosition]),
          new RegExp('([A-Z][^\\(\\)\\s;]*)\\s+' + prefix + '[\\s=]'));
        classSimpleName = classSimpleName.replace(/\<.*\>/, '');
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
    return /^[A-Z][^\.\)]*$/.test(text) || /\.[A-Z][^\.\)]*$/.test(text);
  }

  _lastMatch(str, regex) {
    let array = str.match(regex) || [''];
    return array[array.length-1];
  }

}

export default new AtomJavaUtil();
