'use babel';

import { _ } from 'lodash';
import { TextEditor } from 'atom';
import { CompositeDisposable } from 'atom';
import { AtomAutocompleteProvider } from './AtomAutocompleteProvider';
import { JavaClassLoader } from './JavaClassLoader';
import atomJavaUtil from './atomJavaUtil';
import ioUtil from './ioUtil';
const fs = require('fs');

class AtomAutocompletePackage {

  constructor() {
    this.config = require('./config.json');
    this.subscriptions = undefined;
    this.provider = undefined;
    this.classLoader = undefined;
    this.classpath = '.';
    this.initialized = false;
  }

  activate() {
    this.classLoader = new JavaClassLoader();
    this.provider = new AtomAutocompleteProvider(this.classLoader);
    this.subscriptions = new CompositeDisposable();

    // Listen for commands
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'autocomplete-java:organize-imports',
      () => {
        this._organizeImports();
      })
    );
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'autocomplete-java:refresh-project',
      () => {
        if (this.initialized) {
          this._refresh(false);
        }
      })
    );
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'autocomplete-java:full-refresh',
      () => {
        if (this.initialized) {
          this._refresh(true);
        }
      })
    );

    // Listen for buffer change
    this.subscriptions.add(
    atom.workspace.onDidStopChangingActivePaneItem((paneItem) => {
      this._onChange(paneItem);
    }));

    // Listen for file save
    atom.workspace.observeTextEditors(editor => {
      this.subscriptions.add(editor.getBuffer().onWillSave(() => {
        this._onSave(editor);
      }));
    });

    // Start full refresh
    setTimeout(() => {
      // Refresh all classes
      this.initialized = true;
      this._refresh(true);
    }, 300);
  }

  deactivate() {
    this.subscriptions.dispose();
    this.provider = null;
    this.classLoader = null;
    this.subscriptions = null;
    this.classpath = '.';
    this.initialized = false;
  }

  getProvider() {
    return this.provider;
  }

  // Commands

  _refresh(fullRefresh) {
    // Refresh provider settings
    // TODO observe config changes
    this.provider.configure(atom.config.get('autocomplete-java'));

    // Load classes using classpath read from .classpath file
    const rootDir = this._getProjectRootDir();
    if (rootDir) {
      return ioUtil.readFile(rootDir + '/' +
        atom.config.get('autocomplete-java.classpathFilePath'), 'utf8')
      .then(classpath => {
        // Convert classpath to Windows format on Windows
        this.classpath = this._formatClassPath(rootDir, classpath);
        this.classLoader.loadClasses(this.classpath,
          atom.config.get('autocomplete-java.loadClassMembers'), fullRefresh);
      });
    }
  }

  _refreshClass(className, delayMillis) {
    setTimeout(() => {
      return this.classLoader.loadClass(className, this.classpath,
        atom.config.get('autocomplete-java.loadClassMembers'));
    }, delayMillis);
  }

  _organizeImports() {
    const editor = atom.workspace.getActiveTextEditor();
    if (this._isJavaFile(editor)) {
      atomJavaUtil.organizeImports(editor);
    }
  }

  _onChange(paneItem) {
    if (this._isJavaFile(paneItem)) {
      // Touch every imported class
      _.each(atomJavaUtil.getImports(paneItem), imp => {
        try {
          this.classLoader.touchClass(imp.match(/import\s*(\S*);/)[1]);
        } catch (err) {
          console.warn(err);
        }
      });
    }
  }

  _onSave(editor) {
    // TODO use onDidSave for refreshing and onWillSave only
    // for organizing imports
    if (this._isJavaFile(editor)) {
      if (atom.config.get('autocomplete-java.organizeImportsOnSave')) {
        this._organizeImports();
      }

      // Refresh saved class after it has been compiled
      const fileMatch = editor.getPath().match(/\/([^\/]*)\.java/);
      const packageMatch = editor.getText().match(/package\s(.*);/);
      if (fileMatch && packageMatch) {
        // TODO use file watcher instead of hardcoded timeout
        const className = packageMatch[1] + '.' + fileMatch[1];
        this._refreshClass(className, 3000);
      }
    }
  }

  // Util methods

  _isJavaFile(editor) {
    return editor instanceof TextEditor && editor.getPath() &&
      editor.getPath().match(/\.java$/);
  }

  _formatClassPath(rootDir, classpath) {
    // Remove newlines
    let cp = classpath.replace(/[\r\n]*/gm, '').trim();
    // On Windows, convert classpath so that linux formatted .classpath file
    // works also in Windows without modifications
    const separator = rootDir.indexOf(':') !== -1 ? ';' : ':';
    if (separator === ';') {
      // Replace all path separators, but avoid touching Windows style
      // drive letters like C:\
      cp = cp.replace(/(\:)([^\\])/g, ';$2');
    }
    // Add rootdir to paths like :./ or :../
    cp = (':' + cp).replace(/([\:\;])(\.)/g, '$1' + rootDir + '/.')
      .substring(1);
    // Remove /./ just to make path nicer looking
    return cp.replace(/[//\\]\.[//\\]/g, '/');
  }

  _getProjectRootDir() {
    let dir = null;
    const textEditor = atom.workspace.getActiveTextEditor();
    if (textEditor) {
      dir = atom.project.getPaths().sort((a, b) => {
        return (b.length - a.length);
      }).find((p) => {
        const realpath = fs.realpathSync(p);
        return textEditor.getPath().substr(0, realpath.length) === realpath;
      });
    }
    return dir;
  }

}

export default new AtomAutocompletePackage();
