const DailyMeasurementController = require('../../../controls/DailyMeasurementController');
const models = require('../../../models');

// Silenciar console.error
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

describe('DailyMeasurementController (unit)', () => {
  let controller, req, res;

  beforeEach(() => {
    controller = new DailyMeasurementController();
    req = { query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('getMedicionesHistoricas()', () => {
    it('devuelve 400 para rango inválido', async () => {
      req.query = { rango: 'diario' };
      await controller.getMedicionesHistoricas(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ msg: 'Rango de tiempo inválido', code: 400 });
    });

    it('devuelve 400 si rango=rangoFechas sin fechas', async () => {
      req.query = { rango: 'rangoFechas', estacion: 'e1' };
      await controller.getMedicionesHistoricas(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        msg: 'Se requiere una fecha de inicio y fin para el rango de fechas',
        code: 400
      });
    });

    it('procesa rango mensual y mapea resultados', async () => {
      req.query = { rango: 'mensual', estacion: 'S1' };
      const rows = [
        {
          periodo: '2025-04-01',
          tipo_medida: 'T',
          variable_icon: 'i',
          unidad: 'C',
          estacion_nombre: 'S1',
          promedio: 10,
          maximo: 15,
          minimo: 5,
          suma: 30
        }
      ];
      models.sequelize.query = jest.fn().mockResolvedValue(rows);

      await controller.getMedicionesHistoricas(req, res);

      expect(models.sequelize.query).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      const info = res.json.mock.calls[0][0].info;
      expect(info[0]).toEqual(expect.objectContaining({
        hora: new Date('2025-04-01').toISOString(),
        estacion: 'S1',
        medidas: {
          T: expect.objectContaining({
            PROMEDIO: 10.00,
            MAX: 15,
            MIN: 5,
            SUMA: 30
          })
        }
      }));
      expect(res.json.mock.calls[0][0]).toMatchObject({
        msg: 'Series históricas de mediciones agregadas',
        code: 200
      });
    });

    it('procesa rangoFechas con fechas válidas y mapea resultados', async () => {
      req.query = {
        rango: 'rangoFechas',
        fechaInicio: '2025-05-01',
        fechaFin: '2025-05-02',
        estacion: null
      };
      const rows = [
        {
          periodo: new Date('2025-05-01T10:00:00Z'),
          tipo_medida: 'H',
          variable_icon: 'i2',
          unidad: '%',
          estacion_nombre: 'S2',
          promedio: null,
          maximo: 80,
          minimo: 40,
          suma: null
        }
      ];
      models.sequelize.query = jest.fn().mockResolvedValue(rows);

      await controller.getMedicionesHistoricas(req, res);

      expect(models.sequelize.query).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      const info = res.json.mock.calls[0][0].info;
      expect(info[0]).toEqual(expect.objectContaining({
        hora: new Date(rows[0].periodo).toISOString(),
        estacion: 'S2',
        medidas: expect.objectContaining({
          H: expect.objectContaining({
            MAX: 80,
            MIN: 40
          })
        })
      }));      
    });

    it('filtra valores anómalos >1000', async () => {
      req.query = { rango: 'mensual', estacion: null };
      const rows = [
        { periodo: '2025-06-01', tipo_medida: 'X', variable_icon: 'i', unidad: 'u', estacion_nombre: 'S', promedio: 1500, maximo: null, minimo: null, suma: null },
        { periodo: '2025-06-01', tipo_medida: 'Y', variable_icon: 'i', unidad: 'u', estacion_nombre: 'S', promedio: 10, maximo: null, minimo: null, suma: null }
      ];
      models.sequelize.query = jest.fn().mockResolvedValue(rows);

      await controller.getMedicionesHistoricas(req, res);

      const info = res.json.mock.calls[0][0].info;
      expect(info).toHaveLength(1);
      expect(info[0].medidas.Y.PROMEDIO).toBe(10);
    });

    it('maneja errores internos y devuelve 500', async () => {
      req.query = { rango: 'mensual' };
      const err = new Error('boom');
      models.sequelize.query = jest.fn().mockRejectedValue(err);

      await controller.getMedicionesHistoricas(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        msg: 'Error al obtener mediciones históricas',
        code: 500
      });
    });
  });
});
