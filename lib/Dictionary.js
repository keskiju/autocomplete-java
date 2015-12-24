'use babel';

import { Triejs } from 'triejs';

export class Dictionary {

  constructor() {
    this.tries = new Map();
  }

  add(category, name, desc) {
    this._getTrie(category, true).add(name, desc);
  }

  find(category, namePrefix) {
    let trie = this._getTrie(category);
    return trie ? trie.find(namePrefix) : [];
  }

  _getTrie(category, create) {
    let trie = this.tries.get(category);
    if (!trie && create) {
      trie = new Triejs({ returnRoot: true });
      this.tries.set(category, trie);
    }
    return trie;
  }

}
