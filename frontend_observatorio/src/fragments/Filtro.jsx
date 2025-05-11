import React, { useEffect, useState } from 'react';
import '../css/Filtro_Style.css';
import '../css/Principal_Style.css';
import { getToken, borrarSesion } from '../utils/SessionUtil';
import { ObtenerGet } from '../hooks/Conexion';
import { useNavigate } from 'react-router-dom';

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
        } else if (filtroSeleccionado === "mesAnio") {
            if (!mesSeleccionado || !anioSeleccionado) {
                errorMsg = "Debe seleccionar tanto el mes como el año.";
            }
        } else if (!filtroSeleccionado) {
            errorMsg = "Debe seleccionar un tipo de filtro.";
        }

        if (errorMsg) {
            alert(errorMsg);
            return;
        }

        // Preparar los datos del filtro según el tipo seleccionado
        const datosFiltro = {
            tipo: filtroSeleccionado,
            estacion: estacionSeleccionada,
            fechaInicio: filtroSeleccionado === "rangoFechas" ? fechaInicio : null,
            fechaFin: filtroSeleccionado === "rangoFechas" ? fechaFin : null,
            mes: filtroSeleccionado === "mesAnio" ? mesSeleccionado : null,
            anio: filtroSeleccionado === "mesAnio" ? anioSeleccionado : null,
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
            const estacionNombre = data.find((e) => e.external_id === datosFiltro.estacion)?.nombre || "No seleccionada";
            descripcion += ` | Estación: ${estacionNombre}`;
        }

        setDescripcionFiltro(descripcion);
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return "No definida";
        const opciones = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(fecha).toLocaleDateString('es-ES', opciones);
    };


    const anios = Array.from(new Array(100), (val, index) => new Date().getFullYear() - index);

    const obtenerFechaActual = () => {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        return `${anio}-${mes}-${dia}`;
    };

    const mostrarCamposAdicionales = filtroSeleccionado === 'rangoFechas' || filtroSeleccionado === 'mesAnio';

    useEffect(() => {
        ObtenerGet(getToken(), '/listar/estacion/operativas').then((info) => {
            if (info.code !== 200 && info.msg === 'Acceso denegado. Token ha expirado') {
                borrarSesion();
                navegation("/admin");
            } else {
                setData(info.info);
            }
        });
    }, [navegation]);

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
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-circle-fill" viewBox="0 0 16 16" style={{ margin: '5px' }}>
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4m.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2" />
                    </svg>

                    Configure el filtro para observar información.
                </h4>
            </div>

            <div className="informacion-presentada rounded p-3 mb-4 text-start" style={{ background: '#fff' }}>
                <h5 className="mb-3" style={{ fontWeight: 'bold', color: '#0C2840' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-info-circle-fill" viewBox="0 0 16 16" style={{ marginRight: '8px' }}>
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2" />
                    </svg>
                    Información presentada:
                </h5>
                <div className="text-start">
                    <div className="mb-2">
                        <span style={{ fontWeight: 'bold', color: '#0C2840' }}>Estación:</span>
                        <span className="ms-2 badge bg-secondary text-light">
                            {data.find((e) => e.external_id === estacionSeleccionada)?.nombre || 'No seleccionada'}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-hourglass-bottom" viewBox="0 0 16 16" style={{ margin: '5px', color: '#0C2840' }}>
                            <path d="M2 1.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1-.5-.5m2.5.5v1a3.5 3.5 0 0 0 1.989 3.158c.533.256 1.011.791 1.011 1.491v.702s.18.149.5.149.5-.15.5-.15v-.7c0-.701.478-1.236 1.011-1.492A3.5 3.5 0 0 0 11.5 3V2z" />
                        </svg>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-pin-map-fill" viewBox="0 0 16 16" style={{ margin: '5px' }}>
                            <path fill-rule="evenodd" d="M3.1 11.2a.5.5 0 0 1 .4-.2H6a.5.5 0 0 1 0 1H3.75L1.5 15h13l-2.25-3H10a.5.5 0 0 1 0-1h2.5a.5.5 0 0 1 .4.2l3 4a.5.5 0 0 1-.4.8H.5a.5.5 0 0 1-.4-.8z" />
                            <path fill-rule="evenodd" d="M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999z" />
                        </svg>
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
                            <option key={estacion.id} value={estacion.external_id}>{estacion.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Mostrar inputs adicionales según el filtro */}
                {filtroSeleccionado === 'rangoFechas' && (
                    <>
                        <div className="filtro-item">
                            <label htmlFor="fecha-inicio" className="form-label" style={{ fontWeight: '700', color: '#0C2840', fontSize: '16px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-calendar-range" viewBox="0 0 16 16" style={{ margin: '5px' }}>
                                    <path d="M9 7a1 1 0 0 1 1-1h5v2h-5a1 1 0 0 1-1-1M1 9h4a1 1 0 0 1 0 2H1z" />
                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
                                </svg>
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-calendar-range" viewBox="0 0 16 16" style={{ margin: '5px' }}>
                                    <path d="M9 7a1 1 0 0 1 1-1h5v2h-5a1 1 0 0 1-1-1M1 9h4a1 1 0 0 1 0 2H1z" />
                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z" />
                                </svg>
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
