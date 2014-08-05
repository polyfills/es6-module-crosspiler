
var esprima = require('esprima')
var recast = require('recast')
var types = require('ast-types')
var astUtils = require('ast-util')

var str = 'import a from \'b\'; console.log(a); function b() { console.log(a) }; b'

var ast = recast.parse(str, {
  esprima: esprima
})

types.visit(ast.program, {
  visitIdentifier: function (path) {
    if (!astUtils.isReference(path)) return false
    var name = path.node.name
    console.log(path.node.name)
    console.log(path.scope.declares(name))
    // console.log(path.scope.lookup(path.node.name))
    return this.traverse(path)
  }
})
