import React, { useState, useEffect } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import { getToken, borrarSesion } from '../utils/SessionUtil';
import { useNavigate } from 'react-router-dom';
import mensajes from '../utils/Mensajes';
import '../css/ModalEstacion_Style.css';

const ModalDetallesEstacion = ({ show, handleClose, external_id_estacion }) => {
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!show || !external_id_estacion) {
      setStation(null);
      return;
    }
    setLoading(true);

    ObtenerGet(getToken(), `/get/estacion/${external_id_estacion}`)
      .then(res => {
        if (res.code === 200) {
          // Éxito
          setStation(res.info);

        } else if (res.msg === 'Acceso denegado. Token ha expirado') {
          mensajes(res.msg, 'error', 'Error');
          borrarSesion();
          navigate('/admin');

        } else {
          mensajes(`Error cargando estación: ${res.msg}`, 'error', 'Error');
          handleClose();
        }
      })
      .catch(err => {
        console.error('Error de conexión al servidor:', err);
        mensajes('Error de conexión al servidor', 'error', 'Error');
        handleClose();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [show, external_id_estacion, handleClose, navigate]);

  return (
    <Modal
      show={show}
      onHide={handleClose}
      backdrop="static"
      keyboard={false}
      size="lg"
      centered
      dialogClassName="modal-estacion"
    >
      <Modal.Header className="modal-header" closeButton>
        <Modal.Title className="modal-title">Detalles de Estación</Modal.Title>
      </Modal.Header>

      <Modal.Body className="modal-body">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <Spinner animation="border" />
          </div>
        ) : station ? (
          <div className="row">
            {/* Imagen de la estación */}
            <div className="col-md-5">
              <img
                src={`${URLBASE}/images/estaciones/${station.picture}`}
                alt={station.name}
                className="img-fluid rounded"
              />
            </div>
            {/* Detalles */}
            <div className="col-md-7">
              <h4 className="mt-2"><strong>{station.name}</strong></h4>
              <p><strong>Descripción:</strong> {station.description}</p>
              <p><strong>Tipo:</strong> {station.type}</p>
              <p><strong>Estado:</strong> {station.status}</p>
              <p><strong>ID Dispositivo:</strong> {station.id_device}</p>
              <p>
                <strong>Coordenadas:</strong> {station.latitude}, {station.longitude}
                <br /><strong>Altitud:</strong> {station.altitude}
              </p>
            </div>
          </div>
        ) : null}
      </Modal.Body>

      <Modal.Footer className="modal-footer"></Modal.Footer>
    </Modal>
  );
};

export default ModalDetallesEstacion;
