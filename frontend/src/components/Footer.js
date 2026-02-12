import React from 'react';
import { FaWhatsapp, FaEnvelope, FaInstagram, FaFacebook } from 'react-icons/fa';

const SITE_NAME = process.env.REACT_APP_SITE_NAME || 'Segawon Top Up';
const WHATSAPP = process.env.REACT_APP_WHATSAPP;

function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Section with Logo */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/images/logo/logo-footer.png" 
                srcSet="/images/logo/logo-footer@2x.png 2x"
                alt="Segawon Top Up Logo" 
                className="w-16 h-16 drop-shadow-lg"
              />
              <div>
                <h3 className="text-2xl font-bold">{SITE_NAME}</h3>
                <p className="text-purple-400 text-sm font-medium">Platform Top Up #1</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md">
              Platform top up game terpercaya dengan proses otomatis 24/7. 
              Aman, cepat, dan mudah. Ratusan ribu transaksi sukses setiap bulannya.
            </p>
            
            {/* Social Media */}
            <div className="flex gap-4 mt-6">
              <a 
                href="#" 
                className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition-colors duration-200"
                aria-label="Instagram"
              >
                <FaInstagram className="text-lg" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition-colors duration-200"
                aria-label="Facebook"
              >
                <FaFacebook className="text-lg" />
              </a>
              <a 
                href={`https://wa.me/${WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-500 transition-colors duration-200"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="text-lg" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-purple-400">Navigasi</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <a href="/" className="hover:text-white transition-colors duration-200">
                  🏠 Home
                </a>
              </li>
              <li>
                <a href="/#games" className="hover:text-white transition-colors duration-200">
                  🎮 Daftar Game
                </a>
              </li>
              <li>
                <a href="/#features" className="hover:text-white transition-colors duration-200">
                  ⭐ Fitur Unggulan
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors duration-200">
                  ❓ FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-purple-400">Hubungi Kami</h3>
            <div className="space-y-3 text-gray-400 text-sm">
              <div className="flex items-start gap-3">
                <FaWhatsapp className="text-xl text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs">WhatsApp</p>
                  <a 
                    href={`https://wa.me/${WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors duration-200 font-medium"
                  >
                    +{WHATSAPP}
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <FaEnvelope className="text-xl text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs">Email</p>
                  <a 
                    href="mailto:support@segawontopup.net"
                    className="hover:text-white transition-colors duration-200"
                  >
                    support@segawontopup.net
                  </a>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Jam Operasional:</p>
                <p className="text-sm font-semibold text-green-400">
                  ⚡ 24/7 Otomatis
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-800 pt-6 mb-6">
          <p className="text-sm text-gray-500 mb-3 text-center">Metode Pembayaran:</p>
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <div className="bg-white px-3 py-2 rounded-md">
              <img src="/images/qris-logo.png" alt="QRIS" className="h-6" />
            </div>
            <div className="bg-white px-3 py-2 rounded-md">
              <img src="/images/gopay-logo.png" alt="GoPay" className="h-6" />
            </div>
            <div className="bg-white px-3 py-2 rounded-md">
              <img src="/images/dana-logo.png" alt="DANA" className="h-6" />
            </div>
            <div className="bg-white px-3 py-2 rounded-md">
              <img src="/images/ovo-logo.png" alt="OVO" className="h-6" />
            </div>
            <div className="bg-white px-3 py-2 rounded-md">
              <img src="/images/shopeepay-logo.png" alt="ShopeePay" className="h-6" />
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-6 text-center">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Powered by 🐕 Segawon Team | Made with ❤️ in Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
