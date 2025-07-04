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
    const { rango, estacion, fechaInicio, fechaFin } = req.query;

    if (!rango || !['mensual', 'rangoFechas'].includes(rango)) {
      return res.status(400).json({ msg: 'Rango de tiempo inválido', code: 400 });
    }

    const traducciones = {
      Temperature: 'Temperatura',
      Humidity: 'Humedad',
      Radiation: 'Radiación',
      Rain: 'Lluvia',
    };

    try {
      let rows = [];

      const whereBase = `
        dm.status = true                     
        AND (st.external_id = :estacion OR :estacion IS NULL)
        AND (
          p.name NOT ILIKE '%TEMP%'   
          OR dm.quantity <= 50       
        )
      `;

      if (rango === 'mensual') {
        const sql = `
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
            ON dm.id_phenomenon_type = p.id
           AND p.status = true                    
          JOIN station st
            ON dm.id_station = st.id
           AND st.status = 'OPERATIVA'              
          WHERE ${whereBase}
          GROUP BY periodo, p.name, p.icon, p.unit_measure, st.name
          ORDER BY periodo, p.name;
        `;

        rows = await models.sequelize.query(sql, {
          replacements: { estacion: estacion || null },
          type: models.sequelize.QueryTypes.SELECT
        });

      } else {
        if (!fechaInicio || !fechaFin) {
          return res.status(400).json({
            msg: 'Se requiere fechaInicio y fechaFin para rangoFechas',
            code: 400
          });
        }
        const inicio = fechaInicio.slice(0, 10);
        const fin = fechaFin.slice(0, 10);

        const sql = `
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
            ON dm.id_phenomenon_type = p.id
           AND p.status = true
          JOIN station st
            ON dm.id_station = st.id
           AND st.status = 'OPERATIVA'
          WHERE dm.local_date BETWEEN :fechaInicio::date AND :fechaFin::date
            AND ${whereBase}
          GROUP BY periodo, p.name, p.icon, p.unit_measure, st.name
          ORDER BY periodo, p.name;
        `;

        rows = await models.sequelize.query(sql, {
          replacements: {
            estacion: estacion || null,
            fechaInicio: inicio,
            fechaFin: fin
          },
          type: models.sequelize.QueryTypes.SELECT
        });
      }

      rows = rows.filter(r => {
        const isTemp = r.tipo_medida.toLowerCase().includes('temp');
        if (!isTemp) {
          if (r.promedio != null && r.promedio > 1000) return false;
          if (r.maximo != null && r.maximo > 1000) return false;
          if (r.minimo != null && r.minimo > 1000) return false;
          if (r.suma != null && r.suma > 1000) return false;
        }
        return true;
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

        const originalName = formatName(r.tipo_medida);
        const nombreTraducido = traducciones[originalName] || originalName;

        const ops = {};
        if (r.promedio != null) ops.PROMEDIO = parseFloat(Number(r.promedio).toFixed(2));
        if (r.maximo != null) ops.MAX = parseFloat(Number(r.maximo).toFixed(2));
        if (r.minimo != null) ops.MIN = parseFloat(Number(r.minimo).toFixed(2));
        if (r.suma != null) ops.SUMA = parseFloat(Number(r.suma).toFixed(2));
        ops.icon = r.variable_icon;
        ops.unidad = r.unidad;

        seriesMap[key].medidas[nombreTraducido] = ops;
      });

      return res.status(200).json({
        msg: 'Series históricas de mediciones agregadas',
        code: 200,
        info: Object.values(seriesMap)
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: 'Error al obtener mediciones históricas',
        code: 500
      });
    }
  }

}

module.exports = DailyMeasurementController;