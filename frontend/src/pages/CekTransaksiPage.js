import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import './CekTransaksiPage.css';
import { Helmet } from 'react-helmet-async';
import usePageTracking from '../hooks/usePageTracking'; // [ADDED]

const API_URL   = process.env.REACT_APP_API_URL  || '';
const WA_NUMBER = process.env.REACT_APP_WHATSAPP || '';

const STATUS_CONFIG = {
  pending:    { label: 'Menunggu Pembayaran', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: '⏳' },
  processing: { label: 'Sedang Diproses',    color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  icon: '⚙️' },
  success:    { label: 'Berhasil',            color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   icon: '✅' },
  completed:  { label: 'Berhasil',            color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   icon: '✅' },
  failed:     { label: 'Gagal',              color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   icon: '❌' },
  cancelled:  { label: 'Dibatalkan',          color: '#6b7280', bg: 'rgba(107,114,128,0.08)', icon: '🚫' },
};

const PAYMENT_STATUS_CONFIG = {
  pending:  { label: 'Belum Dibayar', color: '#f59e0b' },
  paid:     { label: 'Sudah Dibayar', color: '#16a34a' },
  success:  { label: 'Sudah Dibayar', color: '#16a34a' },
  expired:  { label: 'Kadaluarsa',   color: '#dc2626' },
  failed:   { label: 'Gagal',        color: '#dc2626' },
};

const VA_BANKS        = ['BR','M2','NC','I1','BV','B1','DM','BT'];
const EWALLET_REDIRECT = ['OV','SA']; // redirect langsung, tidak pakai modal
const QRIS_METHODS    = ['SQ'];

const formatRupiah = (num) =>
  'Rp ' + (parseFloat(num) || 0).toLocaleString('id-ID');

const formatDate = (str) => {
  if (!str) return '-';
  return new Date(str).toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const getPaymentMethodName = (method) => {
  const names = {
    'BR': 'BRI Virtual Account', 'M2': 'Mandiri Virtual Account',
    'NC': 'BNC Virtual Account', 'I1': 'BNI Virtual Account',
    'BV': 'BSI Virtual Account', 'B1': 'CIMB Niaga Virtual Account',
    'DM': 'Danamon Virtual Account', 'BT': 'Permata Bank Virtual Account',
    'SQ': 'QRIS', 'OV': 'OVO', 'SA': 'ShopeePay',
  };
  return names[method] || method;
};

// ── Payment Modal ─────────────────────────────────────────────
function PaymentModal({ order, onClose }) {
  const method  = order.payment?.method;
  const isQRIS  = QRIS_METHODS.includes(method);
  const isVA    = VA_BANKS.includes(method);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isQRIS && order.payment?.qrString) {
      QRCode.toDataURL(order.payment.qrString, { width: 280, margin: 2 })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [isQRIS, order.payment?.qrString]);

  const handleCopy = () => {
    navigator.clipboard.writeText(order.payment.vaNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="ct-modal-backdrop" onClick={handleBackdrop}>
      <div className="ct-modal">
        <button className="ct-modal-close" onClick={onClose}>✕</button>

        <div className="ct-modal-header">
          <div className="ct-modal-title">
            {isQRIS ? '📷 Pembayaran QRIS' : isVA ? '🏦 Virtual Account' : '💳 Pembayaran'}
          </div>
          <div className="ct-modal-subtitle">{getPaymentMethodName(method)}</div>
        </div>

        <div className="ct-modal-amount">
          <span className="ct-modal-amount-label">Total Pembayaran</span>
          <span className="ct-modal-amount-value">{formatRupiah(order.total)}</span>
        </div>

        {/* QRIS */}
        {isQRIS && (
          <div className="ct-modal-qris">
            {qrDataUrl ? (
              <>
                <p className="ct-modal-hint">Scan QR Code dengan aplikasi e-wallet Anda</p>
                <img src={qrDataUrl} alt="QR Code QRIS" className="ct-modal-qr-img" />
                <p className="ct-modal-hint-small">GoPay · OVO · DANA · ShopeePay · dan semua e-wallet yang support QRIS</p>
              </>
            ) : (
              <div className="ct-modal-loading">⏳ Memuat QR Code...</div>
            )}
          </div>
        )}

        {/* Virtual Account */}
        {isVA && order.payment?.vaNumber && (
          <div className="ct-modal-va">
            <p className="ct-modal-hint">Nomor Virtual Account</p>
            <div className="ct-modal-va-box">
              <span className="ct-modal-va-number">{order.payment.vaNumber}</span>
              <button className={`ct-modal-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                {copied ? '✓ Disalin' : '📋 Salin'}
              </button>
            </div>
            <div className="ct-modal-va-steps">
              <strong>Cara Bayar:</strong>
              <ol>
                <li>Buka aplikasi {getPaymentMethodName(method).replace(' Virtual Account','')}</li>
                <li>Pilih menu <strong>Transfer / Virtual Account</strong></li>
                <li>Masukkan nomor VA di atas</li>
                <li>Periksa detail & konfirmasi pembayaran</li>
              </ol>
            </div>
          </div>
        )}

        {/* VA tapi vaNumber belum ada */}
        {isVA && !order.payment?.vaNumber && (
          <div className="ct-modal-va">
            <a href={order.payment?.url} target="_blank" rel="noreferrer" className="ct-modal-open-btn">
              Buka Halaman Pembayaran
            </a>
          </div>
        )}

        <div className="ct-modal-expiry">
          ⏱ Batas bayar: {formatDate(order.payment?.expiresAt)}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
function CekTransaksiPage() {
  const navigate = useNavigate();
  usePageTracking('Cek Transaksi'); // [ADDED]
  const [invoice,   setInvoice]   = useState('');
  const [order,     setOrder]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [searched,  setSearched]  = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Verifikasi email untuk lihat SN/token
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyEmail,     setVerifyEmail]     = useState('');
  const [verifyError,     setVerifyError]     = useState('');
  const [verifyLoading,   setVerifyLoading]   = useState(false);
  const [verifyLocked,    setVerifyLocked]    = useState(false);
  const [verifyRemaining, setVerifyRemaining] = useState(3);
  const [serialNumber,    setSerialNumber]    = useState(null);

  const handleSearch = async () => {
    const trimmed = invoice.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setSearched(true);
    // Reset verify state setiap kali cari invoice baru
    setSerialNumber(null);
    setVerifyLocked(false);
    setVerifyRemaining(3);
    setVerifyError('');
    setVerifyEmail('');
    try {
      const res  = await fetch(`${API_URL}/api/orders/${trimmed}`);
      const data = await res.json();
      if (!data.success || !data.order) {
        setError('Invoice tidak ditemukan. Pastikan nomor invoice kamu benar.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Terjadi kesalahan koneksi. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verifyEmail.trim()) { setVerifyError('Email wajib diisi.'); return; }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res  = await fetch(`${API_URL}/api/orders/${order.orderNumber}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSerialNumber(data.serialNumber);
        setShowVerifyModal(false);
        setVerifyEmail('');
      } else if (data.locked) {
        setVerifyLocked(true);
        setVerifyRemaining(0);
        setVerifyError(data.message);
      } else {
        setVerifyRemaining(data.remaining ?? 0);
        setVerifyError(data.message);
      }
    } catch {
      setVerifyError('Terjadi kesalahan koneksi. Coba lagi.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  const handlePayClick = () => {
    const method = order?.payment?.method;
    // E-Wallet (OVO/ShopeePay) → redirect langsung
    if (EWALLET_REDIRECT.includes(method)) {
      window.open(order.payment.url, '_blank');
      return;
    }
    // QRIS atau VA → tampilkan modal
    setShowModal(true);
  };

  const effectiveStatus = order?.orderStatus || 'pending';
  const orderStatus = order ? (STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending) : null;
  const payStatus   = order ? (PAYMENT_STATUS_CONFIG[order.payment?.status] || PAYMENT_STATUS_CONFIG.pending) : null;

  return (
    <>
      <Helmet>
        <title>Cek Status Transaksi - Segawon Topup</title>
        <meta name="description" content="Cek status transaksi top up game kamu di Segawon Topup. Masukkan nomor order untuk melihat status pembayaran dan pengiriman." />
        <link rel="canonical" href="https://segawontopup.net/cek-transaksi" />
      </Helmet>
    <div className="ct-page">
      <div className="ct-blob ct-blob-1" />
      <div className="ct-blob ct-blob-2" />

      <div className="ct-container">
        {/* Header */}
        <div className="ct-header">
          <button className="ct-back" onClick={() => navigate('/')}>← Kembali</button>
          <div className="ct-logo">🔍</div>
          <h1 className="ct-title">Cek Transaksi</h1>
          <p className="ct-subtitle">Masukkan nomor invoice untuk melihat status pesanan kamu</p>
        </div>

        {/* Search Box */}
        <div className="ct-search-card">
          <label className="ct-label">Nomor Invoice</label>
          <div className="ct-search-row">
            <input
              className="ct-input"
              type="text"
              placeholder="Contoh: SGW-20260101-XXXXX"
              value={invoice}
              onChange={e => setInvoice(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button
              className={`ct-search-btn ${loading ? 'ct-loading' : ''}`}
              onClick={handleSearch}
              disabled={loading || !invoice.trim()}
            >
              {loading ? <span className="ct-spinner" /> : '🔍 Cek'}
            </button>
          </div>
          <p className="ct-hint">Nomor invoice dikirimkan ke email kamu saat melakukan transaksi</p>
        </div>

        {/* Error */}
        {searched && !loading && error && (
          <div className="ct-error-card">
            <span className="ct-error-icon">😕</span>
            <p>{error}</p>
          </div>
        )}

        {/* Result */}
        {order && !loading && (
          <div className="ct-result">
            {/* Status Banner */}
            <div className="ct-status-banner" style={{ background: orderStatus.bg, borderColor: orderStatus.color }}>
              <span className="ct-status-icon">{orderStatus.icon}</span>
              <div>
                <div className="ct-status-label" style={{ color: orderStatus.color }}>{orderStatus.label}</div>
                <div className="ct-status-invoice">Invoice: {order.orderNumber}</div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="ct-info-grid">
              {/* Produk */}
              <div className="ct-card">
                <div className="ct-card-title">🎮 Detail Produk</div>
                <div className="ct-info-rows">
                  <div className="ct-info-row">
                    <span className="ct-info-key">Produk</span>
                    <span className="ct-info-val">{order.gameName}</span>
                  </div>
                  <div className="ct-info-row">
                    <span className="ct-info-key">Item</span>
                    <span className="ct-info-val">{order.productName}</span>
                  </div>
                  {order.gameUserId && (
                    <div className="ct-info-row">
                      <span className="ct-info-key">ID</span>
                      <span className="ct-info-val ct-mono">{order.gameUserId}{order.gameUserTag ? `#${order.gameUserTag}` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pembayaran */}
              <div className="ct-card">
                <div className="ct-card-title">💳 Pembayaran</div>
                <div className="ct-info-rows">
                  <div className="ct-info-row">
                    <span className="ct-info-key">Metode</span>
                    <span className="ct-info-val">{getPaymentMethodName(order.payment?.method)}</span>
                  </div>
                  <div className="ct-info-row">
                    <span className="ct-info-key">Status Bayar</span>
                    <span className="ct-info-val" style={{ color: payStatus?.color, fontWeight: 600 }}>
                      {payStatus?.label}
                    </span>
                  </div>
                  <div className="ct-info-row">
                    <span className="ct-info-key">Harga Product</span>
                    <span className="ct-info-val">{formatRupiah(order.amount)}</span>
                  </div>
                  {/* Diskon Voucher */}
                  {order.voucherDiscount > 0 && (
                    <div className="ct-info-row">
                      <span className="ct-info-key" style={{ color: '#10b981' }}>
                        Diskon Voucher
                      </span>
                      <span className="ct-info-val" style={{ color: '#10b981', fontWeight: 600 }}>
                        - {formatRupiah(order.voucherDiscount)}
                      </span>
                    </div>
                  )}
                  {order.paymentFee > 0 && (
                    <div className="ct-info-row">
                      <span className="ct-info-key">Biaya Admin</span>
                      <span className="ct-info-val">+ {formatRupiah(order.paymentFee)}</span>
                    </div>
                  )}
                  <div className="ct-info-row ct-total-row">
                    <span className="ct-info-key">Total</span>
                    <span className="ct-info-val ct-total">{formatRupiah(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="ct-card ct-timeline-card">
              <div className="ct-card-title">🕐 Waktu Transaksi</div>
              <div className="ct-info-rows">
                <div className="ct-info-row">
                  <span className="ct-info-key">Dibuat</span>
                  <span className="ct-info-val">{formatDate(order.createdAt)}</span>
                </div>
                {order.payment?.expiresAt && order.payment?.status === 'pending' && (
                  <div className="ct-info-row">
                    <span className="ct-info-key">Batas Bayar</span>
                    <span className="ct-info-val ct-expires">{formatDate(order.payment.expiresAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="ct-actions">
              {order.payment?.url && order.payment?.status === 'pending' && (
                <button className="ct-btn-pay" onClick={handlePayClick}>
                  💳 Bayar Sekarang
                </button>
              )}

              {/* Tombol Lihat Kode — hanya untuk order completed yang punya SN */}
              {['completed', 'success'].includes(effectiveStatus) && order.productType && ['voucher_code', 'token_pln'].includes(order.productType) && (
                serialNumber ? (
                  <div className="ct-sn-box">
                    <div className="ct-sn-label">
                      {order.productType === 'token_pln' ? '⚡ Token PLN' : '🎟️ Kode Voucher'}
                    </div>
                    <div className="ct-sn-value">{serialNumber}</div>
                    <button
                      className="ct-btn-copy"
                      onClick={() => { navigator.clipboard.writeText(serialNumber); }}
                    >
                      📋 Salin Kode
                    </button>
                  </div>
                ) : (
                  <button
                    className="ct-btn-lihat-kode"
                    onClick={() => !verifyLocked && setShowVerifyModal(true)}
                    disabled={verifyLocked}
                    title={verifyLocked ? 'Terlalu banyak percobaan. Hubungi CS.' : ''}
                  >
                    🔐 {verifyLocked ? 'Akses Dikunci' : 'Lihat Kode'}
                  </button>
                )
              )}

              {effectiveStatus === 'failed' && WA_NUMBER && (
                <a
                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi, aku ingin menanyakan terkait invoice ${order.orderNumber}, kenapa gagal ya?`)}`}
                  className="ct-btn-wa"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="ct-wa-icon">💬</span> Hubungi Support
                </a>
              )}
              <button className="ct-btn-secondary" onClick={() => { setOrder(null); setInvoice(''); setSearched(false); }}>
                🔄 Cek Invoice Lain
              </button>
              <button className="ct-btn-secondary" onClick={() => navigate('/')}>
                🏠 Kembali ke Beranda
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showModal && order && (
        <PaymentModal order={order} onClose={() => setShowModal(false)} />
      )}

      {/* Verify Email Modal */}
      {showVerifyModal && (
        <div className="ct-modal-backdrop" onClick={() => { setShowVerifyModal(false); setVerifyError(''); setVerifyEmail(''); }}>
          <div className="ct-verify-modal" onClick={e => e.stopPropagation()}>
            <button className="ct-modal-close" onClick={() => { setShowVerifyModal(false); setVerifyError(''); setVerifyEmail(''); }}>✕</button>
            <div className="ct-verify-icon">🔐</div>
            <h3 className="ct-verify-title">Verifikasi Identitas</h3>
            <p className="ct-verify-desc">Masukkan email yang kamu gunakan saat melakukan order ini.</p>
            <input
              className={`ct-verify-input${verifyError ? ' error' : ''}`}
              type="email"
              placeholder="contoh@email.com"
              value={verifyEmail}
              onChange={e => { setVerifyEmail(e.target.value); setVerifyError(''); }}
              onKeyDown={e => e.key === 'Enter' && !verifyLoading && handleVerifyEmail()}
              autoFocus
            />
            {verifyError && (
              <div className={`ct-verify-error${verifyLocked ? ' locked' : ''}`}>
                {verifyError}
                {verifyLocked && WA_NUMBER && (
                  <a
                    href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi, saya tidak bisa mengakses kode order ${order.orderNumber}. Mohon bantuannya.`)}`}
                    className="ct-verify-wa"
                    target="_blank"
                    rel="noreferrer"
                  >
                    💬 Hubungi CS
                  </a>
                )}
              </div>
            )}
            {!verifyLocked && verifyRemaining < 3 && verifyRemaining > 0 && (
              <div className="ct-verify-remaining">Sisa percobaan: {verifyRemaining}x</div>
            )}
            {!verifyLocked && (
              <button
                className="ct-verify-btn"
                onClick={handleVerifyEmail}
                disabled={verifyLoading || !verifyEmail.trim()}
              >
                {verifyLoading ? '⏳ Memverifikasi...' : '✅ Verifikasi'}
              </button>
            )}
            {verifyLocked && (
              <button className="ct-verify-btn-close" onClick={() => setShowVerifyModal(false)}>
                Tutup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default CekTransaksiPage;