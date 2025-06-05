import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes, { mensajesConRecarga } from '../utils/Mensajes';
import '../css/Microcuenca_Style.css';
import '../css/Principal_Style.css';
import ModalDetallesMicrocuenca from './ModalDetallesMicrocuenca';
import Header from './Header';
import Footer from './Footer';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import { Dropdown, FormControl, InputGroup } from 'react-bootstrap';
import swal from 'sweetalert';
import ModalAgregarMicrocuenca from './ModalAgregarMicrocuenca';

const ListaMicrocuencas = () => {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [mostrarActivos, setMostrarActivos] = useState(true);

    // Para agregar
    const [showAdd, setShowAdd] = useState(false);
    const handleAddClose = () => setShowAdd(false);
    const handleAddShow = () => setShowAdd(true);

    // Para editar
    const [showEdit, setShowEdit] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const handleEditClose = () => {
        setShowEdit(false);
        setSelectedId(null);
    };

    // Para detalles
    const [showDetails, setShowDetails] = useState(false);
    const [detailMicroId, setDetailMicroId] = useState(null);

    const cargarDatos = useCallback(() => {
        const ruta = mostrarActivos
          ? '/listar/microcuenca/operativas'
          : '/listar/microcuenca/desactivas';
      
        (async () => {
          try {
            const info = await ObtenerGet(getToken(), ruta);
      
            if (info.code === 200) {
              if (Array.isArray(info.info)) {
                setData(info.info);
              } else {
                mensajes('No se encontraron datos de microcuencas', 'info');
                setData([]);
              }
      
            } else if (info.msg === 'Acceso denegado. Token ha expirado') {
              mensajes(info.msg, 'error', 'Error');
              borrarSesion();
              navigate('/admin');
      
            } else {
              mensajes(info.msg || 'Error desconocido al cargar datos', 'error');
            }
      
          } catch (error) {
            console.error('Error cargando microcuencas:', error);
            mensajes('Error cargando microcuencas', 'error', 'Error');
          }
        })();
      }, [mostrarActivos, navigate]);
            

    useEffect(() => {
        cargarDatos();
    }, [mostrarActivos, cargarDatos]);

    const handleEditClick = (externalId) => {
        setSelectedId(externalId);
        setShowEdit(true);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredData = data.filter((microcuenca) => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (
            (microcuenca.name && microcuenca.name.toLowerCase().includes(lowerCaseSearchTerm))
        );
    });

    const handleToggleEstado = (externalId) => {
        swal({
            title: `¿Está seguro de ${mostrarActivos ? 'desactivar' : 'reactivar'} esta microcuenca?`,
            text: `Esta acción ${mostrarActivos ? 'desactivará' : 'reactivará'} la microcuenca.`,
            icon: 'warning',
            buttons: ['Cancelar', mostrarActivos ? 'Desactivar' : 'Reactivar'],
            dangerMode: true,
        }).then(async (confirm) => {
            if (!confirm) return;
            try {
                const res = await ObtenerGet(getToken(), `/desactivar/microcuenca/${externalId}`);
                if (res.code === 200) {
                    mensajesConRecarga(`${mostrarActivos ? 'Desactivada' : 'Reactivada'} con éxito`, 'success');
                    cargarDatos();
                } else {
                    mensajes(res.msg, 'error');
                }
            } catch (error) {
                mensajes('Error al cambiar estado', 'error');
            }
        });
    };


    return (
        <div className="pagina-microcuencas">
            <Header />
            <div className="container-microcuenca shadow-lg rounded p-5">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
                    <h1 className="titulo-admin">Microcuencas {mostrarActivos ? '(Activas)' : '(Inactivas)'}</h1>

                    <div className="d-flex ms-auto flex-wrap align-items-center">
                        <button
                            className="btn btn-outline-secondary me-2"
                            onClick={() => setMostrarActivos(!mostrarActivos)}
                        >
                            {mostrarActivos ? 'Ver Inactivas' : 'Ver Activas'}
                        </button>

                        {mostrarActivos && (
                            <button className="btn-registrar" onClick={handleAddShow}>
                                <i class="bi bi-clipboard2-plus me-2"></i>
                                Agregar
                            </button>
                        )}
                    </div>
                </div>

                <InputGroup className="buscar-input mb-3 input-group-custom">
                    <InputGroup.Text>
                        <i className="bi bi-search"></i>
                    </InputGroup.Text>
                    <FormControl
                        placeholder="Buscar por: Nombre"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </InputGroup>

                {filteredData.length === 0 ? (

                    <p className="no-data-message">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        No existen registros.</p>
                ) : (
                    <div className="row gx-4 gy-4">
                        {filteredData.map(mc => (
                            <div className="col-md-4" key={mc.external_id}>
                                <div className="card-microcuenca shadow-sm">
                                    <img
                                        src={
                                            mc.picture
                                                ? `${URLBASE}/images/microcuencas/${mc.picture}`
                                                : '/img/microcuenca-default.jpg'
                                        }
                                        alt={mc.name}
                                        className="card-img-top img-microcuenca"
                                    />
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between">
                                            <h5 className='titulo-microcuenca'>{mc.name}</h5>
                                            <Dropdown onClick={e => e.stopPropagation()}>
                                                <Dropdown.Toggle variant="light" size="sm">
                                                    <i class="bi bi-sliders"></i>
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu>
                                                    {mostrarActivos && (
                                                        <Dropdown.Item
                                                            onClick={() => handleEditClick(mc.external_id)}
                                                        >
                                                            <i className="bi bi-pencil-square"></i>
                                                            Editar
                                                        </Dropdown.Item>
                                                    )}
                                                    <Dropdown.Item
                                                        onClick={() => handleToggleEstado(mc.external_id)}
                                                    >
                                                        {mostrarActivos ? (
                                                            <>
                                                                <i className="bi bi-arrow-down-square"></i> Desactivar
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-arrow-up-square"></i> Reactivar
                                                            </>
                                                        )}

                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </div>
                                        <div className="d-flex gap-2 mt-2">
                                            <button
                                                className="btn-acceder "
                                                onClick={() => {
                                                    setDetailMicroId(mc.external_id);
                                                    setShowDetails(true);
                                                }}
                                            >
                                                Ver detalles
                                            </button>
                                            <button
                                                className="btn-acceder btn-sm"
                                                onClick={() => navigate(`/estaciones/${mc.external_id}`)}
                                            >
                                                Acceder a estaciones                  </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal para AGREGAR */}
            <ModalAgregarMicrocuenca
                show={showAdd}
                handleClose={handleAddClose}
                external_id={null}
            />

            {/* Modal para EDITAR */}
            <ModalAgregarMicrocuenca
                show={showEdit}
                handleClose={handleEditClose}
                external_id={selectedId}
            />

            {/* Modal de detalles */}
            <ModalDetallesMicrocuenca
                show={showDetails}
                handleClose={() => setShowDetails(false)}
                external_id_micro={detailMicroId}
            />

            <Footer />
        </div>
    );
};

export default ListaMicrocuencas;
