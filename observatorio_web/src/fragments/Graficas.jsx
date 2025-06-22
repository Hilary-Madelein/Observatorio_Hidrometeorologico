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

  console.log('Datos de la gráfica:', datosGrafica);
  

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

    if (!datosFiltrados.length) {
      return { labels: [], datasets: [] };
    }

    if (isRaw) {
      const labelsUnicos = new Set(
        datosFiltrados.map((d) => {
          const fecha = new Date(d.hora);
          return fecha.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
          });

        })
      );

      const labels = Array.from(labelsUnicos).sort((a, b) => {
        const fechaA = new Date(`1970-01-01T${a}`);
        const fechaB = new Date(`1970-01-01T${b}`);
        return fechaA - fechaB;
      });


      const color = chartColors[idxColor % chartColors.length];
      const dataset = {
        label: formatName(medida),
        data: labels.map((lbl) => {
          const rec = datosFiltrados.find((d) => {
            const fecha = new Date(d.hora);
            const check = fecha.toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC'
            });
            return check === lbl && d.tipo_medida === medida;

          });
          return rec ? parseFloat(rec.valor) : null;
        }),
        backgroundColor: `${color}88`,
        borderColor: color,
        borderWidth: 1.8,
        spanGaps: true,
        showLine: true,
        type: isBar ? 'bar' : 'line',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 8,
      };

      return { labels, datasets: [dataset] };
    } else {
      const ordenados = datosFiltrados
        .slice()
        .sort((a, b) => new Date(a.hora) - new Date(b.hora));

      const labels = ordenados.map((d) => {
        const fecha = new Date(d.hora);
        if (filtro.tipo === 'mensual') {
          return fecha.toLocaleDateString('es-ES', {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
          });
        } else if (filtro.tipo === 'diaria') {
          return fecha.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
          });
        } else {
          return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            timeZone: 'UTC'
          });
        }
      });


      const primerRegistro = datosFiltrados.find((d) => d.medidas?.[medida]);
      const metricas = primerRegistro
        ? Object.keys(primerRegistro.medidas[medida]).filter((k) => k !== 'icon' && k !== 'unidad')
        : [];

      const datasets = metricas.map((metrica, mi) => {
        const color = chartColors[(idxColor + mi) % chartColors.length];
        return {
          label: formatName(`${metrica.toUpperCase()}`),
          data: ordenados.map((d) =>
            d.medidas && d.medidas[medida] && d.medidas[medida][metrica] != null
              ? d.medidas[medida][metrica]
              : null
          ),
          borderColor: color,
          backgroundColor: `${color}88`,
          borderWidth: 1.8,
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8,
          type: isBar ? 'bar' : 'line',
        };
      });

      return { labels, datasets };
    }
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
  

  return (
    <div className="custom-container-graficas">
      {todasGraficas.length === 0 && (
        <div className="text-center mt-3">No hay datos para mostrar.</div>
      )}

      <div className="row">
        {todasGraficas.map(({ estacion, medida, idxColor }, idxGlobal) => {
          const datosDeEstaEstacion = datosGrafica.filter((d) => d.estacion === estacion);
          const { labels, datasets } = prepararDatosPorMedida(
            medida,
            datosDeEstaEstacion,
            idxColor + idxGlobal
          );

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
              x: {
                grid: { color: '#e5e5e5' },
                ticks: {
                  maxRotation: 45
                }
              },
              y: {
                grid: { color: '#e5e5e5' },
                ticks: { callback: (v) => (typeof v === 'number' ? v.toFixed(2) : v) },
                title: {
                  display: Boolean(unidad),
                  text: unidad || '',
                },
              },
            },
          };

          return (
            <div
              key={`${estacion}_${medida}_${idxGlobal}`}
              className={todasGraficas.length === 1 ? 'col-12' : `${datosDeEstaEstacion.length > 50 ? 'col-12' : 'col-lg-6 col-md-6'} mb-4`}
            >
              <div className="grafica-card">
                <div className="grafica-header">
                  <i className="bi bi-pin-map-fill icono-estacion" />
                  <span className="estacion-text">
                    <strong>Estación:</strong> {estacion}
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
