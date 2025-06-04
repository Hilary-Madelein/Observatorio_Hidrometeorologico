import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // <-- importamos Link
import { borrarSesion } from '../utils/SessionUtil';
import '../css/Header_Style.css';
import 'boxicons';

const Header = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleClick = () => {
    borrarSesion();
    // Si navegas con navigate('/admin'), React Router lo convertirá en '/hid/admin'
    navigate('/admin');
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <header className="header">
      <div className="logo-container">
        {/* Si quieres que la imagen cargue bien con basename="/hid", usa PUBLIC_URL */}
        <img
          src={process.env.PUBLIC_URL + '/img/Recurso 12.svg'}
          alt="Logo Monitor"
          className="logo"
        />
        <h1 className="titulo">Observatorio Hidrometeorológico</h1>
      </div>

      <input
        type="checkbox"
        id="check"
        checked={menuOpen}
        onChange={toggleMenu}
        style={{ display: 'none' }}
      />
      <label
        htmlFor="check"
        className="icons"
        aria-label="Toggle menu"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter') toggleMenu();
        }}
      >
        {menuOpen ? (
          <i id="close-icon" className="bx bx-x"></i>
        ) : (
          <i id="menu-icon" className="bx bx-menu"></i>
        )}
      </label>

      <nav className="navbar">
        <Link to="/principal/admin" onClick={() => setMenuOpen(false)}>
          Microcuencas
        </Link>
        <Link to="/principal/variable" onClick={() => setMenuOpen(false)}>
          Variables
        </Link>
        <Link to="/principal/gestionar/admin" onClick={() => setMenuOpen(false)}>
          Gestionar admin
        </Link>
        <Link to="/admin/perfil" onClick={() => setMenuOpen(false)}>
          Perfil
        </Link>

        <span onClick={handleClick} style={{ cursor: 'pointer' }}>
          Cerrar sesión
        </span>
      </nav>
    </header>
  );
};

export default Header;
