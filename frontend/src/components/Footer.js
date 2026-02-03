import React from 'react';
import { FaWhatsapp, FaEnvelope, FaGamepad } from 'react-icons/fa';

const SITE_NAME = process.env.REACT_APP_SITE_NAME || 'TopupGame.id';
const WHATSAPP = process.env.REACT_APP_WHATSAPP;

function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-2xl font-bold mb-4">
              <FaGamepad />
              <span>{SITE_NAME}</span>
            </div>
            <p className="text-gray-400 text-sm">
              Platform topup game terpercaya dengan proses instan 24/7. Aman, cepat, dan mudah.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="/" className="hover:text-white transition">Home</a>
              </li>
              <li>
                <a href="/#games" className="hover:text-white transition">Games</a>
              </li>
              <li>
                <a href="/#features" className="hover:text-white transition">Fitur</a>
              </li>
              <li>
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  Hubungi Kami
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">Hubungi Kami</h3>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-center gap-3">
                <FaWhatsapp className="text-xl" />
                <a 
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  WhatsApp: +{WHATSAPP}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <FaEnvelope className="text-xl" />
                <span>support@segawontopup.net</span>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-400">Jam Operasional:</p>
              <p className="text-sm font-semibold">24/7 Otomatis</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <p className="mt-2">
            Powered by Segawon Team.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
