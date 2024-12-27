import { ServerNode } from "@matter/main";
import { OnOffPlugInUnitDevice } from "@matter/main/devices";
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
class VirtualDoorbell {
    log;
    name;
    disableLogging;
    _service;
    modelString;
    informationService;
    cacheDirectory;
    timer;
    api;
    light;
    constructor(logger, config, api) {
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
        });
        this._service
            .getCharacteristic(api.hap.Characteristic.On)
            .onSet(this.setOnHandler.bind(this));
        //.on("set", this._setOn.bind(this));
        const t = this;
        // // Create the "node".  In Matter a "node" is a standalone device
        ServerNode.create().then(async (node) => {
            // Create the light "endpoint".  In Matter an "endpoint" is a component of a node
            const light = await node.add(OnOffPlugInUnitDevice);
            t.light = light;
            // Add an event handler to log the light's current status
            light.events.onOff.onOff$Changed.on((value) => console.log(`Light is now ${value}`));
            // Run our server
            await node.start();
        });
    }
    identify() {
        this.log("Identify!");
    }
    getServices() {
        return [this.informationService, this._service];
    }
    getControllers() {
        return [];
    }
    async setOnHandler(value) {
        var msg = "Setting switch to " + value;
        if (!this.disableLogging) {
            this.log(msg);
        }
        if (value === true) {
            if (this.light)
                this.light.set({
                    onOff: {
                        onOff: true,
                        onTime: 5,
                    },
                });
            if (this.timer)
                clearTimeout(this.timer);
            const t = this;
            this.timer = setTimeout(function () {
                t._service.setCharacteristic(t.api.hap.Characteristic.On, false);
            }.bind(this), 500);
        }
    }
}
export default (api) => {
    api.registerAccessory("jason-doorbell-switch", "Virtual Doorbell", VirtualDoorbell);
};
//# sourceMappingURL=index.js.map