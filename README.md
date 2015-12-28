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

## Preview

![Screenshot](https://raw.github.com/keskiju/autocomplete-java/master/screenshot.gif)

## Usage

Configure classpath via a .classpath file that is placed at the root directory of your project. For example:

    ./src:./classes:./lib/*

You can also alter autocomplete behavior with package settings. Loading of class members is disabled by default, because current implementation is still unoptimized.

NOTE:
* Package requires that either JAVA_HOME environment variable is set or java commands are found on path.
* Refresh doesn't trigger automatically in all cases. Try manual refresh if you encounter problems.
* This package requires compiled classes to function, but it does not compile classes from source. Use other tools for compiling.

Tips:
* At first, compile all your classes using your favorite build tool
* Lint and compile a changed class automatically on save using [linter-javac](https://atom.io/packages/linter-javac) (autocomplete-java refreshes class description automatically on save)
* Reload a changed class automatically in JVM using [spring-loaded](https://github.com/spring-projects/spring-loaded)

## TODO

For v1.0.0:
* Unit tests
* Optimize 'load class members'
* Fine tuning and small fixes

Later:
* Autocomplete constructors
* Autocomplete boilerplate implementations of getter and setter methods
* Autocomplete boilerplate implementations of inherited methods
* Show parameter names in method suggestions
* Show inherited methods in method suggestions
* Go to method declaration
* Intelligent determination of type (current implementation is just a quick hack)
* Support for multiple root folders
* Support for symlinks
* Fuzzy search

Check all open issues at [GitHub](https://github.com/keskiju/autocomplete-java/issues)

## Contribute

Contributions are welcome. Comment on [issues](https://github.com/keskiju/autocomplete-java/issues) you would like to contribute to, or add your own feature requests.
