import React, { useEffect, useState } from 'react';
import '../css/Filtro_Style.css';
import '../css/Principal_Style.css';
import { getToken, borrarSesion } from '../utils/SessionUtil';
import { ObtenerGet } from '../hooks/Conexion';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import mensajes from '../utils/Mensajes';

function Filtro({ onFiltrar }) {
    const [filtroSeleccionado, setFiltroSeleccionado] = useState("");
    const [mesSeleccionado, setMesSeleccionado] = useState("");
    const [anioSeleccionado, setAnioSeleccionado] = useState("");
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [estacionSeleccionada, setEstacionSeleccionada] = useState('');
    const [data, setData] = useState([]);
    const navegation = useNavigate();
    const [descripcionFiltro, setDescripcionFiltro] = useState("");

    const actualizarFiltro = (nuevoFiltro) => {
        if (nuevoFiltro.tipo !== undefined) setFiltroSeleccionado(nuevoFiltro.tipo);
        if (nuevoFiltro.estacion !== undefined) setEstacionSeleccionada(nuevoFiltro.estacion);
        if (nuevoFiltro.fechaInicio !== undefined) setFechaInicio(nuevoFiltro.fechaInicio);
        if (nuevoFiltro.fechaFin !== undefined) setFechaFin(nuevoFiltro.fechaFin);
        if (nuevoFiltro.mes !== undefined) setMesSeleccionado(nuevoFiltro.mes);
        if (nuevoFiltro.anio !== undefined) setAnioSeleccionado(nuevoFiltro.anio);
    };

    const manejarFiltrado = () => {
        let errorMsg = '';

        if (filtroSeleccionado === "rangoFechas") {
            if (!fechaInicio || !fechaFin) {
                errorMsg = "Debe proporcionar un rango de fechas completo.";
            } else if (new Date(fechaInicio) > new Date(fechaFin)) {
                errorMsg = "La fecha de inicio no puede ser mayor que la fecha de fin.";
            }
        } else if (!filtroSeleccionado) {
            mensajes('Debe seleccionar una escala temporal.', 'info', 'Selección Inválida');
            return;
        }

        if (errorMsg) {
            mensajes(errorMsg, 'warning', 'Error de selección');
            return;
        }

        const datosFiltro = {
            tipo: filtroSeleccionado,
            estacion: estacionSeleccionada,
            fechaInicio: filtroSeleccionado === "rangoFechas" ? fechaInicio : null,
            fechaFin: filtroSeleccionado === "rangoFechas" ? fechaFin : null
        };

        actualizarDescripcionFiltro(datosFiltro);
        onFiltrar(datosFiltro);
    };

    const actualizarDescripcionFiltro = (datosFiltro) => {
        let descripcion = "";

        if (datosFiltro.tipo === "rangoFechas") {
            descripcion = `Filtro: Rango de Fechas del ${formatearFecha(datosFiltro.fechaInicio)} al ${formatearFecha(datosFiltro.fechaFin)}`;
        } else if (datosFiltro.tipo === "mensual") {
            descripcion = "Filtro: Datos mensuales generales.";
        } else {
            descripcion = `Filtro: Escala de tiempo ${datosFiltro.tipo}`;
        }

        if (datosFiltro.estacion) {
            const estacionNombre = data.find((e) => e.external_id === datosFiltro.estacion)?.name || "No seleccionada";
            descripcion += ` | Estación: ${estacionNombre}`;
        }

        setDescripcionFiltro(descripcion);
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return "No definida";
        const opciones = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(fecha).toLocaleDateString('es-ES', opciones);
    };

    const obtenerFechaActual = () => {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        return `${anio}-${mes}-${dia}`;
    };

    const mostrarCamposAdicionales = filtroSeleccionado === 'rangoFechas' || filtroSeleccionado === 'mesAnio';

    useEffect(() => {
        if (data.length === 0) {
            ObtenerGet(getToken(), '/listar/estacion/operativas').then((info) => {
                if (info.code !== 200 && info.msg === 'Acceso denegado. Token ha expirado') {
                    borrarSesion();
                    navegation("/admin");
                } else {
                    setData(info.info);
                }
            });
        }
    }, [navegation, data]);  // Añadido `data` en las dependencias para evitar reinicios innecesarios


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



    return (
        <div className="container-fluid">
            <div className="text-left mt-4">
                <h4 style={{ fontWeight: '700', color: '#7D7C7C', fontSize: '16px', textAlign: 'initial', marginBottom: '25px' }}>
                    <i class="bi bi-exclamation-circle-fill" style={{ margin: '5px' }}></i>
                    Configure el filtro para observar información.
                </h4>
            </div>

            <div className="informacion-presentada rounded p-3 mb-4 text-start" style={{ background: '#fff' }}>
                <h5 className="mb-3" style={{ fontWeight: 'bold', color: '#0C2840' }}>
                    <i class="bi bi-info-circle-fill" style={{ margin: '5px' }}></i>
                    Información presentada:
                </h5>
                <div className="text-start">
                    <div className="mb-2">
                        <span style={{ fontWeight: 'bold', color: '#0C2840' }}>Estación:</span>
                        <span className="ms-2 badge bg-secondary text-light">
                            {data.find((e) => e.external_id === estacionSeleccionada)?.name || 'No seleccionada'}
                        </span>
                    </div>
                    {filtroSeleccionado === 'rangoFechas' && (
                        <div className="mb-2">
                            <span style={{ fontWeight: 'bold', color: '#0C2840' }}>Periodo de tiempo:</span>
                            <span className="ms-2 badge bg-secondary text-light">{formatearFecha(fechaInicio)}</span>
                            <span className="ms-1 me-1 text-muted">hasta</span>
                            <span className="badge bg-secondary text-light">{formatearFecha(fechaFin)}</span>
                        </div>
                    )}
                    {filtroSeleccionado === 'mensual' && (
                        <div className="mb-2">
                            <span style={{ fontWeight: 'bold', color: '#0C2840' }}>Filtro:</span>
                            <span className="ms-2 badge bg-secondary text-light">Datos mensuales generales</span>
                        </div>
                    )}
                    {['15min', '30min', 'hora'].includes(filtroSeleccionado) && (
                        <div className="mb-2">
                            <span style={{ fontWeight: 'bold', color: '#0C2840' }}>Periodo de tiempo:</span>
                            <span className="ms-2 badge bg-secondary text-light">
                                {calcularHoraRango(filtroSeleccionado)}
                            </span>
                        </div>
                    )}
                    {filtroSeleccionado === 'diaria' && (
                        <div className="mb-2">
                            <span style={{ fontWeight: 'bold', color: '#0C2840' }}>Fecha:</span>
                            <span className="ms-2 badge bg-secondary text-light">
                                {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                    )}
                </div>
            </div>


            <div className={`filtro-container ${mostrarCamposAdicionales ? 'columna' : ''}`}>
                {/* Mostrar la descripción del filtro */}

                {/* Filtro por tipo */}
                <div className="filtro-item">
                    <label htmlFor="filtro" className="form-label" style={{ fontWeight: '700', color: '#0C2840', fontSize: '16px' }}>
                        <i class="bi bi-hourglass-split" style={{ margin: '5px' }}></i>
                        Escala temporal:
                    </label>
                    <select
                        id="filtro"
                        className="form-select"
                        value={filtroSeleccionado}
                        onChange={(e) => actualizarFiltro({ tipo: e.target.value })}
                    >
                        <option value="" disabled style={{ fontWeight: 'bold', color: '#a9a9a9' }}>
                            Seleccione una escala de tiempo
                        </option>
                        <option value="15min">15 minutos</option>
                        <option value="30min">30 minutos</option>
                        <option value="hora">Hora</option>
                        <option value="diaria">Diaria</option>
                        <option value="mensual">Mensual</option>
                        <option value="rangoFechas">Rango de Fechas</option>
                    </select>
                </div>


                {/* Combo box de estaciones */}
                <div className="filtro-item">
                    <label htmlFor="estacion" className="form-label" style={{ fontWeight: '700', color: '#0C2840', fontSize: '16px' }}>
                        <i class="bi bi-pin-map-fill" style={{ margin: '5px' }}></i>
                        Estación:
                    </label>
                    <select
                        id="estacion"
                        className="form-select"
                        value={estacionSeleccionada}
                        onChange={(e) => actualizarFiltro({ estacion: e.target.value })}
                    >
                        <option value="" disabled style={{ fontWeight: 'bold', color: '#a9a9a9' }}>
                            Seleccione una estación
                        </option>
                        {data.map((estacion) => (
                            <option key={estacion.id} value={estacion.external_id}>
                                {estacion.name}
                            </option>
                        ))}
                    </select>

                </div>

                {/* Mostrar inputs adicionales según el filtro */}
                {filtroSeleccionado === 'rangoFechas' && (
                    <>
                        <div className="filtro-item">
                            <label htmlFor="fecha-inicio" className="form-label" style={{ fontWeight: '700', color: '#0C2840', fontSize: '16px' }}>
                                <i class="bi bi-calendar-range" style={{ margin: '5px' }}></i>
                                Fecha inicio:
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                id="fecha-inicio"
                                value={fechaInicio}
                                onChange={(e) => actualizarFiltro({ fechaInicio: e.target.value })}
                                max={obtenerFechaActual()}
                            />
                        </div>

                        <div className="filtro-item">
                            <label htmlFor="fecha-fin" className="form-label" style={{ fontWeight: '700', color: '#0C2840', fontSize: '16px' }}>
                                <i class="bi bi-calendar-range" style={{ margin: '5px' }}></i>
                                Fecha fin:
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                id="fecha-fin"
                                value={fechaFin}
                                onChange={(e) => actualizarFiltro({ fechaFin: e.target.value })}
                                max={obtenerFechaActual()}
                            />
                        </div>

                    </>
                )}

                {/* Botón de Filtrar */}
                <div className="filtro-item" style={{ marginTop: '40px' }}>
                    <button
                        type="button"
                        className="btn btn-primary custom-button-filtro"
                        onClick={manejarFiltrado}
                    >
                        Filtrar datos
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Filtro;
