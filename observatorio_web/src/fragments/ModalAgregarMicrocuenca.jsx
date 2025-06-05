import React from 'react';
import { Modal } from 'react-bootstrap';
import '../css/ModalEstacion_Style.css';
import AgregarMicrocuenca from '../fragments/AgregarMicrocuenca';

const ModalAgregarMicrocuenca = ({ show, handleClose, external_id }) => {
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
        <Modal.Title>
          {external_id ? 'Editar Microcuenca' : 'Agregar Microcuenca'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <AgregarMicrocuenca
          external_id={external_id}
          onClose={handleClose}
        />
      </Modal.Body>
      <Modal.Footer className="modal-footer" />
    </Modal>
  );
};

export default ModalAgregarMicrocuenca;
