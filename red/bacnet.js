module.exports = function (RED) {
  RED.httpAdmin.get('/lib/*', function (req, res) {
    // allow access to the lib folder using httpAdmin
    var options = {
      root: __dirname + '/lib/',
      dotfiles: 'deny',
    }
    res.sendFile(req.params[0], options) // send the requested file
  })
    ; ('use strict')

  var inspect = require('util').inspect

  function Bacnet(n) {
    /*
     * This function is called when a new instance of the node is created.
     * It is attached to the node's prototype, so it can be used to set
     * instance variables (e.g. this.name = n.name).
     * It is called with the following parameters:
     * - n: the configuration object passed to the node
     * (see bacnet.html)
     */

    RED.nodes.createNode(this, n)
    this.endpoint = n.endpoint
    this.serverConfig = RED.nodes.getNode(this.endpoint)
    this.devices = n.devices
    this.command = n.command
    this.commands = n.commands
    this.bac_type = n.bac_type
    this.parameters = n.parameters
    this.client_id = RED.util.generateId()
    var node = this // track "this" context when scope changes

    // connection setup
    if (!node.serverConfig) {
      // no config node -> error
      return node.error(RED._('websocket.errors.missing-conf'))
    } else {
      node.serverConfig.registerInputNode(node)

      // configure _serverConfig__ ====

      node.serverConfig.on('opened', function (event) {
        if (
          n.command != undefined &&
          n.command.message != undefined &&
          n.command.message != 'from_input'
        ) {
          node.log('On Open: Sending: ' + node.command.message)
          bacnet_cmd(node, {})
        }
        this.status({
          fill: 'green',
          shape: 'dot',
          text: RED._('websocket.status.connected', { count: event.count }),
          event: 'connect',
          _session: { type: 'bacnet-websocket', id: event.id },
        })
      })

      this.serverConfig.on('error', function (event) {
        this.status({
          fill: 'red',
          shape: 'ring',
          text: 'common.status.error',
          event: 'error',
          _session: { type: 'bacnet-websocket', id: event.id },
        })
      })
      this.serverConfig.on('closed', function (event) {
        var status
        if (event.count > 0) {
          status = {
            fill: 'green',
            shape: 'dot',
            text: RED._('websocket.status.connected', { count: event.count }),
          }
        } else {
          status = { fill: 'red', shape: 'ring', text: 'common.status.disconnected' }
        }
        status.event = 'disconnect'
        status._session = { type: 'bacnet-websocket', id: event.id }
        this.status(status)
      })
    }

    // configure node events and callbacks ====

    this.on('close', function () {
      if (this.serverConfig) {
        this.serverConfig.removeInputNode(this)
      }
      this.status({})
    })

    // listen for nodered messages
    this.on('input', function (msg, nodeSend, nodeDone) {
      var payload
      if (this.command.message !== 'from_input') {
        this.log('Incoming message discarded because cmd is not from_input')
        return
      }
      if (this.serverConfig.wholemsg) {
        var sess
        if (msg._session) {
          sess = JSON.stringify(msg._session) // pass session data along unchanged
        }
        delete msg._session // strip our copy of the session
        if (sess) {
          msg._session = JSON.parse(sess)
        }
      } else if (msg.hasOwnProperty('payload')) {
        if (!Buffer.isBuffer(msg.payload)) {
          payload = RED.util.ensureString(msg.payload) // convert anything else to a string
        } else {
          payload = JSON.parse(msg.payload) // if it's a buffer, assume it's JSON
        }
      }

      payload = JSON.parse(payload)
      if (payload) {
        if (msg._session && msg._session.type == 'bacnet-websocket') {
          // if msg has a session object, it must have come from this node -> message is part of a conversation
          // => send it to the server
          this.serverConfig.reply(msg._session.id, payload)
        } else {
          // otherwise, it's a new message to send
          // => send it to the server and start a new conversation
          bacnet_cmd(this, payload)
        }
      }
      nodeDone()
    })
  }

  Bacnet.prototype.websocketInputCallback = function (response, cfgnodes) {
    /*
     * This function is called when a message is received from the server.
     * It is attached to the serverConfig object in the Bacnet constructor.
     * It is called with the following parameters:
     * - response: the message received from the server
     * - cfgnodes: an array of all nodes registered with the server
     *  (see Bacnet.prototype.registerInputNode)
     */

    if (response.payload.hasOwnProperty('command')) {
      // if the message has a command property, it is a reply to a message sent by this node
      // ==> send it to the output
      let cmd = response.payload.command
      let cb = this.commands.filter(
        (x) => x['message'] == cmd.message && x.hasOwnProperty('callback')
      )
      if (cb.length > 0) {
        cb[0].callback(this, response, cfgnodes)
      }
    }
    this.send(response)
  }

  function bacnet_cmd(node, msg) {
    /*
     * This function is called when a message is received from the server.
     * It is a static helper function that gets called with the following parameters:
     * - node: the node that called this function
     * - msg: the message received from the server
     *
     */
    let devs = {}
    let settings = {}
    let x = {}
    console.log(node.parameters)
    let clid = RED.util.generateId()
    if (node == undefined || node.client_id == undefined) {
      node.client_id = clid
    } else {
      clid = node.client_id
    }
    if (node != undefined && node.parameters != undefined && node.command != undefined) {
      settings = { command: node.command.message, client_id: node.client_id }
      if (node.parameters.devices !== undefined) {
        settings.devices = node.parameters.devices
      }
    } else {
      settings = {}
    }
    settings = { ...settings, ...msg } // merge msg into settings (to update command, etc.)
    settings.client_id = clid
    if (msg.payload != undefined) {
      x = msg.payload
      settings = { ...settings, ...x } // make extra sure we did not miss unpacking the payload
    }
    if (settings.command == undefined) {
      return
    }
    node.serverConfig.broadcast(settings, function (error) {
      if (!!error) {
        this.warn(RED._('websocket.errors.send-error') + inspect(error))
      }
    })
  }

  RED.nodes.registerType('bacnet out', Bacnet)
  RED.nodes.registerType('bacnet in', Bacnet)
  RED.nodes.registerType('bacnet control', Bacnet)
}
