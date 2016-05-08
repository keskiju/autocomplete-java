'use babel';

import { _ } from 'lodash';
import javaUtil from './javaUtil';

class AtomJavaUtil {

  getCurrentPackageName(editor) {
    return this._lastMatch(editor.getText(), /package ([^;]*);/);
  }

  getCurrentClassSimpleName(editor) {
    return editor.getTitle().split('.')[0];
  }

  getCurrentClassName(editor) {
    return this.getCurrentPackageName(editor) + '.'
      + this.getCurrentClassName(editor);
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
    return this.getLastWord(line, removeParenthesis);
  }

  getLastWord(line, removeParenthesis) {
    const result = this._lastMatch(line, /[^\s-]+$/);
    return removeParenthesis ? result.replace(/.*\(/, '') : result;
  }

  getPrevWord(editor, bufferPosition) {
    const words = this.getLine(editor, bufferPosition).split(/[\s\(]+/);
    return words.length >= 2 ? words[words.length - 2] : null;
  }

  importClass(editor, className, foldImports) {
    // Add import statement if import does not already exist.
    // But do not import if class belongs in java.lang or current package.
    const packageName = javaUtil.getPackageName(className);
    if (!this.getImportedClassName(editor, className) &&
        packageName !== 'java.lang' &&
        packageName !== this.getCurrentPackageName(editor)) {
      this.organizeImports(editor, 'import ' + className + ';', foldImports);
    }
  }

  getImports(editor) {
    const buffer = editor.getBuffer();
    return buffer.getText().match(/import\s.*;/g) || [];
  }

  organizeImports(editor, newImport, foldImports) {
    const buffer = editor.getBuffer();
    buffer.transact(() => {
      // Get current imports
      const imports = this.getImports(editor);
      if (newImport) {
        imports.push(newImport);
      }
      // Remove current imports
      buffer.replace(/import\s.*;[\r\n]+/g, '');
      // Add sorted imports
      buffer.insert([1, 0], '\n');
      _.each(_.sortBy(imports), (value, index) => {
        buffer.insert([index + 2, 0], value + '\n');
      });

      if (foldImports) {
        this.foldImports(editor);
      }
    });
  }

  foldImports(editor) {
    const firstRow = 0;
    let lastRow = 0;
    const buffer = editor.getBuffer();
    buffer.scan(/import\s.*;/g, (m) => {
      lastRow = m.range.end.row;
    });

    if (lastRow) {
      const pos = editor.getCursorBufferPosition();
      editor.setSelectedBufferRange([[firstRow, 0], [lastRow, 0]]);
      editor.foldSelectedLines();
      editor.setCursorBufferPosition(pos);
    }
  }

  determineClassName(editor, bufferPosition, text, prefix, suffix,
      prevReturnType) {
    try {
      let classNames = null;
      let isInstance = /\)$/.test(prefix);

      let classSimpleName = null;

      // Determine class name
      if (!prefix || prefix === 'this') {
        // Use this as class name
        classSimpleName = this.getCurrentClassSimpleName(editor);
        isInstance = true;
      } else if (prefix) {
        // Get class name from prefix
        // Also support '((ClassName)var)' syntax (a quick hack)
        classSimpleName = this.getWord(editor, bufferPosition)
          .indexOf('((') !== -1 ? prefix.match(/[^\)]*/)[0] : prefix;
      }

      if (!this._isValidClassName(classSimpleName) &&
          !/[\.\)]/.test(prefix)) {
        // Find class name by a variable name given as prefix
        // TODO traverse brackets backwards to match correct scope (with regexp)
        // TODO handle 'this.varName' correctly
        classSimpleName = this._lastMatch(
          editor.getTextInRange([[bufferPosition.row - 25, 0], bufferPosition]),
          new RegExp('([A-Z][a-zA-Z0-9_]*)(<[A-Z][a-zA-Z0-9_<>, ]*>)?\\s' +
            prefix + '[,;=\\s\\)]', 'g'));
        classSimpleName = classSimpleName.replace(
          new RegExp('\\s+' + prefix + '[,;=\\s\\)]$'), '');
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
