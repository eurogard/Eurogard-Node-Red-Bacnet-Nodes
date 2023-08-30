UiTools = (function () {
  /*
   * This file contains functions that are used to create the UI for the nodes
   * in the editor. It is only loaded when the editor is loaded.
   */

  function extract_devices(headers) {
    let devices = [];
    acceptance = "devices";
    for (let i of headers) {
      var keyType = i.find(".node-input-" + acceptance + "-name").typedInput("type");
      var keyValue = i.find(".node-input-" + acceptance + "-name").typedInput("value");
      let device = keyType == "other" ? keyValue : keyType;
      if (!devices.includes(device)) {
        devices.push(device);
      }
    }
    return devices;
  }

  function extract_values(headers) {
    let devices = {};
    acceptance = "values";
    for (let i of headers) {
      var keyType = i.find(".node-input-" + acceptance + "-name").typedInput("type");
      var keyValue = i.find(".node-input-" + acceptance + "-name").typedInput("value");
      let device = keyType == "other" ? keyValue : keyType;
      var valueType = i.find(".node-input-" + acceptance + "-value").typedInput("type");
      var valueValue = i.find(".node-input-" + acceptance + "-value").typedInput("value");
      let datapoint = valueType == "all" ? undefined : valueValue;
      let datapoint_value = i.find(".node-input-datapoint-value").typedInput("value");

      if (device !== "" && datapoint != "" && datapoint_value != "") {
        if (!devices.hasOwnProperty(device)) devices[device] = {};

        devices[device][datapoint] = datapoint_value;
      }
    }
    return devices;
  }

  function extract_datapoints(headers) {
    devices = {};
    acceptance = "datapoints";
    for (let i of headers) {
      var keyType = i.find(".node-input-" + acceptance + "-name").typedInput("type");
      var keyValue = i.find(".node-input-" + acceptance + "-name").typedInput("value");
      let device = keyType == "other" ? keyValue : keyType;
      var valueType = i.find(".node-input-" + acceptance + "-value").typedInput("type");
      var valueValue = i.find(".node-input-" + acceptance + "-value").typedInput("value");
      let datapoint = valueType == "all" ? undefined : valueValue;

      if (device !== "" && datapoint != "") {
        if (datapoint == undefined) {
          devices[device] = [];
        } else if (devices.hasOwnProperty(device) && devices[device].length > 0) devices[device].push(datapoint);
        else if (!devices.hasOwnProperty(device)) devices[device] = [datapoint];
      }
    }
    return devices;
  }
  function commandFromMessage(commands, message) {
    let res = commands.filter((x) => {
      return x.message == message;
    });
    return res.length > 0 ? res[0] : undefined;
  }

  function getSelectedCommandString() {
    return $("#node-input-command").val();
  }
  function setSelectedCommandString(newCommandString) {
    return $("#node-input-command").val(newCommandString);
  }
  function extractFromListView(param_type) {
    let headers = $("#node-input-" + param_type + "-container").editableList("items");
    let fun = { devices: extract_devices, values: extract_values, datapoints: extract_datapoints }[param_type];
    return fun(headers);
  }

  function dropdown(options, current_command) {
    let cmd = "INVALID";
    if (current_command instanceof String) {
      current_command = commandFromMessage(options, current_command);
    }
    if (current_command == undefined) {
      cmd = options[0].message;
    } else {
      cmd = current_command.message;
    }
    let o = [];
    for (a of options) {
      o.push({ value: a.message, label: a.description });
    }
    $("#node-input-command").typedInput({
      types: [
        {
          value: cmd,
          options: o,
        },
      ],
    });
    $("#node-input-command").typedInput("value", cmd);
    $("#node-input-command").on("change", function (e) {
      console.log({ e });
      if (e.target.value == "") {
        return;
      }
      let selected = getSelectedCommandString();
      if (selected == undefined) selected = options[0].message;
      let curcmd = commandFromMessage(options, selected);
      for (let acc of ["values", "devices", "datapoints"]) {
        $(".bacnet-" + acc + "-row").hide();
      }
      if (curcmd.accepts) {
        // devices_oneditprepare(nodename,selected, this)
        $(".bacnet-" + curcmd.accepts + "-row").show();
      }
    });
  }

  var devicesTypes = [
    {
      value: "other",
      label: RED._("node-red:httpin.label.other"),
      icon: "red/images/typedInput/az.png",
    },
  ];

  var datapointsTypes = [
    { value: "all", label: "All datapoints", hasValue: false },
    { value: "datapoint", label: "Datapoint", icon: "red/images/typedInput/az.png" },
  ];

  function getRegisteredDevices() {
    var registeredDevices = [];
    RED.nodes.eachConfig((x) => {
      if (x.type === "bacnet device") {
        let y = { label: x.path, value: x.path, hasValue: false };
        registeredDevices.push(y);
      }
    });
    return registeredDevices;
  }

  function multiEditableListLegacy(devices, nodename) {
    let dt = devicesTypes.concat(getRegisteredDevices());
    for (let acceptance of ["devices", "datapoints", "values"]) {
      var headerList = $("#node-input-" + acceptance + "-container-" + nodename)
        .css("min-height", "150px")
        .css("min-width", "450px")
        .editableList({
          addItem: function (container, i, data) {
            var row = $("<div/>")
              .css({
                overflow: "hidden",
                whiteSpace: "nowrap",
                display: "flex",
              })
              .appendTo(container);
            // setup devicecolumn
            var devicesCell = $("<div/>").css({ "flex-grow": 1 }).appendTo(row);
            var devicesInput = $("<input/>", {
              class: "node-input-" + acceptance + "-name",
              type: "text",
              style: "width: 100%",
            })
              .appendTo(devicesCell)
              .typedInput({ types: dt });
            // setup datapointcolumn
            var datapointsCell = $("<div/>").css({ "flex-grow": 1, "margin-left": "10px" }).appendTo(row);
            if (acceptance == "devices") {
              devicesInput.typedInput("value", data.v);
            } else if (acceptance == "values") {
              var datapointInput = $("<input/>", {
                class: "node-input-" + acceptance + "-value",
                type: "text",
                style: "width: 50%",
              })
                .appendTo(datapointsCell)
                .typedInput({ types: ["str"] });
              var valuesInput = $("<input/>", {
                class: "node-input-datapoint-value",
                type: "text",
                style: "width: 50%",
              })
                .appendTo(datapointsCell)
                .typedInput({ types: ["str"] });
              if (data.dpval) {
                valuesInput.typedInput("value", data.dpval);
                datapointInput.typedInput("value", data.v);
                datapointInput.typedInput("type", data.v);
              }
            } else {
              var datapointInput = $("<input/>", {
                class: "node-input-" + acceptance + "-value",
                type: "text",
                style: "width: 100%",
              })
                .appendTo(datapointsCell)
                .typedInput({ types: datapointsTypes });
              if (data.v === "all") {
                datapointInput.typedInput("type", "all");
              } else {
                datapointInput.typedInput("type", "datapoint");
                datapointInput.typedInput("value", data.v);
              }
            }

            let matchedDevice = dt.filter(function (ht) {
              return ht.value === data.h;
            });

            if (matchedDevice.length == 0) {
              devicesInput.typedInput("type", "other");
              devicesInput.typedInput("value", data.h);
            } else {
              devicesInput.typedInput("type", data.h);
              devicesInput.typedInput("value", data.h);
            }
          },
          removable: true,
        });

      for (var key in devices) {
        if (acceptance == "devices" && devices instanceof Array) {
          headerList.editableList("addItem", { h: devices[key], v: devices[key] });
        } else if (acceptance == "datapoints" && devices instanceof Object && devices[key] instanceof Array) {
          if (Object.entries(devices[key]).length == 0) {
            headerList.editableList("addItem", { h: key, v: "all" });
          } else {
            for (var point of devices[key]) {
              headerList.editableList("addItem", { h: key, v: point });
            }
          }
        } else if (acceptance == "values" && devices instanceof Object && devices[key] instanceof Object) {
          for (var k in devices[key]) {
            let point = devices[key][k];
            let devk = devices[key];
            headerList.editableList("addItem", { h: key, v: k, dpval: point });
          }
        }
      }
    }
  }
  function multiEditableList(devices) {
    for (let acceptance of ["devices", "datapoints", "values"]) {
      var headerList = $("#node-input-" + acceptance + "-container")
        .css("min-height", "150px")
        .css("min-width", "450px")
        .editableList({
          addItem: function (container, i, data) {
            var row = $("<div/>")
              .css({
                overflow: "hidden",
                whiteSpace: "nowrap",
                display: "flex",
              })
              .appendTo(container);
            // setup devicecolumn
            var devicesCell = $("<div/>").css({ "flex-grow": 1 }).appendTo(row);
            var devicesInput = $("<input/>", {
              class: "node-input-" + acceptance + "-name",
              type: "text",
              style: "width: 100%",
            })
              .appendTo(devicesCell)
              .typedInput({ types: devicesTypes.concat(getRegisteredDevices()) });
            // setup datapointcolumn
            var datapointsCell = $("<div/>").css({ "flex-grow": 1, "margin-left": "10px" }).appendTo(row);
            if (acceptance == "devices") {
            } else if (acceptance == "values") {
              var datapointInput = $("<input/>", {
                class: "node-input-" + acceptance + "-value",
                type: "text",
                style: "width: 50%",
              })
                .appendTo(datapointsCell)
                .typedInput({ types: ["str"] });
              var valuesInput = $("<input/>", {
                class: "node-input-datapoint-value",
                type: "text",
                style: "width: 50%",
              })
                .appendTo(datapointsCell)
                .typedInput({ types: ["str"] });
              if (data.dpval) {
                valuesInput.typedInput("value", data.dpval);
              }
            } else {
              var datapointInput = $("<input/>", {
                class: "node-input-" + acceptance + "-value",
                type: "text",
                style: "width: 100%",
              })
                .appendTo(datapointsCell)
                .typedInput({ types: datapointsTypes });
            }

            var matchedDevice = devicesTypes.filter(function (ht) {
              return ht.value === data.h;
            });
            if (matchedDevice.length === 0) {
              devicesInput.typedInput("type", "other");
              devicesInput.typedInput("value", data.h);
            } else {
              datapointInput.typedInput("value", data.v);
            }
            if (acceptance !== "devices") {
              devicesInput.typedInput("type", data.h);
              if (acceptance !== "values") {
                if (data.h === "content-type") {
                  if (acceptance !== "values") {
                    matchedDevice = datapointsTypes.filter(function (ct) {
                      return ct.value === data.v;
                    });
                    if (matchedDevice.length === 0) {
                      datapointInput.typedInput("type", "other");
                      datapointInput.typedInput("value", data.v);
                    } else {
                      datapointInput.typedInput("type", data.v);
                    }
                  }
                } else {
                  if (acceptance !== "values") datapointInput.typedInput("value", data.v);
                }
              }
            }

            matchedDevice = devicesTypes.filter(function (ht) {
              return ht.value === data.h;
            });
            if (matchedDevice.length === 0) {
              devicesInput.typedInput("type", "other");
              devicesInput.typedInput("value", data.h);
            } else {
              devicesInput.typedInput("type", data.h);
            }
            if (acceptance === "datapoints") {
              if (data.v === "all") {
                datapointInput.typedInput("type", "all");
              } else {
                datapointInput.typedInput("type", "datapoint");
                datapointInput.typedInput("value", data.v);
              }
            }
          },
          removable: true,
        });

      for (var key in devices) {
        if (acceptance == "devices" && devices instanceof Array) {
          headerList.editableList("addItem", { h: key });
        } else if (acceptance == "datapoints" && devices instanceof Object && devices[key] instanceof Array) {
          if (Object.entries(devices[key]).length == 0) {
            headerList.editableList("addItem", { h: key, v: "all" });
          } else {
            for (var point of devices[key]) {
              headerList.editableList("addItem", { h: key, v: point });
            }
          }
        } else if (acceptance == "values" && devices instanceof Object && devices[key] instanceof Object) {
          for (var k in devices[key]) {
            let point = devices[key][k];
            let devk = devices[key];
            headerList.editableList("addItem", { h: key, v: k, dpval: point });
          }
        }
      }
    }
  }

  // function insertOneTypedList(devices) {

  // }
  // function insertTwoTypedList(devices) {

  // }
  // function insertOneTypedTwoSimpleList(devices) {

  // }

  return {
    extractFromListView: extractFromListView,
    dropdown: dropdown,
    multiEditableList: multiEditableList,
    multiEditableListLegacy: multiEditableListLegacy,
    getSelectedCommandString: getSelectedCommandString,
    commandFromMessage: commandFromMessage,
  };
})();
