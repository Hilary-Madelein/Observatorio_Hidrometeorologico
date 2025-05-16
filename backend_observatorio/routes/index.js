'use strict';

const express = require('express');
const mqtt = require('mqtt');
const router = express.Router();
require('dotenv').config();

const { Sequelize } = require('sequelize');
const models = require('./../models');
const sequelize = models.sequelize;

const MeasurementController = require('../controls/MeasurementController');
const measurementController = new MeasurementController();

const { CosmosClient } = require('@azure/cosmos');
const AbortController = require('abort-controller');

if (typeof global.AbortController === 'undefined') {
  global.AbortController = AbortController;
}

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DB;
const client = new CosmosClient({ endpoint, key });

const DESPLAZAMIENTO_HORARIO_MINUTOS = -300;

// MQTT (TTN) Configuración
const ttnServer = process.env.TTN_SERVER;
const mqttOptions = {
  username: 'puar-unl-esp32@ttn',
  password: 'NNSXS.FGSQU3PH2K2E32I5U5QDUFKURE4OB42PWDP6N7A.GBTQGXU4TRE3ELIOBWTBLGXDOFQPFIN5UH6CVDHU27Q2E4XMHO3Q'
};
const mqttClient = mqtt.connect(ttnServer, mqttOptions);

function ajustarZonaHoraria(timestamp) {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() + DESPLAZAMIENTO_HORARIO_MINUTOS);
  return date.toISOString();
}

mqttClient.on('connect', () => {
  console.log('Conectado a TTN MQTT');
  mqttClient.subscribe('v3/puar-unl-esp32@ttn/devices/eui-70b3d57ed0060a67/up');
  mqttClient.subscribe('v3/puar-unl-esp32@ttn/devices/eui-70b3d57ed00611db/up');
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    if (data.received_at) data.received_at = ajustarZonaHoraria(data.received_at);

    const entrada = {
      fecha: data.received_at,
      dispositivo: data.end_device_ids?.device_id,
      payload: data.uplink_message?.decoded_payload
    };

    console.log('Datos TTN recibidos:', entrada);

    const req = { body: entrada };
    const res = {
      status: (code) => ({
        json: (response) => {
          if (code !== 200) {
            console.error(`[ERROR ${code}]`, response);
          } else {
            console.log('[Guardado]', response);
          }
        }
      })
    };

    await measurementController.saveFromTTN(req, res);

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

    // Verificar conexión temporal a Azure Cosmos para migración
    const db = client.database(databaseId);
    const { resources: containers } = await db.containers.readAll().fetchAll();
    console.log(`Conectado a Cosmos DB: ${databaseId}, contenedores encontrados:`, containers.map(c => c.id));

    return res.status(200).send(`Conexión exitosa a PostgreSQL y Cosmos DB (${databaseId})`);
  } catch (err) {
    console.error('Error en conexión a PostgreSQL o Cosmos:', err.message);
    return res.status(500).json({ message: 'Error conectando a bases de datos', error: err.message });
  }
});

module.exports = {
  router,
  mqttClient,
  client,     
  databaseId
};
