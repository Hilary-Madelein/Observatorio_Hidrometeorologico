import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import { GuardarImages } from '../hooks/Conexion';
import swal from 'sweetalert';

function AgregarVariable() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();

    const onSubmit = data => {
        const formData = new FormData();
        formData.append('nombre', data.nombre);
        formData.append('unidad_medida', data.unidad_medida);
        formData.append('foto', data.foto[0]);

        // Procesar operaciones seleccionadas (como array)
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
                mensajes("Operación cancelada", "info", "Información");
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
                            className="form-control"
                        />
                        {errors.foto && <span className='mensajeerror'>{errors.foto.message}</span>}
                    </div>
                </div>

                {/* Botones */}
                <div className="btn-Modal d-flex justify-content-end gap-3 mt-4">
                    <button className="btn btn-cancelar-modal" type="button" onClick={handleCancelClick}>
                        <i className="bi bi-x-circle"></i>
                        <span className="ms-2 fw-bold">Cancelar</span>
                    </button>
                    <button className="btn btn-registrar-modal" type="submit">
                        <i className="bi bi-check-circle"></i>
                        <span className="ms-2 fw-bold">Registrar</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AgregarVariable;
