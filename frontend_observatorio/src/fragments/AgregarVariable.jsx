import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes, { mensajesConRecarga } from '../utils/Mensajes';
import { GuardarImages } from '../hooks/Conexion';
import swal from 'sweetalert';

function AgregarVariable() {
    const { register, setValue, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const [uploadedPhoto, setUploadedPhoto] = useState(null);
    const [showModal, setShowModal] = useState(false);

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

    const onSubmit = data => {
        const formData = new FormData();
        formData.append('nombre', data.nombre);
        formData.append('unidad_medida', data.unidad_medida);
        formData.append('foto', data.foto[0]);
        const operacionesSeleccionadas = Array.from(data.operaciones);
        operacionesSeleccionadas.forEach(op => {
            formData.append('operaciones[]', op);
        });

        GuardarImages(formData, getToken(), "/guardar/tipo_medida").then(info => {
            if (info.code !== 200) {
                mensajes(info.msg, 'error', 'Error');
                borrarSesion();
                navigate('/principal/admin');
            } else {
                mensajes(info.msg);
                setTimeout(() => {
                    window.location.reload();
                }, 1200);
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
                navigate('/principal/variable');
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
                        <input
                            type="text"
                            {...register('nombre', {
                                required: 'Ingrese un nombre'
                            })}
                            className="form-control form-control-user"
                            placeholder="Ingrese el nombre"
                        />
                        {errors.nombre && <div className='alert alert-danger'>{errors.nombre.message}</div>}
                    </div>

                    {/* Unidad de medida */}
                    <div className="form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Unidad de medida</label>
                        <input
                            type="text"
                            {...register('unidad_medida', {
                                required: 'Ingrese una unidad de medida'
                            })}
                            className="form-control form-control-user"
                            placeholder="Ingrese la unidad de medida"
                        />
                        {errors.unidad_medida && <div className='alert alert-danger'>{errors.unidad_medida.message}</div>}
                    </div>

                    {/* Operaciones */}
                    <div className="form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Operaciones asociadas</label>
                        <div className="border rounded p-2">
                            {['PROMEDIO', 'MAX', 'MIN', 'SUMA'].map((op, index) => (
                                <div key={index} className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        value={op}
                                        id={`operacion-${op}`}
                                        {...register("operaciones", {
                                            validate: value => value?.length > 0 || "Seleccione al menos una operación"
                                        })}
                                    />
                                    <label className="form-check-label ms-2" htmlFor={`operacion-${op}`}>
                                        {op}
                                    </label>
                                </div>
                            ))}
                        </div>
                        {errors.operaciones && <div className='alert alert-danger mt-2'>{errors.operaciones.message}</div>}
                        <small className="text-muted">Puede seleccionar una o más operaciones.</small>
                    </div>


                    {/* Icono */}
                    <div className="form-group mb-3">
                        <label htmlFor="foto" className="form-label">Seleccionar icono</label>
                        <input
                            type="file"
                            {...register("foto", {
                                required: {
                                    value: true,
                                    message: "Seleccione un icono"
                                }
                            })}
                            onChange={handlePhotoChange}
                            className="form-control"
                            accept="image/*"
                        />
                        {uploadedPhoto && (
                            <div className="d-flex align-items-center mt-3 justify-content-end">
                                <button
                                    type="button"
                                    className="btn btn-info btn-sm me-2 btn-mini"
                                    onClick={toggleModal}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-eye-fill" viewBox="0 0 16 16">
                                        <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0" />
                                        <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm btn-mini"
                                    onClick={handleRemovePhoto}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-trash-fill" viewBox="0 0 16 16">
                                        <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        {errors.foto && <span className='mensajeerror'>{errors.foto.message}</span>}
                    </div>
                </div>

                {showModal && (
                    <div className="modal show" tabIndex="-1" style={{ display: 'block' }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title titulo-secundario">Previsualización</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={toggleModal}
                                        aria-label="Close"
                                    ></button>
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
                        <span className="ms-2 fw-bold">Registrar</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AgregarVariable;
