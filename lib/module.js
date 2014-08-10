
var esprima = require('esprima')
var memo = require('memorizer')
var recast = require('recast')

module.exports = Module

Module.parse = function (string, options) {
  options = options || {}
  options.esprima = esprima
  return recast.parse(string, options)
}

Module.infer = function (string, useRegExp) {
  if (useRegExp) {
    var isModule = /\bexport | import |/.test(string)
    return {
      type: isModule ? 'module' : 'commonjs',
      default: isModule && /\bexport *default */.test(string),
      renames: Object.create(null),
      dependencies: Object.create(null),
    }
  }
  var ast = Module.parse(string)
  var mod = new Module(ast)
  mod.type
  mod.default
  mod.imports
  mod.exports
  // we don't need to keep the AST in memory
  mod.ast = null
  return mod
}

function Module(ast, options) {
  if (!(this instanceof Module)) return new Module(ast, options)

  this.ast = ast
  this.options = options || Object.create(null)

  this.dependencies = this.options.dependencies || Object.create(null)
  this.renames = this.options.renames || Object.create(null)
  this.renamed = Object.create(null)
}

Module.prototype.inspect = function () {
  return this.toJSON()
}

Module.prototype.toJSON = function () {
  return {
    type: this.type,
    default: this.default,
    dependencies: this.dependencies,
    renames: this.renames,
  }
}

Module.prototype.rename = function (from, to) {
  this.renames[from] = to
  return this
}

Module.prototype.set = function (name, obj) {
  this.dependencies[name] = obj
  return this
}

Module.prototype.lookup = function (name) {
  return this.dependencies[name] || this.renamed[name]
}

/**
 * Check whether a module is an ES6 module
 * by checking declarations at the top level scope.
 * If it's not an ES6 module, you can assume that
 * this module is a CommonJS module within this context.
 */

Module.prototype.isModule = function () {
  return !!(this.imports.length || this.exports.length)
}

memo(Module.prototype, 'type', function () {
  return this.isModule() ? 'module' : 'commonjs'
})

/**
 * Checks whether an `export default` exists.
 * The value or contents of it is not particularly important.
 * We just need to know whether to do `require('module')` or
 * `require('module').default`.
 */

Module.prototype.exportsDefault = function () {
  return this.exports.filter(hasDefault).length === 1
}

function hasDefault(node) {
  return node.default
}

memo(Module.prototype, 'default', function () {
  return this.exportsDefault()
})

/**
 * A variable version of an import declaration.
 * You can change this if you'd like.
 */

Module.prototype.sourceToVariableName = function (str) {
  return '__$mod_' + str.replace(/[^\w]/g, '_')
}

/**
 * Transpiles an ES6 module to CommonJS,
 * ES6-module-transpiler style.
 */

Module.prototype.transform = function () {
  var module = this.type === 'module'
  // rewrite all the things
  this.renameRequires()
  if (module) this.renameImports()
  // handle any require statements first
  this.defaultifyRequires()
  if (!module) return this.ast
  // handle imports, which go below exports
  this.buildRequires()
  this.removeImports()
  // handle exports, which go at the top
  this.buildExports()
  this.removeExports()
  // build the import references
  this.buildReferences()
  return this.ast
}
