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

    //COORDENADAS PARA EL POLIGONO DELIMITANTE DE NOREC
    const microcuencaCoords = [
        [-79.197304319999944, -4.036467859999959],
        [-79.197199173999934, -4.036370601999920],
        [-79.196901764999950, -4.036353454999926],
        [-79.196755538999923, -4.036246714999948],
        [-79.196598829999914, -4.035979486999906],
        [-79.196568702999912, -4.035526594999908],
        [-79.196324076999929, -4.035454348999906],
        [-79.195964865999940, -4.035490634999917],
        [-79.195890741999904, -4.035511251999935],
        [-79.195666794999909, -4.035449213999925],
        [-79.195438098999944, -4.035485517999916],
        [-79.195240907999903, -4.035495858999923],
        [-79.194763275999946, -4.035312455999929],
        [-79.194336202999921, -4.035122981999962],
        [-79.193936996999923, -4.035028685999919],
        [-79.193259025999907, -4.034972528999958],
        [-79.193080150999947, -4.035292363999929],
        [-79.192798020999930, -4.035399414999915],
        [-79.192206043999931, -4.035342035999918],
        [-79.191868079999949, -4.035367987999962],
        [-79.191596586999935, -4.035453532999952],
        [-79.191340094999930, -4.035533484999917],
        [-79.191017399999907, -4.035628597999960],
        [-79.190764816999945, -4.035677510999960],
        [-79.190269123999940, -4.035876247999909],
        [-79.189894346999949, -4.035963981999942],
        [-79.189359503999924, -4.036123288999931],
        [-79.188669869999899, -4.036167269999908],
        [-79.187743684999930, -4.036201216999928],
        [-79.187488098999950, -4.037535214999934],
        [-79.187372970999945, -4.039037633999953],
        [-79.186856196999940, -4.040719185999933],
        [-79.186479884999926, -4.041358507999917],
        [-79.186423989999923, -4.041730709999911],
        [-79.186527778999903, -4.041948152999908],
        [-79.186704869999915, -4.042017387999920],
        [-79.186921188999918, -4.042023139999913],
        [-79.187261106999927, -4.041965556999912],
        [-79.187883670999952, -4.041640876999907],
        [-79.188307253999938, -4.041507140999954],
        [-79.189089221999950, -4.041677017999916],
        [-79.189817030999905, -4.041420891999906],
        [-79.190256296999905, -4.041308544999936],
        [-79.190295103999915, -4.040922278999915],
        [-79.190286039999933, -4.040829456999916],
        [-79.190333086999942, -4.040749057999960],
        [-79.190449291999926, -4.040688244999956],
        [-79.190692288999912, -4.040779806999922],
        [-79.190979937999941, -4.040859796999939],
        [-79.191260142999909, -4.040871149999930],
        [-79.191462470999909, -4.040871150999919],
        [-79.191530511999929, -4.040854116999924],
        [-79.191533557999946, -4.040616995999926],
        [-79.191340740999919, -4.040486339999916],
        [-79.190976975999945, -4.040279521999935],
        [-79.190669433999915, -4.040110894999941],
        [-79.190579130999936, -4.040028273999951],
        [-79.190537415999927, -4.039938232999930],
        [-79.190829382999937, -4.039820812999949],
        [-79.191595963999930, -4.039787858999944],
        [-79.191883759999939, -4.039748117999920],
        [-79.192689447999896, -4.039463817999945],
        [-79.193807055999912, -4.039359586999922],
        [-79.194421190999947, -4.039239711999926],
        [-79.194558921999942, -4.038992381999947],
        [-79.194920761999924, -4.038684252999929],
        [-79.195159741999930, -4.038563124999939],
        [-79.195510621999915, -4.038370063999935],
        [-79.195617863999928, -4.038044182999954],
        [-79.195869355999946, -4.037816237999948],
        [-79.195965537999939, -4.037723417999928],
        [-79.196194792999904, -4.037552719999951],
        [-79.196492089999936, -4.037469144999932],
        [-79.196835680999925, -4.037238431999924],
        [-79.197112254999922, -4.037064631999954],
        [-79.197339209999939, -4.036778610999932],
        [-79.197356897999953, -4.036751641999956],
        [-79.197346839999909, -4.036623038999949],
        [-79.197347733999948, -4.036539915999924],
        [-79.197304319999944, -4.036467859999959]
    ];

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

        mapInstance.on('load', () => {
            const coords = [...microcuencaCoords, microcuencaCoords[0]];

            mapInstance.addSource('microcuenca-area', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [coords] }
                }
            });

            mapInstance.addLayer({
                id: 'microcuenca-fill',
                type: 'fill',
                source: 'microcuenca-area',
                paint: {
                    'fill-color': '#EA5B6F',
                    'fill-opacity': 0.3,
                }
            });

            mapInstance.addLayer({
                id: 'microcuenca-outline',
                type: 'line',
                source: 'microcuenca-area',
                paint: {
                    'line-color': '#B22222',
                    'line-width': 2,
                }
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
    }, []);


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

                const el = document.createElement('div');
                el.className = 'station-marker';
                el.innerHTML = `
                                <span class="station-label">${name}</span>
                                <span class="station-dot"></span>
                                `;

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
                                <div class="popup-subtitle">Última medición</div>
                                </div>

                                <!-- CONTENIDO: MEDICIONES -->
                                <div class="popup-content">
                                ${mediciones.length > 0
                            ? mediciones
                                .map((m) => {
                                    const fecha = m.fecha_medicion.split('T')[0];
                                    const hora = m.fecha_medicion.split('T')[1].slice(0, 8);
                                    const fechaLocal = `${fecha} / ${hora}`;


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

                    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                        .setLngLat(coords)
                        .setPopup(popup)
                        .addTo(map);

                    marker.getElement().setAttribute('title', 'Clic para más información');
                    marker.getElement().style.cursor = 'pointer';
                    marker.setPopup(popup);

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
                                fontSize: { xs: '0.55rem', sm: '0.8rem' },
                            },
                            '& .MuiSelect-select': {
                                padding: { xs: '4px 32px 4px 8px', sm: '6px 32px 6px 8px' },
                                fontSize: { xs: '0.55rem', sm: '0.7rem' },
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
                                                src={`${URLBASE}/images/estaciones/${item.picture}` || null}
                                                alt={item.name}
                                            />
                                            <div className="card-body">
                                                <h5 className="card-title">{item.name}</h5>
                                                <p className="card-text">{item.description}</p>
                                                <button
                                                    className="btn-principal"
                                                    onClick={() => localizarEstacion(item.latitude, item.longitude)}
                                                    title="Clic para ubicar la estación en el mapa"
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
                                                title="Clic para ver las estaciones de monitoreo de la microcuenca"
                                            >
                                                Ver cuenca
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
