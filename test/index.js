

vm = require('vm')
fs = require('fs')
path = require('path')
recast = require('recast')
assert = require('assert')
esprima = require('esprima')

Module = require('..')


vmExports = 'var exports = {}'
vmRequire = 'function require() { return {} }'

read = function read(name) {
  return Module.parse(fixture(name))
}

fixture = function fixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name + '.js'), 'utf8')
}

require('./unit')
require('./transform')
