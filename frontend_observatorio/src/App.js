import React from 'react';
import './App.css';
import Principal from './fragments/Principal';
import { Navigate, Route, Routes } from 'react-router-dom';
import './css/Global.css';
import Login from './fragments/Login';
import ListaMicrocuencas from './fragments/ListaMicrocuencas';
import ListaEstaciones from './fragments/ListaEstaciones';
import CardEstaciones from './fragments/CardEstaciones';
import ListaVariables from './fragments/ListaVariables';
import 'bootstrap-icons/font/bootstrap-icons.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path='/principal/monitorizacion' element={<Principal />} />
        <Route path='*' element={<Navigate to='/principal/monitorizacion' />} />
        
        {/** RUTAS ADMINISTRATIVAS */}
        <Route path='/admin' element={<Login />} />
        <Route path='/principal/admin' element={<ListaMicrocuencas />} />
        <Route path='/estaciones/:external_id' element={<ListaEstaciones />} />
        <Route path='/principal/variable' element={<ListaVariables />} />
      </Routes>
    </div>
  );
}

export default App;
