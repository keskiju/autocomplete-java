'use babel';

import { Triejs } from 'triejs';

export class Dictionary {

  constructor() {
    this.tries = new Map();
  }

  add(category, name, desc) {
    this._getTrie(category).add(name, desc);
  }

  find(category, namePrefix) {
    return this._getTrie(category).find(namePrefix);
  }

  _getTrie(category) {
    let trie = this.tries.get(category);
    if (!trie) {
      trie = new Triejs();
      this.tries.set(category, trie);
    }
    return trie;
  }

}
