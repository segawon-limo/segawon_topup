import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './OrderPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

// Payment method logo mapping
const paymentLogos = {
  'qris':       '/images/qris-logo.png',
  'va_bca':     '/images/bca-logo.png',
  'va_mandiri': '/images/mandiri-logo.png',
  'va_bni':     '/images/bni-logo.png',
  'va_bri':     '/images/bri-logo.png',
  'ovo':        '/images/ovo-logo.png',
  'shopeepay':  '/images/shopeepay-logo.png',
  'dana':       '/images/dana-logo.png',
};

// ── Product type configs ─────────────────────────────────────
// Menentukan form Step 2 berdasarkan product_type dari API.
// Ini menggantikan kebutuhan hardcode per-slug untuk produk baru.
const productTypeConfigs = {
  // Game topup biasa — pakai gameConfigs[slug] yang sudah ada
  topup_game: null,

  // Voucher (Steam Wallet, dll) — tidak ada form Step 2 sama sekali
  voucher_code: {
    showStep2: false,
    fields: [],
    displayFormat: () => '—',   // tidak ada ID, tampilkan dash
  },

  // Token PLN — input Nomor Meter / ID Pelanggan
  token_pln: {
    showStep2: true,
    fields: [
      { name: 'userId', label: 'Nomor Meter / ID Pelanggan', placeholder: 'Contoh: 515300012345', type: 'text' }
    ],
    displayFormat: (userId) => userId,
  },

  // Pulsa — input Nomor HP
  pulsa: {
    showStep2: true,
    fields: [
      { name: 'userId', label: 'Nomor HP', placeholder: 'Contoh: 08123456789', type: 'text' }
    ],
    displayFormat: (userId) => userId,
  },

  // Paket Data — input Nomor HP (sama dengan pulsa, provider dari slug)
  data_package: {
    showStep2: true,
    fields: [
      { name: 'userId', label: 'Nomor HP', placeholder: 'Contoh: 08123456789', type: 'text' }
    ],
    displayFormat: (userId) => userId,
  },
};

// Game configurations
const gameConfigs = {
  'valorant': {
    fields: [
      { name: 'userId', label: 'Riot ID', placeholder: 'Contoh: segawon', type: 'text' },
      { name: 'zoneId', label: 'Tagline', placeholder: 'Contoh: limo', type: 'text' }
    ],
    validation: {
      endpoint: '/api/validate-riot-id',
      bodyFormat: (userId, zoneId) => ({ riotId: userId, riotTag: zoneId })
    },
    displayFormat: (userId, zoneId) => `${userId}#${zoneId}`,
    headerImage: 'valorant-header.jpg',
    iconFile: 'val.webp'
  },
  
  'arena-of-valor': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Contoh: 123456789', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'arena-of-valor-header.jpg',
    iconFile: 'aov.webp'
  },

  'mobile-legends': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Contoh: 123456789', type: 'number' },
      { name: 'zoneId', label: 'Zone ID', placeholder: 'Contoh: 1234', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'mobile-legends-header.jpg',
    iconFile: 'mlb.webp'
  },
  
  'free-fire': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Contoh: 1234567890', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'free-fire-header.jpg',
    iconFile: 'ffr.webp'
  },
  
  'pubg-mobile': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Contoh: 5123456789', type: 'number' },
      { name: 'zoneId', label: 'Zone ID', placeholder: 'Contoh: 1234', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'pubg-mobile-header.jpg',
    iconFile: null
  },
  
  'genshin-impact': {
    fields: [
      { name: 'userId', label: 'UID', placeholder: 'Contoh: 800123456', type: 'number' },
      { name: 'zoneId', label: 'Server', placeholder: 'Asia / America / Europe', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'genshin-impact-header.jpg',
    iconFile: 'gip.webp'
  },
  
  'league-of-legends': {
    fields: [
      { name: 'userId', label: 'Riot ID', placeholder: 'Contoh: segawon', type: 'text' },
      { name: 'zoneId', label: 'Tagline', placeholder: 'Contoh: limo', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId}#${zoneId}`,
    headerImage: 'league-of-legends-header.jpg',
    iconFile: 'lol.webp'
  },

  'honkai-star-rail': {
    fields: [
      { name: 'userId', label: 'UID', placeholder: 'Contoh: 800123456', type: 'number' },
      { name: 'zoneId', label: 'Server', placeholder: 'Asia / America / Europe', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'honkai-star-rail-header.jpg',
    iconFile: 'hsr.webp'
  },

  'honor-of-kings': {
    fields: [
      { name: 'userId', label: 'UserID', placeholder: 'Contoh: 1234567890', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'honor-of-kings-header.jpg',
    iconFile: 'hok.webp'
  },

  'punishing-gray-raven': {
    fields: [
      { name: 'userId', label: 'RoleID', placeholder: 'Contoh: 800123456', type: 'number' },
      { name: 'zoneId', label: 'Server', placeholder: 'Asia / America / Europe', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'punishing-gray-raven-header.jpg',
    iconFile: 'pgr.webp'
  },

  'zenless-zone-zero': {
    fields: [
      { name: 'userId', label: 'UserID', placeholder: 'Contoh: 800123456', type: 'number' },
      { name: 'zoneId', label: 'Server', placeholder: 'Asia / America / Europe', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'zenless-zone-zero-header.jpg',
    iconFile: 'zzz.webp'
  },

  'marvel-rivals': {
    fields: [
      { name: 'userId', label: 'UserID', placeholder: 'Contoh: 1234567890', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'marvel-rivals-header.jpg',
    iconFile: 'mrv.webp'
  },

  'haikyu-fly-high': {
    fields: [
      { name: 'userId', label: 'UserID', placeholder: 'Contoh: 1234567890', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'haikyu-fly-high-header.jpg',
    iconFile: 'hfh.webp'
  },

  'steam-wallet': {
    // fields: [
    //   { name: 'userId', label: 'UserID', placeholder: 'Contoh: 1234567890', type: 'number' }
    // ],
    // validation: null,
    // displayFormat: (userId) => userId,
    headerImage: 'steam-wallet-header.jpg',
    iconFile: 'stm.webp'
  },

  'pln': {
    // fields: [
    //   { name: 'userId', label: 'UserID', placeholder: 'Contoh: 1234567890', type: 'number' }
    // ],
    // validation: null,
    // displayFormat: (userId) => userId,
    headerImage: 'pln.jpg',
    iconFile: 'pln.webp'
  },

  'default': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Masukkan ID Anda', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'default-header.jpg',
    iconFile: null
  }
};

function OrderPage() {
  const { gameSlug } = useParams();

  // gameConfigs tetap dipakai sebagai fallback untuk game yang sudah ada
  const legacyConfig = gameConfigs[gameSlug] || gameConfigs['default'];

  const [game, setGame] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // ── Derived: pilih config aktif berdasarkan product_type dari API ──
  // Kalau API sudah return product_type, pakai productTypeConfigs.
  // Fallback ke legacyConfig (gameConfigs[slug]) untuk game yang sudah ada.
  const productType = game?.product_type || 'topup_game';
  const ptConfig = productTypeConfigs[productType]; // null = pakai legacy

  // Config akhir yang dipakai di JSX
  const currentGameConfig = (ptConfig && ptConfig !== null)
    ? ptConfig
    : legacyConfig;

  // Apakah Step 2 perlu ditampilkan?
  const showStep2 = productType === 'voucher_code'
    ? false
    : true;

  // Riot ID validation state
  // const [riotIdValidated, setRiotIdValidated] = useState(false);
  const [userIdValidated, setUserIdValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

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
      // NEW API STRUCTURE: /api/products/:gameSlug
      const response = await fetch(`${API_URL}/api/products/${gameSlug}`);
      const data = await response.json();

      if (data.success) {
        // NEW: Response has { game: {...}, products: [...] }
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
  const calculatePaymentFee = (method, price) => {
    if (!method || !price) return 0;
    const amount = parseFloat(price);

    const isQris     = ['SP', 'qris'].includes(method);
    const isVaBca    = ['BC', 'va_bca'].includes(method);
    const isVaMandiri= ['M2', 'va_mandiri'].includes(method);
    const isVaLain   = ['BR','I1','BT','B1','DM','BV','va_bri','va_bni','va_permata','va_cimb'].includes(method);
    const isEwallet  = ['OV','SA','DA','LA','ovo','shopeepay','dana','linkaja'].includes(method);

    if (isQris)      return Math.round(amount * 0.007);
    if (isVaBca)     return 5000;
    if (isVaMandiri) return 4000;
    if (isVaLain)    return 3000;
    if (isEwallet)   return Math.round(amount * 0.02) + 1000;
    return 2500;
  };

  // NEW: Calculate totals with voucher discount
  // Price after voucher discount
  const priceAfterDiscount = selectedProduct 
    ? selectedProduct.price - (voucherApplied ? voucherDiscount : 0)
    : 0;

  // Payment fee is calculated based on price AFTER voucher discount
  const paymentFee = selectedPaymentMethod && selectedProduct 
    ? calculatePaymentFee(selectedPaymentMethod, priceAfterDiscount)
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
    
    // Check required fields
    const hasUserId = userId.trim();
    const hasZoneId = config.fields.length > 1 ? zoneId.trim() : true;
    
    if (!hasUserId || !hasZoneId) {
      setValidationError('Mohon lengkapi semua field');
      return;
    }
    
    // If no validation endpoint, just mark as validated
    if (!config.validation) {
      setUserIdValidated(true);
      setValidationError('');
      return;
    }
    
    // Call validation API (for Valorant)
    try {
      setValidating(true);
      setValidationError('');
      
      const response = await fetch(`${API_URL}${config.validation.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.validation.bodyFormat(userId, zoneId))
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
      
      <div
        className="game-header-image"
        id="game-header-image"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL}/images/header/${currentGameConfig.headerImage})`
        }}
      >
      </div>

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
          <h1 className="page-title">Order {game?.name || 'Valorant'} Points</h1>
        </div>

        <div className="order-layout">
          {/* Left Side: Order Form */}
          <div className="order-form">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Choose Product */}
              <div className="form-section">
                <h2>1. Pilih Nominal</h2>
                <div className="products-grid">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className={`product-card ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                      onClick={() => handleProductSelect(product)}
                    >
                      <div className="product-name">{product.name}</div>
                      <div className="product-price">
                        {product.displayPrice}
                      </div>
                      <div className="product-description">{product.description}</div>
                    </div>
                  ))}
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
                      <input
                        type={field.type}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        className={errors[field.name] ? 'error' : ''}
                        disabled={userIdValidated}
                      />
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
                      {validating ? 'Memverifikasi...' : 'Verifikasi ID'}
                    </button>
                  )}

                  {validationError && (
                    <div className="error">{validationError}</div>
                  )}

                  {userIdValidated && (
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
                    <label>Nomor HP (WhatsApp) *</label>
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
                  </div>
                </div>
              )}

              {/* Step 4: Payment Method - ONLY SHOW IF RIOT ID VALIDATED AND DATA FILLED */}
              {selectedProduct && userIdValidated && formData.customerEmail && formData.customerName && formData.customerPhone && (
                <div className="form-section">
                  <h2>4. Pilih Pembayaran</h2>
                  
                  <div className="payment-methods">
                    {/* QRIS */}
                    <div className="payment-category">
                      <h3>QRIS</h3>
                      <label className={`payment-option ${selectedPaymentMethod === 'qris' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="qris"
                          checked={selectedPaymentMethod === 'qris'}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        />
                        <div className="payment-info">
                          <img src={`${process.env.PUBLIC_URL}${paymentLogos['qris']}`} alt="QRIS" className="payment-logo" />
                          <span className="payment-name">QRIS (Semua E-Wallet)</span>
                          {/* <span className="payment-note">Fee 0.7%</span> */}
                        </div>
                      </label>
                    </div>

                    {/* Virtual Account */}
                    <div className="payment-category">
                      <h3>Virtual Account</h3>
                      <label className={`payment-option ${selectedPaymentMethod === 'va_bca' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="va_bca"
                          checked={selectedPaymentMethod === 'va_bca'}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        />
                        <div className="payment-info">
                          <img src={`${process.env.PUBLIC_URL}${paymentLogos['va_bca']}`} alt="BCA" className="payment-logo" />
                          <span className="payment-name">BCA Virtual Account</span>
                          {/* <span className="payment-note">Fee 0.7% + Rp 1.000</span> */}
                        </div>
                      </label>

                      <label className={`payment-option ${selectedPaymentMethod === 'va_mandiri' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="va_mandiri"
                          checked={selectedPaymentMethod === 'va_mandiri'}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        />
                        <div className="payment-info">
                          <img src={`${process.env.PUBLIC_URL}${paymentLogos['va_mandiri']}`} alt="Mandiri" className="payment-logo" />
                          <span className="payment-name">Mandiri Virtual Account</span>
                          {/* <span className="payment-note">Fee 0.7% + Rp 1.000</span> */}
                        </div>
                      </label>

                      <label className={`payment-option ${selectedPaymentMethod === 'va_bni' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="va_bni"
                          checked={selectedPaymentMethod === 'va_bni'}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        />
                        <div className="payment-info">
                          <img src={`${process.env.PUBLIC_URL}${paymentLogos['va_bni']}`} alt="BNI" className="payment-logo" />
                          <span className="payment-name">BNI Virtual Account</span>
                          {/* <span className="payment-note">Fee 0.7% + Rp 1.000</span> */}
                        </div>
                      </label>

                      <label className={`payment-option ${selectedPaymentMethod === 'va_bri' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="va_bri"
                          checked={selectedPaymentMethod === 'va_bri'}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        />
                        <div className="payment-info">
                          <img src={`${process.env.PUBLIC_URL}${paymentLogos['va_bri']}`} alt="BRI" className="payment-logo" />
                          <span className="payment-name">BRI Virtual Account</span>
                          {/* <span className="payment-note">Fee 0.7% + Rp 1.000</span> */}
                        </div>
                      </label>
                    </div>

                    {/* E-Wallet */}
                    <div className="payment-category">
                      <h3>E-Wallet</h3>
                      <label className={`payment-option ${selectedPaymentMethod === 'ovo' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="ovo"
                          checked={selectedPaymentMethod === 'ovo'}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        />
                        <div className="payment-info">
                          <img src={`${process.env.PUBLIC_URL}${paymentLogos['ovo']}`} alt="OVO" className="payment-logo" />
                          <span className="payment-name">OVO</span>
                          {/* <span className="payment-note">Fee 2%</span> */}
                        </div>
                      </label>

                      <label className={`payment-option ${selectedPaymentMethod === 'shopeepay' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="shopeepay"
                          checked={selectedPaymentMethod === 'shopeepay'}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        />
                        <div className="payment-info">
                          <img src={`${process.env.PUBLIC_URL}${paymentLogos['shopeepay']}`} alt="ShopeePay" className="payment-logo" />
                          <span className="payment-name">ShopeePay</span>
                          {/* <span className="payment-note">Fee 2%</span> */}
                        </div>
                      </label>

                      <label className={`payment-option ${selectedPaymentMethod === 'dana' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="dana"
                          checked={selectedPaymentMethod === 'dana'}
                          onChange={(e) => handlePaymentMethodChange(e.target.value)}
                        />
                        <div className="payment-info">
                          <img src={`${process.env.PUBLIC_URL}${paymentLogos['dana']}`} alt="DANA" className="payment-logo" />
                          <span className="payment-name">DANA</span>
                          {/* <span className="payment-note">Fee 2%</span> */}
                        </div>
                      </label>
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
                        {selectedPaymentMethod === 'qris' && 'QRIS'}
                        {selectedPaymentMethod === 'va_bca' && 'BCA VA'}
                        {selectedPaymentMethod === 'va_mandiri' && 'Mandiri VA'}
                        {selectedPaymentMethod === 'va_bni' && 'BNI VA'}
                        {selectedPaymentMethod === 'va_bri' && 'BRI VA'}
                        {selectedPaymentMethod === 'ovo' && 'OVO'}
                        {selectedPaymentMethod === 'shopeepay' && 'ShopeePay'}
                        {selectedPaymentMethod === 'dana' && 'DANA'}
                      </span>
                    </div>
 
                    <div className="summary-item">
                      <span>Biaya Layanan</span>
                      <span style={{ color: '#f59e0b', fontWeight: '700' }}>
                        {formatRupiah(paymentFee)}
                      </span>
                    </div>

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