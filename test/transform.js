
describe('.transform()', function () {
  it('export-bindings', function () {
    var ast = read('export-bindings')
    ast = Module.transform(ast)
    var result = recast.print(ast)
    var context = vm.createContext()
    vm.runInThisContext(vmExports, context)
    vm.runInThisContext(result.code, context)
    vm.runInThisContext('if (exports.a !== 1) throw new Error()', context)
    vm.runInThisContext('exports.update()', context)
    vm.runInThisContext('if (exports.a !== 2) throw new Error()', context)
  })

  it('underscoreish', function () {
    var ast = read('underscoreish')
    var m = Module(ast)
    m.transform()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('return x'))
    assert(!~result.code.indexOf('return y'))
    assert(~result.code.indexOf('__$mod_y.default'))
    assert(~result.code.indexOf('__$mod_r.y'))
    var context = vm.createContext()
    vm.runInThisContext(vmExports, context)
    vm.runInThisContext(vmRequire, context)
    vm.runInThisContext(result.code, context)
    vm.runInThisContext('if (typeof exports.default !== "function") throw new Error()')
    vm.runInThisContext('if (typeof exports.a !== "function") throw new Error()')
    vm.runInThisContext('if (typeof exports.b !== "function") throw new Error()')
  })

  it('jade', function () {
    var ast = read('jade')
    var m = Module(ast)
    m.transform()
    var result = recast.print(m.ast)
    var context = vm.createContext()
    vm.runInThisContext(vmExports, context)
    vm.runInThisContext(vmRequire, context)
    vm.runInThisContext(result.code, context)
    vm.runInThisContext('if (typeof exports.default !== "function") throw new Error()')
  })

  it('export-default-string', function () {
    var ast = read('export-default-string')
    var m = Module(ast)
    m.transform()
    var result = recast.print(m.ast)
    var context = vm.createContext()
    vm.runInThisContext(vmExports, context)
    vm.runInThisContext(result.code, context)
    vm.runInThisContext('if (exports.default !== "LOL") throw new Error()')
  })

  it('domify', function () {
    var ast = read('domify')
    var m = Module(ast)
    m.set('domify@1.2.2', {
      type: 'commonjs',
      default: false,
    })
    m.transform()
    var result = recast.print(m.ast)
    assert(~result.code.indexOf('require("domify@1.2.2")'))
    assert(~result.code.indexOf('domify('))
    var context = vm.createContext()
    vm.runInThisContext('function require() { return function domify(){} }', context)
    vm.runInThisContext(result.code, context)
  })

  it('domify renamed', function () {
    var ast = read('domify')
    var m = Module(ast)
    m.rename('domify@1.2.2', 'component/domify@1.2.2')
    m.set('domify@1.2.2', {
      type: 'commonjs',
      default: false,
    })
    m.transform()
    var result = recast.print(m.ast)
    assert(~result.code.indexOf('require("component/domify@1.2.2")'))
    assert(~result.code.indexOf('domify('))
    var context = vm.createContext()
    vm.runInThisContext('function require() { return function domify(){} }', context)
    vm.runInThisContext(result.code, context)
  })

  it('domify renamed again', function () {
    var ast = read('domify')
    var m = Module(ast)
    m.rename('domify@1.2.2', 'component/domify@1.2.2')
    m.set('component/domify@1.2.2', {
      type: 'commonjs',
      default: false,
    })
    m.transform()
    var result = recast.print(m.ast)
    assert(~result.code.indexOf('require("component/domify@1.2.2")'))
    assert(~result.code.indexOf('domify('))
    var context = vm.createContext()
    vm.runInThisContext('function require() { return function domify(){} }', context)
    vm.runInThisContext(result.code, context)
  })
})
