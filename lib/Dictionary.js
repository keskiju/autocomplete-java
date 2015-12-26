'use babel';

import { _ } from 'lodash';
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

  touch(result) {
    result.lastUsed = Date.now();
  }

  _getTrie(category, create) {
    let trie = this.tries.get(category);
    if (!trie && create) {
      trie = new Triejs({ returnRoot: true, sort: sortTrie });
      this.tries.set(category, trie);
    }
    return trie;
  }

}

function sortTrie() {
  this.sort(function(a, b) {
    let compare = b.lastUsed - a.lastUsed;
    if (compare === 0) {
      compare = a.name.localeCompare(b.name);
    }
    return compare;
  });
}
