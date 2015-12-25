# autocomplete-java

Autocomplete-plus provider for Java.

![Screenshot](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

## Usage

Configure classpath via a .classpath file that is placed at the root directory of your project. For example:

    ./src:./classes:./lib/*

If you are using the 'load class members' feature, I recommend you to put the most important paths in the classpath first, because current implementation is still unoptimized. Class descriptions are loaded in the order specified in the .classpath file.

TIP: Use linter-javac package to compile your classes on save.

## Features

* Autocomplete class names
* Auto import classes
* Organize imports automatically on save (TODO)
* Examine methods and variables of a class and use them as snippets
* Intelligent sorting of suggestions
* Refresh class descriptions automatically on save (if linter-javac enabled)
* Refresh all class descriptions manually with the refresh command

## Status

Tested on OS X. Probably works ok on some Linux distributions also. Does not support Windows yet.

TODO:
* Organize imports automatically on save
* Clean old class members on refresh
* Screenshot
* Unit tests
* Testing on Linux
* Support for Windows
* Optimize 'load class members'
* Fuzzy search
* Determine variable type
