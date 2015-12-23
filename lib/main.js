'use babel';

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
    let fetchMembers = atom.config.get('autocomplete-java.fetchMembers');
    this.provider.loadSuggestions(fetchMembers);
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
