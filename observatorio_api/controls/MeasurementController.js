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


function calcularFechas(escalaDeTiempo, mes, anio, fechaInicio, fechaFin, ultimaFecha) {

    function toLocalISOStringNoTZ(date) {
        const tzOffsetMs = date.getTimezoneOffset() * 60000;
        const local = new Date(date.getTime() - tzOffsetMs);
        return local.toISOString().slice(0, -1);
    }

    let inicio, fin;

    if (escalaDeTiempo) {
        switch (escalaDeTiempo) {
            case '15min': {
                const start = new Date(ultimaFecha.getTime() - 15 * 60000);
                inicio = toLocalISOStringNoTZ(start);
                fin = toLocalISOStringNoTZ(ultimaFecha);
                break;
            }
            case '30min': {
                const start = new Date(ultimaFecha.getTime() - 30 * 60000);
                inicio = toLocalISOStringNoTZ(start);
                fin = toLocalISOStringNoTZ(ultimaFecha);
                break;
            }
            case 'hora': {
                const start = new Date(ultimaFecha.getTime() - 60 * 60000);
                inicio = toLocalISOStringNoTZ(start);
                fin = toLocalISOStringNoTZ(ultimaFecha);
                break;
            }
            case 'diaria': {
                const y = ultimaFecha.getFullYear();
                const m = ultimaFecha.getMonth();
                const d = ultimaFecha.getDate();
                const start = new Date(y, m, d, 0, 0, 0);
                const end = new Date(y, m, d, 23, 59, 59);
                inicio = toLocalISOStringNoTZ(start);
                fin = toLocalISOStringNoTZ(end);
                break;
            }
            default:
                throw new Error('Escala de tiempo inválida.');
        }

    } else {
        throw new Error('Parámetros de fecha insuficientes.');
    }

    return { fechaInicio: inicio, fechaFin: fin };
}


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

            for (const [variable, rawValue] of Object.entries(payload)) {
                const valor = parseFloat(rawValue);
                if (isNaN(valor)) continue;

                if (valor > MAX_ANOMALO) {
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
                JOIN quantity q ON m.id_quantity = q.id
                JOIN phenomenon_type p ON m.id_phenomenon_type = p.id
                JOIN station st ON m.id_station = st.id
                WHERE m.status = true AND q.status = true
                ORDER BY p.name, m.local_date DESC;
            `);

            const agrupadas = {};
            results.forEach(row => {
                if (!agrupadas[row.tipo_medida]) {
                    agrupadas[row.tipo_medida] = {
                        tipo_medida: row.tipo_medida,
                        valor: parseFloat(row.valor),
                        unidad: row.unidad,
                        estacion: row.estacion
                    };
                }
            });

            const salida = Object.values(agrupadas);
            return res.status(200).json({ msg: 'Últimas mediciones', code: 200, info: salida });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: 'Error al obtener últimas mediciones', code: 500 });
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
                JOIN quantity q ON m.id_quantity = q.id
                JOIN phenomenon_type p ON m.id_phenomenon_type = p.id
                JOIN station st ON m.id_station = st.id
                WHERE m.status = true
                  AND q.status = true
                  AND st.external_id = :externalId
                ORDER BY p.name, m.local_date DESC;
            `, {
                replacements: { externalId },
                type: models.sequelize.QueryTypes.SELECT
            });
    
            const salida = results.map(row => ({
                tipo_medida:    row.tipo_medida,
                valor:          parseFloat(row.valor),
                unidad:         row.unidad,
                fecha_medicion: row.fecha_medicion
            }));
    
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
        const ahora = new Date();

        if (!rango || !['15min', '30min', 'hora', 'diaria'].includes(rango)) {
            return res.status(400).json({ msg: 'Rango inválido', code: 400 });
        }

        try {
            const { fechaInicio, fechaFin } = calcularFechas(rango, null, null, null, null, ahora);

            if (['15min', '30min', 'hora'].includes(rango)) {
                const sql = `
              SELECT
                m.local_date    AS periodo,
                p.name          AS tipo_medida,
                p.icon          AS variable_icon,
                p.unit_measure  AS unidad,
                st.name         AS estacion_nombre,
                q.quantity      AS valor
              FROM measurement m
              JOIN quantity q        ON m.id_quantity        = q.id
              JOIN phenomenon_type p ON m.id_phenomenon_type = p.id
              JOIN station st        ON m.id_station         = st.id
              WHERE m.local_date BETWEEN :fechaInicio AND :fechaFin
                AND m.status = true
                AND q.status = true
                AND (:estacion IS NULL OR st.external_id = :estacion)
              ORDER BY m.local_date;
            `;

                let rows = await models.sequelize.query(sql, {
                    replacements: { fechaInicio, fechaFin, estacion: estacion || null },
                    type: models.sequelize.QueryTypes.SELECT
                });

                rows = rows.filter(r => r.valor != null && r.valor <= 1000);

                const info = rows.map(r => ({
                    hora: r.periodo.toISOString(),
                    estacion: r.estacion_nombre,
                    tipo_medida: r.tipo_medida,
                    valor: parseFloat(r.valor),
                    icon: r.variable_icon,
                    unidad: r.unidad
                }));

                return res.json({ msg: `Datos crudos ${rango}`, code: 200, info });
            }

            const sqlAgg = `
            SELECT
              date_trunc('hour', m.local_date) AS periodo,
              p.name                            AS tipo_medida,
              p.icon                            AS variable_icon,
              p.unit_measure                    AS unidad,
              st.name                           AS estacion_nombre,
              AVG(q.quantity) FILTER (WHERE 'PROMEDIO' = ANY(p.operations)) AS promedio,
              MAX(q.quantity)   FILTER (WHERE 'MAX'      = ANY(p.operations)) AS maximo,
              MIN(q.quantity)   FILTER (WHERE 'MIN'      = ANY(p.operations)) AS minimo,
              SUM(q.quantity)   FILTER (WHERE 'SUMA'     = ANY(p.operations)) AS suma
            FROM measurement m
            JOIN quantity q        ON m.id_quantity        = q.id
            JOIN phenomenon_type p ON m.id_phenomenon_type = p.id
            JOIN station st        ON m.id_station         = st.id
            WHERE m.local_date BETWEEN :fechaInicio AND :fechaFin
              AND m.status = true
              AND q.status = true
              AND (:estacion IS NULL OR st.external_id = :estacion)
            GROUP BY periodo, p.name, p.icon, p.unit_measure, st.name
            ORDER BY periodo, p.name;
          `;

            let agg = await models.sequelize.query(sqlAgg, {
                replacements: { fechaInicio, fechaFin, estacion: estacion || null },
                type: models.sequelize.QueryTypes.SELECT
            });

            agg = agg.filter(r => {
                if (r.promedio != null && r.promedio > 1000) return false;
                if (r.maximo != null && r.maximo > 1000) return false;
                if (r.minimo != null && r.minimo > 1000) return false;
                if (r.suma != null && r.suma > 1000) return false;
                return true;
            });


            const seriesMap = {};
            agg.forEach(r => {
                const key = new Date(r.periodo).toISOString();
                if (!seriesMap[key]) {
                    seriesMap[key] = {
                        hora: key,
                        estacion: r.estacion_nombre,
                        medidas: {}
                    };
                }
                const ops = {};
                if (r.promedio != null) ops.PROMEDIO = Math.round(r.promedio * 100) / 100;
                if (r.maximo != null) ops.MAX = parseFloat(r.maximo);
                if (r.minimo != null) ops.MIN = parseFloat(r.minimo);
                if (r.suma != null) ops.SUMA = parseFloat(r.suma);
                ops.icon = r.variable_icon;
                ops.unidad = r.unidad;
                seriesMap[key].medidas[r.tipo_medida] = ops;
            });

            return res.json({
                msg: 'Series horarias agregadas',
                code: 200,
                info: Object.values(seriesMap)
            });

        } catch (e) {
            console.error('Error en getMedicionesPorTiempo:', e);
            return res.status(500).json({ msg: 'Error', code: 500 });
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

            const MAX_ANOMALO = 1000;

            const inserts = [];
            for (const r of agg) {
                ['PROMEDIO', 'MAX', 'MIN', 'SUMA'].forEach(opKey => {
                    const valor = r[opKey.toLowerCase()];
                    if (
                        valor != null &&
                        opMap[opKey] &&
                        valor <= MAX_ANOMALO
                    ) {
                        inserts.push({
                            local_date: r.day,
                            id_station: r.id_station,
                            id_phenomenon_type: r.id_phenomenon_type,
                            id_type_operation: opMap[opKey],
                            quantity: parseFloat(Number(valor).toFixed(2)),
                            external_id: uuidv4(),
                            status: true
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