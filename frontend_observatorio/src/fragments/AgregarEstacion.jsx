import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import { GuardarImages } from '../hooks/Conexion';
import swal from 'sweetalert';

function AgregarEstacion({ external_id }) {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const [descripcion, setDescripcion] = useState('');
    const maxCaracteres = 150;

    const handleDescripcionChange = (event) => {
        const { value } = event.target;
        if (value.length <= maxCaracteres) {
            setDescripcion(value);
        }
    };

    console.log("externalito", external_id);


    const onSubmit = data => {
        const formData = new FormData();
        formData.append('nombre', data.nombre.toUpperCase());
        formData.append('descripcion', data.descripcion);
        formData.append('estado', data.estado);
        formData.append('longitud', data.longitud);
        formData.append('latitud', data.latitud);
        formData.append('altitud', data.altitud);
        formData.append('tipo', data.tipo);
        formData.append('id_dispositivo', data.id_dispositivo);
        formData.append('id_microcuenca', external_id);
        formData.append('foto', data.foto[0]);

        GuardarImages(formData, getToken(), "/guardar/estacion").then(info => {
            if (info.code !== 200) {
                mensajes(info.msg, 'error', 'Error');
                borrarSesion();
                navigate(-1);
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
                mensajes("Operación cancelada", "info", "Información");
                navigate('/principal/admin');
            }
        });
    };

    return (
        <div className="wrapper">
            <form className="user" onSubmit={handleSubmit(onSubmit)} encType="multipart/form-data">
                <div className="row container-modal">
                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Nombre</label>
                        <input type="text" {...register('nombre', {
                            required: 'Ingrese un nombre',
                            pattern: {
                                message: "Ingrese un nombre correcto"
                            }
                        })} className="form-control form-control-user" placeholder="Ingrese el nombre" />
                        {errors.nombre && <div className='alert alert-danger'>{errors.nombre.message}</div>}
                    </div>

                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>ID externo del Dispositivo</label>
                        <input type="text" {...register('id_dispositivo', {
                            required: 'Ingrese el ID del dispositivo'
                        })} className="form-control form-control-user" placeholder="Ingrese el ID del dispositivo" />
                        {errors.id_dispositivo && <div className='alert alert-danger'>{errors.id_dispositivo.message}</div>}
                    </div>

                    <div className="col-md-12 form-group mb-3">
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
                            <small className="text-muted">
                                {descripcion.length}/{maxCaracteres} caracteres
                            </small>
                            {descripcion.length === maxCaracteres && <small className="text-danger">Máximo alcanzado</small>}
                        </div>
                    </div>

                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Longitud</label>
                        <input type="text" {...register('longitud', {
                            required: 'Ingrese la longitud'
                        })} className="form-control form-control-user" placeholder="Ingrese la longitud" />
                        {errors.longitud && <div className='alert alert-danger'>{errors.longitud.message}</div>}
                    </div>

                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Latitud</label>
                        <input type="text" {...register('latitud', {
                            required: 'Ingrese la latitud'
                        })} className="form-control form-control-user" placeholder="Ingrese la latitud" />
                        {errors.latitud && <div className='alert alert-danger'>{errors.latitud.message}</div>}
                    </div>

                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Altitud</label>
                        <input type="text" {...register('altitud', {
                            required: 'Ingrese la altitud'
                        })} className="form-control form-control-user" placeholder="Ingrese la altitud" />
                        {errors.altitud && <div className='alert alert-danger'>{errors.altitud.message}</div>}
                    </div>

                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Tipo</label>
                        <select
                            {...register('tipo', {
                                required: 'Seleccione un tipo'
                            })}
                            className="form-control form-control-user"
                        >
                            <option value="">Seleccione un tipo</option>
                            <option value="METEOROLOGICA">METEOROLOGICA</option>
                            <option value="HIDROLOGICA">HIDROLOGICA</option>
                            <option value="PLUVIOMETRICA">PLUVIOMETRICA</option>
                        </select>
                        {errors.tipo && <div className='alert alert-danger'>{errors.tipo.message}</div>}
                    </div>

                    <div className="col-md-6 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Estado</label>
                        <select
                            {...register('estado', {
                                required: 'Seleccione un estado'
                            })}
                            className="form-control form-control-user"
                        >
                            <option value="">Seleccione un estado</option>
                            <option value="OPERATIVA">OPERATIVA</option>
                            <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                            <option value="NO OPERATIVA">NO OPERATIVA</option>
                        </select>
                        {errors.estado && <div className='alert alert-danger'>{errors.estado.message}</div>}
                    </div>

                    <div className="col-md-6 form-group mb-3">
                        <label htmlFor="foto" className="form-label">Seleccionar foto</label>
                        <input type="file"
                            {...register("foto", {
                                required: "Seleccione una foto"
                            })}
                            className="form-control"
                        />
                        {errors.foto && <span className='alert alert-danger'>{errors.foto.message}</span>}
                    </div>
                </div>

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

export default AgregarEstacion;
