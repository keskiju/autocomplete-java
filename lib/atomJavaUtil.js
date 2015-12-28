'use babel';

class AtomJavaUtil {

  getCurrentPackageName(editor) {
    return this._lastMatch(editor.getText(), /package ([^;]*);/);
  }

  getImportedClassName(editor, classSimpleName) {
    return this._lastMatch(editor.getText(),
      new RegExp('import (.*' + classSimpleName + ');'));
  }

  getPossibleClassNames(editor, classSimpleName, prefix) {
    const classNames = [];
    const className = this.getImportedClassName(editor, classSimpleName);
    if (className) {
      classNames.push(className);
    } else {
      if (prefix.indexOf('.') === -1) {
        // Use package name of current file or 'java.lang'
        classNames.push(this.getCurrentPackageName(editor) +
          '.' + classSimpleName);
        classNames.push('java.lang.' + classSimpleName);
      } else {
        // Use the whole prefix as classname
        classNames.push(prefix);
      }
    }
    return classNames;
  }

  getLine(editor, bufferPosition) {
    return editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
  }

  getWord(editor, bufferPosition, removeParenthesis) {
    const line = this.getLine(editor, bufferPosition);
    const result = this._lastMatch(line, /[^\s-]+$/);
    return removeParenthesis ? result.replace(/.*\(/, '') : result;
  }

  determineClassName(editor, bufferPosition, text, prefix, suffix,
      prevReturnType) {
    try {
      let classNames = null;
      let isInstance = /\)$/.test(prefix);

      // Get class name from prefix
      // Also support '((ClassName)var)' syntax (a quick hack)
      let classSimpleName =
        this.getWord(editor, bufferPosition).indexOf('((') !== -1 ?
          prefix.match(/[^\)]*/)[0] : prefix;

      if (!this._isValidClassName(classSimpleName) &&
          !/[\.\)]/.test(prefix)) {
        // Find class name by a variable name given as prefix
        // TODO traverse brackets backwards to match correct scope (with regexp)
        // TODO handle 'this.varName' correctly
        classSimpleName = this._lastMatch(
          editor.getTextInRange([[bufferPosition.row - 10, 0], bufferPosition]),
          new RegExp('([A-Z][^\\(\\)\\s;]*)\\s+' + prefix + '[\\s=]'));
        classSimpleName = classSimpleName.replace(/\<.*\>/, '');
        isInstance = true;
      }

      if (this._isValidClassName(classSimpleName)) {
        // Convert simple name to a full class name and use that
        classNames = this.getPossibleClassNames(editor, classSimpleName,
          prefix);
      } else {
        // Just use return type of previous snippet (a quick hack)
        // TODO determine type using classloader
        classNames = [ prevReturnType ];
        isInstance = true;
      }

      return { classNames, isInstance };
    } catch (err) {
      console.error(err);
      return {};
    }
  }

  _isValidClassName(text) {
    return /^[A-Z][^\.\)]*$/.test(text) || /\.[A-Z][^\.\)]*$/.test(text);
  }

  _lastMatch(str, regex) {
    const array = str.match(regex) || [''];
    return array[array.length - 1];
  }

}

export default new AtomJavaUtil();
