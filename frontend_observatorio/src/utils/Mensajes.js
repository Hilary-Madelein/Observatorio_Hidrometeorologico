import Swal from 'sweetalert2';
import '../css/Alertas_Style.css';

const mensajes = (texto, type = 'success', title = 'OK') => {
  let icon, titleColor;
  
  switch (type) {
    case 'error':
      icon = '<img src="https://i.pinimg.com/originals/f1/04/23/f1042393013c86612e61d20ff57b87de.gif" style="width: 120px; height: 100px;" />';
      titleColor = '#c54545';
      break;
    case 'warning':
      icon = '<img src="https://i.pinimg.com/originals/da/66/fa/da66fa96630758ce1d8a67c740283017.gif" style="width: 120px; height: 100px;" />';
      titleColor = '#f39c12'; 
      break;
    case 'info':
      icon = '<img src="https://i.pinimg.com/originals/32/1b/9e/321b9e46e1403beb184f247c9212a865.gif" style="width: 160px; height: 100px;" />';
      titleColor = '#3498db'; 
      break;
    case 'success':
      icon = '<img src="https://i.pinimg.com/originals/7c/1a/43/7c1a431307cd53f86fbd0b90fd4e1ce8.gif" style="width: 120px; height: 120px;" />';
      titleColor = '#2ecc71'; 
      break;
    default:
      icon = type;
      titleColor = '#333'; 
  }

  Swal.fire({
    title: title,
    text: texto,
    iconHtml: icon, 
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
    customClass: {
      popup: 'custom-swal-popup',  
      title: 'custom-swal-title',
      icon: 'custom-swal-icon',  
      confirmButton: 'custom-swal-btn'
    },
    position: 'top-center',
    didOpen: () => {
      document.querySelector('.custom-swal-title').style.color = titleColor;
    }
  });
};

export default mensajes;
