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
import { Dropdown, FormControl, InputGroup, Modal } from 'react-bootstrap';
import ModalAgregarEstacion from './ModalAgregarEstacion';
import CambiarEstadoEstacion from './CambiarEstadoEstacion';
import ModalDetallesEstacion from './ModalDetallesEstacion';

const ListaEstaciones = () => {
  const navigate = useNavigate();
  const { external_id } = useParams();
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('operativas');

  // --- ADD ---
  const [showAdd, setShowAdd] = useState(false);
  const handleAddClose = () => setShowAdd(false);
  const handleAddShow = () => setShowAdd(true);

  // --- EDIT ---
  const [showEdit, setShowEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // --- CAMBIAR ESTADO ---
  const [showStatus, setShowStatus] = useState(false);
  const handleStatusClose = () => setShowStatus(false);
  const handleStatusShow = () => setShowStatus(true);

  // --- DETALLES ESTACION ---
  const [showDetails, setShowDetails] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const handleEditClose = () => {
    setShowEdit(false);
    setSelectedId(null);
  };

  const handleEditClick = stationId => {
    setSelectedId(stationId);
    setShowEdit(true);
  };

  const handleStatusClick = stationId => {
    setSelectedId(stationId);
  };

  const handleDetailClick = (id) => {
    setDetailId(id);
    setShowDetails(true);
  };

  const cargarDatos = () => {
    let ruta = '/listar/estacion/operativas';
    if (estadoFiltro === 'mantenimiento') ruta = '/listar/estacion/mantenimiento';
    else if (estadoFiltro === 'no_operativas') ruta = '/listar/estacion/no_operativas';

    ObtenerGet(getToken(), ruta).then(info => {
      if (info.code !== 200 && info.msg.includes('Token ha expirado')) {
        borrarSesion();
        mensajes(info.msg, 'error');
        navigate('/admin');
      } else {
        setData(info.info);
      }
    });
  };

  useEffect(() => {
    cargarDatos();
  }, [estadoFiltro]);


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

        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
          <i
            className="bi bi-arrow-left-circle-fill"
            onClick={() => navigate(-1)}
            style={{ cursor: 'pointer', fontSize: '22px', color: '#0C2840' }}
          ></i>
          <h1 className="titulo-admin">Estaciones Registradas</h1>

          <div className="d-flex ms-auto flex-wrap align-items-center gap-2">
            <button
              className={`btn btn-outline-secondary ${estadoFiltro === 'operativas' ? 'active' : ''}`}
              onClick={() => setEstadoFiltro('operativas')}
            >
              Operativas
            </button>
            <button
              className={`btn btn-outline-secondary ${estadoFiltro === 'mantenimiento' ? 'active' : ''}`}
              onClick={() => setEstadoFiltro('mantenimiento')}
            >
              Mantenimiento
            </button>
            <button
              className={`btn btn-outline-secondary ${estadoFiltro === 'no_operativas' ? 'active' : ''}`}
              onClick={() => setEstadoFiltro('no_operativas')}
            >
              No operativas
            </button>

            <button className="btn-registrar" onClick={handleAddShow}>
              Agregar Estación
            </button>
          </div>
        </div>

        <InputGroup className="mb-3">
          <InputGroup.Text>
            <i className="bi bi-search"></i>
          </InputGroup.Text>
          <FormControl
            placeholder="Buscar por: Nombre"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </InputGroup>

        {(!Array.isArray(data) || filteredData.length === 0) ? (
          <p className="no-data-message">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
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
                          <i class="bi bi-sliders"></i>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleEditClick(est.external_id)}>
                            <i className="bi bi-pencil-square"></i>
                            Editar
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => {
                              handleStatusClick(est.external_id);
                              handleStatusShow();
                            }}
                          >
                            <i className="bi bi-arrow-down-square"></i>
                            Cambiar estado
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>

                    <button
                      className="btn-acceder"
                      onClick={() => handleDetailClick(est.external_id)}
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

      {/* Modal CAMBIAR ESTADO */}
      <Modal
        show={showStatus}
        onHide={handleStatusClose}
        backdrop="static"
        keyboard={false}
        size="lg"
        centered
        dialogClassName="modal-estacion"
      >
        <Modal.Header className="modal-header">
          <Modal.Title className="modal-title">
            Cambiar estado
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="modal-body">
          <CambiarEstadoEstacion external_id_estacion={selectedId} />
        </Modal.Body>

        <Modal.Footer className="modal-footer" />
      </Modal>

      {/* Modal DETALLES */}
      <ModalDetallesEstacion
        show={showDetails}
        handleClose={() => setShowDetails(false)}
        external_id_estacion={detailId}
      />

      <Footer />
    </div>
  );
};

export default ListaEstaciones;
