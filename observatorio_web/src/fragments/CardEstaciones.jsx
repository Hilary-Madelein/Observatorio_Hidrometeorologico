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

mapboxgl.accessToken = 'pk.eyJ1IjoibWFkZWxlaW4iLCJhIjoiY20wd2w4N3VqMDMyYzJqb2ZlNXF5ZnhiZCJ9.i3tWgoA_5CQmQmZyt2yjhg';

const obtenerDatosEstaciones = async () => {
    try {
        const response = await ObtenerGet(getToken(), '/listar/microcuenca/operativas');
        if (response.code === 200) {
            return response.info;
        } else {
            throw new Error(response.msg || 'Error al obtener datos');
        }
    } catch (error) {
        console.error("Error al obtener datos de estaciones:", error);
        return [];
    }
};

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
          zoom:  initialView.zoom,
        });
      
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
        setMap(mapInstance);
      
        mapInstance.on('move', () => {
          setLocation({
            lat:  mapInstance.getCenter().lat.toFixed(5),
            lng:  mapInstance.getCenter().lng.toFixed(5),
            zoom: mapInstance.getZoom().toFixed(2),
          });
        });
      
        return () => mapInstance.remove();
      }, [mapContainerRef, mapStyle, initialView.center, initialView.zoom]);
      

    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            const estaciones = await obtenerDatosEstaciones();
            setData(estaciones);
            setLoading(false);
        };
        cargarDatos();
    }, []);

    const obtenerEstacionesMicrocuenca = async (externalId) => {
        try {
            setLoading(true);
    
            const response = await ObtenerPost(getToken(), 'estaciones/operativas/microcuenca', { external: externalId });
    
            if (response.code === 200) {
                setSelectedMicrocuenca({ nombre: response.microcuenca_nombre, estaciones: response.info });             

                markersRef.current.forEach(marker => marker.remove());
                markersRef.current = [];
    
                const bounds = new mapboxgl.LngLatBounds();
                let hasValidCoordinates = false;
    
                response.info.forEach((estacion) => {
                    const coordenadas = [estacion.longitude, estacion.latitude];
    
                    if (
                        coordenadas &&
                        coordenadas.length === 2 &&
                        !isNaN(coordenadas[0]) &&
                        !isNaN(coordenadas[1])
                    ) {
                        const popupContent = `
                            <div style="text-align: center; font-family: Arial, sans-serif;">
                                <h5 style="color: #333; font-weight: bold;">${estacion.name}</h5>
                                <p style="color: #777; font-size: 12px;">
                                    Microcuenca: ${response.microcuenca_nombre || 'No disponible'}
                                </p>
                                <img 
                                    src="${URLBASE}/images/estaciones/${estacion.picture}" 
                                    alt="${estacion.name}"
                                    style="width: 100%; border-radius: 8px; border: 1px solid #ddd;"
                                />
                            </div>
                        `;
    
                        const marker = new mapboxgl.Marker()
                            .setLngLat(coordenadas)
                            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
                            .addTo(map);
    
                        markersRef.current.push(marker);
                        bounds.extend(coordenadas);
                        hasValidCoordinates = true;
                    }
                });
    
                if (hasValidCoordinates) {
                    map.fitBounds(bounds, { padding: 50 });
                }
            } else {
                mensajes("No se pudieron cargar las estaciones de esta microcuenca.", "error");
                console.error("Error al obtener estaciones:", response.msg);
            }
        } catch (error) {
            console.error("Error inesperado al visualizar el mapa:", error);
            mensajes("Lo sentimos, el mapa no se puede visualizar, intente más tarde.", "error");
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
                    <select onChange={changeMapStyle} value={mapStyle} className="map-select">
                        <option value="mapbox://styles/mapbox/streets-v11">Calles</option>
                        <option value="mapbox://styles/mapbox/outdoors-v11">Exteriores</option>
                        <option value="mapbox://styles/mapbox/light-v10">Claro</option>
                        <option value="mapbox://styles/mapbox/dark-v10">Oscuro</option>
                        <option value="mapbox://styles/mapbox/satellite-v9">Satélite</option>
                        <option value="mapbox://styles/mapbox/satellite-streets-v12">Satélite con Calles</option>
                    </select>
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
                                    <div key={index} className="col-md-3 col-sm-6 mb-4">
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
