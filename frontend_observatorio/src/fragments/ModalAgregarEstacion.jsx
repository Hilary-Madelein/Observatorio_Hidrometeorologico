import React from 'react';
import { Modal } from 'react-bootstrap';
import '../css/ModalEstacion_Style.css';
import AgregarEstacion from './AgregarEstacion';

const ModalAgregarEstacion = ({ show, handleClose, external_id }) => {
  const esEdicion = Boolean(external_id);

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
      <Modal.Header className="modal-header">
        <Modal.Title className="modal-title">
          {esEdicion ? 'Editar estación' : 'Agregar estación'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="modal-body">
        <AgregarEstacion external_id={external_id} onClose={handleClose} />
      </Modal.Body>

      <Modal.Footer className="modal-footer" />
    </Modal>
  );
};

export default ModalAgregarEstacion;
