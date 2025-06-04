var express = require('express');
var router = express.Router();
let jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const uuid = require('uuid');
const { body, validationResult,isDate } = require('express-validator');
const EntityController = require('../controls/EntityController');
let entityController = new EntityController();
const AccountController = require('../controls/AccountController');
let accountController = new AccountController();
const MicrobasinController = require('../controls/MicrobasinController');
let microbasinController = new MicrobasinController();
const StationController = require('../controls/StationController');
let stationController = new StationController();
const PhenomenonTypeController = require('../controls/PhenomenonTypeController');
let phenomenonTypeController = new PhenomenonTypeController();
let MeasurementController = require('../controls/MeasurementController');
const measurementController = new MeasurementController();
let DailyMeasurementController = require('../controls/DailyMeasurementController');
const dailyMeasurementController = new DailyMeasurementController();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.json({ "version": "1.0", "name": "hidrometeorologica-backend" });
});

let auth = function (options = { checkAdmin: false }) {
  return async function middleware(req, res, next) {
    const token = req.headers['x-api-token'];
    if (!token) {
      return res.status(401).json({
        msg: "No existe token",
        code: 401
      });
    }

    const llave = process.env.KEY;
    jwt.verify(token, llave, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          msg: "Acceso denegado. Token ha expirado",
          code: 401
        });
      }

      const models = require('../models');
      const { account, entity } = models;
      req.decoded = decoded;

      try {
        let aux = await account.findOne({
          where: { external_id: req.decoded.external },
          include: [{ model: entity, as: 'entity' }]
        });

        if (!aux) {
          return res.status(401).json({
            msg: "Acceso denegado. Token ha expirado",
            code: 401
          });
        }

        if (options.checkAdmin && aux.entity?.role !== 'ADMINISTRADOR') {
          return res.status(403).json({
            msg: "Acceso denegado: se requiere rol ADMINISTRADOR",
            code: 403
          });
        }

        req.user = {
          id: aux.id,
          external_id: aux.external_id,
          email: aux.email,
          role: aux.entity?.role,
          name: aux.entity?.name,
          lastname: aux.entity?.lastname
        };

        return next();
      } catch (dbErr) {
        console.error(dbErr);
        return res.status(500).json({
          msg: "Error interno al validar usuario",
          code: 500
        });
      }
    });
  };
};

// GUARDAR IMAGENES 

// Función para crear configuraciones de almacenamiento de multer
const createStorage = (folderPath) => {
  return multer.diskStorage({
    destination: path.join(__dirname, folderPath),
    filename: (req, file, cb) => {
      const parts = file.originalname.split('.');
      const extension = parts[parts.length - 1];
      cb(null, uuid.v4() + "." + extension);
    }
  });
};

// Método para validar las extensiones de las fotografías
const extensionesAceptadasFoto = (req, file, cb) => {
  const allowedExtensions = ['.jpeg', '.jpg', '.png'];
  console.log(file);
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos JPEG, JPG y PNG.'), false);
  }
};

const extensionesAceptadasIcono = (req, file, cb) => {
  const allowedExtensions = ['.png'];
  console.log(file);
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PNG.'), false);
  }
};

// Configuración de Multer con control de tamaño y tipo de archivo
const uploadFoto = (folderPath) => {
  const storage = createStorage(folderPath);
  return multer({
    storage: storage,
    fileFilter: extensionesAceptadasFoto,
    limits: {
      fileSize: 2 * 1024 * 1024  // 5MB
    }
  });
};

const uploadIcono= (folderPath) => {
  const storage = createStorage(folderPath);
  return multer({
    storage: storage,
    fileFilter: extensionesAceptadasIcono,
    limits: {
      fileSize: 2 * 1024 * 1024
    }
  });
};


const uploadFotoPersona = uploadFoto('../public/images/users');
const uploadFotoMicrocuenca = uploadFoto('../public/images/microcuencas');
const uploadFotoEstacion = uploadFoto('../public/images/estaciones');
const uploadIconoEstacion = uploadIcono('../public/images/icons_estaciones');

/** RUTAS DE MEASUREMENT */
router.get('/listar/ultima/medida', measurementController.getUltimasMediciones);
router.post('/listar/ultima/medida/estacion', measurementController.getUltimasMedicionesPorEstacion);
router.get('/mediciones/por-tiempo', measurementController.getMedicionesPorTiempo);

/** RUTAS DE DAILY MEASUREMENT */
router.get('/mediciones/historicas', dailyMeasurementController.getMedicionesHistoricas);

/**
 * RUTAS DE PERSONA
 */

router.post('/guardar/entidad', auth({ checkAdmin: true }), (req, res, next) => {
  uploadFotoPersona.single('foto')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          msg: "El archivo es demasiado grande. Por favor, sube un archivo de menos de 5 MB.",
          code: 413
        });
      }
      return res.status(400).json({
        msg: "Error al cargar el archivo de la persona: " + error.message,
        code: 400
      });
    }
    entityController.create(req, res, next);
  });
});

router.put('/modificar/entidad', auth({ checkAdmin: true }), (req, res, next) => {
  uploadFotoPersona.single('foto')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          msg: "El archivo es demasiado grande. Por favor, sube un archivo de menos de 5 MB.",
          code: 413
        });
      }
      return res.status(400).json({
        msg: "Error al actualizar el archivo de la persona: " + error.message,
        code: 400
      });
    }
    entityController.update(req, res, next);
  });
});
router.get('/listar/entidad', auth({ checkAdmin: true }), entityController.list);
router.get('/obtener/entidad/:external',  auth({ checkAdmin: true }), entityController.get);

/**
 * RUTAS DE CUENTA
 */

router.post('/sesion', [
  body('email', 'Ingrese un correo valido').exists().not().isEmpty().isEmail(),
  body('password', 'Ingrese una clave valido').exists().not().isEmpty(),
], accountController.login)

router.post('/cambiar-clave/entidad', auth({ checkAdmin: true }), accountController.changePassword);
router.get('/modificar/cuenta-status', auth({ checkAdmin: true }), entityController.changeAccountStatus);


/**
 * RUTAS DE MICROCUENCAS
 */

router.post('/guardar/microcuenca', auth({ checkAdmin: true }), (req, res, next) => {
  uploadFotoMicrocuenca.single('foto')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          msg: "El archivo es demasiado grande. Por favor, sube un archivo de menos de 5 MB.",
          code: 413
        });
      }
      return res.status(400).json({
        msg: "Error al cargar el archivo de la microcuenca: " + error.message,        
        code: 400
      });
    }
    microbasinController.create(req, res, next);
  });
});

router.put('/modificar/microcuenca', auth({ checkAdmin: true }), (req, res, next) => {
  uploadFotoMicrocuenca.single('foto')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          msg: "El archivo es demasiado grande. Por favor, sube un archivo de menos de 5 MB.",
          code: 413
        });
      }
      return res.status(400).json({
        msg: "Error al cargar el archivo de la microcuenca: " + error.message,
        code: 400
      });
    }
    microbasinController.update(req, res, next);
  });
});
router.get('/listar/microcuenca', auth({ checkAdmin: true }), microbasinController.list);
router.get('/listar/microcuenca/operativas', microbasinController.listActive);
router.get('/listar/microcuenca/desactivas', auth({ checkAdmin: true }), microbasinController.listInactive);
router.get('/obtener/microcuenca/:external', auth({ checkAdmin: true }), microbasinController.get);
router.get('/desactivar/microcuenca/:external_id', auth({ checkAdmin: true }), microbasinController.changeStatus); 
router.get('/microcuenca/estaciones', microbasinController.getWithStations);

/**
 * RUTAS DE ESTACIONES
 */

router.post('/guardar/estacion', auth({ checkAdmin: true }), (req, res, next) => {
  uploadFotoEstacion.single('foto')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          msg: "El archivo es demasiado grande. Por favor, sube un archivo de menos de 5 MB.",
          code: 413
        });
      }
      return res.status(400).json({
        msg: "Error al cargar el archivo de la estacion: " + error.message,
        code: 400
      });
    }
    stationController.create(req, res, next);
  });
});

router.put('/modificar/estacion', auth({ checkAdmin: true }), (req, res, next) => {
  uploadFotoEstacion.single('foto')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          msg: "El archivo es demasiado grande. Por favor, sube un archivo de menos de 5 MB.",
          code: 413
        });
      }
      return res.status(400).json({
        msg: "Error al actualizar el archivo de la estacion: " + error.message,
        code: 400
      });
    }
    stationController.update(req, res, next);
  });
});
router.get('/listar/estacion', auth({ checkAdmin: true }), stationController.list);
router.get('/listar/estacion/operativas', stationController.listActive);
router.get('/listar/estacion/:estado/:external_id',auth({ checkAdmin: true }), stationController.listByMicrobasinAndStatus);
router.get('/obtener/estacion/:external', auth({ checkAdmin: true }), stationController.getByMicrobasinParam);
router.get('/get/estacion/:external_id', auth({ checkAdmin: true }), stationController.getByExternal);
router.post('/estacion/cambiar_estado', auth({ checkAdmin: true }), stationController.changeStatus);
router.post('/estaciones/operativas/microcuenca', stationController.getByMicrobasinBody);

/**
 * RUTAS DE TIPOS DE FENOMENOS
 */

router.post('/guardar/tipo_medida', auth({ checkAdmin: true }), (req, res, next) => {
  uploadIconoEstacion.single('foto')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          msg: "El archivo es demasiado grande. Por favor, sube un archivo de menos de 5 MB.",
          code: 413
        });
      }
      return res.status(400).json({
        msg: "Error al cargar el archivo del fenonemo: " + error,
        code: 400
      });
    }
    phenomenonTypeController.create(req, res, next);
  });
});

router.put('/modificar/tipo_medida', auth({ checkAdmin: true }), (req, res, next) => {
  uploadIconoEstacion.single('foto')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          msg: "El archivo es demasiado grande. Por favor, sube un archivo de menos de 5 MB.",
          code: 413
        });
      }
      return res.status(400).json({
        msg: "Error al actualizar el archivo del fenomeno: " + error.message,
        code: 400
      });
    }
    phenomenonTypeController.update(req, res, next);
  });
});
router.get('/listar/tipo_medida', phenomenonTypeController.list);
router.get('/listar/tipo_medida/desactivos', auth({ checkAdmin: true }), phenomenonTypeController.listFalse);
router.get('/obtener/tipo_medida/:external', auth({ checkAdmin: true }), phenomenonTypeController.get);
router.get('/tipo_fenomeno/cambiar_estado/:external_id', auth({ checkAdmin: true }), phenomenonTypeController.changeStatus);

module.exports = router;
