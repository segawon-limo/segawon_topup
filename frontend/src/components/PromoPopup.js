import React, { useState } from 'react';
import './PromoPopup.css';

export default function PromoPopup({ voucher, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(voucher.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const formatDiscount = () => {
    if (voucher.discount_type === 'percentage') return `${voucher.discount_value}% OFF`;
    if (voucher.discount_type === 'fixed') return `Hemat Rp ${Number(voucher.discount_value).toLocaleString('id-ID')}`;
    return 'Diskon Spesial';
  };

  const formatMinPurchase = () => {
    if (!voucher.min_purchase || parseFloat(voucher.min_purchase) <= 0) return null;
    return `Min. beli Rp ${Number(voucher.min_purchase).toLocaleString('id-ID')}`;
  };

  const formatExpiry = () => {
    if (!voucher.valid_until) return null;
    const d = new Date(voucher.valid_until);
    return `S/d ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const minPurchase = formatMinPurchase();
  const expiry      = formatExpiry();

  return (
    <div className="promo-overlay" onClick={onClose}>
      <div className="promo-popup" onClick={e => e.stopPropagation()}>

        <button className="promo-close" onClick={onClose} aria-label="Tutup">×</button>

        <div className="promo-badge">PROMO SPESIAL</div>
        <div className="promo-discount">{formatDiscount()}</div>
        {voucher.description && (
          <p className="promo-desc">{voucher.description}</p>
        )}

        {/* Tiket voucher 1:3 */}
        <div className="promo-ticket-wrap">
          <div className="promo-ticket">
            <div className="ticket-left">
              <div className="ticket-logo-ring">
                <img
                  src="/images/logo/logo-navbar@2x.png"
                  alt="Segawon Topup"
                  className="ticket-logo-img"
                />
              </div>
            </div>

            <div className="ticket-notch-top" />
            <div className="ticket-notch-bot" />

            <div className="ticket-right">
              <span className="ticket-code-label">KODE VOUCHER</span>
              <span className="ticket-code">{voucher.code}</span>
            </div>
          </div>
        </div>

        <button
          className={`promo-salin${copied ? ' copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ Kode tersalin!' : 'Salin Kode'}
        </button>

        {(minPurchase || expiry) && (
          <div className="promo-info">
            {minPurchase && <span>{minPurchase}</span>}
            {expiry      && <span>{expiry}</span>}
          </div>
        )}

        <button className="promo-cta" onClick={onClose}>
          Belanja Sekarang →
        </button>

      </div>
    </div>
  );
}