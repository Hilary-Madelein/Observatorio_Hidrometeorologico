import { borrarSesion } from '../utils/SessionUtil';
import { useNavigate, useParams } from 'react-router-dom';
import { getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import '../css/Microcuenca_Style.css';
import 'boxicons';
import Header from './Header';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import AgregarMicrocuenca from '../fragments/AgregarMicrocuenca'
import Footer from './Footer';
import ModalAgregarMicrocuenca from './ModalAgregarMicrocuenca';


const ListaMicrocuencas = () => {
    const navegation = useNavigate();

    // DATOS
    const [data, setData] = useState([]);
    const [microcuencaObtenida, setMicrocuencaObtenida] = useState([]);
    const [showEdit, setShowEdit] = useState(false);
    const handleCloseEdit = () => setShowEdit(false);
    const handleShowEdit = () => setShowEdit(true);

    //SHOW AGREGAR
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    useEffect(() => {
        ObtenerGet(getToken(), '/listar/microcuenca').then((info) => {
            if (info.code !== 200 && info.msg === 'Acceso denegado. Token ha expirado') {
                borrarSesion();
                mensajes(info.msg);
                navegation("/admin");
            } else {
                setData(info.info);
            }
        });
    }, [navegation]);

    // ACCION HABILITAR EDICION CAMPOS
    const handleChange = e => {
        const { name, value } = e.target;
        setMicrocuencaObtenida((prevState) => ({
            ...prevState,
            [name]: value
        }));
    }

    const obtenerId = (external_id) => {
        navegation(`/estaciones/${external_id}`);
    };
 
    return (
        <div className="pagina-microcuencas">
            <Header />
            <div className="container-microcuenca shadow-lg rounded p-5">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h1 style={{ fontWeight: 'bold', color: '#0C2840' }}>Microcuencas Registradas</h1>
                    <button type="button" class="btn btn-outline-success" onClick={handleShow}>Agregar Microcuenca</button>
                </div>
                <div className="containerUsuarios">
                    <div className="row gx-4 gy-4">
                        {data.map((microcuenca) => (
                            <div className="col-md-4" key={microcuenca.id}>
                                <div className="card-microcuenca shadow-sm">
                                    <img
                                        src={data[0]?.picture ? `${URLBASE}/images/microcuencas/${data[0].picture}` : '/img/microcuenca-default.jpg'}
                                        alt={`Imagen de ${microcuenca.name}`}
                                        className="card-img-top img-microcuenca"
                                    />

                                    <div className="card-body">
                                        <h5 className="titulo-microcuenca">{microcuenca.name}</h5>
                                        <div className="d-flex justify-content-end">
                                            <button
                                                className="btn btn-dark btn-sm"
                                                onClick={() => obtenerId(microcuenca.external_id)}
                                            >
                                                Acceder a estaciones
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
            {/* < VENTANA MODAL AGREGAR> */}
            <ModalAgregarMicrocuenca show={show} handleClose={handleClose} />

            <Footer />
        </div>

    );
}

export default ListaMicrocuencas;
