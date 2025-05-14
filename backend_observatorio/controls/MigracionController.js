'use strict';

const { client, databaseId } = require('../routes/index');
const Sequelize = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Op } = require("sequelize");
const models = require('../models');

const VALOR_UMBRAL = 1e6;

const medidaMapeo = {
  EMA: {
    Temperatura: 'Temperatura',
    Presion: 'Presion',
    Humedad: 'Humedad',
    Lluvia: 'Lluvia'
  },
  EHA: {
    Nivel_de_agua: 'Nivel_de_agua',
    Carga_H: 'Carga_H',
    Distancia_Hs: 'Distancia_Hs'
  }
};

const normalizacionNombres = {
  'DISTANCIA_HS': 'DISTANCIA_H',
  'NIVEL_DE_AGUA': 'NIVEL_DE_AGUA',
  'CARGA_H': 'CARGA_H',
  'LLUVIA': 'LLUVIA',
  'PRESION': 'PRESION',
  'HUMEDAD': 'HUMEDAD',
  'TEMPERATURA': 'TEMPERATURA'
};


class MigracionController {
  constructor() {
    this.database = client.database(databaseId);
  }

  esValorValido(valor) {
    return valor !== null && !isNaN(valor) && Math.abs(valor) < VALOR_UMBRAL;
  }

  async migrar() {
    const contenedores = ['EMA', 'EHA'];
    const fechas = await this.generarFechasParaMigrar();
    console.log('🔄 Fechas a migrar:', fechas);

    for (const fecha of fechas) {
      for (const contenedor of contenedores) {
        console.log(`📦 Procesando contenedor ${contenedor} para fecha ${fecha}`);
        const container = this.database.container(contenedor);
        const mapeo = medidaMapeo[contenedor];
        const items = await this.obtenerDatosCosmosConFiltro(container, fecha);
        console.log(`📥 Datos obtenidos de Cosmos (${items.length} items)`);
        const agrupado = this.agruparPorEstacionYMedida(items, mapeo);
        await this.procesarMigracion(agrupado, fecha);
      }
    }
  }

  async generarFechasParaMigrar() {
    const fechaInicio = new Date('2024-01-01'); // o la fecha más antigua que tengas en Cosmos
    const fechaFin = new Date();
    fechaFin.setHours(0, 0, 0, 0); // hasta hoy sin hora

    const fechas = [];
    let actual = new Date(fechaInicio);
    while (actual < fechaFin) {
      fechas.push(actual.toISOString().split('T')[0]);
      actual.setDate(actual.getDate() + 1);
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

        if (!estaciones[deviceId]) estaciones[deviceId] = {};
        if (!estaciones[deviceId][fenomeno]) estaciones[deviceId][fenomeno] = [];

        if (this.esValorValido(valor)) estaciones[deviceId][fenomeno].push(valor);
      }
    }
    return estaciones;
  }

  async procesarMigracion(estaciones, fecha) {
    for (const [deviceId, fenomenos] of Object.entries(estaciones)) {
      const estacion = await models.station.findOne({ where: { id_device: deviceId } });
      if (!estacion) {
        console.warn(`🚫 Estación no encontrada para deviceId ${deviceId}`);
        continue;
      }

      for (const [fenomenoNombre, valores] of Object.entries(fenomenos)) {
        const nombreNormalizado = normalizacionNombres[fenomenoNombre.toUpperCase()];
        if (!nombreNormalizado) {
          console.warn(`🚫 Fenómeno no mapeado: ${fenomenoNombre}`);
          continue;
        }

        const fenomeno = await models.phenomenon_type.findOne({
          where: Sequelize.where(
            Sequelize.fn('UPPER', Sequelize.col('name')),
            nombreNormalizado
          )
        });


        if (!fenomeno) {
          console.warn(`🚫 Fenómeno no encontrado: ${fenomenoNombre}`);
          continue;
        }

        if (!Array.isArray(fenomeno.operations) || fenomeno.operations.length === 0) {
          console.warn(`⚠️ Fenómeno sin operaciones definidas: ${fenomeno.name}`);
          continue;
        }

        console.log(`🔎 Estación: ${estacion.id}, Fenómeno: ${fenomeno.name}, Valores: ${valores}`);

        for (const operacion of fenomeno.operations) {
          const tipoOperacion = await models.type_operation.findOne({ where: { operation: operacion } });
          if (!tipoOperacion) {
            console.warn(`⚠️ Tipo de operación no encontrada: ${operacion}`);
            continue;
          }

          let resultado = 0;
          switch (operacion) {
            case 'PROMEDIO':
              resultado = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
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
              console.warn(`❓ Operación desconocida: ${operacion}`);
              continue;
          }

          if (this.esValorValido(resultado)) {
            console.log(`✅ Insertando: ${fenomeno.name} (${operacion}) = ${resultado.toFixed(2)} para estación ${estacion.id}`);
            await models.daily_measurement.create({
              local_date: new Date(`${fecha}T00:00:00Z`),
              quantity: resultado.toFixed(2),
              external_id: uuidv4(),
              status: true,
              id_station: estacion.id,
              id_phenomenon_type: fenomeno.id,
              id_type_operation: tipoOperacion.id
            });
          } else {
            console.warn(`❌ Valor inválido calculado para ${fenomeno.name} (${operacion}):`, resultado);
          }
        }
      }
    }
  }
}

module.exports = MigracionController;
