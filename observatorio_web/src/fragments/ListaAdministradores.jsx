import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, InputGroup, FormControl, Table, Pagination } from 'react-bootstrap';
import swal from 'sweetalert';
import Header from './Header';
import Footer from './Footer';
import { getUser, borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import { ObtenerGet } from '../hooks/Conexion';
import { URLBASE } from '../hooks/Conexion';
import ModalAgregarAdmin from './ModalAgregarAdmin';

const ListaAdministradores = () => {
  const navigate = useNavigate();
  const currentUser = getUser();
  const currentId = currentUser?.entidad?.external_id;

  const [admins, setAdmins] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [mostrarActivos, setMostrarActivos] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const handleSearchChange = e => setSearchTerm(e.target.value);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const cargarDatos = useCallback(async () => {
    const ruta = `/listar/entidad?estadoCuenta=${mostrarActivos}`;
    try {
      const info = await ObtenerGet(getToken(), ruta);
      if (info.code === 200) setAdmins(info.info);
      else if (info.msg.includes('Token')) {
        mensajes(info.msg, 'error');
        borrarSesion();
        navigate('/admin');
      } else {
        mensajes(info.msg, 'error');
      }
    } catch (err) {
      console.error(err);
      mensajes('Error cargando administradores', 'error');
    }
  }, [mostrarActivos, navigate]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleEditClick = (admin) => {
    setSelectedAdmin(admin.external_id);
    setShowEdit(true);
  };

  const handleToggleEstado = async (admin) => {
    if (admin.external_id === currentId) return; 
    swal({
      title: '¿Cambiar estado?',
      text: `Esta acción ${mostrarActivos ? 'desactivará' : 'activará'} a ${admin.name}`,
      icon: 'warning', buttons: ['No', 'Sí'], dangerMode: true
    }).then(async ok => {
      if (!ok) return;
      const nuevo = mostrarActivos ? 'DENEGADO' : 'ACEPTADO';
      const res = await ObtenerGet(
        getToken(),
        `modificar/cuenta-status?external_id=${admin.external_id}&nuevoEstado=${nuevo}`
      );
      mensajes(res.msg, res.code === 200 ? 'success' : 'error');
      cargarDatos();
    });
  };

  const filtered = admins.filter(a =>
    [a.name, a.lastname, a.account.email]
      .some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const indexLast = currentPage * rowsPerPage;
  const indexFirst = indexLast - rowsPerPage;
  const currentRows = filtered.slice(indexFirst, indexLast);

  const handlePageChange = page => setCurrentPage(page);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    if (currentPage > 1) items.push(<Pagination.Prev key='prev' onClick={() => handlePageChange(currentPage - 1)} />);
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(currentPage - i) <= 1) {
        items.push(
          <Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>
            {i}
          </Pagination.Item>
        );
      } else if ((i === currentPage - 2 && currentPage > 3) || (i === currentPage + 2 && currentPage < totalPages - 2)) {
        items.push(<Pagination.Ellipsis key={`e-${i}`} disabled />);
      }
    }
    if (currentPage < totalPages) items.push(<Pagination.Next key='next' onClick={() => handlePageChange(currentPage + 1)} />);
    return <Pagination className='justify-content-center mt-3'>{items}</Pagination>;
  };

  return (
    <div className='pagina-microcuencas'>
      <Header />
      <div className='container-microcuenca shadow-lg rounded p-4'>
        <div className='d-flex flex-wrap align-items-center mb-4'>
          <h2 className='titulo-admin'>Administradores {mostrarActivos ? 'Activos' : 'Inactivos'}</h2>
          <div className='ms-auto d-flex gap-2'>
            <Button variant='outline-secondary' onClick={() => setMostrarActivos(!mostrarActivos)}>
              {mostrarActivos ? 'Ver Inactivos' : 'Ver Activos'}
            </Button>
            {mostrarActivos && (
              <Button className='btn-registrar' onClick={() => { setSelectedAdmin(null); setShowAdd(true); }}>
                <i class="bi bi-clipboard2-plus me-2"></i>
                Agregar
              </Button>
            )}
          </div>
        </div>

        <InputGroup className='buscar-input mb-3 input-group-custom'>
          <InputGroup.Text><i className='bi bi-search'></i></InputGroup.Text>
          <FormControl placeholder='Buscar por nombre, email...' value={searchTerm} onChange={handleSearchChange} />
        </InputGroup>

        {currentRows.length === 0 ? (
          <p className='text-center text-muted'>No hay registros.</p>
        ) : (
          <div className='table-responsive'>
            <Table striped bordered hover className='text-center align-middle table-custom'>
              <thead className='table-light'>
                <tr>
                  <th>Avatar</th>
                  <th>Nombre</th>
                  <th>Telefono</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map(admin => (
                  <tr key={admin.external_id}>
                    <td>
                      <img
                        src={`${URLBASE}/images/users/${admin.picture || 'USUARIO_ICONO.png'}`}
                        alt='avatar'
                        style={{ width: 40, height: 40, borderRadius: '50%' }}
                      />
                    </td>
                    <td>{admin.name} {admin.lastname}</td>
                    <td>{admin.phone}</td>
                    <td>{admin.account.email}</td>
                    <td>
                      {admin.account.status ? (
                        <span className='badge bg-success'>Activo</span>
                      ) : (
                        <span className='badge bg-danger'>Inactivo</span>
                      )}
                    </td>
                    <td>
                      <div className='d-flex justify-content-center gap-2'>
                        <Button size='sm' variant='info' onClick={() => handleEditClick(admin)}>
                          <i className='bi bi-pencil-square'></i>
                        </Button>
                        <Button
                          size='sm'
                          variant={admin.external_id === currentId ? 'secondary' : (mostrarActivos ? 'danger' : 'primary')}
                          disabled={admin.external_id === currentId}
                          onClick={() => handleToggleEstado(admin)}
                        >
                          {mostrarActivos ? (
                            <i className='bi bi-trash-fill'></i>
                          ) : (
                            <i className='bi bi-arrow-repeat'></i>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {renderPagination()}
          </div>
        )}

        <ModalAgregarAdmin
          show={showAdd}
          external_id_admin={null}
          onClose={() => setShowAdd(false)}
          onSaved={cargarDatos}
        />
        <ModalAgregarAdmin
          show={showEdit}
          external_id_admin={selectedAdmin}
          onClose={() => setShowEdit(false)}
          onSaved={cargarDatos}
        />
      </div>
      <Footer />
    </div>
  );
};

export default ListaAdministradores;
