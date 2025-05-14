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
import { FormControl, InputGroup, Table } from 'react-bootstrap';
import ModalAgregarVariable from './ModalAgregarVariable';
import { ObtenerGet } from '../hooks/Conexion';
import { URLBASE } from '../hooks/Conexion';

const ListaVariables = () => {
    const navegation = useNavigate();
    const [variables, setVariables] = useState([]);

    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        ObtenerGet(getToken(), '/listar/tipo_medida').then((info) => {
            if (info.code !== 200 && info.msg === 'Acceso denegado. Token ha expirado') {
                borrarSesion();
                mensajes(info.msg);
                navegation("/admin");
            } else {
                setVariables(info.info);
            }
        });
    }, [navegation]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredData = variables.filter((variable) => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (
            (variable.nombre && variable.nombre.toLowerCase().includes(lowerCaseSearchTerm))
        );
    });

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

                {filteredData.length === 0 ? (
                    <p className="no-data-message">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16" style={{ marginRight: '5px' }}>
                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2" />
                        </svg>
                        No existen registros.</p>
                ) : (
                    <div className="table-responsive">
                        <Table striped bordered hover className="text-center align-middle">
                            <thead className="table-ligth">
                                <tr>
                                    <th>Icono</th>
                                    <th>Nombre</th>
                                    <th>Unidad</th>
                                    <th>Operaciones</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>

                                {filteredData.map((variable, index) => (
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
                                        <td>
                                            <div className="d-flex justify-content-center gap-2">
                                                <button className="btn btn-outline-info" onClick={() => console.log('Eliminar variable', variable.external_id)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
                                                        <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
                                                        <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z" />
                                                    </svg>
                                                </button>
                                                <button className="btn btn-outline-danger" onClick={() => console.log('Eliminar variable', variable.external_id)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-trash-fill" viewBox="0 0 16 16">
                                                        <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0" />
                                                    </svg>
                                                </button>
                                            </div>

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
