'use babel';

import { _ } from 'lodash';

class JavaUtil {

  getSimpleName(className) {
    return className.match(/[^\.]*$/g)[0];
  }

  getPackageName(className) {
    return className.replace('.' + this.getSimpleName(className), '');
  }

  getInverseName(className) {
    return _.reduceRight(className.split('.'), (result, next) => {
      return result + next;
    }, '');
  }

}

export default new JavaUtil();
