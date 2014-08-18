
var fs = require('fs')
var recast = require('recast')
var profile = require('debug')('es6-module-crosspiler:profile')

var mocha = fs.readFileSync(require.resolve('mocha/mocha.js'), 'utf8')

var Module = require('..')

{ // dry run
  profile.enabled = false
  var ast = Module.parse('')
  ast = Module.transform(ast)
  recast.print(ast)
}

{
  profile.enabled = true
  profile('beginning transform without source map')
  var ast = Module.parse(mocha)
  profile('parsed AST')
  ast = Module.transform(ast)
  profile('transformed AST')
  recast.print(ast)
  profile('stringified AST')
}

{
  profile.enabled = true
  profile('beginning transform with source map')
  var ast = Module.parse(mocha, {
    sourceFileName: 'mocha.js'
  })
  profile('parsed AST')
  ast = Module.transform(ast)
  profile('transformed AST')
  recast.print(ast, {
    sourceMapName: 'mocha.js'
  })
  profile('stringified AST')
}
