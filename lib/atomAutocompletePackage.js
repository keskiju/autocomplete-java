'use babel';

import { CompositeDisposable } from 'atom';
import { AtomAutocompleteProvider } from './AtomAutocompleteProvider';
import { JavaClassLoader } from './JavaClassLoader';
import ioUtil from './ioUtil';
const fs = require('fs');

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
    const rootDir = this._getProjectRootDir();
    if (rootDir) {
      return ioUtil.readFile(rootDir + '/' +
        atom.config.get('autocomplete-java.classpathFilePath'), 'utf8')
      .then(classpath => {
        // Convert classpath to Windows format on Windows
        this.classpath = this._formatClassPath(rootDir, classpath);
        this.classLoader.loadClasses(this.classpath,
          atom.config.get('autocomplete-java.loadClassMembers'));
      });
    }
  }

  _formatClassPath(rootDir, classpath) {
    // Remove newlines
    let cp = classpath.replace(/[\r\n]*/gm, '');
    // Convert classpath to Windows format on Windows
    cp = rootDir.indexOf(':') !== -1 ? cp.replace(/\:/g, ';') : cp;
    // Add rootdir to paths
    cp = cp.replace(/\./g, rootDir + '/.').trim();
    // Just to make it nicer
    return cp.replace(/[//\\]\.[//\\]/g, '/');
  }

  _refreshClass(className, delayMillis) {
    setTimeout(() => {
      return this.classLoader.loadClass(className, this.classpath,
        atom.config.get('autocomplete-java.loadClassMembers'));
    }, delayMillis);
  }

  _onSave(editor) {
    // TODO
    const fileMatch = editor.getPath().match(/\/([^\/]*)\.java/);
    if (fileMatch) {
      // Organize imports on save
      if (atom.config.get('autocomplete-java.organizeImportsOnSave')) {
        this.provider.organizeImports(editor);
      }

      // Refresh saved class after it has been compiled
      const packageMatch = editor.getText().match(/package\s(.*);/);
      if (packageMatch) {
        // TODO use file watcher instead of hardcoded timeout
        const className = packageMatch[1] + '.' + fileMatch[1];
        this._refreshClass(className, 2000);
        this._refreshClass(className, 20000);
      }
    }
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
