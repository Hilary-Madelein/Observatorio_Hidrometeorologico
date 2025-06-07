'use strict';

const express = require('express');
const mqtt = require('mqtt');
const router = express.Router();
require('dotenv').config();

const { Sequelize } = require('sequelize');
const models = require('./../models');
const StationController = require('../controls/StationController');
const stationController = new StationController();
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
const mqttClient = require('./mqtt');

const DESPLAZAMIENTO_HORARIO_MINUTOS = -300;
const topicTemplate = process.env.TTN_TOPIC_TEMPLATE;

function ajustarZonaHoraria(timestamp) {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() + DESPLAZAMIENTO_HORARIO_MINUTOS);
  return date.toISOString();
}

mqttClient.on('connect', async () => {
  console.log('Conectado a TTN MQTT');

  try {
    let estaciones;
    const fakeReq = {};
    const fakeRes = {
      json: body => { estaciones = body.info; },
      status: code => ({
        json: body => { throw new Error(body.msg || 'Error listing stations'); }
      })
    };
    await stationController.listActive(fakeReq, fakeRes);

    estaciones.forEach(({ id_device }) => {
      const topic = topicTemplate.replace('{id}', id_device);
      mqttClient.subscribe(topic, err => {
        if (err) console.error(`Error suscribiendo ${topic}:`, err);
        else console.log(`Suscrito a ${topic}`);
      });
    });

  } catch (err) {
    console.error('Error al obtener estaciones para suscripción:', err);
  }
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
  client,
  databaseId
};
