import React, { useState, useEffect } from 'react';
import { Button, InputGroup, FormControl } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { getToken, borrarSesion } from '../utils/SessionUtil';
import mensajes, { mensajesConRecarga } from '../utils/Mensajes';
import { GuardarImages, ObtenerGet, ActualizarImagenes } from '../hooks/Conexion';
import swal from 'sweetalert';
import '../css/ModalEstacion_Style.css';

export default function AgregarAdmin({ external_id_admin, onSaved }) {
  const { register, setValue, handleSubmit, formState: { errors } } = useForm();
  const [modoEdicion, setModoEdicion] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [estadoCuenta, setEstadoCuenta] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!external_id_admin) return;
      try {
        const res = await ObtenerGet(getToken(), `/obtener/entidad/${external_id_admin}`);
        
        if (res.code === 200) {
          setModoEdicion(true);
          const info = res.info;
          setValue('nombres', info.name);
          setValue('apellidos', info.lastname);
          setValue('telefono', info.phone);
          setValue('correo', info.account.email);
          setEstadoCuenta(info.account.status);
          
        } else {
          mensajes(res.msg, 'error');
        }
      } catch (err) {
        mensajes('Error obteniendo administrador', 'error');
      }
    };
    fetchData();
  }, [external_id_admin, setValue]);

  const handlePhotoChange = e => {
    const file = e.target.files[0];
    if (file) setUploadedPhoto(file);
  };
  const handleRemovePhoto = () => setUploadedPhoto(null);

  const handleCancelClick = () => {
    swal({
      title: '¿Cancelar operación?',
      text: 'Los cambios no guardados se perderán.',
      icon: 'warning',
      buttons: ['No', 'Sí, cancelar'],
      dangerMode: true,
    }).then(willCancel => {
      if (willCancel) {
        mensajesConRecarga('Operación cancelada', 'info', 'Cancelado');
      }
    });
  };
  
  const submitData = data => {
    const formData = new FormData();
    if (modoEdicion) formData.append('external_id', external_id_admin);
    formData.append('nombres', data.nombres);
    formData.append('apellidos', data.apellidos);
    formData.append('telefono', data.telefono);
    formData.append('correo', data.correo);
    formData.append('estado', String(estadoCuenta));
    formData.append('rol', 'ADMINISTRADOR');
    if (!modoEdicion || data.clave) formData.append('clave', data.clave);
    if (uploadedPhoto) formData.append('foto', uploadedPhoto);

    const endpoint = modoEdicion ? '/modificar/entidad' : '/guardar/entidad';
    const action = modoEdicion ? ActualizarImagenes : GuardarImages;

    action(formData, getToken(), endpoint)
      .then(res => {
        if (res.code === 200) {
          mensajesConRecarga(res.msg, 'success', modoEdicion ? 'Actualizado' : 'Guardado');
          onSaved();
        } else if (res.msg.includes('Token')) {
          mensajes(res.msg, 'error');
          borrarSesion();
        } else {
          mensajes(res.msg, 'error', 'Error');
        }
      })
      .catch(err => {
        console.error(err);
        mensajes('Error en servidor', 'error', 'Error');
      });
  };

  const onSubmit = data => {
    swal({
      title: modoEdicion ? '¿Actualizar administrador?' : '¿Crear administrador?',
      icon: 'warning',
      buttons: ['No', 'Sí'],
      dangerMode: true,
    }).then(willProceed => {
      if (willProceed) submitData(data);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="container-modal" encType="multipart/form-data">
      <div className="col-12 form-group mb-3">
        <label><strong style={{ color: 'red' }}>* </strong>Nombres</label>
        <input
          {...register('nombres', { required: 'Ingrese un nombre',
            pattern: {
                value: /^(?!\s*$)[a-zA-Z\s]+(?<![<>])$/,
                message: "Ingrese un nombre correcto"
            } })}
          className="form-control form-control-user"
        />
        {errors.nombres && <small className='alert alert-danger'>{errors.nombres.message}</small>}
      </div>

      <div className="form-group mb-3">
        <label><strong style={{ color: 'red' }}>* </strong>Apellidos</label>
        <input
          {...register('apellidos', { required: 'Ingrese un nombre',
            pattern: {
                value: /^(?!\s*$)[a-zA-Z\s]+(?<![<>])$/,
                message: "Ingrese un apellido correcto"
            } })}
          className="form-control form-control-user"
        />
        {errors.apellidos && <small className='alert alert-danger'>{errors.apellidos.message}</small>}
      </div>

      <div className="form-group mb-3">
        <label><strong style={{ color: 'red' }}>* </strong>Teléfono</label>
        <input
          {...register('telefono', {
            required: 'Ingrese un telefono', pattern: {
                value: /^-?\d+(\.\d+)?$/,
                message: 'Ingrese un número correcto'
            }
        })}
          className="form-control form-control-user"
        />
        {errors.telefono && <small className='alert alert-danger'>{errors.telefono.message}</small>}
      </div>

      <div className="form-group mb-3">
        <label><strong style={{ color: 'red' }}>* </strong>Correo</label>
        <input
          {...register('correo', {
            required: 'Ingrese un correo',
            pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Email inválido' }
          })}
          className="form-control form-control-user"
        />
        {errors.correo && <small className='alert alert-danger'>{errors.correo.message}</small>}
      </div>

      {!modoEdicion && (
        <div className="form-group mb-3">
          <label><strong style={{ color: 'red' }}>* </strong>Clave</label>
          <input
            type="password"
            {...register('clave', { required: 'Ingrese una clave', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
            className="form-control form-control-user"
          />
          {errors.clave && <small className='alert alert-danger'>{errors.clave.message}</small>}
        </div>
      )}

      <div className="form-group mb-3">
        <label>Foto (opcional)</label>
        <InputGroup>
          <FormControl type="file" onChange={handlePhotoChange} />
          {uploadedPhoto && (
            <Button variant="outline-danger" onClick={handleRemovePhoto}>X</Button>
          )}
        </InputGroup>
      </div>

      <div className="d-flex justify-content-end gap-2">
        <Button className='btn btn-cancelar-modal' onClick={handleCancelClick}><i className="bi bi-x-circle-fill me-2"></i>Cancelar</Button>
        <Button type="submit" className='btn btn-registrar-modal'><i className="bi bi-floppy-fill me-2"></i>{modoEdicion ? 'Actualizar' : 'Guardar'}</Button>
      </div>
    </form>
  );
}