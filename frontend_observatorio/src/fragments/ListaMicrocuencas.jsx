import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import '../css/Microcuenca_Style.css';
import '../css/Principal_Style.css';
import Header from './Header';
import Footer from './Footer';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import { Dropdown } from 'react-bootstrap';
import swal from 'sweetalert';

// Importa tu modal
import ModalAgregarMicrocuenca from './ModalAgregarMicrocuenca';

const ListaMicrocuencas = () => {
    const navigate = useNavigate();
    const [data, setData] = useState([]);

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

    useEffect(() => {
        ObtenerGet(getToken(), '/listar/microcuenca').then(info => {
            if (info.code !== 200 && info.msg.includes('Token ha expirado')) {
                borrarSesion();
                mensajes(info.msg, 'error');
                navigate('/admin');
            } else {
                setData(info.info);
            }
        });
    }, [navigate]);
    
    const handleEditClick = (externalId) => {
        setSelectedId(externalId);
        setShowEdit(true);
    };

    return (
        <div className="pagina-microcuencas">
            <Header />
            <div className="container-microcuenca shadow-lg rounded p-5">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h1 className="titulo-admin">Microcuencas Registradas</h1>
                    <button className="btn-registrar" onClick={handleAddShow}>
                        Agregar Microcuenca
                    </button>
                </div>

                {data.length === 0 ? (
                    <p className="no-data-message">No existen microcuencas registradas.</p>
                ) : (
                    <div className="row gx-4 gy-4">
                        {data.map(mc => (
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
                                            <h5><strong>{mc.name}</strong></h5>
                                            <Dropdown onClick={e => e.stopPropagation()}>
                                                <Dropdown.Toggle variant="light" size="sm">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-sliders" viewBox="0 0 16 16">
                                                        <path fill-rule="evenodd" d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1z" />
                                                    </svg>
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu>
                                                    <Dropdown.Item
                                                        onClick={() => handleEditClick(mc.external_id)}
                                                    >
                                                        Editar
                                                    </Dropdown.Item>
                                                    <Dropdown.Item
                                                        onClick={() => {
                                                            swal({
                                                                title: "¿Está seguro?",
                                                                text: "No podrás revertir esto.",
                                                                icon: "warning",
                                                                buttons: ["Cancelar", "Eliminar"],
                                                                dangerMode: true,
                                                            }).then(async ok => {
                                                                if (!ok) return;
                                                                const res = await ObtenerGet(
                                                                    getToken(),
                                                                    `/microcuenca/eliminar/${mc.external_id}`
                                                                );
                                                                if (res.code === 200) {
                                                                    mensajes("Eliminado", "success");
                                                                    setData(data.filter(x => x.external_id !== mc.external_id));
                                                                } else {
                                                                    mensajes(res.msg, 'error');
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        Eliminar
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </div>
                                        <button
                                            className="btn-acceder mt-2"
                                            onClick={() => navigate(`/estaciones/${mc.external_id}`)}
                                        >
                                            Acceder a estaciones
                                        </button>
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

            <Footer />
        </div>
    );
};

export default ListaMicrocuencas;
