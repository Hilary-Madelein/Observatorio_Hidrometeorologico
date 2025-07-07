'use strict';

// Cargamos las vars de entorno (asegúrate de tener .env en la raíz)
// En la cabecera de auto-migracion.js o MigracionController.js
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});


const { CosmosClient } = require('@azure/cosmos');
const Sequelize      = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const models         = require('../models');

const VALOR_UMBRAL = 1e6;

// Mapas de campos Cosmos → fenómenos
const medidaMapeo = {
  EMA: {
    Temperatura: 'Temperatura',
    Presion:     'Presion',
    Humedad:     'Humedad',
    Lluvia:      'Lluvia'
  },
  EHA: {
    Nivel_de_agua: 'Nivel_de_agua',
    Carga_H:       'Carga_H',
    Distancia_Hs:  'Distancia_Hs'
  }
};

// Normalización para buscar phenomenon_type en DB
const normalizacionNombres = {
  'DISTANCIA_HS':   'DISTANCIA_H',
  'NIVEL_DE_AGUA':  'NIVEL_DE_AGUA',
  'CARGA_H':        'CARGA_H',
  'LLUVIA':         'LLUVIA',
  'PRESION':        'PRESION',
  'HUMEDAD':        'HUMEDAD',
  'TEMPERATURA':    'TEMPERATURA'
};

class MigracionController {
  constructor() {
    // Inicializo **sólo** CosmosClient, sin tocar index.js
    const endpoint   = process.env.COSMOS_ENDPOINT;
    const key        = process.env.COSMOS_KEY;
    const databaseId = process.env.COSMOS_DB;
    this.database    = new CosmosClient({ endpoint, key }).database(databaseId);
  }

  esValorValido(valor) {
    return valor != null && !isNaN(valor) && Math.abs(valor) < VALOR_UMBRAL;
  }

  async migrar() {
    const contenedores = ['EMA', 'EHA'];
    const fechas       = await this.generarFechasParaMigrar();

    console.log('🔄 Fechas a migrar:', fechas);
    for (const fecha of fechas) {
      for (const contenedor of contenedores) {
        console.log(`📦 Procesando ${contenedor} para fecha ${fecha}`);
        const container = this.database.container(contenedor);
        const mapeo    = medidaMapeo[contenedor];

        const items = await this.obtenerDatosCosmosConFiltro(container, fecha);
        console.log(`📥 Items de Cosmos: ${items.length}`);

        const agrupado = this.agruparPorEstacionYMedida(items, mapeo);
        await this.procesarMigracion(agrupado, fecha);
      }
    }
  }

  async generarFechasParaMigrar() {
    const desde   = new Date('2024-01-01');
    const hasta   = new Date();
    hasta.setHours(0,0,0,0);

    const fechas = [];
    for (let d = new Date(desde); d < hasta; d.setDate(d.getDate()+1)) {
      fechas.push(d.toISOString().slice(0,10));
    }
    return fechas;
  }

  async obtenerDatosCosmosConFiltro(container, fecha) {
    const query = {
      query: "SELECT * FROM c WHERE STARTSWITH(c['Fecha_local_UTC-5'], @fecha)",
      parameters: [{ name: '@fecha', value: fecha }]
    };
    const { resources: items } = await container.items.query(query).fetchAll();
    return items;
  }

  agruparPorEstacionYMedida(items, mapeo) {
    const estaciones = {};
    for (const item of items) {
      const deviceId = item.deviceId;
      if (!deviceId) continue;

      for (const [campo, valor] of Object.entries(item)) {
        if (campo === 'deviceId') continue;
        const fenomeno = mapeo[campo];
        if (!fenomeno) continue;

        estaciones[deviceId] ||= {};
        estaciones[deviceId][fenomeno] ||= [];

        if (this.esValorValido(valor)) estaciones[deviceId][fenomeno].push(valor);
      }
    }
    return estaciones;
  }

  async procesarMigracion(estaciones, fecha) {
    for (const [deviceId, fenomenos] of Object.entries(estaciones)) {
      const estacion = await models.station.findOne({ where: { id_device: deviceId } });
      if (!estacion) {
        console.warn(`🚫 No existe station.id_device=${deviceId}`);
        continue;
      }

      for (const [nombreFen, valores] of Object.entries(fenomenos)) {
        const nombreNorm = normalizacionNombres[nombreFen.toUpperCase()];
        if (!nombreNorm) {
          console.warn(`🚫 Fenómeno no mapeado: ${nombreFen}`);
          continue;
        }

        const fenomeno = await models.phenomenon_type.findOne({
          where: Sequelize.where(
            Sequelize.fn('UPPER', Sequelize.col('name')),
            nombreNorm
          )
        });
        if (!fenomeno) {
          console.warn(`🚫 phenotype missing: ${nombreNorm}`);
          continue;
        }

        // operaciones predefinidas en phenomenon_type.operations
        for (const oper of fenomeno.operations) {
          const tipoOp = await models.type_operation.findOne({ where: { operation: oper } });
          if (!tipoOp) {
            console.warn(`⚠️ type_operation faltante: ${oper}`);
            continue;
          }

          let resultado = 0;
          switch (oper) {
            case 'PROMEDIO':
              resultado = valores.length > 0
                ? valores.reduce((a,b)=>a+b,0)/valores.length
                : 0;
              break;
            case 'MAX': resultado = Math.max(...valores); break;
            case 'MIN': resultado = Math.min(...valores); break;
            case 'SUMA': resultado = valores.reduce((a,b)=>a+b,0); break;
            default:
              console.warn(`❓ Operación desconocida: ${oper}`);
              continue;
          }

          if (this.esValorValido(resultado)) {
            console.log(`✅ Inserto ${fenomeno.name}(${oper})=${resultado.toFixed(2)} en station ${estacion.id}`);
            await models.daily_measurement.create({
              local_date:        new Date(`${fecha}T00:00:00Z`),
              quantity:          Number(resultado.toFixed(2)),
              external_id:       uuidv4(),
              status:            true,
              id_station:        estacion.id,
              id_phenomenon_type: fenomeno.id,
              id_type_operation:  tipoOp.id
            });
          } else {
            console.warn(`❌ ${fenomeno.name}(${oper}) inválido: ${resultado}`);
          }
        }
      }
    }
  }
}

module.exports = MigracionController;
