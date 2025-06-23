'use strict';

const express = require('express');
const router = express.Router();
require('dotenv').config();
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
const brokers = require('./mqtt');

const DESPLAZAMIENTO_HORARIO_MINUTOS = -300;

function ajustarZonaHoraria(timestamp) {
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() + DESPLAZAMIENTO_HORARIO_MINUTOS);
  return date.toISOString();
}

const topicTemplate = process.env.TTN_TOPIC_TEMPLATE; // 'v3/{user}/devices/{id}/up'
if (!topicTemplate) {
  console.error('Falta TTN_TOPIC_TEMPLATE en tu .env');
  process.exit(1);
}

const REFRESH_MS = 12 * 60 * 1000;

Object.entries(brokers).forEach(([brokerId, { client, user }]) => {
  let currentSubs = new Set();

  async function updateSubscriptions() {
    try {
      let estaciones;
      const fakeReq = { user };
      const fakeRes = {
        json: body => { estaciones = body.info; },
        status: () => ({ json: err => { throw new Error(err.msg); } })
      };
      await stationController.listActiveMQTT(fakeReq, fakeRes);

      const newIds = new Set(estaciones.map(e => e.id_device));

      for (const id_device of newIds) {
        if (!currentSubs.has(id_device)) {
          const topic = topicTemplate
            .replace('{user}', user)
            .replace('{id}',   id_device);

          client.subscribe(topic, err => {
            if (err) console.error(`[${brokerId}] Error suscribiendo ${topic}:`, err.message);
            else     console.log(`[${brokerId}] Suscrito a ${topic}`);
          });
        }
      }

      for (const oldId of currentSubs) {
        if (!newIds.has(oldId)) {
          const topic = topicTemplate
            .replace('{user}', user)
            .replace('{id}',   oldId);

          client.unsubscribe(topic, err => {
            if (err) console.error(`[${brokerId}] Error desuscribiendo ${topic}:`, err.message);
            else     console.log(`[${brokerId}] Desuscrito de ${topic}`);
          });
        }
      }

      currentSubs = newIds;

    } catch (err) {
      console.error(`[${brokerId}] Error en updateSubscriptions():`, err.message);
    }
  }

  client.on('connect', () => {
    console.log(`[${brokerId}] Conectado a ${process.env.TTN_SERVER}`);
    updateSubscriptions();
    setInterval(updateSubscriptions, REFRESH_MS);
  });

  client.on('message', async (receivedTopic, message) => {
    try {
      const parts    = receivedTopic.split('/');
      const deviceId = parts[3];

      if (!currentSubs.has(deviceId)) return;

      const data = JSON.parse(message.toString());
      if (data.received_at) data.received_at = ajustarZonaHoraria(data.received_at);

      const entrada = {
        fecha:       data.received_at,
        dispositivo: deviceId,
        payload:     data.uplink_message?.decoded_payload
      };

      console.log(`[${brokerId}] Datos de ${deviceId}:`, entrada);

      const req = { body: entrada };
      const res = {
        status: code => ({
          json: response => {
            if (code !== 200) console.error(`[${brokerId}][${code}]`, response);
            else              console.log(`[${brokerId}] Guardado exitoso`, response);
          }
        })
      };

      await measurementController.saveFromTTN(req, res);

    } catch (err) {
      console.error(`[${brokerId}] Error procesando mensaje:`, err.message);
    }
  });

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
