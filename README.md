# autocomplete-java

Autocomplete-plus provider for Java. Features:

* Complete package and class names
* Import classes
* Organize imports
* Examine public methods and properties of a class and use them as snippets
* Crude determination of type
* Intelligent suggestions (remembers previous selections)
* Refresh class description automatically on save (after compile)
* Refresh all class descriptions manually with the refresh command

Official page for package at atom.io: [autocomplete-java](https://atom.io/packages/autocomplete-java)

**NOTE: Still under development. Tested on OS X only. Might work on Linux. Does not support Windows yet!**

![Screenshot](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

## Usage

Configure classpath via a .classpath file that is placed at the root directory of your project. For example:

    ./src:./classes:./lib/*

You can also alter autocomplete behavior with package settings. Loading of class members is disabled by default, because implementation is still unoptimized.

Refresh doesn't trigger automatically in all cases. Try manual refresh if you have problems.

NOTE: There should be only one package that compiles classes, and other plugins should rely on that. Therefore this package does not compile classes from source. Use [linter-javac](https://atom.io/packages/linter-javac) or some other package/tool for compiling. Preferably all classes should be compiled first on project load, and then each class separately on save.

## TODO

For v1.0.0:
* Screenshot
* Support for Windows
* Testing on Linux
* Unit tests
* Optimize 'load class members'
* Clean old class members on refresh
* Misc small fixes

Maybe later:
* Show inherited class members in suggestions
* Show method parameter names
* Go to method declaration
* More intelligent determination of type (current implementation is just a quick hack)
* Support for multiple root folders
* Support for symlinks
* Fuzzy search
