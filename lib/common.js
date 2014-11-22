
var memo = require('memorizer')
var recast = require('recast')

var types = recast.types
var b = types.builders

var Module = require('./module')

/**
 * Return a list of `require()`s.
 */

memo(Module.prototype, 'requires', function () {
  var requires = []
  types.visit(this.ast.program, {
    visitFunction: function (path) {
      if (skipFunctionTraversal(path)) return false
      this.traverse(path)
    },
    visitCallExpression: function (path) {
      if (isRequireExpression(path)) {
        requires.push(path.node)
        return false
      }
      this.traverse(path)
    }
  })

  return requires
})

/**
 * Look for `module.exports = ` or `exports[x] = `
 */

memo(Module.prototype, 'hasCommonExports', function () {
  var hasCommonExports = false
  types.visit(this.ast.program, {
    visitIdentifier: function (path) {
      var id = path.value.name
      if (id === 'module' && !path.scope.lookup('module')
        || id === 'exports' && !path.scope.lookup('exports')) {
        hasCommonExports = true
        return false
      }
      this.traverse(path)
    }
  })
  return hasCommonExports
})

/**
 * Skip function traversals if a `require()` function is defined
 * somewhere, because then we're not trying to use a CommonJS require.
 */

function skipFunctionTraversal(path) {
  // `require` is defined somewhere
  if (path.scope.lookup('require')) return true
  // this function is called require()
  var id = path.node.id
  if (!id) return false // UNTESTED: skip anonymous functions
  if (id.name === 'require') return true
  return false
}

/**
 * Check whether a node is a `require()` expression.
 */

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
    renamed[rename] = dependencies[value]
  })
  return this
}

/**
 * Renames `require()` to `require().default` where ever appropriate.
 */

Module.prototype.defaultifyRequires = function () {
  var self = this
  types.visit(this.ast.program, {
    visitFunction: function (path) {
      if (skipFunctionTraversal(path)) return false
      this.traverse(path)
    },
    visitCallExpression: function (path) {
      if (isRequireExpression(path)) {
        var id = path.node.arguments[0].value
        var dep = self.lookup(id)
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
        return false
      }
      this.traverse(path)
    }
  })
}
