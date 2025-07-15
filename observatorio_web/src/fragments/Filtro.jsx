import React, { useEffect, useState } from 'react';
import '../css/Filtro_Style.css';
import '../css/Principal_Style.css';
import { getToken } from '../utils/SessionUtil';
import { ObtenerGet } from '../hooks/Conexion';
import mensajes from '../utils/Mensajes';
import {
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Chip
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

function Filtro({ onFiltrar }) {
    const [filtroSeleccionado, setFiltroSeleccionado] = useState('');
    const [fechaInicio, setFechaInicio] = useState(null);
    const [fechaFin, setFechaFin] = useState(null);
    const [estacionSeleccionada, setEstacionSeleccionada] = useState('');
    const [variableSeleccionada, setVariableSeleccionada] = useState('');
    const [estaciones, setEstaciones] = useState([]);
    const [variables, setVariables] = useState([]);
    const [mensaje, setMensaje] = useState('');

    // Cargar estaciones operativas
    useEffect(() => {
        (async () => {
            try {
                const info = await ObtenerGet(getToken(), '/listar/estacion/operativas');
                if (info.code === 200 && info.info?.length) {
                    setEstaciones(info.info);
                } else {
                    setMensaje(info.msg || 'No hay estaciones operativas');
                }
            } catch {
                setMensaje('Error al cargar estaciones');
            }
        })();
    }, []);

    // Cargar todas las variables activas al montar
    useEffect(() => {
        (async () => {
            try {
                const info = await ObtenerGet(getToken(), '/listar/tipo_medida/activas');
                if (info.code === 200 && info.info?.length) {
                    setVariables(info.info);
                } else {
                    setMensaje(info.msg || 'No hay variables');
                }
            } catch {
                setMensaje('Error al cargar variables');
            }
        })();
    }, []);

    // Cuando cambie la estación, recargar variables de esa estación
    useEffect(() => {
        if (estacionSeleccionada === "TODAS") {
            // Cargar todas las variables activas
            (async () => {
                const info = await ObtenerGet(getToken(), '/listar/tipo_medida/activas');
                if (info.code === 200) {
                    setVariables(info.info);
                    setVariableSeleccionada("TODAS");
                }
            })();
        } else if (!estacionSeleccionada) {
            // Si no hay selección (realmente ninguna)
            setVariables([]);
            setVariableSeleccionada('');
        } else {
            // Cargar variables de la estación seleccionada
            (async () => {
                try {
                    const info = await ObtenerGet(
                        getToken(),
                        `/listar/tipo_medida/estacion/${estacionSeleccionada}`
                    );
                    if (info.code === 200) {
                        setVariables(info.info);
                        setVariableSeleccionada('');
                    } else {
                        mensajes(info.msg || 'Error al cargar variables de la estación', 'error');
                    }
                } catch {
                    mensajes('Error al cargar variables de la estación', 'error');
                }
            })();
        }
    }, [estacionSeleccionada]);


    const manejarFiltrado = () => {
        if (!filtroSeleccionado) {
            mensajes('Debe seleccionar una escala temporal.', 'info', 'Selección Inválida');
            return;
        }
        if (filtroSeleccionado === 'rangoFechas') {
            if (!fechaInicio || !fechaFin) {
                mensajes('Debe proporcionar un rango de fechas completo.', 'warning', 'Error');
                return;
            }
            if (fechaInicio > fechaFin) {
                mensajes('La fecha de inicio no puede ser mayor que la fecha de fin.', 'warning', 'Error');
                return;
            }
        }

        // Construir objeto de filtro opcional
        const filtro = {
            tipo: filtroSeleccionado,
            estacion: estacionSeleccionada || null,
            variable: variableSeleccionada || null,
            fechaInicio: filtroSeleccionado === 'rangoFechas' ? fechaInicio.toISOString() : null,
            fechaFin: filtroSeleccionado === 'rangoFechas' ? fechaFin.toISOString() : null
        };

        onFiltrar(filtro);
    };

    const calcularHoraRango = (filtroSeleccionado) => {
        const ahora = new Date();
        let fechaInicio;

        if (filtroSeleccionado === '15min') {
            fechaInicio = new Date(ahora.getTime() - 15 * 60000);
        } else if (filtroSeleccionado === '30min') {
            fechaInicio = new Date(ahora.getTime() - 30 * 60000);
        } else if (filtroSeleccionado === 'hora') {
            fechaInicio = new Date(ahora.getTime() - 60 * 60000);
        }

        const horaInicio = fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const horaFin = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        return `${horaInicio} - ${horaFin}`;
    };

    const estacionNombre =
        estacionSeleccionada === "TODAS"
            ? "Todas las estaciones"
            : estaciones.find(e => e.external_id === estacionSeleccionada)?.name || 'No seleccionada';

    const variableNombre =
        variableSeleccionada === "TODAS"
            ? "Todas las variables"
            : variables.find(v => v.external_id === variableSeleccionada)?.nombre || 'No seleccionada';


    return (
        <div>
            <h3 className="titulo-principal">Mediciones históricas</h3>
            <div className="container-fluid">

                {/* Información presentada */}
                <div className="informacion-presentada col-lg-12 mb-4">
                    <h5 className="mb-3 info-presentada-text">
                        <i className="bi bi-info-circle-fill me-2"></i>
                        Información presentada:
                    </h5>

                    <Box display="flex" alignItems="center" flexWrap="wrap" mb={1}>
                        <Typography variant="body2" className="info-params">
                            <i className="bi bi-pin-map-fill me-1" />Estación:
                        </Typography>
                        <Chip label={estacionNombre} size="small" sx={{ ml: 1 }} />
                    </Box>

                    <Box display="flex" alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" className="info-params">
                            <i className="bi bi-moisture me-1" />Variable:
                        </Typography>
                        <Chip label={variableNombre} size="small" sx={{ ml: 1 }} />
                    </Box>

                    {filtroSeleccionado === 'rangoFechas' && (
                        <Box display="flex" alignItems="center">
                            <Typography variant="body2" className="info-params">
                                <i className="bi bi-calendar-range me-1" />Periodo de tiempo:
                            </Typography>
                            <Chip label={fechaInicio?.toLocaleDateString('es-ES')} size="small" sx={{ mx: 1 }} />
                            <Typography variant="body2" className="text-muted">hasta</Typography>
                            <Chip label={fechaFin?.toLocaleDateString('es-ES')} size="small" sx={{ ml: 1 }} />
                        </Box>
                    )}

                    {filtroSeleccionado === 'mensual' && (
                        <Box mt={1}>
                            <Typography variant="body2">
                                <i className="bi bi-calendar3 me-1"></i>Periodo de tiempo:
                                <Chip label="Datos mensuales generales" size="small" sx={{ ml: 1 }} />
                            </Typography>
                        </Box>
                    )}

                    {['15min', '30min', 'hora'].includes(filtroSeleccionado) && (
                        <Box mt={1}>
                            <Typography variant="body2">
                                <i className="bi bi-clock-history me-1"></i>Periodo de tiempo:
                                <Chip label={calcularHoraRango(filtroSeleccionado)} size="small" sx={{ ml: 1 }} />
                            </Typography>
                        </Box>
                    )}

                    {filtroSeleccionado === 'diaria' && (
                        <Box mt={1}>
                            <Typography variant="body2">
                                <i className="bi bi-calendar-day me-1"></i>Fecha:
                                <Chip label={new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} size="small" sx={{ ml: 1 }} />
                            </Typography>
                        </Box>
                    )}
                </div>

                <div className={`filtro-container col-lg-12 mb-4 ${filtroSeleccionado === 'rangoFechas' ? 'columna' : ''}`}>

                    {/* Selector Escala Temporal */}
                    <FormControl
                        className="filtro-item"
                        size="small"
                        sx={{ minWidth: 100 }}
                    >
                        <InputLabel htmlFor="filtro">Escala temporal</InputLabel>
                        <Select
                            id="filtro"
                            value={filtroSeleccionado}
                            label="Escala temporal"
                            onChange={e => setFiltroSeleccionado(e.target.value)}
                            size="small"
                        >
                            <MenuItem value="15min">15 minutos</MenuItem>
                            <MenuItem value="30min">30 minutos</MenuItem>
                            <MenuItem value="hora">Hora</MenuItem>
                            <MenuItem value="diaria">Diaria</MenuItem>
                            <MenuItem value="mensual">Mensual</MenuItem>
                            <MenuItem value="rangoFechas">Rango de Fechas</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Selector Estación */}
                    <FormControl
                        className="filtro-item"
                        size="small"
                        sx={{ minWidth: 120 }}
                    >
                        <InputLabel htmlFor="estacion">Estación</InputLabel>
                        <Select
                            value={estacionSeleccionada}
                            label="Estación"
                            onChange={e => setEstacionSeleccionada(e.target.value)}
                        >
                            <MenuItem value="TODAS">Todas</MenuItem>
                            {estaciones.length > 0 ? (
                                estaciones.map(est => (
                                    <MenuItem key={est.external_id} value={est.external_id}>
                                        {est.name}
                                    </MenuItem>
                                ))
                            ) : (
                                <MenuItem disabled>{mensaje}</MenuItem>
                            )}
                        </Select>
                    </FormControl>

                    {/* Selector Variable */}
                    <FormControl
                        className="filtro-item"
                        size="small"
                        sx={{ minWidth: 120 }}
                    >
                        <InputLabel htmlFor="variable">Variable</InputLabel>
                        <Select
                            value={variableSeleccionada}
                            label="Variable"
                            onChange={e => setVariableSeleccionada(e.target.value)}
                        >
                            <MenuItem value="TODAS">Todas</MenuItem>
                            {variables.length > 0 ? (
                                variables.map(v => (
                                    <MenuItem key={v.external_id} value={v.external_id}>
                                        {v.nombre}
                                    </MenuItem>
                                ))
                            ) : (
                                <MenuItem disabled>{mensaje}</MenuItem>
                            )}
                        </Select>
                    </FormControl>


                    {filtroSeleccionado === 'rangoFechas' && (
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={es}>
                            <FormControl
                                className="filtro-item"
                                size="small"
                                sx={{ minWidth: 120 }}
                            >
                                <DatePicker
                                    label="Fecha inicio"
                                    value={fechaInicio}
                                    onChange={newVal => setFechaInicio(newVal)}
                                    maxDate={new Date()}
                                    renderInput={params => <TextField fullWidth size="small" {...params} />}
                                />
                            </FormControl>
                            <FormControl
                                className="filtro-item"
                                size="small"
                                sx={{ minWidth: 120 }}
                            >
                                <DatePicker
                                    label="Fecha fin"
                                    value={fechaFin}
                                    onChange={newVal => setFechaFin(newVal)}
                                    maxDate={new Date()}
                                    renderInput={params => <TextField fullWidth size="small" {...params} />}
                                />
                            </FormControl>
                        </LocalizationProvider>
                    )}

                    {/* Botón */}
                    <div className="filtro-item-btn">
                        <button
                            type="button"
                            className="btn custom-button-filtro-btn"
                            onClick={manejarFiltrado}
                        >
                            Consultar datos
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
}

export default Filtro;