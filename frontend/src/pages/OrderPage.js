import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './OrderPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

function OrderPage() {
  const { gameSlug } = useParams();

  const [game, setGame] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Riot ID validation state
  const [riotIdValidated, setRiotIdValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    riotId: '',
    riotTag: '',
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
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

    if (name === 'riotId' || name === 'riotTag') {
      setRiotIdValidated(false);
      setValidationError('');
    }
  };

  // Validate Riot ID
  const validateRiotId = async () => {
    if (!formData.riotId.trim() || !formData.riotTag.trim()) {
      setValidationError('Masukkan Riot ID dan Tagline');
      return;
    }

    try {
      setValidating(true);
      setValidationError('');

      const response = await fetch(`${API_URL}/api/validate-riot-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          riotId: formData.riotId.trim(),
          riotTag: formData.riotTag.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRiotIdValidated(true);
        setValidationError('');
      } else {
        setValidationError(data.message || 'Riot ID tidak valid');
        setRiotIdValidated(false);
      }
    } catch (error) {
      console.error('Error validating Riot ID:', error);
      setValidationError('Gagal memvalidasi Riot ID');
      setRiotIdValidated(false);
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

      const orderData = {
        productId: selectedProduct.id,
        riotId: formData.riotId.trim(),
        riotTag: formData.riotTag.trim(),
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
      <div 
        className="game-header-image" 
        id="game-header-image"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL}/images/valorant-header.jpg)`
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
              {selectedProduct && (
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

                  {/* Validation Button */}
                  {!riotIdValidated && (
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

                  {riotIdValidated && (
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
              )}

              {/* Step 3: Contact Info - ONLY SHOW IF RIOT ID VALIDATED */}
              {selectedProduct && riotIdValidated && (
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
              {selectedProduct && riotIdValidated && formData.customerEmail && formData.customerName && (
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

              {/* Submit Button */}
              {selectedProduct && selectedPaymentMethod && (
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={processing}
                >
                  {processing ? 'Memproses...' : 'Bayar Sekarang'}
                </button>
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

                <div className="summary-item">
                  <span>Harga</span>
                  <span>{selectedProduct.displayPrice}</span>
                </div>

                {riotIdValidated && (
                  <div className="summary-item">
                    <span>Riot ID</span>
                    <span>{formData.riotId}#{formData.riotTag}</span>
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

                    <div className="summary-divider"></div>

                    <div className="summary-total">
                      <span>Total Pembayaran</span>
                      <span className="total-price">
                        {selectedProduct.displayPrice}
                      </span>
                    </div>

                    <div className="summary-note">
                      *Biaya admin sudah termasuk
                    </div>
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
