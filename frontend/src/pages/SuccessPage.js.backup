import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './SuccessPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

function SuccessPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [orderNumber]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/orders/${orderNumber}`);
      const data = await response.json();

      if (data.success) {
        setOrderData(data.order);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="success-page">
        <div className="container">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="container">
        <div className="success-container">
          
          {/* Success Icon */}
          <div className="success-icon">
            <div className="checkmark-circle">
              <div className="checkmark"></div>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="success-title">Pembayaran Berhasil! 🎉</h1>
          <p className="success-subtitle">
            Pesanan Anda sedang diproses dan akan segera dikirim
          </p>

          {/* Order Details */}
          {orderData && (
            <div className="order-details-card">
              <h2>Detail Pesanan</h2>
              
              <div className="detail-row">
                <span className="detail-label">Nomor Pesanan</span>
                <span className="detail-value order-number">{orderData.order_number}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Produk</span>
                <span className="detail-value">{orderData.product_name}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Game ID</span>
                <span className="detail-value">
                  {orderData.game_user_id}
                  {orderData.game_zone_id && `#${orderData.game_zone_id}`}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Email</span>
                <span className="detail-value">{orderData.customer_email}</span>
              </div>

              <div className="detail-divider"></div>

              <div className="detail-row total">
                <span className="detail-label">Total Pembayaran</span>
                <span className="detail-value">
                  Rp {parseFloat(orderData.total_amount).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value status-badge success">
                  ✓ Pembayaran Berhasil
                </span>
              </div>

              {orderData.paid_at && (
                <div className="detail-row">
                  <span className="detail-label">Dibayar pada</span>
                  <span className="detail-value">
                    {new Date(orderData.paid_at).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Next Steps */}
          <div className="next-steps">
            <h3>Langkah Selanjutnya</h3>
            <div className="steps-list">
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Pesanan Diproses</h4>
                  <p>Kami sedang memproses pesanan Anda</p>
                </div>
              </div>
              
              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Top-up Otomatis</h4>
                  <p>Item akan dikirim ke akun game Anda dalam 1-5 menit</p>
                </div>
              </div>
              
              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Konfirmasi Email</h4>
                  <p>Cek email Anda untuk detail pesanan</p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="important-notes">
            <div className="note-item">
              <span className="note-icon">⏱️</span>
              <span>Proses pengiriman biasanya memakan waktu 1-5 menit</span>
            </div>
            <div className="note-item">
              <span className="note-icon">📧</span>
              <span>Cek inbox/spam untuk email konfirmasi</span>
            </div>
            <div className="note-item">
              <span className="note-icon">💬</span>
              <span>Hubungi customer service jika ada masalah</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              className="btn-primary"
              onClick={() => navigate('/')}
            >
              Kembali ke Beranda
            </button>
            <button 
              className="btn-secondary"
              onClick={() => navigate(`/order/${orderData?.game_slug || 'valorant'}`)}
            >
              Pesan Lagi
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SuccessPage;
