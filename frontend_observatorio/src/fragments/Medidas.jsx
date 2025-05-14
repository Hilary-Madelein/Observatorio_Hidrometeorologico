import React, { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import '../css/Medidas_Style.css';
import temperaturaIcon from '../img/temperatura.png';
import presionIcon from '../img/presion.png';
import lluviaIcon from '../img/lluvia.png';
import humedadIcon from '../img/humedad.png';
import '../css/Filtro_Style.css';
import '../css/Principal_Style.css';
import { getToken } from '../utils/SessionUtil';

const chartColors = ['#362FD9', '#1AACAC', '#DB005B', '#19A7CE', '#DF2E38', '#8DCBE6'];

function Medidas() {
    const [variables, setVariables] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [medidasRes, fenomenosRes] = await Promise.all([
                    ObtenerGet(getToken(), '/listar/ultima/medida'),
                    ObtenerGet(getToken(), '/listar/tipo_medida')
                ]);
    
                if (medidasRes.code !== 200 || fenomenosRes.code !== 200) {
                    console.warn("Error al obtener datos:", medidasRes.msg, fenomenosRes.msg);
                    setVariables([]);
                    return;
                }
    
                const medidas = medidasRes.info;
                const tiposFenomenos = fenomenosRes.info;
    
                const medidasProcesadas = procesarMedidas(medidas, tiposFenomenos);
                setVariables(medidasProcesadas);
                console.log("Medidas procesadas:", medidasProcesadas);
    
            } catch (error) {
                console.error("Error al obtener datos:", error);
                setVariables([]);
            } finally {
                setLoading(false);
            }
        };
    
        fetchData();
    }, []);    

    const procesarMedidas = (medidas, fenomenos) => {
        const agrupadas = {};
    
        const formatName = (name) => {
            if (!name) return name;
            return name
                .replace(/_/g, ' ')       
                .toLowerCase()          
                .replace(/^\w/, (c) => c.toUpperCase()); 
        };
    
        medidas.forEach((item, index) => {
            const { tipo_medida, valor, unidad, estacion } = item;
    
            const fenomeno = fenomenos.find(f => f.nombre?.toLowerCase() === tipo_medida.toLowerCase());
    
            if (!agrupadas[tipo_medida]) {
                agrupadas[tipo_medida] = {
                    nombre: formatName(tipo_medida),
                    icono: fenomeno?.icono ? `${URLBASE + "/images/icons_estaciones/" + fenomeno.icono}` : '',
                    unidad: unidad || fenomeno?.unidad || '',
                    estaciones: []
                };
            }
    
            agrupadas[tipo_medida].estaciones.push({
                nombre: estacion,
                valor: parseFloat(valor),
                color: chartColors[index % chartColors.length]
            });
        });
    
        return Object.values(agrupadas);
    };
    
    

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center">
                <Spinner animation="border" role="status" style={{ width: '2rem', height: '2rem', color: '#0C2840', margin: '5px' }}>
                    <span className="sr-only"></span>
                </Spinner>
                <p className="mt-3">Cargando datos...</p>
            </div>
        );
    }

    return (
        <div>
            <h3 className="titulo-principal">Última medición</h3>
            {variables && variables.length > 0 ? (
                <div className="contenedor-cards">
                    {variables.map((variable, index) => (
                        <div key={index} className="custom-card">
                            <div className="icono-contenedor">
                                <img src={variable.icono} alt={`${variable.nombre} Icono`} className="icono-variable" />
                            </div>
                            <div className="contenido-card">
                                <h5 className="titulo-variables">{variable.nombre} <span className="unidad-medida">({variable.unidad})</span></h5>
                                <div className="estaciones-container">
                                    {variable.estaciones.map((estacion, idx) => (
                                        <p key={idx} className="estacion-info">
                                            <span className="estacion-nombre">{estacion.nombre}: </span>
                                            <span className="estacion-valor">
                                                {estacion.valor} {variable.unidad}
                                            </span>
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-data-message">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16" style={{ marginRight: '5px' }}>
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2" />
                    </svg>
                    Sucedió un problema al cargar los datos
                </div>
            )}
        </div>
    );

}

export default Medidas;
