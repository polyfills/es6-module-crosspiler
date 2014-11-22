
var memo = require('memorizer')
var recast = require('recast')
var assert = require('assert')

var types = recast.types
var n = types.namedTypes
var b = types.builders

var Module = require('./module')

memo(Module.prototype, 'exports', function () {
  return this.ast.program.body.filter(isExportDeclaration)
})

function isExportDeclaration(node) {
  return n.ExportDeclaration.check(node)
}

Module.prototype.buildExports = function () {
  // [localVariable, exportedVariable]
  var exports = []

  this.exports.forEach(function (node) {
    var declaration = node.declaration

    if (node.default) {
      var id
      if (n.FunctionDeclaration.check(declaration) && declaration.id) {
        id = node._varname = declaration.id.name
      } else {
        id = node._varname = this.sourceToVariableName('default')
      }
      exports.push([id, 'default'])
      return
    }

    if (node.specifiers.length) {
      return node.specifiers.forEach(function (specifier) {
        var id = specifier.id.name
        exports.push([id, id])
      })
    }

    if (n.FunctionDeclaration.check(declaration)) {
      var id = declaration.id.name
      assert(id, 'unnamed function declaration')
      return exports.push([id, id])
    }

    if (n.VariableDeclaration.check(declaration)) {
      return declaration.declarations.forEach(function (declaration) {
        var id = declaration.id.name
        exports.push([id, id])
      })
    }

    if (n.ClassDeclaration.check(declaration)) {
      var id = declaration.id.name
      assert(id, 'unnamed class')
      return exports.push([id, id])
    }

    /* istanbul ignore next */
    assert(false, 'an error occured. you are probably using a bad version of esprima')
  }, this)

  if (!exports.length) return // nothing to export

  var obj = buildProperties(exports.map(function (pair) {
    return buildGetter(pair[0], pair[1])
  }))

  this.ast.program.body.unshift(b.expressionStatement(obj))
}

/**
 * Remove all the `export` statements after
 * converting them to CommonJS.
 */

Module.prototype.removeExports = function () {
  types.visit(this.ast.program, {
    visitExportDeclaration: function (path) {
      var declaration = path.node.declaration
      if (path.node.default) {
        // remove `export default`s
        if (n.FunctionDeclaration.check(declaration) && declaration.id) {
          path.replace(declaration)
        } else {
          path.replace(b.variableDeclaration('var', [
            b.variableDeclarator(
              b.identifier(path.node._varname),
              declaration
            )
          ]))
        }
      } else if (path.node.specifiers.length) {
        // remove `export { x, y }`s
        path.replace()
      } else {
        // remove the `export` from `export <expression>`
        path.replace(declaration)
      }

      return false
    }
  })
}

/**
 * { <as>: {
 *   get: {
 *     return <name>
 *   },
 *   enumerable: true
 * }}
 *
 * Returns a property
 */

function buildGetter(name, as) {
  return b.property(
    'init',
    b.identifier(as),
    b.objectExpression([
      b.property(
        'init',
        b.identifier('get'),
        b.functionExpression(
          null,
          [],
          b.blockStatement(
            [b.returnStatement(b.identifier(name))]
          )
        )
      ),
      b.property(
        'init',
        b.identifier('enumerable'),
        b.literal(true)
      )
    ])
  )
}

function buildProperties(properties) {
  return Object$seal(Object$defineProperties(
    b.identifier('exports'),
    properties
  ))
}

function Object$seal(obj) {
  return b.callExpression(
    b.memberExpression(
      b.identifier('Object'),
      b.identifier('seal'),
      false
    ),
    [obj]
  )
}

function Object$defineProperties(obj, properties) {
  return b.callExpression(
    b.memberExpression(
      b.identifier('Object'),
      b.identifier('defineProperties'),
      false
    ),
    [
      obj,
      b.objectExpression(properties)
    ]
  )
}
