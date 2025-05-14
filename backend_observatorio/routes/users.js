var express = require('express');
var router = express.Router();
let jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const uuid = require('uuid');
const { body, validationResult,isDate } = require('express-validator');
const MedidaController = require('../controls/MedidaController');
let medidaController = new MedidaController();
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
const MedicionController = require('../controls/MedicionController');
let medicionController = new MedicionController();
const MedidaEstacionController = require('../controls/MedidaEstacionController');
let medidaEstacionController = new MedidaEstacionController();

let MeasurementController = require('../controls/MeasurementController');
const measurementController = new MeasurementController();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.json({ "version": "1.0", "name": "hidrometeorologica-backend" });
});

let auth = function middleware(req, res, next) {
  const token = req.headers['x-api-token'];
  if (token) {
    require('dotenv').config();
    const llave = process.env.KEY;
    jwt.verify(token, llave, async (err, decoded) => {
      if (err) {
        res.status(401);
        res.json({
          msg: "Token no valido",
          code: 401
        });
      } else {
        const models = require('../models');
        const cuenta = models.cuenta;
        req.decoded = decoded;
        let aux = await cuenta.findOne({ 
          where: { 
            external_id: req.decoded.external 
          } 
        })
        if (aux === null) {
          res.status(401);
          res.json({
            msg: "Token no valido o expirado",
            code: 401
          });
        } else {
          next();
        }
      }
    });
  } else {
    res.status(401);
    res.json({
      msg: "No existe token",
      code: 401
    });
  }

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

// Ruta para obtener los últimos 10 registros de los contenedores EMA y EHA
router.get('/listar/ultimasMedidasTen', medidaController.getUltimasTenMedidas);

/** RUTAS DE MEASUREMENT */
router.get('/listar/ultima/medida', measurementController.getUltimasMediciones);
router.get('/mediciones/por-tiempo', measurementController.getMedicionesPorTiempo);


/** RUTAS DE MEDIDA */
router.post('/listar/medidas/diaria', medidaController.getMedidasPromediadasPorDia);
//router.post('/listar/medidas/mes', medidaController.getMedidasPromediadasPorMes);
router.get('/listar/ultimaMedida', medidaController.getUltimasMedidas);
router.post('/listar/medidas/escala', medidaController.getDatosClimaticosPorEscala);
router.post('/listar/todasMedidas/escala', medidaController.getAllDatosClimaticosPorEscala);
//router.post('/listar/temperatura/mensual', medidaController.getDatosClimaticosPorEscalaMensual);
//router.post('/listar/temperatura/mensual/datos', medidaController.getDatosClimaticosMensual);

/**
 * RUTAS DE PERSONA
 */

router.post('/guardar/entidad', (req, res, next) => {
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

router.put('/modificar/entidad', (req, res, next) => {
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
router.get('/listar/entidad', entityController.list);
router.get('/obtener/entidad/:external',  entityController.get);

/**
 * RUTAS DE CUENTA
 */

router.post('/sesion', [
  body('email', 'Ingrese un correo valido').exists().not().isEmpty().isEmail(),
  body('password', 'Ingrese una clave valido').exists().not().isEmpty(),
], accountController.login)


/**
 * RUTAS DE MICROCUENCAS
 */

router.post('/guardar/microcuenca', (req, res, next) => {
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

router.put('/modificar/microcuenca', (req, res, next) => {
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
router.get('/listar/microcuenca', microbasinController.list);
router.get('/listar/microcuenca/operativas', microbasinController.listActive);
router.get('/obtener/microcuenca/:external',  microbasinController.get);
router.get('/microcuenca/estaciones', microbasinController.getWithStations);


/**
 * RUTAS DE ESTACIONES
 */

router.post('/guardar/estacion', (req, res, next) => {
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

router.put('/modificar/estacion', (req, res, next) => {
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
router.get('/listar/estacion', stationController.list);
router.get('/listar/estacion/operativas', stationController.listActive);
router.get('/obtener/estacion/:external',  stationController.getByMicrobasinParam);
router.post('/estaciones/operativas/microcuenca', stationController.getByMicrobasinBody)

/**
 * RUTAS DE TIPOS DE FENOMENOS
 */

router.post('/guardar/tipo_medida', (req, res, next) => {
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

router.put('/modificar/tipo_medida', (req, res, next) => {
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
router.get('/obtener/tipo_medida/:external', phenomenonTypeController.get);

/**
 * RUTAS DE MEDIDA ESTACION
 */

router.post('/asignar/medidas/estaciones', medidaEstacionController.asignarMedidasEstacion);

/**
 * RUTAS DE MEDICION CONTROLLER
 */

router.post('/medidas/mensuales/promediadas', medicionController.getDatosClimaticosPorEscala);
router.post('/medidas/rango/promediadas', medicionController.getDatosClimaticosPorRango);
router.post('/medidas/desglosemes/promediadas', medicionController.getDatosClimaticosPorMes);

module.exports = router;
