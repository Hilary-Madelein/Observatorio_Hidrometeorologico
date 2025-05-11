import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import '../css/ModalEstacion_Style.css';
import AgregarMicrocuenca from './AgregarMicrocuenca';

const ModalAgregarMicrocuenca = ({ show, handleClose }) => {
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
        <Modal.Title className="modal-title">Agregar microcuenca</Modal.Title>
      </Modal.Header>

      <Modal.Body className="modal-body">
        <AgregarMicrocuenca />
      </Modal.Body>

      <Modal.Footer className="modal-footer">
      </Modal.Footer>
    </Modal>
  );
};

export default ModalAgregarMicrocuenca;
