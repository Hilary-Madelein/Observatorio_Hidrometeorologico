import { Modal } from 'react-bootstrap';
import '../css/ModalEstacion_Style.css';
import AgregarVariable from './AgregarVariable';

const ModalAgregarVariable = ({ show, handleClose, external_id_variable }) => {
  const esEdicion = Boolean(external_id_variable);

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
          {esEdicion ? 'Editar variable' : 'Agregar variable'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="modal-body">
        <AgregarVariable external_id_variable={external_id_variable} onClose={handleClose} />
      </Modal.Body>

      <Modal.Footer className="modal-footer">
      </Modal.Footer>
    </Modal>
  );
};

export default ModalAgregarVariable;
