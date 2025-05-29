import React from 'react';
import { Modal } from 'react-bootstrap';
import '../css/ModalEstacion_Style.css';
import AgregarAdmin from './AgregarAdmin';

const ModalAgregarAdmin = ({ show, handleClose, external_id_admin, onSaved }) => {
  const isEditing = Boolean(external_id_admin);

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
          {isEditing ? 'Editar Administrador' : 'Agregar Administrador'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="modal-body">
        <AgregarAdmin
          external_id_admin={external_id_admin}
          onClose={handleClose}
          onSaved={onSaved}
        />
      </Modal.Body>

      <Modal.Footer className="modal-footer" />
    </Modal>
  );
};

export default ModalAgregarAdmin;
