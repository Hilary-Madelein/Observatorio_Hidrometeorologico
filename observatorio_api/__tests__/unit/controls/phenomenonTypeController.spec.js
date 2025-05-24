jest.mock('express-validator', () => ({
    validationResult: jest.fn()
  }));
  const { validationResult } = require('express-validator');
  
  const path   = require('path');
  const fs     = require('fs');
  const uuid   = require('uuid');
  
  const PhenomenonTypeController = require('../../../controls/PhenomenonTypeController');
  const models                    = require('../../../models');
  
  describe('PhenomenonTypeController (unit)', () => {
    let controller, req, res, tx;
  
    beforeEach(() => {
      controller = new PhenomenonTypeController();
      req        = { params: {}, body: {}, file: null };
      res        = {
        status: jest.fn().mockReturnThis(),
        json:   jest.fn()
      };
      // stub de transacción
      tx = { commit: jest.fn(), rollback: jest.fn(), finished: false };
      models.sequelize.transaction = jest.fn().mockResolvedValue(tx);
    });
  
    afterEach(() => jest.resetAllMocks());
  
    // list()
    describe('list()', () => {
      it('mapea y devuelve sólo status=true', async () => {
        const dbRow = {
          name: 'T1', icon: 'icon.png',
          unit_measure: 'u', external_id: 'e1',
          status: true, operations: ['PROMEDIO']
        };
        models.phenomenon_type.findAll = jest.fn().mockResolvedValue([ dbRow ]);
  
        await controller.list(req, res);
  
        expect(models.phenomenon_type.findAll).toHaveBeenCalledWith({
          where: { status: true },
          attributes: ['name','icon','unit_measure','external_id','status','operations']
        });
        expect(res.json).toHaveBeenCalledWith({
          msg: 'OK!', code: 200, info: [{
            nombre: dbRow.name,
            icono: dbRow.icon,
            unidad: dbRow.unit_measure,
            external_id: dbRow.external_id,
            estado: dbRow.status,
            operaciones: dbRow.operations
          }]
        });
      });
  
      it('500 si la consulta lanza error', async () => {
        const err = new Error('boom');
        models.phenomenon_type.findAll = jest.fn().mockRejectedValue(err);
  
        await controller.list(req, res);
  
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'Error al listar tipos de medida: ' + err.message,
          code: 500
        });
      });
    });
  
    // listFalse()
    describe('listFalse()', () => {
      it('filtra status=false y mapea igual que list()', async () => {
        const dbRow = { name:'T2', icon:'i2', unit_measure:'u2', external_id:'e2', status:false, operations: [] };
        models.phenomenon_type.findAll = jest.fn().mockResolvedValue([ dbRow ]);
  
        await controller.listFalse(req, res);
  
        expect(models.phenomenon_type.findAll).toHaveBeenCalledWith({
          where: { status: false },
          attributes: ['name','icon','unit_measure','external_id','status','operations']
        });
        expect(res.json).toHaveBeenCalledWith({
          msg: 'OK!', code: 200, info: [{
            nombre: dbRow.name,
            icono: dbRow.icon,
            unidad: dbRow.unit_measure,
            external_id: dbRow.external_id,
            estado: dbRow.status,
            operaciones: []
          }]
        });
      });
    });
  
    // get()
    describe('get()', () => {
      it('400 si no encuentra', async () => {
        models.phenomenon_type.findOne = jest.fn().mockResolvedValue(null);
        req.params.external = 'nope';
  
        await controller.get(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'NO EXISTE EL REGISTRO',
          code: 400,
          info: null
        });
      });
  
      it('200 si encuentra', async () => {
        const dbRow = { id:1, name:'T3', icon:'i3', unit_measure:'u3', operations:['MAX'], external_id:'e3', status:true };
        models.phenomenon_type.findOne = jest.fn().mockResolvedValue(dbRow);
        req.params.external = 'e3';
  
        await controller.get(req, res);
  
        expect(models.phenomenon_type.findOne).toHaveBeenCalledWith({
          where: { external_id: 'e3' },
          attributes: ['id','name','icon','unit_measure','operations','external_id','status']
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'OK!', code: 200, info: dbRow
        });
      });
    });
  
    // create()
    describe('create()', () => {
      it('400 si validation falla', async () => {
        validationResult.mockReturnValueOnce({
          isEmpty: () => false,
          array: () => [{ msg:'err' }]
        });
  
        await controller.create(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'DATOS INCOMPLETOS',
          code: 400,
          errors: [{ msg:'err' }]
        });
      });
  
      it('400 si no hay operaciones', async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        req.body = { nombre:'N', unidad_medida:'u', estado:true };
        // req.body.operaciones undefined
  
        await controller.create(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'Debe especificar al menos una operación',
          code: 400
        });
      });
  
      it('400 si operaciones inválidas', async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        req.body = {
          nombre:'N', unidad_medida:'u', estado:true,
          operaciones: ['BAD','MAX']
        };
  
        await controller.create(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'Operaciones inválidas: BAD',
          code: 400
        });
      });
  
      it('200 y commit cuando todo es válido', async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        req.body = {
          nombre:'N', unidad_medida:'u', estado:false,
          operaciones: 'MIN'
        };
        req.file = { filename: 'icon.png' };
        models.phenomenon_type.create = jest.fn().mockResolvedValue({});
  
        await controller.create(req, res);
  
        // operaciones string => [ 'MIN' ]
        expect(models.phenomenon_type.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'N',
            icon: 'icon.png',
            unit_measure: 'u',
            status: false,
            operations: ['MIN'],
            external_id: expect.any(String)
          }),
          { transaction: tx }
        );
        expect(tx.commit).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'SE HAN REGISTRADO LOS DATOS CON ÉXITO',
          code: 200
        });
      });
  
      it('rollback si create lanza error único en name', async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });

        req.body = {
          nombre:         'TestName',
          unidad_medida:  'u',
          estado:         true,
          operaciones:    ['PROMEDIO']
        };
        req.file = { filename: 'icon.png', path: '/tmp/icon.png' };
 
        const err = new Error('dup');
        err.name   = 'SequelizeUniqueConstraintError';
        err.errors = [{ path: 'name' }];
        models.phenomenon_type.create = jest.fn().mockRejectedValue(err);
  
        await controller.create(req, res);
  
        // 5) Assertions
        expect(tx.rollback).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg:  'ESTE NOMBRE DE TIPO DE MEDIDA YA SE ENCUENTRA REGISTRADO',
          code: 400
        });
      });
    });
  
    // update()
    describe('update()', () => {
      it('400 si no existe el registro', async () => {
        models.phenomenon_type.findOne = jest.fn().mockResolvedValue(null);
        req.body.external_id = 'x';
  
        await controller.update(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'NO EXISTE EL REGISTRO',
          code: 400
        });
      });
  
      it('400 si operaciones inválidas en body', async () => {
        const ph = { icon:'old.png' };
        models.phenomenon_type.findOne = jest.fn().mockResolvedValue(ph);
        req.body = {
          external_id:'e1',
          operaciones: ['BAD']
        };
  
        await controller.update(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'Operaciones inválidas: BAD',
          code: 400
        });
      });
  
      it('200 ruta feliz sin operaciones nuevas', async () => {
        const ph = { 
          icon:'old.png', 
          save: jest.fn().mockResolvedValue(true)
        };
        models.phenomenon_type.findOne = jest.fn().mockResolvedValue(ph);
        req.body = {
          external_id:'e1',
          nombre:'X', unidad_medida:'u', estado:true
        };
  
        await controller.update(req, res);
  
        expect(ph.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'SE HAN MODIFICADO LOS DATOS CON ÉXITO',
          code: 200
        });
      });
    });
  
    // changeStatus()
    describe('changeStatus()', () => {
      it('404 si no encuentra', async () => {
        models.phenomenon_type.findOne = jest.fn().mockResolvedValue(null);
        req.params.external_id = 'z';
  
        await controller.changeStatus(req, res);
  
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'Tipo de variable no encontrada',
          code: 404
        });
      });
  
      it('200 y toggles status', async () => {
        const ph = { status: false, save: jest.fn().mockResolvedValue({}) };
        models.phenomenon_type.findOne = jest.fn().mockResolvedValue(ph);
        req.params.external_id = 'e2';
  
        await controller.changeStatus(req, res);
  
        expect(ph.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg: expect.stringMatching(/Estado actualizado correctamente/),
          code: 200,
          info: { external_id: 'e2', nuevo_estado: ph.status }
        });
      });
    });
  
  });
  