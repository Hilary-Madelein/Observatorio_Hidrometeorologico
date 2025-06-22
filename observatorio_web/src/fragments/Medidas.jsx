import React, { useEffect, useState, useRef } from 'react';
import { Spinner } from 'react-bootstrap';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import '../css/Medidas_Style.css';
import '../css/Filtro_Style.css';
import '../css/Principal_Style.css';
import { getToken } from '../utils/SessionUtil';
import io from 'socket.io-client';
import mensajes from '../utils/Mensajes';

const normalize = str =>
    str
      .toString()
      .normalize('NFD')             
      .replace(/[\u0300-\u036f]/g, '') 
      .toLowerCase()
      .replace(/[_\s]/g, '');        

function procesarMedidas(medidas, fenomenos) {
    const agrupadas = {};

    const formatName = name =>
        name
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/^\w/, c => c.toUpperCase());

    medidas.forEach((item, index) => {
        const { tipo_medida, valor, unidad, estacion } = item;
        const key = normalize(tipo_medida);
        const fenomeno = fenomenos.find(f => normalize(f.nombre) === key);

        if (!agrupadas[tipo_medida]) {
            agrupadas[tipo_medida] = {
                nombre: formatName(tipo_medida),
                icono: fenomeno
                    ? `${URLBASE}/images/icons_estaciones/${fenomeno.icono}`
                    : '',
                unidad: unidad || fenomeno?.unidad || '',
                estaciones: []
            };
        }

        agrupadas[tipo_medida].estaciones.push({
            nombre: estacion,
            valor: parseFloat(valor)
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

                if (medidasRes.code !== 200) {
                    mensajes(medidasRes.msg || 'Error al obtener última medida', 'error', 'Error');
                    setVariables([]);
                    return;
                }
                if (fenomenosRes.code !== 200) {
                    mensajes(fenomenosRes.msg || 'Error al obtener tipos de fenómeno', 'error', 'Error');
                    setVariables([]);
                    return;
                }

                setVariables(procesarMedidas(medidasRes.info, fenomenosRes.info));
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

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center">
                <Spinner
                    animation="border"
                    role="status"
                    style={{ width: '2rem', height: '2rem', color: '#0C2840', margin: '5px' }}
                >
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
                                <img
                                    src={variable.icono}
                                    alt={variable.nombre}
                                    className="icono-variable"
                                />
                            </div>
                            <div className="contenido-card">
                                <h5 className="titulo-variables">
                                    {variable.nombre}{' '}
                                    <span className="unidad-medida">({variable.unidad})</span>
                                </h5>
                                {variable.estaciones.map((est, idx) => (
                                    <p key={idx} className="estacion-info">
                                        <span className="estacion-nombre">{est.nombre}: </span>
                                        <span className="estacion-valor">
                                            {est.valor} {variable.unidad}
                                        </span>
                                    </p>
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
