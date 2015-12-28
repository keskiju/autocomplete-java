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

**NOTE: Still under development.**

## Preview

![Screenshot](https://raw.github.com/keskiju/autocomplete-java/master/screenshot.gif)

## Usage

Configure classpath via a .classpath file that is placed at the root directory of your project. For example:

    ./src:./classes:./lib/*

You can also alter autocomplete behavior with package settings. Loading of class members is disabled by default, because implementation is still unoptimized.

Refresh doesn't trigger automatically in all cases. Try manual refresh if you encounter problems.

NOTE: Package requires that either JAVA_HOME environment variable is set or java commands are found on path.

NOTE: This package does not compile classes from source because there should be only one package that does that. Use [linter-javac](https://atom.io/packages/linter-javac) or some other package/tool for compiling. Preferably all classes should be compiled first on project load, and then each class separately on save.

## TODO

For v1.0.0:
* Unit tests
* Optimize 'load class members'
* Fine tuning and small fixes

Later:
* Compilation from source (on project load / on file save) as a separate package. Trigger refresh after compilation has ended.
* Autocomplete constructors
* Autocomplete implementations of getter and setter methods
* Autocomplete implementations of inherited methods
* Show parameter names in method suggestions
* Show inherited methods in method suggestions
* Go to method declaration
* Intelligent determination of type (current implementation is just a quick hack)
* Support for multiple root folders
* Support for symlinks
* Fuzzy search

Check all open issues at [GitHub](https://github.com/keskiju/autocomplete-java/issues)

## Contribute

Contributions are welcome. Comment on issues you would like to contribute to.
