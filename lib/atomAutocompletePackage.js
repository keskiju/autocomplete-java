'use babel';

import { CompositeDisposable } from 'atom';
import { AtomAutocompleteProvider } from './AtomAutocompleteProvider';
import { JavaClassLoader } from './JavaClassLoader';
import ioUtil from './ioUtil';
let fs = require('fs');

class AtomAutocompletePackage {

  constructor() {
    this.config = require('./config.json');
    this.subscriptions = undefined;
    this.provider = undefined;
    this.classLoader = undefined;
    this.classpath = '.';
  }

  activate() {
    this.classLoader = new JavaClassLoader();
    this.provider = new AtomAutocompleteProvider(this.classLoader);
    this.subscriptions = new CompositeDisposable();
    // Listen for refresh command
    this.subscriptions.add(
      atom.commands.add('atom-workspace', 'autocomplete-java:refresh', () => {
        this._refresh();
      })
    );
    // Listen for save
    atom.workspace.observeTextEditors(editor => {
      this.subscriptions.add(editor.getBuffer().onWillSave(() => {
        this._onSave(editor);
      }));
    });
    // Refresh all classes
    this._refresh();
  }

  deactivate() {
    this.subscriptions.dispose();
    this.provider = null;
    this.classLoader = null;
    this.subscriptions = null;
  }

  getProvider() {
    return this.provider;
  }

  _refresh() {
    // TODO observe config changes
    this.provider.configure(atom.config.get('autocomplete-java'));

    // Load all project classes using classpath read from .classpath file
    let rootDir = this._getProjectRootDir();
    if (rootDir) {
      return ioUtil.readFile(rootDir + '/' +
        atom.config.get('autocomplete-java.classpathFilePath'), 'utf8')
      .then(classpath => {
        if (rootDir.indexOf(':') !== -1) {
          // Convert classpath to Windows format
          classpath = classpath.replace(/\:/g, ';');
        }
        this.classpath = classpath.replace(/\./g, rootDir + '/.').trim();
        this.classLoader.loadClasses(this.classpath,
          atom.config.get('autocomplete-java.loadClassMembers'));
      });
    }
  }

  _onSave(editor) {
    // TODO
    let fileMatch = editor.getPath().match(/\/([^\/]*)\.java/);
    if (fileMatch) {
      // Organize imports on save
      if (atom.config.get('autocomplete-java.organizeImportsOnSave')) {
        this.provider.organizeImports(editor);
      }

      // Refresh saved class after it has been compiled
      let packageMatch = editor.getText().match(/package\s(.*);/);
      if (packageMatch) {
        // TODO use file watcher instead of hardcoded timeout
        setTimeout(() => {
            this.classLoader.loadClass(
              packageMatch[1] + '.' + fileMatch[1],
              this.classpath,
              atom.config.get('autocomplete-java.loadClassMembers'));
        }, 2000);
      }
    }
  }

  _getProjectRootDir() {
    let textEditor = atom.workspace.getActiveTextEditor();
    if (textEditor) {
      return atom.project.getPaths().sort((a, b) => {
        return (b.length - a.length);
      }).find((p) => {
        let realpath = fs.realpathSync(p);
        return textEditor.getPath().substr(0, realpath.length) == realpath;
      });
    } else {
      return null;
    }
  }

}

export default new AtomAutocompletePackage();
