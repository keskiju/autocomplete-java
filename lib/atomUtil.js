'use babel';

let fs = require('fs');

class AtomUtil {

  getProjectRootDir() {
    let textEditor = atom.workspace.getActiveTextEditor();
    return atom.project.getPaths().sort((a, b) => {
      return (b.length - a.length)
    }).find((p) => {
      let realpath = fs.realpathSync(p);
      return textEditor.getPath().substr(0, realpath.length) == realpath;
    });
  }

}

export default new AtomUtil();
