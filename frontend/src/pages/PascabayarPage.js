import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PascabayarPage.css';
import { Helmet } from 'react-helmet-async';
import usePageTracking from '../hooks/usePageTracking'; // [ADDED]

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

const paymentLogos = {
  'BR': '/images/bri-logo.png',
  'M2': '/images/mandiri-logo.png',
  'NC': '/images/bnc-logo.png',
  'I1': '/images/bni-logo.png',
  'BV': '/images/bsi-logo.png',
  'B1': '/images/cimb-logo.png',
  'DM': '/images/danamon-logo.png',
  'BT': '/images/permata-logo.png',
  'SA': '/images/shopeepay-logo.png',
  'OV': '/images/ovo-logo.png',
  'SQ': '/images/qris-logo.png',
  'DA': '/images/dana-logo.png',
};

const VA_BANKS = [
  { code: 'BR', name: 'BRI Virtual Account',          logo: 'BR' },
  { code: 'M2', name: 'Mandiri Virtual Account',       logo: 'M2' },
  { code: 'NC', name: 'Bank Neo Commerce (BNC)',       logo: 'NC' },
  { code: 'I1', name: 'BNI Virtual Account',           logo: 'I1' },
  { code: 'BV', name: 'BSI Virtual Account',           logo: 'BV' },
  { code: 'B1', name: 'CIMB Niaga Virtual Account',    logo: 'B1' },
  { code: 'DM', name: 'Danamon Virtual Account',       logo: 'DM' },
  { code: 'BT', name: 'Permata Bank Virtual Account',  logo: 'BT' },
];

const EWALLET_METHODS = [
  { code: 'OV', name: 'OVO',       logo: 'OV', feeValue: 3.03 },
  { code: 'SA', name: 'ShopeePay', logo: 'SA', feeValue: 2 },
  { code: 'DA', name: 'DANA',      logo: 'DA', feeValue: 1.67 },
];

const QRIS_METHODS = [
  { code: 'SQ', name: 'QRIS', logo: 'SQ', feeValue: 0.7 },
];

const formatRupiah = (amount) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

// Format periode: "202605" → "Mei 2025", "MEI 2019" → tetap, dll
const formatPeriode = (periode) => {
  if (!periode) return periode;
  // Format YYYYMM (dari PLN)
  if (/^\d{6}$/.test(periode)) {
    const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    const tahun = periode.slice(0, 4);
    const bln   = parseInt(periode.slice(4, 6), 10) - 1;
    return `${bulan[bln] || periode.slice(4)} ${tahun}`;
  }
  return periode;
};

const getMandiriBankFee = (price) => {
  const amount = parseFloat(price || 0);
  if (amount >= 1000000) return 'Rp 5.000';
  if (amount >= 500000)  return 'Rp 3.000';
  return 'Rp 2.500';
};

function PascabayarPage() {
  const navigate = useNavigate();
  usePageTracking('Pascabayar'); // [ADDED]

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]                       = useState('inquiry');
  const [products, setProducts]               = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customerNo, setCustomerNo]           = useState('');
  const [inquiryData, setInquiryData]         = useState(null);
  const [loadingInquiry, setLoadingInquiry]   = useState(false);
  const [inquiryError, setInquiryError]       = useState('');

  // Form data — di-persist ke sessionStorage agar tidak hilang saat browser discard tab (mobile)
  const DRAFT_KEY = 'sgw_pasca_draft';
  const TOKEN_KEY = 'sgw_pasca_token';

  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : { customerEmail: '', customerName: '', customerPhone: '' };
    } catch { return { customerEmail: '', customerName: '', customerPhone: '' }; }
  });
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({
    customerEmail: false,
    customerName:  false,
    customerPhone: false,
  });
  const [emailValidating, setEmailValidating] = useState(false);
  const [phoneValidating, setPhoneValidating] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [openAccordion, setOpenAccordion]                 = useState(null);

  // Voucher
  const [voucherCode, setVoucherCode]             = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY + '_voucher'))?.code || ''; } catch { return ''; }
  });
  const [voucherDiscount, setVoucherDiscount]     = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY + '_voucher'))?.discount || 0; } catch { return 0; }
  });
  const [voucherApplied, setVoucherApplied]       = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY + '_voucher'))?.applied || false; } catch { return false; }
  });
  const [voucherValidating, setVoucherValidating] = useState(false);
  const [voucherError, setVoucherError]           = useState('');
  // [UPDATED] sessionToken di-persist di sessionStorage — tidak berubah saat page discard/restore
  const [voucherSessionToken] = useState(() => {
    try {
      let token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) { token = crypto.randomUUID(); sessionStorage.setItem(TOKEN_KEY, token); }
      return token;
    } catch { return crypto.randomUUID(); }
  });

  // Pay
  const [loadingPay, setLoadingPay] = useState(false);
  const [payError, setPayError]     = useState('');

  // ── Fetch products ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/pascabayar/products`)
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data || []); })
      .catch(() => {});
  }, []);

  // ── Fee calculation ────────────────────────────────────────────────────────
  const sellingPrice       = inquiryData?.selling_price || 0;
  const adminFee           = inquiryData?.admin_fee || 0;
  const detailTagihan      = sellingPrice - adminFee;
  const priceAfterDiscount = sellingPrice - (voucherApplied ? voucherDiscount : 0);

  const calculatePaymentFee = (method) => {
    if (method === 'M2') return 4000;
    if (['BR','NC','I1','BV','B1','DM','BT'].includes(method)) return 3000;
    if (method === 'SQ') return Math.round(priceAfterDiscount / 0.993) - priceAfterDiscount;
    if (method === 'SA') return Math.round(priceAfterDiscount / 0.98)  - priceAfterDiscount;
    if (method === 'OV') return Math.round(priceAfterDiscount / 0.9697) - priceAfterDiscount;
    if (method === 'DA') return Math.round(priceAfterDiscount / 0.9833) - priceAfterDiscount;
    return 3000;
  };

  const paymentFee  = selectedPaymentMethod ? calculatePaymentFee(selectedPaymentMethod) : 0;
  const totalAmount = priceAfterDiscount + paymentFee;

  // VA minimum Rp 10.000 (kebijakan Duitku) — cek harga produk langsung
  const showVA = priceAfterDiscount >= 10000;

  // [ADDED] Auto-save formData ke sessionStorage — restore saat browser discard tab (mobile)
  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData)); } catch {}
  }, [formData, DRAFT_KEY]);

  // [ADDED] Auto-save voucher state ke sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY + '_voucher', JSON.stringify({
        code: voucherCode, discount: voucherDiscount, applied: voucherApplied
      }));
    } catch {}
  }, [voucherCode, voucherDiscount, voucherApplied, DRAFT_KEY]);

  // ── Form handlers — identik dengan OrderPage ───────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const PHONE_REGEX = /^(\+62|62|0)[0-9]{9,12}$/;

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    if (name === 'customerEmail') validateEmail(formData.customerEmail);
    if (name === 'customerPhone') validatePhone(formData.customerPhone);
  };

  const validateEmail = async (email) => {
    if (!email) {
      setErrors(prev => ({ ...prev, customerEmail: 'Email wajib diisi' }));
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setErrors(prev => ({ ...prev, customerEmail: 'Format email tidak valid' }));
      return;
    }
    setEmailValidating(true);
    try {
      const res = await fetch(`${API_URL}/api/validate-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', value: email.trim() }),
      });
      const data = await res.json();
      if (!data.valid) {
        setErrors(prev => ({ ...prev, customerEmail: data.message || 'Email tidak valid' }));
      } else {
        setErrors(prev => { const n = { ...prev }; delete n.customerEmail; return n; });
      }
    } catch {
      setErrors(prev => { const n = { ...prev }; delete n.customerEmail; return n; });
    } finally {
      setEmailValidating(false);
    }
  };

  const validatePhone = async (phone) => {
    if (!phone || !phone.trim()) {
      setErrors(prev => ({ ...prev, customerPhone: 'Nomor HP wajib diisi' }));
      return;
    }
    const clean = phone.trim().replace(/[\s\-]/g, '');
    if (!PHONE_REGEX.test(clean)) {
      setErrors(prev => ({ ...prev, customerPhone: 'Format nomor HP tidak valid (contoh: 08123456789)' }));
      return;
    }
    setPhoneValidating(true);
    try {
      const res = await fetch(`${API_URL}/api/validate-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'phone', value: clean }),
      });
      const data = await res.json();
      if (!data.valid) {
        setErrors(prev => ({ ...prev, customerPhone: data.message || 'Nomor HP tidak valid' }));
      } else {
        setErrors(prev => { const n = { ...prev }; delete n.customerPhone; return n; });
      }
    } catch {
      setErrors(prev => { const n = { ...prev }; delete n.customerPhone; return n; });
    } finally {
      setPhoneValidating(false);
    }
  };

  useEffect(() => {
    if (!touched.customerEmail || !formData.customerEmail) return;
    const timer = setTimeout(() => validateEmail(formData.customerEmail), 1200);
    return () => clearTimeout(timer);
  }, [formData.customerEmail, touched.customerEmail]);

  // Reset metode pembayaran jika VA dipilih tapi tiba-tiba tidak tersedia
  useEffect(() => {
    if (!showVA && VA_BANKS.some(b => b.code === selectedPaymentMethod)) {
      setSelectedPaymentMethod('');
      setOpenAccordion(null);
    }
  }, [showVA]);

  const allowPhoneInput = (e) => {
    const { key, target } = e;
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
    if (allowed.includes(key)) return;
    if (/[0-9]/.test(key)) return;
    if (key === '+' && target.selectionStart === 0 && !target.value.includes('+')) return;
    e.preventDefault();
  };

  const handlePastePhone = (e) => {
    let pasteData = e.clipboardData.getData('text').replace(/[^\d+]/g, '');
    if (pasteData.startsWith('08')) pasteData = '+62' + pasteData.slice(1);
    if (pasteData.includes('+')) pasteData = '+' + pasteData.replace(/\+/g, '').replace(/[^\d]/g, '');
    e.preventDefault();
    setFormData(prev => ({ ...prev, customerPhone: pasteData }));
  };

  const allowOnlyAlphabet = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
    if (allowed.includes(e.key)) return;
    if (e.key === ' ') return;
    if (/^\p{L}$/u.test(e.key)) return;
    e.preventDefault();
  };

  const handlePasteAlphabet = (e) => {
    const pasteData = e.clipboardData.getData('text').replace(/[^\p{L}\s]/gu, '');
    e.preventDefault();
    setFormData(prev => ({ ...prev, customerName: pasteData }));
  };

  const toggleAccordion = (key) => {
    setOpenAccordion(prev => prev === key ? null : key);
  };

  const handlePaymentMethodChange = (method) => {
    setSelectedPaymentMethod(method);
    setPayError('');
  };

  // ── Inquiry ────────────────────────────────────────────────────────────────
  const handleInquiry = async () => {
    if (!selectedProduct)   { setInquiryError('Pilih produk pascabayar terlebih dahulu'); return; }
    if (!customerNo.trim()) { setInquiryError('Nomor pelanggan wajib diisi'); return; }
    setLoadingInquiry(true); setInquiryError('');
    try {
      const res  = await fetch(`${API_URL}/api/pascabayar/inquiry`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_sku_code: selectedProduct.buyer_sku_code, customer_no: customerNo.trim() }),
      });
      const json = await res.json();
      if (!json.success) { setInquiryError(json.message || 'Gagal mengambil data tagihan'); return; }
      setInquiryData(json.data);
      setStep('confirm');
    } catch { setInquiryError('Koneksi gagal. Coba lagi.'); }
    finally  { setLoadingInquiry(false); }
  };

  // ── Voucher ────────────────────────────────────────────────────────────────
  const handleVoucherChange = (e) => {
    setVoucherCode(e.target.value.toUpperCase());
    if (voucherApplied) { setVoucherApplied(false); setVoucherDiscount(0); setVoucherError(''); }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) { setVoucherError('Masukkan kode voucher'); return; }
    try {
      setVoucherValidating(true); setVoucherError('');
      const res  = await fetch(`${API_URL}/api/vouchers/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:          voucherCode.trim(),
          orderAmount:   sellingPrice,
          profitPrice:   inquiryData?.komisi ?? null,
          customerEmail: formData.customerEmail?.trim() || null, // [ADDED]
          customerPhone: formData.customerPhone?.trim() || null, // [ADDED]
          sessionToken:  voucherSessionToken,                    // [ADDED]
        }),
      });
      const data = await res.json();
      if (data.success) { setVoucherApplied(true); setVoucherDiscount(data.discount); }
      else { setVoucherApplied(false); setVoucherDiscount(0); setVoucherError(data.message || 'Kode voucher tidak valid'); }
    } catch { setVoucherError('Gagal memvalidasi voucher'); }
    finally  { setVoucherValidating(false); }
  };

  // [UPDATED] Panggil /vouchers/release agar reservation langsung dilepas di backend
  //           → voucher bisa langsung dipakai di produk/tab lain tanpa tunggu 10 menit expired
  const handleRemoveVoucher = () => {
    if (voucherApplied && voucherCode.trim()) {
      fetch(`${API_URL}/api/vouchers/release`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode.trim(), sessionToken: voucherSessionToken }),
      }).catch(() => {/* reservation akan auto-expire jika request gagal */});
    }
    setVoucherCode(''); setVoucherDiscount(0); setVoucherApplied(false); setVoucherError('');
  };

  // ── Pay ────────────────────────────────────────────────────────────────────
  const handlePay = async () => {
    validateEmail(formData.customerEmail);
    if (!formData.customerEmail.trim()) { setPayError('Email wajib diisi'); return; }
    if (errors.customerEmail)           { setPayError('Format email tidak valid'); return; }
    if (!formData.customerPhone.trim()) { setPayError('Nomor HP wajib diisi'); return; }
    if (!selectedPaymentMethod)         { setPayError('Pilih metode pembayaran'); return; }
    setLoadingPay(true); setPayError('');
    try {
      const res  = await fetch(`${API_URL}/api/pascabayar/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref_id:         inquiryData.ref_id,
          customer_email: formData.customerEmail.trim(),
          customer_name:  formData.customerName.trim() || inquiryData.customer_name,
          customer_phone: formData.customerPhone.trim(),
          payment_method: selectedPaymentMethod,
          ...(voucherApplied && voucherCode ? {
            voucher_code:          voucherCode.trim(),
            voucher_session_token: voucherSessionToken, // [ADDED]
          } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) { setPayError(json.message || 'Gagal memproses pembayaran'); return; }
      // [ADDED] Hapus draft sessionStorage setelah order berhasil
      try {
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(DRAFT_KEY + '_voucher');
        sessionStorage.removeItem(TOKEN_KEY);
      } catch {}
      navigate(`/payment/${json.orderNumber}`);
    } catch { setPayError('Koneksi gagal. Coba lagi.'); }
    finally  { setLoadingPay(false); }
  };

  const resetToInquiry = () => {
    setStep('inquiry'); setInquiryData(null); setSelectedProduct(null);
    setCustomerNo(''); setSelectedPaymentMethod(''); setOpenAccordion(null);
    handleRemoveVoucher(); setPayError('');
    setFormData({ customerEmail: '', customerName: '', customerPhone: '' });
    setErrors({}); setTouched({ customerEmail: false, customerName: false, customerPhone: false });
  };

  // Progressive disclosure — metode pembayaran muncul setelah email & phone valid
  const contactFilled = formData.customerEmail.trim() &&
                        !errors.customerEmail &&
                        formData.customerPhone.trim();

  const isFormValid = () =>
    formData.customerEmail.trim() &&
    !errors.customerEmail &&
    formData.customerPhone.trim() &&
    selectedPaymentMethod;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Helmet>
        <title>Tagihan Pascabayar - Segawon Topup</title>
        <meta name="description" content="Bayar tagihan listrik PLN dan internet pascabayar dengan mudah di Segawon Topup. Proses cepat, aman, dan terpercaya." />
        <link rel="canonical" href="https://segawontopup.net/pascabayar" />
      </Helmet>
    <div className="pb-page">

      {/* ── Header Banner ──────────────────────────────────────────────────── */}
      <div className="pb-banner">
        <div className="pb-banner-inner">
          <button className="pb-back" onClick={() => navigate(-1)}>← Kembali</button>
          <div className="pb-banner-content">
            <span className="pb-banner-icon">🌐</span>
            <h1 className="pb-banner-title">Tagihan Pascabayar</h1>
            <p className="pb-banner-sub">
              {selectedProduct
                ? `${selectedProduct.name} — ${selectedProduct.description}`
                : 'Pilih produk pascabayar dan bayar tagihan bulanan'}
            </p>
          </div>
        </div>
      </div>

      <div className="pb-container">

        {/* ── STEP 1: Cek Tagihan ────────────────────────────────────────── */}
        {step === 'inquiry' && (
          <div className="pb-inquiry-wrap">
            <div className="order-form">

              <div className="pb-stepper-inline">
                <div className="pb-stepper-dot pb-stepper-dot-active">1</div>
                <div className="pb-stepper-line" />
                <div className="pb-stepper-dot">2</div>
                <span className="pb-stepper-label">Cek Tagihan</span>
              </div>

              <div className="form-section">
                <h2>1. Pilih Produk</h2>
                <div className="pb-provider-grid">
                  {products.map(p => (
                    <button
                      key={p.buyer_sku_code}
                      className={`pb-provider-card ${selectedProduct?.buyer_sku_code === p.buyer_sku_code ? 'pb-provider-selected' : ''}`}
                      onClick={() => { setSelectedProduct(p); setInquiryError(''); setCustomerNo(''); }}
                      style={{ '--provider-color': p.color }}
                    >
                      <div className="pb-provider-logo-wrap">
                        <img src={p.logo} alt={p.name} className="pb-provider-logo"
                          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
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
              </div>

              {selectedProduct && (
                <div className="form-section">
                  <h2>2. Nomor Pelanggan</h2>
                  <div className="form-group">
                    <label>{selectedProduct.customer_no_label}</label>
                    <input
                      type="text"
                      className={inquiryError ? 'error' : ''}
                      placeholder={selectedProduct.customer_no_hint}
                      value={customerNo}
                      onChange={e => { setCustomerNo(e.target.value); setInquiryError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleInquiry()}
                      autoFocus
                    />
                    {inquiryError && <div className="error">{inquiryError}</div>}
                  </div>
                  <button
                    className="btn-submit"
                    onClick={handleInquiry}
                    disabled={loadingInquiry || !customerNo.trim()}
                  >
                    {loadingInquiry ? 'Mengecek tagihan...' : '🔍 Cek Tagihan'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Detail & Bayar ─────────────────────────────────────── */}
        {step === 'confirm' && inquiryData && (
          <div className="order-layout">

            {/* LEFT: Form */}
            <div className="order-form">

              {/* Detail Tagihan */}
              <div className="form-section">
                <h2>✅ Detail Tagihan Ditemukan</h2>
                <div className="pb-info-table">
                  <div className="pb-info-row">
                    <span>Nama Pelanggan</span>
                    <span>{inquiryData.customer_name || '-'}</span>
                  </div>
                  <div className="pb-info-row">
                    <span>Nomor Pelanggan</span>
                    <span>{inquiryData.customer_no}</span>
                  </div>
                  {inquiryData.periode && (
                    <div className="pb-info-row">
                      <span>Periode</span>
                      <span>{formatPeriode(inquiryData.periode)}</span>
                    </div>
                  )}
                  {inquiryData.lembar_tagihan > 0 && (
                    <div className="pb-info-row">
                      <span>Lembar Tagihan</span>
                      <span>{inquiryData.lembar_tagihan} lembar</span>
                    </div>
                  )}
                  {/* PLN: tarif dan daya */}
                  {inquiryData.tarif && (
                    <div className="pb-info-row">
                      <span>Tarif / Golongan</span>
                      <span>{inquiryData.tarif}{inquiryData.daya ? ` / ${inquiryData.daya.toLocaleString('id-ID')} VA` : ''}</span>
                    </div>
                  )}
                  {inquiryData.detail?.map((d, i) => (
                    <div key={i} className="pb-info-row pb-info-detail">
                      <span>↳ {formatPeriode(d.periode) || `Tagihan ${i + 1}`}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div>{formatRupiah(d.nilai_tagihan || 0)}</div>
                        {d.denda && parseInt(d.denda) > 0 && (
                          <div style={{ fontSize: '12px', color: '#ef4444' }}>Denda: {formatRupiah(d.denda)}</div>
                        )}
                        {d.admin && parseInt(d.admin) > 0 && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Admin: {formatRupiah(d.admin)}</div>
                        )}
                        {(d.meter_awal || d.meter_akhir) && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                            Meter: {d.meter_awal} → {d.meter_akhir}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {inquiryData.admin_fee > 0 && (
                    <div className="pb-info-row">
                      <span>Biaya Admin</span>
                      <span className="pb-fee-amount">{formatRupiah(inquiryData.admin_fee)}</span>
                    </div>
                  )}
                  <div className="pb-info-row pb-info-total">
                    <span>Total Tagihan</span>
                    <span className="pb-price-red">{formatRupiah(sellingPrice)}</span>
                  </div>
                </div>
                <button className="pb-btn-ganti" onClick={resetToInquiry}>← Ganti Provider / Nomor</button>
              </div>

              {/* Step 1: Informasi Kontak */}
              <div className="form-section">
                <h2>1. Informasi Kontak</h2>

                <div className="form-group">
                  <label>Nama <span style={{ fontSize:'12px', color:'#9ca3af', fontWeight:'400' }}>(opsional)</span></label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    onKeyDown={allowOnlyAlphabet}
                    onPaste={handlePasteAlphabet}
                    placeholder="Nama Lengkap (opsional)"
                  />
                </div>

                <div className="form-group">
                  <label>Email <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="email@example.com"
                      className={touched.customerEmail && errors.customerEmail ? 'error' : (touched.customerEmail && !errors.customerEmail && !emailValidating && formData.customerEmail ? 'valid' : '')}
                      style={{ paddingRight: (emailValidating || (touched.customerEmail && !errors.customerEmail && !emailValidating && formData.customerEmail)) ? '36px' : undefined }}
                    />
                    {emailValidating && (
                      <span style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', color:'#9ca3af' }}>⏳</span>
                    )}
                    {!emailValidating && touched.customerEmail && !errors.customerEmail && formData.customerEmail && (
                      <span style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'16px', color:'#38a169' }}>✓</span>
                    )}
                  </div>
                  {touched.customerEmail && errors.customerEmail && (
                    <div className="error">{errors.customerEmail}</div>
                  )}
                  {!emailValidating && touched.customerEmail && !errors.customerEmail && formData.customerEmail && (
                    <div style={{ fontSize:'12px', color:'#38a169', marginTop:'4px' }}>✓ Email valid</div>
                  )}
                  <small>Invoice akan dikirim ke email ini</small>
                </div>

                <div className="form-group">
                  <label>
                    Nomor HP {selectedPaymentMethod === 'OV' ? '(OVO) ' : '(WhatsApp) '}
                    <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      onKeyDown={allowPhoneInput}
                      onPaste={handlePastePhone}
                      onBlur={handleBlur}
                      inputMode="numeric"
                      placeholder="081234567890"
                      className={errors.customerPhone ? 'error' : ''}
                      style={{ paddingRight: phoneValidating ? '36px' : undefined }}
                    />
                    {phoneValidating && (
                      <span style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', color:'#9ca3af' }}>⏳</span>
                    )}
                  </div>
                  {errors.customerPhone && <div className="error">{errors.customerPhone}</div>}
                  {selectedPaymentMethod === 'OV' && (
                    <div className="info-box-ovo">
                      ⚠️ <strong>Penting:</strong> Gunakan nomor HP yang terdaftar di akun OVO kamu.
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Metode Pembayaran — muncul setelah email & phone valid */}
              {contactFilled && (
                <div className="form-section">
                  <h2>2. Pilih Pembayaran</h2>

                  <div className="payment-methods">

                    {/* Virtual Account — hanya tampil jika total >= Rp 10.000 */}
                    {showVA ? (
                    <div className={`payment-accordion ${openAccordion === 'va' ? 'open' : ''}`}>
                      <button type="button" className="accordion-header" onClick={() => toggleAccordion('va')}>
                        <span className="accordion-title">
                          🏦 Virtual Account
                          {VA_BANKS.find(b => b.code === selectedPaymentMethod) && (
                            <span className="accordion-selected-badge">
                              {VA_BANKS.find(b => b.code === selectedPaymentMethod)?.name}
                            </span>
                          )}
                        </span>
                        <span className="accordion-chevron">{openAccordion === 'va' ? '▲' : '▼'}</span>
                      </button>
                      {openAccordion === 'va' && (
                        <div className="accordion-body">
                          {VA_BANKS.map(bank => (
                            <label key={bank.code} className={`payment-option ${selectedPaymentMethod === bank.code ? 'selected' : ''}`}>
                              <input type="radio" name="paymentMethod" value={bank.code}
                                checked={selectedPaymentMethod === bank.code}
                                onChange={(e) => handlePaymentMethodChange(e.target.value)} />
                              <div className="payment-info">
                                <img src={`${process.env.PUBLIC_URL}${paymentLogos[bank.logo]}`} alt={bank.name} className="payment-logo"
                                  onError={e => { e.target.style.display='none'; }} />
                                <span className="payment-name">{bank.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    ) : (
                      <div className="va-unavailable-notice">
                        🏦 <strong>Virtual Account</strong> tidak tersedia — minimum transaksi VA adalah <strong>Rp 10.000</strong>. Silahkan gunakan QRIS atau E-Wallet.
                      </div>
                    )}

                    {/* QRIS */}
                    <div className={`payment-accordion ${openAccordion === 'qris' ? 'open' : ''}`}>
                      <button type="button" className="accordion-header" onClick={() => toggleAccordion('qris')}>
                        <span className="accordion-title">
                          📷 QRIS
                          {QRIS_METHODS.find(q => q.code === selectedPaymentMethod) && (
                            <span className="accordion-selected-badge">
                              {QRIS_METHODS.find(q => q.code === selectedPaymentMethod)?.name}
                            </span>
                          )}
                        </span>
                        <span className="accordion-chevron">{openAccordion === 'qris' ? '▲' : '▼'}</span>
                      </button>
                      {openAccordion === 'qris' && (
                        <div className="accordion-body">
                          {QRIS_METHODS.map(qr => (
                            <label key={qr.code} className={`payment-option ${selectedPaymentMethod === qr.code ? 'selected' : ''}`}>
                              <input type="radio" name="paymentMethod" value={qr.code}
                                checked={selectedPaymentMethod === qr.code}
                                onChange={(e) => handlePaymentMethodChange(e.target.value)} />
                              <div className="payment-info">
                                <img src={`${process.env.PUBLIC_URL}${paymentLogos[qr.logo]}`} alt={qr.name} className="payment-logo"
                                  onError={e => { e.target.style.display='none'; }} />
                                <span className="payment-name">{qr.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* E-Wallet */}
                    <div className={`payment-accordion ${openAccordion === 'ewallet' ? 'open' : ''}`}>
                      <button type="button" className="accordion-header" onClick={() => toggleAccordion('ewallet')}>
                        <span className="accordion-title">
                          💳 E-Wallet
                          {EWALLET_METHODS.find(e => e.code === selectedPaymentMethod) && (
                            <span className="accordion-selected-badge">
                              {EWALLET_METHODS.find(e => e.code === selectedPaymentMethod)?.name}
                            </span>
                          )}
                        </span>
                        <span className="accordion-chevron">{openAccordion === 'ewallet' ? '▲' : '▼'}</span>
                      </button>
                      {openAccordion === 'ewallet' && (
                        <div className="accordion-body">
                          {EWALLET_METHODS.map(ew => (
                            <label key={ew.code} className={`payment-option ${selectedPaymentMethod === ew.code ? 'selected' : ''}`}>
                              <input type="radio" name="paymentMethod" value={ew.code}
                                checked={selectedPaymentMethod === ew.code}
                                onChange={(e) => handlePaymentMethodChange(e.target.value)} />
                              <div className="payment-info">
                                <img src={`${process.env.PUBLIC_URL}${paymentLogos[ew.logo]}`} alt={ew.name} className="payment-logo"
                                  onError={e => { e.target.style.display='none'; }} />
                                <span className="payment-name">{ew.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {payError && <div className="error" style={{ marginTop: 12 }}>{payError}</div>}
                </div>
              )}

              {/* Step 3: Voucher — muncul setelah metode pembayaran dipilih */}
              {contactFilled && selectedPaymentMethod && (
                <div className="form-section voucher-section">
                  <h2>3. Kode Voucher (Opsional)</h2>
                  <div className="voucher-input-group">
                    <input type="text"
                      value={voucherCode}
                      onChange={handleVoucherChange}
                      placeholder="Masukkan kode voucher"
                      className={voucherError ? 'error' : voucherApplied ? 'success' : ''}
                      disabled={voucherApplied}
                      maxLength={50}
                    />
                    {!voucherApplied ? (
                      <button type="button" onClick={handleApplyVoucher}
                        disabled={voucherValidating || !voucherCode.trim()}
                        className="btn-apply-voucher">
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
              )}

            </div>{/* end order-form */}

            {/* RIGHT: Summary */}
            <div className="pb-summary-col">

              <div className="pb-stepper-bar">
                <div className="pb-step-item pb-step-done">
                  <div className="pb-step-circle pb-step-circle-done">✓</div>
                  <span>Cek Tagihan</span>
                </div>
                <div className="pb-step-connector pb-step-connector-done" />
                <div className="pb-step-item pb-step-active">
                  <div className="pb-step-circle pb-step-circle-active">2</div>
                  <span>Detail & Bayar</span>
                </div>
              </div>

              <div className="order-summary">
                <h3>Ringkasan Pesanan</h3>

                <div className="summary-item">
                  <span>Produk</span>
                  <span>{selectedProduct?.name}</span>
                </div>
                <div className="summary-item">
                  <span>Pelanggan</span>
                  <span>{inquiryData.customer_no}</span>
                </div>
                <div className="summary-item">
                  <span>Tagihan</span>
                  <span>{formatRupiah(detailTagihan)}</span>
                </div>

                {adminFee > 0 && (
                  <div className="summary-item">
                    <span>Biaya Admin</span>
                    <span style={{ color: '#f59e0b', fontWeight: '700' }}>{formatRupiah(adminFee)}</span>
                  </div>
                )}

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
                      <span>Metode Pembayaran</span>
                      <span>
                        {VA_BANKS.find(b => b.code === selectedPaymentMethod)?.name ||
                         EWALLET_METHODS.find(e => e.code === selectedPaymentMethod)?.name ||
                         QRIS_METHODS.find(q => q.code === selectedPaymentMethod)?.name}
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
                        borderRadius: '8px', padding: '10px 14px', marginTop: '-4px', marginBottom: '4px',
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

                    <button
                      className="btn-submit"
                      onClick={handlePay}
                      disabled={loadingPay || !isFormValid()}
                    >
                      {loadingPay ? 'Memproses...' : '💳 Bayar Sekarang'}
                    </button>
                  </>
                )}

                {!selectedPaymentMethod && (
                  <div className="summary-placeholder">
                    <p>
                      {!contactFilled
                        ? 'Isi email dan nomor HP untuk melanjutkan'
                        : 'Pilih metode pembayaran untuk melihat total'}
                    </p>
                  </div>
                )}

              </div>{/* end order-summary */}
            </div>{/* end pb-summary-col */}

          </div>
        )}

      </div>
    </div>
    </>
  );
}

export default PascabayarPage;