import React from 'react';
import { Link } from 'react-router-dom';
import { FaGamepad } from 'react-icons/fa';

const SITE_NAME = process.env.REACT_APP_SITE_NAME || 'TopupGame.id';

function Navbar() {
  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary-600">
            <FaGamepad className="text-3xl" />
            <span>{SITE_NAME}</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-primary-600 font-medium transition">
              Home
            </Link>
            <a 
              href="#games" 
              className="text-gray-700 hover:text-primary-600 font-medium transition"
            >
              Games
            </a>
            <a 
              href={`https://wa.me/${process.env.REACT_APP_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition"
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
