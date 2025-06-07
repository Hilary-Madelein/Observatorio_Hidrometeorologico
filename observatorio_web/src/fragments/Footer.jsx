import React from 'react';
import LogoCIS from '../img/LOGO_CIS.png'

const Footer = () => {
    return (
        <footer className="footer-gradient text-center text-lg-start">
            <div className="footer-content p-2">
                <div className="footer-item">
                    <img src={LogoCIS} alt="Logo CIS" className="logo-cis" />
                </div>
            </div>
        </footer>
    );
};

export default Footer;