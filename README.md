# autocomplete-java for Atom

Autocomplete-plus provider with auto import support for Java.

![Screenshot](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

## Usage

Configure classpath via a .classpath file that is placed at the root directory of your project. For example:

    ./src:./classes:./lib/*

Class descriptions are loaded in the order specified in the .classpath file. If you are using the 'load class members' feature, I recommend you to put the most important paths in the classpath first, because current implementation is still unoptimized. Implementation does not yet observe file changes, but you can refresh class descriptions manually using the refresh command from menu.

TIP: Use linter-javac package to compile your classes on save.

## Status

NOTE: Tested on OS X. Probably works ok on some Linux distributions also. Does not support Windows yet.

TODO:
* Trigger refresh on add/change/move/delete of a class or jar file
* Unit tests
* Organize imports
* Intelligent sorting of suggestions
* Fuzzy search
* Optimize 'load class members'
* Determine variable type
* Support for Windows
