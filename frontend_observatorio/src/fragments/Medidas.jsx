import React, { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { ObtenerGet } from '../hooks/Conexion';
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
                const info = await ObtenerGet(getToken(), '/listar/ultimaMedida');

                if (!info || info.code !== 200) {
                    console.warn("No se pudieron obtener las últimas medidas:", info?.msg || "Respuesta vacía");
                    setVariables([]);
                    return;
                }

                const medidas = procesarMedidas(info.mediciones);
                setVariables(medidas);
                console.log("Medidas obtenidas:", medidas);

            } catch (error) {
                console.error("Error al obtener las últimas medidas:", error);
                setVariables([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const procesarMedidas = (data) => {
        const agrupadas = {};

        data.forEach((item, index) => {
            const { tipo_medida, valor, estacion } = item.ultimaMedicion;

            if (!agrupadas[tipo_medida]) {
                agrupadas[tipo_medida] = {
                    nombre: tipo_medida,
                    icono: obtenerIcono(tipo_medida),
                    unidad: obtenerUnidad(tipo_medida),
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

    const obtenerIcono = (tipo) => {
        switch (tipo) {
            case 'Temperatura': return temperaturaIcon;
            case 'Humedad': return humedadIcon;
            case 'Presion': return presionIcon;
            case 'Lluvia': return lluviaIcon;
            default: return humedadIcon;
        }
    };

    const obtenerUnidad = (tipo) => {
        switch (tipo) {
            case 'Temperatura': return "°C";
            case 'Humedad': return "%";
            case 'Presion': return "hPa";
            case 'Lluvia': return "mm";
            default: return "";
        }
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
        </div>
    );
}

export default Medidas;
