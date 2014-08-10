
var memo = require('memorizer')
var recast = require('recast')

var types = recast.types
var b = types.builders

var Module = require('./module')

memo(Module.prototype, 'requires', function () {
  var requires = []
  types.visit(this.ast.program, {
    visitFunction: function (path) {
      if (skipFunctionTraversal(path)) return false
      this.traverse(path)
    },
    visitCallExpression: function (path) {
      if (isRequireExpression(path)) requires.push(path.node)
      return false
    }
  })

  return requires
})

function skipFunctionTraversal(path) {
  // `require` is defined somewhere
  if (path.scope.lookup('require')) return true
  // this function is called require()
  var id = path.node.id
  if (!id) return false // UNTESTED: skip anonymous functions
  if (id.name === 'require') return true
  return false
}

function isRequireExpression(path) {
  // only global `require`
  if (path.scope.lookup('require')) return false
  // `require()``
  if (path.node.callee.name !== 'require') return false
  // one argument
  var args = path.node.arguments
  if (args.length !== 1) return false
  // must be a literal
  var arg = args[0]
  if (arg.type !== 'Literal') return false
  return true
}

/**
 * Optionally rename `require()` statements as long as
 * it's just a string.
 */

Module.prototype.renameRequires = function () {
  var renames = this.renames
  var renamed = this.renamed
  var dependencies = this.dependencies
  this.requires.forEach(function (node) {
    var value = node.arguments[0].value
    var rename = renames[value]
    if (!rename) return
    node.arguments[0].value = rename
    renamed[value] = dependencies[value]
  })
  return this
}

/**
 * Renames `require()` to `require().default` where ever appropriate.
 */

Module.prototype.defaultifyRequires = function () {
  var dependencies = this.dependencies
  types.visit(this.ast.program, {
    visitFunction: function (path) {
      if (skipFunctionTraversal(path)) return false
      this.traverse(path)
    },
    visitCallExpression: function (path) {
      if (isRequireExpression(path)) {
        var id = path.node.arguments[0].value
        var dep = dependencies[id]
        if (dep && dep.type === 'module' && dep.default) {
          path.replace(b.memberExpression(
            b.callExpression(
              b.identifier('require'),
              [b.literal(id)]
            ),
            b.identifier('default'),
            false
          ))
        }
      }
      return false
    }
  })
}
