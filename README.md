# autocomplete-java for Atom

Autocomplete-plus provider for Java. Package supports auto import.

![Screenshot](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

## Usage

Configure classpath via a .classpath file that is placed at the root directory of your project. For example:

    ./src:./classes:./lib/*

Refresh class descriptions by choosing "Packages -> Autocomplete Java -> Refresh" from the menu. Class descriptions are loaded in the order specified in the .classpath file. If you are using the load class members feature, put the most important paths first.

TIP: Use linter-javac package to compile your classes on save.

## Status

NOTE: This package is still under development and tested on OS X 10.11.2 only. Does not support Windows yet.

TODO soon:
* Unit tests
* Organize imports automatically
* Show all class members with ctrl-space
* Refresh all classes on project load
* Trigger refresh on add/change/move/delete of a class or jar file

TODO later:
* Intelligent sorting
* Fuzzy search
* Optimize 'load class members' for large projects
* Determine variable type
* Support for Windows
