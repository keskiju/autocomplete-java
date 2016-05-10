'use babel';

import { _ } from 'lodash';
import { TextEditor } from 'atom';
import { CompositeDisposable } from 'atom';
import { AtomAutocompleteProvider } from './AtomAutocompleteProvider';
import { JavaClassLoader } from './JavaClassLoader';
import atomJavaUtil from './atomJavaUtil';

class AtomAutocompletePackage {

  constructor() {
    this.config = require('./config.json');
    this.subscriptions = undefined;
    this.provider = undefined;
    this.classLoader = undefined;
    this.classpath = null;
    this.initialized = false;
  }

  activate() {
    this.classLoader = new JavaClassLoader(
      atom.config.get('autocomplete-java.javaHome'));
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

    // Listen for config changes
    // TODO refactor: bypasses provider.configure()
    this.subscriptions.add(
      atom.config.observe('autocomplete-java.inclusionPriority', (val) => {
        this.provider.inclusionPriority = val;
      })
    );
    this.subscriptions.add(
      atom.config.observe('autocomplete-java.excludeLowerPriority', (val) => {
        this.provider.excludeLowerPriority = val;
      })
    );
    this.subscriptions.add(
      atom.config.observe('autocomplete-java.foldImports', (val) => {
        this.provider.foldImports = val;
      })
    );

    // Listen for buffer change
    this.subscriptions.add(
      atom.workspace.onDidStopChangingActivePaneItem((paneItem) => {
        this._onChange(paneItem);
      })
    );

    // Listen for file save
    atom.workspace.observeTextEditors(editor => {
      if (this.subscriptions) {
        this.subscriptions.add(editor.getBuffer().onWillSave(() => {
          this._onSave(editor);
        }));
      }
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
    this.classpath = null;
    this.initialized = false;
  }

  getProvider() {
    return this.provider;
  }

  // Commands

  async _refresh(fullRefresh) {
    // Refresh provider settings
    // TODO observe config changes
    this.provider.configure(atom.config.get('autocomplete-java'));
    this.classLoader.setJavaHome(atom.config.get('autocomplete-java.javaHome'));

    // Load classes using classpath
    const classpath = await this._loadClasspath();
    if (classpath) {
      this.classLoader.loadClasses(classpath,
        atom.config.get('autocomplete-java.loadClassMembers'), fullRefresh);
    }
  }

  _refreshClass(className, delayMillis) {
    setTimeout(() => {
      if (this.classpath) {
        this.classLoader.loadClass(className, this.classpath,
          atom.config.get('autocomplete-java.loadClassMembers'));
      } else {
        console.warn('autocomplete-java: classpath not set.');
      }
    }, delayMillis);
  }

  _organizeImports() {
    const editor = atom.workspace.getActiveTextEditor();
    if (this._isJavaFile(editor)) {
      atomJavaUtil.organizeImports(editor, null,
        atom.config.get('autocomplete-java.foldImports'));
    }
  }

  _onChange(paneItem) {
    if (this._isJavaFile(paneItem)) {
      // Active file has changed -> fold imports
      if (atom.config.get('autocomplete-java.foldImports')) {
        atomJavaUtil.foldImports(paneItem);
      }
      // Active file has changed -> touch every imported class
      _.each(atomJavaUtil.getImports(paneItem), imp => {
        try {
          this.classLoader.touchClass(imp.match(/import\s*(\S*);/)[1]);
        } catch (err) {
          // console.warn(err);
        }
      });
    }
  }

  _onSave(editor) {
    // TODO use onDidSave for refreshing and onWillSave for organizing imports
    if (this._isJavaFile(editor)) {
      // Refresh saved class after it has been compiled
      if (atom.config.get('autocomplete-java.refreshClassOnSave')) {
        const fileMatch = editor.getPath().match(/\/([^\/]*)\.java/);
        const packageMatch = editor.getText().match(/package\s(.*);/);
        if (fileMatch && packageMatch) {
          // TODO use file watcher instead of hardcoded timeout
          const className = packageMatch[1] + '.' + fileMatch[1];
          this._refreshClass(className, 3000);
        }
      }
    }
  }

  // Util methods

  _isJavaFile(editor) {
    return editor instanceof TextEditor && editor.getPath() &&
      editor.getPath().match(/\.java$/);
  }

  // TODO: this is a quick hack for loading classpath. replace with
  // atom-javaenv once it has been implemented
  async _loadClasspath() {
    let separator = null;
    const classpathSet = new Set();
    const classpathFileName =
      atom.config.get('autocomplete-java.classpathFilePath');

    await atom.workspace.scan(/^.+$/, { paths: ['*' + classpathFileName] },
    file => {
      separator = file.filePath.indexOf(':') !== -1 ? ';' : ':';
      _.each(file.matches, match => {
        // NOTE: The :\ replace is a quick hack for supporting Windows
        // absolute paths e.g E:\myProject\lib
        _.each(match.matchText.replace(':\\', '+\\').split(/[\:\;]+/), path => {
          classpathSet.add(this._asAbsolutePath(file.filePath,
            path.replace('+\\', ':\\')));
        });
      });
    });

    let classpath = '';
    _.each([...classpathSet], path => {
      classpath = classpath + path + separator;
    });
    this.classpath = classpath;
    return classpath;
  }

  // TODO: this is a quick hack for loading path. replace with atom-javaenv
  // once it has been implemented
  _asAbsolutePath(currentFilePath, path) {
    let p = path;
    let dirPath = currentFilePath.match(/(.*)[\\\/]/)[1];
    let addBaseDir = false;
    // Remove ../ or ..\ from beginning
    while (/^\.\.[\\\/]/.test(p)) {
      addBaseDir = true;
      dirPath = dirPath.match(/(.*)[\\\/]/)[1];
      p = p.substring(3);
    }
    // Remove ./ or .\ from beginning
    while (/^\.[\\\/]/.test(p)) {
      addBaseDir = true;
      p = p.substring(2);
    }
    return addBaseDir ? dirPath + '/' + p : p;
  }

}

export default new AtomAutocompletePackage();
