import React from 'react';
import './App.css';
import Principal from './fragments/Principal';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './fragments/Login';
import ListaMicrocuencas from './fragments/ListaMicrocuencas';
import ListaEstaciones from './fragments/ListaEstaciones';
import ListaVariables from './fragments/ListaVariables';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { getRoles, getToken } from './utils/SessionUtil';
import mensajes from './utils/Mensajes';
import 'boxicons/css/boxicons.min.css';
import Perfil from './fragments/Perfil';
import ListaAdministradores from './fragments/ListaAdministradores';

function App() {

  const MiddewareSesion = ({ children, requiredRoles }) => {
    const autenticado = getToken();
    const roles = getRoles() || [];

    if (!autenticado) {
      return <Navigate to='/admin' />;
    }
  
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = roles.some(role => requiredRoles.includes(role.nombre));
      if (!hasRequiredRole) {
        mensajes("No tienes el rol necesario para acceder a esta página.", "error", "Acceso Denegado");
        return <Navigate to='/admin' />;
      }
    }
  
    return children;
  };

  return (
    <div className="App">
      <Routes>
        <Route path='/principal/monitorizacion' element={<Principal />} />
        <Route path='*' element={<Navigate to='/principal/monitorizacion' />} />
        
        {/** RUTAS ADMINISTRATIVAS */}
        <Route path='/admin' element={<Login />} />
        <Route path='/admin/perfil' element={<MiddewareSesion ><Perfil /></MiddewareSesion>} />
        <Route path='/principal/admin' element={<MiddewareSesion ><ListaMicrocuencas /></MiddewareSesion>} />
        <Route path='/estaciones/:external_id' element={<MiddewareSesion ><ListaEstaciones /></MiddewareSesion>} />
        <Route path='/principal/variable' element={<MiddewareSesion ><ListaVariables /></MiddewareSesion>} />
        <Route path='/principal/gestionar/admin' element={<MiddewareSesion ><ListaAdministradores /></MiddewareSesion>} />
      </Routes>
    </div>
  );
}

export default App;
