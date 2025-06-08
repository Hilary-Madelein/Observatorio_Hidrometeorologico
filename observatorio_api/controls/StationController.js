'use strict';
const { validationResult } = require('express-validator');
const { ValidationError, UniqueConstraintError } = require('sequelize');
const models = require('../models');
const path = require('path');
const uuid = require('uuid');
const fs = require('fs');
const { sequelize } = require('../models');
const mqttClient = require('../routes/mqtt');
const topicTemplate = process.env.TTN_TOPIC_TEMPLATE;
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

    async listActive(req, res) {
        try {
            const results = await Station.findAll({
                where: { status: 'OPERATIVA' },
                attributes: ['name', 'external_id', 'picture', 'longitude', 'latitude', 'altitude', 'status', 'type', 'id_device'],
            });
            res.json({ msg: 'OK!', code: 200, info: results });
        } catch (error) {
            res.status(500).json({ msg: 'Error al listar estaciones operativas: ' + error.message, code: 500, info: error });
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
                attributes: [
                    'name',
                    'external_id',
                    'picture',
                    'longitude',
                    'latitude',
                    'altitude',
                    'status',
                    'type',
                    'id_device',
                    'description'
                ]
            });
    
            return res.status(200).json({
                msg: 'OK!',
                code: 200,
                info: {
                    microcuenca: microbasin.name,
                    estaciones: estaciones
                }
            });
    
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
        const transaction = await sequelize.transaction();

        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    msg: "DATOS INCOMPLETOS",
                    code: 400,
                    errors: errors.array()
                });
            }

            const microbasin = await Microbasin.findOne({
                where: { external_id: req.body.id_microcuenca }
            });
            if (!microbasin) {
                return res.status(400).json({
                    msg: "La microcuenca especificada no existe",
                    code: 400
                });
            }

            const dup = await Station.findOne({ where: { name: req.body.nombre } });
            if (dup) {
                return res.status(400).json({
                    msg: "Ya existe una estación con ese nombre",
                    code: 400
                });
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

            const station = await Station.create(data, { transaction });

            if (!mqttClient.connected) {
                throw new Error('No hay conexión con el servidor MQTT');
            }

            const topic = topicTemplate.replace('{id}', station.id_device);
            try {
                await new Promise((resolve, reject) => {
                    mqttClient.subscribe(topic, err => {
                        if (err) reject(err);
                        else resolve();                        
                    });
                });
            } catch (err) {
                await transaction.rollback();
                fs.unlinkSync(path.join(__dirname, '../public/images/estaciones', pictureFilename));
                return res.status(500).json({
                    msg: "No se pudo suscribir al tópico MQTT. Intenta de nuevo más tarde.",
                    code: 500
                });
            }

            await transaction.commit();
            return res.status(200).json({
                msg: "SE HAN REGISTRADO LOS DATOS CON ÉXITO",
                code: 200
            });

        } catch (error) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            if (req.file?.path) {
                fs.unlinkSync(path.join(__dirname, '../public/images/estaciones', req.file.filename));
            }

            if (error instanceof UniqueConstraintError) {
                return res.status(400).json({
                    msg: 'Ya existe un registro duplicado',
                    code: 400,
                    errors: error.errors.map(e => e.message)
                });
            }
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    msg: 'Error de validación',
                    code: 400,
                    errors: error.errors.map(e => e.message)
                });
            }

            return res.status(500).json({
                msg: error.message || "Error interno del servidor",
                code: 500
            });
        }
    }

    async update(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                await transaction.rollback();
                return res.status(400).json({
                    msg: "DATOS INCOMPLETOS",
                    code: 400,
                    errors: errors.array()
                });
            }

            const station = await Station.findOne({
                where: { external_id: req.body.external_id },
                transaction
            });
            if (!station) {
                await transaction.rollback();
                return res.status(400).json({
                    msg: "NO EXISTE EL REGISTRO",
                    code: 400
                });
            }

            if (req.body.nombre && req.body.nombre !== station.name) {
                const dupName = await Station.findOne({
                    where: { name: req.body.nombre },
                    transaction
                });
                if (dupName) {
                    await transaction.rollback();
                    return res.status(400).json({
                        msg: "Ya existe una estación con ese nombre",
                        code: 400
                    });
                }
            }

            const oldDevice = station.id_device;
            if (req.body.id_dispositivo && req.body.id_dispositivo !== oldDevice) {
                const dupDevice = await Station.findOne({
                    where: { id_device: req.body.id_dispositivo },
                    transaction
                });
                if (dupDevice) {
                    await transaction.rollback();
                    return res.status(400).json({
                        msg: "Ya existe una estación con ese dispositivo",
                        code: 400
                    });
                }
            }

            let newPicture = station.picture;
            if (req.file) {
                if (station.picture) {
                    const oldPath = path.join(__dirname, '../public/images/estaciones/', station.picture);
                    fs.unlink(oldPath, err => {
                        if (err) console.warn('No se pudo borrar imagen antigua:', err);
                    });
                }
                newPicture = req.file.filename;
            }

            station.name = req.body.nombre;
            station.longitude = req.body.longitud;
            station.latitude = req.body.latitud;
            station.altitude = req.body.altitud;
            station.type = req.body.tipo;
            station.description = req.body.descripcion;
            station.id_device = req.body.id_dispositivo;
            station.picture = newPicture;
            station.external_id = uuid.v4();

            const updated = await station.save({ transaction });
            if (!updated) {
                throw new Error('No se lograron aplicar los cambios');
            }

            if (req.body.id_dispositivo && req.body.id_dispositivo !== oldDevice) {
                if (!mqttClient.connected) {
                    throw new Error('No hay conexión con el servidor MQTT');
                }
                const topic = topicTemplate.replace('{id}', updated.id_device);
                await new Promise((resolve, reject) => {
                    mqttClient.subscribe(topic, err => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            await transaction.commit();
            return res.status(200).json({
                msg: "SE HAN MODIFICADO LOS DATOS CON ÉXITO",
                code: 200
            });

        } catch (error) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            if (req.file?.path) {
                fs.unlinkSync(path.join(__dirname, '../public/images/estaciones', req.file.filename));
            }

            if (error instanceof UniqueConstraintError) {
                return res.status(400).json({
                    msg: 'Datos duplicados',
                    code: 400,
                    errors: error.errors.map(e => e.message)
                });
            }
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    msg: 'Error de validación',
                    code: 400,
                    errors: error.errors.map(e => e.message)
                });
            }

            return res.status(500).json({
                msg: error.message || "Error interno del servidor",
                code: 500
            });
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
    
            const estadoMap = req.body.estado.replace(/ /g, '_');
    
            const validStates = ['OPERATIVA', 'NO_OPERATIVA', 'MANTENIMIENTO'];
            if (!validStates.includes(estadoMap)) {
                return res.status(400).json({ msg: "Estado no válido", code: 400 });
            }
    
            estacion.status = estadoMap;
            await estacion.save();
    
            if (estacion.status === 'NO_OPERATIVA' || estacion.status === 'MANTENIMIENTO') {
                const topic = topicTemplate.replace('{id}', estacion.id_device);
                if (mqttClient.connected) {
                    mqttClient.unsubscribe(topic, (err) => {
                        if (err) {
                            console.error("Error al desuscribirse del tópico:", err);
                        } else {
                            console.log(`Desuscripción exitosa del tópico: ${topic}`);
                        }
                    });
                }
            } else {
                const topic = topicTemplate.replace('{id}', estacion.id_device);
                if (mqttClient.connected) {
                    mqttClient.subscribe(topic, (err) => {
                        if (err) {
                            console.error("Error al suscribirse al tópico:", err);
                        } else {
                            console.log(`Suscripción exitosa al tópico: ${topic}`);
                        }
                    });
                }
            }
    
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
