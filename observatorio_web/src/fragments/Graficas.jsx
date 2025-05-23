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
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import { useNavigate } from 'react-router-dom';
import Spinner from 'react-bootstrap/Spinner';
import '../css/Grafica_Style.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const chartColors = ['#BF3131', '#00ADB5', '#FFB1B1', '#1679AB', '#FF0075', '#AE00FB'];
const formatName = (name) =>
  name
    ? name.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
    : '';

export default function Graficas({ filtro }) {
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerDatosPorFiltro = async () => {
      if (!filtro?.tipo) {
        setDatosGrafica([]);
        return;
      }
      setLoading(true);
      try {
        let info;
        let url;
        if (['15min', '30min', 'hora', 'diaria'].includes(filtro.tipo)) {
          url = `/mediciones/por-tiempo?rango=${filtro.tipo}`;
        } else {
          url = `/mediciones/historicas?rango=${filtro.tipo}`;
          if (filtro.tipo === 'rangoFechas') {
            url += `&fechaInicio=${new Date(filtro.fechaInicio).toISOString()}&fechaFin=${new Date(filtro.fechaFin).toISOString()}`;
          }
        }
        if (filtro.estacion) url += `&estacion=${filtro.estacion}`;
        info = await ObtenerGet(getToken(), url);

        if (info.code !== 200) {
          mensajes(info.msg, 'error', '¡Algo salió mal!');
          if (info.msg.includes('Token ha expirado')) {
            borrarSesion();
            navigate('/login');
          }
          setDatosGrafica([]);
        } else if (!info.info?.length) {
          mensajes('No existen datos registrados', 'info', 'Sin datos');
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ flexDirection: 'column' }}>
        <Spinner animation="border" style={{ width: '3rem', height: '3rem' }} />
        <p className="mt-3">Cargando datos...</p>
      </div>
    );
  }

  if (!filtro?.tipo) {
    return (
      <div className="custom-container-graficas d-flex justify-content-center align-items-center" style={{ height: '250px' }}>
        <div className="card w-75 text-center border-info shadow-sm">
          <div className="card-body">
            <i className="bi bi-info-circle-fill text-info" style={{ fontSize: '2rem' }} />
            <h5 className="card-title mt-2">¡Atención!</h5>
            <p className="card-text text-muted mb-0">
              Para visualizar información en las gráficas,<br />
              por favor configure el filtro.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isRaw = datosGrafica.length > 0 && datosGrafica[0].hasOwnProperty('valor');
  const medidasDisponibles = isRaw
    ? Array.from(new Set(datosGrafica.map((d) => d.tipo_medida)))
    : Object.keys(datosGrafica[0]?.medidas || {});

  const prepararDatosPorMedida = (medida, idx) => {
    const isBar = medida.toLowerCase() === 'lluvia';

    if (!datosGrafica.length) return { labels: [], datasets: [] };

    if (isRaw) {
      const labels = Array.from(
        new Set(
          datosGrafica.map((d) =>
            new Date(d.hora).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })
          )
        )
      ).sort();

      const color = chartColors[idx % chartColors.length];
      const dataset = {
        label: formatName(medida),
        data: labels.map((lbl) => {
          const rec = datosGrafica.find(
            (d) =>
              new Date(d.hora).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              }) === lbl &&
              d.tipo_medida === medida
          );
          return rec ? parseFloat(rec.valor) : null;
        }),
        backgroundColor: `${color}88`,
        borderColor: color,
        borderWidth: 2,
        spanGaps: true,
        showLine: true,
        type: isBar ? 'bar' : 'line',
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 10,
      };

      return { labels, datasets: [dataset] };
    } else {
      const labels = datosGrafica.map((d) =>
        new Date(d.hora).toLocaleString('es-ES', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      const primera = datosGrafica.find((d) => d.medidas?.[medida]);
      const metricas = primera
        ? Object.keys(primera.medidas[medida]).filter((k) => k !== 'icon' && k !== 'unidad')
        : [];
      const datasets = metricas.map((metrica, mi) => {
        const color = chartColors[(idx + mi) % chartColors.length];
        return {
          label: formatName(`${metrica.toUpperCase()}`),
          data: datosGrafica.map((d) => d.medidas?.[medida]?.[metrica] ?? null),
          borderColor: color,
          backgroundColor: `${color}88`,
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 6,
          pointHoverRadius: 10,
          type: isBar ? 'bar' : 'line',
        };
      });
      return { labels, datasets };
    }
  };

  return (
    <div className="custom-container-graficas">
      <div className="row">
        {medidasDisponibles.map((medida, idx) => {
          const { labels, datasets } = prepararDatosPorMedida(medida, idx);
          const stationName = datosGrafica[0]?.estacion || datosGrafica[0]?.estacion_nombre || '';
          const iconFilename = isRaw
            ? datosGrafica.find((d) => d.tipo_medida === medida)?.icon
            : datosGrafica[0].medidas[medida]?.icon;
          const iconUrl = iconFilename ? `${URLBASE}/images/icons_estaciones/${iconFilename}` : '';
          const unidad = isRaw
            ? datosGrafica.find(d => d.tipo_medida === medida)?.unidad
            : datosGrafica[0].medidas[medida]?.unidad;
          const ChartCmp = medida.toLowerCase() === 'lluvia' ? Bar : Line;

          const opciones = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, position: 'top' },
              title: {
                display: true,
                text: formatName(medida),
                font: { size: 20, weight: 'bold', family: 'Poppins' },
                color: '#0C2840',
              },
            },
            scales: {
              x: { grid: { color: '#e5e5e5' }, ticks: { maxRotation: 45 } },
              y: {
                grid: { color: '#e5e5e5' }, ticks: { callback: (v) => v.toFixed(2) }, title: {
                  display: Boolean(unidad),
                  text: unidad || ''
                }
              },
            },
          };


          return (
            <div key={medida} className={`${datosGrafica.length > 50 ? 'col-12' : 'col-lg-6 col-md-6'} mb-4`}>
              <div className="grafica-card">
                <div className="grafica-header">
                  <i className="bi bi-pin-map-fill icono-estacion" />
                  <span className="estacion-text">
                    <strong>Estación:</strong> {stationName}
                  </span>
                  {iconUrl && (
                    <div className="icono-superior">
                      <img src={iconUrl} alt={`${formatName(medida)} icono`} className="icono-variable" />
                    </div>
                  )}
                </div>
                <div className="chart-wrapper">
                  <ChartCmp data={{ labels, datasets }} options={opciones} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
