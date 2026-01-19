import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './PaymentPage.css';

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!orderId) {
      setError('Order ID not found');
      setLoading(false);
      return;
    }

    fetchOrderDetails();
    
    // Auto-refresh every 10 seconds to check payment status
    const interval = setInterval(fetchOrderDetails, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders/status/${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrder(data.data);
        
        // If payment successful, redirect to success page
        if (data.data.paymentStatus === 'success' || data.data.paymentStatus === 'settlement') {
          navigate(`/order/success?order_id=${orderId}`);
        }
      } else {
        setError(data.message || 'Failed to load order');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getVAInfo = () => {
    if (order?.paymentData) {
      try {
        const paymentData = typeof order.paymentData === 'string' 
          ? JSON.parse(order.paymentData) 
          : order.paymentData;
        
        console.log('Payment data:', paymentData);
        
        // Method 1: Standard VA (BCA, BNI, BRI, CIMB)
        if (paymentData.vaNumbers && paymentData.vaNumbers.length > 0) {
          return paymentData.vaNumbers[0];
        }
        
        // Method 2: Mandiri (different format!)
        if (paymentData.billKey && paymentData.billerCode) {
          return {
            bank: 'mandiri',
            va_number: paymentData.billKey,
            company_code: paymentData.billerCode,
          };
        }
        
        // Method 3: Permata (also different!)
        if (paymentData.permataVaNumber) {
          return {
            bank: 'permata',
            va_number: paymentData.permataVaNumber,
          };
        }
        
        console.warn('No VA number found in payment data');
        return null;
        
      } catch (e) {
        console.error('Error parsing payment data:', e);
        return null;
      }
    }
    return null;
  };

  const getBankName = (bank) => {
    const bankNames = {
      'bca': 'BCA',
      'bni': 'BNI',
      'bri': 'BRI',
      'mandiri': 'Mandiri',
      'permata': 'Permata',
      'cimb': 'CIMB Niaga',
    };
    return bankNames[bank?.toLowerCase()] || bank?.toUpperCase();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('VA Number copied to clipboard!');
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="payment-page">
        <div className="container">
          <div className="loading">Loading payment details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-page">
        <div className="container">
          <div className="error-box">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/')}>Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="payment-page">
        <div className="container">
          <div className="error-box">Order not found</div>
        </div>
      </div>
    );
  }

  const vaInfo = getVAInfo();

  return (
    <div className="payment-page">
      <div className="container">
        <div className="payment-container">
          
          {/* Header */}
          <div className="payment-header">
            <div className="status-badge pending">
              <span className="status-icon">⏳</span>
              Waiting for Payment
            </div>
            <h1>Complete Your Payment</h1>
            <p className="order-number">Order: {order.orderNumber}</p>
          </div>

          {/* Payment Amount */}
          <div className="payment-amount">
            <div className="amount-label">Total Payment</div>
            <div className="amount-value">{formatRupiah(order.amount)}</div>
          </div>

          {/* VA Details */}
          {vaInfo && (
            <div className="va-details">
              <div className="bank-logo">
                <img 
                  src={`/images/${vaInfo.bank?.toLowerCase()}-logo.png`} 
                  alt={getBankName(vaInfo.bank)}
                  onError={(e) => e.target.style.display = 'none'}
                />
                <h3>{getBankName(vaInfo.bank)} Virtual Account</h3>
              </div>

              <div className="va-number-box">
                <div className="va-label">Virtual Account Number</div>
                <div className="va-number">
                  {vaInfo.va_number}
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(vaInfo.va_number)}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="instructions">
                <h3>Payment Instructions</h3>
                
                <div className="instruction-section">
                  <h4>🏧 ATM</h4>
                  <ol>
                    <li>Select "Other Transaction"</li>
                    <li>Select "Transfer"</li>
                    <li>Select "To {getBankName(vaInfo.bank)} Virtual Account"</li>
                    <li>Enter VA number: <strong>{vaInfo.va_number}</strong></li>
                    <li>Enter amount: <strong>{formatRupiah(order.amount)}</strong></li>
                    <li>Verify details and confirm</li>
                  </ol>
                </div>

                <div className="instruction-section">
                  <h4>📱 Mobile Banking</h4>
                  <ol>
                    <li>Open your mobile banking app</li>
                    <li>Select "Transfer" or "Payment"</li>
                    <li>Select "{getBankName(vaInfo.bank)} Virtual Account"</li>
                    <li>Enter VA number: <strong>{vaInfo.va_number}</strong></li>
                    <li>Verify and complete payment</li>
                  </ol>
                </div>

                <div className="instruction-section">
                  <h4>💻 Internet Banking</h4>
                  <ol>
                    <li>Login to your internet banking</li>
                    <li>Go to "Transfer" menu</li>
                    <li>Select "To {getBankName(vaInfo.bank)} Virtual Account"</li>
                    <li>Input VA number and confirm</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Fallback if no VA info */}
          {!vaInfo && (
            <div className="pending-info">
              <p>Processing payment information...</p>
              <p className="note">Please wait while we prepare your payment details.</p>
            </div>
          )}

          {/* Important Notes */}
          <div className="important-notes">
            <h3>⚠️ Important Notes</h3>
            <ul>
              <li>Payment will be verified automatically (usually within 5-10 minutes)</li>
              <li>VA number is valid for 24 hours</li>
              <li>Do not close this page - it will auto-refresh when payment is confirmed</li>
              <li>Make sure to pay the EXACT amount: {formatRupiah(order.amount)}</li>
            </ul>
          </div>

          {/* Product Info */}
          <div className="product-info">
            <h4>Order Details</h4>
            <div className="product-item">
              <span>{order.productName}</span>
              <span>{formatRupiah(order.amount)}</span>
            </div>
            <div className="game-info">
              <strong>Riot ID:</strong> {order.gameUserId}#{order.gameUserTag}
            </div>
          </div>

          {/* Actions */}
          <div className="payment-actions">
            <button className="btn-refresh" onClick={fetchOrderDetails}>
              🔄 Refresh Status
            </button>
            <button className="btn-home" onClick={() => navigate('/')}>
              🏠 Back to Home
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
