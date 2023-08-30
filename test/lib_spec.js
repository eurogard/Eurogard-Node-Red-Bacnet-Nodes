// var should = require("should");
var helper = require('node-red-node-test-helper')
var configBacnet = require('../red/bacnet.js')
helper.init(require.resolve('node-red'))
// console.log(require.resolve('node-red'))
// console.log(helper)

describe('config-bacnet Node', function () {
  beforeEach(function (done) {
    helper.startServer(done)
  })

  afterEach(function (done) {
    helper.unload()
    helper.stopServer(done)
  })

  it('should be loaded', function (done) {
    var flow = [
      { id: 'n1', type: 'bacnet out', name: 'bo' },
      { id: 'n2', type: 'bacnet in', name: 'bi' },
      { id: 'n3', type: 'bacnet control', name: 'bc' },
    ]
    helper.load(configBacnet, flow, function () {
      var n1 = helper.getNode('n1')
      var n2 = helper.getNode('n2')
      var n3 = helper.getNode('n3')
      // console.log({ n2 })
      // console.log({ n1 })
      // console.log({ n3 })
      try {
        n1.should.have.property('type', 'bacnet out')
        n1.should.have.property('command', undefined)
        n1.should.have.property('commands', undefined)
        n1.should.have.property('endpoint', undefined)
        n2.should.have.property('type', 'bacnet in')
        n2.should.have.property('command', undefined)
        n2.should.have.property('commands', undefined)
        n2.should.have.property('endpoint', undefined)
        n3.should.have.property('type', 'bacnet control')
        n3.should.have.property('serverConfig', null)
        n3.should.have.property('devices', undefined)
        n3.should.have.property('command', undefined)
        n3.should.have.property('commands', undefined)
        n3.should.have.property('bac_type', undefined)
        n3.should.have.property('parameters', undefined)
        done()
      } catch (err) {
        done(err)
      }
    })
  })
})
