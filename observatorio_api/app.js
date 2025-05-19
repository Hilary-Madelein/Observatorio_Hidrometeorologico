var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index').router;
var usersRouter = require('./routes/users');
const cors = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
var createError = require('http-errors');
var app = express();
const server = http.createServer(app);
const cron = require('node-cron');
const MeasurementController = require('./controls/MeasurementController');
const measurementCtrl = new MeasurementController();

const socket  = require('./routes/socket');

const io = socket.init(server);
io.on('connection', socket => {
  console.log('Cliente conectado:', socket.id);
  socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id));
});

server.listen(3006, () => console.log('API corriendo en 9006'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

console.log('indexRouter:', indexRouter);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('io', io);
app.use(cors({ origin: '*' }));


app.use('/', indexRouter);  
app.use('/api', usersRouter);

cron.schedule('0 0 * * 0', async () => {
  const fakeReq = {};
  const fakeRes = {
    status: (code) => ({
      json: (body) => console.log(`[Cron] Task =>`, code, body)
    })
  };

  try {
    await measurementCtrl.migrateToDaily(fakeReq, fakeRes);
    console.log('[Cron] Migración diaria completada.');

    await measurementCtrl.cleanOldMeasurements(fakeReq, fakeRes);
    await measurementCtrl.clearAllQuantity(fakeReq, fakeRes);
    console.log('[Cron] Tabla Measurement truncada correctamente.');
  } catch (err) {
    console.error('[Cron] Error en tareas programadas:', err);
  }
});


app.get('/', (req, res) => {
  res.status(200).send('Hello, World!');
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  socket.on('disconnect', () => console.log('Cliente desconectado:', socket.id));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.use(function(req, res, next) {
  next(createError(404));  // Lanza un error 404 si no se encuentra la ruta
});


app.use(function(err, req, res, next) {
  // Establece los valores por defecto para los errores
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err
  });
});



module.exports = app;
