const mqtt = require('mqtt');
require('dotenv').config();

const ttnServer = process.env.TTN_SERVER;
const mqttOptions = {
    username: process.env.TTN_USERNAME,
    password: process.env.TTN_PASSWORD,
};

const mqttClient = mqtt.connect(ttnServer, mqttOptions);

module.exports = mqttClient;
