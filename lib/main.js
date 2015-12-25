'use babel';

import atomUtil from './atomUtil';
import { CompositeDisposable } from 'atom';
import { JavaAutocompleteProvider } from './JavaAutocompleteProvider';
//import * as config from './config.json';

class Main {

  constructor() {
    this.provider = undefined;
    this.config = require('./config.json');
  }

  activate() {
    this.provider = new JavaAutocompleteProvider();
    this.subscriptions = new CompositeDisposable();
    // Listen for refresh command
    this.subscriptions.add(atom.commands.add('atom-workspace',
      'autocomplete-java:refresh', () => { this._refresh() }));
    // Listen for file save
    atom.workspace.observeTextEditors(editor => {
      this.subscriptions.add(editor.getBuffer().onWillSave(() => {
        this._onSave(editor);
      }));
    });
    this._refresh();
  }

  _refresh(classFilePath) {
    // TODO observe config changes
    this.provider.configure(atom.config.get('autocomplete-java'));
    this.provider.loadClassDesciptions(
      atomUtil.getProjectRootDir(),
      atom.config.get('autocomplete-java.loadClassMembers'));
  }

  _onSave(editor) {
    // TODO organize imports on save (use buffer.transact?)

    // Refresh saved class after class has been compiled
    // TODO use watcher instead of hardcoded timeout
    let temp = editor.getText();
    let fileMatch = editor.getPath().match(/\/([^\/]*)\.java/);
    if (fileMatch) {
      let packageMatch = editor.getText().match(/package\s(.*);/);
      if (packageMatch) {
        setTimeout(() => {
          // TODO remove hardcoded bin
            this.provider.loadClassDescription(packageMatch[1] + '.' + fileMatch[1],
              atom.config.get('autocomplete-java.loadClassMembers'));
        }, 2000);
      }
    }
  }

  deactivate() {
    this.subscriptions.dispose();
    this.provider = null;
  }

  getProvider() {
    return this.provider;
  }

}

export default new Main();
