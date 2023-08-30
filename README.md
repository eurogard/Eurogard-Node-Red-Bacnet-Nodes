# Eurogard Node-Red BACnet Nodes

Experimental development implementation of a
[Node-RED](https://nodered.org/) node that makes
[BACnet](https://bacnet.org/) accessible by defining an API to
communicate with a BACnet network through an edge device, such as the
[Eurogard](https://www.eurogard.de/) ServiceRouter, using websockets for
transport.

Built in the context of bawebcontest research project.

The design is loosely based on the structure of the
[s7](https://flows.nodered.org/node/node-red-contrib-s7) contrib node.

As this is a design draft, **expect bugs and missing features**. If you
possess an edge device implementing the defined API, most
functionalities should operate correctly.

Be aware that the API may change in the future.

## Setup

Note that the provided `Makefile` should allow you to execute these
tasks without manual copy-pasting. Both `Npm` and `Node` are required to
be installed on your system. Running `make` from the project root should
list available commands and their descriptions.

### Local Install

```bash
cd $DIR; # change to project root
npm install;
npm test; # run tests
npm start; # start Node-RED
```

### Using Docker

A basic `compose` file and a `Dockerfile` are provided. The docker image
builds upon the official Node-RED image, integrating the BACnet nodes
and the BACnet Node-RED contrib node.

```bash
docker compose up -d
```

## Project Structure

Our aim is to match the general structure of the
[s7](https://flows.nodered.org/node/node-red-contrib-s7) contrib node.

- We define three primary Node-RED Nodes:

- `bacnet_read`

- `bacnet_write`

- `bacnet_info`

### bacnet_read

This node retrieves actual data from BACnet devices. Users should be
able to choose:

- from a list of datapoints from a specific device
- all datapoints from a device
- all datapoints from all known devices

Subsequently, users can decide how they want to process the data using
the standard Node-RED tools.

### bacnet_write

This node writes data to BACnet devices. Users should be able to send
incoming values (in JSON format -\> adhering to the
"Node-RED-JSON-inter-node-communication-standard") to one or more BACnet
devices, as long as the datapoints are distinctly identified. This
uniqueness is assured if they use the eurogard-flask-bacnet datapoint
UIDs.

### bacnet_info

- Retrieve device information for any number of devices
- Follow the Eurogard-BACnet-flask implementation of
  "registered_devices":
- registered_device:
  - can be online or offline
  - datapoints only accessible when online
  - caches written values when offline, and updates cached values
    when returning online
- online_device:
  - must be registered to be accessible
  - only exists when online

## Command Documentation

We recognize 4 types of input parameters (apart from the command
string):

1.  `Devices`:

    ```javascript
    {"devices": List[String]}
    ```

2.  `Datapoints`:

    ```javascript
    {"devices": Devicepath->Map[String]: Datapoints->List[String]}
    ```

3.  `Values`:

    ```javascript
    {"devices": Devicepath->Map[String]: Datapoints->Map[String]: Primitive Datatypes->[Int|String|Bool]}
    ```

4.  No input parameters

If the "Read command from input" option is checked, we anticipate an
additional key:

```javascript
{"command": Command->String, "devices": ...}
```

The subsequent commands are established:

### bacnet in

- "write"

  - "Write value",
  - Expected Input: "values"

- "from_input"

  - "Read command from input",
  - Expected Input: None

### bacnet out

- "reads"  
  Read value

  - Expected Input: List of "datapoints"

- "reads_onlyone"  
  Read only one value

  Expected Input: `datapoint`

- "from_input"  
  Read command from input instead of msg.payload

  - Expected Input: `None`

### bacnet control

- "from_input"  
  Read command from input

  Expected Input: `None`

- "online"  
  Scan for online devices

  Expected Input: `None`

- "enumerate"  
  Read BACnet config from edge device and enumerate devices

  Expected Input: `None`

- "config"  
  Obtain BACnet Information

  Expected Input: `None`

- "deviceinfo"  
  Acquire device Information

  Expected Input: List of `devices`

- "datapoints"  
  Fetch data point list of a device

  Expected Input: List of `devices`

- "hello*world_from_nodered"  
  Sends a friendly \_Hello World* to the configured edge device

  Expected Input: `None`
