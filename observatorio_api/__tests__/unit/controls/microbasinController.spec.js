
jest.mock('express-validator', () => ({
    validationResult: jest.fn()
  }));
  const { validationResult } = require('express-validator');
  
  const path                = require('path');
  const fs                  = require('fs');
  const uuid                = require('uuid');
  
  const MicrobasinController = require('../../../controls/MicrobasinController');
  const models               = require('../../../models');
  
  describe('MicrobasinController (unit)', () => {
    let controller, mockReq, mockRes, mockTx;
  
    beforeEach(() => {
      controller = new MicrobasinController();
      mockReq    = { params: {}, body: {}, file: null };
      mockRes    = {
        status: jest.fn().mockReturnThis(),
        json:   jest.fn()
      };
  
      mockTx = { commit: jest.fn(), rollback: jest.fn(), finished: false };
      models.sequelize.transaction = jest.fn().mockResolvedValue(mockTx);
    });
  
    afterEach(() => jest.resetAllMocks());
  
    // listActive
    describe('listActive()', () => {
      it('debe responder con status true', async () => {
        const fake = [{ external_id:'a', status:true }];
        models.microbasin.findAll = jest.fn().mockResolvedValue(fake);
  
        await controller.listActive(mockReq, mockRes);
  
        expect(models.microbasin.findAll).toHaveBeenCalledWith({
          where: { status: true },
          attributes: ['external_id','status','picture','name','description']
        });
        expect(mockRes.json).toHaveBeenCalledWith({ msg:'OK!', code:200, info:fake });
      });
  
      it('debe responder 500 si falla la query', async () => {
        const err = new Error('boom');
        models.microbasin.findAll = jest.fn().mockRejectedValue(err);
  
        await controller.listActive(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg: 'Error al listar microcuencas: ' + err.message,
          code: 500,
          info: err
        });
      });
    });
  
    // listInactive
    describe('listInactive()', () => {
      it('debe filtrar status false', async () => {
        const fake = [{ external_id:'b', status:false }];
        models.microbasin.findAll = jest.fn().mockResolvedValue(fake);
  
        await controller.listInactive(mockReq, mockRes);
  
        expect(models.microbasin.findAll).toHaveBeenCalledWith({
          where: { status: false },
          attributes: ['external_id','status','picture','name','description']
        });
        expect(mockRes.json).toHaveBeenCalledWith({ msg:'OK!', code:200, info:fake });
      });
    });
  
    // list (todas)
    describe('list()', () => {
      it('devuelve todas las microcuencas', async () => {
        const fake = [{ external_id:'c' }];
        models.microbasin.findAll = jest.fn().mockResolvedValue(fake);
  
        await controller.list(mockReq, mockRes);
  
        expect(models.microbasin.findAll).toHaveBeenCalledWith({
          attributes: ['external_id','status','picture','name','description']
        });
        expect(mockRes.json).toHaveBeenCalledWith({ msg:'OK!', code:200, info:fake });
      });
    });
  
    // get single
    describe('get()', () => {
      it('400 si no existe', async () => {
        models.microbasin.findOne = jest.fn().mockResolvedValue(null);
        mockReq.params.external = 'x';
  
        await controller.get(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg:'NO EXISTE EL REGISTRO', code:400, info:null
        });
      });
  
      it('200 si existe', async () => {
        const fake = { id:1, name:'M' };
        models.microbasin.findOne = jest.fn().mockResolvedValue(fake);
        mockReq.params.external = 'e1';
  
        await controller.get(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg:'OK!', code:200, info:fake
        });
      });
    });
  
    // getStations
    describe('getStations()', () => {
      it('200 con include de estaciones', async () => {
        const fake = [{ external_id:'mb1', station: [] }];
        models.microbasin.findAll = jest.fn().mockResolvedValue(fake);
  
        await controller.getStations(mockReq, mockRes);
  
        expect(models.microbasin.findAll).toHaveBeenCalledWith({
          include: [{
            model: models.station, as: 'station',
            attributes: [
              'name','external_id','picture',
              'longitude','latitude','altitude',
              'status','type','id_device','description'
            ]
          }]
        });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ msg:'OK!', code:200, info:fake });
      });
  
      it('400 si results es falsy', async () => {
        models.microbasin.findAll = jest.fn().mockResolvedValue(null);
  
        await controller.getStations(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg:'NO EXISTE LA MICROCUENCA', code:400, info:null
        });
      });
    });
  
    // getWithStations
    describe('getWithStations()', () => {
      it('200 con atributos y include', async () => {
        const fake = [{ name:'mb', station: [] }];
        models.microbasin.findAll = jest.fn().mockResolvedValue(fake);
  
        await controller.getWithStations(mockReq, mockRes);
  
        expect(models.microbasin.findAll).toHaveBeenCalledWith({
          attributes: ['name','description','picture','status'],
          include: [{
            model: models.station, as: 'station',
            attributes: [
              'name','external_id','picture',
              'longitude','latitude','altitude',
              'status','type','id_device','description'
            ]
          }]
        });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ msg:'OK!', code:200, info:fake });
      });
    });
  
    // create
    describe('create()', () => {
      it('400 si validationResult no está vacío', async () => {
        validationResult.mockReturnValueOnce({
          isEmpty: () => false,
          array: () => [{ msg:'err' }]
        });
  
        await controller.create(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg:"DATOS INCOMPLETOS", code:400, errors:[{ msg:'err' }]
        });
      });
  
      it('200 y commit en ruta feliz', async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        mockReq.file = { filename:'pic.png' };
        mockReq.body = { nombre:'N', descripcion:'D' };
        models.microbasin.create = jest.fn().mockResolvedValue({});
  
        await controller.create(mockReq, mockRes);
  
        expect(models.microbasin.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name:'N', picture:'pic.png', description:'D'
          }), { transaction: mockTx }
        );
        expect(mockTx.commit).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg:"SE HA REGISTRADO MICROCUENCA CON ÉXITO", code:200
        });
      });
  
      it('rollback y unlinkSync si falla', async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        mockReq.file = { filename:'tmp.png', path:'/tmp/tmp.png' };
        mockReq.body = { nombre:'N', descripcion:'D' };
        const err = new Error('fail');
        models.microbasin.create = jest.fn().mockRejectedValue(err);
        fs.unlinkSync = jest.fn();
  
        await controller.create(mockReq, mockRes);
  
        expect(fs.unlinkSync).toHaveBeenCalledWith(
          expect.stringMatching(/public[\/\\]images[\/\\]microcuencas[\/\\]tmp\.png$/)
        );
        expect(mockTx.rollback).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg: err.message, code:400
        });
      });
    });
  
    // update
    describe('update()', () => {
      it('400 si no encuentra existente', async () => {
        models.microbasin.findOne = jest.fn().mockResolvedValue(null);
  
        await controller.update(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg:"NO EXISTE EL REGISTRO", code:400
        });
      });
  
      it('200 ruta feliz con archivo nuevo', async () => {
        const fake = { picture:'old.png', save: jest.fn().mockResolvedValue(true) };
        models.microbasin.findOne = jest.fn().mockResolvedValue(fake);
        mockReq.file = { filename:'new.png' };
        mockReq.body = { external_id:'e', nombre:'X', estado:false, descripcion:'desc' };
        fs.unlink = jest.fn((p,cb)=>cb(null));
  
        await controller.update(mockReq, mockRes);
  
        expect(fake.save).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg:"SE HAN MODIFICADO LOS DATOS CON ÉXITO", code:200
        });
      });
  
      it('400 si save devuelve falsy', async () => {
        const fake = { picture:'p', save: jest.fn().mockResolvedValue(false) };
        models.microbasin.findOne = jest.fn().mockResolvedValue(fake);
        mockReq.body = { external_id:'e1' };
  
        await controller.update(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg:"NO SE HAN MODIFICADO LOS DATOS, VUELVA A INTENTAR", code:400
        });
      });
    });
  
    // changeStatus
    describe('changeStatus()', () => {
      it('404 si no existe', async () => {
        models.microbasin.findOne = jest.fn().mockResolvedValue(null);
        mockReq.params.external_id = 'z';
  
        await controller.changeStatus(mockReq, mockRes);
  
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg:"Microcuenca no encontrada", code:404
        });
      });
  
      it('200 y toggling de status', async () => {
        const fake = { status:true, save: jest.fn().mockResolvedValue({}) };
        models.microbasin.findOne = jest.fn().mockResolvedValue(fake);
        mockReq.params.external_id = 'id1';
  
        await controller.changeStatus(mockReq, mockRes);
  
        expect(fake.save).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          msg: expect.stringMatching(/Estado actualizado correctamente/),
          code:200,
          info: { external_id:'id1', nuevo_estado: fake.status }
        });
      });
    });
  
  });
  