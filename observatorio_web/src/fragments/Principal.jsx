import React, { useState } from 'react';
import BarraMenu from './BarraMenu';
import CardEstaciones from './CardEstaciones';
import "bootstrap/dist/css/bootstrap.min.css";
import '../css/Principal_Style.css';
import Medidas from './Medidas';
import Graficas from './Graficas';
import Filtro from './Filtro';
import Footer from './Footer';

function Principal() {
    const [filtro, setFiltro] = useState(null);

    const manejarFiltro = (datosFiltro) => {
        setFiltro(datosFiltro);
    };

    return (
        <div>
            {/** HEADER */}
            <BarraMenu />

            <div className="container-fluid custom-container">
                <div className="row align-items-stretch mb-4">
                    <div className="col-lg-12 col-md-12 mb-4">
                        <div className="h-100 custom-container-cards d-flex flex-column">
                            <CardEstaciones />
                        </div>
                    </div>
                </div>

                <div className="row align-items-stretch mb-4">
                    <div className="col-lg-12 col-md-12 mb-4">
                        <div className="h-100 custom-container-medidas d-flex flex-column">
                            <Medidas />
                        </div>
                    </div>
                </div>

                <div className="row align-items-stretch mb-4">
                    <div className="col-lg-12 col-md-12 mb-4">
                        <div className="h-100 custom-container-filtro d-flex flex-column">
                            <Filtro onFiltrar={manejarFiltro} />
                        </div>
                    </div>
                </div>

                <div className="row align-items-stretch mb-4">
                    <div className="col-lg-12 col-md-12 mb-4">
                            <Graficas filtro={filtro} />
                    </div>
                </div>
            </div>

            {/** FOOTER */}
            <Footer/>
        </div>
    );
}

export default Principal;
