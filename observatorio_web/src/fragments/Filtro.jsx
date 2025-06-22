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
    const [data, setData] = useState([]);
    const [mensaje, setMensaje] = useState("");

    useEffect(() => {
        if (!data.length) {
            (async () => {
                try {
                    const info = await ObtenerGet(getToken(), '/listar/estacion/operativas');
                    if (info.code === 200) {
                        if (info.info && info.info.length) {
                            setData(info.info);
                        } else {
                            setMensaje("No hay información");
                        }
                    } else {
                        setMensaje(info.msg || "Error al cargar estaciones operativas");
                    }
                } catch (error) {
                    setMensaje('Error al cargar estaciones operativas');
                }
            })();
        }
    }, [data]);

    const manejarFiltrado = () => {
        let errorMsg = '';
        if (filtroSeleccionado === 'rangoFechas') {
            if (!fechaInicio || !fechaFin) errorMsg = 'Debe proporcionar un rango de fechas completo.';
            else if (fechaInicio > fechaFin) errorMsg = 'La fecha de inicio no puede ser mayor que la fecha de fin.';
        } else if (!filtroSeleccionado) {
            mensajes('Debe seleccionar una escala temporal.', 'info', 'Selección Inválida');
            return;
        }
        if (errorMsg) {
            mensajes(errorMsg, 'warning', 'Error de selección');
            return;
        }

        onFiltrar({
            tipo: filtroSeleccionado,
            estacion: estacionSeleccionada,
            fechaInicio: filtroSeleccionado === 'rangoFechas' ? fechaInicio.toISOString() : null,
            fechaFin: filtroSeleccionado === 'rangoFechas' ? fechaFin.toISOString() : null
        });
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

    const estacionNombre = data.find(e => e.external_id === estacionSeleccionada)?.name || 'No seleccionada';

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

                {/* Nuevo contenedor explicativo */}
                {filtroSeleccionado && (
                    <div className="informacion-presentada col-lg-12 mb-4">
                        <h5 className="mb-3 info-presentada-text">
                            <i className="bi bi-info-circle-fill me-2"></i>
                            Tipo de datos mostrados:
                        </h5>
                        <Box>
                            {['15min', '30min', 'hora'].includes(filtroSeleccionado) ? (
                                <Typography variant="body2">
                                    En esta escala temporal, se presentan <strong>las mediciones originales</strong> registradas por las estaciones de monitoreo, sin aplicar agregación ni operaciones.
                                </Typography>
                            ) : (
                                <Typography variant="body2">
                                    En esta escala temporal, se muestran los datos recabados por las estaciones de monitoreo, <strong>procesados</strong> según la operación estadística adecuada para cada variable hidrometeorológica, ya sea promedio, máximo, mínimo o suma.
                                </Typography>
                            )}
                        </Box>
                    </div>
                )}

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
                            id="estacion"
                            value={estacionSeleccionada}
                            label="Estación"
                            onChange={e => setEstacionSeleccionada(e.target.value)}
                            size="small"
                            sx={{ padding: '0 10px' }}
                        >
                            {data.length > 0 ? (
                                data.map(est => (
                                    <MenuItem key={est.external_id} value={est.external_id}>
                                        {est.name}
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