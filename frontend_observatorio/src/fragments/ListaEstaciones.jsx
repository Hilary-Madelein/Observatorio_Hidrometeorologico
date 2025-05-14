// src/components/ListaEstaciones.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getToken, borrarSesion } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import '../css/Estacion_Style.css';
import 'boxicons';
import Header from './Header';
import Footer from './Footer';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import { Dropdown, FormControl, InputGroup } from 'react-bootstrap';
import swal from 'sweetalert';
import ModalAgregarEstacion from './ModalAgregarEstacion';

const ListaEstaciones = () => {
  const navigate = useNavigate();
  const { external_id } = useParams();
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // --- ADD ---
  const [showAdd, setShowAdd] = useState(false);
  const handleAddClose = () => setShowAdd(false);
  const handleAddShow = () => setShowAdd(true);

  // --- EDIT ---
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const handleEditClose = () => {
    setShowEdit(false);
    setSelectedId(null);
  };
  const handleEditClick = stationId => {
    setSelectedId(stationId);
    setShowEdit(true);
  };

  useEffect(() => {
    const fetchEstaciones = async () => {
      try {
        const info = await ObtenerGet(getToken(), `/obtener/estacion/${external_id}`);
        if (info.code === 200) {
          setData(Array.isArray(info.info) ? info.info : []);
        } else {
          mensajes(info.msg, 'error');
          if (info.msg.includes('Token ha expirado')) {
            borrarSesion();
            navigate('/admin');
          }
        }
      } catch (error) {
        console.error('Error al cargar estaciones:', error);
        mensajes('Error al cargar estaciones', 'error');
      }
    };
    fetchEstaciones();
  }, [external_id, navigate]);

  // Elimina una estación
  const handleDelete = stationId => {
    swal({
      title: "¿Está seguro?",
      text: "No podrás revertir esto.",
      icon: "warning",
      buttons: ["Cancelar", "Eliminar"],
      dangerMode: true,
    }).then(async ok => {
      if (!ok) return;
      try {
        const res = await ObtenerGet(getToken(), `/estacion/eliminar/${stationId}`);
        if (res.code === 200) {
          mensajes("Estación eliminada", "success");
          setData(d => d.filter(x => x.external_id !== stationId));
        } else {
          mensajes(res.msg, "error");
        }
      } catch (error) {
        console.error('Error al eliminar estación:', error);
        mensajes('Error al eliminar estación', 'error');
      }
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredData = data.filter((estacion) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      (estacion.name && estacion.name.toLowerCase().includes(lowerCaseSearchTerm))
    );
  });

  return (
    <div className="pagina-microcuencas">
      <Header />
      <div className="container-microcuenca shadow-lg rounded p-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="titulo-admin">Estaciones Registradas</h1>
          <button className="btn-registrar" onClick={handleAddShow}>
            Agregar Estación
          </button>
        </div>

        <InputGroup className="mb-3">
          <InputGroup.Text>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
            </svg>
          </InputGroup.Text>
          <FormControl
            placeholder="Buscar por: Nombre"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </InputGroup>

        {(!Array.isArray(data) || filteredData.length === 0) ? (
          <p className="no-data-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
              className="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16" style={{ marginRight: 5 }}>
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 
                1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 
                3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 
                1 1 0 2 1 1 0 0 1 0-2"/>
            </svg>
            No existen registros.
          </p>
        ) : (
          <div className="row gx-4 gy-4">
            {filteredData.map(est => (
              <div className="col-md-4" key={est.external_id}>
                <div className="card card-estacion-horizontal d-flex flex-row align-items-center">
                  <img
                    src={
                      est.picture
                        ? `${URLBASE}/images/estaciones/${est.picture}`
                        : '/img/estacion-default.jpg'
                    }
                    alt={est.name}
                    className="img-estacion-horizontal"
                  />
                  <div className="card-body px-3 flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="titulo-estacion mb-0">{est.name}</h6>
                      <Dropdown onClick={e => e.stopPropagation()}>
                        <Dropdown.Toggle variant="light" size="sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-sliders" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1z" />
                          </svg>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleEditClick(est.external_id)}>
                            Editar
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleDelete(est.external_id)}>
                            Eliminar
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                    {/* Aquí cambiamos la ruta para no recargar este listado */}
                    <button
                      className="btn-acceder mt-2"
                      onClick={() => navigate(`/estacion/${est.external_id}`)}
                    >
                      Ver detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal AGREGAR */}
      <ModalAgregarEstacion
        show={showAdd}
        handleClose={handleAddClose}
        external_id={external_id}
      />

      {/* Modal EDITAR */}
      <ModalAgregarEstacion
        show={showEdit}
        handleClose={handleEditClose}
        external_id_estacion={selectedId}
      />

      <Footer />
    </div>
  );
};

export default ListaEstaciones;
