import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import "bootstrap/dist/css/bootstrap.min.css";
import '../css/Mapa_Style.css';
import '../css/Principal_Style.css';
import '../css/CardEstaciones_Style.css';
import Spinner from 'react-bootstrap/Spinner';
import { getToken } from '../utils/SessionUtil';
import { ObtenerGet, ObtenerPost, URLBASE } from '../hooks/Conexion';
import mensajes from '../utils/Mensajes';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

mapboxgl.accessToken = 'pk.eyJ1IjoibWFkZWxlaW4iLCJhIjoiY20wd2w4N3VqMDMyYzJqb2ZlNXF5ZnhiZCJ9.i3tWgoA_5CQmQmZyt2yjhg';

function MapaConEstaciones() {
    const mapContainerRef = useRef(null);
    const [map, setMap] = useState(null);
    const [initialView] = useState({ center: [-79.2, -4.0], zoom: 12 });
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMicrocuenca, setSelectedMicrocuenca] = useState(null);
    const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/satellite-streets-v12');
    const [location, setLocation] = useState({ lat: 0, lng: 0, zoom: 0 });
    const markersRef = useRef([]);
    const [marker, setMarker] = useState(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const mapInstance = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: mapStyle,
            center: initialView.center,
            zoom: initialView.zoom,
        });

        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
        setMap(mapInstance);

        mapInstance.on('move', () => {
            setLocation({
                lat: mapInstance.getCenter().lat.toFixed(5),
                lng: mapInstance.getCenter().lng.toFixed(5),
                zoom: mapInstance.getZoom().toFixed(2),
            });
        });

        return () => mapInstance.remove();
    }, [mapContainerRef, mapStyle, initialView.center, initialView.zoom]);

    useEffect(() => {
        const cargarDatos = async () => {
          setLoading(true);
          try {
            const response = await ObtenerGet(getToken(), '/listar/microcuenca/operativas');
            if (response.code === 200) {
              setData(response.info);
            } else {
              console.error(response.msg);
            }
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        };
      
        cargarDatos();
      }, []);  // Se ejecuta *solo* al montar
      

    const obtenerEstacionesMicrocuenca = async (externalId) => {
        try {
            setLoading(true);

            const response = await ObtenerPost(
                getToken(),
                'estaciones/operativas/microcuenca',
                { external: externalId }
            );

            if (response.code !== 200) {
                mensajes(
                    response.msg || 'No se pudieron cargar las estaciones de esta microcuenca.',
                    'error',
                    'Error'
                );
                return;
            }

            const estacionesBase = response.info;
            const microcuencaNombre = response.microcuenca_nombre;

            const estacionesConMediciones = [];
            for (const estacion of estacionesBase) {
                const measResponse = await ObtenerPost(
                    getToken(),
                    '/listar/ultima/medida/estacion',
                    { externalId: estacion.external_id }
                );

                const mediciones = measResponse.code === 200 ? measResponse.info : [];
                estacionesConMediciones.push({
                    ...estacion,
                    mediciones
                });
            }

            setSelectedMicrocuenca({
                nombre: microcuencaNombre,
                estaciones: estacionesConMediciones
            });
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current = [];

            const bounds = new mapboxgl.LngLatBounds();
            let hasValidCoordinates = false;

            estacionesConMediciones.forEach((estacion) => {
                const { latitude, longitude, name, mediciones } = estacion;
                const coords = [longitude, latitude];

                if (
                    Array.isArray(coords) &&
                    coords.length === 2 &&
                    !isNaN(coords[0]) &&
                    !isNaN(coords[1])
                ) {
                    const popupHtml = `
                            <style>
                                /* Estilos generales del popup */
                                .mapboxgl-popup-content {
                                background: transparent !important;
                                box-shadow: none !important;
                                padding: 0 !important;
                                overflow: visible;
                                }
                                
                                .mapboxgl-popup-tip {
                                display: none !important;
                                }

                                .mapboxgl-popup-close-button {
                                color: #333 !important;
                                right: 8px !important;
                                top: 8px !important;
                                background: rgba(255,255,255,0.8);
                                border-radius: 50%;
                                width: 22px;
                                height: 22px;
                                font-size: 16px;
                                line-height: 20px;
                                text-align: center;
                                }

                                /* Contenedor principal del popup */
                                .popup-container {
                                font-family: Arial, sans-serif;
                                background: #ffffff;
                                border-radius: 8px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                                width: 260px;
                                padding: 0;
                                overflow: hidden;
                                position: relative;
                                }

                                /* Encabezado */
                                .popup-header {
                                background: #537EC5;
                                padding: 12px 10px;
                                text-align: center;
                                }
                                .popup-title {
                                font-size: 16px;
                                font-weight: 600;
                                color: #ffffff;
                                margin-bottom: 2px;
                                }
                                .popup-subtitle {
                                font-size: 12px;
                                color: #e0e0e0;
                                }

                                /* Contenido de mediciones */
                                .popup-content {
                                padding: 8px 10px 12px 10px;
                                }
                                .medicion-item {
                                margin-bottom: 10px;
                                }
                                .medicion-row {
                                display: flex;
                                justify-content: space-between;
                                align-items: baseline;
                                }
                                .medicion-tipo {
                                font-size: 13px;
                                font-weight: 600;
                                color: #333;
                                }
                                .medicion-valor {
                                font-size: 13px;
                                font-weight: 600;
                                color: #034d8f;
                                }
                                .medicion-fecha {
                                margin-top: 2px;
                                font-size: 11px;
                                color: #777;
                                }
                                .sin-mediciones {
                                text-align: center;
                                font-size: 12px;
                                color: #777;
                                padding: 10px 0;
                                }

                                /* ==== Media Query para móviles ==== */
                                @media (max-width: 600px) {
                                .popup-container {
                                    width: 90vw;               
                                    max-width: 200px;         
                                }
                                .popup-header {
                                    padding: 8px 6px; 
                                }
                                .popup-title {
                                    font-size: 14px;           
                                }
                                .popup-subtitle {
                                    font-size: 10px;
                                }
                                .popup-content {
                                    padding: 6px 8px 8px 8px;
                                }
                                .medicion-tipo, .medicion-valor {
                                    font-size: 12px;
                                }
                                .medicion-fecha {
                                    font-size: 10px;
                                }
                                .sin-mediciones {
                                    font-size: 10px;
                                    padding: 8px 0;
                                }
                                .mapboxgl-popup-close-button {
                                    width: 18px;              
                                    height: 18px;
                                    font-size: 14px;
                                    line-height: 18px;
                                    right: 6px;
                                    top: 6px;
                                }
                                }
                            </style>

                            <div class="popup-container">
                                <!-- CABECERA -->
                                <div class="popup-header">
                                <div class="popup-title">${name}</div>
                                <div class="popup-subtitle">${microcuencaNombre || ''}</div>
                                </div>

                                <!-- CONTENIDO: MEDICIONES -->
                                <div class="popup-content">
                                ${mediciones.length > 0
                                                        ? mediciones
                                                            .map((m) => {
                                                                const fechaLocal = new Date(m.fecha_medicion).toLocaleString();
                                                                return `
                                            <div class="medicion-item">
                                                <div class="medicion-row">
                                                <span class="medicion-tipo">${m.tipo_medida}</span>
                                                <span class="medicion-valor">${m.valor} ${m.unidad}</span>
                                                </div>
                                                <div class="medicion-fecha">${fechaLocal}</div>
                                            </div>
                                            `;
                                                            })
                                                            .join('')
                                                        : `<div class="sin-mediciones">No hay mediciones recientes.</div>`
                                                    }
                                </div>
                            </div>
                            `;
                    const popup = new mapboxgl.Popup({
                        offset: 0,
                        closeButton: true,
                        closeOnClick: true,
                        className: ''
                    }).setHTML(popupHtml);

                    const marker = new mapboxgl.Marker()
                        .setLngLat(coords)
                        .setPopup(popup)
                        .addTo(map);

                    markersRef.current.push(marker);
                    bounds.extend(coords);
                    hasValidCoordinates = true;
                }
            });

            if (hasValidCoordinates) {
                map.fitBounds(bounds, { padding: 50 });
            }
        } catch (error) {
            console.error('Error inesperado al obtener/mostrar estaciones:', error);
            mensajes('Lo sentimos, no pudimos cargar el mapa con las estaciones. Intente más tarde.', 'error', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const volverVistaInicial = () => {
        setSelectedMicrocuenca(null);
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        map.flyTo({ center: initialView.center, zoom: initialView.zoom });
    };

    const localizarEstacion = (lat, lng) => {
        map.flyTo({ center: [lng, lat], zoom: 14 });
    };

    const changeMapStyle = (event) => {
        setMapStyle(event.target.value);
    };

    const getUserLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude.toFixed(5), lng: longitude.toFixed(5), zoom: map?.getZoom().toFixed(2) || initialView.zoom });
                map?.flyTo({ center: [longitude, latitude], zoom: 12 });

                if (marker) {
                    marker.remove();
                }
                const newMarker = new mapboxgl.Marker({ color: 'red' })
                    .setLngLat([longitude, latitude])
                    .addTo(map);
                setMarker(newMarker);
            });
        } else {
            mensajes('Geolocalización no soportada por tu navegador', 'info', 'Informacion');
        }
    };

    return (
        <div className="mapa-con-estaciones-container">
            <div className="map-container">
                <div className="map-controls">
                    <FormControl
                        variant="outlined"
                        size="small"
                        sx={{
                            minWidth: { xs: 70, sm: 100 },
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: 'transparent',
                                color: '#fff',
                                '& fieldset': {
                                    borderColor: '#fff',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#fff',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#fff',
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: '#fff',
                                '&.Mui-focused': {
                                    color: '#fff',
                                },
                                fontSize: { xs: '0.55rem', sm: '0.7rem' },
                            },
                            '& .MuiSelect-select': {
                                padding: { xs: '4px 32px 4px 8px', sm: '6px 32px 6px 8px' },
                                fontSize: { xs: '0.55rem', sm: '0.6rem' },
                            },
                            '& .MuiSvgIcon-root': {
                                color: '#fff',
                            },
                        }}
                    >
                        <InputLabel>Estilo de mapa</InputLabel>
                        <Select
                            value={mapStyle}
                            onChange={changeMapStyle}
                            label="Estilo de mapa"
                            size="small"
                        >
                            <MenuItem value="mapbox://styles/mapbox/streets-v11">Calles</MenuItem>
                            <MenuItem value="mapbox://styles/mapbox/outdoors-v11">Exteriores</MenuItem>
                            <MenuItem value="mapbox://styles/mapbox/light-v10">Claro</MenuItem>
                            <MenuItem value="mapbox://styles/mapbox/dark-v10">Oscuro</MenuItem>
                            <MenuItem value="mapbox://styles/mapbox/satellite-v9">Satélite</MenuItem>
                            <MenuItem value="mapbox://styles/mapbox/satellite-streets-v12">
                                Satélite con Calles
                            </MenuItem>
                        </Select>
                    </FormControl>

                    <button onClick={getUserLocation} className="location-button">Ubicación actual</button>
                    <div className="map-info"> <strong>Lat:</strong> {location.lat} | <strong>Lng:</strong> {location.lng} | <strong>Zoom:</strong> {location.zoom}</div>
                </div>
                <div className="mapa-section" ref={mapContainerRef} />
            </div>


            <div className="estaciones-section">
                {selectedMicrocuenca ? (
                    <div className="titulo-principal">
                        <button className="btn btn-back" onClick={volverVistaInicial}>
                            <span>&larr;</span>
                        </button>
                        {selectedMicrocuenca.nombre}
                    </div>
                ) : (
                    <h2 className="titulo-principal">Zonas de Monitoreo</h2>

                )}

                <div className="cards-section">
                    {loading ? (
                        <div className="spinner-container">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : selectedMicrocuenca ? (
                        selectedMicrocuenca.estaciones.length === 0 ? (
                            <p className="no-data-message">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                No existen estaciones registradas.</p>
                        ) : (
                            <div className="row mt-4">
                                {selectedMicrocuenca.estaciones.map((item, index) => (
                                    <div key={index} className="col-sm-12 gap-3 mb-4">
                                        <div className="modern-card">
                                            <img
                                                className="card-img-top"
                                                src={`${URLBASE}/images/estaciones/${item.picture}`}
                                                alt={item.name}
                                            />
                                            <div className="card-body">
                                                <h5 className="card-title">{item.name}</h5>
                                                <p className="card-text">{item.description}</p>
                                                <button
                                                    className="btn-principal"
                                                    onClick={() => localizarEstacion(item.latitude, item.longitude)}
                                                >
                                                    Localizar Estación
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : data.length === 0 ? (
                        <p className="no-data-message">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            No existen microcuencas registradas.</p>
                    ) : (
                        <div className="row mt-4">
                            {data.map((microcuenca, index) => (
                                <div key={index} className="col-md-4 col-sm-6 mb-4">
                                    <div className="modern-card">
                                        <img
                                            className="card-img-top"
                                            src={`${URLBASE}/images/microcuencas/${microcuenca.picture}`}
                                            alt={microcuenca.name}
                                        />
                                        <div className="card-body">
                                            <h5 className="card-title">{microcuenca.name}</h5>
                                            <p className="card-text">{microcuenca.description}</p>
                                            <button
                                                className="btn-principal"
                                                onClick={() => obtenerEstacionesMicrocuenca(microcuenca.external_id)}
                                            >
                                                Ver Estaciones
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

}

export default MapaConEstaciones;
