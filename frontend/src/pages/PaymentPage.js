import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import './PaymentPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

function PaymentPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('');
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Load payment info
  useEffect(() => {
    loadPaymentInfo();
    
    const statusInterval = setInterval(() => {
      checkPaymentStatus();
    }, 10000);

    return () => clearInterval(statusInterval);
  }, [orderNumber]);

  // Generate QR Code from qrString
  useEffect(() => {
    if (paymentData?.payment?.qrString) {
      QRCode.toDataURL(paymentData.payment.qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then(url => {
        setQrCodeDataUrl(url);
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
      });
    }
  }, [paymentData]);

  // Countdown timer
  useEffect(() => {
    if (!paymentData?.payment?.expiresAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(paymentData.payment.expiresAt).getTime();
      const distance = expiry - now;

      if (distance < 0) {
        setCountdown('EXPIRED');
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setCountdown(`${hours}j ${minutes}m ${seconds}d`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [paymentData]);

  const loadPaymentInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/orders/${orderNumber}`);
      const data = await response.json();

      console.log('Payment data loaded:', data);

      if (data.success) {
        setPaymentData(data.order);
        
        if (data.order.payment.status === 'success') {
          navigate(`/order/success?order_id=${orderNumber}`);
        }
      } else {
        setError(data.message || 'Order tidak ditemukan');
      }
    } catch (err) {
      console.error('Error loading payment:', err);
      setError('Gagal memuat informasi pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await fetch(`${API_URL}/api/duitku/check-transaction/${orderNumber}`);
      const data = await response.json();

      if (data.success && data.data.statusCode === '00') {
        navigate(`/order/success?order_id=${orderNumber}`);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPaymentMethodName = (method) => {
    const names = {
      'BC': 'BCA Virtual Account',
      'M2': 'Mandiri Virtual Account',
      'I1': 'BNI Virtual Account',
      'BR': 'BRI Virtual Account',
      'BT': 'Permata Virtual Account',
      'B1': 'CIMB Niaga Virtual Account',
      'DM': 'Danamon Virtual Account',
      'BV': 'BSI Virtual Account',
      'SP': 'QRIS',
      'OV': 'OVO',
      'SA': 'ShopeePay',
      'DA': 'DANA',
      'va_bca': 'BCA Virtual Account',
      'va_mandiri': 'Mandiri Virtual Account',
      'va_bni': 'BNI Virtual Account',
      'va_bri': 'BRI Virtual Account',
      'qris': 'QRIS',
      'ovo': 'OVO',
      'shopeepay': 'ShopeePay',
      'dana': 'DANA',
    };
    return names[method] || method;
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
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Memuat informasi pembayaran...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-page">
        <div className="container">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>Terjadi Kesalahan</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/')} className="btn-back">
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine payment type
  const isQRIS = paymentData?.payment?.method === 'SP' || paymentData?.payment?.method === 'qris';
  const isVA = paymentData?.payment?.vaNumber && !isQRIS;
  const isEwallet = ['OV', 'SA', 'DA', 'LA', 'ovo', 'shopeepay', 'dana', 'linkaja'].includes(paymentData?.payment?.method);

  return (
    <div className="payment-page">
      <div className="container">
        <div className="payment-container">
          
          {/* Header */}
          <div className="payment-header">
            <h1>Menunggu Pembayaran</h1>
            <div className="order-info">
              <span className="order-number">Order #{paymentData.orderNumber}</span>
              <span className="separator">•</span>
              <span className="payment-method">
                {getPaymentMethodName(paymentData.payment.method)}
              </span>
            </div>
          </div>

          {/* Timer */}
          <div className={`payment-timer ${countdown === 'EXPIRED' ? 'expired' : ''}`}>
            <div className="timer-icon">⏱️</div>
            <div className="timer-content">
              <span className="timer-label">Bayar sebelum:</span>
              <span className="timer-value">{countdown || 'Memuat...'}</span>
            </div>
            {countdown === 'EXPIRED' && (
              <div className="expired-message">Pembayaran expired. Silakan buat pesanan baru.</div>
            )}
          </div>

          {/* Payment Details */}
          <div className="payment-details">
            
            {/* Virtual Account */}
            {isVA && (
              <div className="payment-section va-section">
                <h2>Nomor Virtual Account</h2>
                <div className="va-number-container">
                  <div className="va-number">{paymentData.payment.vaNumber}</div>
                  <button 
                    className={`btn-copy ${copied ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(paymentData.payment.vaNumber)}
                  >
                    {copied ? '✓ Tersalin' : 'Salin'}
                  </button>
                </div>
                
                <div className="amount-display">
                  <span className="amount-label">Jumlah yang harus dibayar:</span>
                  <span className="amount-value">
                    {formatRupiah(paymentData.total)}
                  </span>
                </div>

                <div className="payment-instructions">
                  <h3>Cara Pembayaran:</h3>
                  <ol>
                    <li>Buka aplikasi mobile banking atau ATM</li>
                    <li>Pilih menu <strong>Transfer</strong> atau <strong>Bayar</strong></li>
                    <li>Pilih <strong>{getPaymentMethodName(paymentData.payment.method)}</strong></li>
                    <li>Masukkan nomor VA: <strong>{paymentData.payment.vaNumber}</strong></li>
                    <li>Masukkan jumlah: <strong>{formatRupiah(paymentData.total)}</strong></li>
                    <li>Konfirmasi pembayaran</li>
                  </ol>
                </div>
              </div>
            )}

            {/* QRIS - Show QR Code if qrString available */}
            {isQRIS && (
              <div className="payment-section qris-section">
                <h2>Pembayaran QRIS</h2>
                
                {/* Show QR Code if available */}
                {qrCodeDataUrl ? (
                  <div className="qris-container">
                    <p className="qris-info">Scan QR Code di bawah dengan aplikasi e-wallet Anda</p>
                    <img src={qrCodeDataUrl} alt="QRIS Code" className="qr-code" />
                    <div className="qr-note">
                      <strong>💡 Tip:</strong> Gunakan aplikasi GoPay, OVO, DANA, ShopeePay, atau mobile banking yang support QRIS
                    </div>
                  </div>
                ) : (
                  /* Fallback to button if no qrString */
                  <>
                    <p className="qris-info">
                      Klik tombol di bawah untuk membuka halaman pembayaran QRIS
                    </p>
                    <a 
                      href={paymentData.payment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-open-qris"
                    >
                      Buka Halaman QRIS
                    </a>
                  </>
                )}
                
                <div className="amount-display">
                  <span className="amount-label">Jumlah yang harus dibayar:</span>
                  <span className="amount-value">
                    {formatRupiah(paymentData.total)}
                  </span>
                </div>

                <div className="payment-instructions">
                  <h3>Cara Pembayaran:</h3>
                  <ol>
                    <li>Buka aplikasi e-wallet atau mobile banking Anda</li>
                    <li>Pilih menu <strong>Scan QR</strong> atau <strong>QRIS</strong></li>
                    <li>Scan QR Code di atas</li>
                    <li>Periksa detail pembayaran</li>
                    <li>Konfirmasi pembayaran</li>
                  </ol>
                  <div className="note-box">
                    <strong>💡 Tips:</strong> Jangan tutup halaman ini. Pembayaran akan otomatis terverifikasi setelah Anda scan QR.
                  </div>
                </div>
              </div>
            )}

            {/* E-Wallet */}
            {isEwallet && paymentData.payment.url && (
              <div className="payment-section ewallet-section">
                <h2>Pembayaran {getPaymentMethodName(paymentData.payment.method)}</h2>
                <p className="ewallet-info">
                  Klik tombol di bawah untuk melanjutkan pembayaran
                </p>
                <a 
                  href={paymentData.payment.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-open-payment"
                >
                  Lanjutkan Pembayaran
                </a>
                
                <div className="amount-display">
                  <span className="amount-label">Jumlah yang harus dibayar:</span>
                  <span className="amount-value">
                    {formatRupiah(paymentData.total)}
                  </span>
                </div>
              </div>
            )}

            {/* Product Info */}
            <div className="order-summary">
              <h3>Detail Pesanan</h3>
              <div className="summary-row">
                <span>Produk</span>
                <span>{paymentData.productName}</span>
              </div>
              <div className="summary-row">
                <span>Riot ID</span>
                <span>{paymentData.gameUserId}#{paymentData.gameUserTag}</span>
              </div>
              <div className="summary-row">
                <span>Email</span>
                <span>{paymentData.customer_email}</span>
              </div>
              <div className="summary-row">
                <span>Harga Produk</span>
                <span>{formatRupiah(paymentData.amount)}</span>
              </div>
              <div className="summary-row">
                <span>Biaya Admin</span>
                <span>{formatRupiah(paymentData.paymentFee)}</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total">
                <span>Total</span>
                <span className="total-amount">
                  {formatRupiah(paymentData.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Check Status Button */}
          <div className="payment-actions">
            <button 
              className="btn-check-status"
              onClick={checkPaymentStatus}
              disabled={checkingStatus}
            >
              {checkingStatus ? 'Mengecek...' : 'Cek Status Pembayaran'}
            </button>
            
            <div className="help-text">
              Pembayaran akan otomatis terverifikasi setelah Anda melakukan transfer
            </div>
          </div>

          {/* Footer Notes */}
          <div className="payment-notes">
            <div className="note-item">
              <span className="note-icon">ℹ️</span>
              <span>Pastikan Anda membayar dengan nominal yang <strong>SAMA PERSIS</strong></span>
            </div>
            <div className="note-item">
              <span className="note-icon">🔒</span>
              <span>Pembayaran Anda aman dan terenkripsi</span>
            </div>
            <div className="note-item">
              <span className="note-icon">⚡</span>
              <span>Pesanan akan diproses otomatis setelah pembayaran terverifikasi</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
