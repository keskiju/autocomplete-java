# autocomplete-java for Atom

Autocomplete-plus provider for Java that supports auto import.

![Screenshot](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

## Usage

Configure classpath via a .classpath file that is placed at the root directory of your project. File contents for example:

    .:./lib/*

Refresh class descriptions by choosing "Packages -> Autocomplete Java -> Refresh" from the menu.

TIP: Use linter-javac package to compile your classes on save.

## Status

NOTE: This package is still under development and tested on OS X 10.11.2 only. Does not support Windows yet.

TODO soon:
* Support for Java system classes (currently loads only a few system classes)
* Support for duplicate class and method names
* Parallel class scan for more speed
* Unit tests
* Compile and refresh all classes on project load
* Trigger refresh for added, changed, moved or deleted class or jar file
* Organize imports automatically

TODO later:
* Optimize for large projects
* Support for Windows
