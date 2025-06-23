'use strict';

const mqtt = require('mqtt');
require('dotenv').config();

const server = process.env.TTN_SERVER;
if (!server) {
  console.error('Debes definir TTN_SERVER en tu .env');
  process.exit(1);
}

let configs;
try {
  configs = JSON.parse(process.env.MQTT_BROKERS);
  if (!Array.isArray(configs)) throw new Error('MQTT_BROKERS no es un array');
} catch (err) {
  console.error('Error parseando MQTT_BROKERS:', err.message);
  process.exit(1);
}

const brokers = configs.reduce((acc, { id, user, pass }) => {
  if (!id || !user || !pass) {
    console.warn('Config inválida para broker:', { id, user, pass });
    return acc;
  }

  const client = mqtt.connect(server, {
    username: user,
    password: pass,
    keepalive: 60,        
    reconnectPeriod: 2000, 
    connectTimeout: 30_000, 
    clean: true  
  });

  client.on('connect', () =>
    console.log(`[${id}] Conectado a ${server}`)
  );
  client.on('reconnect', () =>
    console.log(`[${id}] Reintentando conexión...`)
  );
  client.on('offline', () =>
    console.log(`[${id}] Cliente offline`)
  );
  client.on('error', err =>
    console.error(`[${id}] Error MQTT:`, err.message)
  );
  client.on('end', () =>
    console.log(`[${id}] Conexión finalizada`)
  );

  acc[id] = { client, user };
  return acc;
}, {});

module.exports = brokers;
