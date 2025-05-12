'use strict';

const express = require('express');
const mqtt = require('mqtt');
const router = express.Router();
require('dotenv').config();

const { Sequelize } = require('sequelize');
const models = require('./../models'); // Modelos Sequelize
const sequelize = models.sequelize;

const DESPLAZAMIENTO_HORARIO_MINUTOS = -300;

// MQTT (TTN) Configuración
const ttnServer = 'mqtt://nam1.cloud.thethings.network:1883';
const mqttOptions = {
  username: 'puar-unl-esp32@ttn',
  password: 'NNSXS.FGSQU3PH2K2E32I5U5QDUFKURE4OB42PWDP6N7A.GBTQGXU4TRE3ELIOBWTBLGXDOFQPFIN5UH6CVDHU27Q2E4XMHO3Q'
};
const mqttClient = mqtt.connect(ttnServer, mqttOptions);

// Ajustar fecha a UTC-5
function ajustarZonaHoraria(timestamp) {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() + DESPLAZAMIENTO_HORARIO_MINUTOS);
  return date.toISOString();
}

// Conexión a MQTT y recepción de mensajes
mqttClient.on('connect', () => {
  console.log('Conectado a TTN MQTT');

  mqttClient.subscribe('v3/puar-unl-esp32@ttn/devices/eui-70b3d57ed0060a67/up');
  mqttClient.subscribe('v3/puar-unl-esp32@ttn/devices/eui-70b3d57ed00611db/up');
});

mqttClient.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    if (data.received_at) data.received_at = ajustarZonaHoraria(data.received_at);

    console.log('Datos TTN recibidos:', {
      fecha: data.received_at,
      dispositivo: data.end_device_ids?.device_id,
      payload: data.uplink_message?.decoded_payload
    });
  } catch (err) {
    console.error('Error procesando mensaje MQTT:', err.message);
  }
});

// Ruta de verificación
router.get('/privado/:external', async function (req, res) {
  const llave = req.params.external;
  const envKey = process.env.KEY_SQ;

  if (llave !== envKey) {
    return res.status(401).json({ message: 'Llave incorrecta!' });
  }

  try {
    await sequelize.authenticate();
    console.log('Conectado a PostgreSQL');

    return res.status(200).send('Conexión exitosa a PostgreSQL y TTN activa');
  } catch (err) {
    console.error('Error en conexión a PostgreSQL:', err.message);
    return res.status(500).json({ message: 'Error conectando a PostgreSQL', error: err.message });
  }
});

module.exports = {
  router,
  mqttClient
};
