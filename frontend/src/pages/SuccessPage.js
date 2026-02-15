import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './SuccessPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';
const CODE_PRODUCT_TYPES = ['voucher_code', 'token_pln'];
const MAX_POLLS = 40; // 40 × 3s = 2 menit

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const orderNumber    = searchParams.get('order_id');

  const [order,       setOrder]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);
  const [polling,     setPolling]     = useState(false);
  const [pollCount,   setPollCount]   = useState(0);
  const intervalRef = useRef(null);

  const isCodeProduct = (o) => o && CODE_PRODUCT_TYPES.includes(o.productType);
  const hasCode       = (o) => o && o.serialNumber;

  // ── fetch ─────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/orders/${orderNumber}`);
      const data = await res.json();
      if (data.success) { setOrder(data.order); return data.order; }
    } catch (e) { console.error(e); }
    return null;
  }, [orderNumber]);

  // ── initial load ──────────────────────────────────────────
  useEffect(() => {
    if (!orderNumber) return;
    fetchOrder().then(o => {
      setLoading(false);
      if (isCodeProduct(o) && !hasCode(o)) setPolling(true);
    });
  }, [orderNumber]);

  // ── polling loop ──────────────────────────────────────────
  useEffect(() => {
    if (!polling) return;
    intervalRef.current = setInterval(async () => {
      setPollCount(c => {
        if (c + 1 >= MAX_POLLS) {
          clearInterval(intervalRef.current);
          setPolling(false);
        }
        return c + 1;
      });
      const o = await fetchOrder();
      if (hasCode(o)) { clearInterval(intervalRef.current); setPolling(false); }
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [polling]);

  // ── copy ──────────────────────────────────────────────────
  const copy = async () => {
    try { await navigator.clipboard.writeText(order.serialNumber); }
    catch {
      const el = document.createElement('textarea');
      el.value = order.serialNumber;
      document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const rp  = n => `Rp ${parseFloat(n||0).toLocaleString('id-ID')}`;
  const fmt = d => d ? new Date(d).toLocaleString('id-ID', {
    day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
  }) : '-';

  const codeLabel = t => t === 'token_pln' ? 'Token PLN' : 'Kode Voucher';
  const codeHint  = t => t === 'token_pln'
    ? 'Masukkan token ini di meteran listrik atau aplikasi PLN Mobile'
    : 'Di Steam: klik nama profil → Redeem a Steam Gift Card or Wallet Code';

  // ── loading ───────────────────────────────────────────────
  if (loading) return (
    <div className="sp-page">
      <div className="sp-loader"><div className="sp-loader-ring"/><p>Memuat pesanan...</p></div>
    </div>
  );

  const isCode    = isCodeProduct(order);
  const ready     = hasCode(order);
  const timedOut  = !polling && isCode && !ready && pollCount >= MAX_POLLS;

  return (
    <div className="sp-page">
      {/* background blobs */}
      <div className="sp-blob sp-blob-1"/>
      <div className="sp-blob sp-blob-2"/>

      <div className="sp-card">

        {/* ── checkmark ─────────────────────────────── */}
        <div className="sp-check-wrap">
          <svg className="sp-check-svg" viewBox="0 0 52 52">
            <circle className="sp-check-circle" cx="26" cy="26" r="25" fill="none"/>
            <path  className="sp-check-mark"   fill="none" d="M14 27l8 8 16-16"/>
          </svg>
        </div>

        <h1 className="sp-title">Pembayaran Berhasil!</h1>
        <p  className="sp-subtitle">
          {isCode
            ? ready   ? 'Kode kamu sudah siap!' : 'Sedang menyiapkan kode...'
            : 'Pesanan kamu akan masuk ke akun dalam beberapa menit'}
        </p>

        {/* ── KODE AREA ─────────────────────────────── */}
        {isCode && (
          <div className={`sp-code-zone ${ready ? 'is-ready' : timedOut ? 'is-timeout' : 'is-waiting'}`}>

            {/* waiting */}
            {!ready && !timedOut && (
              <div className="sp-code-waiting">
                <div className="sp-pulse-ring">
                  <div className="sp-pulse-dot"/>
                </div>
                <p className="sp-waiting-title">Memproses kode</p>
                <p className="sp-waiting-hint">Halaman ini akan otomatis update. Jangan ditutup.</p>
                <div className="sp-progress-bar">
                  <div
                    className="sp-progress-fill"
                    style={{ width: `${Math.min((pollCount / MAX_POLLS) * 100, 95)}%` }}
                  />
                </div>
              </div>
            )}

            {/* timeout */}
            {timedOut && (
              <div className="sp-code-timeout">
                <span className="sp-timeout-icon">⚠️</span>
                <p>Kode sedang diproses lebih lama dari biasanya.</p>
                <p>Cek inbox email kamu atau hubungi CS kami.</p>
              </div>
            )}

            {/* ready */}
            {ready && (
              <div className="sp-code-ready">
                <div className="sp-code-label">{codeLabel(order.productType)}</div>
                <div className="sp-code-value" onClick={copy} title="Klik untuk menyalin">
                  {order.serialNumber}
                </div>
                <button className={`sp-btn-copy ${copied ? 'copied' : ''}`} onClick={copy}>
                  {copied ? '✓ Tersalin!' : '📋 Salin Kode'}
                </button>
                <p className="sp-code-hint">{codeHint(order.productType)}</p>
              </div>
            )}
          </div>
        )}

        {/* ── ORDER DETAIL ───────────────────────────── */}
        {order && (
          <div className="sp-detail">
            <div className="sp-detail-header">Detail Pesanan</div>

            <div className="sp-row">
              <span>No. Pesanan</span>
              <span className="sp-mono">{order.orderNumber}</span>
            </div>
            <div className="sp-row">
              <span>Produk</span>
              <span>{order.productName}</span>
            </div>
            {!isCode && order.gameUserId && (
              <div className="sp-row">
                <span>Game ID</span>
                <span>{order.gameUserId}{order.gameUserTag && ` (${order.gameUserTag})`}</span>
              </div>
            )}
            <div className="sp-row">
              <span>Email</span>
              <span>{order.customer_email}</span>
            </div>
            <div className="sp-divider"/>
            <div className="sp-row sp-row-total">
              <span>Total</span>
              <span>{rp(order.total)}</span>
            </div>
            <div className="sp-row">
              <span>Waktu</span>
              <span>{fmt(order.createdAt)}</span>
            </div>
          </div>
        )}

        {/* ── NOTES ─────────────────────────────────── */}
        <div className="sp-notes">
          <div className="sp-note">
            <span>📧</span>
            <span>
              {isCode
                ? 'Kode juga dikirim ke email kamu sebagai backup'
                : 'Cek email untuk konfirmasi detail pesanan'}
            </span>
          </div>
          <div className="sp-note">
            <span>💬</span>
            <span>Kendala? Hubungi CS kami, kami siap membantu</span>
          </div>
        </div>

        {/* ── BUTTONS ───────────────────────────────── */}
        <div className="sp-actions">
          <button className="sp-btn-primary" onClick={() => navigate('/')}>
            Kembali ke Beranda
          </button>
          <button
            className="sp-btn-secondary"
            onClick={() => navigate(`/order/${order?.gameSlug || 'steam-wallet'}`)}
          >
            Pesan Lagi
          </button>
        </div>

      </div>
    </div>
  );
}