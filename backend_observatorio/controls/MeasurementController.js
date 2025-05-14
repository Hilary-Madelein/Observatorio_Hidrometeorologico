'use strict';

const { v4: uuidv4 } = require('uuid');
const models = require('../models');

const Station = models.station;
const Quantity = models.quantity;
const Measurement = models.measurement;
const PhenomenonType = models.phenomenon_type;

function calcularFechas(escalaDeTiempo, mes, anio, fechaInicio, fechaFin, ultimaFecha) {
    let inicio, fin;

    if (escalaDeTiempo) {
        switch (escalaDeTiempo) {
            case '15min':
                inicio = new Date(ultimaFecha.getTime() - 15 * 60000).toISOString();
                fin = ultimaFecha.toISOString();
                break;
            case '30min':
                inicio = new Date(ultimaFecha.getTime() - 30 * 60000).toISOString();
                fin = ultimaFecha.toISOString();
                break;
            case 'hora':
                inicio = new Date(ultimaFecha.getTime() - 60 * 60000).toISOString();
                fin = ultimaFecha.toISOString();
                break;
            case 'diaria':
                inicio = new Date(
                    ultimaFecha.getFullYear(),
                    ultimaFecha.getMonth(),
                    ultimaFecha.getDate(),
                    0, 0, 0
                ).toISOString();
                fin = new Date(
                    ultimaFecha.getFullYear(),
                    ultimaFecha.getMonth(),
                    ultimaFecha.getDate(),
                    23, 59, 59
                ).toISOString();
                break;
            default:
                throw new Error('Escala de tiempo inválida.');
        }
    } else if (mes && anio) {
        inicio = new Date(anio, mes - 1, 1, 0, 0, 0).toISOString();
        fin = new Date(anio, mes, 0, 23, 59, 59).toISOString();
    } else if (fechaInicio && fechaFin) {
        inicio = new Date(fechaInicio).toISOString();
        fin = new Date(fechaFin).toISOString();
        if (isNaN(Date.parse(inicio)) || isNaN(Date.parse(fin))) {
            throw new Error('Fechas inválidas.');
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

            for (const [variable, valor] of Object.entries(payload)) {
                const phenomenon = await PhenomenonType.findOne({ where: { name: variable.toUpperCase() } });
                if (!phenomenon) continue;

                const quantity = await Quantity.create({
                    quantity: parseFloat(valor),
                    external_id: uuidv4(),
                    status: true
                });

                const measurement = await Measurement.create({
                    local_date: new Date(fecha),
                    id_station: station.id,
                    id_quantity: quantity.id,
                    id_phenomenon_type: phenomenon.id,
                    external_id: uuidv4(),
                    status: true
                });

                savedMeasurements.push({
                    tipo_medida: variable,
                    valor: parseFloat(valor),
                    unidad: phenomenon.unit_measure || '',
                    estacion: dispositivo
                });
            }

            return res.status(200).json({ msg: 'Mediciones guardadas con éxito', code: 200, info: savedMeasurements });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: 'Error al guardar mediciones: ' + error.message, code: 500 });
        }
    }

    /**
     * Retorna la última medición registrada por cada variable
     */
    async getUltimasMediciones(req, res) {
        try {
            const [results] = await models.sequelize.query(`
                SELECT p.name AS tipo_medida,
                       q.quantity AS valor,
                       p.unit_measure AS unidad,
                       st.name AS estacion  -- Cambié 's.id_device' por 'st.name' para traer el nombre de la estación
                FROM measurement m
                JOIN quantity q ON m.id_quantity = q.id
                JOIN phenomenon_type p ON m.id_phenomenon_type = p.id
                JOIN station st ON m.id_station = st.id   -- Asegúrate de que la tabla 'station' tiene un campo 'name' para el nombre de la estación
                WHERE m.status = true
                AND q.status = true
                ORDER BY m.local_date DESC
                LIMIT 50;
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
   * Retorna series de estadísticas (PROMEDIO, MAX, MIN, SUMA) por fenómeno
   * agrupadas en intervalos de tiempo según 'rango' (minuto u hora).
   */
    async getMedicionesPorTiempo(req, res) {
        const { rango, estacion } = req.query;
        const ahora = new Date();

        if (!rango || !['15min', '30min', 'hora', 'diaria'].includes(rango)) {
            return res.status(400).json({ msg: 'Rango de tiempo inválido', code: 400 });
        }

        try {
            const { fechaInicio, fechaFin } = calcularFechas(rango, null, null, null, null, ahora);

            const bucket = rango === 'diaria' ? 'hour' : 'minute';

            const rows = await models.sequelize.query(
                `
            SELECT
              date_trunc(:bucket, m.local_date) AS periodo,
              p.name                                    AS tipo_medida,
              AVG(q.quantity) FILTER (WHERE 'PROMEDIO' = ANY(p.operations)) AS promedio,
              MAX(q.quantity) FILTER (WHERE 'MAX'      = ANY(p.operations)) AS maximo,
              MIN(q.quantity) FILTER (WHERE 'MIN'      = ANY(p.operations)) AS minimo,
              SUM(q.quantity) FILTER (WHERE 'SUMA'     = ANY(p.operations)) AS suma
            FROM measurement m
            JOIN quantity q           ON m.id_quantity        = q.id
            JOIN phenomenon_type p    ON m.id_phenomenon_type = p.id
            JOIN station st           ON m.id_station         = st.id
            WHERE m.local_date BETWEEN :fechaInicio AND :fechaFin
              AND m.status = true
              AND q.status = true
              AND (st.external_id = :estacion OR :estacion IS NULL)
            GROUP BY periodo, p.name
            ORDER BY periodo, p.name;
            `,
                {
                    replacements: {
                        bucket,
                        fechaInicio,
                        fechaFin,
                        estacion: estacion || null
                    },
                    type: models.sequelize.QueryTypes.SELECT
                }
            );

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

            console.log(info);

            return res.status(200).json({
                msg: 'Series de estadísticas por ventana de tiempo',
                code: 200,
                info
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: 'Error al obtener mediciones', code: 500 });
        }
    }

}

module.exports = MeasurementController;