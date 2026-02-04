/**
 * Checkout Component - React
 * Shows price breakdown with promo code support
 * 
 * FEATURES:
 * - Real-time price calculation
 * - Promo code validation
 * - Display crossed-out "normal" price when promo applied
 * - Shows discount amount
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

function Checkout({ product, paymentMethod, riotId, riotTag, customerEmail, customerName, phoneNumber }) {
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculate price on mount and when dependencies change
  useEffect(() => {
    if (product && paymentMethod) {
      calculatePrice();
    }
  }, [product, paymentMethod]);

  /**
   * Calculate price with or without promo
   */
  const calculatePrice = async (promo = null) => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/calculate-price`, {
        productId: product.id,
        paymentMethod: paymentMethod,
        promoCode: promo || null,
        customerEmail: customerEmail || null
      });

      if (response.data.success) {
        setPricing(response.data.breakdown);
        setPromoApplied(!!promo);
      } else {
        setError(response.data.error || 'Failed to calculate price');
        setPromoApplied(false);
      }
    } catch (err) {
      console.error('Calculate price error:', err);
      setError(err.response?.data?.error || 'Failed to calculate price');
      setPromoApplied(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply promo code
   */
  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      setError('Please enter a promo code');
      return;
    }

    calculatePrice(promoCode.toUpperCase());
  };

  /**
   * Remove promo code
   */
  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoApplied(false);
    setError('');
    calculatePrice(null);
  };

  /**
   * Create order
   */
  const handleCheckout = async () => {
    setSubmitting(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/orders/create`, {
        productId: product.id,
        paymentMethod: paymentMethod,
        customerEmail: customerEmail,
        customerName: customerName,
        phoneNumber: phoneNumber,
        riotId: riotId,
        riotTag: riotTag,
        promoCode: promoApplied ? promoCode : null
      });

      if (response.data.success) {
        // Redirect to payment URL
        window.location.href = response.data.order.payment.url;
      } else {
        setError(response.data.message || 'Failed to create order');
      }
    } catch (err) {
      console.error('Create order error:', err);
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!pricing) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Calculating price...</p>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      {/* Price Breakdown */}
      <div className="price-breakdown">
        <h3>Order Summary</h3>

        <div className="breakdown-items">
          {/* Product Price */}
          <div className="breakdown-item">
            <span className="label">{pricing.productName}</span>
            {promoApplied && pricing.displayedNormalPrice > pricing.sellingPrice ? (
              <div className="price-with-discount">
                <span className="original-price">{formatCurrency(pricing.displayedNormalPrice)}</span>
                <span className="discounted-price">{formatCurrency(pricing.sellingPrice)}</span>
              </div>
            ) : (
              <span className="value">{formatCurrency(pricing.sellingPrice)}</span>
            )}
          </div>

          {/* Payment Fee */}
          <div className="breakdown-item">
            <span className="label">
              Payment Fee ({paymentMethod.toUpperCase()})
            </span>
            <span className="value">{formatCurrency(pricing.paymentFee)}</span>
          </div>

          {/* Subtotal */}
          <div className="breakdown-item subtotal">
            <span className="label">Subtotal</span>
            <span className="value">{formatCurrency(pricing.subtotal)}</span>
          </div>

          {/* Promo Discount */}
          {pricing.promoDiscount > 0 && (
            <div className="breakdown-item promo-discount">
              <span className="label">
                Promo Discount ({pricing.promoCode})
              </span>
              <span className="value discount">
                - {formatCurrency(pricing.promoDiscount)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="breakdown-item total">
            <span className="label">Total Payment</span>
            <span className="value">{formatCurrency(pricing.total)}</span>
          </div>
        </div>
      </div>

      {/* Promo Code Section */}
      <div className="promo-section">
        <h4>Have a Promo Code?</h4>
        
        {!promoApplied ? (
          <div className="promo-input-group">
            <input
              type="text"
              className="promo-input"
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              disabled={loading}
            />
            <button
              className="btn-apply-promo"
              onClick={handleApplyPromo}
              disabled={!promoCode.trim() || loading}
            >
              {loading ? 'Checking...' : 'Apply'}
            </button>
          </div>
        ) : (
          <div className="promo-applied">
            <div className="promo-badge">
              <span className="icon">✓</span>
              <span className="text">Promo "{promoCode}" applied!</span>
            </div>
            <button
              className="btn-remove-promo"
              onClick={handleRemovePromo}
              disabled={loading}
            >
              Remove
            </button>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      {/* Checkout Button */}
      <button
        className="btn-checkout"
        onClick={handleCheckout}
        disabled={submitting || loading}
      >
        {submitting ? 'Processing...' : `Pay ${formatCurrency(pricing.total)}`}
      </button>

      {/* Save Info */}
      {promoApplied && pricing.promoDiscount > 0 && (
        <div className="savings-badge">
          🎉 You saved {formatCurrency(pricing.promoDiscount)}!
        </div>
      )}
    </div>
  );
}

export default Checkout;

/* ============================================
   CSS STYLES (Add to your CSS file)
   ============================================ */

const styles = `
.checkout-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.price-breakdown {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.price-breakdown h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
}

.breakdown-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.breakdown-item.subtotal {
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.breakdown-item.promo-discount {
  color: #059669;
  font-weight: 500;
}

.breakdown-item.total {
  padding-top: 12px;
  border-top: 2px solid #e5e7eb;
  font-size: 18px;
  font-weight: 700;
}

.price-with-discount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.original-price {
  font-size: 14px;
  color: #9ca3af;
  text-decoration: line-through;
}

.discounted-price {
  font-size: 16px;
  font-weight: 600;
  color: #dc2626;
}

.value.discount {
  color: #059669;
}

.promo-section {
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.promo-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.promo-input-group {
  display: flex;
  gap: 8px;
}

.promo-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  text-transform: uppercase;
}

.promo-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.btn-apply-promo {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-apply-promo:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.promo-applied {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #d1fae5;
  border-radius: 8px;
}

.promo-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #059669;
  font-weight: 600;
}

.btn-remove-promo {
  padding: 8px 16px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.error-message {
  margin-top: 12px;
  padding: 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 14px;
}

.btn-checkout {
  width: 100%;
  padding: 16px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-checkout:hover {
  background: #b91c1c;
}

.btn-checkout:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.savings-badge {
  margin-top: 16px;
  padding: 12px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
}

.checkout-loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;
