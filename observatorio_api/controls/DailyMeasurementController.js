'use strict';

const { v4: uuidv4 } = require('uuid');
const models = require('../models');

const formatName = (name) => {
  if (name === 'PRESION') {
    return 'Presión';
  }
  return name.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

class DailyMeasurementController {
  async getMedicionesHistoricas(req, res) {
    const {
      rango,
      estacion = null,
      fechaInicio,
      fechaFin,
      variable: tipo_medida = null
    } = req.query;

    if (!rango || !['mensual', 'rangoFechas'].includes(rango)) {
      return res.status(400).json({ msg: 'Rango de tiempo inválido', code: 400 });
    }

    const estacionFinal = estacion === 'TODAS' ? null : estacion;
    const tipoMedidaFinal = tipo_medida === 'TODAS' ? null : tipo_medida;

    const rawTraducciones = {
      'Temperature': 'Temperatura',
      'Humidity': 'Humedad',
      'Radiation': 'Radiación',
      'Rain': 'Lluvia',
      'Caudal (L/s)': 'Caudal',
      'Solidos_Suspendidos_GS (mg/s)': 'Sólidos suspendidos',
      'Nivel_de_agua': 'Nivel de Agua',
    };
    const traducciones = Object.fromEntries(
      Object.entries(rawTraducciones).map(([k, v]) => [
        k.replace(/_/g, ' ').trim().toLowerCase(),
        v
      ])
    );
    const normalizeKey = s => s.replace(/_/g, ' ').trim().toLowerCase();

    try {
      let sql, replacements;

      const whereBase = `
        dm.status = true
        AND (st.external_id = :estacion OR :estacion IS NULL)
        AND (:tipo_medida IS NULL OR p.external_id = :tipo_medida)
        AND (
          p.name NOT ILIKE '%TEMP%'
          OR dm.quantity <= 50
        )
      `;

      if (rango === 'mensual') {
        sql = `
          SELECT
            TO_CHAR(dm.local_date,'YYYY-MM') AS periodo,
            p.name         AS tipo_medida,
            p.icon         AS variable_icon,
            p.unit_measure AS unidad,
            st.name        AS estacion_nombre,
            MAX(dm.quantity) FILTER (WHERE dm.id_type_operation = 1) AS promedio,
            MAX(dm.quantity) FILTER (WHERE dm.id_type_operation = 2) AS maximo,
            MAX(dm.quantity) FILTER (WHERE dm.id_type_operation = 3) AS minimo,
            MAX(dm.quantity) FILTER (WHERE dm.id_type_operation = 4) AS suma
          FROM daily_measurement dm
          JOIN phenomenon_type p
            ON dm.id_phenomenon_type = p.id AND p.status = true
          JOIN station st
            ON dm.id_station = st.id AND st.status = 'OPERATIVA'
          WHERE ${whereBase}
            AND dm.local_date >= (CURRENT_DATE - INTERVAL '1 year')
          GROUP BY periodo, p.name, p.icon, p.unit_measure, st.name
          ORDER BY periodo, p.name;
        `;
        replacements = {
          estacion: estacionFinal,
          tipo_medida: tipoMedidaFinal
        };
      } else {
        if (!fechaInicio || !fechaFin) {
          return res.status(400).json({
            msg: 'Se requiere fechaInicio y fechaFin para rangoFechas',
            code: 400
          });
        }
        const inicio = fechaInicio.slice(0, 10);
        const fin = fechaFin.slice(0, 10);

        sql = `
          SELECT
            dm.local_date  AS periodo,
            p.name         AS tipo_medida,
            p.icon         AS variable_icon,
            p.unit_measure AS unidad,
            st.name        AS estacion_nombre,
            MAX(dm.quantity) FILTER (WHERE dm.id_type_operation = 1) AS promedio,
            MAX(dm.quantity) FILTER (WHERE dm.id_type_operation = 2) AS maximo,
            MAX(dm.quantity) FILTER (WHERE dm.id_type_operation = 3) AS minimo,
            MAX(dm.quantity) FILTER (WHERE dm.id_type_operation = 4) AS suma
          FROM daily_measurement dm
          JOIN phenomenon_type p
            ON dm.id_phenomenon_type = p.id AND p.status = true
          JOIN station st
            ON dm.id_station = st.id AND st.status = 'OPERATIVA'
          WHERE dm.local_date BETWEEN :fechaInicio::date AND :fechaFin::date
            AND ${whereBase}
          GROUP BY periodo, p.name, p.icon, p.unit_measure, st.name
          ORDER BY periodo, p.name;
        `;
        replacements = {
          estacion: estacionFinal,
          tipo_medida: tipoMedidaFinal,
          fechaInicio: inicio,
          fechaFin: fin
        };
      }

      const rows = await models.sequelize.query(sql, {
        replacements,
        type: models.sequelize.QueryTypes.SELECT
      });

      const seriesMap = {};
      rows.forEach(r => {
        const periodoISO = new Date(r.periodo).toISOString();
        const key = `${r.estacion_nombre}__${periodoISO}`;

        if (!seriesMap[key]) {
          seriesMap[key] = {
            hora: periodoISO,
            estacion: r.estacion_nombre,
            medidas: {}
          };
        }

        const rawName = formatName(r.tipo_medida);
        const normKey = normalizeKey(rawName);
        const nombreRut = traducciones[normKey] || rawName;

        const ops = {};
        if (r.promedio != null) ops.PROMEDIO = +parseFloat(r.promedio).toFixed(2);
        if (r.maximo != null) ops.MAX = +parseFloat(r.maximo).toFixed(2);
        if (r.minimo != null) ops.MIN = +parseFloat(r.minimo).toFixed(2);
        if (r.suma != null) ops.SUMA = +parseFloat(r.suma).toFixed(2);
        ops.icon = r.variable_icon;
        ops.unidad = r.unidad;

        seriesMap[key].medidas[nombreRut] = ops;
      });

      return res.status(200).json({
        msg: 'Series históricas de mediciones agregadas',
        code: 200,
        info: Object.values(seriesMap)
      });

    } catch (error) {
      console.error('Error en getMedicionesHistoricas:', error);
      return res.status(500).json({
        msg: 'Error al obtener mediciones históricas',
        code: 500
      });
    }
  }
}

module.exports = DailyMeasurementController;