
var astUtils = require('ast-util')
var memo = require('memorizer')
var recast = require('recast')

var types = recast.types
var n = types.namedTypes
var b = types.builders

var Module = require('./module')

memo(Module.prototype, 'imports', function () {
  return this.ast.program.body.filter(isImportDeclaration)
})

function isImportDeclaration(node) {
  return n.ImportDeclaration.check(node)
}

/**
 * Optionally rename `import` statements.
 */

Module.prototype.renameImports = function () {
  var renames = this.renames
  var renamed = this.renamed
  var dependencies = this.dependencies
  this.imports.forEach(function (node) {
    var value = node.source.value
    var rename = renames[value]
    if (!rename) return
    node.source.value = rename
    renamed[value] = dependencies[value]
  })
  return this
}

/**
 * Build require() statements
 */

Module.prototype.buildImports =
Module.prototype.buildRequires = function () {
  var dependencies = this.dependencies
  // we unshift all the declarations at once
  // to keep ordering the same
  var declarations = []

  this.imports.forEach(function (node) {
    var value = node.source.value

    // import 'x' -> require('x')
    // don't need to check whether default is exported
    // or what type of module the dependency is here
    if (node.kind === undefined)
        return declarations.push(b.expressionStatement(buildRequire(value)))

    // import X from 'y' -> var X = require('y')
    // this is a special case when the dependency is CJS
    // to do: also check if it's renamed
    if (node.kind === 'default'
      && dependencies[value]
      && dependencies[value].type === 'commonjs') {
      var name = node.specifiers[0].id.name
      return declarations.push(buildRequireDeclaration(name, value))
    }

    // named exports, creates a unique variable name
    // then exports that as the require
    // import { x, y } from 'z' -> var __z = require('z')
    // then the `x` and `y`s are done later
    var name = node._varname = this.sourceToVariableName(value)
    return declarations.push(buildRequireDeclaration(name, value))
  }, this)

  // add it to the top
  this.ast.program.body = declarations.concat(this.ast.program.body)
}

function buildRequireDeclaration(variable, value) {
  return b.variableDeclaration('var', [
    b.variableDeclarator(
      b.identifier(variable),
      buildRequire(value)
    )
  ])
}

function buildRequire(value) {
  return b.callExpression(
    b.identifier('require'),
    [b.literal(value)]
  )
}

Module.prototype.buildReferences = function () {
  var lookup = Object.create(null)

  // lookup[var] = { varname, id }
  this.imports.forEach(function (node) {
    var varname = node._varname
    if (!varname) return

    node.specifiers.forEach(function (specifier) {
      var id = node.kind === 'default'
        ? 'default'
        : specifier.id.name
      var name = specifier.name
        ? specifier.name.name
        : specifier.id.name
      lookup[name] = {
        id: id,
        varname: varname
      }
    })
  })

  types.visit(this.ast.program, {
    visitIdentifier: function (path) {
      // make sure it's a variable reference
      if (!astUtils.isReference(path)) return false
      var name = path.node.name
      // if this name has been declared somewhere, do nothing
      if (path.scope.declares(name)) return false

      // not defined by import bindings
      var reference = lookup[name]
      if (!reference) return false

      path.replace(b.memberExpression(
        b.identifier(reference.varname),
        b.identifier(reference.id),
        false
      ))
      return false
    }
  })
}

Module.prototype.removeImports = function () {
  var body = this.ast.program.body
  for (var i = 0; i < body.length; i++) {
    var node = body[i]
    if (n.ImportDeclaration.check(node)) body.splice(i--, 1)
  }
}
