var bacnetCommands = {
  in: {
    icon: "debug.svg",
    align: "right",
    commands: [
      {
        message: "write",
        description: "Write value",
        accepts: "values",
      },
      {
        message: "from_input",
        description: "Read command from input",
        accepts: false,
      },
    ],
  },
  out: {
    icon: "inject.svg",

    align: "left",
    commands: [
      {
        message: "reads",
        description: "Read value",
        accepts: "datapoints",
      },
      {
        message: "from_input",
        description: "Read command from input",
        accepts: false,
      },
    ],
  },
  control: {
    align: "right",
    icon: "link-in.svg",
    commands: [
      {
        message: "from_input",
        description: "Read command from input",
        accepts: false,
      },
      {
        message: "online_devices",
        description: "Scan for devices",
        accepts: false,
        callback: (node, response, cfgnodes) => {},
      },
      {
        message: "enumerate",
        description: "Read bacnet config in config nodes",
        accepts: false,
        callback: (node, response, cfgnodes) => {
          let endpoint = node.endpoint;
          let reg_devs = [];
          let reg_devmap = {};
          response = response.payload.result;
          if (response == undefined || response.devices == undefined) {
            console.log("devices undefined.");
            return;
          }

          for (key in response["devices"]) {
            if (!reg_devs.includes(response["devices"][key]["address"])) {
              let n = {
                // TODO: simply take the bacnet attribute names :\
                name: response["devices"][key][0],
                description: response["devices"][key][1],
                path: response["devices"][key][2],
                device_id: response["devices"][key][3],
                datapoints: {},
              };
              reg_devs.push(n.path);
              reg_devmap[n.path] = n;
              for (datapoint of response["devices"][key]["data_points"]) {
                let d = {
                  identifier: datapoint["identifier"],
                  device: n,
                  writable: datapoint["writable"],
                  last_value: datapoint["value"],
                };
                n.datapoints[d.identifier] = d;
              }
            }
          }
          var g = node.context().global;
          g.set("dev", reg_devs);
          g.set("devmap", reg_devmap);
        },
      },

      {
        message: "config",
        description: "Get Bacnet Information",
        accepts: false,
      },

      {
        message: "deviceinfo",
        description: "Get device Information",
        accepts: "devices",
      },

      {
        message: "datapoints",
        description: "Get data point list of device",
        accepts: "devices",
      },

      {
        message: "hello_world_from_nodered",
        description: "HelloWorld",
        accepts: false,
      },
    ],
  },
};
