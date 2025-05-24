jest.mock('express-validator', () => ({
    validationResult: jest.fn()
  }));
  const { validationResult } = require('express-validator');
  
  jest.mock('bcrypt', () => ({
    compareSync: jest.fn()
  }));
  const bcrypt = require('bcrypt');
  
  jest.mock('jsonwebtoken', () => ({
    sign: jest.fn()
  }));
  const jwt = require('jsonwebtoken');
  
  const AccountController = require('../../../controls/AccountController');
  const models            = require('../../../models');
  const Account           = models.account;
  const Entity            = models.entity;
  
  describe('AccountController (unit) – login()', () => {
    let controller, req, res;
  
    beforeEach(() => {
      controller = new AccountController();
      req = { body: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json:   jest.fn()
      };
      jest.clearAllMocks();
      // Asegurarnos de tener una KEY fija
      process.env.KEY = 'TEST_SECRET';
    });
  
    it('devuelve 400 si faltan datos de validación', async () => {
      validationResult.mockReturnValueOnce({
        isEmpty: () => false,
        array:   () => [{ msg: 'error de validación' }]
      });
  
      await controller.login(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        msg:    'FALTAN DATOS',
        code:   400,
        errors: [{ msg: 'error de validación' }]
      });
    });
  
    it('devuelve 400 cuando la cuenta no existe', async () => {
      validationResult.mockReturnValueOnce({ isEmpty: () => true });
      req.body = { email: 'a@b.com', password: 'x' };
      Account.findOne = jest.fn().mockResolvedValue(null);
  
      await controller.login(req, res);
  
      expect(Account.findOne).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
        include: [{ model: Entity, as: 'entity' }]
      });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ msg: 'CUENTA NO ENCONTRADA', code: 400 });
    });
  
    it('devuelve 400 cuando la cuenta está desactivada', async () => {
      validationResult.mockReturnValueOnce({ isEmpty: () => true });
      req.body = { email: 'e@e.com', password: 'p' };
      Account.findOne = jest.fn().mockResolvedValue({ status: false });
  
      await controller.login(req, res);
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ msg: 'CUENTA DESACTIVADA', code: 400 });
    });
  
    it('devuelve 401 si la clave es incorrecta', async () => {
      validationResult.mockReturnValueOnce({ isEmpty: () => true });
      req.body = { email: 'u@u.com', password: 'wrong' };
      const user = { status: true, password: 'hash', entity: { name: 'N', lastname: 'L' }, external_id: 'ext', email: 'u@u.com' };
      Account.findOne = jest.fn().mockResolvedValue(user);
      bcrypt.compareSync.mockReturnValue(false);
  
      await controller.login(req, res);
  
      expect(bcrypt.compareSync).toHaveBeenCalledWith('wrong', 'hash');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ msg: 'CLAVE INCORRECTA', code: 401 });
    });
  
    it('devuelve 200 y token/info en ruta feliz', async () => {
      validationResult.mockReturnValueOnce({ isEmpty: () => true });
      req.body = { email: 'ok@ok.com', password: 'right' };
      const user = {
        status: true,
        password: 'hash',
        email: 'ok@ok.com',
        external_id: 'ext-id',
        entity: { name: 'Ana', lastname: 'Pérez' }
      };
      Account.findOne = jest.fn().mockResolvedValue(user);
      bcrypt.compareSync.mockReturnValue(true);
      jwt.sign.mockReturnValue('JWT_TOKEN');
  
      await controller.login(req, res);
  
      expect(jwt.sign).toHaveBeenCalledWith(
        { external: 'ext-id', email: 'ok@ok.com', check: true },
        'TEST_SECRET',
        { expiresIn: '12h' }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        msg:  'Bienvenido Ana',
        info: {
          token: 'JWT_TOKEN',
          user: {
            correo:   'ok@ok.com',
            nombres:  'Ana',
            apellidos:'Pérez',
            entidad:  user.entity
          }
        },
        code: 200
      });
    });
  
    it('maneja errores internos devolviendo 500', async () => {
      validationResult.mockReturnValueOnce({ isEmpty: () => true });
      req.body = { email: 'err@err.com', password: 'x' };
      Account.findOne = jest.fn().mockRejectedValue(new Error('DB fallida'));
  
      await controller.login(req, res);
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ msg: 'Error en el servidor', code: 500 });
    });
  });
  