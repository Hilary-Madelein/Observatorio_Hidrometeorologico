import React, { useEffect, useRef, useState } from 'react';
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
import zoomPlugin from 'chartjs-plugin-zoom';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import { getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
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
  Legend,
  zoomPlugin
);

const chartColors = ['#BF3131', '#00ADB5', '#FFB1B1', '#1679AB', '#FF0075', '#AE00FB'];
const formatName = (name) =>
  name
    ? name.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
    : '';

const stationNameMap = {
  'UNL-PUEAR3': 'EHA1-NOREC',
  'MARK 4': 'EMA1-NOREC',
};


export default function Graficas({ filtro }) {
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [loading, setLoading] = useState(false);
  const chartRefs = useRef([]);

  useEffect(() => {
    const obtenerDatosPorFiltro = async () => {
      if (!filtro?.tipo) {
        setDatosGrafica([]);
        return;
      }
      setLoading(true);

      try {
        let url;
        if (['15min', '30min', 'hora', 'diaria'].includes(filtro.tipo)) {
          url = `/mediciones/por-tiempo?rango=${filtro.tipo}`;
        } else {
          url = `/mediciones/historicas?rango=${filtro.tipo}`;
          if (filtro.tipo === 'rangoFechas') {
            url += `&fechaInicio=${new Date(filtro.fechaInicio).toISOString()}&fechaFin=${new Date(filtro.fechaFin).toISOString()}`;
          }
        }
        if (filtro.estacion) {
          url += `&estacion=${filtro.estacion}`;
        }
        if (filtro.variable) {
          url += `&variable=${filtro.variable}`;
        }

        const info = await ObtenerGet(getToken(), url);

        if (info.code === 200) {
          if (!info.info?.length) {
            mensajes('No existen datos registrados', 'info', 'Sin datos');
            setDatosGrafica([]);
          } else {
            setDatosGrafica(info.info);
          }
        } else {
          mensajes(info.msg || 'Error al obtener datos', 'error', '¡Algo salió mal!');
          setDatosGrafica([]);
        }
      } catch (error) {
        console.error('Error de conexión con el servidor:', error);
        mensajes('Error de conexión con el servidor.', 'error');
        setDatosGrafica([]);
      } finally {
        setLoading(false);
      }
    };

    obtenerDatosPorFiltro();
  }, [filtro]);

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
      <div
        className="custom-container-graficas d-flex justify-content-center align-items-center"
        style={{ height: '250px' }}
      >
        <div className="card w-75 text-center border-info shadow-sm">
          <div className="card-body justify-content-center align-items-center">
            <i className="bi bi-info-circle-fill text-info" style={{ fontSize: '2rem' }} />
            <h5 className="card-title mt-2">¡Atención!</h5>
            <p className="text-muted mb-0 mt-2 text-center">
              Para visualizar información en las gráficas, por favor configure el filtro.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isRaw = datosGrafica.length > 0 && datosGrafica[0].hasOwnProperty('valor');
  const estacionesUnicas = Array.from(new Set(datosGrafica.map((d) => d.estacion)));

  const prepararDatosPorMedida = (medida, datosFiltrados, idxColor) => {
    const isBar = medida.toLowerCase() === 'lluvia';
    if (!datosFiltrados.length) return { labels: [], datasets: [] };

    const showLastPointOnly = ['15min', '30min', 'hora', 'diaria'].includes(filtro.tipo);

    const ordenados = datosFiltrados.slice().sort((a, b) => {
      const fa = new Date(a.hora ?? a.dia);
      const fb = new Date(b.hora ?? b.dia);
      return fa - fb;
    });

    const labels = ordenados.map(d => {
      const fecha = new Date(d.hora ?? d.dia);
      if (filtro.tipo === 'mensual') {
        return fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      }
      if (filtro.tipo === 'rangoFechas') {
        return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (filtro.tipo === 'diaria') {
        return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      }

      return fecha.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    });

    const primerRegistro = ordenados.find(d => d.medidas && d.medidas[medida]);
    if (!primerRegistro || !primerRegistro.medidas[medida]) {
      return { labels, datasets: [] };
    }

    const metricas = Object
      .keys(primerRegistro.medidas[medida])
      .filter(k => k !== 'icon' && k !== 'unidad');

    const datasets = metricas.map((metrica, mi) => {
      const color = chartColors[(idxColor + mi) % chartColors.length];
      const data = ordenados.map(d => d.medidas[medida]?.[metrica] ?? null);

      return {
        label: formatName(metrica),
        data,
        borderColor: color,
        backgroundColor: `${color}88`,
        borderWidth: 1.5,
        fill: false,
        type: isBar ? 'bar' : 'line',
        tension: 0.4,
        pointRadius: ctx => {
          if (isBar) return 0;
          const lastIdx = ctx.dataset.data.length - 1;
          return showLastPointOnly
            ? (ctx.dataIndex === lastIdx ? 4 : 0)
            : 4;
        },
        pointHoverRadius: 6,
      };
    });

    return { labels, datasets };
  };

  const todasGraficas = [];
  estacionesUnicas.forEach((est, idxEst) => {
    const datosDeEstaEstacion = datosGrafica.filter((d) => d.estacion === est);
    const medidasDisponibles = isRaw
      ? Array.from(new Set(datosDeEstaEstacion.map((d) => d.tipo_medida)))
      : Array.from(
        new Set(
          datosDeEstaEstacion.flatMap((d) => (d.medidas ? Object.keys(d.medidas) : []))
        )
      );
    medidasDisponibles.forEach((medida) => {
      todasGraficas.push({
        estacion: est,
        medida,
        idxColor: idxEst,
      });
    });
  });

  const anyLarge = todasGraficas.some(({ estacion, medida }) => {
    const pts = datosGrafica.filter(
      (d) => d.estacion === estacion && d.tipo_medida === medida
    ).length;
    return pts > 50;
  });

  return (
    <div className="custom-container-graficas">
      {todasGraficas.length === 0 && (
        <div className="text-center mt-3">No hay datos para mostrar.</div>
      )}

      <div className="row">

        {todasGraficas.map(({ estacion, medida, idxColor }, idxGlobal) => {
          const datosDeEstaEstacion = datosGrafica.filter((d) => d.estacion === estacion);
          const colClasses = anyLarge
            ? 'col-12 mb-4'
            : (todasGraficas.length === 1
              ? 'col-12 mb-4'
              : 'col-lg-6 col-md-6 mb-4'
            );


          const { labels, datasets } = prepararDatosPorMedida(
            medida,
            datosDeEstaEstacion,
            idxColor + idxGlobal
          );

          const showLegend = datasets.length > 1;

          const primerRegistro = datosDeEstaEstacion.find((d) =>
            isRaw ? d.tipo_medida === medida : d.medidas?.[medida]
          );
          const iconFilename = isRaw
            ? primerRegistro?.icon
            : primerRegistro?.medidas?.[medida]?.icon;
          const iconUrl = iconFilename ? `${URLBASE}/images/icons_estaciones/${iconFilename}` : '';
          const unidad = isRaw
            ? primerRegistro?.unidad
            : primerRegistro?.medidas?.[medida]?.unidad;

          const ChartCmp = medida.toLowerCase() === 'lluvia' ? Bar : Line;

          const opciones = {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
              mode: 'index',
              intersect: false,
            },

            plugins: {
              legend: { display: showLegend, position: 'top' },
              title: { display: false },
              zoom: {
                pan: {
                  enabled: true,
                  mode: 'x',
                  onPan: ({ chart }) => chart.update('none'),
                },
                zoom: {
                  wheel: {
                    enabled: true,
                  },
                  pinch: {
                    enabled: true
                  },
                  mode: 'x',
                }
              }
            },
            scales: {
              x: {
                grid: { color: '#e5e5e5' },
                ticks: { maxRotation: 45 },
                title: {
                  display: true,
                  text: 'Tiempo',
                  font: { size: 11, weight: '500', family: 'Poppins' },
                  color: '#213555',
                },
              },
              y: {
                grid: { color: '#e5e5e5' },
                ticks: { callback: v => (typeof v === 'number' ? v.toFixed(2) : v) },
                title: {
                  display: Boolean(unidad),
                  text: `${formatName(medida)}${unidad ? ` (${unidad})` : ''}`,
                  font: { size: 11, weight: '500', family: 'Poppins' },
                  color: '#213555',
                },
              },
            },
          };

          return (
            <div key={`${estacion}_${medida}_${idxGlobal}`} className={colClasses}>
              <div className="grafica-card">
                <div className="grafica-header">
                  <i className="bi bi-pin-map-fill icono-estacion" />
                  <span className="estacion-text">
                    <strong>Estación:</strong> { stationNameMap[estacion] || estacion }
                  </span>
                  {iconUrl && (
                    <div className="icono-superior">
                      <img
                        src={iconUrl}
                        alt={`${formatName(medida)} icono`}
                        className="icono-variable"
                      />
                    </div>
                  )}
                </div>

                <div className="zoom-controls">
                  <button title="Acercar zoom" onClick={() => chartRefs.current[idxGlobal]?.zoom(1.2)}><i className="bi bi-zoom-in" /></button>
                  <button title="Alejar zoom" onClick={() => chartRefs.current[idxGlobal]?.zoom(0.8)}><i className="bi bi-zoom-out" /></button>
                  <button title="Desplazar izquierda" onClick={() => chartRefs.current[idxGlobal]?.pan({ x: -100 })}><i className="bi bi-arrow-left" /></button>
                  <button title="Desplazar derecha" onClick={() => chartRefs.current[idxGlobal]?.pan({ x: 100 })}><i className="bi bi-arrow-right" /></button>
                  <button title="Restablecer zoom" onClick={() => chartRefs.current[idxGlobal]?.resetZoom()} className="btn-reset"><i className="bi bi-arrow-counterclockwise" /></button>
                </div>

                <div className="chart-wrapper" style={{ position: 'relative', height: '300px' }}>
                  <ChartCmp
                    ref={(el) => (chartRefs.current[idxGlobal] = el)}
                    data={{ labels, datasets }}
                    options={opciones}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
