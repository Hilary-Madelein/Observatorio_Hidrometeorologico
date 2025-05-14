import { borrarSesion } from '../utils/SessionUtil';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import '../css/Microcuenca_Style.css';
import '../css/Principal_Style.css';
import 'boxicons';
import Header from './Header';
import Footer from './Footer';
import React, { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import ModalAgregarVariable from './ModalAgregarVariable';
import { ObtenerGet } from '../hooks/Conexion';
import { URLBASE } from '../hooks/Conexion'; // Asegúrate de tener esto

const ListaVariables = () => {
    const navegation = useNavigate();
    const [variables, setVariables] = useState([]);

    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    useEffect(() => {
        ObtenerGet(getToken(), '/listar/tipo_medida').then((info) => {
            if (info.code !== 200 && info.msg === 'Acceso denegado. Token ha expirado') {
                borrarSesion();
                mensajes(info.msg);
                navegation("/admin");
            } else {
                setVariables(info.info);
                console.log(info.info);
            }
        });
    }, [navegation]);

    return (
        <div className="pagina-microcuencas">
            <Header />
            <div className="container-microcuenca shadow-lg rounded p-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 style={{ fontWeight: 'bold', color: '#0C2840' }}>Variables Hidrometeorológicas Registradas</h1>
                    <button type="button" className="btn btn-outline-success" onClick={handleShow}>
                        Agregar Variable
                    </button>
                </div>
                <div className="table-responsive">
                    <Table striped bordered hover className="text-center align-middle">
                        <thead className="table-dark">
                            <tr>
                                <th>Icono</th>
                                <th>Nombre</th>
                                <th>Unidad</th>
                                <th>Operaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variables.map((variable, index) => (
                                <tr key={index}>
                                    <td>
                                        <img
                                            src={URLBASE + "/images/icons_estaciones/" + variable.icono}
                                            alt={`Icono de ${variable.nombre}`}
                                            style={{ width: '40px', height: '40px' }}
                                        />
                                    </td>
                                    <td>{variable.nombre}</td>
                                    <td>{variable.unidad}</td>
                                    <td>
                                        {variable.operaciones && variable.operaciones.length > 0
                                            ? variable.operaciones.join(', ')
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </div>

            <ModalAgregarVariable show={show} handleClose={handleClose} />
            <Footer />
        </div>
    );
};

export default ListaVariables;
