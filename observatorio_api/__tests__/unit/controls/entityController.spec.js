const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const bcrypt = require('bcrypt');

jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

const { validationResult } = require('express-validator');
const EntityController = require('../../../controls/EntityController');
const models = require('../../../models');

describe('EntityController (unit)', () => {
  let controller, mockReq, mockRes, mockTransaction;

  beforeEach(() => {
    controller = new EntityController();

    mockReq = {
      params: {},
      body: {},
      file: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockTransaction = { commit: jest.fn(), rollback: jest.fn(), finished: false };
    models.sequelize.transaction = jest.fn().mockResolvedValue(mockTransaction);
  });

  afterEach(() => jest.resetAllMocks());


  describe('list()', () => {
    it('debe devolver JSON con OK y datos cuando Entity.findAll resuelve', async () => {
      const fakeData = [{ lastname: 'Pérez', name: 'Ana' }];
      models.entity.findAll = jest.fn().mockResolvedValue(fakeData);

      await controller.list(mockReq, mockRes);

      expect(models.entity.findAll).toHaveBeenCalledWith({
        attributes: ['lastname', 'name', 'external_id', 'picture', 'phone', 'status'],
        include: [{
          model: models.account,
          as: 'account',
          attributes: ['email']
        }]
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'OK!',
        code: 200,
        info: fakeData
      });
    });

    it('debe devolver 500 si findAll lanza un error', async () => {
      const error = new Error('falló la consulta');
      models.entity.findAll = jest.fn().mockRejectedValue(error);

      await controller.list(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'Error al listar personas: ' + error.message,
        code: 500,
        info: error
      });
    });
  });

  describe('get()', () => {
    it('debe devolver 400 si no encuentra la entidad', async () => {
      models.entity.findOne = jest.fn().mockResolvedValue(null);
      mockReq.params.external = 'clave';

      await controller.get(mockReq, mockRes);

      expect(models.entity.findOne).toHaveBeenCalledWith({
        where: { external_id: 'clave' },
        attributes: ['id', 'lastname', 'name', 'external_id', 'phone', 'status', 'picture']
      });
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'NO EXISTE EL REGISTRO',
        code: 400,
        info: null
      });
    });

    it('debe devolver 200 y la entidad si la encuentra', async () => {
      const fake = { id: 1, lastname: 'Pérez', name: 'Ana' };
      models.entity.findOne = jest.fn().mockResolvedValue(fake);
      mockReq.params.external = 'good-key';

      await controller.get(mockReq, mockRes);

      expect(models.entity.findOne).toHaveBeenCalledWith({
        where: { external_id: 'good-key' },
        attributes: ['id', 'lastname', 'name', 'external_id', 'phone', 'status', 'picture']
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: 'OK!',
        code: 200,
        info: fake
      });
    });
  });

  describe('create()', () => {
    it('debe devolver 400 si faltan campos de validación', async () => {

      validationResult.mockReturnValueOnce({
        isEmpty: () => false,
        array: () => [{ msg: 'error' }]
      });

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "DATOS INCOMPLETOS",
        code: 400,
        errors: [{ msg: 'error' }]
      });
    });

    it('debe devolver 400 si falta req.body.clave', async () => {
      validationResult.mockReturnValueOnce({ isEmpty: () => true });
      mockReq.body = { nombres: 'A', apellidos: 'B', correo: 'a@b.com' };

      await controller.create(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "FALTA INGRESAR LA CLAVE",
        code: 400
      });
    });

    it('debe crear la entidad y commitear la transacción', async () => {
      validationResult.mockReturnValueOnce({ isEmpty: () => true });
      mockReq.body = {
        nombres: 'Ana',
        apellidos: 'Perez',
        telefono: '123',
        correo: 'ana@example.com',
        clave: 'secret'
      };

      mockReq.file = null;

      models.entity.create = jest.fn().mockResolvedValue({});

      await controller.create(mockReq, mockRes);

      expect(models.sequelize.transaction).toHaveBeenCalled();
      expect(models.entity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ana',
          lastname: 'Perez',
          phone: '123',
          picture: 'USUARIO_ICONO.png',
          account: expect.objectContaining({ email: 'ana@example.com' })
        }),
        { include: [{ model: models.account, as: "account" }], transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "SE HAN REGISTRADO LOS DATOS CON ÉXITO",
        code: 200
      });
    });

    it('debe hacer rollback y borrar archivo si falla', async () => {
      validationResult.mockReturnValueOnce({ isEmpty: () => true });
      mockReq.file = { filename: 'tmp.png', path: '/tmp/tmp.png' };
      mockReq.body = { nombres: 'A', apellidos: 'B', telefono: '1', correo: 'a@b.com', clave: 'x' };

      const err = new Error('oops');
      models.entity.create = jest.fn().mockRejectedValue(err);
      fs.unlinkSync = jest.fn();

      await controller.create(mockReq, mockRes);

      expect.stringMatching(/public[\/\\]images[\/\\]users[\/\\]tmp\.png$/)
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: err.message,
        code: 400
      });
    });
  });

  describe('update()', () => {
    it('debe devolver 400 si no existe la entidad', async () => {
      models.entity.findOne = jest.fn().mockResolvedValue(null);
      mockReq.body.external_id = 'nope';

      await controller.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "NO EXISTE EL REGISTRO",
        code: 400
      });
    });

    it('debe devolver 400 si no hay cuenta asociada', async () => {
      models.entity.findOne = jest.fn().mockResolvedValue({ id: 1 });
      models.account.findOne = jest.fn().mockResolvedValue(null);
      mockReq.body.external_id = 'id';

      await controller.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "NO SE ENCONTRÓ LA CUENTA ASOCIADA A ESTA ENTIDAD",
        code: 400
      });
    });

    it('debe actualizar y devolver 200', async () => {
      const fakeEntity = { id: 1, save: jest.fn().mockResolvedValue(true), picture: 'old.png' };
      const fakeAccount = { save: jest.fn().mockResolvedValue(true) };

      models.entity.findOne = jest.fn().mockResolvedValue(fakeEntity);
      models.account.findOne = jest.fn().mockResolvedValue(fakeAccount);

      mockReq.file = { filename: 'new.png' };
      mockReq.body = {
        external_id: 'old-id',
        nombres: 'X', apellidos: 'Y',
        estado: true, telefono: '99'
      };
      fs.unlink = jest.fn((p, cb) => cb(null));

      await controller.update(mockReq, mockRes);

      expect(fakeEntity.save).toHaveBeenCalled();
      expect(fakeAccount.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "SE HAN MODIFICADO SUS DATOS CON ÉXITO",
        code: 200
      });
    });

    it('debe devolver 400 si save falla', async () => {
      const fakeEntity = { id: 1, save: jest.fn().mockResolvedValue(false), picture: 'pic.png' };
      const fakeAccount = { save: jest.fn() };

      models.entity.findOne = jest.fn().mockResolvedValue(fakeEntity);
      models.account.findOne = jest.fn().mockResolvedValue(fakeAccount);
      mockReq.body.external_id = 'id';
      mockReq.file = null;

      await controller.update(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        msg: "NO SE HAN MODIFICADO SUS DATOS, VUELVA A INTENTAR",
        code: 400
      });
    });
  });

});
