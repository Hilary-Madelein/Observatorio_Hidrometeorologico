'use strict';
const { validationResult } = require('express-validator');
const models = require('../models');
const path = require('path');
const uuid = require('uuid');
const fs = require('fs');

const Microbasin = models.microbasin;
const Station = models.station;

class MicrobasinController {

    async listActive(req, res) {
        try {
            const results = await Microbasin.findAll({
                where: { status: true },
                attributes: ['external_id', 'status', 'picture', 'name', 'description'],
            });
            res.json({ msg: 'OK!', code: 200, info: results });
        } catch (error) {
            res.status(500).json({ msg: 'Error al listar microcuencas: ' + error.message, code: 500, info: error });
        }
    }

    async listInactive(req, res) {
        try {
            const results = await Microbasin.findAll({
                where: { status: false },
                attributes: ['external_id', 'status', 'picture', 'name', 'description'],
            });
            res.json({ msg: 'OK!', code: 200, info: results });
        } catch (error) {
            res.status(500).json({ msg: 'Error al listar microcuencas: ' + error.message, code: 500, info: error });
        }
    }

    async list(req, res) {
        try {
            const results = await Microbasin.findAll({
                attributes: ['external_id', 'status', 'picture', 'name', 'description'],
            });

            res.json({ msg: 'OK!', code: 200, info: results });
        } catch (error) {
            res.status(500).json({ msg: 'Error al listar microcuencas: ' + error.message, code: 500, info: error });
        }
    }

    async get(req, res) {
        const external = req.params.external;
        const result = await Microbasin.findOne({
            where: { external_id: external },
            attributes: ['id', 'name', 'external_id', 'picture', 'status', 'description'],
        });

        if (!result) {
            return res.status(400).json({
                msg: 'NO EXISTE EL REGISTRO',
                code: 400,
                info: result
            });
        }

        return res.status(200).json({
            msg: 'OK!',
            code: 200,
            info: result
        });
    }

    async getStations(req, res) {
        try {
            const results = await Microbasin.findAll({
                include: [{
                    model: Station,
                    as: 'station',
                    attributes: ['name', 'external_id', 'picture', 'longitude', 'latitude', 'altitude', 'status', 'type', 'id_device', 'description']
                }]
            });

            if (!results) {
                return res.status(400).json({ msg: 'NO EXISTE LA MICROCUENCA', code: 400, info: null });
            }

            return res.status(200).json({ msg: 'OK!', code: 200, info: results });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: 'ERROR AL OBTENER LOS DATOS', code: 500, error: error.message });
        }
    }

    async getWithStations(req, res) {
        try {
            const results = await Microbasin.findAll({
                attributes: ['name', 'description', 'picture', 'status'],
                include: [{
                    model: Station,
                    as: 'station',
                    attributes: ['name', 'external_id', 'picture', 'longitude', 'latitude', 'altitude', 'status', 'type', 'id_device', 'description']
                }]
            });

            if (!results) {
                return res.status(400).json({ msg: 'NO EXISTE LA MICROCUENCA', code: 400, info: null });
            }

            return res.status(200).json({ msg: 'OK!', code: 200, info: results });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: 'ERROR AL OBTENER LOS DATOS', code: 500, error: error.message });
        }
    }


    async create(req, res) {
        const transaction = await models.sequelize.transaction();

        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    msg: "DATOS INCOMPLETOS",
                    code: 400,
                    errors: errors.array()
                });
            }

            const pictureFilename = req.file.filename;

            const data = {
                name: req.body.nombre,
                picture: pictureFilename,
                description: req.body.descripcion,
                external_id: uuid.v4()
            };

            await Microbasin.create(data, { transaction });
            await transaction.commit();

            return res.status(200).json({ msg: "SE HA REGISTRADO MICROCUENCA CON ÉXITO", code: 200 });

        } catch (error) {
            if (req.file?.path) {
                fs.unlinkSync(path.join(__dirname, '../public/images/microcuencas', req.file.filename));
            }

            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }

            return res.status(400).json({ msg: error.message || "Ha ocurrido un error en el servidor", code: 400 });
        }
    }

    async update(req, res) {
        try {
            const existing = await Microbasin.findOne({ where: { external_id: req.body.external_id } });

            if (!existing) {
                return res.status(400).json({ msg: "NO EXISTE EL REGISTRO", code: 400 });
            }

            let previousPicture = existing.picture;

            if (req.file) {
                if (previousPicture) {
                    const imagePath = path.join(__dirname, '../public/images/microcuencas/', previousPicture);
                    fs.unlink(imagePath, (err) => {
                        if (err) console.log('Error al eliminar la imagen anterior:', err);
                        else console.log("eliminada: " + previousPicture);
                    });
                }
                previousPicture = req.file.filename;
            }

            existing.name = req.body.nombre;
            existing.status = req.body.estado;
            existing.picture = previousPicture;
            existing.description = req.body.descripcion;
            existing.external_id = uuid.v4();

            const result = await existing.save();

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
            const external_id = req.params.external_id;

            const microbasin = await Microbasin.findOne({
                where: { external_id }
            });

            if (!microbasin) {
                return res.status(404).json({ msg: "Microcuenca no encontrada", code: 404 });
            }


            microbasin.status = !microbasin.status;
            await microbasin.save();

            return res.status(200).json({
                msg: `Estado actualizado correctamente. Nuevo estado: ${microbasin.status ? 'ACTIVO' : 'INACTIVO'}`,
                code: 200,
                info: { external_id, nuevo_estado: microbasin.status }
            });

        } catch (error) {
            console.error("Error al cambiar el estado:", error);
            return res.status(500).json({ msg: "Error interno del servidor", code: 500 });
        }
    }
}

module.exports = MicrobasinController;
