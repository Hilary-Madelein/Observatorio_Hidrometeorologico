import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes, { mensajesConRecarga } from '../utils/Mensajes';
import { GuardarImages, ObtenerGet, EditarImages, ActualizarImagenes, ObtenerPost } from '../hooks/Conexion';
import swal from 'sweetalert';

function AgregarMicrocuenca({ external_id, onClose }) {
    const { register, setValue, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const [descripcion, setDescripcion] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [uploadedPhoto, setUploadedPhoto] = useState(null);
    const [modoEdicion, setModoEdicion] = useState(false);
    const maxCaracteres = 150;

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

    const fetchCasoPrueba = async () => {
        if (external_id) {
            try {
                const response = await ObtenerGet(getToken(), `/obtener/microcuenca/${external_id}`);
                if (response.code === 200) {
                    const microcuenca = response.info;
                    setModoEdicion(true);
                    setValue('nombre', microcuenca.name);
                    setValue('descripcion', microcuenca.description);
                    setDescripcion(microcuenca.description);
                } else {
                    mensajes(`Error al obtener microcuenca: ${response.msg}`, 'error');
                }
            } catch (error) {
                mensajes('Error al procesar la solicitud', 'error');
            }
        }
    };

    useEffect(() => {
        fetchCasoPrueba();
    }, [external_id]);

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
            if (info.code !== 200) {
              mensajes(info.msg, 'error', 'Error');
              borrarSesion();
              navigate('/principal/admin');
            } else {
              mensajes(info.msg);
              setTimeout(() => window.location.reload(), 1200);
            }
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
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Nombre</label>
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
                        <label style={{ fontWeight: 'bold', paddingTop: '20px' }}>Descripción</label>
                        <textarea
                            {...register('descripcion', {
                                required: 'Ingrese una descripción',
                                pattern: {
                                    value: /^(?!\s*$)[a-zA-Z\s]+(?<![<>])$/,
                                    message: "Ingrese una descripción correcta"
                                }
                            })}
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
                        <label htmlFor="foto" className="form-label">Seleccionar foto</label>
                        <input type="file"
                            {...register("foto", modoEdicion ? {} : {
                                required: {
                                    message: "Seleccione una foto"
                                }
                            })}
                            onChange={handlePhotoChange}
                            className="form-control"
                            accept="image/*"
                        />
                        {uploadedPhoto && (
                            <div className="d-flex align-items-center mt-3 justify-content-end">
                                <button type="button" className="btn btn-info btn-sm me-2 btn-mini" onClick={toggleModal}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-eye-fill" viewBox="0 0 16 16">
                                        <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0" />
                                        <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
                                    </svg>
                                </button>
                                <button type="button" className="btn btn-danger btn-sm btn-mini" onClick={handleRemovePhoto}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-trash-fill" viewBox="0 0 16 16">
                                        <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        {errors.foto && <span className='mensajeerror'>{errors.foto.message}</span>}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-x-circle" viewBox="0 0 16 16">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                        </svg>
                        <span className="ms-2 fw-bold">Cancelar</span>
                    </button>

                    <button className="btn btn-registrar-modal" type="submit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-check-circle" viewBox="0 0 16 16">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                            <path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05" />
                        </svg>
                        <span className="ms-2 fw-bold">{modoEdicion ? 'Actualizar' : 'Registrar'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AgregarMicrocuenca;
