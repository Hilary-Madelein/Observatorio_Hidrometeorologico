'use strict';

// Cargamos vars de entorno
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { CosmosClient } = require('@azure/cosmos');
const Sequelize        = require('sequelize');
const { v4: uuidv4 }   = require('uuid');
const models           = require('../models');

const VALOR_UMBRAL = 1e6;

// Variables exentas del filtrado de anomalías
const EXEMPT_FENS = new Set([
  'NIVEL_DE_AGUA',
  'SOLIDOS_SUSPENDIDOS_GS',
  'RADIATION',
  'CAUDAL_Q'
]);

// Mapeo de campos por contenedor
const medidaMapeo = {
  EHA: {
    Carga_H:       'CARGA_H',
    Distancia_Hs:  'DISTANCIA_HS',
    Nivel_de_agua: 'NIVEL_DE_AGUA'
  },
  PUEAR: {
    // eui-… datos hidráulicos
    Carga_H:                  'CARGA_H',
    'Caudal (Q)':             'CAUDAL_Q',
    Distancia_Hs:             'DISTANCIA_HS',
    Nivel_de_agua:            'NIVEL_DE_AGUA',
    'Solidos_Suspendidos_GS': 'SOLIDOS_SUSPENDIDOS_GS',
    // mark4 datos climáticos
    temperature:              'TEMPERATURE',
    humidity:                 'HUMIDITY',
    radiation:                'RADIATION',
    rain:                     'RAIN'
  }
};

// Normalización para lookup en phenomenon_type
const normalizacionNombres = {
  'CARGA_H':                'CARGA_H',
  'DISTANCIA_HS':           'DISTANCIA_HS',
  'NIVEL_DE_AGUA':          'NIVEL_DE_AGUA',
  'CAUDAL_Q':               'CAUDAL (L/S)',
  'SOLIDOS_SUSPENDIDOS_GS': 'SOLIDOS_SUSPENDIDOS_GS (MG/S)',
  'TEMPERATURE':            'TEMPERATURE',
  'HUMIDITY':               'HUMIDITY',
  'RADIATION':              'RADIATION',
  'RAIN':                   'RAIN'
};

class MigracionController {
  constructor() {
    const endpoint     = process.env.COSMOS_ENDPOINT;
    const key          = process.env.COSMOS_KEY;
    const dbEhaId      = process.env.COSMOS_DB_EHA;
    const dbPuearId    = process.env.COSMOS_DB_PUEAR;

    if (!dbEhaId || !dbPuearId) {
      throw new Error('Falta definir COSMOS_DB_EHA o COSMOS_DB_PUEAR en .env');
    }

    const client       = new CosmosClient({ endpoint, key });
    this.dbEha         = client.database(dbEhaId);
    this.dbPuear       = client.database(dbPuearId);
  }

  esValorValido(valor) {
    return valor != null && !isNaN(valor) && Math.abs(valor) < VALOR_UMBRAL;
  }

  async generarFechasParaMigrar() {
    const desde = new Date('2024-01-01');
    const hasta = new Date();
    hasta.setHours(0, 0, 0, 0);

    const fechas = [];
    for (let d = new Date(desde); d < hasta; d.setDate(d.getDate() + 1)) {
      fechas.push(d.toISOString().slice(0, 10));
    }
    return fechas;
  }

  async obtenerDatosCosmosConFiltro(container, fecha, campoFecha) {
    const propiedad = campoFecha.includes('-')
      ? `c['${campoFecha}']`
      : `c.${campoFecha}`;

    const querySpec = {
      query: `SELECT * FROM c WHERE STARTSWITH(${propiedad}, @fecha)`,
      parameters: [{ name: '@fecha', value: fecha }]
    };

    try {
      const { resources } = await container.items.query(querySpec).fetchAll();
      return resources;
    } catch (err) {
      console.error(`Error en ${container.id} [${campoFecha}]:`, err.message);
      return [];
    }
  }

  agruparPorEstacionYMedida(items, mapeo) {
    const estaciones = {};

    for (const item of items) {
      const deviceId = item.dispositivo || item.deviceId;
      if (!deviceId) continue;

      const data = item.datos || item;
      for (const [campo, rawVal] of Object.entries(data)) {
        const nombreFen = mapeo[campo];
        if (!nombreFen) continue;

        let valor = Number(rawVal);
        if (isNaN(valor)) continue;

        // Si es nivel de agua, le sumamos 2200
        if (nombreFen === 'NIVEL_DE_AGUA') {
          valor += 2200;
        }

        // Filtrado de anomalías salvo en variables exentas
        if (!EXEMPT_FENS.has(nombreFen) && !this.esValorValido(valor)) {
          continue;
        }

        estaciones[deviceId] ||= {};
        estaciones[deviceId][nombreFen] ||= [];
        estaciones[deviceId][nombreFen].push(valor);
      }
    }

    return estaciones;
  }

  async procesarMigracion(estaciones, fecha) {
    for (const [deviceId, fenomenos] of Object.entries(estaciones)) {
      const estacion = await models.station.findOne({ where: { id_device: deviceId } });
      if (!estacion) {
        console.warn(`Station ${deviceId} no encontrada`);
        continue;
      }

      for (const [nombreFen, valores] of Object.entries(fenomenos)) {
        const norm = normalizacionNombres[nombreFen.toUpperCase()];
        if (!norm) continue;

        const fenomeno = await models.phenomenon_type.findOne({
          where: Sequelize.where(
            Sequelize.fn('UPPER', Sequelize.col('name')),
            norm
          )
        });
        if (!fenomeno) continue;

        for (const oper of fenomeno.operations) {
          const tipoOp = await models.type_operation.findOne({ where: { operation: oper } });
          if (!tipoOp) continue;

          let resultado;
          switch (oper) {
            case 'PROMEDIO':
              resultado = valores.reduce((a, b) => a + b, 0) / valores.length;
              break;
            case 'MAX':
              resultado = Math.max(...valores);
              break;
            case 'MIN':
              resultado = Math.min(...valores);
              break;
            case 'SUMA':
              resultado = valores.reduce((a, b) => a + b, 0);
              break;
            default:
              continue;
          }

          // Exentar anomalías en ciertos fenómenos
          if (!EXEMPT_FENS.has(nombreFen) && !this.esValorValido(resultado)) {
            continue;
          }

          await models.daily_measurement.create({
            local_date:         new Date(`${fecha}T00:00:00Z`),
            quantity:           Number(resultado.toFixed(2)),
            external_id:        uuidv4(),
            status:             true,
            id_station:         estacion.id,
            id_phenomenon_type: fenomeno.id,
            id_type_operation:  tipoOp.id
          });
        }
      }
    }
  }

  async migrar() {
    console.log('🔄 Iniciando migración desde Azure Cosmos DB...');
    const fechas  = await this.generarFechasParaMigrar();
    const fuentes = [
      { db: this.dbEha,   contenedores: ['EHA'],   campoFecha: 'Fecha_local_UTC-5' },
      { db: this.dbPuear, contenedores: ['PUEAR'], campoFecha: 'fecha_recepcion' }
    ];

    for (const fecha of fechas) {
      for (const { db, contenedores, campoFecha } of fuentes) {
        for (const contenedor of contenedores) {
          console.log(`🔄 Migrando ${contenedor} para ${fecha}`);
          const container = db.container(contenedor);
          const items     = await this.obtenerDatosCosmosConFiltro(container, fecha, campoFecha);
          console.log(`📥 ${items.length} docs en ${contenedor}`);

          const agrupado = this.agruparPorEstacionYMedida(items, medidaMapeo[contenedor] || {});
          await this.procesarMigracion(agrupado, fecha);
        }
      }
    }
  }
}

module.exports = MigracionController;
