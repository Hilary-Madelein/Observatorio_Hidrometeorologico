import { borrarSesion } from '../utils/SessionUtil';
import { useNavigate } from 'react-router-dom';
import '../css/Header_Style.css';
import 'boxicons';

const Header = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    borrarSesion();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="logo-container">
        <img src="/img/Recurso 12.svg" alt="Logo Monitor" className="logo" />
        <h1 className="titulo">Observatorio Hidrometeorológico</h1>
      </div>

      <nav className="navbar">
        <a href="/perfil">Perfil</a>
        <a href="/principal/variable">Variables</a>
        <a onClick={handleClick} style={{ cursor: 'pointer' }}>Cerrar sesión</a>
      </nav>
    </header>

  );
};

export default Header;
