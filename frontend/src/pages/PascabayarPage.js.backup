import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PascabayarPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

// ── Konstanta metode pembayaran (sama persis dengan OrderPage) ─────────────────
const VA_BANKS = [
  { code: 'BR', name: 'BRI Virtual Account',           logo: '/images/bri-logo.png' },
  { code: 'M2', name: 'Mandiri Virtual Account',        logo: '/images/mandiri-logo.png' },
  { code: 'NC', name: 'Bank Neo Commerce (BNC)',        logo: '/images/bnc-logo.png' },
  { code: 'I1', name: 'BNI Virtual Account',            logo: '/images/bni-logo.png' },
  { code: 'BV', name: 'BSI Virtual Account',            logo: '/images/bsi-logo.png' },
  { code: 'B1', name: 'CIMB Niaga Virtual Account',     logo: '/images/cimb-logo.png' },
  { code: 'DM', name: 'Danamon Virtual Account',        logo: '/images/danamon-logo.png' },
  { code: 'BT', name: 'Permata Bank Virtual Account',   logo: '/images/permata-logo.png' },
];

const EWALLET_METHODS = [
  { code: 'OV', name: 'OVO',       logo: '/images/ovo-logo.png',       feeType: 'percent', feeValue: 3.03 },
  { code: 'SA', name: 'ShopeePay', logo: '/images/shopeepay-logo.png', feeType: 'percent', feeValue: 2 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatRupiah = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount);

const getMandiriBankFee = (price) => {
  const amount = parseFloat(price || 0);
  if (amount >= 1000000) return 'Rp 5.000';
  if (amount >= 500000)  return 'Rp 3.000';
  return 'Rp 2.500';
};

const STEPS = ['Cek Tagihan', 'Detail & Bayar'];

function PascabayarPage() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]               = useState('inquiry'); // 'inquiry' | 'confirm'
  const [products, setProducts]       = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customerNo, setCustomerNo]   = useState('');
  const [inquiryData, setInquiryData] = useState(null);
  const [loadingInquiry, setLoadingInquiry] = useState(false);
  const [inquiryError, setInquiryError]     = useState('');

  // Form
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [custName, setCustName] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  // Voucher (pola sama dengan OrderPage)
  const [voucherCode, setVoucherCode]         = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherApplied, setVoucherApplied]   = useState(false);
  const [voucherValidating, setVoucherValidating] = useState(false);
  const [voucherError, setVoucherError]       = useState('');

  // Pay
  const [loadingPay, setLoadingPay] = useState(false);
  const [payError, setPayError]     = useState('');

  // Fetch products on mount
  useEffect(() => {
    fetch(`${API_URL}/api/pascabayar/products`)
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data || []); })
      .catch(() => {});
  }, []);

  // Fee calculation
  const sellingPrice       = inquiryData?.selling_price || 0;
  const priceAfterDiscount = sellingPrice - (voucherApplied ? voucherDiscount : 0);

  const calculatePaymentFee = (method) => {
    if (method === 'M2') return 4000;
    if (['BR','NC','I1','BV','B1','DM','BT'].includes(method)) return 3000;
    if (method === 'SA') return Math.round(priceAfterDiscount / 0.98) - priceAfterDiscount;
    if (method === 'OV') return Math.round(priceAfterDiscount / 0.9697) - priceAfterDiscount;
    return 3000;
  };

  const paymentFee  = selectedPaymentMethod ? calculatePaymentFee(selectedPaymentMethod) : 0;
  const totalAmount = priceAfterDiscount + paymentFee;

  // ── Step 1: Cek Tagihan ────────────────────────────────────────────────────
  const handleInquiry = async () => {
    if (!selectedProduct)     { setInquiryError('Pilih provider internet terlebih dahulu'); return; }
    if (!customerNo.trim())   { setInquiryError('Nomor pelanggan wajib diisi'); return; }
    setLoadingInquiry(true);
    setInquiryError('');
    try {
      const res  = await fetch(`${API_URL}/api/pascabayar/inquiry`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ buyer_sku_code: selectedProduct.buyer_sku_code, customer_no: customerNo.trim() }),
      });
      const json = await res.json();
      if (!json.success) { setInquiryError(json.message || 'Gagal mengambil data tagihan'); return; }
      setInquiryData(json.data);
      setStep('confirm');
    } catch {
      setInquiryError('Koneksi gagal. Coba lagi.');
    } finally {
      setLoadingInquiry(false);
    }
  };

  // ── Voucher handlers (sama dengan OrderPage) ───────────────────────────────
  const handleVoucherChange = (e) => {
    setVoucherCode(e.target.value.toUpperCase());
    if (voucherApplied) { setVoucherApplied(false); setVoucherDiscount(0); setVoucherError(''); }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) { setVoucherError('Masukkan kode voucher'); return; }
    try {
      setVoucherValidating(true);
      setVoucherError('');
      const res  = await fetch(`${API_URL}/api/vouchers/validate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: voucherCode.trim(), orderAmount: sellingPrice }),
      });
      const data = await res.json();
      if (data.success) {
        setVoucherApplied(true);
        setVoucherDiscount(data.discount);
        setVoucherError('');
      } else {
        setVoucherApplied(false);
        setVoucherDiscount(0);
        setVoucherError(data.message || 'Kode voucher tidak valid');
      }
    } catch {
      setVoucherError('Gagal memvalidasi voucher');
      setVoucherApplied(false);
      setVoucherDiscount(0);
    } finally {
      setVoucherValidating(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode(''); setVoucherDiscount(0); setVoucherApplied(false); setVoucherError('');
  };

  const resetToInquiry = () => {
    setStep('inquiry');
    setInquiryData(null);
    setSelectedProduct(null);
    setCustomerNo('');
    setSelectedPaymentMethod('');
    handleRemoveVoucher();
    setPayError('');
  };

  // ── Step 2: Bayar ──────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!email.trim())          { setPayError('Email wajib diisi'); return; }
    if (!selectedPaymentMethod) { setPayError('Pilih metode pembayaran'); return; }
    setLoadingPay(true);
    setPayError('');
    try {
      const res  = await fetch(`${API_URL}/api/pascabayar/pay`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ref_id:         inquiryData.ref_id,
          customer_email: email.trim(),
          customer_name:  custName.trim() || inquiryData.customer_name,
          customer_phone: phone.trim(),
          payment_method: selectedPaymentMethod,
          ...(voucherApplied && voucherCode ? { voucher_code: voucherCode.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) { setPayError(json.message || 'Gagal memproses pembayaran'); return; }
      navigate(`/payment/${json.orderNumber}`);
    } catch {
      setPayError('Koneksi gagal. Coba lagi.');
    } finally {
      setLoadingPay(false);
    }
  };

  const stepIdx = step === 'inquiry' ? 0 : 1;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pb-page">
      <div className="pb-blob pb-blob-1" />
      <div className="pb-blob pb-blob-2" />

      <div className="pb-outer">

        {/* Back */}
        <button className="pb-back" onClick={() => navigate(-1)}>← Kembali</button>

        {/* Header */}
        <div className="pb-header">
          <div className="pb-header-icon">🌐</div>
          <h1 className="pb-header-title">Tagihan Internet</h1>
          <p className="pb-header-sub">
            {selectedProduct
              ? `${selectedProduct.name} — ${selectedProduct.description}`
              : 'Cek dan bayar tagihan internet bulanan'}
          </p>
        </div>

        {/* Stepper */}
        <div className="pb-stepper">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`pb-step ${i <= stepIdx ? 'pb-step-active' : ''} ${i < stepIdx ? 'pb-step-done' : ''}`}>
                <div className="pb-step-circle">{i < stepIdx ? '✓' : i + 1}</div>
                <span className="pb-step-label">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`pb-step-line ${i < stepIdx ? 'pb-step-line-done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
        {step === 'inquiry' && (
          <div className="pb-card pb-card-center">
            <h2 className="pb-card-title">Pilih Provider Internet</h2>
            <p className="pb-card-desc">
              Pilih provider internet kamu, lalu masukkan nomor pelanggan.
            </p>

            {/* Grid provider */}
            <div className="pb-provider-grid">
              {products.map(p => (
                <button
                  key={p.buyer_sku_code}
                  className={`pb-provider-card ${selectedProduct?.buyer_sku_code === p.buyer_sku_code ? 'pb-provider-selected' : ''}`}
                  onClick={() => { setSelectedProduct(p); setInquiryError(''); }}
                  style={{ '--provider-color': p.color }}
                >
                  <div className="pb-provider-logo-wrap">
                    <img
                      src={p.logo}
                      alt={p.name}
                      className="pb-provider-logo"
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="pb-provider-logo-fallback" style={{ background: p.color }}>
                      {p.name.charAt(0)}
                    </div>
                  </div>
                  <span className="pb-provider-name">{p.name}</span>
                  <span className="pb-provider-desc">{p.description}</span>
                  {selectedProduct?.buyer_sku_code === p.buyer_sku_code && (
                    <span className="pb-provider-check">✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Input nomor pelanggan */}
            {selectedProduct && (
              <div className="pb-provider-input-wrap">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{selectedProduct.customer_no_label}</label>
                  <input
                    type="text"
                    className={`form-input ${inquiryError ? 'error' : ''}`}
                    placeholder={selectedProduct.customer_no_hint}
                    value={customerNo}
                    onChange={e => { setCustomerNo(e.target.value); setInquiryError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleInquiry()}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {inquiryError && <div className="pb-error-box" style={{ marginTop: '16px' }}>❌ {inquiryError}</div>}

            <button
              className="pb-btn-primary"
              onClick={handleInquiry}
              disabled={loadingInquiry || !selectedProduct}
              style={{ marginTop: '20px' }}
            >
              {loadingInquiry ? '⏳ Mengecek tagihan...' : '🔍 Cek Tagihan'}
            </button>
          </div>
        )}

        {/* ── STEP 2 ─────────────────────────────────────────────────────── */}
        {step === 'confirm' && inquiryData && (
          <div className="pb-layout">

            {/* LEFT COLUMN */}
            <div className="pb-left">

              {/* Info Tagihan */}
              <div className="pb-card pb-card-tagihan">
                <h2 className="pb-card-title">✅ Detail Tagihan Ditemukan</h2>
                <div className="pb-info-rows">
                  <div className="pb-info-row">
                    <span className="pb-info-key">Nama Pelanggan</span>
                    <span className="pb-info-val">{inquiryData.customer_name || '-'}</span>
                  </div>
                  <div className="pb-info-row">
                    <span className="pb-info-key">Nomor Pelanggan</span>
                    <span className="pb-info-val">{inquiryData.customer_no}</span>
                  </div>
                  {inquiryData.periode && (
                    <div className="pb-info-row">
                      <span className="pb-info-key">Periode</span>
                      <span className="pb-info-val">{inquiryData.periode}</span>
                    </div>
                  )}
                  {inquiryData.lembar_tagihan > 0 && (
                    <div className="pb-info-row">
                      <span className="pb-info-key">Lembar Tagihan</span>
                      <span className="pb-info-val">{inquiryData.lembar_tagihan} lembar</span>
                    </div>
                  )}
                  {inquiryData.detail && inquiryData.detail.length > 0 && inquiryData.detail.map((d, i) => (
                    <div key={i} className="pb-info-row pb-detail-row">
                      <span className="pb-info-key">↳ {d.periode}</span>
                      <span className="pb-info-val">{formatRupiah(d.nilai_tagihan)}</span>
                    </div>
                  ))}
                  {inquiryData.admin_fee > 0 && (
                    <div className="pb-info-row">
                      <span className="pb-info-key">Biaya Admin</span>
                      <span className="pb-info-val" style={{ color: '#f59e0b', fontWeight: 600 }}>
                        {formatRupiah(inquiryData.admin_fee)}
                      </span>
                    </div>
                  )}
                  <div className="pb-info-row pb-info-row-total">
                    <span className="pb-info-key">Total Tagihan</span>
                    <span className="pb-info-val pb-price-red">{formatRupiah(sellingPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Data Customer */}
              <div className="pb-card">
                <h2 className="pb-card-title">Data Pembayaran</h2>

                <div className="form-group">
                  <label className="form-label">Email <span className="required-star">*</span></label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="email@contoh.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <p className="form-hint">Invoice akan dikirim ke email ini</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nama kamu (opsional)"
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nomor HP</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="08xxxxxxxxxx (opsional)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Voucher (UI sama dengan OrderPage) */}
              <div className="pb-card">
                <h2 className="pb-card-title">
                  Kode Voucher <span className="pb-optional">(Opsional)</span>
                </h2>
                <div className="voucher-input-group">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={handleVoucherChange}
                    placeholder="Masukkan kode voucher"
                    className={`form-input ${voucherError ? 'error' : voucherApplied ? 'success' : ''}`}
                    disabled={voucherApplied}
                    maxLength={50}
                  />
                  {!voucherApplied ? (
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      disabled={voucherValidating || !voucherCode.trim()}
                      className="btn-apply-voucher"
                    >
                      {voucherValidating ? 'Memvalidasi...' : 'Pakai'}
                    </button>
                  ) : (
                    <button type="button" onClick={handleRemoveVoucher} className="btn-remove-voucher">
                      Hapus
                    </button>
                  )}
                </div>
                {voucherError   && <div className="voucher-error">❌ {voucherError}</div>}
                {voucherApplied && <div className="voucher-success">✓ Voucher berhasil diterapkan! Hemat {formatRupiah(voucherDiscount)}</div>}
              </div>

              {/* Metode Pembayaran */}
              <div className="pb-card">
                <h2 className="pb-card-title">Metode Pembayaran</h2>

                <p className="pb-payment-group-label">Virtual Account</p>
                <div className="pb-payment-list">
                  {VA_BANKS.map(m => (
                    <label
                      key={m.code}
                      className={`pb-payment-option ${selectedPaymentMethod === m.code ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={m.code}
                        checked={selectedPaymentMethod === m.code}
                        onChange={() => { setSelectedPaymentMethod(m.code); setPayError(''); }}
                      />
                      <img src={m.logo} alt={m.name} className="payment-logo"
                        onError={e => { e.target.style.display = 'none'; }} />
                      <span className="pb-payment-name">{m.name}</span>
                      <span className="pb-payment-fee">
                        +{m.code === 'M2' ? 'Rp 4.000' : 'Rp 3.000'}
                      </span>
                    </label>
                  ))}
                </div>

                <p className="pb-payment-group-label" style={{ marginTop: '16px' }}>E-Wallet</p>
                <div className="pb-payment-list">
                  {EWALLET_METHODS.map(m => (
                    <label
                      key={m.code}
                      className={`pb-payment-option ${selectedPaymentMethod === m.code ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={m.code}
                        checked={selectedPaymentMethod === m.code}
                        onChange={() => { setSelectedPaymentMethod(m.code); setPayError(''); }}
                      />
                      <img src={m.logo} alt={m.name} className="payment-logo"
                        onError={e => { e.target.style.display = 'none'; }} />
                      <span className="pb-payment-name">{m.name}</span>
                      <span className="pb-payment-fee">+{m.feeValue}%</span>
                    </label>
                  ))}
                </div>
              </div>

              {payError && <div className="pb-error-box">❌ {payError}</div>}

              <div className="pb-actions">
                <button className="pb-btn-secondary" onClick={resetToInquiry}>
                  ← Ganti Nomor
                </button>
                <button className="pb-btn-primary" onClick={handlePay} disabled={loadingPay}>
                  {loadingPay ? '⏳ Memproses...' : '💳 Bayar Sekarang'}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Order Summary (sticky, pola sama dengan OrderPage) */}
            <div className="pb-right">
              <div className="order-summary">
                <h3>Ringkasan Pesanan</h3>

                <div className="summary-item">
                  <span>Pelanggan</span>
                  <span>{inquiryData.customer_no}</span>
                </div>

                <div className="summary-item">
                  <span>Total Tagihan</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(sellingPrice)}</span>
                </div>

                {voucherApplied && voucherDiscount > 0 && (
                  <div className="summary-item voucher-discount">
                    <span>Diskon Voucher ({voucherCode})</span>
                    <span style={{ color: '#10b981', fontWeight: '700' }}>
                      - {formatRupiah(voucherDiscount)}
                    </span>
                  </div>
                )}

                {selectedPaymentMethod && (
                  <>
                    <div className="summary-item">
                      <span>Metode Bayar</span>
                      <span>
                        {VA_BANKS.find(b => b.code === selectedPaymentMethod)?.name ||
                         EWALLET_METHODS.find(e => e.code === selectedPaymentMethod)?.name ||
                         selectedPaymentMethod}
                      </span>
                    </div>

                    <div className="summary-item">
                      <span>Biaya Layanan</span>
                      <span style={{ color: '#f59e0b', fontWeight: '700' }}>
                        {formatRupiah(paymentFee)}
                      </span>
                    </div>

                    {selectedPaymentMethod === 'M2' && (
                      <div style={{
                        background: '#fffbeb', border: '1px solid #fde68a',
                        borderRadius: '8px', padding: '10px 14px',
                        marginTop: '-4px', marginBottom: '4px',
                      }}>
                        <p style={{ fontSize: '12px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>
                          ⚠️ Biaya Bank Mandiri (ditagih langsung oleh bank)
                        </p>
                        <p style={{ fontSize: '12px', color: '#78350f', margin: 0, lineHeight: '1.6' }}>
                          {getMandiriBankFee(priceAfterDiscount)} — tidak termasuk dalam total di atas
                        </p>
                      </div>
                    )}

                    <div className="summary-divider" />
                    <div className="summary-total">
                      <span>Total Pembayaran</span>
                      <span className="total-price">{formatRupiah(totalAmount)}</span>
                    </div>
                  </>
                )}

                {!selectedPaymentMethod && (
                  <p style={{ fontSize: '13px', color: '#a0aec0', textAlign: 'center', padding: '12px 0', margin: 0 }}>
                    Pilih metode pembayaran untuk melihat total
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default PascabayarPage;