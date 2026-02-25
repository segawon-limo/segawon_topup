import React from 'react';
import './AdminPageHeader.css';

/**
 * AdminPageHeader — reusable header untuk semua halaman admin
 *
 * Props:
 *  - title    : string  — judul halaman (e.g. "Dashboard", "Orders Management")
 *  - subtitle : string  — (opsional) teks kecil di bawah title
 *  - children : node    — tombol-tombol di sisi kanan
 */
export default function AdminPageHeader({ title, subtitle, children }) {
  return (
    <div className="admin-page-header">
      <div className="aph-left">
        <div className="aph-brand">
          <img
            src="/images/logo/logo-navbar.png"
            alt="Segawon"
            className="aph-logo"
          />
          <div className="aph-text">
            <span className="aph-brand-name">Segawon</span>
            <h1 className="aph-title">{title}</h1>
            {subtitle && <p className="aph-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children && (
        <div className="aph-right">
          {children}
        </div>
      )}
    </div>
  );
}