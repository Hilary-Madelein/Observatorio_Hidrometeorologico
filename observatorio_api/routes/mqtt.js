const mqtt = require('mqtt');
require('dotenv').config();

const ttnServer = process.env.TTN_SERVER;
const mqttOptions = {
    username: process.env.TTN_USERNAME,
    password: process.env.TTN_PASSWORD,
};

const mqttOptions2 = {
    username: process.env.TTN2_USERNAME,
    password: process.env.TTN2_PASSWORD,
  };

const mqttClient = mqtt.connect(ttnServer, mqttOptions);
const mqttClient2 = mqtt.connect(ttnServer, mqttOptions2);

module.exports = {mqttClient, mqttClient2};
