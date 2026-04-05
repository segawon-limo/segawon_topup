import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useIdleTimeout from '../../hooks/useIdleTimeout';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './Admin.css';
import AdminPageHeader from '../../components/AdminPageHeader';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

function AdminDashboard() {
  const navigate = useNavigate();
  useIdleTimeout();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [pendingRetry, setPendingRetry] = useState([]);
  const [visitorStats, setVisitorStats] = useState(null); // [ADDED]

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadDashboard();
  }, [navigate]);

  const loadDashboard = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Load overview
      const overviewRes = await fetch(`${API_URL}/api/admin/dashboard`, { headers });
      const overviewData = await overviewRes.json();
      
      if (overviewData.success) {
        setOverview(overviewData.data);
      }

      // Load daily stats (30 days)
      const dailyRes = await fetch(`${API_URL}/api/admin/stats/daily?days=30`, { headers });
      const dailyData = await dailyRes.json();
      if (dailyData.success) {
        setDailyStats(dailyData.data);
      }

      // Load top products
      const productsRes = await fetch(`${API_URL}/api/admin/stats/top-products`, { headers });
      const productsData = await productsRes.json();
      if (productsData.success) {
        setTopProducts(productsData.data.slice(0, 10));
      }

      // Load payment stats
      const paymentRes = await fetch(`${API_URL}/api/admin/stats/payment-methods`, { headers });
      const paymentData = await paymentRes.json();
      if (paymentData.success) {
        setPaymentStats(paymentData.data);
      }

      // Load pending retry orders
      const retryRes = await fetch(`${API_URL}/api/admin/orders?status=PENDING_RETRY&limit=10`, { headers });
      const retryData = await retryRes.json();
      if (retryData.success) {
        setPendingRetry(retryData.data);
      }

      // [ADDED] Load visitor stats (7 hari)
      const visitorRes  = await fetch(`${API_URL}/api/admin/visitors/stats?days=7`, { headers });
      const visitorData = await visitorRes.json();
      if (visitorData.success) setVisitorStats(visitorData.data);

      setLoading(false);
    } catch (error) {
      console.error('Load dashboard error:', error);
      if (error.message.includes('401')) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const handleRetryOrders = async () => {
    if (pendingRetry.length === 0) return;
    if (!window.confirm(`Retry ${pendingRetry.length} orders?`)) return;

    try {
      const token = localStorage.getItem('admin_token');
      const orderIds = pendingRetry.map(o => o.id);

      const response = await fetch(`${API_URL}/api/admin/orders/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderIds })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Success: ${data.results.success.length}, Failed: ${data.results.failed.length}`);
        loadDashboard(); // Reload
      }
    } catch (error) {
      alert('Retry failed: ' + error.message);
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  const COLORS = ['#667eea', '#f56565', '#48bb78', '#ed8936', '#4299e1', '#9f7aea', '#38b2ac', '#fc8181'];

  const METHOD_NAMES = {
    'SA': 'ShopeePay', 'SQ': 'QRIS', 'OV': 'OVO', 'shopeepay': 'ShopeePay (lama)',
    'va_bri': 'BRI VA', 'va_mandiri': 'Mandiri VA', 'va_bca': 'BCA VA',
    'va_bni': 'BNI VA', 'va_bsi': 'BSI VA', 'NC': 'BNC VA',
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <AdminPageHeader
        title="Admin Dashboard"
        subtitle={`Welcome back, ${JSON.parse(localStorage.getItem('admin_user') || '{}').full_name || 'Admin'}`}
      >
        <button onClick={() => navigate('/admin/orders')}   className="btn-secondary">📋 Orders</button>
        <button onClick={() => navigate('/admin/catalog')}  className="btn-secondary">🗂️ Catalog</button>
        <button onClick={() => navigate('/admin/vouchers')}  className="btn-secondary">🎫 Vouchers</button>
        <button onClick={() => navigate('/admin/visitors')} className="btn-secondary">👁️ Visitors</button>
        <button onClick={() => navigate('/admin/terminal')} className="btn-secondary">⌨️ Server</button>
        <button onClick={() => navigate('/admin/feedback')}  className="btn-secondary">💬 Feedback</button>
        <button onClick={handleLogout} className="btn-danger">Logout</button>
      </AdminPageHeader>

      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Today</h3>
          <div className="stat-value">{formatRupiah(overview?.overview?.today?.total_revenue)}</div>
          <div className="stat-label">{overview?.overview?.today?.total_orders || 0} orders</div>
          <div className="stat-profit">Profit: {formatRupiah(overview?.overview?.today?.total_profit)}</div>
        </div>

        <div className="stat-card">
          <h3>Yesterday</h3>
          <div className="stat-value">{formatRupiah(overview?.overview?.yesterday?.total_revenue)}</div>
          <div className="stat-label">{overview?.overview?.yesterday?.total_orders || 0} orders</div>
        </div>

        <div className="stat-card">
          <h3>This Month</h3>
          <div className="stat-value">{formatRupiah(overview?.overview?.this_month?.total_revenue)}</div>
          <div className="stat-label">{overview?.overview?.this_month?.total_orders || 0} orders</div>
          <div className="stat-profit">Profit: {formatRupiah(overview?.overview?.this_month?.total_profit)}</div>
        </div>

        <div className={`stat-card ${overview?.digiflazz?.status === 'CRITICAL' ? 'alert-critical' : overview?.digiflazz?.status === 'WARNING' ? 'alert-warning' : ''}`}>
          <h3>Digiflazz Saldo</h3>
          <div className="stat-value">{formatRupiah(overview?.digiflazz?.deposit)}</div>
          <div className="stat-label">Status: {overview?.digiflazz?.status || 'N/A'}</div>
        </div>

        {/* [ADDED] Visitor card */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/visitors')}>
          <h3>👁️ Visitors (7 Hari)</h3>
          <div className="stat-value">{parseInt(visitorStats?.summary?.views_7days || 0).toLocaleString('id-ID')}</div>
          <div className="stat-label">{parseInt(visitorStats?.summary?.unique_sessions || 0).toLocaleString('id-ID')} sesi unik</div>
          <div className="stat-profit" style={{ color: '#667eea' }}>Hari ini: {parseInt(visitorStats?.summary?.views_today || 0).toLocaleString('id-ID')} views</div>
        </div>
      </div>

      {/* Pending Retry Alert */}
      {pendingRetry.length > 0 && (
        <div className="alert-box">
          <div className="alert-content">
            <strong>⚠️ {pendingRetry.length} orders perlu retry!</strong>
            <p>Orders gagal karena saldo Digiflazz habis. Topup dulu, lalu klik Retry.</p>
          </div>
          <button onClick={handleRetryOrders} className="btn-primary">
            🔄 Retry All ({pendingRetry.length})
          </button>
        </div>
      )}

      {/* Charts */}
      <div className="charts-grid">
        {/* Daily Revenue Chart */}
        <div className="chart-card">
          <h3>Revenue & Profit (30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatRupiah(value)} />
              <Legend />
              <Line type="monotone" dataKey="total_revenue" stroke="#667eea" name="Revenue" />
              <Line type="monotone" dataKey="total_profit" stroke="#48bb78" name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Chart */}
        <div className="chart-card">
          <h3>Top 10 Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_orders" fill="#667eea" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Pie */}
        <div className="chart-card">
          <h3>Payment Methods</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentStats
                  .filter(d => parseInt(d.success_count) > 0)
                  .map(d => ({
                    name: METHOD_NAMES[d.payment_method] || d.payment_method,
                    value: parseInt(d.success_count),
                  }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={90}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {paymentStats.filter(d => parseInt(d.success_count) > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value + ' transaksi sukses']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;