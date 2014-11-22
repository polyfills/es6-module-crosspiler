
# es6-module-crosspiler

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]
[![Gittip][gittip-image]][gittip-url]


ES6 module crosspiler is an ES6 module transpiler that supports both
ES6 modules as well as CommonJS modules,
which are not designed to be compatible with each other.
This allows mixed usage of tomorrow's ES6 modules and today's CommonJS modules.
Hopefully, we may use this transpiler while we migrate our CommonJS modules
to ES6 modules.

## How It Works

When defaulting-importing a CommonJS module from an ES6 module,
the transpilation will look like:

```js
import x from 'commonjs_module'
// becomes
var x = require('commonjs_module')
```

This is slightly different than regular ES6 modules as you would be requiring `.default`.

When `require()`ing a ES6 module from a CommonJS module, transpilation will look like:

```js
var x = require('es6_module')
// if es6_module exports default
var x = require('es6_module').default
// otherwise it'll stay the same
var x = require('es6_module')
```

This requires knowledge of the type of each dependency.
Of course, if you have a module that has both `export default` and regular `export`s,
CommonJS modules will only be able to access `default` (which is pretty close in intention).
This is a limitation of cross compatibility (and a feature of ES6 modules),
but you should consider this when writing ES6 modules.

```js
export default fn

// CommonJS modules could never touch this
export var a = 1

function fn() {
  a++
}
```

This transpiler also assumes that all modules are ES6 modules
that do not `export default` unless specified otherwise.

## Differences between es6-module-crosspiler

This transpiler is lower-level, meaning it does not have a concept of a container or resolver.
It does not expect modules to be retrieved from the file system
which allows more flexibility within existing build systems.
It does not have as many abstractions as it does not support custom formatters;
this module currently only supports transpilation between ES6 module and CommonJS modules.

## Example

```js
var recast = require('recast')
var esprima = require('esprima-fb')
var Module = require('es6-module-crosspiler')

// parse the code with recast
// make sure you use a version of esprima that supports ES6 module syntax
var ast = recast.parse('import "some/code"', {
  esprima: esprima
})

var m = Module(ast)

// set the metadata of a dependency
// if not set, it essentially defaults to { type: 'module', default: false }
m.set('some/code', {
  type: 'module',
  default: true
})

ast = m.transform(ast)

var result = recast.print(ast)
console.log(result.code)
console.log(result.map)
```

## API

### Convenience Methods

#### ast = Module.transform(ast, [options])

Transform a module recast-style.

#### var names = Module.dependenciesOf(ast || module)

Get all the dependency names.

### Initialization and Metadata

#### var module = new Module(ast, [options])

`ast` is the AST body as parsed by `recast`.
`recast` is not included, and you probably need a custom version of
`esprima` as the official versions do not entirely support ES6 modules.

Options are:

- `dependencies` - hash lookup of dependencies if you don't want to set them via `.set()`
- `renames` - hash lookup of renames if you don't want to set them via `.rename()`

#### .rename(from, to)

Rename a dependency's name.

#### .set(name, object)

Set the metadata needed for a dependency.
Could be either an object or another `Module` instance.

```js
m.set('./some/dependency', {
  type: 'commonjs'
})
m.set('./another/dependency', Module(another_ast))
```

#### .type

The type of module this is considered.
Either `commonjs` or `module`.

#### .default

Whether this module `export default`.

#### .transform()

This converts the entire AST to a CommonJS module.
It simply executes the following methods in the "correct" order,
so feel free to customize your build.

#### var varname = module.sourceToVariableName(name)

This is a custom function that allows you to customize the variable names
from ES6 modules. For example, your transpiled JS might look like:

```js
var __$mod___some_dependency = require('./some/dependency');
```

If you don't like how this looks, change this function.
But this is really irrelevant after minification.

### ES6 Module Imports

#### .imports[]

Get the raw AST `import` nodes.

#### .renameImports()

Renames all the imports based on `.rename()`.

#### .buildRequires()

Initializes all the `var x = require('y')`s at the top of the module.

#### .buildReferences()

Renames variables defined by `import` statements to references.
Can only be executed after `.buildRequires()`.

```js
import { x } from 'y'

console.log(x)
```

Becomes

```js
var __$mod_y = require('y')

console.log(__$mod_y.x)
```

#### .removeImports()

Removes all the `import` statements.

### ES6 Module Exports

#### .exports[]

Get the raw AST `export` nodes

#### .buildExports()

Creates the giant `Object.defineProperties()` object at the top.
You should build the exports before the imports to avoid
circular dependency issues.

#### .removeExports()

Removes all the `export` statements.

### CommonJS require()s

#### .requires[]

Get the raw AST `require()` nodes.

#### .renameRequires()

Renames all the `require()` calls based on `.rename()`.

#### .defaultifyRequires()

Visits every `require()` call and adds `.default`
if the `require()`d module is an ES6 module.
You should execute this before converting `import`s to `require()`s.

[npm-image]: https://img.shields.io/npm/v/es6-module-crosspiler.svg?style=flat-square
[npm-url]: https://npmjs.org/package/es6-module-crosspiler
[github-tag]: http://img.shields.io/github/tag/polyfills/es6-module-crosspiler.svg?style=flat-square
[github-url]: https://github.com/polyfills/es6-module-crosspiler/tags
[travis-image]: https://img.shields.io/travis/polyfills/es6-module-crosspiler.svg?style=flat-square
[travis-url]: https://travis-ci.org/polyfills/es6-module-crosspiler
[coveralls-image]: https://img.shields.io/coveralls/polyfills/es6-module-crosspiler.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/polyfills/es6-module-crosspiler?branch=master
[david-image]: http://img.shields.io/david/polyfills/es6-module-crosspiler.svg?style=flat-square
[david-url]: https://david-dm.org/polyfills/es6-module-crosspiler
[license-image]: http://img.shields.io/npm/l/es6-module-crosspiler.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/es6-module-crosspiler.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/es6-module-crosspiler
[gittip-image]: https://img.shields.io/gittip/jonathanong.svg?style=flat-square
[gittip-url]: https://www.gittip.com/jonathanong/
