import React from 'react';
import { Modal } from 'react-bootstrap';
import '../css/ModalEstacion_Style.css';
import AgregarEstacion from './AgregarEstacion';

const ModalAgregarEstacion = ({ show, handleClose, external_id_estacion }) => {
  const esEdicion = Boolean(external_id_estacion);

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
        <Modal.Title className="modal-title">
          {esEdicion ? 'Editar estación' : 'Agregar estación'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="modal-body">
        <AgregarEstacion external_id_estacion={external_id_estacion} onClose={handleClose} />
      </Modal.Body>

      <Modal.Footer className="modal-footer" />
    </Modal>
  );
};

export default ModalAgregarEstacion;
