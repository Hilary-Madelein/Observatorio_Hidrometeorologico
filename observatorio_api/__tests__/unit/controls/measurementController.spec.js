const socket = require('../../../routes/socket');
jest.spyOn(socket, 'getIO').mockReturnValue({ emit: jest.fn() });

const { v4: uuidv4 } = require('uuid');
const MeasurementController = require('../../../controls/MeasurementController');
const { calcularFechas } = require('../../../controls/MeasurementController');
const models = require('../../../models');

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
  console.log.mockRestore();
});

describe('Utilitario calcularFechas()', () => {
  const base = new Date('2025-05-21T12:00:00Z');

  it('lanza si falta escalaDeTiempo', () => {
    expect(() => calcularFechas()).toThrow('Parámetros de fecha insuficientes.');
  });

  it('lanza si escala inválida', () => {
    expect(() => calcularFechas('xxx', null, null, null, null, base))
      .toThrow('Escala de tiempo inválida.');
  });

  it('15min produce intervalo de 15 minutos', () => {
    const { fechaInicio, fechaFin } = calcularFechas('15min', null, null, null, null, base);
    expect(new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()).toBe(15 * 60000);
  });

  it('30min produce intervalo de 30 minutos', () => {
    const { fechaInicio, fechaFin } = calcularFechas('30min', null, null, null, null, base);
    expect(new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()).toBe(30 * 60000);
  });

  it('hora produce intervalo de 1 hora', () => {
    const { fechaInicio, fechaFin } = calcularFechas('hora', null, null, null, null, base);
    expect(new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()).toBe(60 * 60000);
  });

  it('diaria produce todo el día', () => {
    const { fechaInicio, fechaFin } = calcularFechas('diaria', null, null, null, null, base);
    const start = new Date(fechaInicio);
    const end   = new Date(fechaFin);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);

    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });
});


describe('MeasurementController (unit)', () => {
  let controller, req, res;

  beforeEach(() => {
    controller = new MeasurementController();
    req = { body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json:   jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('saveFromTTN()', () => {
    it('400 cuando faltan campos', async () => {
      await controller.saveFromTTN(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ msg:'Datos incompletos', code:400 });
    });

    it('404 si estación no existe', async () => {
      req.body = { fecha:'x', dispositivo:'d', payload:{ a:'1' } };
      models.station.findOne = jest.fn().mockResolvedValue(null);
      await controller.saveFromTTN(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('500 si falla Station.findOne', async () => {
      req.body = { fecha:'x', dispositivo:'d', payload:{ a:'1' } };
      models.station.findOne = jest.fn().mockRejectedValue(new Error('DB fail'));
      await controller.saveFromTTN(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('omite valores no numéricos y anómalos, guarda el resto y emite socket', async () => {
      req.body = {
        fecha: '2025-05-21T00:00:00Z',
        dispositivo: 'dev1',
        payload: { ok:'10', bad:'NaN', big:'2000' }
      };
      const station = { id:1 };
      const phenomenon = { id:2, unit_measure:'U' };
      models.station.findOne = jest.fn().mockResolvedValue(station);
      models.phenomenon_type.findOne = jest.fn().mockResolvedValue(phenomenon);
      models.quantity.create = jest.fn().mockResolvedValue({ id:10 });
      models.measurement.create = jest.fn().mockResolvedValue({});
      const io = socket.getIO();

      await controller.saveFromTTN(req, res);

      expect(models.quantity.create).toHaveBeenCalledTimes(1);
      expect(models.measurement.create).toHaveBeenCalledTimes(1);
      expect(io.emit).toHaveBeenCalledWith('new-measurements', expect.any(Array));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getUltimasMediciones()', () => {
    it('200 en ruta feliz', async () => {
      const rows = [{ tipo_medida:'T', valor:'5', unidad:'U', estacion:'S' }];
      models.sequelize.query = jest.fn().mockResolvedValue([ rows ]);
      await controller.getUltimasMediciones(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        msg:'Últimas mediciones',
        info: [{ tipo_medida:'T', valor:5, unidad:'U', estacion:'S' }]
      }));
    });

    it('500 si falla la consulta', async () => {
      models.sequelize.query = jest.fn().mockRejectedValue(new Error('fail'));
      await controller.getUltimasMediciones(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMedicionesPorTiempo()', () => {
    it('400 para rango inválido', async () => {
      req.query = { rango:'bad' };
      await controller.getMedicionesPorTiempo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    ['15min','30min','hora'].forEach(rango => {
      it(`devuelve datos crudos para rango=${rango}`, async () => {
        req.query = { rango, estacion:'E1' };
        const raw = [{
          periodo: new Date('2025-05-21T00:00:00Z'),
          tipo_medida:'M', variable_icon:'i', unidad:'U', estacion_nombre:'E1', valor:'20'
        }];
        models.sequelize.query = jest.fn().mockResolvedValue(raw);
        await controller.getMedicionesPorTiempo(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          msg: `Datos crudos ${rango}`,
          info: expect.any(Array)
        }));
      });
    });

    it('devuelve series agregadas para rango no crudo', async () => {
      req.query = { rango:'diaria', estacion:null };
      const agg = [{
        periodo: new Date('2025-05-21T00:00:00Z'),
        tipo_medida: 'X',
        variable_icon: 'iX',
        unidad: 'UX',
        estacion_nombre: 'S2',
        promedio: 10,
        maximo: 15,
        minimo: 5,
        suma: 30
      }];
      models.sequelize.query = jest.fn().mockResolvedValue(agg);      
      await controller.getMedicionesPorTiempo(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        msg:'Series horarias agregadas',
        info: expect.arrayContaining([ expect.objectContaining({
          medidas: expect.objectContaining({
            X: expect.objectContaining({ PROMEDIO:10.00, MAX:15, MIN:5, SUMA:30 })
          })
        })])
      }));
    });

    it('500 si ocurre excepción', async () => {
      req.query = { rango:'diaria' };
      models.sequelize.query = jest.fn().mockRejectedValue(new Error('oops'));
      await controller.getMedicionesPorTiempo(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('migrateToDaily()', () => {
    it('sin inserts devuelve migrated 0', async () => {
      models.daily_measurement.findOne = jest.fn().mockResolvedValue(null);
      models.sequelize.query = jest.fn().mockResolvedValue([]);
      models.type_operation.findAll = jest.fn().mockResolvedValue([]);
      const bulk = jest.fn();
      models.daily_measurement.bulkCreate = bulk;
      await controller.migrateToDaily(req, res);
      expect(bulk).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ migrated:0 }));
    });

    it('con inserts llama bulkCreate y devuelve count', async () => {
      models.daily_measurement.findOne = jest.fn().mockResolvedValue(null);
      const agg = [{
        day: '2025-05-21',
        id_station: 1,
        id_phenomenon_type: 2,
        promedio: 5,
        max: 6,
        min: 4,
        suma: 15
      }];
      models.sequelize.query = jest.fn().mockResolvedValue(agg);
      models.type_operation.findAll = jest.fn().mockResolvedValue([
        { id: 10, operation: 'PROMEDIO' },
        { id: 11, operation: 'MAX' },
        { id: 12, operation: 'MIN' },
        { id: 13, operation: 'SUMA' }
      ]);
      const bulk = jest.fn();
      models.daily_measurement.bulkCreate = bulk;

      await controller.migrateToDaily(req, res);

      expect(bulk).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ migrated:4 }));
    });

    it('500 si falla algún paso', async () => {
      models.daily_measurement.findOne = jest.fn().mockRejectedValue(new Error('fail'));
      await controller.migrateToDaily(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });('cleanOldMeasurements()', () => {
    it('elimina y devuelve conteos', async () => {
      models.measurement.destroy = jest.fn().mockResolvedValue(2);
      models.quantity.destroy    = jest.fn().mockResolvedValue(3);
      await controller.cleanOldMeasurements(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ deletedMeasurements:2, deletedQuantities:3 }));
    });

    it('500 si falla destroy', async () => {
      models.measurement.destroy = jest.fn().mockRejectedValue(new Error('x'));
      await controller.cleanOldMeasurements(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('clearAllQuantity()', () => {
    it('200 en ruta feliz', async () => {
      models.measurement.truncate = jest.fn().mockResolvedValue();
      models.quantity.truncate    = jest.fn().mockResolvedValue();
      await controller.clearAllQuantity(req, res);
      expect(res.json).toHaveBeenCalledWith({ msg:'Quantity truncada con éxito', code:200 });
    });

    it('500 si falla truncate', async () => {
      models.measurement.truncate = jest.fn().mockRejectedValue(new Error('y'));
      await controller.clearAllQuantity(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
