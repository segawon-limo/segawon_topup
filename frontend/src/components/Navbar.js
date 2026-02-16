import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const SITE_NAME = process.env.REACT_APP_SITE_NAME || 'Segawon Top Up';
const WA_NUMBER = process.env.REACT_APP_WHATSAPP || '';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-gradient-to-r from-pink-600 to-red-600 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group" onClick={() => setMenuOpen(false)}>
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

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-white hover:text-pink-100 font-medium transition-colors duration-200"
            >
              Home
            </Link>
            <a
              href="#games"
              className="text-white hover:text-pink-100 font-medium transition-colors duration-200"
            >
              Games
            </a>
            <a
              href={`https://wa.me/${WA_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-pink-700 px-6 py-2 rounded-lg font-semibold hover:bg-pink-50 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Hubungi CS
            </a>
          </div>

          {/* Hamburger Button — mobile only */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-white/10 transition-colors duration-200 focus:outline-none"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white my-1 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-gradient-to-b from-red-600 to-red-700 px-4 pb-4 pt-2 flex flex-col gap-1 border-t border-white/20">
          <Link
            to="/"
            className="text-white font-medium py-3 px-4 rounded-lg hover:bg-white/10 transition-colors duration-200"
            onClick={() => setMenuOpen(false)}
          >
            🏠 Home
          </Link>
          <a
            href="#games"
            className="text-white font-medium py-3 px-4 rounded-lg hover:bg-white/10 transition-colors duration-200"
            onClick={() => setMenuOpen(false)}
          >
            🎮 Games
          </a>
          <a
            href={`https://wa.me/${WA_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 bg-white text-pink-700 text-center py-3 px-4 rounded-lg font-semibold hover:bg-pink-50 transition-colors duration-200 shadow-md"
            onClick={() => setMenuOpen(false)}
          >
            💬 Hubungi CS
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;