// ListaVariables.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormControl, InputGroup, Table, Pagination } from 'react-bootstrap';
import swal from 'sweetalert';
import Header from './Header';
import Footer from './Footer';
import '../css/Table_Style.css';
import ModalAgregarVariable from './ModalAgregarVariable';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import { ObtenerGet } from '../hooks/Conexion';
import { URLBASE } from '../hooks/Conexion';

const ListaVariables = () => {
    const navegation = useNavigate();
    const [variables, setVariables] = useState([]);
    const [mostrarActivos, setMostrarActivos] = useState(true);

    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [showEdit, setShowEdit] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const handleEditClose = () => {
        setShowEdit(false);
        setSelectedId(null);
    };
    const handleEditClick = variableId => {
        setSelectedId(variableId);
        setShowEdit(true);
    };

    const [searchTerm, setSearchTerm] = useState('');
    const handleSearchChange = e => setSearchTerm(e.target.value);

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5;

    const cargarDatos = useCallback(() => {
        const ruta = mostrarActivos
            ? '/listar/tipo_medida'
            : '/listar/tipo_medida/desactivos';

        (async () => {
            try {
                const info = await ObtenerGet(getToken(), ruta);

                if (info.code === 200) {
                    if (Array.isArray(info.info)) {
                        setVariables(info.info);
                    } else {
                        mensajes('No se encontraron tipos de medida válidos', 'info', 'Información');
                        setVariables([]);
                    }

                } else if (info.msg === 'Acceso denegado. Token ha expirado') {
                    mensajes(info.msg, 'error', 'Error');
                    borrarSesion();
                    navegation('/admin');

                } else {
                    mensajes(info.msg || 'Error desconocido cargando tipos de medida', 'error', 'Error');
                }

            } catch (error) {
                console.error('Error cargando tipos de medida:', error);
                mensajes('Error cargando tipos de medida. Intente de nuevo más tarde.', 'error', 'Error');
            }
        })();
    }, [mostrarActivos, navegation]);


    useEffect(() => {
        cargarDatos();
    }, [mostrarActivos, cargarDatos]);

    const handleToggleEstado = externalId => {
        swal({
            title: "¿Está seguro de cambiar el estado?",
            text: "Este cambio afectará la disponibilidad de la variable.",
            icon: "warning",
            buttons: ["Cancelar", "Sí, cambiar estado"],
            dangerMode: true,
        }).then(async confirm => {
            if (!confirm) return;
            try {
                const res = await ObtenerGet(getToken(), `/tipo_fenomeno/cambiar_estado/${externalId}`);
                if (res.code === 200) {
                    mensajes(res.msg, "success");
                    cargarDatos();
                } else {
                    mensajes(res.msg, "error");
                }
            } catch (err) {
                console.error("Error al cambiar estado:", err);
                mensajes("Error al cambiar el estado", "error");
            }
        });
    };

    const filteredData = variables.filter(variable => {
        const lower = searchTerm.toLowerCase();
        return variable.nombre?.toLowerCase().includes(lower);
    });

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

    const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const pages = [];

        if (currentPage > 1) {
            pages.push(
                <Pagination.Prev key="prev" onClick={() => handlePageChange(currentPage - 1)} />
            );
        }

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(currentPage - i) <= 1) {
                pages.push(
                    <Pagination.Item
                        key={i}
                        active={i === currentPage}
                        onClick={() => handlePageChange(i)}
                    >
                        {i}
                    </Pagination.Item>
                );
            } else if (
                (i === currentPage - 2 && currentPage > 3) ||
                (i === currentPage + 2 && currentPage < totalPages - 2)
            ) {
                pages.push(<Pagination.Ellipsis key={`ellipsis-${i}`} disabled />);
            }
        }

        if (currentPage < totalPages) {
            pages.push(
                <Pagination.Next key="next" onClick={() => handlePageChange(currentPage + 1)} />
            );
        }

        return <Pagination className="justify-content-center mt-4">{pages}</Pagination>;
    };

    return (
        <div className="pagina-microcuencas">
            <Header />
            <div className="container-microcuenca shadow-lg rounded p-5">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
                    <h1 className='titulo-admin'>Variables {mostrarActivos ? 'activas' : 'inactivas'}</h1>
                    <div className="d-flex ms-auto flex-wrap align-items-center gap-2">
                        <button className="btn btn-outline-secondary" onClick={() => setMostrarActivos(!mostrarActivos)}>
                            {mostrarActivos ? 'Ver inactivas' : 'Ver activas'}
                        </button>
                        {mostrarActivos && (
                            <button type="button" className="btn btn-registrar" onClick={handleShow}>
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

                {currentRows.length === 0 ? (
                    <p className="no-data-message">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        No existen registros.</p>
                ) : (
                    <div className="table-responsive">
                        <Table striped bordered hover className="text-center align-middle table-custom">
                            <thead className="table-light">
                                <tr>
                                    <th>Icono</th>
                                    <th>Nombre</th>
                                    <th>Unidad</th>
                                    <th>Estado</th>
                                    <th>Operaciones</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentRows.map((variable, index) => (
                                    <tr key={index}>
                                        <td><img src={`${URLBASE}/images/icons_estaciones/${variable.icono}`} alt={variable.nombre} style={{ width: '40px' }} /></td>
                                        <td>{variable.nombre}</td>
                                        <td>{variable.unidad}</td>
                                        <td>
                                            {variable.estado ? (
                                                <span className="badge bg-success">Activo</span>
                                            ) : (
                                                <span className="badge bg-danger">Inactivo</span>
                                            )}
                                        </td>
                                        <td>{variable.operaciones?.join(', ') || '—'}</td>
                                        <td>
                                            <div className="d-flex justify-content-center gap-2">
                                                <button className="btn btn-outline-info" onClick={() => handleEditClick(variable.external_id)} disabled={!mostrarActivos}>
                                                    <i className="bi bi-pencil-square"></i>
                                                </button>
                                                <button className="btn btn-outline-danger" onClick={() => handleToggleEstado(variable.external_id)}>
                                                    {mostrarActivos ? (
                                                        <i className="bi bi-trash-fill"></i>
                                                    ) : (
                                                        <i className="bi bi-arrow-repeat"></i>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        <div className="d-flex justify-content-end">
                            {renderPagination()}
                        </div>
                    </div>
                )}
            </div>

            <ModalAgregarVariable show={show} handleClose={handleClose} />
            <ModalAgregarVariable show={showEdit} handleClose={handleEditClose} external_id_variable={selectedId} />
            <Footer />
        </div>
    );
};

export default ListaVariables;
