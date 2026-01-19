import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './QRPaymentPage.css';

const QRPaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    console.log('=== QRPaymentPage mounted ===');
    console.log('Order ID from URL:', orderId);
    
    if (!orderId) {
      console.error('No order ID found!');
      setError('Order ID not found');
      setLoading(false);
      return;
    }

    fetchOrderDetails();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchOrderDetails, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      console.log('Fetching order details for:', orderId);
      const response = await fetch(`${API_URL}/api/orders/status/${orderId}`);
      const data = await response.json();

      console.log('API Response:', data);

      if (data.success) {
        setOrder(data.data);
        console.log('Order data set:', data.data);
        
        // Extract and set QR code
        const qrUrl = extractQRCode(data.data);
        console.log('Extracted QR URL:', qrUrl);
        
        if (qrUrl) {
          setQrCodeUrl(qrUrl);
        } else {
          console.warn('No QR code URL found in payment data');
        }
        
        // Check payment status
        if (data.data.paymentStatus === 'success' || 
            data.data.paymentStatus === 'settlement' ||
            data.data.paymentStatus === 'capture') {
          console.log('Payment successful, redirecting...');
          navigate(`/order/success?order_id=${orderId}`);
        }
      } else {
        console.error('API returned error:', data.message);
        setError(data.message || 'Failed to load order');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const extractQRCode = (orderData) => {
    console.log('=== Extracting QR Code ===');
    console.log('Order data:', orderData);
    console.log('Payment data:', orderData.paymentData);
    console.log('Payment data type:', typeof orderData.paymentData);
    
    if (!orderData.paymentData) {
      console.warn('No payment data found');
      return null;
    }
    
    try {
      // Parse if string
      const paymentData = typeof orderData.paymentData === 'string' 
        ? JSON.parse(orderData.paymentData) 
        : orderData.paymentData;
      
      console.log('Parsed payment data:', paymentData);
      console.log('Payment data keys:', Object.keys(paymentData));
      
      // Try multiple possible locations for QR code
      let qrUrl = null;
      
      // Method 1: token (Midtrans QR image URL) - HIGHEST PRIORITY!
      if (paymentData.token && paymentData.token.includes('http')) {
        console.log('Found token (QR image URL):', paymentData.token);
        qrUrl = paymentData.token;
      }
      
      // Method 2: qr_string or qrString (Raw QRIS data - convert to image)
      else if (paymentData.qr_string) {
        console.log('Found qr_string (raw QRIS data):', paymentData.qr_string);
        // Generate QR image from raw QRIS text using QR API
        qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(paymentData.qr_string)}`;
      } else if (paymentData.qrString) {
        console.log('Found qrString (raw QRIS data):', paymentData.qrString);
        // Generate QR image from raw QRIS text using QR API
        qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(paymentData.qrString)}`;
      }
      
      // Method 2: actions array
      else if (paymentData.actions && Array.isArray(paymentData.actions)) {
        console.log('Checking actions array:', paymentData.actions);
        const qrAction = paymentData.actions.find(
          a => a.name === 'generate-qr-code' || 
               a.name === 'deeplink-redirect' ||
               a.url
        );
        if (qrAction) {
          console.log('Found QR in actions:', qrAction);
          qrUrl = qrAction.url;
        }
      }
      
      // Method 3: redirect URL (might be QR page)
      else if (paymentData.redirect_url) {
        console.log('Found redirect_url:', paymentData.redirect_url);
        qrUrl = paymentData.redirect_url;
      } else if (paymentData.redirectUrl) {
        console.log('Found redirectUrl:', paymentData.redirectUrl);
        qrUrl = paymentData.redirectUrl;
      }
      
      // Method 4: Direct URL in paymentData
      else if (typeof paymentData === 'string' && paymentData.startsWith('http')) {
        console.log('Payment data is direct URL:', paymentData);
        qrUrl = paymentData;
      }
      
      console.log('Final QR URL:', qrUrl);
      return qrUrl;
      
    } catch (e) {
      console.error('Error parsing payment data:', e);
      console.error('Raw payment data:', orderData.paymentData);
      return null;
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentMethodName = (method) => {
    const methods = {
      'qris': 'QRIS',
      'gopay': 'GoPay',
      'shopeepay': 'ShopeePay',
      'ovo': 'OVO',
      'dana': 'DANA',
      'linkaja': 'LinkAja',
    };
    return methods[method?.toLowerCase()] || method?.toUpperCase();
  };

  if (loading) {
    return (
      <div className="qr-payment-page">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qr-payment-page">
        <div className="container">
          <div className="error-box">
            <h2>❌ Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/')}>Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="qr-payment-page">
        <div className="container">
          <div className="error-box">Order not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-payment-page">
      <div className="container">
        <div className="qr-payment-container">
          
          {/* Header */}
          <div className="qr-payment-header">
            <div className="status-badge pending">
              <span className="status-icon">⏳</span>
              Waiting for Payment
            </div>
            <h1>Scan QR Code to Pay</h1>
            <p className="order-number">Order: {order.orderNumber}</p>
          </div>

          {/* Payment Amount */}
          <div className="payment-amount-box">
            <div className="amount-label">Total Payment</div>
            <div className="amount-value">{formatRupiah(order.amount)}</div>
            <div className="payment-method-badge">
              {getPaymentMethodName(order.paymentMethod)}
            </div>
          </div>

          {/* QR Code Display */}
          <div className="qr-code-section">
            {qrCodeUrl ? (
              <>
                <div className="qr-code-wrapper">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="qr-code-image"
                    onLoad={() => console.log('QR code image loaded successfully')}
                    onError={(e) => {
                      console.error('QR code image failed to load:', qrCodeUrl);
                      e.target.style.display = 'none';
                      setError('Failed to load QR code image');
                    }}
                  />
                  <div className="qr-scan-animation">
                    <div className="scan-line"></div>
                  </div>
                </div>
                
                <div className="qr-instructions">
                  <h3>📱 How to Pay:</h3>
                  <ol>
                    <li>Open your {getPaymentMethodName(order.paymentMethod)} app or any e-wallet app that supports QRIS</li>
                    <li>Tap on "Scan QR" or "QRIS"</li>
                    <li>Point your camera at the QR code above</li>
                    <li>Verify the amount: <strong>{formatRupiah(order.amount)}</strong></li>
                    <li>Complete the payment</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="qr-loading">
                <div className="spinner"></div>
                <p>Generating QR Code...</p>
                <p className="note">Please wait a moment</p>
                {/* Debug info */}
                <div style={{marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '8px', fontSize: '12px', textAlign: 'left'}}>
                  <strong>Debug Info:</strong>
                  <pre style={{overflow: 'auto', maxHeight: '200px'}}>
                    {JSON.stringify({
                      orderId: order.orderNumber,
                      paymentMethod: order.paymentMethod,
                      hasPaymentData: !!order.paymentData,
                      paymentDataType: typeof order.paymentData,
                    }, null, 2)}
                  </pre>
                  <p style={{marginTop: '10px', color: '#666'}}>
                    Check browser console (F12) for detailed logs
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Auto-refresh indicator */}
          <div className="auto-refresh-indicator">
            <div className="refresh-icon">🔄</div>
            <p>Auto-checking payment status...</p>
            <p className="note">This page will automatically redirect when payment is confirmed</p>
          </div>

          {/* Important Notes */}
          <div className="important-notes">
            <h3>⚠️ Important Notes</h3>
            <ul>
              <li>Payment will be verified automatically (usually within 5-10 seconds)</li>
              <li>QR code is valid for 24 hours</li>
              <li>Do not close this page until payment is confirmed</li>
              <li>Make sure to pay the EXACT amount: {formatRupiah(order.amount)}</li>
            </ul>
          </div>

          {/* Product Info */}
          <div className="product-info-box">
            <h4>Order Details</h4>
            <div className="product-item">
              <div className="product-details">
                <span className="product-name">{order.productName}</span>
                <span className="game-info">
                  Riot ID: {order.gameUserId}#{order.gameUserTag}
                </span>
              </div>
              <span className="product-price">{formatRupiah(order.amount)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="qr-payment-actions">
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

export default QRPaymentPage;
