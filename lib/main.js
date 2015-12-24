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
    this.subscriptions.add(atom.commands.add('atom-workspace',
      'autocomplete-java:refresh', () => { this.refresh() }));
    this.refresh();
  }

  refresh() {
    // TODO observe config changes
    this.provider.configure(atom.config.get('autocomplete-java'));
    let loadClassMembers = atom.config.get('autocomplete-java.loadClassMembers');
    let rootDir = atomUtil.getProjectRootDir();
    this.provider.loadClassDesciptions(loadClassMembers, rootDir);
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
