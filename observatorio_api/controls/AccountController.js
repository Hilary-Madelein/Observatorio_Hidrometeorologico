const models = require('../models');
const Account = models.account;
const Entity = models.entity;

const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
require('dotenv').config();

class AccountController {
    async login(req, res) {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    msg: "FALTAN DATOS",
                    code: 400,
                    errors: errors.array()
                });
            }

            const login = await Account.findOne({
                where: { email: req.body.email },
                include: [{ model: Entity, as: 'entity' }]
            });

            if (!login) {
                return res.status(400).json({ msg: "CUENTA NO ENCONTRADA", code: 400 });
            }

            if (!login.status) {
                return res.status(400).json({ msg: "CUENTA DESACTIVADA", code: 400 });
            }

            const isPasswordValid = bcrypt.compareSync(req.body.password, login.password);

            if (isPasswordValid) {
                const tokenPayload = {
                    external: login.external_id,
                    email: login.email,
                    check: true
                };

                const secretKey = process.env.KEY;
                const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '40min' });

                return res.status(200).json({
                    msg: "Bienvenido " + (login.entity?.name || ''),
                    info: {
                        token: token,
                        user: {
                            correo: login.email,
                            nombres: login.entity?.name || '',
                            apellidos: login.entity?.lastname || '',
                            entidad: login.entity
                        }
                    },
                    code: 200
                });
            } else {
                return res.status(401).json({ msg: "CLAVE INCORRECTA", code: 401 });
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                msg: "Error en el servidor",
                code: 500
            });
        }
    }

    async changePassword(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                msg: "FALTAN DATOS",
                code: 400,
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword, email } = req.body;

        try {
            const account = await Account.findOne({ where: { email: email } });
            if (!account) {
                return res.status(404).json({ msg: "CUENTA NO ENCONTRADA", code: 404 });
            }

            const valid = bcrypt.compareSync(currentPassword, account.password);
            if (!valid) {
                return res.status(401).json({ msg: "CONTRASEÑA ACTUAL INCORRECTA", code: 401 });
            }

            const salt = bcrypt.genSaltSync(10);
            account.password = bcrypt.hashSync(newPassword, salt);
            await account.save();

            return res.status(200).json({ msg: "Contraseña actualizada correctamente", code: 200 });
        } catch (error) {
            console.error("Error cambiando contraseña:", error);
            return res.status(500).json({ msg: "Error en el servidor", code: 500 });
        }
    }

    // GET accounts by name
    async getAccountsByName(req, res) {
        try {
            if (!req.params.fullname) {
                return res.status(400).json({
                    msg: "FALTA EL NOMBRE COMPLETO O PARCIAL EN LA SOLICITUD",
                    code: 400
                });
            }

            const fullname = req.params.fullname.trim();

            const results = await Entity.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.iLike]: `%${fullname}%` } },
                        { lastname: { [Op.iLike]: `%${fullname}%` } }
                    ]
                },
                limit: 10
            });

            if (results.length === 0) {
                return res.status(404).json({
                    msg: "NO SE ENCONTRARON USUARIOS",
                    code: 404
                });
            }

            const data = results.map(entity => ({
                nombres: entity.name,
                apellidos: entity.lastname,
                id: entity.id,
                foto: entity.picture
            }));

            return res.status(200).json({
                msg: "Usuarios Encontrados",
                info: data,
                code: 200
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                msg: "Error en el servidor",
                code: 500
            });
        }
    }
}

module.exports = AccountController;
