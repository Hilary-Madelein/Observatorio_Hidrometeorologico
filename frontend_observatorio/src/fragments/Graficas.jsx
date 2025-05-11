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
import { ObtenerPost } from '../hooks/Conexion';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import { useNavigate } from 'react-router-dom';
import Spinner from 'react-bootstrap/Spinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const chartColors = ['#BF3131', '#00ADB5', '#FFB1B1', '#1679AB', '#FF0075', '#AE00FB'];

function Graficas({ filtro }) {
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!filtro || !filtro.tipo || !filtro.estacion) {
        setDatosGrafica([]);
        return;
      }

      setLoading(true);

      try {
        let body;
        let url;

        if (filtro.tipo === 'mesAnio') {
          url = '/medidas/desglosemes/promediadas';
          body = { mes: filtro.mes, anio: filtro.anio, external_id: filtro.estacion };
        } else if (filtro.tipo === 'rangoFechas') {
          url = '/medidas/rango/promediadas';
          body = { fechaInicio: new Date(filtro.fechaInicio).toISOString(), fechaFin: new Date(filtro.fechaFin).toISOString(), external_id: filtro.estacion };
        } else if (['15min', '30min', 'hora', 'diaria'].includes(filtro.tipo)) {
          url = '/listar/todasMedidas/escala';
          body = { escalaDeTiempo: filtro.tipo, external_id: filtro.estacion };
        } else if (filtro.tipo === 'mensual') {
          url = '/medidas/mensuales/promediadas';
          body = { escalaDeTiempo: filtro.tipo, external_id: filtro.estacion };
        }

        if (!url) {
          console.error('NO EXISTE EL TIPO DE MEDIDA');
          return;
        }

        const info = await ObtenerPost(getToken(), url, body);

        if (info.code !== 200) {
          setDatosGrafica([]);
          mensajes(info.msg, 'info');
          if (info.msg === 'Acceso denegado. Token ha expirado') {
            borrarSesion();
            navigate('/login');
          }
        } else {
          setDatosGrafica(info.info);
        }
      } catch (error) {
        setDatosGrafica([]);
        mensajes(error.message, 'info');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filtro, navigate]);

  const prepararDatosPorMedida = (medida, medidaIndex) => {
    if (!datosGrafica || datosGrafica.length === 0) {
      return { labels: [], datasets: [] };
    }

    const esEstructuraCruda = datosGrafica[0]?.Temperatura !== undefined;

    const labels = esEstructuraCruda
      ? datosGrafica.map(item =>
        item['Fecha_local_UTC-5'] ? new Date(item['Fecha_local_UTC-5']).toLocaleString('es-ES', { timeZone: 'UTC' }) : 'Sin fecha'
      )
      : datosGrafica.map(item => item.dia || item.mes || item.hora || 'Sin etiqueta');

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
          label: `${medida} - ${metrica}`,
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ flexDirection: 'column' }}>
        <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="sr-only"></span>
        </Spinner>
        <p className="mt-3">Cargando datos...</p>
      </div>
    );
  }

  const medidasDisponibles = datosGrafica.length > 0
    ? datosGrafica[0].medidas
      ? Object.keys(datosGrafica[0].medidas)
      : Object.keys(datosGrafica[0]).filter(key => key !== "Fecha_local_UTC-5")
    : [];


  return (
    <div className="custom-container-graficas">
      <div className="row">
        {medidasDisponibles.map((medida, index) => (
          <div
            className={`${datosGrafica.length > 50 ? 'col-12' : 'col-lg-6 col-md-6'
              } mb-4`}
            key={index}
          >
            <div
              style={{
                padding: '20px',
                border: '1px solid #ffffff',
                borderRadius: '8px',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                background: '#ffffff',
              }}
            >
              {medida === 'Lluvia' ? (
                <Bar
                  data={prepararDatosPorMedida(medida, index)}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: true, position: 'top' },
                      title: {
                        display: true,
                        text: `Gráfica de ${medida}`,
                        font: { size: 20, weight: 'bold', family: 'Poppins' },
                        color: '#0C2840',
                      },
                    },
                    scales: {
                      x: { grid: { display: '#e5e5e5' }, ticks: { color: '#555', font: { size: 14 } } },
                      y: { grid: { color: '#e5e5e5' }, ticks: { color: '#555', font: { size: 14 } } },
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
                        text: `Gráfica de ${medida}`,
                        font: { size: 20, weight: 'bold', family: 'Poppins' },
                        color: '#0C2840',
                      },
                    },
                    scales: {
                      x: { grid: { display: '#e5e5e5' }, ticks: { color: '#555', font: { size: 14 } } },
                      y: { grid: { color: '#e5e5e5' }, ticks: { color: '#555', font: { size: 14 } } },
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
