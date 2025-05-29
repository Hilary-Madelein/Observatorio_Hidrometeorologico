import { useState } from 'react';
import { borrarSesion } from '../utils/SessionUtil';
import { useNavigate } from 'react-router-dom';
import '../css/Header_Style.css';
import 'boxicons';

const Header = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleClick = () => {
    borrarSesion();
    navigate('/admin');
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <header className="header">
      <div className="logo-container">
        <img src="/img/Recurso 12.svg" alt="Logo Monitor" className="logo" />
        <h1 className="titulo">Observatorio Hidrometeorológico</h1>
      </div>

      {/* Checkbox oculto para controlar menú */}
      <input
        type="checkbox"
        id="check"
        checked={menuOpen}
        onChange={toggleMenu}
        style={{ display: 'none' }}
      />
      <label htmlFor="check" className="icons" aria-label="Toggle menu" tabIndex={0} onKeyPress={(e) => { if(e.key === 'Enter') toggleMenu(); }}>
        {menuOpen ? (
          <i id="close-icon" className="bx bx-x"></i>
        ) : (
          <i id="menu-icon" className="bx bx-menu"></i>
        )}
      </label>

      <nav className="navbar">
        <a href="/principal/admin" onClick={() => setMenuOpen(false)}>Microcuencas</a>
        <a href="/principal/variable" onClick={() => setMenuOpen(false)}>Variables</a>
        <a href="/principal/gestionar/admin" onClick={() => setMenuOpen(false)}>Gestionar admin</a>
        <a href="/admin/perfil" onClick={() => setMenuOpen(false)}>Perfil</a>
        <a href="/admin" onClick={handleClick} style={{ cursor: 'pointer' }}>Cerrar sesión</a>
      </nav>
    </header>
  );
};

export default Header;
