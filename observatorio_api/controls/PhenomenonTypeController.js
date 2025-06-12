'use strict';
const { validationResult } = require('express-validator');
const { ValidationError, UniqueConstraintError } = require('sequelize');
const models = require('../models');
const uuid = require('uuid');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('../models');
const PhenomenonType = models.phenomenon_type;
const TypeOperation = models.type_operation;

class PhenomenonTypeController {

    async list(req, res) {
        try {
            const results = await PhenomenonType.findAll({
                where: { status: true },
                attributes: ['name', 'icon', 'unit_measure', 'external_id', 'status', 'operations']
            });

            const fenomenos = results.map(f => ({
                nombre: f.name,
                icono: f.icon,
                unidad: f.unit_measure,
                external_id: f.external_id,
                estado: f.status,
                operaciones: f.operations || []
            }));

            res.json({ msg: 'OK!', code: 200, info: fenomenos });
        } catch (error) {
            console.error(error);
            res.status(500).json({ msg: 'Error al listar tipos de medida: ' + error.message, code: 500 });
        }
    }

    async listFalse(req, res) {
        try {
            const results = await PhenomenonType.findAll({
                where: { status: false },
                attributes: ['name', 'icon', 'unit_measure', 'external_id', 'status', 'operations']
            });

            const fenomenos = results.map(f => ({
                nombre: f.name,
                icono: f.icon,
                unidad: f.unit_measure,
                external_id: f.external_id,
                estado: f.status,
                operaciones: f.operations || []
            }));

            res.json({ msg: 'OK!', code: 200, info: fenomenos });
        } catch (error) {
            console.error(error);
            res.status(500).json({ msg: 'Error al listar tipos de medida: ' + error.message, code: 500 });
        }
    }

    async get(req, res) {
        const external = req.params.external;

        try {
            const result = await PhenomenonType.findOne({
                where: { external_id: external },
                attributes: ['id', 'name', 'icon', 'unit_measure', 'operations', 'external_id', 'status'],
            });

            if (!result) {
                return res.status(400).json({ msg: 'NO EXISTE EL REGISTRO', code: 400, info: result });
            }

            return res.status(200).json({ msg: 'OK!', code: 200, info: result });

        } catch (error) {
            res.status(500).json({ msg: 'Error al obtener el tipo de medida: ' + error.message, code: 500, info: error });
        }
    }

    async create(req, res) {
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

            const exists = await PhenomenonType.findOne({
                where: { name: req.body.nombre },
                transaction
            });
            if (exists) {
                if (req.file?.path) {
                    fs.unlinkSync(path.join(__dirname, '../public/images/icons_estaciones', req.file.filename));
                }
                await transaction.rollback();
                return res.status(400).json({
                    msg: "Ya existe un tipo de fenómeno con ese nombre",
                    code: 400
                });
            }

            let operations = req.body.operaciones;
            if (typeof operations === 'string') {
                operations = [operations];
            }
            if (!Array.isArray(operations) || operations.length === 0) {
                await transaction.rollback();
                if (req.file?.path) {
                    fs.unlinkSync(path.join(__dirname, '../public/images/icons_estaciones', req.file.filename));
                }
                return res.status(400).json({
                    msg: "Debe especificar al menos una operación",
                    code: 400
                });
            }
            const validOps = ['PROMEDIO', 'MAX', 'MIN', 'SUMA'];
            const invalidOps = operations.filter(op => !validOps.includes(op));
            if (invalidOps.length) {
                await transaction.rollback();
                if (req.file?.path) {
                    fs.unlinkSync(path.join(__dirname, '../public/images/icons_estaciones', req.file.filename));
                }
                return res.status(400).json({
                    msg: "Operaciones inválidas: " + invalidOps.join(", "),
                    code: 400
                });
            }

            const data = {
                name: req.body.nombre,
                icon: req.file.filename,
                unit_measure: req.body.unidad_medida,
                external_id: uuid.v4(),
                status: req.body.estado,
                operations
            };
            await PhenomenonType.create(data, { transaction });

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
                fs.unlinkSync(path.join(__dirname, '../public/images/icons_estaciones', req.file.filename));
            }

            if (error instanceof UniqueConstraintError) {
                return res.status(400).json({
                    msg: "Este nombre de tipo de medida ya se encuentra registrado",
                    code: 400,
                    errors: error.errors.map(e => e.message)
                });
            }
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    msg: "Error de validación",
                    code: 400,
                    errors: error.errors.map(e => e.message)
                });
            }

            return res.status(500).json({
                msg: error.message || "Ha ocurrido un error en el servidor",
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

            const phenomenon = await PhenomenonType.findOne({
                where: { external_id: req.body.external_id },
                transaction
            });
            if (!phenomenon) {
                await transaction.rollback();
                return res.status(400).json({
                    msg: "NO EXISTE EL REGISTRO",
                    code: 400
                });
            }

            if (req.body.nombre && req.body.nombre !== phenomenon.name) {
                const dup = await PhenomenonType.findOne({
                    where: {
                        name: req.body.nombre,
                        external_id: { [Op.ne]: req.body.external_id }
                    },
                    transaction
                });
                if (dup) {
                    await transaction.rollback();
                    if (req.file?.path) {
                        fs.unlinkSync(path.join(__dirname, '../public/images/icons_estaciones', req.file.filename));
                    }
                    return res.status(400).json({
                        msg: "Ya existe un tipo de fenómeno con ese nombre",
                        code: 400
                    });
                }
            }

            let newIcon = phenomenon.icon;
            if (req.file) {
                if (phenomenon.icon) {
                    const oldPath = path.join(__dirname, '../public/images/icons_estaciones', phenomenon.icon);
                    fs.unlink(oldPath, err => {
                        if (err) console.warn('No se pudo borrar icono anterior:', err);
                    });
                }
                newIcon = req.file.filename;
            }

            if (Array.isArray(req.body.operaciones)) {
                const validOps = ['PROMEDIO', 'MAX', 'MIN', 'SUMA'];
                const invalidOps = req.body.operaciones.filter(op => !validOps.includes(op));
                if (invalidOps.length > 0) {
                    await transaction.rollback();
                    if (req.file?.path) {
                        fs.unlinkSync(path.join(__dirname, '../public/images/icons_estaciones', req.file.filename));
                    }
                    return res.status(400).json({
                        msg: "Operaciones inválidas: " + invalidOps.join(", "),
                        code: 400
                    });
                }
                phenomenon.operations = req.body.operaciones;
            }

            phenomenon.name = req.body.nombre;
            phenomenon.icon = newIcon;
            phenomenon.status = req.body.estado;
            phenomenon.unit_measure = req.body.unidad_medida;
            phenomenon.external_id = uuid.v4();

            await phenomenon.save({ transaction });

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
                fs.unlinkSync(path.join(__dirname, '../public/images/icons_estaciones', req.file.filename));
            }

            if (error instanceof UniqueConstraintError) {
                return res.status(400).json({
                    msg: "Datos duplicados",
                    code: 400,
                    errors: error.errors.map(e => e.message)
                });
            }
            if (error instanceof ValidationError) {
                return res.status(400).json({
                    msg: "Error de validación",
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
            const external_id = req.params.external_id;

            const phenomenon = await PhenomenonType.findOne({
                where: { external_id }
            });

            if (!phenomenon) {
                return res.status(404).json({ msg: "Tipo de variable no encontrada", code: 404 });
            }

            phenomenon.status = !phenomenon.status;
            await phenomenon.save();

            return res.status(200).json({
                msg: `Estado actualizado correctamente. Nuevo estado: ${phenomenon.status ? 'ACTIVO' : 'INACTIVO'}`,
                code: 200,
                info: { external_id, nuevo_estado: phenomenon.status }
            });

        } catch (error) {
            console.error("Error al cambiar el estado:", error);
            return res.status(500).json({ msg: "Error interno del servidor", code: 500 });
        }
    }

}

module.exports = PhenomenonTypeController;