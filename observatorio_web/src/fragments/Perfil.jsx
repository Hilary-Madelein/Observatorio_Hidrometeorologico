import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import mensajes from '../utils/Mensajes';
import { getToken, getUser, borrarSesion } from '../utils/SessionUtil';
import { ActualizarImagenes, ObtenerPost, URLBASE } from '../hooks/Conexion';
import 'boxicons/css/boxicons.min.css';
import '../css/Perfil_Style.css';
import '../css/Principal_Style.css';
import '../css/ModalEstacion_Style.css';
import '../css/Microcuenca_Style.css';

export default function Perfil() {
  const navigate = useNavigate();
  const token = getToken();
  const userLocal = getUser();
  let externalId = userLocal?.entidad?.external_id;
  const entidadId = userLocal?.entidad?.id;
  const email = userLocal?.correo;

  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(
    userLocal?.entidad?.picture
      ? `${URLBASE}/images/users/${userLocal.entidad.picture}`
      : `${URLBASE}/images/users/USUARIO_ICONO.png`
  );
  const [fotoFile, setFotoFile] = useState(null);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm();

  const {
    register: regPass,
    handleSubmit: handlePassSubmit,
    watch: watchPass,
    reset: resetPassForm,
    formState: { errors: passErrors }
  } = useForm();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Load initial values
  useEffect(() => {
    if (!userLocal) {
      borrarSesion();
      navigate('/admin');
      return;
    }
    setValue('nombres', userLocal.nombres);
    setValue('apellidos', userLocal.apellidos);
    setValue('telefono', userLocal.entidad?.phone || '');
  }, [userLocal, setValue, navigate]);

  if (!token || !userLocal) {
    return <div className='loading-screen'>Redirigiendo a login...</div>;
  }

  // Handlers
  const onFotoChange = e => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const eliminarFoto = () => {
    setFotoFile(null);
    setFotoPreview(
      userLocal?.entidad?.picture
        ? `${URLBASE}/images/users/${userLocal.entidad.picture}`
        : `${URLBASE}/images/users/USUARIO_ICONO.png`
    );
  };

  const handleCancelProfile = () => {
    eliminarFoto();
    setValue('nombres', userLocal.nombres);
    setValue('apellidos', userLocal.apellidos);
    setValue('telefono', userLocal.entidad?.phone || '');
    setEditMode(false);
  };

  const onSubmitProfile = async data => {
    const formData = new FormData();
    formData.append('external_id', externalId);
    formData.append('entidad_id', entidadId);
    formData.append('nombres', data.nombres.trim());
    formData.append('apellidos', data.apellidos.trim());
    formData.append('telefono', data.telefono.trim());
    formData.append('correo', email);
    formData.append('estado', String(userLocal.entidad.status));
    if (fotoFile) formData.append('foto', fotoFile);

    try {
      const res = await ActualizarImagenes(formData, token, '/modificar/entidad');
      if (res.code === 200) {
        mensajes(res.msg, 'success');
        mensajes('Para confirmar cambios, debe volver a iniciar sesión.', 'info');
        setTimeout(() => {
          borrarSesion();
          navigate('/admin');
        }, 1500);
      } else {
        mensajes(res.msg, 'error');
        if (res.msg === 'Acceso denegado. Token ha expirado')
          navigate('/admin');
          borrarSesion();
      }
    } catch (err) {
      console.error(err);
      mensajes('Error en servidor', 'error');
    }
  };

  const onSubmitPassword = async data => {
    if (data.newPassword !== data.confirmNewPassword) {
      mensajes('Las contraseñas no coinciden', 'warning');
      return;
    }
    try {
      const body = {
        external_id: externalId,
        email,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      };
      const res = await ObtenerPost(token, 'cambiar-clave/entidad', body);
      if (res.code === 200) {
        mensajes(res.msg, 'success');
        mensajes('Para confirmar cambios, debe volver a iniciar sesión.', 'info');
        setTimeout(() => {
          borrarSesion();
          navigate('/admin');
        }, 1500);
      } else {
        mensajes(res.msg, 'error');
      }
    } catch (err) {
      console.error(err);
      mensajes('Error en servidor', 'error');
    }
  };

  const handleCancelPassword = () => {
    setShowPasswordForm(false);
    resetPassForm();
  };

  return (
    <div className='pagina-microcuencas'>
      <Header />
      <div className='container-microcuenca'>
        <h2 className='titulo-admin'><i className='bx bx-user'></i> Perfil de Usuario</h2>
        <form onSubmit={handleSubmit(onSubmitProfile)} autoComplete="off">
          <div className='row'>
            <div className='col-md-4 text-center'>
              <img src={fotoPreview} alt='Avatar' className='img-fluid mb-2' style={{ borderRadius: 4 }} />
              {editMode && (
                <>
                  <button type='button' className='btn-registrar w-100 mb-1' onClick={() => fileInputRef.current.click()}>
                    <i className='bx bx-camera me-1'></i> Seleccionar
                  </button>
                  {fotoFile && (
                    <button type='button' className='btn-cancelar-modal w-100' onClick={eliminarFoto}>
                      <i className='bx bx-trash me-2'></i> Eliminar Foto
                    </button>
                  )}
                  <input type='file' ref={fileInputRef} onChange={onFotoChange} style={{ display: 'none' }} />
                </>
              )}
            </div>
            <div className='col-md-8 container-modal'>
              <div className='row'>
                <div className='col-md-6 form-group'>
                  <label>Nombres</label>
                  <input type='text' className='form-control' {...register('nombres', { required: true })} disabled={!editMode} />
                </div>
                <div className='col-md-6 form-group'>
                  <label>Apellidos</label>
                  <input type='text' className='form-control' {...register('apellidos', { required: true })} disabled={!editMode} />
                </div>
                <div className='col-md-6 form-group'>
                  <label>Teléfono</label>
                  <input type='tel' className='form-control' {...register('telefono')} disabled={!editMode} />
                </div>
                <div className='col-md-6 form-group'>
                  <label>Correo</label>
                  <input type='email' className='form-control bg-light' value={email} disabled />
                </div>
              </div>
              <div className='text-end mt-3'>
                {editMode ? (
                  <div className='d-flex justify-content-end gap-2'>
                    <button type='button' className='btn-cancelar-modal' onClick={handleCancelProfile}><i className='bx bx-x-circle me-2'></i> Cancelar</button>
                    <button type='submit' className='btn btn-registrar-modal me-2'><i className='bx bx-save me-2'></i> Guardar</button>
                  </div>
                ) : (
                  <button type='button' className='btn-registrar' onClick={() => setEditMode(true)}><i className='bx bx-edit me-2'></i> Editar Perfil</button>
                )}
              </div>
            </div>
          </div>
        </form>
        <hr />
        <div className='text-end mb-3'>
          <button className='btn-registrar' onClick={() => setShowPasswordForm(!showPasswordForm)}><i className='bx bx-key me-2'></i> Cambiar Clave</button>
        </div>
        {showPasswordForm && (
          <div className='container-modal'>
            <form onSubmit={handlePassSubmit(onSubmitPassword)} autoComplete='off'>
              <div className='row'>
                <div className='col-md-4 form-group mb-3'>
                  <label>Clave Actual</label>
                  <div className='input-group'>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className='form-control'
                      autoComplete='current-password'
                      {...regPass('currentPassword', { required: true })}
                    />
                    <span className='input-group-text' onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ cursor: 'pointer' }}>
                      <i className={showCurrentPassword ? 'bx bx-hide' : 'bx bx-show'}></i>
                    </span>
                  </div>
                  {passErrors.currentPassword && (
                    <small className='text-danger'>La clave actual es obligatoria</small>
                  )}
                </div>
                <div className='col-md-4 form-group mb-3'>
                  <label>Nueva Clave</label>
                  <div className='input-group'>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className='form-control'
                      autoComplete='new-password'
                      {...regPass('newPassword', { required: true, minLength: 8 })}
                    />
                    <span className='input-group-text' onClick={() => setShowNewPassword(!showNewPassword)} style={{ cursor: 'pointer' }}>
                      <i className={showNewPassword ? 'bx bx-hide' : 'bx bx-show'}></i>
                    </span>
                  </div>
                  {passErrors.newPassword?.type === 'required' && (
                    <small className='text-danger'>La nueva clave es obligatoria</small>
                  )}
                  {passErrors.newPassword?.type === 'minLength' && (
                    <small className='text-danger'>La nueva clave debe tener al menos 8 caracteres</small>
                  )}
                </div>
                <div className='col-md-4 form-group mb-3'>
                  <label>Confirmar Clave</label>
                  <div className='input-group'>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className='form-control'
                      autoComplete='new-password'
                      {...regPass('confirmNewPassword', { required: true, validate: val => val === watchPass('newPassword') })}
                    />
                    <span className='input-group-text' onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ cursor: 'pointer' }}>
                      <i className={showConfirmPassword ? 'bx bx-hide' : 'bx bx-show'}></i>
                    </span>
                  </div>
                  {passErrors.confirmNewPassword && (
                    <small className='text-danger'>Las claves no coinciden</small>
                  )}
                </div>
              </div>
              <div className='d-flex justify-content-end gap-2'>
                <button type='button' className='btn-cancelar-modal' onClick={handleCancelPassword}><i class="bi bi-x-circle me-2"></i> Cancelar</button>
                <button type='submit' className='btn btn-registrar-modal me-2' disabled={!!passErrors.confirmNewPassword}>
                  <i className='bx bx-lock-alt me-2'></i> Actualizar clave
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
