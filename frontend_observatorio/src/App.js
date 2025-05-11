import React from 'react';
import './App.css';
import Principal from './fragments/Principal';
import { Navigate, Route, Routes } from 'react-router-dom';
import './css/Global.css';
import Login from './fragments/Login';
import ListaMicrocuencas from './fragments/ListaMicrocuencas';
import ListaEstaciones from './fragments/ListaEstaciones';
import CardEstaciones from './fragments/CardEstaciones';

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
      </Routes>
    </div>
  );
}

export default App;
