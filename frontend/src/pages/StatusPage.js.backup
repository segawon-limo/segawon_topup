import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaCheckCircle, FaSpinner, FaTimesCircle, FaClock } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL;

function StatusPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderStatus();
    const interval = setInterval(fetchOrderStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [orderNumber]);

  const fetchOrderStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/orders/${orderNumber}`);
      setOrder(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order status:', error);
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <FaCheckCircle className="text-5xl text-green-500" />;
      case 'processing':
        return <FaSpinner className="text-5xl text-blue-500 animate-spin" />;
      case 'pending':
        return <FaClock className="text-5xl text-yellow-500" />;
      case 'failed':
        return <FaTimesCircle className="text-5xl text-red-500" />;
      default:
        return <FaClock className="text-5xl text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success':
        return 'Topup Berhasil!';
      case 'processing':
        return 'Sedang Diproses...';
      case 'pending':
        return 'Menunggu Pembayaran';
      case 'failed':
        return 'Topup Gagal';
      default:
        return 'Status Tidak Diketahui';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
        <p className="mt-4 text-gray-600">Memuat status order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Order tidak ditemukan</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          Kembali ke Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Status Card */}
          <div className={`bg-white rounded-lg shadow-lg p-8 mb-6 border-2 ${getStatusColor(order.order_status)}`}>
            <div className="text-center mb-6">
              {getStatusIcon(order.order_status)}
              <h1 className="text-3xl font-bold mt-4 text-gray-800">
                {getStatusText(order.order_status)}
              </h1>
              <p className="text-gray-600 mt-2">
                Order #{order.order_number}
              </p>
            </div>

            {order.order_status === 'pending' && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  Silakan selesaikan pembayaran untuk melanjutkan proses topup
                </p>
                {order.payment_url && (
                  <a
                    href={order.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-3 bg-yellow-500 text-white text-center py-2 rounded-lg font-semibold hover:bg-yellow-600 transition"
                  >
                    Bayar Sekarang
                  </a>
                )}
              </div>
            )}

            {order.order_status === 'processing' && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Pembayaran berhasil! Sedang memproses topup ke akun game kamu...
                </p>
              </div>
            )}

            {order.order_status === 'success' && (
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  Topup berhasil! Silakan cek akun game kamu.
                </p>
              </div>
            )}

            {order.order_status === 'failed' && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  Maaf, terjadi kesalahan. Silakan hubungi customer service untuk bantuan.
                </p>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Detail Pesanan</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Game:</span>
                <span className="font-semibold">{order.game_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Produk:</span>
                <span className="font-semibold">{order.product_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Game User ID:</span>
                <span className="font-semibold">
                  {order.game_user_id}
                  {order.game_user_tag && `#${order.game_user_tag}`}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Harga:</span>
                <span className="font-semibold">
                  Rp {parseInt(order.amount).toLocaleString('id-ID')}
                </span>
              </div>
              {parseFloat(order.admin_fee) > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Biaya Admin:</span>
                  <span className="font-semibold">
                    Rp {parseInt(order.admin_fee).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-lg text-primary-600">
                  Rp {parseInt(order.total_amount).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Status Pembayaran:</span>
                <span className={`font-semibold ${
                  order.payment_status === 'success' ? 'text-green-600' :
                  order.payment_status === 'pending' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {order.payment_status === 'success' ? 'Lunas' :
                   order.payment_status === 'pending' ? 'Menunggu' : 'Gagal'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Kembali ke Home
            </button>
            {order.customer_email && (
              <button
                onClick={() => window.open(`https://wa.me/${process.env.REACT_APP_WHATSAPP}?text=Halo, saya ingin bertanya tentang order ${order.order_number}`, '_blank')}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Hubungi CS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatusPage;
