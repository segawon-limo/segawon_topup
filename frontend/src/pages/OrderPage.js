import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './OrderPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

// Payment method logo mapping
const paymentLogos = {
  // VA aktif — kode Duitku langsung
  'BR': '/images/bri-logo.png',
  'M2': '/images/mandiri-logo.png',
  'NC': '/images/bnc-logo.png',
  'I1': '/images/bni-logo.png',
  'BV': '/images/bsi-logo.png',
  'B1': '/images/cimb-logo.png',
  'DM': '/images/danamon-logo.png',
  'BT': '/images/permata-logo.png',
  // E-Wallet aktif
  'SA': '/images/shopeepay-logo.png',
  'OV': '/images/ovo-logo.png',
  // Coming soon
  'qris':    '/images/qris-logo.png',
  'SQ':      '/images/qris-logo.png',
  'ewallet': '/images/dana-logo.png',
};

// VA yang aktif dan bisa dipilih
const VA_BANKS = [
  { code: 'BR', name: 'BRI Virtual Account',          logo: 'BR' },
  { code: 'M2', name: 'Mandiri Virtual Account',       logo: 'M2' },
  { code: 'NC', name: 'Bank Neo Commerce (BNC)',       logo: 'NC' },
  { code: 'I1', name: 'BNI Virtual Account',          logo: 'I1' },
  { code: 'BV', name: 'BSI Virtual Account',          logo: 'BV' },
  { code: 'B1', name: 'CIMB Niaga Virtual Account',   logo: 'B1' },
  { code: 'DM', name: 'Danamon Virtual Account',      logo: 'DM' },
  { code: 'BT', name: 'Permata Bank Virtual Account', logo: 'BT' },
];

// E-Wallet aktif
const EWALLET_METHODS = [
  { code: 'OV', name: 'OVO',       logo: 'OV', feeType: 'percent', feeValue: 3.03 },
  { code: 'SA', name: 'ShopeePay', logo: 'SA', feeType: 'percent', feeValue: 2 },
];

// QRIS aktif
const QRIS_METHODS = [
  { code: 'SQ', name: 'QRIS (Semua E-Wallet)', logo: 'SQ', feeType: 'percent', feeValue: 0.7 },
];

// ── buildDisplayFormat ────────────────────────────────────────
// Mengkonversi string template dari DB menjadi fungsi displayFormat.
// Template yang didukung: "userId", "userId#zoneId", "userId (zoneId)", "—"
const buildDisplayFormat = (template) => {
  if (!template || template === '—') return () => '—';
  if (template === 'userId#zoneId')   return (userId, zoneId) => `${userId}#${zoneId}`;
  if (template === 'userId (zoneId)') return (userId, zoneId) => `${userId} (${zoneId})`;
  return (userId) => userId; // default: hanya userId
};

// ── buildValidation ───────────────────────────────────────────
// Mengkonversi string validation dari DB menjadi object validation
// yang dipakai validateUserId(). null = tidak perlu validasi API.
const buildValidation = (validationKey) => {
  if (validationKey === 'riot_id') {
    return {
      endpoint: '/api/validate-riot-id',
      bodyFormat: (userId, zoneId) => ({ riotId: userId, riotTag: zoneId }),
    };
  }
  // 'pln_meter' ditangani langsung di validateUserId() via productType === 'token_pln'
  return null;
};

// ── DEFAULT CONFIG FALLBACK ───────────────────────────────────
// Dipakai hanya jika game belum punya form_config di DB.
const DEFAULT_GAME_CONFIG = {
  fields: [{ name: 'userId', label: 'User ID', placeholder: 'Masukkan ID Anda', type: 'text' }],
  validation: null,
  displayFormat: (userId) => userId,
  headerImage: 'default-header.jpg',
  iconFile: null,
  pageTitle: null,
};

function OrderPage() {
  const { gameSlug } = useParams();

  const [game, setGame] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // ── Derived dari data API ─────────────────────────────────────
  const productType = game?.product_type || 'topup_game';

  // Bangun currentGameConfig dari form_config yang datang dari API.
  // form_config adalah JSONB dari DB — sudah include fields, headerImage, iconFile, pageTitle.
  // displayFormat & validation dikonversi dari string/key ke fungsi.
  const currentGameConfig = React.useMemo(() => {
    const raw = game?.form_config;
    if (!raw) return DEFAULT_GAME_CONFIG;

    return {
      fields:        raw.fields        || DEFAULT_GAME_CONFIG.fields,
      displayFormat: buildDisplayFormat(raw.displayFormat),
      validation:    buildValidation(raw.validation),
      headerImage:   raw.headerImage   || DEFAULT_GAME_CONFIG.headerImage,
      iconFile:      raw.iconFile      || DEFAULT_GAME_CONFIG.iconFile,
      pageTitle:     raw.pageTitle     || null,
    };
  }, [game]);

  // Apakah Step 2 perlu ditampilkan?
  const showStep2 = productType !== 'voucher_code';

  // Riot ID validation state
  // const [riotIdValidated, setRiotIdValidated] = useState(false);
  const [userIdValidated, setUserIdValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [plnInfo, setPlnInfo] = useState(null); // { idpel, nama, tarif, daya } dari PLNCEK

  // Form data
  const [formData, setFormData] = useState({
    userId: '',
    zoneId: '',
    customerEmail: '',
    customerPhone: '',
    customerName: '',
  });

  // NEW: Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [voucherValidating, setVoucherValidating] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  const [errors, setErrors] = useState({});

  // Inputphone
  const allowPhoneInput = (e) => {
    const { key, target } = e;

    const allowedControlKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
    ];

    // Allow control keys
    if (allowedControlKeys.includes(key)) return;

    // Allow number
    if (/[0-9]/.test(key)) return;

    // Allow + ONLY if:
    // - cursor di posisi 0
    // - belum ada +
    if (key === "+" && target.selectionStart === 0 && !target.value.includes("+")) {
      return;
    }

    // Block others
    e.preventDefault();
  };

  // Handle paste event for phone input
  const handlePastePhone = (e) => {
    let pasteData = e.clipboardData.getData("text");

    pasteData = pasteData.replace(/[^\d+]/g, "");

    if (pasteData.startsWith("08")) {
      pasteData = "+62" + pasteData.slice(1);
    }

    if (pasteData.includes("+")) {
      pasteData = "+" + pasteData.replace(/\+/g, "").replace(/[^\d]/g, "");
    }

    e.preventDefault();

    setFormData(prev => ({
      ...prev,
      customerPhone: pasteData,
    }));
  };

  // === Name Validation ===
  const allowOnlyAlphabet = (e) => {
    const allowedControlKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab"
    ];

    if (allowedControlKeys.includes(e.key)) return;

    // Allow space
    if (e.key === " ") return;

    // Allow unicode letters
    if (/^\p{L}$/u.test(e.key)) return;

    e.preventDefault();
  };

  const handlePasteAlphabet = (e) => {
    let pasteData = e.clipboardData.getData("text");

    pasteData = pasteData.replace(/[^\p{L}\s]/gu, "");

    e.preventDefault();

    setFormData(prev => ({
      ...prev,
      customerName: pasteData,
    }));
  };

  // === END Name Validation ===

  // === Email Validation with Debounce ===

  const [touched, setTouched] = useState({
    customerEmail: false,
    customerName: false,
    customerPhone: false
  });

  const handleBlur = (e) => {
    const { name } = e.target;

    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    if (name === "customerEmail") {
      validateEmail(formData.customerEmail);
    }
  };


  // email validation debounce
  const [emailTimer, setEmailTimer] = useState(null);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setErrors(prev => ({ ...prev, customerEmail: "Email wajib diisi" }));
    } else if (!regex.test(email)) {
      setErrors(prev => ({ ...prev, customerEmail: "Format email tidak valid" }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.customerEmail;
        return newErrors;
      });
    }
  };

  // Debounced email validation
  // useEffect(() => {
  //   if (emailTimer) clearTimeout(emailTimer);

  //   const timer = setTimeout(() => {
  //     validateEmail(formData.customerEmail);
  //   }, 1500); // 1.5 detik

  //   setEmailTimer(timer);

  //   return () => clearTimeout(timer);
  // }, [formData.customerEmail]);

  useEffect(() => {
    if (!touched.customerEmail) return;
    if (!formData.customerEmail) return;

    const timer = setTimeout(() => {
      validateEmail(formData.customerEmail);
    }, 1200);

    return () => clearTimeout(timer);
  }, [formData.customerEmail, touched.customerEmail]);
  // === END Email Validation ===

  // Load products
  useEffect(() => {
    loadProducts();
  }, [gameSlug]);

  // Scroll effect for header fade
  useEffect(() => {
    const handleScroll = () => {
      const headerImage = document.getElementById('game-header-image');
      if (!headerImage) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const headerHeight = headerImage.offsetHeight;
      
      const fadeStart = 0;
      const fadeEnd = headerHeight * 1.2;
      
      let opacity = 1;
      
      if (scrollTop > fadeStart) {
        const fadeProgress = Math.min(scrollTop / fadeEnd, 1);
        opacity = Math.max(0, 1 - fadeProgress);
      }
      
      headerImage.style.opacity = opacity;
      
      const scale = 1 + (scrollTop / 3000);
      headerImage.style.transform = `scale(${Math.min(scale, 1.1)})`;
    };

    handleScroll();
    
    // window.addEventListener('scroll', handleScroll); dari claude
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent auto-scroll on page load
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Prevent browser from restoring scroll position
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    return () => {
      // Reset to automatic when component unmounts
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, [gameSlug]); // Re-run when game changes

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/products/${gameSlug}`);
      const data = await response.json();

      if (data.success) {
        // Response: { game: { ..., form_config: {...} }, products: [...] }
        setGame(data.game);
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate payment fee — harus konsisten dengan backend (order.controller.js)
  const calculatePaymentFee = (method) => {
    // Kode Duitku: M2=Mandiri, BR=BRI, NC=BNC, I1=BNI, BV=BSI, B1=CIMB, DM=Danamon, BT=Permata
    if (method === 'M2') return 4000;
    if (['BR','NC','I1','BV','B1','DM','BT'].includes(method)) return 3000;
    // QRIS Nusapay (SQ) — 0.7% dari harga setelah diskon
    if (method === 'SQ') return Math.round(priceAfterDiscount / 0.993) - priceAfterDiscount;
    // E-Wallet SA (ShopeePay) — 2% dari harga setelah diskon
    if (method === 'SA') return Math.round(priceAfterDiscount / 0.98) - priceAfterDiscount;
    // E-Wallet OVO — 3.03% dari harga setelah diskon
    if (method === 'OV') return Math.round(priceAfterDiscount / 0.9697) - priceAfterDiscount;
    return 3000; // default
  };

  // Biaya tambahan Mandiri yang ditagih langsung oleh bank (info saja, tidak masuk total)
  const getMandiriBankFee = (price) => {
    const amount = parseFloat(price || 0);
    if (amount >= 1000000) return 'Rp 5.000';
    if (amount >= 500000)  return 'Rp 3.000';
    return 'Rp 2.500';
  };

  // NEW: Calculate totals with voucher discount
  // Price after voucher discount
  const priceAfterDiscount = selectedProduct 
    ? selectedProduct.price - (voucherApplied ? voucherDiscount : 0)
    : 0;

  // Payment fee is calculated based on price AFTER voucher discount
  const paymentFee = selectedPaymentMethod && selectedProduct 
    ? calculatePaymentFee(selectedPaymentMethod)
    : 0;
  
  const totalAmount = priceAfterDiscount + paymentFee;
  
  // Format currency
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };
  // === END ADD ===

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setSelectedPaymentMethod('');
    setUserIdValidated(false);
    setPlnInfo(null);
    // Reset voucher when product changes
    setVoucherCode('');
    setVoucherDiscount(0);
    setVoucherApplied(false);
    setVoucherError('');
  };

  const handlePaymentMethodChange = (method) => {
    setSelectedPaymentMethod(method);
  };

  // NEW: Handle voucher code input
  const handleVoucherChange = (e) => {
    const code = e.target.value.toUpperCase();
    setVoucherCode(code);
    
    // Reset voucher state when user changes the code
    if (voucherApplied) {
      setVoucherApplied(false);
      setVoucherDiscount(0);
      setVoucherError('');
    }
  };

  // NEW: Validate and apply voucher
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Masukkan kode voucher');
      return;
    }

    if (!selectedProduct) {
      setVoucherError('Pilih produk terlebih dahulu');
      return;
    }

    try {
      setVoucherValidating(true);
      setVoucherError('');

      const response = await fetch(`${API_URL}/api/vouchers/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: voucherCode.trim(),
          orderAmount: selectedProduct.price,
          productId: selectedProduct.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVoucherApplied(true);
        setVoucherDiscount(data.discount);
        setVoucherError('');
      } else {
        setVoucherApplied(false);
        setVoucherDiscount(0);
        setVoucherError(data.message || 'Kode voucher tidak valid');
      }
    } catch (error) {
      console.error('Error validating voucher:', error);
      setVoucherError('Gagal memvalidasi voucher');
      setVoucherApplied(false);
      setVoucherDiscount(0);
    } finally {
      setVoucherValidating(false);
    }
  };

  // NEW: Remove applied voucher
  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setVoucherDiscount(0);
    setVoucherApplied(false);
    setVoucherError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error immediately when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name === "customerName") {
      // value adalah const, tidak bisa di-reassign langsung
      // filter sudah ditangani oleh allowOnlyAlphabet + handlePasteAlphabet
      // tidak perlu replace di sini
    }
    // if (name === 'riotId' || name === 'riotTag') {
    //   setRiotIdValidated(false);
    //   setValidationError('');
    // }

    if (name === 'userId' || name === 'zoneId') {
      setUserIdValidated(false);
      setValidationError('');
    }
  };

  // Validate Riot ID
  // const validateRiotId = async () => {
  //   if (!formData.riotId.trim() || !formData.riotTag.trim()) {
  //     setValidationError('Masukkan Riot ID dan Tagline');
  //     return;
  //   }

  //   try {
  //     setValidating(true);
  //     setValidationError('');

  //     const response = await fetch(`${API_URL}/api/validate-riot-id`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         riotId: formData.riotId.trim(),
  //         riotTag: formData.riotTag.trim(),
  //       }),
  //     });

  //     const data = await response.json();

  //     if (data.success) {
  //       setRiotIdValidated(true);
  //       setValidationError('');
  //     } else {
  //       setValidationError(data.message || 'Riot ID tidak valid');
  //       setRiotIdValidated(false);
  //     }
  //   } catch (error) {
  //     console.error('Error validating Riot ID:', error);
  //     setValidationError('Gagal memvalidasi Riot ID');
  //     setRiotIdValidated(false);
  //   } finally {
  //     setValidating(false);
  //   }
  // };

  const validateUserId = async () => {
    const { userId, zoneId } = formData;
    const config = currentGameConfig;

    const hasUserId = userId.trim();
    const hasZoneId = config.fields && config.fields.length > 1 ? zoneId.trim() : true;

    if (!hasUserId || !hasZoneId) {
      setValidationError('Mohon lengkapi semua field');
      return;
    }

    // ── Khusus Token PLN: cek nomor meter via Digiflazz (direct, synchronous) ──
    if (productType === 'token_pln') {
      try {
        setValidating(true);
        setValidationError('');
        setPlnInfo(null);

        const res  = await fetch(`${API_URL}/api/check-pln-meter`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ nomorMeter: userId.trim() }),
        });
        const data = await res.json();

        if (data.success) {
          setPlnInfo({ idpel: data.idpel, nama: data.nama, tarif: data.tarif, daya: data.daya, noMeter: data.noMeter });
          setUserIdValidated(true);
          setValidationError('');
        } else {
          setValidationError(data.message || 'Nomor meter tidak ditemukan');
          setUserIdValidated(false);
        }
      } catch (err) {
        console.error('PLN check error:', err);
        setValidationError('Gagal mengecek nomor meter. Coba lagi.');
        setUserIdValidated(false);
      } finally {
        setValidating(false);
      }
      return;
    }

    // ── Game lain tanpa validation endpoint ──
    if (!config.validation) {
      setUserIdValidated(true);
      setValidationError('');
      return;
    }

    // ── Valorant: validasi via Riot API ──
    try {
      setValidating(true);
      setValidationError('');

      const response = await fetch(`${API_URL}${config.validation.endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config.validation.bodyFormat(userId, zoneId)),
      });
      const data = await response.json();

      if (data.success) {
        setUserIdValidated(true);
        setValidationError('');
      } else {
        setValidationError(data.message || 'ID tidak valid');
        setUserIdValidated(false);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationError('Gagal memvalidasi ID');
      setUserIdValidated(false);
    } finally {
      setValidating(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate userId — tidak wajib untuk voucher_code
    const fields = currentGameConfig.fields || [];
    if (productType !== 'voucher_code') {
      if (!formData.userId.trim()) {
        newErrors.userId = (fields[0]?.label || 'User ID') + ' wajib diisi';
      }
      // Validate zoneId jika form punya 2 fields
      if (fields.length > 1 && !formData.zoneId.trim()) {
        newErrors.zoneId = (fields[1]?.label || 'Zone ID') + ' wajib diisi';
      }
      // Validasi khusus (misal Riot ID via API)
      if (currentGameConfig.validation && !userIdValidated) {
        newErrors.userIdValidation = 'Verifikasi ID terlebih dahulu';
      }
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Format email tidak valid';
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Nomor HP wajib diisi';
    } else if (!/^(\+62|62|0)[0-9]{7,12}$/.test(formData.customerPhone.trim().replace(/\s|-/g, ''))) {
      newErrors.customerPhone = 'Format nomor HP tidak valid (contoh: 08123456789)';
    }

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Nama wajib diisi';
    }

    if (!selectedProduct) {
      newErrors.product = 'Pilih produk terlebih dahulu';
    }

    if (!selectedPaymentMethod) {
      newErrors.payment = 'Pilih metode pembayaran';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setProcessing(true);

      // const orderData = {
      //   productId: selectedProduct.id,
      //   riotId: formData.riotId.trim(),
      //   riotTag: formData.riotTag.trim(),
      //   customerEmail: formData.customerEmail.trim(),
      //   phoneNumber: formData.customerPhone.trim(),
      //   customerName: formData.customerName.trim(),
      //   paymentMethod: selectedPaymentMethod,
      // };

      const orderData = {
        productId: selectedProduct.id,
        gameUserId: productType !== 'voucher_code' ? formData.userId.trim() : null,
        gameZoneId: formData.zoneId?.trim() || null,
        customerEmail: formData.customerEmail.trim(),
        phoneNumber: formData.customerPhone.trim(),
        customerName: formData.customerName.trim(),
        paymentMethod: selectedPaymentMethod,
        voucherCode: voucherApplied ? voucherCode.trim() : null, // NEW: Include voucher if applied
      };

      console.log('Creating order:', orderData);

      const response = await fetch(`${API_URL}/api/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Duitku payment URL
        // window.location.href = data.order.payment.url;
        // Redirect ke custom payment page
        window.location.href = `/payment/${data.order.orderNumber}`;
      } else {
        alert('Gagal membuat pesanan: ' + data.message);
        setProcessing(false);
      }

    } catch (error) {
      console.error('Error creating order:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
      setProcessing(false);
    }
  };

  // Handler untuk tombol bayar di summary (di luar form)
  const handlePaymentClick = () => {
    // Buat event palsu untuk kompatibilitas dengan handleSubmit
    const fakeEvent = { preventDefault: () => {} };
    handleSubmit(fakeEvent);
  };

  // NEW: Check if form is valid and button should be enabled
  const isFormValid = () => {
    // Check if there are any REAL errors (not null or empty string)
    const hasErrors = Object.values(errors).some(error => error !== null && error !== "" && error !== undefined);
    if (hasErrors) {
      return false;
    }

    // Check required fields
    if (!selectedProduct) return false;
    if (!selectedPaymentMethod) return false;

    // userId hanya wajib untuk produk yang butuh akun / nomor tujuan
    if (productType !== 'voucher_code' && !formData.userId.trim()) return false;

    if (!formData.customerEmail.trim()) return false;
    if (!formData.customerPhone.trim()) return false;
    if (!/^(\+62|62|0)[0-9]{7,12}$/.test(formData.customerPhone.trim().replace(/\s|-/g, ''))) return false;
    if (!formData.customerName.trim()) return false;

    // zoneId wajib hanya jika form punya 2 fields (misal ML: userId + zoneId)
    const fields = currentGameConfig.fields || [];
    if (fields.length > 1 && !formData.zoneId.trim()) {
      return false;
    }

    // userId harus terverifikasi untuk produk non-voucher
    if (productType !== 'voucher_code' && !userIdValidated) {
      return false;
    }

    // Validasi khusus (misal Riot ID check via API)
    if (currentGameConfig.validation && !userIdValidated) {
      return false;
    }

    // All checks passed
    return true;
  };

  if (loading) {
    return (
      <div className="order-page">
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="order-page">
      {/* Game Header Image */}
      {/* <div 
        className="game-header-image" 
        id="game-header-image"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL}/images/valorant-header.jpg)`
        }}
      >
      </div> */}
      
      {currentGameConfig.headerImage && currentGameConfig.headerImage !== 'default-header.jpg' && (
        <div
          className="game-header-image"
          id="game-header-image"
          style={{
            backgroundImage: `url(${process.env.PUBLIC_URL}/images/header/${currentGameConfig.headerImage})`
          }}
        >
          {/* Hidden img untuk detect 404 dan hide header kalau tidak ada */}
          <img
            src={`${process.env.PUBLIC_URL}/images/header/${currentGameConfig.headerImage}`}
            alt=""
            style={{ display: 'none' }}
            onError={e => {
              const parent = e.target.parentElement;
              if (parent) parent.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="container">
        <div className="page-title-wrapper">
          {(currentGameConfig.iconFile || game?.icon_url) && (
            <div className="game-icon-box">
              <img
                src={
                  currentGameConfig.iconFile
                    ? `${process.env.PUBLIC_URL}/images/games_icon/${currentGameConfig.iconFile}`
                    : game.icon_url
                }
                alt={game?.name || gameSlug}
                className="game-icon-img"
              />
            </div>
          )}
          <h1 className="page-title">
            Order {game?.name || 'Game'}{currentGameConfig.pageTitle ? ` ${currentGameConfig.pageTitle}` : ''}
          </h1>
        </div>

        <div className="order-layout">
          {/* Left Side: Order Form */}
          <div className="order-form">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Choose Product */}
              <div className="form-section">
                <h2>1. Pilih Nominal</h2>
                <div className="products-grid">
                  {products.map(product => {
                    const isOos = product.seller_available === false;
                    const hasDiscount = product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price);
                    return (
                    <div
                      key={product.id}
                      className={`product-card ${selectedProduct?.id === product.id ? 'selected' : ''} ${isOos ? 'out-of-stock' : ''}`}
                      onClick={() => !isOos && handleProductSelect(product)}
                      style={isOos ? { cursor: 'not-allowed', opacity: 0.55, position: 'relative' } : {}}
                    >
                      {isOos && (
                        <div className="badge-oos">OUT OF STOCK</div>
                      )}
                      {hasDiscount && !isOos && (
                        <div className="ribbon-wrapper">
                          <div className="ribbon-badge">-{product.compare_percentage}%</div>
                        </div>
                      )}
                      <div className="product-name">
                        {/* icon_product_url = filename dari games, load dari /images/icon_product/ */}
                        {(product.icon_product_url || currentGameConfig.iconFile || game?.icon_url) && (
                          <img
                            src={
                              product.icon_product_url
                                ? `${process.env.PUBLIC_URL}/images/icon_product/${product.icon_product_url}`
                                : currentGameConfig.iconFile
                                  ? `${process.env.PUBLIC_URL}/images/games_icon/${currentGameConfig.iconFile}`
                                  : game.icon_url
                            }
                            alt=""
                            className="product-card-icon"
                          />
                        )}
                        {product.name}
                      </div>
                      <div className={`product-price ${isOos ? 'oos-price' : ''}`}>
                        {hasDiscount && (
                          <span className="product-price-compare">{formatRupiah(product.compare_price)}</span>
                        )}
                        {product.displayPrice}
                      </div>
                    </div>
                    );
                  })}
                </div>
                {errors.product && <div className="error">{errors.product}</div>}
              </div>

              {/* Step 2: Informasi Akun / Tujuan */}
              {selectedProduct && showStep2 && (
                <div className="form-section">
                  <h2>
                    {productType === 'token_pln'    ? '2. Nomor Meter / ID Pelanggan' :
                     productType === 'data_package' ? '2. Nomor HP Tujuan' :
                     productType === 'pulsa'         ? '2. Nomor HP Tujuan' :
                                                       '2. Informasi Akun Game'}
                  </h2>

                  {currentGameConfig.fields.map((field) => (
                    <div className="form-group" key={field.name}>
                      <label>{field.label} *</label>
                      {field.type === 'select' ? (
                        <select
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleInputChange}
                          className={errors[field.name] ? 'error' : ''}
                          disabled={userIdValidated}
                        >
                          <option value="">{field.placeholder || 'Pilih...'}</option>
                          {(field.options || []).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleInputChange}
                          placeholder={field.placeholder}
                          className={errors[field.name] ? 'error' : ''}
                          disabled={userIdValidated}
                        />
                      )}
                      {errors[field.name] && (
                        <div className="error">{errors[field.name]}</div>
                      )}
                    </div>
                  ))}

                  {/* Validation Button */}
                  {!userIdValidated && (
                    <button
                      type="button"
                      onClick={validateUserId}
                      disabled={validating}
                      className="btn-validate"
                    >
                      {validating
                        ? (productType === 'token_pln' ? 'Mengecek...' : 'Memverifikasi...')
                        : (productType === 'token_pln' ? '🔍 Cek Nomor Meter' : 'Verifikasi ID')}
                    </button>
                  )}

                  {validationError && (
                    <div className="error">{validationError}</div>
                  )}

                  {/* Hasil cek PLN — tampilkan info pelanggan */}
                  {userIdValidated && productType === 'token_pln' && plnInfo && (
                    <div className="pln-check-result">
                      <div className="pln-check-header">
                        <span className="pln-check-icon">⚡</span>
                        <span>Data Pelanggan Ditemukan</span>
                      </div>
                      <div className="pln-check-rows">
                        <div className="pln-check-row">
                          <span className="pln-check-label">No. Meter</span>
                          <span className="pln-check-value">{plnInfo.noMeter}</span>
                        </div>
                        <div className="pln-check-row">
                          <span className="pln-check-label">Nama</span>
                          <span className="pln-check-value">{plnInfo.nama}</span>
                        </div>
                        {plnInfo.tarif && (
                          <div className="pln-check-row">
                            <span className="pln-check-label">Tarif / Daya</span>
                            <span className="pln-check-value">{plnInfo.tarif} / {plnInfo.daya}</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setUserIdValidated(false); setPlnInfo(null); }}
                        className="btn-change"
                      >
                        Ubah Nomor
                      </button>
                    </div>
                  )}

                  {/* Tampilan sukses verifikasi untuk game lain */}
                  {userIdValidated && productType !== 'token_pln' && (
                    <div className="success">
                      ✓ Terverifikasi: {typeof currentGameConfig.displayFormat === 'function'
                        ? currentGameConfig.displayFormat(formData.userId, formData.zoneId)
                        : formData.userId}
                      <button
                        type="button"
                        onClick={() => setUserIdValidated(false)}
                        className="btn-change"
                      >
                        Ubah
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 — Voucher: tidak perlu input, langsung ke Step 3 */}
              {selectedProduct && !showStep2 && !userIdValidated && (
                <div className="form-section voucher-info-section">
                  <h2>2. Informasi Produk</h2>
                  <div className="voucher-notice">
                    <span>🎁</span>
                    <p>Kode voucher akan dikirim ke email kamu setelah pembayaran berhasil. Tidak perlu memasukkan User ID.</p>
                  </div>
                  {/* Auto-set userIdValidated agar flow lanjut ke Step 3 */}
                  {(() => { if (!userIdValidated) setTimeout(() => setUserIdValidated(true), 0); return null; })()}
                </div>
              )}

              {/* {selectedProduct && (
                <div className="form-section">
                  <h2>2. Informasi Akun Game</h2>
                  
                  <div className="form-group">
                    <label>Riot ID *</label>
                    <input
                      type="text"
                      name="riotId"
                      value={formData.riotId}
                      onChange={handleInputChange}
                      placeholder="Contoh: segawon"
                      className={errors.riotId ? 'error' : ''}
                      disabled={riotIdValidated}
                    />
                    {errors.riotId && <div className="error">{errors.riotId}</div>}
                    <small>Masukkan Riot ID tanpa tanda #</small>
                  </div>

                  <div className="form-group">
                    <label>Tagline *</label>
                    <input
                      type="text"
                      name="riotTag"
                      value={formData.riotTag}
                      onChange={handleInputChange}
                      placeholder="Contoh: limo"
                      className={errors.riotTag ? 'error' : ''}
                      disabled={riotIdValidated}
                    />
                    {errors.riotTag && <div className="error">{errors.riotTag}</div>}
                    <small>Masukkan tagline tanpa tanda #</small>
                  </div>

                  {!userIdValidated&& (
                    <button
                      type="button"
                      onClick={validateRiotId}
                      disabled={validating || !formData.riotId || !formData.riotTag}
                      className="btn-validate"
                    >
                      {validating ? 'Memverifikasi...' : 'Verifikasi Riot ID'}
                    </button>
                  )}

                  {validationError && (
                    <div className="error">{validationError}</div>
                  )}

                  {userIdValidated&& (
                    <div className="success">
                      ✓ Riot ID terverifikasi: {formData.riotId}#{formData.riotTag}
                      <button
                        type="button"
                        onClick={() => setRiotIdValidated(false)}
                        className="btn-change"
                      >
                        Ubah
                      </button>
                    </div>
                  )}

                  {errors.riotIdValidation && <div className="error">{errors.riotIdValidation}</div>}
                </div>
              )} */}

              {/* Step 3: Contact Info - ONLY SHOW IF RIOT ID VALIDATED */}
              {selectedProduct && userIdValidated&& (
                <div className="form-section">
                  <h2>3. Informasi Kontak</h2>
                  
                  <div className="form-group">
                    <label>Nama *</label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      onKeyDown={allowOnlyAlphabet}
                      onPaste={handlePasteAlphabet}
                      placeholder="Nama Lengkap"
                      className={errors.customerName ? 'error' : ''}
                    />
                    {errors.customerName && <div className="error">{errors.customerName}</div>}
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      // onBlur={() => validateEmail(formData.customerEmail)}
                      onBlur={handleBlur}
                      placeholder="email@example.com"
                      // className={errors.customerEmail ? 'error' : ''}
                      className={touched.customerEmail && errors.customerEmail ? 'error' : ''}
                    />
                    {/* {errors.customerEmail && <div className="error">{errors.customerEmail}</div>} */}
                    {touched.customerEmail && errors.customerEmail && (
                      <div className="error">{errors.customerEmail}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      Nomor HP {selectedPaymentMethod === 'OV' ? '(OVO) *' : '(WhatsApp) *'}
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      onKeyDown={allowPhoneInput}
                      onPaste={handlePastePhone}
                      inputMode="numeric"
                      placeholder="081234567890"
                      className={errors.customerPhone ? 'error' : ''}
                    />
                    {errors.customerPhone && <div className="error">{errors.customerPhone}</div>}
                    {selectedPaymentMethod === 'OV' && (
                      <div className="info-box-ovo">
                        ⚠️ <strong>Penting:</strong> Gunakan nomor HP yang terdaftar di akun OVO kamu. Notifikasi pembayaran akan dikirim ke nomor ini.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Payment Method - ONLY SHOW IF RIOT ID VALIDATED AND DATA FILLED */}
              {selectedProduct && userIdValidated && formData.customerEmail && formData.customerName && formData.customerPhone && (
                <div className="form-section">
                  <h2>4. Pilih Pembayaran</h2>
                  
                  <div className="payment-methods">
                    {/* Virtual Account — 8 bank aktif */}
                    <div className="payment-category">
                      <h3>Virtual Account</h3>
                      {VA_BANKS.map(bank => (
                        <label
                          key={bank.code}
                          className={`payment-option ${selectedPaymentMethod === bank.code ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={bank.code}
                            checked={selectedPaymentMethod === bank.code}
                            onChange={(e) => handlePaymentMethodChange(e.target.value)}
                          />
                          <div className="payment-info">
                            <img
                              src={`${process.env.PUBLIC_URL}${paymentLogos[bank.logo]}`}
                              alt={bank.name}
                              className="payment-logo"
                              onError={e => { e.target.style.display='none'; }}
                            />
                            <span className="payment-name">{bank.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* QRIS aktif — Nusapay (SQ) */}
                    <div className="payment-category">
                      <h3>QRIS</h3>
                      {QRIS_METHODS.map(qr => (
                        <label
                          key={qr.code}
                          className={`payment-option ${selectedPaymentMethod === qr.code ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={qr.code}
                            checked={selectedPaymentMethod === qr.code}
                            onChange={(e) => handlePaymentMethodChange(e.target.value)}
                          />
                          <div className="payment-info">
                            <img
                              src={`${process.env.PUBLIC_URL}${paymentLogos[qr.logo]}`}
                              alt={qr.name}
                              className="payment-logo"
                              onError={e => { e.target.style.display='none'; }}
                            />
                            <span className="payment-name">{qr.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* E-Wallet aktif */}
                    <div className="payment-category">
                      <h3>E-Wallet</h3>
                      {EWALLET_METHODS.map(ew => (
                        <label
                          key={ew.code}
                          className={`payment-option ${selectedPaymentMethod === ew.code ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={ew.code}
                            checked={selectedPaymentMethod === ew.code}
                            onChange={(e) => handlePaymentMethodChange(e.target.value)}
                          />
                          <div className="payment-info">
                            <img
                              src={`${process.env.PUBLIC_URL}${paymentLogos[ew.logo]}`}
                              alt={ew.name}
                              className="payment-logo"
                              onError={e => { e.target.style.display='none'; }}
                            />
                            <span className="payment-name">{ew.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {errors.payment && <div className="error">{errors.payment}</div>}
                </div>
              )}

              {/* NEW: Step 5: Voucher Code - OPTIONAL */}
              {selectedProduct && userIdValidated && selectedPaymentMethod && (
                <div className="form-section voucher-section">
                  <h2>5. Kode Voucher (Opsional)</h2>
                  
                  <div className="voucher-input-group">
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={handleVoucherChange}
                      placeholder="Masukkan kode voucher"
                      className={voucherError ? 'error' : voucherApplied ? 'success' : ''}
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
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="btn-remove-voucher"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  {voucherError && (
                    <div className="voucher-error">
                      ❌ {voucherError}
                    </div>
                  )}

                  {voucherApplied && (
                    <div className="voucher-success">
                      ✓ Voucher berhasil diterapkan! Hemat {formatRupiah(voucherDiscount)}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Right Side: Order Summary */}
          <div className="order-summary">
            <h3>Ringkasan Pesanan</h3>

            {selectedProduct && (
              <>
                <div className="summary-item">
                  <span>Produk</span>
                  <span>{selectedProduct.name}</span>
                </div>

                {/* {userIdValidated&& (
                  <div className="summary-item">
                    <span>Riot ID</span>
                    <span>{formData.riotId}#{formData.riotTag}</span>
                  </div>
                )} */}

                {userIdValidated && productType !== 'voucher_code' && (
                  <div className="summary-item">
                    <span>
                      {productType === 'token_pln'    ? 'No. Meter' :
                       productType === 'data_package' ? 'No. HP'    :
                       productType === 'pulsa'         ? 'No. HP'    :
                                                         'Game ID'}
                    </span>
                    <span>
                      {typeof currentGameConfig.displayFormat === 'function'
                        ? currentGameConfig.displayFormat(formData.userId, formData.zoneId)
                        : formData.userId}
                    </span>
                  </div>
                )}

                <div className="summary-item">
                  <span>Harga</span>
                  <span>{formatRupiah(selectedProduct.price)}</span>
                </div>

                {/* NEW: Show voucher discount if applied */}
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
                         selectedPaymentMethod}
                      </span>
                    </div>
 
                    <div className="summary-item">
                      <span>Biaya Layanan</span>
                      <span style={{ color: '#f59e0b', fontWeight: '700' }}>
                        {formatRupiah(paymentFee)}
                      </span>
                    </div>

                    {/* Note biaya bank Mandiri — info saja, tidak masuk total */}
                    {['M2', 'va_mandiri'].includes(selectedPaymentMethod) && (
                      <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginTop: '-4px',
                        marginBottom: '4px',
                      }}>
                        <p style={{ fontSize: '12px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>
                          ⚠️ Biaya Bank Mandiri (ditagih langsung oleh bank)
                        </p>
                        <p style={{ fontSize: '12px', color: '#78350f', margin: 0, lineHeight: '1.6' }}>
                          {getMandiriBankFee(priceAfterDiscount)} — tidak termasuk dalam total di atas
                        </p>
                      </div>
                    )}

                    <div className="summary-divider"></div>

                    <div className="summary-total">
                      <span>Total Pembayaran</span>
                      <span className="total-price">
                        {formatRupiah(totalAmount)}
                      </span>
                    </div>

                    {/* <div className="summary-note">
                      *Biaya admin sudah termasuk
                    </div> */}

                    {/* Submit Button */}
                    <button
                      onClick={handlePaymentClick}
                      className="btn-submit"
                      disabled={processing || !isFormValid()}
                    >
                      {processing ? 'Memproses...' : 'Bayar Sekarang'}
                    </button>
                  </>
                )}
              </>
            )}

            {!selectedProduct && (
              <div className="summary-placeholder">
                <p>Pilih produk untuk melihat ringkasan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderPage;