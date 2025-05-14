'use strict';

const { v4: uuidv4 } = require('uuid');
const models = require('../models');

const Station = models.station;
const Quantity = models.quantity;
const Measurement = models.measurement;
const PhenomenonType = models.phenomenon_type;

class DailyMeasurementController {
    async getMedicionesHistoricas(req, res) {
        const { rango, estacion, fechaInicio, fechaFin } = req.query;
      
        if (!rango || !['mensual', 'rangoFechas'].includes(rango)) {
          return res.status(400).json({ msg: 'Rango de tiempo inválido', code: 400 });
        }
      
        try {
          let rows;
      
          if (rango === 'mensual') {
            // Agrupación por mes y fenómeno para todos los registros
            rows = await models.sequelize.query(
              `
              SELECT
                TO_CHAR(dm.local_date, 'YYYY-MM') AS periodo,
                p.name AS tipo_medida,
                AVG(dm.quantity) FILTER (WHERE 'PROMEDIO' = ANY(p.operations)) AS promedio,
                MAX(dm.quantity) FILTER (WHERE 'MAX' = ANY(p.operations)) AS maximo,
                MIN(dm.quantity) FILTER (WHERE 'MIN' = ANY(p.operations)) AS minimo,
                SUM(dm.quantity) FILTER (WHERE 'SUMA' = ANY(p.operations)) AS suma
              FROM daily_measurement dm
              JOIN phenomenon_type p ON dm.id_phenomenon_type = p.id
              JOIN station st ON dm.id_station = st.id
              WHERE dm.status = true
                AND p.status = true
                AND (st.external_id = :estacion OR :estacion IS NULL)
              GROUP BY periodo, p.name
              ORDER BY periodo, p.name;
              `,
              {
                replacements: { estacion: estacion || null },
                type: models.sequelize.QueryTypes.SELECT
              }
            );
          } else if (rango === 'rangoFechas') {
            if (!fechaInicio || !fechaFin) {
              return res.status(400).json({ msg: 'Se requiere una fecha de inicio y fin para el rango de fechas', code: 400 });
            }
      
            rows = await models.sequelize.query(
              `
              SELECT
                dm.local_date AS periodo,
                p.name AS tipo_medida,
                AVG(dm.quantity) FILTER (WHERE 'PROMEDIO' = ANY(p.operations)) AS promedio,
                MAX(dm.quantity) FILTER (WHERE 'MAX' = ANY(p.operations)) AS maximo,
                MIN(dm.quantity) FILTER (WHERE 'MIN' = ANY(p.operations)) AS minimo,
                SUM(dm.quantity) FILTER (WHERE 'SUMA' = ANY(p.operations)) AS suma
              FROM daily_measurement dm
              JOIN phenomenon_type p ON dm.id_phenomenon_type = p.id
              JOIN station st ON dm.id_station = st.id
              WHERE dm.local_date BETWEEN :fechaInicio AND :fechaFin
                AND dm.status = true
                AND p.status = true
                AND (st.external_id = :estacion OR :estacion IS NULL)
              GROUP BY periodo, p.name
              ORDER BY periodo, p.name;
              `,
              {
                replacements: {
                  fechaInicio: new Date(fechaInicio).toISOString(),
                  fechaFin: new Date(fechaFin).toISOString(),
                  estacion: estacion || null
                },
                type: models.sequelize.QueryTypes.SELECT
              }
            );
          }
      
          // Agrupar resultados
          const seriesMap = {};
          rows.forEach(r => {
            const key = new Date(r.periodo).toISOString();
            if (!seriesMap[key]) {
              seriesMap[key] = { hora: key, medidas: {} };
            }
            const ops = {};
            if (r.promedio != null) ops.PROMEDIO = parseFloat(Number(r.promedio).toFixed(2));
            if (r.maximo != null) ops.MAX = parseFloat(r.maximo);
            if (r.minimo != null) ops.MIN = parseFloat(r.minimo);
            if (r.suma != null) ops.SUMA = parseFloat(r.suma);
            seriesMap[key].medidas[r.tipo_medida] = ops;
          });
      
          const info = Object.values(seriesMap);
      
          return res.status(200).json({
            msg: 'Series históricas de mediciones agregadas',
            code: 200,
            info
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ msg: 'Error al obtener mediciones históricas', code: 500 });
        }
      }
      
}

module.exports = DailyMeasurementController;