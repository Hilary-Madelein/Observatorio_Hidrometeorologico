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
import { URLBASE } from '../hooks/Conexion'; 

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
                    <h1 className='titulo-admin'>Variables hidrometeorológicas registradas</h1>
                    <button type="button" className="btn btn-registrar" onClick={handleShow}>
                        Agregar Variable
                    </button>
                </div>
                {variables.length === 0 ? (
                    <p className="no-data-message">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16" style={{ marginRight: '5px' }}>
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2" />
                        </svg>
                        No existen variables registradas.</p>
                ) : (
                    <div className="table-responsive">
                        <Table striped bordered hover className="text-center align-middle">
                            <thead className="table-ligth">
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
                )}
            </div>

            <ModalAgregarVariable show={show} handleClose={handleClose} />
            <Footer />
        </div>
    );
};

export default ListaVariables;
