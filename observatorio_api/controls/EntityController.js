'use strict';
const { validationResult } = require('express-validator');
const models = require('../models');
const Entity = models.entity;
const Account = models.account;
const bcrypt = require('bcrypt');
const path = require('path');
const uuid = require('uuid');
const fs = require('fs');

class EntityController {

    async list(req, res) {
        try {
            const { estadoCuenta } = req.query;
            const accountWhere = estadoCuenta
                ? { status: estadoCuenta }
                : {};

            const results = await Entity.findAll({
                attributes: ['lastname', 'name', 'external_id', 'picture', 'phone', 'status'],
                include: [
                    {
                        model: Account,
                        as: 'account',
                        attributes: ['email', 'status'],
                        where: accountWhere,
                        required: !!estadoCuenta
                    },
                ],
            });
            res.json({ msg: 'OK!', code: 200, info: results });
        } catch (error) {
            res.status(500).json({ msg: 'Error al listar personas: ' + error.message, code: 500, info: error });
        }
    }


    async get(req, res) {
        try {
            const external = req.params.external;
            const result = await Entity.findOne({
                where: { external_id: external },
                attributes: ['id', 'external_id', 'name', 'lastname', 'phone', 'status', 'picture'],
                include: [
                    {
                        model: Account,
                        as: 'account',
                        attributes: ['email', 'status']
                    }
                ]
            });

            if (!result) {
                return res.status(404).json({
                    msg: 'NO EXISTE EL REGISTRO',
                    code: 404
                });
            }

            return res.status(200).json({
                msg: 'OK!',
                code: 200,
                info: result
            });
        } catch (error) {
            console.error('Error en get entidad:', error);
            return res.status(500).json({
                msg: 'Error en el servidor',
                code: 500,
                error: error.message
            });
        }
    }


    async create(req, res) {
        const transaction = await models.sequelize.transaction();
        const saltRounds = 10;

        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    msg: "DATOS INCOMPLETOS",
                    code: 400,
                    errors: errors.array()
                });
            }
            if (!req.body.rol) {
                return res.status(400).json({ msg: "FALTA ESPECIFICAR EL ROL", code: 400 });
            }
            if (!req.body.clave) {
                return res.status(400).json({ msg: "FALTA INGRESAR LA CLAVE", code: 400 });
            }
            const existingAccount = await Account.findOne({ where: { email: req.body.correo } });
            if (existingAccount) {
                return res.status(400).json({ msg: "ESTE CORREO YA ESTÁ REGISTRADO", code: 400 });
            }

            const hashPassword = password => {
                const salt = bcrypt.genSaltSync(saltRounds);
                return bcrypt.hashSync(password, salt);
            };

            const pictureFilename = req.file ? req.file.filename : 'USUARIO_ICONO.png';

            const data = {
                name: req.body.nombres,
                lastname: req.body.apellidos,
                phone: req.body.telefono,
                picture: pictureFilename,
                role: req.body.rol,
                external_id: uuid.v4(),
                account: {
                    email: req.body.correo,
                    password: hashPassword(req.body.clave)
                }
            };

            await Entity.create(data, {
                include: [{ model: Account, as: 'account' }],
                transaction
            });
            await transaction.commit();

            return res.status(200).json({ msg: "SE HAN REGISTRADO LOS DATOS CON ÉXITO", code: 200 });

        } catch (error) {
            if (req.file?.path) {
                fs.unlinkSync(path.join(__dirname, '../public/images/users', req.file.filename));
            }
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            if (error.name === 'SequelizeUniqueConstraintError') {
                const field = error.errors[0].path;
                const msg = field === 'email'
                    ? 'ESTE CORREO YA ESTÁ REGISTRADO'
                    : `VALOR DUPLICADO EN CAMPO ${field.toUpperCase()}`;
                return res.status(400).json({ msg, code: 400 });
            }
            console.error('Error en create entidad:', error);
            return res.status(500).json({ msg: 'ERROR EN EL SERVIDOR', code: 500, error: error.message });
        }
    }

    async update(req, res) {
        try {

            const existingEntity = await Entity.findOne({
                where: { external_id: req.body.external_id }
            });

            if (!existingEntity) {
                return res.status(400).json({ msg: "NO EXISTE EL REGISTRO", code: 400 });
            }

            const relatedAccount = await Account.findOne({
                where: { id_entity: existingEntity.id }
            });

            if (!relatedAccount) {
                return res.status(400).json({ msg: "NO SE ENCONTRÓ LA CUENTA ASOCIADA A ESTA ENTIDAD", code: 400 });
            }

            let previousPicture = existingEntity.picture;

            if (req.file) {
                if (previousPicture) {
                    const imagePath = path.join(__dirname, '../public/images/users/', previousPicture);
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.log('Error al eliminar la imagen anterior:', err);
                        } else {
                            console.log("eliminada: " + previousPicture);
                        }
                    });
                }
                previousPicture = req.file.filename;
            }

            existingEntity.name = req.body.nombres;
            existingEntity.lastname = req.body.apellidos;
            existingEntity.status = req.body.estado;
            existingEntity.phone = req.body.telefono;
            relatedAccount.status = req.body.estado;
            existingEntity.picture = previousPicture;
            existingEntity.external_id = uuid.v4();

            const result = await existingEntity.save();
            await relatedAccount.save();

            if (!result) {
                return res.status(400).json({
                    msg: "NO SE HAN MODIFICADO SUS DATOS, VUELVA A INTENTAR",
                    code: 400
                });
            }

            return res.status(200).json({
                msg: "SE HAN MODIFICADO SUS DATOS CON ÉXITO",
                code: 200
            });

        } catch (error) {
            console.error("Error en el servidor:", error);
            return res.status(400).json({
                msg: "Error al editar una persona",
                code: 400,
                error
            });
        }
    }

    async changeAccountStatus(req, res) {
        const { external_id, nuevoEstado } = req.query;
      
        if (!external_id || typeof nuevoEstado === 'undefined') {
          return res.status(400).json({ msg: 'FALTAN DATOS', code: 400 });
        }
      
        try {
          const entidad = await Entity.findOne({ where: { external_id } });
          if (!entidad) {
            return res.status(404).json({ msg: 'Registro de persona no encontrada', code: 404 });
          }
      
          const cuenta = await Account.findOne({ where: { id_entity: entidad.id } });
          if (!cuenta) {
            return res.status(404).json({ msg: 'Cuenta asociada no encontrada', code: 404 });
          }
      
          const estado = ['true', 'ACEPTADO'].includes(String(nuevoEstado).toUpperCase());
          cuenta.status = estado;
      
          await cuenta.save();
          return res.status(200).json({ msg: 'Estado de cuenta actualizado', code: 200 });
        } catch (error) {
          console.error('Error en changeAccountStatus:', error);
          return res.status(500).json({ msg: 'Error en el servidor', code: 500 });
        }
      }
      

}

module.exports = EntityController;
