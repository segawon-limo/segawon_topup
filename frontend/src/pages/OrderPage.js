import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './OrderPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

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
    headerImage: 'valorant-header.jpg'
  },
  
  'arena-of-valor': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Contoh: 123456789', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'arena-of-valor-header.jpg'
  },

  'mobile-legends': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Contoh: 123456789', type: 'number' },
      { name: 'zoneId', label: 'Zone ID', placeholder: 'Contoh: 1234', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'mobile-legends-header.jpg'
  },
  
  'free-fire': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Contoh: 1234567890', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'free-fire-header.jpg'
  },
  
  'pubg-mobile': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Contoh: 5123456789', type: 'number' },
      { name: 'zoneId', label: 'Zone ID', placeholder: 'Contoh: 1234', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'pubg-mobile-header.jpg'
  },
  
  'genshin-impact': {
    fields: [
      { name: 'userId', label: 'UID', placeholder: 'Contoh: 800123456', type: 'number' },
      { name: 'zoneId', label: 'Server', placeholder: 'Asia / America / Europe', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'genshin-impact-header.jpg'
  },
  
  'league-of-legends': {
    fields: [
      { name: 'userId', label: 'Riot ID', placeholder: 'Contoh: segawon', type: 'text' },
      { name: 'zoneId', label: 'Tagline', placeholder: 'Contoh: limo', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId}#${zoneId}`,
    headerImage: 'league-of-legends-header.jpg'
  },

  'honkai-star-rail': {
    fields: [
      { name: 'userId', label: 'UID', placeholder: 'Contoh: 800123456', type: 'number' },
      { name: 'zoneId', label: 'Server', placeholder: 'Asia / America / Europe', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'honkai-star-rail-header.jpg'
  },

  'honor-of-kings': {
    fields: [
      { name: 'userId', label: 'UserID', placeholder: 'Contoh: 1234567890', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'honor-of-kings-header.jpg'
  },

  'punishing-gray-raven': {
    fields: [
      { name: 'userId', label: 'RoleID', placeholder: 'Contoh: 800123456', type: 'number' },
      { name: 'zoneId', label: 'Server', placeholder: 'Asia / America / Europe', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'punishing-gray-raven-header.jpg'
  },

  'zenless-zone-zero': {
    fields: [
      { name: 'userId', label: 'UserID', placeholder: 'Contoh: 800123456', type: 'number' },
      { name: 'zoneId', label: 'Server', placeholder: 'Asia / America / Europe', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId, zoneId) => `${userId} (${zoneId})`,
    headerImage: 'zenless-zone-zero-header.jpg'
  },

  'marvel-rivals': {
    fields: [
      { name: 'userId', label: 'UserID', placeholder: 'Contoh: 1234567890', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'marvel-rivals-header.jpg'
  },

  'haikyu-fly-high': {
    fields: [
      { name: 'userId', label: 'UserID', placeholder: 'Contoh: 1234567890', type: 'number' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'haikyu-fly-high-header.jpg'
  },

  'default': {
    fields: [
      { name: 'userId', label: 'User ID', placeholder: 'Masukkan ID Anda', type: 'text' }
    ],
    validation: null,
    displayFormat: (userId) => userId,
    headerImage: 'default-header.jpg'
  }
};

function OrderPage() {
  const { gameSlug } = useParams();
  const currentGameConfig = gameConfigs[gameSlug] || gameConfigs['default'];

  const [game, setGame] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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

  const [errors, setErrors] = useState({});

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

  // === ADD THIS BLOCK ===
  // Calculate payment fee in real-time
  const calculatePaymentFee = (method, price) => {
    if (!method || !price) return 0;
    const amount = parseFloat(price);
    
    if (method === 'qris') return Math.round(amount * 0.007);
    if (method.startsWith('va_')) return 2500;
    if (['ovo', 'shopeepay', 'dana'].includes(method)) return Math.round(amount * 0.02) + 1000;
    return 2500;
  };

  // Calculate totals
  const paymentFee = selectedPaymentMethod && selectedProduct 
    ? calculatePaymentFee(selectedPaymentMethod, selectedProduct.price)
    : 0;
  
  const totalAmount = selectedProduct ? selectedProduct.price + paymentFee : 0;
  
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
    setRiotIdValidated(false);
  };

  const handlePaymentMethodChange = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null,
      }));
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

    if (!formData.riotId.trim()) {
      newErrors.riotId = 'Riot ID wajib diisi';
    }

    if (!formData.riotTag.trim()) {
      newErrors.riotTag = 'Tagline wajib diisi';
    }

    if (!riotIdValidated) {
      newErrors.riotIdValidation = 'Verifikasi Riot ID terlebih dahulu';
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
        gameUserId: formData.userId.trim(),
        gameZoneId: formData.zoneId?.trim() || null,
        customerEmail: formData.customerEmail.trim(),
        phoneNumber: formData.customerPhone.trim(),
        customerName: formData.customerName.trim(),
        paymentMethod: selectedPaymentMethod,
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
        <h1 className="page-title">Order {game?.name || 'Valorant'} Points</h1>

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

              {/* Step 2: Game Account Info */}
              
              {/* Step 2: Game Account Info - DYNAMIC */}
              {selectedProduct && (
                <div className="form-section">
                  <h2>2. Informasi Akun Game</h2>
                  
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
                      ✓ ID terverifikasi: {currentGameConfig.displayFormat(formData.userId, formData.zoneId)}
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
                      placeholder="email@example.com"
                      className={errors.customerEmail ? 'error' : ''}
                    />
                    {errors.customerEmail && <div className="error">{errors.customerEmail}</div>}
                  </div>

                  <div className="form-group">
                    <label>Nomor HP (WhatsApp) *</label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      placeholder="081234567890"
                      className={errors.customerPhone ? 'error' : ''}
                    />
                    {errors.customerPhone && <div className="error">{errors.customerPhone}</div>}
                  </div>
                </div>
              )}

              {/* Step 4: Payment Method - ONLY SHOW IF RIOT ID VALIDATED AND DATA FILLED */}
              {selectedProduct && userIdValidated&& formData.customerEmail && formData.customerName && (
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
                          <span className="payment-name">QRIS (Semua E-Wallet)</span>
                          <span className="payment-note">Fee 0.7%</span>
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
                          <span className="payment-name">BCA Virtual Account</span>
                          <span className="payment-note">Fee 0.7% + Rp 1.000</span>
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
                          <span className="payment-name">Mandiri Virtual Account</span>
                          <span className="payment-note">Fee 0.7% + Rp 1.000</span>
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
                          <span className="payment-name">BNI Virtual Account</span>
                          <span className="payment-note">Fee 0.7% + Rp 1.000</span>
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
                          <span className="payment-name">BRI Virtual Account</span>
                          <span className="payment-note">Fee 0.7% + Rp 1.000</span>
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
                          <span className="payment-name">OVO</span>
                          <span className="payment-note">Fee 2%</span>
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
                          <span className="payment-name">ShopeePay</span>
                          <span className="payment-note">Fee 2%</span>
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
                          <span className="payment-name">DANA</span>
                          <span className="payment-note">Fee 2%</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {errors.payment && <div className="error">{errors.payment}</div>}
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

                {userIdValidated && (
                  <div className="summary-item">
                    <span>Game ID</span>
                    <span>{currentGameConfig.displayFormat(formData.userId, formData.zoneId)}</span>
                  </div>
                )}

                <div className="summary-item">
                  <span>Harga</span>
                  <span>{formatRupiah(selectedProduct.price)}</span>
                </div>

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

                    <div className="summary-note">
                      *Biaya admin sudah termasuk
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handlePaymentClick}
                      className="btn-submit"
                      disabled={processing}
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