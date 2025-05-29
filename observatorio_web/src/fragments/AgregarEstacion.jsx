import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes, { mensajesConRecarga } from '../utils/Mensajes';
import { GuardarImages, ActualizarImagenes, ObtenerGet } from '../hooks/Conexion';
import swal from 'sweetalert';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

function AgregarEstacion({ external_id_estacion }) {
    const { register, setValue, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const { external_id } = useParams();
    const [descripcion, setDescripcion] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [uploadedPhoto, setUploadedPhoto] = useState(null);
    const [modoEdicion, setModoEdicion] = useState(false);
    const maxCaracteres = 350;

    useEffect(() => {
        if (!external_id_estacion) return;
        (async () => {
            try {
                const response = await ObtenerGet(getToken(), `/get/estacion/${external_id_estacion}`);
                if (response.code === 200) {
                    const e = response.info;
                    setModoEdicion(true);
                    setValue('nombre', e.name);
                    setValue('descripcion', e.description);
                    setValue('longitud', e.longitude);
                    setValue('latitud', e.latitude);
                    setValue('altitud', e.altitude);
                    setValue('tipo', e.type);
                    setValue('id_dispositivo', e.id_device);
                    setDescripcion(e.description);
                } else {
                    mensajes(`Error al obtener estación: ${response.msg}`, 'error');
                }
            } catch {
                mensajes('Error al procesar la solicitud', 'error');
            }
        })();
    }, [external_id_estacion, setValue]);

    const handleDescripcionChange = event => {
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
        setShowModal(v => !v);
    };

    const handlePhotoChange = event => {
        const file = event.target.files[0];
        if (file) {
            setUploadedPhoto(file);
        }
    };

    const onSubmit = data => {
        const formData = new FormData();
        if (modoEdicion) formData.append('external_id', external_id_estacion);
        formData.append('nombre', data.nombre.toUpperCase());
        formData.append('descripcion', data.descripcion);
        formData.append('estado', data.estado);
        formData.append('longitud', data.longitud);
        formData.append('latitud', data.latitud);
        formData.append('altitud', data.altitud);
        formData.append('tipo', data.tipo);
        formData.append('id_dispositivo', data.id_dispositivo);
        formData.append('id_microcuenca', external_id);
        if (data.foto && data.foto[0]) {
            formData.append('foto', data.foto[0]);
        }

        const endpoint = modoEdicion ? '/modificar/estacion' : '/guardar/estacion';
        const accion = modoEdicion ? ActualizarImagenes : GuardarImages;

        accion(formData, getToken(), endpoint)
            .then(info => {
                if (info.code === 200) {
                    mensajes(info.msg, 'success', 'OK');
                    setTimeout(() => {
                        navigate(`/estaciones/${external_id}`);
                        window.location.reload();
                    }, 1200);

                } else {
                    if (info.msg === 'Acceso denegado. Token ha expirado') {
                        mensajes(info.msg, 'error', 'Error');
                        borrarSesion();
                        navigate('/admin');
                    } else {
                        mensajes(info.msg, 'error', 'Error');
                    }
                }
            })
            .catch(err => {
                console.error('Error en la petición:', err);
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
        }).then(willCancel => {
            if (willCancel) {
                mensajesConRecarga("Operación cancelada", "info", "Información");
                navigate(`/estaciones/${external_id}`);
            }
        });
    };

    return (
        <div className="wrapper">
            <form className="user" onSubmit={handleSubmit(onSubmit)} encType="multipart/form-data">
                <div className="row container-modal">
                    {/* Nombre */}
                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}><strong style={{ color: 'red' }}>* </strong>Nombre</label>
                        <input
                            type="text"
                            {...register('nombre', { required: 'Ingrese un nombre' })}
                            className="form-control form-control-user"
                            placeholder="Ingrese el nombre"
                        />
                        {errors.nombre && <div className='alert alert-danger'>{errors.nombre.message}</div>}
                    </div>
                    {/* ID dispositivo */}
                    <div className="col-md-6 form-group mb-3">
                        <label
                            style={{ fontWeight: 'bold', paddingTop: '10px' }}>
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>Identificador proporcionado por la plataforma The Things Network TTN, se encuentra como device_id</Tooltip>}
                            >
                                <i class="bi bi-question-circle-fill" style={{ cursor: 'pointer', color: '#60B5FF' }}></i>
                            </OverlayTrigger>
                            <strong style={{ color: 'red' }}>* </strong>Identificador del dispositivo

                        </label>
                        <input
                            type="text"
                            {...register('id_dispositivo', { required: 'Ingrese el ID del dispositivo' })}
                            className="form-control form-control-user"
                            placeholder="Ingrese el ID del dispositivo"
                        />
                        {errors.id_dispositivo && <div className='alert alert-danger'>{errors.id_dispositivo.message}</div>}
                    </div>
                    {/* Descripción */}
                    <div className="col-12 form-group mb-3">
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
                    {/* Coordenadas */}
                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}><strong style={{ color: 'red' }}>* </strong>Longitud</label>
                        <input
                            type="text"
                            {...register('longitud', {
                                required: 'Ingrese la longitud', pattern: {
                                    value: /^-?\d+(\.\d+)?$/,
                                    message: 'Ingrese una coordenada válida (número decimal)'
                                }
                            })
                            }
                            className="form-control form-control-user"
                            placeholder="Ingrese la longitud"
                        />
                        {errors.longitud && <div className='alert alert-danger'>{errors.longitud.message}</div>}
                    </div>
                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}><strong style={{ color: 'red' }}>* </strong>Latitud</label>
                        <input
                            type="text"
                            {...register('latitud', {
                                required: 'Ingrese la latitud', pattern: {
                                    value: /^-?\d+(\.\d+)?$/,
                                    message: 'Ingrese una coordenada válida (número decimal)'
                                }
                            })}
                            className="form-control form-control-user"
                            placeholder="Ingrese la latitud"
                        />
                        {errors.latitud && <div className='alert alert-danger'>{errors.latitud.message}</div>}
                    </div>
                    {/* Altitud & Tipo */}
                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}><strong style={{ color: 'red' }}>* </strong>Altitud</label>
                        <input
                            type="text"
                            {...register('altitud', {
                                required: 'Ingrese la altitud', pattern: {
                                    value: /^-?\d+(\.\d+)?$/,
                                    message: 'Ingrese una coordenada válida (número decimal)'
                                }
                            })}
                            className="form-control form-control-user"
                            placeholder="Ingrese la altitud"
                        />
                        {errors.altitud && <div className='alert alert-danger'>{errors.altitud.message}</div>}
                    </div>
                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}><strong style={{ color: 'red' }}>* </strong>Tipo</label>
                        <select
                            {...register('tipo', { required: 'Seleccione un tipo' })}
                            className="form-control form-control-user"
                        >
                            <option value="">Seleccione un tipo</option>
                            <option value="METEOROLOGICA">METEOROLOGICA</option>
                            <option value="HIDROLOGICA">HIDROLOGICA</option>
                            <option value="PLUVIOMETRICA">PLUVIOMETRICA</option>
                        </select>
                        {errors.tipo && <div className='alert alert-danger'>{errors.tipo.message}</div>}
                    </div>
                    {/* Estado */}
                    {!modoEdicion && (
                        <div className="col-md-6 form-group mb-3">
                            <label style={{ fontWeight: 'bold', paddingTop: '10px' }}><strong style={{ color: 'red' }}>* </strong>Estado</label>
                            <select
                                {...register('estado', { required: 'Seleccione un estado' })}
                                className="form-control form-control-user"
                            >
                                <option value="">Seleccione un estado</option>
                                <option value="OPERATIVA">OPERATIVA</option>
                                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                                <option value="NO OPERATIVA">NO OPERATIVA</option>
                            </select>
                            {errors.estado && <div className='alert alert-danger'>{errors.estado.message}</div>}
                        </div>
                    )}

                    {/* Foto */}
                    <div className="col-md-12 form-group mb-3">
                        <label htmlFor="foto" className="form-label"><strong style={{ color: 'red' }}>* </strong>Seleccionar foto</label>
                        <input
                            type="file"
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
                            accept="image/*"
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
                </div>

                {showModal && (
                    <div className="modal show" tabIndex="-1" style={{ display: 'block' }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title titulo-secundario">Previsualización</h5>
                                    <button className="btn-close" onClick={toggleModal}></button>
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

export default AgregarEstacion;
