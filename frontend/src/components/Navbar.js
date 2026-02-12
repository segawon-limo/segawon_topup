import React from 'react';
import { Link } from 'react-router-dom';

const SITE_NAME = process.env.REACT_APP_SITE_NAME || 'Segawon Top Up';

function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-purple-600 to-purple-800 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/images/logo/logo-navbar.png" 
              srcSet="/images/logo/logo-navbar@2x.png 2x"
              alt="Segawon Top Up Logo" 
              className="w-12 h-12 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg"
            />
            <span className="text-2xl font-bold text-white drop-shadow-md">
              {SITE_NAME}
            </span>
          </Link>

          {/* Navigation Menu */}
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="text-white hover:text-purple-200 font-medium transition-colors duration-200"
            >
              Home
            </Link>
            <a 
              href="#games" 
              className="text-white hover:text-purple-200 font-medium transition-colors duration-200"
            >
              Games
            </a>
            <a 
              href={`https://wa.me/${process.env.REACT_APP_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-purple-700 px-6 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Hubungi CS
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
