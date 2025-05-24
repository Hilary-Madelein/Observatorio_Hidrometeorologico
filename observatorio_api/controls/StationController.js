'use strict';
const { validationResult } = require('express-validator');
const models = require('../models');
const path = require('path');
const uuid = require('uuid');
const fs = require('fs');

const Station = models.station;
const Microbasin = models.microbasin;

class StationController {

    async list(req, res) {
        try {
            const results = await Station.findAll({
                attributes: ['name', 'external_id', 'picture', 'longitude', 'latitude', 'altitude', 'status', 'type', 'id_device'],
            });
            res.json({ msg: 'OK!', code: 200, info: results });
        } catch (error) {
            res.status(500).json({ msg: 'Error al listar estaciones: ' + error.message, code: 500, info: error });
        }
    }

    async listByMicrobasinAndStatus(req, res) {
        const { external_id, estado } = req.params;

        try {
            const microbasin = await Microbasin.findOne({ where: { external_id } });

            if (!microbasin) {
                return res.status(404).json({ msg: 'Microcuenca no encontrada', code: 404 });
            }

            const estaciones = await Station.findAll({
                where: {
                    id_microbasin: microbasin.id,
                    status: estado.toUpperCase()
                },
                attributes: ['name', 'external_id', 'picture', 'longitude', 'latitude', 'altitude', 'status', 'type', 'id_device', 'description'],
            });

            return res.status(200).json({ msg: 'OK!', code: 200, info: estaciones });
        } catch (error) {
            console.error('Error filtrando estaciones:', error);
            return res.status(500).json({ msg: 'Error interno del servidor', code: 500 });
        }
    }

    async getByMicrobasinParam(req, res) {
        const external = req.params.external;

        const microbasin = await Microbasin.findOne({ where: { external_id: external } });
        if (!microbasin) {
            return res.status(400).json({ msg: "La microcuenca especificada no existe", code: 400 });
        }

        const results = await Station.findAll({
            where: { id_microbasin: microbasin.id },
            attributes: ['name', 'external_id', 'picture', 'longitude', 'latitude', 'altitude', 'status', 'type', 'id_device', 'description'],
        });

        return res.status(200).json({
            msg: 'OK!',
            code: 200,
            info: results
        });
    }

    async getByMicrobasinBody(req, res) {
        try {
            const external = req.body.external;
            if (!external) {
                return res.status(400).json({ msg: 'Falta informacion de la microcuenca', code: 400 });
            }

            const microbasin = await Microbasin.findOne({
                where: { external_id: external },
                attributes: ['id', 'name', 'external_id']
            });

            if (!microbasin) {
                return res.status(404).json({ msg: 'Microcuenca no encontrada', code: 404 });
            }

            const results = await Station.findAll({
                where: {
                    id_microbasin: microbasin.id,
                    status: "OPERATIVA"
                },
                attributes: ['name', 'external_id', 'picture', 'longitude', 'latitude', 'altitude', 'status', 'type', 'id_device', 'description'],
            });

            return res.status(200).json({
                msg: 'OK!',
                code: 200,
                microcuenca_nombre: microbasin.name,
                info: results
            });

        } catch (error) {
            console.error("Error al obtener datos:", error);
            return res.status(500).json({ msg: 'Error interno del servidor', code: 500 });
        }
    }

    async getByExternal(req, res) {
        const external = req.params.external_id;
        try {
            const station = await Station.findOne({
                where: { external_id: external },
                attributes: ['name', 'external_id', 'picture', 'longitude', 'latitude', 'altitude', 'status', 'type', 'id_device', 'description', 'id_microbasin']
            });

            if (!station) {
                return res.status(404).json({ msg: 'Estación no encontrada', code: 404 });
            }

            return res.status(200).json({
                msg: 'OK!',
                code: 200,
                info: station
            });
        } catch (error) {
            console.error('Error al obtener estación:', error);
            return res.status(500).json({ msg: 'Error interno del servidor', code: 500 });
        }
    }

    async create(req, res) {
        const transaction = await models.sequelize.transaction();

        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ msg: "DATOS INCOMPLETOS", code: 400, errors: errors.array() });
            }

            const microbasin = await Microbasin.findOne({ where: { external_id: req.body.id_microcuenca } });

            if (!microbasin) {
                return res.status(400).json({ msg: "La microcuenca especificada no existe", code: 400 });
            }

            const pictureFilename = req.file.filename;

            const data = {
                name: req.body.nombre,
                longitude: req.body.longitud,
                latitude: req.body.latitud,
                altitude: req.body.altitud,
                status: req.body.estado,
                type: req.body.tipo,
                id_device: req.body.id_dispositivo,
                picture: pictureFilename,
                description: req.body.descripcion,
                external_id: uuid.v4(),
                id_microbasin: microbasin.id,
            };

            await Station.create(data, { transaction });
            await transaction.commit();

            return res.status(200).json({ msg: "SE HAN REGISTRADO LOS DATOS CON ÉXITO", code: 200 });

        } catch (error) {
            if (req.file?.path) {
                fs.unlinkSync(path.join(__dirname, '../public/images/estaciones', req.file.filename));
            }

            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }

            return res.status(400).json({
                msg: error.message || "Ha ocurrido un error en el servidor",
                code: 400
            });
        }
    }

    async update(req, res) {
        try {
            const station = await Station.findOne({ where: { external_id: req.body.external_id } });

            if (!station) {
                return res.status(400).json({ msg: "NO EXISTE EL REGISTRO", code: 400 });
            }

            let previousPicture = station.picture;

            if (req.file) {
                if (previousPicture) {
                    const imagePath = path.join(__dirname, '../public/images/estaciones/', previousPicture);
                    fs.unlink(imagePath, (err) => {
                        if (err) console.log('Error al eliminar la imagen anterior:', err);
                        else console.log("eliminada: " + previousPicture);
                    });
                }
                previousPicture = req.file.filename;
            }

            station.name = req.body.nombre;
            station.status = req.body.estado;
            station.longitude = req.body.longitud;
            station.altitude = req.body.altitud;
            station.latitude = req.body.latitud;
            station.type = req.body.tipo;
            station.description = req.body.descripcion;
            station.id_device = req.body.id_dispositivo;
            station.picture = previousPicture;
            station.external_id = uuid.v4();

            const result = await station.save();

            if (!result) {
                return res.status(400).json({ msg: "NO SE HAN MODIFICADO LOS DATOS, VUELVA A INTENTAR", code: 400 });
            }

            return res.status(200).json({ msg: "SE HAN MODIFICADO LOS DATOS CON ÉXITO", code: 200 });

        } catch (error) {
            console.error("Error en el servidor:", error);
            return res.status(400).json({ msg: "Error en el servidor", error, code: 400 });
        }
    }

    async changeStatus(req, res) {
        try {

            const external_id = req.body.external_id;

            const estacion = await Station.findOne({
                where: { external_id }
            });

            if (!estacion) {
                return res.status(404).json({ msg: "Estación no encontrada", code: 404 });
            }

            estacion.status = req.body.estado;

            await estacion.save();

            return res.status(200).json({
                msg: `Estado actualizado correctamente. Nuevo estado: ${estacion.status}`,
                code: 200,
                info: { external_id, nuevo_estado: estacion.status }
            });

        } catch (error) {
            console.error("Error al cambiar el estado:", error);
            return res.status(500).json({ msg: "Error interno del servidor", code: 500 });
        }
    }

}

module.exports = StationController;
