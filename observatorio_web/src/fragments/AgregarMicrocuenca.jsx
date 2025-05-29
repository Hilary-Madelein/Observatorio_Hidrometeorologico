import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes, { mensajesConRecarga } from '../utils/Mensajes';
import { GuardarImages, ObtenerGet, ActualizarImagenes } from '../hooks/Conexion';
import swal from 'sweetalert';

function AgregarMicrocuenca({ external_id, onClose }) {
    const { register, setValue, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const [descripcion, setDescripcion] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [uploadedPhoto, setUploadedPhoto] = useState(null);
    const [modoEdicion, setModoEdicion] = useState(false);
    const maxCaracteres = 350;

    const handleDescripcionChange = (event) => {
        const { value } = event.target;
        if (value.length <= maxCaracteres) {
            setDescripcion(value);
        }
    };

    const handleRemovePhoto = () => {
        setUploadedPhoto(null);
        setValue("foto", null);
    };

    const toggleModal = () => {
        setShowModal(!showModal);
    };

    const handlePhotoChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setUploadedPhoto(file);
        }
    };

    useEffect(() => {
        const fetchMicrocuenca = async () => {
            if (!external_id) return;
            try {
                const response = await ObtenerGet(getToken(), `/obtener/microcuenca/${external_id}`);
                if (response.code === 200) {
                    setModoEdicion(true);
                    setValue('nombre', response.info.name);
                    setValue('descripcion', response.info.description);
                    setDescripcion(response.info.description);
                } else {
                    mensajes(`Error al obtener microcuenca: ${response.msg}`, 'error');
                }
            } catch (error) {
                mensajes('Error al procesar la solicitud', 'error');
            }
        };

        fetchMicrocuenca();
    }, [external_id, setValue]);


    const onSubmit = data => {
        const formData = new FormData();
        formData.append('external_id', external_id);
        formData.append('nombre', data.nombre.toUpperCase());
        formData.append('descripcion', data.descripcion);
        if (data.foto && data.foto[0]) {
          formData.append('foto', data.foto[0]);
        }
      
        const endpoint = modoEdicion
          ? '/modificar/microcuenca'
          : '/guardar/microcuenca';
        const funcionGuardar = modoEdicion ? ActualizarImagenes : GuardarImages;
      
        funcionGuardar(formData, getToken(), endpoint)
          .then(info => {
            if (info.code === 200) {
              mensajesConRecarga(info.msg);
      
            } else if (info.msg === 'Acceso denegado. Token ha expirado') {
              mensajes(info.msg, 'error', 'Error');
              borrarSesion();
              navigate('/admin');
      
            } else {
              mensajes(info.msg, 'error', 'Error');
            }
          })
          .catch(err => {
            console.error('Error guardando microcuenca:', err);
            mensajes('Ocurrió un error inesperado. Intente de nuevo más tarde.', 'error', 'Error');
          });
      };

    const handleCancelClick = () => {
        swal({
            title: "¿Está seguro de cancelar la operación?",
            text: "Una vez cancelado, no podrá revertir esta acción",
            icon: "warning",
            buttons: ["No", "Sí"],
            dangerMode: true,
        }).then((willCancel) => {
            if (willCancel) {
                mensajesConRecarga("Operación cancelada", "info", "Información");
                navigate('/principal/admin');
            }
        });
    };

    return (
        <div className="wrapper">
            <form className="user" onSubmit={handleSubmit(onSubmit)} encType="multipart/form-data">
                <div className="container-modal">
                    {/* Nombre */}
                    <div className="form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}><strong style={{ color: 'red' }}>* </strong>Nombre</label>
                        <input type="text" {...register('nombre', {
                            required: 'Ingrese un nombre',
                            pattern: {
                                value: /^(?!\s*$)[a-zA-Z\s]+(?<![<>])$/,
                                message: "Ingrese un nombre correcto"
                            }
                        })} className="form-control form-control-user" placeholder="Ingrese el nombre" />
                        {errors.nombre && <div className='alert alert-danger'>{errors.nombre.message}</div>}
                    </div>

                    {/* Descripción */}
                    <div className="form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '20px' }}><strong style={{ color: 'red' }}>* </strong>Descripción</label>
                        <textarea
                            {
                            ...register('descripcion', {
                                required: 'Ingrese una descripción',
                                pattern: {
                                    value: new RegExp("^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\\s/%.,()\\-]+$"),
                                    message: 'Ingrese una descripción correcta'
                                }
                            })
                            }

                            className="form-control form-control-user"
                            placeholder="Ingrese la descripción"
                            value={descripcion}
                            onChange={handleDescripcionChange}
                        />
                        {errors.descripcion && <div className='alert alert-danger'>{errors.descripcion.message}</div>}
                        <div className="d-flex justify-content-between mt-1">
                            <small className="text-muted">{descripcion.length}/{maxCaracteres} caracteres</small>
                            {descripcion.length === maxCaracteres && <small className="text-danger">Máximo alcanzado</small>}
                        </div>
                    </div>

                    {/* Foto */}
                    <div className="form-group mb-3">
                        <label htmlFor="foto" className="form-label"><strong style={{ color: 'red' }}>* </strong>Seleccionar foto</label>
                        <input type="file"
                            {...register("foto", {
                                validate: fileList => {
                                    if (!modoEdicion && (!fileList || fileList.length === 0)) {
                                        return "Seleccione una foto";
                                    }
                                    return true;
                                }
                            })}
                            onChange={handlePhotoChange}
                            className="form-control"
                        />
                        {uploadedPhoto && (
                            <div className="d-flex align-items-center mt-3 justify-content-end">
                                <button type="button" className="btn btn-info btn-sm me-2 btn-mini" onClick={toggleModal}>
                                    <i class="bi bi-eye-fill"></i>
                                </button>
                                <button type="button" className="btn btn-danger btn-sm btn-mini" onClick={handleRemovePhoto}>
                                    <i class="bi bi-trash-fill"></i>
                                </button>
                            </div>
                        )}
                        {errors.foto && <div className='alert alert-danger'>{errors.foto.message}</div>}
                    </div>

                    {/* Modal Previsualización */}
                    {showModal && (
                        <div className="modal show" tabIndex="-1" style={{ display: 'block' }}>
                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title titulo-secundario">Previsualización</h5>
                                        <button type="button" className="btn-close" onClick={toggleModal} aria-label="Close"></button>
                                    </div>
                                    <div className="modal-body text-center">
                                        <img
                                            src={URL.createObjectURL(uploadedPhoto)}
                                            alt="Vista previa"
                                            className="img-fluid"
                                            style={{ maxWidth: '100%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Botones */}
                <div className="btn-Modal d-flex justify-content-end gap-3 mt-4">
                    <button className="btn btn-cancelar-modal" type="button" onClick={handleCancelClick}>
                        <i class="bi bi-x-circle-fill"></i>
                        <span className="ms-2 fw-bold">Cancelar</span>
                    </button>

                    <button className="btn btn-registrar-modal" type="submit">
                        <i class="bi bi-check-circle-fill"></i>
                        <span className="ms-2 fw-bold">{modoEdicion ? 'Actualizar' : 'Registrar'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AgregarMicrocuenca;
