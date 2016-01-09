'use babel';

import { Triejs } from 'triejs';

function sortTrie() {
  this.sort((a, b) => {
    let compare = b.lastUsed - a.lastUsed;
    if (compare === 0) {
      compare = a.name.localeCompare(b.name);
    }
    return compare;
  });
}

export class Dictionary {

  constructor() {
    this.tries = new Map();
  }

  add(category, name, desc) {
    this._getTrie(category, true).add(name, desc);
  }

  remove(category, name) {
    try {
      this._getTrie(category, true).remove(name);
    } catch (err) {
      // OK
    }
  }

  removeCategory(category) {
    this.tries.delete(category);
  }

  find(category, namePrefix) {
    const trie = this._getTrie(category);
    return trie ? trie.find(namePrefix) : [];
  }

  touch(result) {
    result.lastUsed = Date.now();
  }

  _getTrie(category, create) {
    let trie = this.tries.get(category);
    if (!trie && create) {
      trie = new Triejs({
        returnRoot: true,
        sort: sortTrie,
        enableCache: false,
      });
      this.tries.set(category, trie);
    }
    return trie;
  }

}
