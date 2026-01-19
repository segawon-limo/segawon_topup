import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';

function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (orderId) {
      // Redirect ke status page setelah 3 detik
      const timer = setTimeout(() => {
        navigate(`/status/${orderId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [orderId, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Pembayaran Berhasil!
          </h1>
          <p className="text-gray-600 mb-6">
            Terima kasih! Pesanan kamu sedang diproses.
          </p>
          
          {orderId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Nomor Pesanan:</p>
              <p className="font-mono font-bold text-lg">{orderId}</p>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-6">
            Kamu akan diarahkan ke halaman status pesanan...
          </p>

          <button
            onClick={() => navigate(orderId ? `/status/${orderId}` : '/')}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Lihat Status Pesanan
          </button>
        </div>
      </div>
    </div>
  );
}

export default SuccessPage;
