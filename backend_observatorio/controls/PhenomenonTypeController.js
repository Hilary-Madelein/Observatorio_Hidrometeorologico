'use strict';
const { validationResult } = require('express-validator');
const models = require('../models');
const uuid = require('uuid');
const path = require('path');
const fs = require('fs');

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
        const transaction = await models.sequelize.transaction();

        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ msg: "DATOS INCOMPLETOS", code: 400, errors: errors.array() });
            }

            let operations = req.body.operaciones;
            if (typeof operations === 'string') {
                operations = [operations];
            }

            if (!Array.isArray(operations) || operations.length === 0) {
                return res.status(400).json({ msg: "Debe especificar al menos una operación", code: 400 });
            }

            const validOps = ['PROMEDIO', 'MAX', 'MIN', 'SUMA'];
            const invalidOps = operations.filter(op => !validOps.includes(op));
            if (invalidOps.length > 0) {
                return res.status(400).json({ msg: "Operaciones inválidas: " + invalidOps.join(", "), code: 400 });
            }

            const data = {
                name: req.body.nombre,
                icon: req.file.filename,
                unit_measure: req.body.unidad_medida,
                external_id: uuid.v4(),
                status: req.body.estado,
                operations: operations
            };

            await PhenomenonType.create(data, { transaction });
            await transaction.commit();

            return res.status(200).json({ msg: "SE HAN REGISTRADO LOS DATOS CON ÉXITO", code: 200 });

        } catch (error) {
            if (transaction && !transaction.finished) await transaction.rollback();

            if (error.name === 'SequelizeUniqueConstraintError' && error.errors?.[0]?.path === 'name') {
                return res.status(400).json({ msg: "ESTE NOMBRE DE TIPO DE MEDIDA YA SE ENCUENTRA REGISTRADO", code: 400 });
            }

            return res.status(500).json({ msg: error.message || "Ha ocurrido un error en el servidor", code: 500 });
        }
    }

    async update(req, res) {
        try {
            const phenomenon = await PhenomenonType.findOne({
                where: { external_id: req.body.external_id }
            });

            if (!phenomenon) {
                return res.status(400).json({ msg: "NO EXISTE EL REGISTRO", code: 400 });
            }

            let previousIcon = phenomenon.icon;

            if (req.file) {
                if (previousIcon) {
                    const pathToIcon = path.join(__dirname, '../public/images/iconsEstaciones/', previousIcon);
                    fs.unlink(pathToIcon, (err) => {
                        if (err) console.log('Error al eliminar el icono anterior:', err);
                    });
                }
                previousIcon = req.file.filename;
            }

            phenomenon.name = req.body.nombre;
            phenomenon.icon = previousIcon;
            phenomenon.status = req.body.estado;
            phenomenon.unit_measure = req.body.unidad_medida;
            phenomenon.external_id = uuid.v4();

            if (Array.isArray(req.body.operaciones) && req.body.operaciones.length > 0) {
                const validOps = ['PROMEDIO', 'MAX', 'MIN', 'SUMA'];
                const invalidOps = req.body.operaciones.filter(op => !validOps.includes(op));
                if (invalidOps.length > 0) {
                    return res.status(400).json({ msg: "Operaciones inválidas: " + invalidOps.join(", "), code: 400 });
                }
                phenomenon.operations = req.body.operaciones;
            }

            const result = await phenomenon.save();
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