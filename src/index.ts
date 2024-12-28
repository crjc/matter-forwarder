import { Endpoint, Logger, LogLevel, ServerNode } from "@matter/main";
import { ContactSensorDevice } from "@matter/main/devices";
import {
  AccessoryInformation,
  Switch,
} from "hap-nodejs/dist/lib/definitions/ServiceDefinitions.js";
import type {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicValue,
  Controller,
  Logging,
  Service,
} from "homebridge";

// // Create the "node".  In Matter a "node" is a standalone device
// const node = await ServerNode.create();

// // Create the light "endpoint".  In Matter an "endpoint" is a component of a node
// const light = await node.add(OnOffLightDevice);

// // Add an event handler to log the light's current status
// light.events.onOff.onOff$Changed.on((value) =>
//   console.log(`Light is now ${value}`)
// );

// // Run our server
// await node.start();
const storage = require("node-persist");
Logger.defaultLogLevel = LogLevel.NOTICE;

class VirtualDoorbell implements AccessoryPlugin {
  public readonly log: Logging;
  public name: string;
  public disableLogging: boolean;
  public _service: Switch;
  public readonly modelString: string;
  public readonly informationService: AccessoryInformation;
  public readonly cacheDirectory: string;
  public timer?: NodeJS.Timeout;
  public readonly api: API;
  public light?: Endpoint<ContactSensorDevice>;

  constructor(logger: Logging, config: AccessoryConfig, api: API) {
    this.log = logger;
    this.name = config.name;
    this.disableLogging = config.disableLogging;
    this.api = api;

    this._service = new api.hap.Service.Switch(this.name);
    this.modelString = "Dummy Switch";

    this.informationService = new api.hap.Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(api.hap.Characteristic.Manufacturer, "Homebridge")
      .setCharacteristic(api.hap.Characteristic.Model, this.modelString);

    this.cacheDirectory = api.user.persistPath();
    storage.initSync({
      dir: this.cacheDirectory,
      forgiveParseErrors: true,
    });

    this._service
      .getCharacteristic(api.hap.Characteristic.On)
      .onSet(this.setOnHandler.bind(this));
    //.on("set", this._setOn.bind(this));

    const t = this;
    // // Create the "node".  In Matter a "node" is a standalone device
    ServerNode.create({
      basicInformation: {
        nodeLabel: "Virtual Doorbell",
        productName: "Virtual Doorbell",
      },
      commissioning: {
        passcode: 12345678900,
      },
    }).then(async (node) => {
      // Create the light "endpoint".  In Matter an "endpoint" is a component of a node
      const light = await node.add(ContactSensorDevice, {
        booleanState: {
          stateValue: false,
        },
      });
      t.light = light;

      t.light.set({
        booleanState: {
          stateValue: false,
        },
      });

      this._service.setCharacteristic(t.api.hap.Characteristic.On, false);

      // Run our server
      await node.start();
    });
  }

  identify?(): void {
    this.log("Identify!");
  }

  getServices(): Service[] {
    return [this.informationService, this._service];
  }

  getControllers?(): Controller[] {
    return [];
  }

  async setOnHandler(value: CharacteristicValue) {
    var msg = "Setting switch to " + value;

    if (!this.disableLogging) {
      this.log(msg);
    }

    if (value === true) {
      if (this.light)
        this.light.set({
          booleanState: {
            stateValue: true,
          },
        });

      if (this.timer) clearTimeout(this.timer);
      const t = this;
      this.timer = setTimeout(
        function () {
          t._service.setCharacteristic(t.api.hap.Characteristic.On, false);

          if (t.light)
            t.light.set({
              booleanState: {
                stateValue: false,
              },
            });
        }.bind(this),
        1750
      );
    }
  }
}

export default (api: API) => {
  api.registerAccessory(
    "jason-doorbell-switch",
    "Virtual Doorbell",
    VirtualDoorbell
  );
};
