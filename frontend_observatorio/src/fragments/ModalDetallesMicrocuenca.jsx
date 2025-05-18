import React, { useState, useEffect } from 'react';
import { Modal, Spinner, Row, Col } from 'react-bootstrap';
import { ObtenerGet, URLBASE } from '../hooks/Conexion';
import { getToken, borrarSesion } from '../utils/SessionUtil';
import mensajes from '../utils/Mensajes';
import '../css/ModalEstacion_Style.css';

const ModalDetallesMicrocuenca = ({ show, handleClose, external_id_micro }) => {
  const [micro, setMicro] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show || !external_id_micro) {
      setMicro(null);
      return;
    }
    setLoading(true);

    ObtenerGet(getToken(), `/obtener/microcuenca/${external_id_micro}`)
      .then(res => {
        if (res.code === 200) {
          setMicro(res.info);
        } else {
          mensajes(`Error cargando microcuenca: ${res.msg}`, 'error');
          if (res.msg.includes('Token')) borrarSesion();
          handleClose();
        }
      })
      .catch(() => {
        mensajes('Error de conexión al servidor', 'error');
        handleClose();
      })
      .finally(() => setLoading(false));
  }, [show, external_id_micro, handleClose]);

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
        <Modal.Title className="modal-title">Detalles de Microcuenca</Modal.Title>
      </Modal.Header>

      <Modal.Body className="modal-body">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <Spinner animation="border" />
          </div>
        ) : micro ? (
          <Row>
            <Col md={5}>
              <img
                src={
                  micro.picture
                    ? `${URLBASE}/images/microcuencas/${micro.picture}`
                    : '/img/microcuenca-default.jpg'
                }
                alt={micro.name}
                className="img-fluid rounded"
              />
            </Col>
            <Col md={7}>
              <h4><strong>{micro.name}</strong></h4>
              <p><strong>Descripción:</strong> {micro.description}</p>
            </Col>
          </Row>
        ) : null}
      </Modal.Body>

      <Modal.Footer className="modal-footer">
      </Modal.Footer>
    </Modal>
  );
};

export default ModalDetallesMicrocuenca;
