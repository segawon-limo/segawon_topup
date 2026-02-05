import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import './OrderPage.css';

const API_URL = process.env.REACT_APP_API_URL;

function OrderPage() {
  const { gameSlug } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // NEW: Riot ID validation state
  const [riotIdValidated, setRiotIdValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    gameUserId: '',
    gameUserTag: '',
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
      
      // Calculate opacity based on scroll position
      // Start fading immediately when scrolling
      const fadeStart = 0;
      const fadeEnd = headerHeight * 1.2; // Fade over 120% of header height for smoother effect
      
      let opacity = 1;
      
      if (scrollTop > fadeStart) {
        const fadeProgress = Math.min(scrollTop / fadeEnd, 1);
        opacity = Math.max(0, 1 - fadeProgress);
      }
      
      headerImage.style.opacity = opacity;
      
      // Slight scale effect for parallax feel
      const scale = 1 + (scrollTop / 3000);
      headerImage.style.transform = `scale(${Math.min(scale, 1.1)})`;
    };

    // Run once on mount to set initial state
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/orders/products/${gameSlug}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setSelectedPayment(null);
    // Reset validation if product changes
    setRiotIdValidated(false);
  };

  const handlePaymentSelect = (payment) => {
    setSelectedPayment(payment);
    console.log('Payment selected:', payment);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null,
      }));
    }

    // Reset validation if Riot ID or tag changes
    if (name === 'gameUserId' || name === 'gameUserTag') {
      setRiotIdValidated(false);
      setValidationError('');
    }
  };

  // NEW: Validate Riot ID
  const validateRiotId = async () => {
    if (!formData.gameUserId.trim() || !formData.gameUserTag.trim()) {
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
          riotId: formData.gameUserId.trim(),
          tagline: formData.gameUserTag.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRiotIdValidated(true);
        setValidationError('');
        // Optionally set player name
        if (data.data && data.data.gameName) {
          setFormData(prev => ({
            ...prev,
            customerName: data.data.gameName,
          }));
        }
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

    if (!formData.gameUserId.trim()) {
      newErrors.gameUserId = 'Riot ID wajib diisi';
    }

    if (!formData.gameUserTag.trim()) {
      newErrors.gameUserTag = 'Tagline wajib diisi';
    }

    if (!riotIdValidated) {
      newErrors.riotId = 'Verifikasi Riot ID terlebih dahulu';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Format email tidak valid';
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Nomor HP wajib diisi';
    }

    if (!selectedProduct) {
      newErrors.product = 'Pilih produk terlebih dahulu';
    }

    if (!selectedPayment) {
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
        gameUserId: formData.gameUserId.trim(),
        gameUserTag: formData.gameUserTag.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerName: formData.customerName.trim() || 'Customer',
        paymentMethod: selectedPayment.paymentMethod,
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
        window.location.href = data.data.payment.redirectUrl;
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
        <h1 className="page-title">Order Valorant Points</h1>

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
                        Mulai dari Rp {product.pricing.qris.price.toLocaleString('id-ID')}
                      </div>
                      {product.pricing.qris.recommended && (
                        <div className="badge">Rekomendasi</div>
                      )}
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
                      name="gameUserId"
                      value={formData.gameUserId}
                      onChange={handleInputChange}
                      placeholder="Contoh: segawon"
                      className={errors.gameUserId ? 'error' : ''}
                      disabled={riotIdValidated}
                    />
                    {errors.gameUserId && <div className="error">{errors.gameUserId}</div>}
                    <small>Masukkan Riot ID tanpa tanda #</small>
                  </div>

                  <div className="form-group">
                    <label>Tagline *</label>
                    <input
                      type="text"
                      name="gameUserTag"
                      value={formData.gameUserTag}
                      onChange={handleInputChange}
                      placeholder="Contoh: limo"
                      className={errors.gameUserTag ? 'error' : ''}
                      disabled={riotIdValidated}
                    />
                    {errors.gameUserTag && <div className="error">{errors.gameUserTag}</div>}
                    <small>Masukkan tagline tanpa tanda #</small>
                  </div>

                  {/* Validation Button */}
                  {!riotIdValidated && (
                    <button
                      type="button"
                      onClick={validateRiotId}
                      disabled={validating || !formData.gameUserId || !formData.gameUserTag}
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
                      ✓ Riot ID terverifikasi: {formData.gameUserId}#{formData.gameUserTag}
                      <button
                        type="button"
                        onClick={() => setRiotIdValidated(false)}
                        className="btn-change"
                      >
                        Ubah
                      </button>
                    </div>
                  )}

                  {errors.riotId && <div className="error">{errors.riotId}</div>}
                </div>
              )}

              {/* Step 3: Contact Info - ONLY SHOW IF RIOT ID VALIDATED */}
              {selectedProduct && riotIdValidated && (
                <div className="form-section">
                  <h2>3. Informasi Kontak</h2>
                  
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
                    <label>Nomor HP *</label>
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

                  <div className="form-group">
                    <label>Nama (Opsional)</label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      placeholder="Nama Anda"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Payment Method - ONLY SHOW IF RIOT ID VALIDATED AND EMAIL FILLED */}
              {selectedProduct && riotIdValidated && formData.customerEmail && (
                <div className="form-section">
                  <h2>4. Pilih Pembayaran</h2>
                  <PaymentMethodSelector
                    product={selectedProduct}
                    onPaymentSelect={handlePaymentSelect}
                  />
                  {errors.payment && <div className="error">{errors.payment}</div>}
                </div>
              )}

              {/* Submit Button */}
              {selectedPayment && (
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={processing}
                >
                  {processing ? 'Memproses...' : `Bayar Rp ${selectedPayment.price.toLocaleString('id-ID')}`}
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

                {riotIdValidated && (
                  <div className="summary-item">
                    <span>Riot ID</span>
                    <span>{formData.gameUserId}#{formData.gameUserTag}</span>
                  </div>
                )}

                {selectedPayment && (
                  <>
                    <div className="summary-item">
                      <span>Metode Pembayaran</span>
                      <span>{selectedPayment.channelName}</span>
                    </div>

                    <div className="summary-divider"></div>

                    <div className="summary-total">
                      <span>Total Pembayaran</span>
                      <span className="total-price">
                        Rp {selectedPayment.price.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="summary-note">
                      Biaya admin sudah termasuk
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