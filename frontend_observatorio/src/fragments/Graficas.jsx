import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ObtenerGet, ObtenerPost } from '../hooks/Conexion';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import { useNavigate } from 'react-router-dom';
import Spinner from 'react-bootstrap/Spinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const chartColors = ['#BF3131', '#00ADB5', '#FFB1B1', '#1679AB', '#FF0075', '#AE00FB'];

// Reformatea nombres como "NIVEL_DE_AGUA" → "Nivel de agua"
const formatName = (name) => {
  if (!name) return '';
  return name
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

function Graficas({ filtro }) {
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerDatosPorFiltro = async () => {
      if (!filtro || !filtro.tipo) {
        setDatosGrafica([]);
        return;
      }
    
      setLoading(true);
    
      try {
        let info;
        let url;
    
        if (['15min', '30min', 'hora', 'diaria'].includes(filtro.tipo)) {
          url = `/mediciones/por-tiempo?rango=${filtro.tipo}`;
          
          if (filtro.estacion) {
            url += `&estacion=${filtro.estacion}`;
          }
    
          info = await ObtenerGet(getToken(), url);
        } else {
          let body;
          if (filtro.tipo === 'mesAnio') {
            url = '/medidas/desglosemes/promediadas';
            body = { mes: filtro.mes, anio: filtro.anio, external_id: filtro.estacion };
          } else if (filtro.tipo === 'rangoFechas') {
            url = '/medidas/rango/promediadas';
            body = {
              fechaInicio: new Date(filtro.fechaInicio).toISOString(),
              fechaFin: new Date(filtro.fechaFin).toISOString(),
              external_id: filtro.estacion
            };
          } else if (filtro.tipo === 'mensual') {
            url = '/medidas/mensuales/promediadas';
            body = { escalaDeTiempo: filtro.tipo, external_id: filtro.estacion };
          }
          info = await ObtenerPost(getToken(), url, body);
        }
    
        if (info.code !== 200) {
          mensajes(info.msg, 'error', '¡Algo salió mal!');
          if (info.msg === 'Acceso denegado. Token ha expirado') {
            borrarSesion();
            navigate('/login');
          }
          setDatosGrafica([]);
        } else {
          setDatosGrafica(info.info);
        }
    
      } catch (error) {
        console.error(error);
        mensajes('Error de conexión con el servidor.', 'error');
        setDatosGrafica([]);
      } finally {
        setLoading(false);
      }
    };
    

    obtenerDatosPorFiltro();
  }, [filtro, navigate]);

  const prepararDatosPorMedida = (medida, medidaIndex) => {
    if (!datosGrafica || datosGrafica.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Formatear etiquetas
  const labels = datosGrafica.map(item => {
    const fecha = new Date(item.hora);
    return fecha.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  });
  
    const esEstructuraCruda = datosGrafica[0]?.Temperatura !== undefined;
  
    const datasets = [];
  
    if (esEstructuraCruda) {
      const colorIndex = medidaIndex % chartColors.length;
      const borderColor = chartColors[colorIndex] || '#FF0000';
      const backgroundColor = borderColor;
  
      datasets.push({
        label: `${medida}`,
        data: datosGrafica.map(item => item[medida] || null),
        borderColor,
        backgroundColor,
        borderWidth: 2,
        fill: false,
        pointRadius: medida === 'Lluvia' ? 0 : 6,
        pointHoverRadius: medida === 'Lluvia' ? 0 : 12,
        tension: 0.4,
        type: medida === 'Lluvia' ? 'bar' : 'line',
      });
    } else if (datosGrafica[0]?.medidas?.[medida]) {
      const metricas = Object.keys(datosGrafica[0].medidas[medida]);
  
      metricas.forEach((metrica, metricaIndex) => {
        const colorIndex = (medidaIndex + metricaIndex) % chartColors.length;
        const borderColor = chartColors[colorIndex] || '#FF0000';
        const backgroundColor = borderColor;
  
        datasets.push({
          label: `${medida} - ${metrica}`, // Corregido con las comillas invertidas (backticks)
          data: datosGrafica.map(item => item.medidas[medida]?.[metrica] || null),
          borderColor,
          backgroundColor,
          borderWidth: 2,
          fill: false,
          pointRadius: medida === 'Lluvia' ? 0 : 6,
          pointHoverRadius: medida === 'Lluvia' ? 0 : 12,
          tension: 0.4,
          type: medida === 'Lluvia' ? 'bar' : 'line',
        });
      });
    }
  
    return { labels, datasets };
  };
  
  // Si no hay datos, mostrar un mensaje de carga


  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ flexDirection: 'column' }}>
        <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3">Cargando datos...</p>
      </div>
    );
  }

  const medidasDisponibles = datosGrafica.length > 0
    ? Object.keys(datosGrafica[0].medidas || {})
    : [];

  return (
    <div className="custom-container-graficas">
      <div className="row">
        {medidasDisponibles.map((medida, index) => (
          <div className={`${datosGrafica.length > 50 ? 'col-12' : 'col-lg-6 col-md-6'} mb-4`} key={medida}>
            <div style={{
                padding: '20px',
                border: '1px solid #fff',
                borderRadius: '8px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                background: '#fff'
              }}>
              {medida === 'LLUVIA' ? (
                <Bar
                  data={prepararDatosPorMedida(medida, index)}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: true, position: 'top' },
                      title: {
                        display: true,
                        text: `Gráfica de ${formatName(medida)}`,
                        font: { size: 20, weight: 'bold', family: 'Poppins' },
                        color: '#0C2840',
                      },
                    },
                    scales: {
                      x: { grid: { display: '#e5e5e5' }, ticks: { maxRotation:45, minRotation:45 } },
                      y: { grid: { color: '#e5e5e5' } },
                    },
                  }}
                />
              ) : (
                <Line
                  data={prepararDatosPorMedida(medida, index)}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: true, position: 'top' },
                      title: {
                        display: true,
                        text: `Gráfica de ${formatName(medida)}`,
                        font: { size: 20, weight: 'bold', family: 'Poppins' },
                        color: '#0C2840',
                      },
                    },
                    scales: {
                      x: { grid: { display: '#e5e5e5' }, ticks: { maxRotation:45, minRotation:45 } },
                      y: { grid: { color: '#e5e5e5' } },
                    },
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Graficas;
