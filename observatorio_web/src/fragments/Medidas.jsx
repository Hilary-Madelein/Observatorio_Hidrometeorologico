import React, { useEffect, useState, useRef } from 'react';
import { Spinner } from 'react-bootstrap';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import '../css/Medidas_Style.css';
import '../css/Filtro_Style.css';
import '../css/Principal_Style.css';
import { getToken } from '../utils/SessionUtil';
import io from 'socket.io-client';
import mensajes from '../utils/Mensajes';

function formatDateTime(isoString) {
    const date = new Date(isoString);
    const fecha = date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    return `${fecha} ${hora}`;
}

function procesarMedidas(medidas, fenomenos) {
    const agrupadas = {};

    const formatName = name =>
        name
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/^[a-z]/, c => c.toUpperCase());

    const esp2eng = {
        Humedad: 'Humidity',
        Temperatura: 'Temperature',
        Radiación: 'Radiation',
        Lluvia: 'Rain',
        Caudal: 'Caudal (L/s)',
        'Sólidos suspendidos': 'Solidos_Suspendidos_GS (mg/s)',
    };

    const normalize = str =>
        str
            .toString()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[_\s]/g, '');

    medidas.forEach(item => {
        const { tipo_medida, valor, unidad, estacion, fecha_medicion } = item;

        const nombreEsp = tipo_medida;
        const nombreEng = esp2eng[nombreEsp] || nombreEsp;
        const key = normalize(nombreEng);
        const fenomeno = fenomenos.find(f => normalize(f.nombre) === key);
        const label = formatName(nombreEsp);

        if (!agrupadas[label]) {
            agrupadas[label] = {
                nombre: label,
                icono: fenomeno ? `${URLBASE}/images/icons_estaciones/${fenomeno.icono}` : null,
                unidad: unidad || fenomeno?.unidad || '',
                estaciones: []
            };
        }

        agrupadas[label].estaciones.push({
            nombre: estacion,
            valor: parseFloat(valor),
            fecha: fecha_medicion
        });
    });

    return Object.values(agrupadas);
}

function Medidas() {
    const [variables, setVariables] = useState([]);
    const [loading, setLoading] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [medidasRes, fenomenosRes] = await Promise.all([
                    ObtenerGet(getToken(), '/listar/ultima/medida'),
                    ObtenerGet(getToken(), '/listar/tipo_medida')
                ]);

                if (medidasRes.code !== 200 || fenomenosRes.code !== 200) {
                    mensajes(
                        medidasRes.code !== 200 ? medidasRes.msg : fenomenosRes.msg,
                        'error',
                        'Error'
                    );
                    setVariables([]);
                } else {
                    setVariables(procesarMedidas(medidasRes.info, fenomenosRes.info));
                }
            } catch (error) {
                console.error('Error al obtener datos:', error);
                mensajes('Error de conexión con el servidor', 'error', 'Error');
                setVariables([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        socketRef.current = io(URLBASE, { path: '/socket.io' });
        socketRef.current.on('new-measurements', fetchData);
        return () => socketRef.current.disconnect();
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center">
                <Spinner animation="border" role="status"
                    style={{ width: '2rem', height: '2rem', color: '#0C2840', margin: '5px' }}>
                    <span className="sr-only" />
                </Spinner>
                <p className="mt-3">Cargando datos...</p>
            </div>
        );
    }

    return (
        <div>
            <h3 className="titulo-principal">Medidas en tiempo real</h3>
            {variables.length > 0 ? (
                <div className="contenedor-cards">
                    {variables.map((variable, i) => (
                        <div key={i} className="custom-card">
                            <div className="icono-contenedor">
                                <img src={variable.icono} alt={variable.nombre} className="icono-variable" />
                            </div>
                            <div className="contenido-card">
                                <h5 className="titulo-variables">
                                    {variable.nombre}{' '}
                                    <span className="unidad-medida">({variable.unidad})</span>
                                </h5>
                                {variable.estaciones.map((est, idx) => (
                                    <div key={idx} className="estacion-info">
                                        <div className="estacion-header">
                                            <span className="estacion-nombre">{est.nombre}:</span>
                                            <span className="estacion-valor">{est.valor} {variable.unidad}</span>
                                        </div>
                                        <div className="estacion-fecha">
                                            {formatDateTime(est.fecha)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-data-message">
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    No hay datos disponibles o ocurrió un error al cargarlos.
                </div>
            )}
        </div>
    );
}

export default Medidas;


