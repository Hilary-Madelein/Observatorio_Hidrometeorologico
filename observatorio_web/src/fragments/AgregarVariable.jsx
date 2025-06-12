import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes, { mensajesConRecarga } from '../utils/Mensajes';
import { ActualizarImagenes, GuardarImages, ObtenerGet } from '../hooks/Conexion';
import swal from 'sweetalert';
import OverlayTrigger from 'react-bootstrap/esm/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

function AgregarVariable({ external_id_variable }) {
    const { register, setValue, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const [uploadedPhoto, setUploadedPhoto] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);

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
        if (!external_id_variable) return;
        (async () => {
            try {
                const response = await ObtenerGet(getToken(), `/obtener/tipo_medida/${external_id_variable}`);
                if (response.code === 200) {
                    const e = response.info;
                    setModoEdicion(true);
                    setValue('nombre', e.name);
                    setValue('unidad_medida', e.unit_measure);
                    setValue('operaciones', e.operations);
                } else {
                    mensajes(`Error al obtener variable: ${response.msg}`, 'error');
                }
            } catch {
                mensajes('Error al procesar la solicitud', 'error');
            }
        })();
    }, [external_id_variable, setValue]);

    const onSubmit = data => {
        const formData = new FormData();
        formData.append('nombre', data.nombre.toUpperCase());
        formData.append('unidad_medida', data.unidad_medida);
        formData.append('foto', data.foto[0]);
        formData.append('external_id', external_id_variable);
        const operacionesSeleccionadas = Array.from(data.operaciones);
        operacionesSeleccionadas.forEach(op => {
            formData.append('operaciones[]', op);
        });

        const endpoint = modoEdicion ? '/modificar/tipo_medida' : '/guardar/tipo_medida';
        const accion = modoEdicion ? ActualizarImagenes : GuardarImages;

        accion(formData, getToken(), endpoint)
            .then(info => {
                if (info.code === 200) {
                    mensajesConRecarga(info.msg);
                    setTimeout(() => {
                        window.location.reload();
                    }, 1200);

                } else if (info.msg === 'Acceso denegado. Token ha expirado') {
                    mensajes(info.msg, 'error', 'Error');
                    borrarSesion();
                    navigate('/admin');

                } else {
                    mensajes(info.msg, 'error', 'Error');
                }
            })
            .catch(err => {
                console.error('Error guardando tipo de medida:', err);
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
                    
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>
                        <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>Introduzca el nombre de la variable tal como aparece en la plataforma TTN.</Tooltip>}
                            >
                                <i class="bi bi-question-circle-fill" style={{ cursor: 'pointer', color: '#60B5FF' }}></i>
                            </OverlayTrigger>
                            <strong style={{ color: 'red' }}>* </strong>Nombre</label>
                        <input type="text" {...register('nombre', {
                            required: 'Ingrese un nombre',
                            pattern: {
                                value: /^(?!\s*$)[\w\s%°/³ºμ.*+()-]+$/,
                                message: "Ingrese un nombre correcto"
                            }
                        })} className="form-control form-control-user" placeholder="Ingrese el nombre" />
                        {errors.nombre && <div className='alert alert-danger'>{errors.nombre.message}</div>}
                    </div>

                    {/* Unidad de medida */}
                    <div className="form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}><strong style={{ color: 'red' }}>* </strong>Unidad de medida</label>
                        <input
                            type="text"
                            {...register('unidad_medida', {
                                required: 'Ingrese una unidad de medida',
                                pattern: {
                                    value: /^(?!\s*$)[\w\s%°/³ºμ.*+()-]+$/,
                                    message: "Ingrese una unidad válida"
                                }
                            })}

                            className="form-control form-control-user"
                            placeholder="Ingrese la unidad de medida"
                        />
                        {errors.unidad_medida && <div className='alert alert-danger'>{errors.unidad_medida.message}</div>}
                    </div>

                    {/* Operaciones */}
                    <div className="form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}><strong style={{ color: 'red' }}>* </strong>Operaciones asociadas</label>
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
                        <label htmlFor="foto" className="form-label"><strong style={{ color: 'red' }}>* </strong>Seleccionar icono</label>
                        <input
                            type="file"
                            {...register("foto", {
                                validate: fileList => {
                                    if (!modoEdicion && (!fileList || fileList.length === 0)) {
                                        return "Seleccione un icono";
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
                        <i class="bi bi-x-circle-fill"></i>
                        <span className="ms-2 fw-bold">Cancelar</span>
                    </button>
                    <button className="btn btn-registrar-modal" type="submit">
                        <i class="bi bi-check-circle-fill"></i>
                        <span className="ms-2 fw-bold">Registrar</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AgregarVariable;
