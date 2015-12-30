# autocomplete-java

Autocomplete-plus provider for Java. Features:

* Complete package and class names
* Import classes
* Organize imports
* Examine public methods and properties of a class or instance and use them as snippets
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

You can also alter autocomplete behavior with package settings.  

NOTE:
* The package requires that either JAVA_HOME environment variable is set or java commands are found on path.
* The package requires compiled classes to function, but it does not compile classes from source. Use other tools for compiling.
* If the package fails to determine type of instance automatically, you can still examine class members with a class name if you know the type yourself (e.g. ArrayList.con...). Type determination will be improved in the future.

Tip:
1. At first, compile all your classes using your favorite build tool, and start your app.
2. Lint and compile classes automatically on save with [linter-javac](https://atom.io/packages/linter-javac). Also autocomplete-java refreshes a class automatically on save.
3. Reload changed classes automatically in JVM with [spring-loaded](https://github.com/spring-projects/spring-loaded) or some other JVM agent.

NOTE: Error in one class may prevent compilation of multiple classes. Therefore once you fix an error, multiple classes might be recompiled at once. So sometimes you might have to run 'project refresh' (shift-ctrl-alt+R) manually after you fix an error.

## TODO

For v1.0.0:
* Unit tests
* Fine tuning and small fixes

Later:
* Autocomplete constructors
* Autocomplete boilerplate implementations of getter and setter methods
* Autocomplete boilerplate implementations of inherited methods
* Show parameter names in method suggestions
* Show inherited methods in method suggestions
* Go to method declaration
* Intelligent determination of type (current implementation is just a quick hack)
* Fuzzy search
* Watch changed classes
* Support for Java extlibs
* Support for multiple root folders
* Support for symlinks

Check all open issues at [GitHub issues](https://github.com/keskiju/autocomplete-java/issues)

## Contribute

Contributions are welcome. Please comment on [issues](https://github.com/keskiju/autocomplete-java/issues) you would like to contribute to, or add feature requests of your own.
