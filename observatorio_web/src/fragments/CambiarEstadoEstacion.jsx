import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { borrarSesion, getToken } from '../utils/SessionUtil';
import mensajes, { mensajesConRecarga } from '../utils/Mensajes';
import { PostGuardar } from '../hooks/Conexion';
import swal from 'sweetalert';

function CambiarEstadoEstacion({ external_id_estacion }) {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();
    const { external_id } = useParams();

    const onSubmit = data => {
        const body = {
          external_id: external_id_estacion,
          estado: data.estado
        };
      
        PostGuardar(body, getToken(), "/estacion/cambiar_estado")
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
            console.error('Error cambiando estado de estación:', err);
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
            <form className="user" onSubmit={handleSubmit(onSubmit)}>
                <div className="row container-modal">
                    {/* Estado */}
                    <div className="col-md-12 form-group mb-3">
                        <label style={{ fontWeight: 'bold', paddingTop: '10px' }}>Estado</label>
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

                </div>

                {/* Botones */}
                <div className="btn-Modal d-flex justify-content-end gap-3 mt-4">
                    <button className="btn btn-cancelar-modal" type="button" onClick={handleCancelClick}>
                        <i class="bi bi-x-circle-fill"></i>
                        <span className="ms-2 fw-bold">Cancelar</span>
                    </button>

                    <button className="btn btn-registrar-modal" type="submit">
                        <i class="bi bi-check-circle-fill"></i>
                        <span className="ms-2 fw-bold">Aceptar</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CambiarEstadoEstacion;
