import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CekTransaksiPage.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const STATUS_CONFIG = {
  pending:    { label: 'Menunggu Pembayaran', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '⏳' },
  processing: { label: 'Sedang Diproses',    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: '⚙️' },
  success:    { label: 'Berhasil',            color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '✅' },
  failed:     { label: 'Gagal',              color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: '❌' },
  cancelled:  { label: 'Dibatalkan',          color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: '🚫' },
};

const PAYMENT_STATUS_CONFIG = {
  pending:  { label: 'Belum Dibayar', color: '#f59e0b' },
  paid:     { label: 'Sudah Dibayar', color: '#10b981' },
  expired:  { label: 'Kadaluarsa',   color: '#ef4444' },
  failed:   { label: 'Gagal',        color: '#ef4444' },
};

const formatRupiah = (num) =>
  'Rp ' + (parseFloat(num) || 0).toLocaleString('id-ID');

const formatDate = (str) => {
  if (!str) return '-';
  return new Date(str).toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

function CekTransaksiPage() {
  const navigate = useNavigate();
  const [invoice, setInvoice]   = useState('');
  const [order,   setOrder]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const trimmed = invoice.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setSearched(true);
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const orderStatus  = order ? (STATUS_CONFIG[order.orderStatus]  || STATUS_CONFIG.pending)  : null;
  const payStatus    = order ? (PAYMENT_STATUS_CONFIG[order.payment?.status] || PAYMENT_STATUS_CONFIG.pending) : null;

  return (
    <div className="ct-page">
      {/* Background blobs */}
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
              placeholder="Contoh: SGW-20250222-XXXXX"
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
                <div className="ct-status-label" style={{ color: orderStatus.color }}>
                  {orderStatus.label}
                </div>
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
                    <span className="ct-info-key">Game</span>
                    <span className="ct-info-val">{order.gameName}</span>
                  </div>
                  <div className="ct-info-row">
                    <span className="ct-info-key">Item</span>
                    <span className="ct-info-val">{order.productName}</span>
                  </div>
                  {order.gameUserId && (
                    <div className="ct-info-row">
                      <span className="ct-info-key">User ID</span>
                      <span className="ct-info-val ct-mono">{order.gameUserId}{order.gameUserTag ? `#${order.gameUserTag}` : ''}</span>
                    </div>
                  )}
                  {order.serialNumber && (
                    <div className="ct-info-row">
                      <span className="ct-info-key">Kode / SN</span>
                      <span className="ct-info-val ct-mono ct-highlight">{order.serialNumber}</span>
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
                    <span className="ct-info-val">{order.payment?.method || '-'}</span>
                  </div>
                  <div className="ct-info-row">
                    <span className="ct-info-key">Status Bayar</span>
                    <span className="ct-info-val" style={{ color: payStatus?.color, fontWeight: 600 }}>
                      {payStatus?.label}
                    </span>
                  </div>
                  <div className="ct-info-row">
                    <span className="ct-info-key">Subtotal</span>
                    <span className="ct-info-val">{formatRupiah(order.subtotal)}</span>
                  </div>
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
                <a href={order.payment.url} className="ct-btn-pay" target="_blank" rel="noreferrer">
                  💳 Bayar Sekarang
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
    </div>
  );
}

export default CekTransaksiPage;