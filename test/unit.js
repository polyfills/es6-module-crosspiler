
describe('.type', function () {
  it('import-bare', function () {
    var ast = read('import-bare')
    var m = Module(ast)
    assert('module', m.type)
  })

  it('export-var', function () {
    var ast = read('export-var')
    var m = Module(ast)
    assert('module', m.type)
  })

  it('empty', function () {
    var ast = read('empty')
    var m = Module(ast)
    assert.equal(null, m.type)
  })

  it('common-exports', function () {
    var ast = read('common-exports')
    var m = Module(ast)
    assert.equal('commonjs', m.type)
  })

  it('module-exports', function () {
    var ast = read('module-exports')
    var m = Module(ast)
    assert.equal('commonjs', m.type)
  })
})

describe('.default', function () {
  it('export-var', function () {
    var ast = read('export-var')
    var m = Module(ast)
    assert(!m.default)
  })

  it('export-default', function () {
    var ast = read('export-default')
    var m = Module(ast)
    assert(m.default)
  })
})

describe('.renameImports()', function () {
  it('import-bare', function () {
    var ast = read('import-bare')
    var m = Module(ast)
    m.rename('./something', './else')
    m.renameImports()
    var result = recast.print(m.ast)
    assert(~result.code.indexOf('"./else"'))
  })
})

describe('Build Imports', function () {
  it('import-bare', function () {
    var ast = read('import-bare')
    var m = Module(ast)
    m.buildRequires()
    m.removeImports()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('import'))
    assert(!~result.code.indexOf('var'))
    var context = vm.createContext()
    vm.runInThisContext(vmRequire, context)
    vm.runInThisContext(result.code, context)
  })

  it('import-default', function () {
    var ast = read('import-default')
    var m = Module(ast, {
      dependencies: {
        'b': {
          default: true
        }
      }
    })
    m.buildRequires()
    m.removeImports()
    m.buildReferences()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('import'))
    assert(~result.code.indexOf('var __$mod_b = require("b");'))
    assert(~result.code.indexOf('__$mod_b.default'))
    assert(!~result.code.indexOf('(a)'))
    var context = vm.createContext()
    vm.runInThisContext(vmRequire, context)
    vm.runInThisContext(result.code, context)
  })

  it('import-multiple', function () {
    var ast = read('import-multiple')
    var m = Module(ast)
    assert.equal(3, m.imports.length)
    m.buildRequires()
    m.removeImports()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('import'))
    assert(~result.code.indexOf('var __$mod_d'))
    var context = vm.createContext()
    vm.runInThisContext(vmRequire, context)
    vm.runInThisContext(result.code, context)
  })

  it('import-as', function () {
    var ast = read('import-as')
    var m = Module(ast)
    m.buildRequires()
    m.removeImports()
    m.buildReferences()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('import'))
    assert(~result.code.indexOf('__$mod_c.a'))
    assert(~result.code.indexOf('__$mod_c.d'))
    var context = vm.createContext()
    vm.runInThisContext(vmRequire, context)
    vm.runInThisContext(result.code, context)
  })
})

describe('Build Exports', function () {
  it('export-default', function () {
    var ast = read('export-default')
    var m = Module(ast)
    m.buildExports()
    m.removeExports()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('export default'))
    var context = vm.createContext()
    vm.runInThisContext(vmExports, context)
    vm.runInThisContext(result.code, context)
    vm.runInThisContext('if (exports.default !== 1) throw new Error()', context)
  })

  it('export-default-expr', function () {
    var ast = read('export-default-expr')
    var m = Module(ast)
    m.buildExports()
    m.removeExports()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('export default'))
    var context = vm.createContext()
    vm.runInThisContext(vmExports, context)
    vm.runInThisContext(result.code, context)
    // these should be evaluated before we access the default
    vm.runInThisContext('if (a() !== "a") throw new Error()', context)
    vm.runInThisContext('if (o.prop1() !== "a") throw new Error()', context)
    vm.runInThisContext('if (o.prop2() !== "a") throw new Error()', context)
    // and the default itself
    vm.runInThisContext('if (exports.default() !== "a") throw new Error()', context)
  })

  it('export-multiple', function () {
    var ast = read('export-multiple')
    var m = Module(ast)
    m.buildExports()
    m.removeExports()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('export '))
    var context = vm.createContext()
    vm.runInThisContext(vmExports, context)
    vm.runInThisContext(result.code, context)
    vm.runInThisContext('if (exports.a !== 1) throw new Error()', context)
    vm.runInThisContext('if (exports.b !== 2) throw new Error()', context)
    vm.runInThisContext('if (exports.c !== 3) throw new Error()', context)
  })

  it('export-var', function () {
    var ast = read('export-var')
    var m = Module(ast)
    m.buildExports()
    m.removeExports()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('export '))
    assert(~result.code.indexOf('var a = 1'))
    var context = vm.createContext()
    vm.runInThisContext(vmExports, context)
    vm.runInThisContext(result.code, context)
    vm.runInThisContext('if (exports.a !== 1) throw new Error()', context)
  })

  it('export-function', function () {
    var ast = read('export-function')
    var m = Module(ast)
    m.buildExports()
    m.removeExports()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('export '))
    assert(~result.code.indexOf('function a()'))
    var context = vm.createContext()
    vm.runInThisContext(vmExports, context)
    vm.runInThisContext(result.code, context)
    vm.runInThisContext('if (typeof exports.a !== "function") throw new Error()', context)
  })

  it('export-class', function () {
    var ast = read('export-class')
    var m = Module(ast)
    m.buildExports()
    m.removeExports()
    var result = recast.print(m.ast)
    assert(!~result.code.indexOf('export '))
    assert(~result.code.indexOf('class Animal'))
  })
})

describe('.requires', function () {
  it('require-call', function () {
    var ast = read('require-call')
    var m = Module(ast)
    assert.equal(0, m.requires.length)
  })

  it('require-var', function () {
    var ast = read('require-var')
    var m = Module(ast)
    assert.equal(1, m.requires.length)
  })

  it('require-declared', function () {
    var ast = read('require-declared')
    var m = Module(ast)
    assert.equal(0, m.requires.length)
  })
})

describe('.renameRequires()', function () {
  it('require-var', function () {
    var ast = read('require-var')
    var m = Module(ast)
    m.rename('y', 'z')
    m.renameRequires()
    var result = recast.print(m.ast)
    assert(~result.code.indexOf('require("z")'))
  })
})

describe('.defaultifyRequires()', function () {
  it('require-var', function () {
    var ast = read('require-var')
    var m = Module(ast)
    m.set('y', {
      type: 'module',
      default: true
    })
    m.defaultifyRequires()
    var result = recast.print(m.ast)
    assert.equal('var x = require("y").default', result.code.trim())
  })
})

describe('.dependenciesOf', function () {
  it('import-as', function () {
    var ast = read('import-as')
    var deps = Module.dependenciesOf(ast)
    assert.deepEqual(['c'], deps)
  })

  it('import-bare', function () {
    var ast = read('import-bare')
    var deps = Module.dependenciesOf(ast)
    assert.deepEqual(['./something'], deps)
  })

  it('import-some', function () {
    var ast = read('import-some')
    var deps = Module.dependenciesOf(ast)
    assert.deepEqual(['c'], deps)
  })

  it('import-multiple', function () {
    var ast = read('import-multiple')
    var deps = Module.dependenciesOf(ast)
    assert.deepEqual(['a', 'b', 'd'], deps)
  })

  it('require-var', function () {
    var ast = read('require-var')
    var deps = Module.dependenciesOf(ast)
    assert.deepEqual(['y'], deps)
  })
})

describe('.inspect()', function () {
  it('import-as', function () {
    var ast = read('import-as')
    var mod = Module(ast)
    var json = mod.inspect()
    assert.deepEqual([
      'type',
      'default',
      'dependencies',
      'renames'
    ], Object.keys(json))
  })
})
