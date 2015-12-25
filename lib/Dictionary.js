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
    if (trie) {
      return _.sortByOrder(trie.find(namePrefix),
        ['lastUsed', 'key'], ['desc', 'asc']);
    } else {
      return [];
    }
  }

  touch(result) {
    result.lastUsed = Date.now();
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
