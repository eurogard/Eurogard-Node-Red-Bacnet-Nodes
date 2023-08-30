/*
 *  Node-RED node for websocket in/out nodes allowing read/write access to a device serving
 *  as edge gateway to a BACnet network.
 */

module.exports = function (RED) {
  'use strict'

  var inspect = require('util').inspect
  var HttpsProxyAgent = require('https-proxy-agent')
  var socketio = require('socket.io-client')

  // TODO allow to adapt to any configuration dynamically

  function BacnetWebsocketDevice(n) {
    RED.nodes.createNode(this, n)
    var node = this
    node.path = n.path
    node.name = n.name
    node.description = n.description
    return this
  }

  function BacnetWebsocketDatapoint(n) {
    RED.nodes.createNode(this, n)
    var node = this
    node.identifier = n.identifier
    node.device = n.device
    node.writable = n.writable
    node.last_value = n.last_value
    return this
  }

  function BacnetWebSocketListenerNode(n) {
    RED.nodes.createNode(this, n)
    var node = this

    // Store local copies of the node configuration (as defined in the .html)
    node.path = n.path
    node.wholemsg = n.wholemsg === 'true'
    node.devices = n.devices
    node._inputNodes = [] // collection of nodes that want to receive events
    node._clients = {}
    node.closing = false
    node.tls = n.tls

    if (n.hb) {
      var heartbeat = parseInt(n.hb)
      if (heartbeat > 0) {
        node.heartbeat = heartbeat * 1000
      }
    }

    function startconn() {
      // Connect to remote endpoint
      node.tout = null
      var prox, noprox
      if (process.env.http_proxy) {
        prox = process.env.http_proxy
      }
      if (process.env.HTTP_PROXY) {
        prox = process.env.HTTP_PROXY
      }
      if (process.env.no_proxy) {
        noprox = process.env.no_proxy.split(',')
      }
      if (process.env.NO_PROXY) {
        noprox = process.env.NO_PROXY.split(',')
      }

      var noproxy = false
      if (noprox) {
        for (var i in noprox) {
          if (node.path.indexOf(noprox[i].trim()) !== -1) {
            noproxy = true
          }
        }
      }

      var agent = undefined
      if (prox && !noproxy) {
        agent = new HttpsProxyAgent(prox)
      }

      var options = {}
      if (agent) {
        options.agent = agent
      }
      if (node.tls) {
        var tlsNode = RED.nodes.getNode(node.tls)
        if (tlsNode) {
          tlsNode.addTLSOptions(options)
        }
      }
      // TODO handle options?
      var socket = socketio.connect(node.path)
      node.server = socket // keep for closing
      handleConnection(socket)
    }

    function handleConnection(/*socket*/ socket) {
      var id = RED.util.generateId()
      socket.nrId = id
      socket.nrPendingHeartbeat = false
      if (node.heartbeat) {
        node.heartbeatInterval = setInterval(function () {
          if (socket.nrPendingHeartbeat) {
            // No pong received
            socket.disconnect()
            socket.nrErrorHandler(new Error('timeout'))
            return
          }
          socket.nrPendingHeartbeat = true
          socket.ping()
        }, node.heartbeat)
      }
      socket.on('connect', function () {
        node.emit('opened', { count: '', id: id })
      })
      socket.on('disconnect', function () {
        clearInterval(node.heartbeatInterval)
        node.emit('closed', { count: '', id: id })
        if (!node.closing) {
          clearTimeout(node.tout)
          node.tout = setTimeout(function () {
            startconn()
          }, 3000) // try to reconnect every 3 secs... bit fast ?
        }
      })
      socket.on('message', function (data, flags) {
        node.handleEvent(id, socket, 'message', data, flags)
      })

      socket.nrErrorHandler = function (err) {
        clearInterval(node.heartbeatInterval)
        node.emit('error', { err: err, id: id })
        if (!node.closing) {
          clearTimeout(node.tout)
          node.tout = setTimeout(function () {
            startconn()
          }, 3000) // try to reconnect every 3 secs... bit fast ?
        }
      }
      socket.on('error', socket.nrErrorHandler)
      socket.on('ping', function () {
        socket.nrPendingHeartbeat = false
      })
      socket.on('pong', function () {
        socket.nrPendingHeartbeat = false
      })
    }

    node.closing = false
    startconn() // start outbound connection

    node.on('close', function () {
      if (node.heartbeatInterval) {
        clearInterval(node.heartbeatInterval)
      }
      node.closing = true
      node.server.close()
      if (node.tout) {
        clearTimeout(node.tout)
        node.tout = null
      }
    })
    return this
  }

  BacnetWebSocketListenerNode.prototype.registerInputNode = function (/*Node*/ handler) {
    /*
     * Registers a node to receive events from this endpoint.

     */
    this._inputNodes.push(handler)
  }

  BacnetWebSocketListenerNode.prototype.removeInputNode = function (/*Node*/ handler) {
    /*
     * Removes a previously registered node from this endpoint.
     */
    this._inputNodes.forEach(function (node, i, inputNodes) {
      if (node === handler) {
        inputNodes.splice(i, 1)
      }
    })
  }

  BacnetWebSocketListenerNode.prototype.handleEvent = function (
    id,
    /*socket*/ socket,
    /*String*/ event,
    /*Object*/ data,
    /*Object*/ flags
  ) {
    /*
     * Handles an event received from the remote endpoint by dispatching on websocketInputCallback
     * of all nodes with matching client_id.
     * @param {String} id
     * @param {String} event
     * @param {String} data
     * @param {String} flags
     */
    var msg
    if (this.wholemsg) {
      try {
        msg = JSON.parse(data)
        if (typeof msg !== 'object' && !Array.isArray(msg) && msg !== null) {
          msg = { payload: msg }
        }
      } catch (err) {
        msg = { payload: data }
      }
    } else {
      msg = {
        payload: data,
      }
    }
    msg._session = { type: 'bacnet-websocket', id: id }
    for (var i = 0; i < this._inputNodes.length; i++) {
      if (!data.hasOwnProperty('client_id') || data.client_id == this._inputNodes[i].client_id) {
        this._inputNodes[i].websocketInputCallback(msg, {
          BacnetWebsocketDatapoint: BacnetWebsocketDatapoint,
          BacnetWebsocketDevice: BacnetWebsocketDevice,
          BacnetWebSocketListenerNode: BacnetWebSocketListenerNode,
        })
      }
    }
  }

  BacnetWebSocketListenerNode.prototype.broadcast = function (data) {
    /*
     * Broadcasts a message to all clients.
     * @param {String} data - the message to send
     */

    try {
      // this.server.emit(command, data);
      this.server.send(data)
    } catch (err) {
      this.warn(RED._('websocket.errors.send-error') + ' ' + err.toString())
    }
  }

  BacnetWebSocketListenerNode.prototype.reply = function (id, data) {
    /*
     * Replies to a message received from a client.
     * @param {String} id - the id of the client to reply to
     * @param {String} data - the message to send
     *
     */
    var session = this._clients[id]
    if (session) {
      try {
        // session.send(data);
        session.send(data)
      } catch (e) {
        // swallow any errors
      }
    }
  }
  RED.nodes.registerType('bacnet datapoint', BacnetWebsocketDatapoint)
  RED.nodes.registerType('bacnet device', BacnetWebsocketDevice)
  RED.nodes.registerType('bacnet endpoint', BacnetWebSocketListenerNode)
}
