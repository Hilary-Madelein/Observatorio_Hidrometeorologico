'use strict';

const { v4: uuidv4 } = require('uuid');
const models = require('../models');
const { Op } = require('sequelize');
const { getIO } = require('../routes/socket');
const Station = models.station;
const Quantity = models.quantity;
const Measurement = models.measurement;
const PhenomenonType = models.phenomenon_type;
const DailyMeasurement = models.daily_measurement;
const TypeOperation = models.type_operation;

function calcularFechas(rango, ahora) {
    let fechaInicio;
    let fechaFin = ahora;
    if (['15min', '30min', 'hora'].includes(rango)) {
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        fechaInicio = new Date(inicioHoy.getTime() - 3 * 24 * 60 * 60 * 1000);
    } else if (rango === 'diaria') {
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        fechaInicio = new Date(inicioHoy.getTime() - 14*24*60*60*1000);
        fechaFin = new Date(
          ahora.getFullYear(),
          ahora.getMonth(),
          ahora.getDate(),
          23, 59, 59, 999
        );
    } else {
        throw new Error('Rango inválido');
    }
    return { fechaInicio, fechaFin };
}

const rawTraducciones = {
    'Temperature': 'Temperatura',
    'Humidity': 'Humedad',
    'Radiation': 'Radiación',
    'Rain': 'Lluvia',
    'Caudal (L/s)': 'Caudal',
    'Solidos_Suspendidos_GS (mg/s)': 'Sólidos suspendidos'
};

const traducciones = Object.fromEntries(
    Object.entries(rawTraducciones).map(([k, v]) => [
        k.replace(/_/g, ' ').trim().toLowerCase(),
        v
    ])
);

const normalizeKey = s =>
    s.replace(/_/g, ' ')
        .trim()
        .toLowerCase();

const formatName = (name) => {
    if (name === 'PRESION') {
        return 'Presión';
    }
    return name.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};


class MeasurementController {

    /**
     * Guarda múltiples mediciones recibidas desde TTN
     * Cada variable se guarda como un registro separado en Quantity + Measurement
     */
    async saveFromTTN(req, res) {
        const { fecha, dispositivo, payload } = req.body;

        if (!fecha || !dispositivo || !payload) {
            return res.status(400).json({ msg: 'Datos incompletos', code: 400 });
        }

        try {
            const station = await Station.findOne({ where: { id_device: dispositivo } });
            if (!station) {
                return res.status(404).json({ msg: 'Estación no encontrada', code: 404 });
            }

            const savedMeasurements = [];

            const MAX_ANOMALO = 1000;
            const EXEMPT_VARS = new Set([
                'Solidos_Suspendidos_GS (mg/s)',
                'Nivel_de_agua',
                'Radiation',
                'Caudal (L/s)'
            ]);

            for (const [variable, rawValue] of Object.entries(payload)) {
                let valor = parseFloat(rawValue);
                if (isNaN(valor)) continue;

                if (variable === 'Nivel_de_agua') {
                    valor += 2200;
                }

                if (!EXEMPT_VARS.has(variable) && valor > MAX_ANOMALO) {
                    continue;
                }

                const phenomenon = await PhenomenonType.findOne({
                    where: { name: variable.toUpperCase() }
                });
                if (!phenomenon) continue;

                const quantity = await Quantity.create({
                    quantity: valor,
                    external_id: uuidv4(),
                    status: true
                });

                await Measurement.create({
                    local_date: new Date(fecha),
                    id_station: station.id,
                    id_quantity: quantity.id,
                    id_phenomenon_type: phenomenon.id,
                    external_id: uuidv4(),
                    status: true
                });

                savedMeasurements.push({
                    tipo_medida: variable,
                    valor,
                    unidad: phenomenon.unit_measure || '',
                    estacion: dispositivo
                });
            }

            try {
                getIO().emit('new-measurements', savedMeasurements);
            } catch (err) {
                console.warn('Socket no disponible:', err.message);
            }

            return res.status(200).json({
                msg: 'Mediciones guardadas con éxito',
                code: 200,
                info: savedMeasurements
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                msg: 'Error al guardar mediciones: ' + error.message,
                code: 500
            });
        }
    }


    /**
     * Retorna la última medición registrada por cada variable
     */
    async getUltimasMediciones(req, res) {
        try {
            const [results] = await models.sequelize.query(`
            SELECT DISTINCT ON (p.name) 
                   p.name AS tipo_medida,
                   q.quantity AS valor,
                   p.unit_measure AS unidad,
                   st.name AS estacion,
                   m.local_date
            FROM measurement m
            JOIN quantity q 
              ON m.id_quantity = q.id 
             AND q.status = true
            JOIN phenomenon_type p 
              ON m.id_phenomenon_type = p.id 
             AND p.status = true        
            JOIN station st 
              ON m.id_station = st.id 
            WHERE m.status = true      
            ORDER BY p.name, m.local_date DESC;
          `);

            const agrupadas = {};
            results.forEach(row => {
                if (!agrupadas[row.tipo_medida]) {
                    agrupadas[row.tipo_medida] = {
                        tipo_medida: formatName(row.tipo_medida),
                        valor: parseFloat(row.valor),
                        unidad: row.unidad,
                        estacion: row.estacion,
                        fecha_medicion: row.local_date.toISOString()
                    };
                }
            });

            let salida = Object.values(agrupadas);

            salida = salida.map(med => {
                const claveNorm = normalizeKey(med.tipo_medida);
                return {
                    ...med,
                    tipo_medida: traducciones[claveNorm] || med.tipo_medida
                };
            });

            return res.status(200).json({
                msg: 'Últimas mediciones',
                code: 200,
                info: salida
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                msg: 'Error al obtener últimas mediciones',
                code: 500
            });
        }
    }

    /**
  * Retorna la última medición registrada por cada variable
  * para la estación cuyo external_id se recibe como query parameter.
  */
    async getUltimasMedicionesPorEstacion(req, res) {
        const externalId = req.body.externalId;
        if (!externalId) {
            return res.status(400).json({
                msg: 'Datos incompletos para buscar información de la estación',
                code: 400
            });
        }

        try {
            const results = await models.sequelize.query(`
                SELECT DISTINCT ON (p.name)
                       p.name          AS tipo_medida,
                       q.quantity      AS valor,
                       p.unit_measure  AS unidad,
                       m.local_date    AS fecha_medicion
                FROM measurement m
                JOIN quantity q 
                  ON m.id_quantity = q.id 
                 AND q.status = true          
                JOIN phenomenon_type p 
                  ON m.id_phenomenon_type = p.id 
                 AND p.status = true         
                JOIN station st 
                  ON m.id_station = st.id 
                 AND st.external_id = :externalId
                WHERE m.status = true         
                ORDER BY p.name, m.local_date DESC;
            `, {
                replacements: { externalId },
                type: models.sequelize.QueryTypes.SELECT
            });

            const salida = results.map(row => {
                const nombreFormateado = formatName(row.tipo_medida);
                return {
                    tipo_medida: traducciones[nombreFormateado] || nombreFormateado,
                    valor: parseFloat(row.valor),
                    unidad: row.unidad,
                    fecha_medicion: row.fecha_medicion
                };
            });

            return res.status(200).json({
                msg: 'Últimas mediciones de la estación',
                code: 200,
                info: salida
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                msg: 'Error al obtener últimas mediciones para la estación',
                code: 500
            });
        }
    }

    /**
   * Retorna series de estadísticas (PROMEDIO, MAX, MIN, SUMA) por fenómeno
   * agrupadas en intervalos de tiempo según 'rango' (minuto u hora).
   */

    async getMedicionesPorTiempo(req, res) {
        const { rango, estacion } = req.query;
        if (!rango || !['15min', '30min', 'hora', 'diaria'].includes(rango)) {
            return res.status(400).json({ msg: 'Rango inválido', code: 400 });
        }

        try {
            const ahora = new Date();
            const { fechaInicio, fechaFin } = calcularFechas(rango, ahora);

            const joinMeasurement = `
            JOIN quantity q
              ON m.id_quantity = q.id AND q.status = true
            JOIN phenomenon_type p
              ON m.id_phenomenon_type = p.id AND p.status = true
            JOIN station st
              ON m.id_station = st.id AND st.status = 'OPERATIVA'
          `;
            const joinDaily = `
            JOIN phenomenon_type p
              ON dm.id_phenomenon_type = p.id AND p.status = true
            JOIN station st
              ON dm.id_station = st.id AND st.status = 'OPERATIVA'
          `;

            if (['15min', '30min', 'hora'].includes(rango)) {
                const intervalMap = { '15min': 15, '30min': 30, 'hora': 60 };
                const bucket = intervalMap[rango];
                const sql = `
              SELECT
                (
                  date_trunc('day', m.local_date)
                  + date_part('hour', m.local_date) * interval '1 hour'
                  + floor(date_part('minute', m.local_date)/${bucket}) * interval '${bucket} minutes'
                ) AS periodo,
                p.name         AS tipo_medida,
                p.icon         AS variable_icon,
                p.unit_measure AS unidad,
                st.name        AS estacion_nombre,
                AVG(q.quantity) FILTER(WHERE 'PROMEDIO'=ANY(p.operations)) AS promedio,
                MAX(q.quantity) FILTER(WHERE 'MAX'=ANY(p.operations))     AS maximo,
                MIN(q.quantity) FILTER(WHERE 'MIN'=ANY(p.operations))     AS minimo,
                SUM(q.quantity) FILTER(WHERE 'SUMA'=ANY(p.operations))    AS suma
              FROM measurement m
              ${joinMeasurement}
              WHERE m.local_date BETWEEN :fechaInicio AND :fechaFin
                AND m.status = true
                AND (:estacion IS NULL OR st.external_id = :estacion)
              GROUP BY periodo, p.name, p.icon, p.unit_measure, st.name
              ORDER BY periodo;
            `;
                const rows = await models.sequelize.query(sql, {
                    replacements: { fechaInicio, fechaFin, estacion: estacion || null },
                    type: models.sequelize.QueryTypes.SELECT
                });

                const seriesMap = {};
                rows.forEach(r => {
                    const fechaKey = r.periodo.toISOString();
                    const mapKey = `${fechaKey}__${r.estacion_nombre}`;
                    seriesMap[mapKey] ??= {
                        hora: fechaKey,
                        estacion: r.estacion_nombre,
                        medidas: {}
                    };

                    const norm = normalizeKey(r.tipo_medida);
                    const tr = traducciones[norm] || formatName(r.tipo_medida);
                    const ops = {};
                    if (r.promedio != null) ops.PROMEDIO = Math.round(r.promedio * 100) / 100;
                    if (r.maximo) ops.MAX = parseFloat(r.maximo);
                    if (r.minimo) ops.MIN = parseFloat(r.minimo);
                    if (r.suma) ops.SUMA = parseFloat(r.suma);
                    ops.icon = r.variable_icon;
                    ops.unidad = r.unidad;

                    seriesMap[mapKey].medidas[tr] = ops;
                });

                return res.json({
                    msg: `Series cada ${rango}`,
                    code: 200,
                    info: Object.values(seriesMap)
                });
            }

            if (rango === 'diaria') {
                const sqlPre = `
        SELECT
          dm.local_date        AS periodo,
          p.name               AS tipo_medida,
          p.icon               AS variable_icon,
          p.unit_measure       AS unidad,
          st.name              AS estacion_nombre,
          dm.quantity          AS valor,
          dm.id_type_operation AS op
        FROM daily_measurement dm
        ${joinDaily}
        WHERE dm.local_date BETWEEN :fechaInicio AND :fechaFin
          AND dm.status = true
          AND (:estacion IS NULL OR st.external_id = :estacion)
      `;
                const sqlRaw = `
        SELECT
          date_trunc('day', m.local_date) AS periodo,
          p.name         AS tipo_medida,
          p.icon         AS variable_icon,
          p.unit_measure AS unidad,
          st.name        AS estacion_nombre,
          AVG(q.quantity) FILTER(WHERE 'PROMEDIO'=ANY(p.operations)) AS promedio,
          MAX(q.quantity) FILTER(WHERE 'MAX'=ANY(p.operations))     AS maximo,
          MIN(q.quantity) FILTER(WHERE 'MIN'=ANY(p.operations))     AS minimo,
          SUM(q.quantity) FILTER(WHERE 'SUMA'=ANY(p.operations))    AS suma
        FROM measurement m
        ${joinMeasurement}
        WHERE m.local_date BETWEEN :fechaInicio AND :fechaFin
          AND m.status = true
          AND (:estacion IS NULL OR st.external_id = :estacion)
          AND date_trunc('day', m.local_date) NOT IN (
            SELECT dm.local_date FROM daily_measurement dm
            WHERE dm.local_date BETWEEN :fechaInicio AND :fechaFin
              AND dm.status = true
          )
        GROUP BY periodo, p.name, p.icon, p.unit_measure, st.name;
      `;

                const [pre, raw] = await Promise.all([
                    models.sequelize.query(sqlPre, {
                        replacements: { fechaInicio, fechaFin, estacion: estacion || null },
                        type: models.sequelize.QueryTypes.SELECT
                    }),
                    models.sequelize.query(sqlRaw, {
                        replacements: { fechaInicio, fechaFin, estacion: estacion || null },
                        type: models.sequelize.QueryTypes.SELECT
                    })
                ]);

                const mapDaily = {};

                pre.forEach(r => {
                    const dayKey = r.periodo.toISOString().slice(0, 10);
                    const mapKey = `${dayKey}__${r.estacion_nombre}`;
                    mapDaily[mapKey] ??= {
                        dia: dayKey,
                        estacion: r.estacion_nombre,
                        medidas: {}
                    };

                    const opMap = { 1: 'PROMEDIO', 2: 'MAX', 3: 'MIN', 4: 'SUMA' };
                    const opName = opMap[r.op] || `OP${r.op}`;
                    const norm = normalizeKey(r.tipo_medida);
                    const tr = traducciones[norm] || formatName(r.tipo_medida);

                    mapDaily[mapKey].medidas[tr] ??= {};
                    mapDaily[mapKey].medidas[tr][opName] = parseFloat(r.valor);
                    mapDaily[mapKey].medidas[tr].icon = r.variable_icon;
                    mapDaily[mapKey].medidas[tr].unidad = r.unidad;
                });

                raw.forEach(r => {
                    const dayKey = r.periodo.toISOString().slice(0, 10);
                    const mapKey = `${dayKey}__${r.estacion_nombre}`;
                    mapDaily[mapKey] ??= {
                        dia: dayKey,
                        estacion: r.estacion_nombre,
                        medidas: {}
                    };

                    const norm = normalizeKey(r.tipo_medida);
                    const tr = traducciones[norm] || formatName(r.tipo_medida);
                    const ops = {};
                    if (r.promedio != null) ops.PROMEDIO = Math.round(r.promedio * 100) / 100;
                    if (r.maximo) ops.MAX = parseFloat(r.maximo);
                    if (r.minimo) ops.MIN = parseFloat(r.minimo);
                    if (r.suma) ops.SUMA = parseFloat(r.suma);
                    ops.icon = r.variable_icon;
                    ops.unidad = r.unidad;

                    mapDaily[mapKey].medidas[tr] = {
                        ...mapDaily[mapKey].medidas[tr],
                        ...ops
                    };
                });

                const series = Object.values(mapDaily);

                return res.json({
                    msg: 'Series diarias combinadas (últimos días)',
                    code: 200,
                    info: series
                });
            }

        } catch (e) {
            console.error('Error en getMedicionesPorTiempo:', e);
            return res.status(500).json({ msg: 'Error interno', code: 500 });
        }
    }

    /**
   * Migra registros de Measurement a daily_measurement
   */
    async migrateToDaily(req, res) {
        try {
            const last = await DailyMeasurement.findOne({
                where: { status: true },
                order: [['local_date', 'DESC']],
                attributes: ['local_date']
            });
            const desde = last ? new Date(last.local_date) : new Date(0);
    
            const agg = await models.sequelize.query(
                `
                SELECT
                  date_trunc('day', m.local_date)::date AS day,
                  m.id_station,
                  m.id_phenomenon_type,
                  AVG(q.quantity) AS promedio,
                  MAX(q.quantity) AS maximo,
                  MIN(q.quantity) AS minimo,
                  SUM(q.quantity) AS suma
                FROM measurement m
                JOIN quantity q ON m.id_quantity = q.id
                WHERE m.local_date > :desde
                  AND m.status = true
                  AND q.status = true
                GROUP BY day, m.id_station, m.id_phenomenon_type
                ORDER BY day;
                `,
                {
                    replacements: { desde: desde.toISOString() },
                    type: models.sequelize.QueryTypes.SELECT
                }
            );
    
            const opsList = await TypeOperation.findAll({
                attributes: ['id', 'operation'],
                where: { status: true }
            });
            const opMap = opsList.reduce((m, op) => {
                m[op.operation] = op.id;
                return m;
            }, {});
    
            const inserts = [];
            for (const r of agg) {
                ['PROMEDIO', 'MAX', 'MIN', 'SUMA'].forEach(opKey => {
                    const valor = r[opKey.toLowerCase()];
                    if (valor != null && opMap[opKey]) {
                        inserts.push({
                            local_date:         r.day,
                            id_station:         r.id_station,
                            id_phenomenon_type: r.id_phenomenon_type,
                            id_type_operation:  opMap[opKey],
                            quantity:           parseFloat(Number(valor).toFixed(2)),
                            external_id:        uuidv4(),
                            status:             true
                        });
                    }
                });
            }
    
            if (inserts.length) {
                await DailyMeasurement.bulkCreate(inserts);
            }
    
            return res.status(200).json({
                msg: 'Migración diaria completada',
                code: 200,
                migrated: inserts.length
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                msg: 'Error en migración diaria: ' + error.message,
                code: 500
            });
        }
    }
    


    /**
     * Elimina entradas de Measurement older than 7 days
     */
    async cleanOldMeasurements(req, res) {
        try {
            const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60000);
            const deletedMeasurements = await Measurement.destroy({
                where: { local_date: { [Op.lt]: cutoff } }
            });
            const deletedQuantities = await Quantity.destroy({
                where: {
                    id: {
                        [Op.notIn]: models.sequelize.literal(
                            '(SELECT DISTINCT id_quantity FROM measurement)'
                        )
                    }
                }
            });
            return res.status(200).json({
                msg: 'Mediciones y cantidades antiguas eliminadas',
                code: 200,
                deletedMeasurements,
                deletedQuantities
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: 'Error al eliminar mediciones/cantidades: ' + error.message, code: 500 });
        }
    }

    /**
 * Trunca por completo la tabla Quantity, reinicia los IDs y borra en cascada
 */
    async clearAllQuantity(req, res) {
        try {
            await Measurement.truncate({ cascade: true, restartIdentity: true });

            await Quantity.truncate({ cascade: true, restartIdentity: true });

            return res.status(200).json({ msg: 'Quantity truncada con éxito', code: 200 });
        } catch (error) {
            console.error(error);
            return res
                .status(500)
                .json({ msg: 'Error al truncar Quantity: ' + error.message, code: 500 });
        }
    }


}

module.exports = MeasurementController;