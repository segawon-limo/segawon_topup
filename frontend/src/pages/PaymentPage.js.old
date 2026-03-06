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
  const [showDetails, setShowDetails] = useState(false); // ← STATE BARU UNTUK TOGGLE
  const [ovoPopupOpen, setOvoPopupOpen] = useState(false);

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

  const openOvoPopup  = (e) => { e.preventDefault(); setOvoPopupOpen(true); };
  const closeOvoPopup = () => setOvoPopupOpen(false);

  const getOVOConfirmUrl = (url) => {
    if (!url) return url;
    try {
      const m = url.match(/[?&]ref=([^&]+)/);
      if (m) return `https://passport.duitku.com/topup/v2/TopUpOVOPayment.aspx?reference=${m[1]}`;
    } catch (e) {}
    return url;
  };

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
      // VA aktif: BR M2 NC I1 BV B1 DM BT
      'BR': 'BRI Virtual Account',
      'M2': 'Mandiri Virtual Account',
      'NC': 'Bank Neo Commerce (BNC) Virtual Account',
      'I1': 'BNI Virtual Account',
      'BV': 'BSI Virtual Account',
      'B1': 'CIMB Niaga Virtual Account',
      'DM': 'Danamon Virtual Account',
      'BT': 'Permata Bank Virtual Account',
      'SA': 'ShopeePay',
      'OV': 'OVO',
      'SQ': 'QRIS (Nusapay)',
      // legacy keys
      'va_bri':     'BRI Virtual Account',
      'va_mandiri': 'Mandiri Virtual Account',
      'va_bni':     'BNI Virtual Account',
      'va_bnc':     'Bank Neo Commerce (BNC) Virtual Account',
      'va_bsi':     'BSI Virtual Account',
      'va_cimb':    'CIMB Niaga Virtual Account',
      'va_danamon': 'Danamon Virtual Account',
      'va_permata': 'Permata Bank Virtual Account',
    };
    return names[method] || method;
  };

  const getVABankName = (method) => {
    const names = {
      'BR': 'BRI',
      'M2': 'Mandiri',
      'NC': 'BNC',
      'I1': 'BNI',
      'BV': 'BSI',
      'B1': 'CIMB Niaga',
      'DM': 'Danamon',
      'BT': 'Permata',
      'va_bri':     'BRI',
      'va_mandiri': 'Mandiri',
      'va_bni':     'BNI',
      'va_bnc':     'BNC',
      'va_bsi':     'BSI',
      'va_cimb':    'CIMB Niaga',
      'va_danamon': 'Danamon',
      'va_permata': 'Permata',
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
  const isQRIS = paymentData?.payment?.method === 'SQ' || (paymentData?.payment?.qrString && !paymentData?.payment?.vaNumber);
  const isVA = paymentData?.payment?.vaNumber && !isQRIS;
  const isEwallet = ['OV', 'SA'].includes(paymentData?.payment?.method);
  const ewalletPaymentUrl = paymentData?.payment?.method === 'OV'
    ? getOVOConfirmUrl(paymentData?.payment?.url)
    : paymentData?.payment?.url;

  return (
    <>
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
            
            {/* AMOUNT DISPLAY WITH COLLAPSIBLE ORDER SUMMARY */}
            <div className="amount-display-collapsible">
              <div className="amount-header">
                <span className="amount-label">Jumlah yang harus dibayar</span>
                <span className="amount-value-large">
                  {formatRupiah(paymentData.total)}
                </span>
              </div>
              
              <button 
                className={`toggle-details-btn ${showDetails ? 'active' : ''}`}
                onClick={() => setShowDetails(!showDetails)}
              >
                <span>{showDetails ? '▼' : '▶'} Lihat Detail Pesanan</span>
              </button>

              {/* COLLAPSIBLE DETAIL PESANAN */}
              {showDetails && (
                <div className="order-details-collapse">
                  <div className="detail-row">
                    <span className="detail-label">Produk</span>
                    <span className="detail-value">{paymentData.productName}</span>
                  </div>
                  {paymentData.gameUserId && (
                    <div className="detail-row">
                      <span className="detail-label">Game ID</span>
                      <span className="detail-value">
                        {paymentData.gameUserId}
                        {paymentData.gameUserTag ? `#${paymentData.gameUserTag}` : ''}
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{paymentData.customer_email}</span>
                  </div>
                  <div className="detail-divider"></div>
                  <div className="detail-row">
                    <span className="detail-label">Harga Produk</span>
                    <span className="detail-value">{formatRupiah(paymentData.amount)}</span>
                  </div>
                  
                  {paymentData.voucherCode && paymentData.voucherDiscount > 0 && (
                    <div className="detail-row voucher">
                      <span className="detail-label">Diskon Voucher ({paymentData.voucherCode})</span>
                      <span className="detail-value discount">- {formatRupiah(paymentData.voucherDiscount)}</span>
                    </div>
                  )}
                  
                  <div className="detail-row">
                    <span className="detail-label">Biaya Admin</span>
                    <span className="detail-value">{formatRupiah(paymentData.paymentFee)}</span>
                  </div>

                  {/* Note biaya bank Mandiri — info saja, tidak masuk total */}
                  {paymentData.payment?.method === 'M2' && (() => {
                    const amt = parseFloat(paymentData.amount || 0) - parseFloat(paymentData.voucherDiscount || 0);
                    const bankFee = amt >= 1000000 ? 'Rp 5.000' : amt >= 500000 ? 'Rp 3.000' : 'Rp 2.500';
                    return (
                      <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginTop: '4px',
                      }}>
                        <p style={{ fontSize: '12px', color: '#92400e', fontWeight: '600', margin: '0 0 3px' }}>
                          ⚠️ Biaya Bank Mandiri (ditagih langsung oleh bank)
                        </p>
                        <p style={{ fontSize: '12px', color: '#78350f', margin: 0 }}>
                          {bankFee} — tidak termasuk dalam total di atas
                        </p>
                      </div>
                    );
                  })()}

                  <div className="detail-divider"></div>
                  <div className="detail-row total-row">
                    <span className="detail-label">Total</span>
                    <span className="detail-value total">{formatRupiah(paymentData.total)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Virtual Account */}
            {isVA && (
              <div className="payment-section va-section">
                <h2>Nomor Virtual Account {getVABankName(paymentData.payment.method)}</h2>
                <div className="va-number-container">
                  <div className="va-number">{paymentData.payment.vaNumber}</div>
                  <button 
                    className={`btn-copy ${copied ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(paymentData.payment.vaNumber)}
                  >
                    {copied ? '✓ Tersalin' : 'Salin'}
                  </button>
                </div>

                <div className="payment-instructions">
                  <h3>🏦 Cara Pembayaran {getVABankName(paymentData.payment.method)} Virtual Account:</h3>
                  
                  <div className="instruction-section">
                    <strong>📱 Via Mobile Banking:</strong>
                    <ol>
                      <li>Buka aplikasi {getVABankName(paymentData.payment.method)} Mobile</li>
                      <li>Pilih menu <strong>"Transfer"</strong> atau <strong>"Pembayaran"</strong></li>
                      <li>Pilih <strong>"Virtual Account"</strong> atau <strong>"VA {getVABankName(paymentData.payment.method)}"</strong></li>
                      <li>Masukkan nomor VA: <strong>{paymentData.payment.vaNumber}</strong></li>
                      <li>Periksa detail pembayaran ({formatRupiah(paymentData.total)})</li>
                      <li>Konfirmasi dengan PIN/password</li>
                      <li>Simpan bukti transfer</li>
                    </ol>
                  </div>
                  
                  <div className="instruction-section instruction-divider">
                    <strong>🏧 Via ATM {getVABankName(paymentData.payment.method)}:</strong>
                    <ol>
                      <li>Masukkan kartu ATM dan PIN</li>
                      <li>Pilih menu <strong>"Transaksi Lainnya"</strong></li>
                      <li>Pilih <strong>"Transfer"</strong></li>
                      <li>Pilih <strong>"Ke Rek {getVABankName(paymentData.payment.method)} Virtual Account"</strong></li>
                      <li>Masukkan nomor VA: <strong>{paymentData.payment.vaNumber}</strong></li>
                      <li>Masukkan nominal: <strong>{formatRupiah(paymentData.total)}</strong></li>
                      <li>Konfirmasi dan selesaikan transaksi</li>
                      <li>Simpan struk sebagai bukti</li>
                    </ol>
                  </div>
                  
                  <div className="instruction-section instruction-divider">
                    <strong>💻 Via Internet Banking:</strong>
                    <ol>
                      <li>Login ke {getVABankName(paymentData.payment.method)} Internet Banking</li>
                      <li>Pilih menu <strong>"Transfer"</strong></li>
                      <li>Pilih <strong>"Transfer ke {getVABankName(paymentData.payment.method)} Virtual Account"</strong></li>
                      <li>Masukkan nomor VA: <strong>{paymentData.payment.vaNumber}</strong></li>
                      <li>Nominal akan terisi otomatis</li>
                      <li>Konfirmasi transaksi</li>
                      <li>Download bukti transfer</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* QRIS */}
            {isQRIS && (
              <div className="payment-section qris-section">
                <h2>Pembayaran QRIS</h2>
                
                {qrCodeDataUrl ? (
                  <div className="qris-container">
                    <p className="qris-info">Scan QR Code di bawah dengan aplikasi e-wallet Anda</p>
                    <img src={qrCodeDataUrl} alt="QRIS Code" className="qr-code" />
                    <div className="qr-note">
                      <strong>💡 Tip:</strong> Gunakan aplikasi GoPay, OVO, DANA, ShopeePay, atau mobile banking yang support QRIS
                    </div>
                  </div>
                ) : (
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

                <div className="payment-instructions">
                  <h3>📱 Cara Pembayaran QRIS:</h3>
                  <ol>
                    <li>Buka aplikasi e-wallet atau mobile banking favorit Anda (GoPay, OVO, Livin', BCA Mobile, dll)</li>
                    <li>Pilih menu <strong>"Scan QR"</strong> atau <strong>"Bayar"</strong></li>
                    <li>Scan QR Code yang tertera di atas</li>
                    <li>Periksa detail pembayaran</li>
                    <li>Konfirmasi pembayaran dengan PIN Anda</li>
                    <li>Simpan bukti pembayaran</li>
                  </ol>
                  <div className="note-box">
                    <strong>💡 Tips:</strong> Jangan tutup halaman ini. Pembayaran akan otomatis terverifikasi setelah Anda scan QR.
                  </div>
                </div>
              </div>
            )}

            {/* E-Wallet */}
            {isEwallet && ewalletPaymentUrl && (
              <div className="payment-section ewallet-section">
                <h2>Pembayaran {getPaymentMethodName(paymentData.payment.method)}</h2>
                <p className="ewallet-info">
                  {paymentData.payment.method === 'OV'
                    ? 'Klik tombol di bawah — popup konfirmasi OVO akan muncul.'
                    : 'Klik tombol di bawah untuk melanjutkan pembayaran.'}
                </p>
                {paymentData.payment.method === 'OV' ? (
                  <button className="btn-open-payment btn-ovo" onClick={openOvoPopup}>
                    💜 Bayar dengan OVO
                  </button>
                ) : (
                  <a
                    href={ewalletPaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-open-payment"
                  >
                    🧡 Bayar dengan ShopeePay
                  </a>
                )}
                
                <div className="payment-instructions">
                  <h3>📱 Cara Pembayaran {getPaymentMethodName(paymentData.payment.method)}:</h3>
                  {paymentData.payment.method === 'OV' ? (
                    <ol>
                      <li>Klik tombol <strong>"Bayar dengan OVO"</strong> di atas</li>
                      <li>Tab baru terbuka — nomor HP sudah terisi otomatis, langsung klik <strong>PAY NOW</strong></li>
                      <li>Notifikasi pembayaran muncul di aplikasi OVO kamu</li>
                      <li>Pilih: <strong>OVO Cash</strong>, <strong>OVO Points</strong>, atau <strong>Split</strong></li>
                      <li>Periksa detail ({formatRupiah(paymentData.total)}) lalu klik <strong>"Bayar"</strong></li>
                      <li>Selesaikan dalam <strong>60 detik</strong> setelah notifikasi muncul</li>
                    </ol>
                  ) : (
                    <ol>
                      <li>Klik tombol <strong>"Bayar dengan ShopeePay"</strong> di atas</li>
                      <li>Anda akan diarahkan ke aplikasi ShopeePay</li>
                      <li>Login ke akun Anda</li>
                      <li>Periksa detail pembayaran ({formatRupiah(paymentData.total)})</li>
                      <li>Konfirmasi pembayaran dengan PIN</li>
                      <li>Tunggu notifikasi pembayaran berhasil</li>
                    </ol>
                  )}
                  <div className="note-box">
                    <strong>💡 Tips:</strong> Jangan tutup halaman ini. Kembali ke sini setelah pembayaran selesai.
                  </div>
                </div>
              </div>
            )}
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

    {/* OVO Payment Popup */}
    {ovoPopupOpen && (
      <div className="ovo-popup-overlay" onClick={closeOvoPopup}>
        <div className="ovo-popup-container" onClick={e => e.stopPropagation()}>
          <div className="ovo-popup-header">
            <div className="ovo-popup-title">
              <span className="ovo-popup-logo">💜</span>
              <span>Pembayaran OVO</span>
            </div>
            <button className="ovo-popup-close" onClick={closeOvoPopup}>✕</button>
          </div>
          <div className="ovo-popup-body-info">
            <div className="ovo-popup-steps">
              <div className="ovo-step">
                <span className="ovo-step-num">1</span>
                <span>Halaman konfirmasi OVO akan terbuka di tab baru</span>
              </div>
              <div className="ovo-step">
                <span className="ovo-step-num">2</span>
                <span>Nomor HP sudah terisi otomatis — pastikan sesuai, lalu klik <strong>PAY NOW</strong></span>
              </div>
              <div className="ovo-step">
                <span className="ovo-step-num">3</span>
                <span>Notifikasi muncul di app OVO — selesaikan dalam <strong>30 detik</strong></span>
              </div>
              <div className="ovo-step">
                <span className="ovo-step-num">4</span>
                <span>Kembali ke halaman ini, klik <strong>Cek Status Pembayaran</strong></span>
              </div>
            </div>
          </div>
          <div className="ovo-popup-footer">
            <button className="ovo-btn-pay" onClick={() => {
              window.open(ewalletPaymentUrl, '_blank');
              closeOvoPopup();
            }}>
              💜 Buka Halaman Pembayaran OVO
            </button>
            <button className="ovo-popup-cancel" onClick={closeOvoPopup}>
              Batal
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default PaymentPage;