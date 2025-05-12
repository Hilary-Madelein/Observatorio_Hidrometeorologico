import { useNavigate, useParams } from 'react-router-dom';
import { getToken, borrarSesion } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import '../css/Estacion_Style.css';
import 'boxicons';
import Header from './Header';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import AgregarEstacion from '../fragments/AgregarEstacion'
import Footer from './Footer';
import ModalAgregarEstacion from './ModalAgregarEstacion';


const ListaEstaciones = () => {
    const navegation = useNavigate();
    const { external_id } = useParams();    

    // DATOS
    const [data, setData] = useState([]);
    const [estacionObtenida, setEstacionObtenida] = useState([]);
    const [showEdit, setShowEdit] = useState(false);
    const handleCloseEdit = () => setShowEdit(false);
    const handleShowEdit = () => setShowEdit(true);

    //SHOW AGREGAR
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    useEffect(() => {
        ObtenerGet(getToken(), `/obtener/estacion/${external_id}`).then((info) => {
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
        setEstacionObtenida((prevState) => ({
            ...prevState,
            [name]: value
        }));
    }


    return (
        <div className="pagina-microcuencas">
            <Header />
            <div className="container-microcuenca shadow-lg rounded p-5">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h1 style={{ fontWeight: 'bold', color: '#0C2840' }}>Estaciones Registradas</h1>
                    <button type="button" class="btn btn-outline-success" onClick={handleShow}>Agregar Estación</button>
                </div>
                <div className="containerUsuarios">
                    <div className="row gx-4 gy-4">
                        {data.map((estacion) => (
                            <div className="col-md-4" key={estacion.id}>
                                <div className="card card-estacion-horizontal d-flex flex-row align-items-center">
                                    <img
                                        src={URLBASE + "/images/estaciones/" + estacion.picture}
                                        alt={`Imagen de ${estacion.name}`}
                                        className="img-estacion-horizontal"
                                    />
                                    <div className="card-body px-3">
                                        <h6 className="titulo-estacion mb-2">{estacion.name}</h6>
                                        <Button className="btn btn-dark btn-sm">
                                            Configurar variables
                                        </Button>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>

                </div>
            </div>
            {/* < VENTANA MODAL AGREGAR> */}
            <ModalAgregarEstacion show={show} handleClose={handleClose} external_id={external_id} />

            <Footer />
        </div>

    );
}

export default ListaEstaciones;
