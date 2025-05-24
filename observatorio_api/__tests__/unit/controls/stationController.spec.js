jest.mock('express-validator', () => ({
    validationResult: jest.fn()
  }));
  const { validationResult } = require('express-validator');
  
  const path = require('path');
  const fs   = require('fs');
  const uuid = require('uuid');
  
  const StationController = require('../../../controls/StationController');
  const models            = require('../../../models');
  
  describe('StationController (unit)', () => {
    let controller, req, res, mockTx;
  
    beforeEach(() => {
      controller = new StationController();
      req        = { params: {}, body: {}, file: null };
      res        = {
        status: jest.fn().mockReturnThis(),
        json:   jest.fn()
      };
  
      mockTx = { commit: jest.fn(), rollback: jest.fn(), finished: false };
      models.sequelize.transaction = jest.fn().mockResolvedValue(mockTx);
    });
  
    afterEach(() => jest.resetAllMocks());
  
    // list()
    describe('list()', () => {
      it('debe devolver todas las estaciones con los atributos correctos', async () => {
        const fake = [{ name:'S1' }];
        models.station.findAll = jest.fn().mockResolvedValue(fake);
  
        await controller.list(req, res);
  
        expect(models.station.findAll).toHaveBeenCalledWith({
          attributes: [
            'name','external_id','picture',
            'longitude','latitude','altitude',
            'status','type','id_device'
          ]
        });
        expect(res.json).toHaveBeenCalledWith({ msg:'OK!', code:200, info:fake });
      });
  
      it('debe devolver 500 si ocurre un error', async () => {
        const err = new Error('boom');
        models.station.findAll = jest.fn().mockRejectedValue(err);
  
        await controller.list(req, res);
  
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          msg: 'Error al listar estaciones: ' + err.message,
          code: 500,
          info: err
        });
      });
    });

    // getByMicrobasinParam()
    describe('getByMicrobasinParam()', () => {
      it('400 si la microcuenca no existe', async () => {
        models.microbasin.findOne = jest.fn().mockResolvedValue(null);
        req.params.external = 'nope';
  
        await controller.getByMicrobasinParam(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg: "La microcuenca especificada no existe",
          code: 400
        });
      });
  
      it('200 con estaciones filtradas por id_microbasin', async () => {
        const mb    = { id: 42 };
        const list  = [{ name:'X' }];
        models.microbasin.findOne = jest.fn().mockResolvedValue(mb);
        models.station.findAll   = jest.fn().mockResolvedValue(list);
        req.params.external = 'mb-ext';
  
        await controller.getByMicrobasinParam(req, res);
  
        expect(models.station.findAll).toHaveBeenCalledWith({
          where: { id_microbasin: mb.id },
          attributes: [
            'name','external_id','picture',
            'longitude','latitude','altitude',
            'status','type','id_device','description'
          ]
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg:'OK!', code:200, info:list
        });
      });
    });
  
    // getByMicrobasinBody()
    describe('getByMicrobasinBody()', () => {
      it('400 si falta req.body.external', async () => {
        req.body = {};
        await controller.getByMicrobasinBody(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg:'Falta informacion de la microcuenca',
          code:400
        });
      });
  
      it('404 si la microcuenca no se encuentra', async () => {
        req.body.external = 'nope';
        models.microbasin.findOne = jest.fn().mockResolvedValue(null);
  
        await controller.getByMicrobasinBody(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          msg:'Microcuenca no encontrada',
          code:404
        });
      });
  
      it('200 con nombre de microcuenca e info de estaciones', async () => {
        const mb    = { id: 7, name: 'MC1' };
        const list  = [{ name:'Y' }];
        models.microbasin.findOne = jest.fn().mockResolvedValue(mb);
        models.station.findAll   = jest.fn().mockResolvedValue(list);
        req.body.external = 'mb-ext';
  
        await controller.getByMicrobasinBody(req, res);
        expect(models.station.findAll).toHaveBeenCalledWith({
          where: { id_microbasin: mb.id, status: "OPERATIVA" },
          attributes: [
            'name','external_id','picture',
            'longitude','latitude','altitude',
            'status','type','id_device','description'
          ]
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg:'OK!', code:200,
          microcuenca_nombre: mb.name,
          info: list
        });
      });
    });
  
    // getByExternal()
    describe('getByExternal()', () => {
      it('404 si no existe la estación', async () => {
        models.station.findOne = jest.fn().mockResolvedValue(null);
        req.params.external_id = 'bad';
  
        await controller.getByExternal(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          msg:'Estación no encontrada',
          code:404
        });
      });
  
      it('200 con datos de estación', async () => {
        const st = { external_id:'e1', name:'S' };
        models.station.findOne = jest.fn().mockResolvedValue(st);
        req.params.external_id = 'e1';
  
        await controller.getByExternal(req, res);
        expect(models.station.findOne).toHaveBeenCalledWith({
          where: { external_id: 'e1' },
          attributes: [
            'name','external_id','picture',
            'longitude','latitude','altitude',
            'status','type','id_device',
            'description','id_microbasin'
          ]
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg:'OK!', code:200, info:st
        });
      });
    });
  
    // create()
    describe('create()', () => {
      it('400 si validationResult falla', async () => {
        validationResult.mockReturnValueOnce({
          isEmpty: () => false,
          array: () => [{ msg:'err' }]
        });
  
        await controller.create(req, res);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg:"DATOS INCOMPLETOS", code:400, errors:[{msg:'err'}]
        });
      });
  
      it('400 si microcuenca no existe', async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        models.microbasin.findOne = jest.fn().mockResolvedValue(null);
  
        await controller.create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg:"La microcuenca especificada no existe", code:400
        });
      });
  
      it('200 y commit en ruta feliz', async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        const mb = { id: 99 };
        models.microbasin.findOne = jest.fn().mockResolvedValue(mb);
        models.station.create   = jest.fn().mockResolvedValue({});
        req.file = { filename:'st.png' };
        req.body = {
          nombre:'A', longitud:1, latitud:2, altitud:3,
          estado:'OPERATIVA', tipo:'T', id_dispositivo:'D',
          descripcion:'desc', id_microcuenca:'mb-ext'
        };
  
        await controller.create(req, res);
        expect(models.station.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name:'A', longitude:1, latitude:2, altitude:3,
            status:'OPERATIVA', type:'T', id_device:'D',
            picture:'st.png', description:'desc',
            id_microbasin: mb.id
          }),
          { transaction: mockTx }
        );
        expect(mockTx.commit).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg:"SE HAN REGISTRADO LOS DATOS CON ÉXITO", code:200
        });
      });
  
      it('rollback y unlinkSync si falla', async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        models.microbasin.findOne = jest.fn().mockResolvedValue({ id:1 });
        const err = new Error('oops');
        models.station.create = jest.fn().mockRejectedValue(err);
        fs.unlinkSync = jest.fn();
        req.file = { filename:'tmp.png', path:'/tmp/tmp.png' };
        req.body = { id_microcuenca:'mb' };
  
        await controller.create(req, res);
        expect(fs.unlinkSync).toHaveBeenCalledWith(
          expect.stringMatching(/public[\/\\]images[\/\\]estaciones[\/\\]tmp\.png$/)
        );
        expect(mockTx.rollback).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg: err.message, code:400
        });
      });
    });
  
    // update()
    describe('update()', () => {
      it('400 si no existe la estación', async () => {
        models.station.findOne = jest.fn().mockResolvedValue(null);
  
        await controller.update(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg:"NO EXISTE EL REGISTRO", code:400
        });
      });
  
      it('200 ruta feliz con file nuevo', async () => {
        const fake = { picture:'old.png', save: jest.fn().mockResolvedValue(true) };
        models.station.findOne = jest.fn().mockResolvedValue(fake);
        fs.unlink = jest.fn((p,cb)=>cb(null));
  
        req.file = { filename:'new.png' };
        req.body = {
          external_id:'e', nombre:'N', estado:'X',
          longitud:0, latitud:0, altitud:0,
          tipo:'T', id_dispositivo:'D', descripcion:'D2'
        };
  
        await controller.update(req, res);
        expect(fake.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg:"SE HAN MODIFICADO LOS DATOS CON ÉXITO", code:200
        });
      });
  
      it('400 si save devuelve falsy', async () => {
        const fake = { save: jest.fn().mockResolvedValue(false) };
        models.station.findOne = jest.fn().mockResolvedValue(fake);
  
        await controller.update(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          msg:"NO SE HAN MODIFICADO LOS DATOS, VUELVA A INTENTAR", code:400
        });
      });
    });
  
    // changeStatus()
    describe('changeStatus()', () => {
      it('404 si estación no existe', async () => {
        models.station.findOne = jest.fn().mockResolvedValue(null);
        req.body.external_id = 'x';
  
        await controller.changeStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          msg:"Estación no encontrada", code:404
        });
      });
  
      it('200 y actualiza estado directamente', async () => {
        const fake = { status:'X', save: jest.fn().mockResolvedValue({}) };
        models.station.findOne = jest.fn().mockResolvedValue(fake);
        req.body = { external_id:'e1', estado:'NEW' };
  
        await controller.changeStatus(req, res);
        // status mutado dentro del método
        expect(fake.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          msg: `Estado actualizado correctamente. Nuevo estado: ${fake.status}`,
          code:200,
          info: { external_id:'e1', nuevo_estado: fake.status }
        });
      });
  
    });
  
  });
  