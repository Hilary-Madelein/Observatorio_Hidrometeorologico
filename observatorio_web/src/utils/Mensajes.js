import Swal from 'sweetalert2';
import '../css/Alertas_Style.css';

export const mensajesConRecarga = (texto, type = 'success', title = 'OK') => {
  let titleColor;

  switch (type) {
    case 'error':
      titleColor = '#c54545';
      break;
    case 'warning':
      titleColor = '#f39c12';
      break;
    case 'info':
      titleColor = '#3498db';
      break;
    case 'success':
      titleColor = '#1F7D53';
      break;
    default:
      titleColor = '#333';
  }

  Swal.fire({
    title: title,
    text: texto,
    icon: type,
    showClass: {
      popup: 'animate__animated animate__fadeInDown'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp'
    },
    confirmButtonText: 'Aceptar',
    timer: 3000,
    showConfirmButton: true,
    allowOutsideClick: false,
    showCloseButton: true,
    position: 'top-center',
    customClass: {
      popup: 'custom-swal-popup',
      title: 'custom-swal-title',
      icon: 'custom-swal-icon animate__animated animate__tada',
      confirmButton: 'custom-swal-btn'
    },
    didOpen: () => {
      const titleEl = document.querySelector('.custom-swal-title');
      if (titleEl) {
        titleEl.style.color = titleColor;
      }
    }
  }).then(() => {
    window.location.reload();
  });
};


const mensajes = (texto, type = 'success', title = 'OK') => {
  let titleColor;

  switch (type) {
    case 'error':
      titleColor = '#c54545';
      break;
    case 'warning':
      titleColor = '#f39c12';
      break;
    case 'info':
      titleColor = '#3498db';
      break;
    case 'success':
      titleColor = '#1F7D53';
      break;
    default:
      titleColor = '#333';
  }

  Swal.fire({
    title: title,
    text: texto,
    icon: type,
    showClass: {
      popup: 'animate__animated animate__fadeInDown'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp'
    },
    confirmButtonText: 'Aceptar',
    timer: 3000,
    showConfirmButton: true,
    allowOutsideClick: false,
    showCloseButton: true,
    position: 'top-center',
    customClass: {
      popup: 'custom-swal-popup',
      title: 'custom-swal-title',
      icon: 'custom-swal-icon animate__animated animate__tada',
      confirmButton: 'custom-swal-btn'
    },
    didOpen: () => {
      const titleEl = document.querySelector('.custom-swal-title');
      if (titleEl) titleEl.style.color = titleColor;
    }
  });
};



export default mensajes;
