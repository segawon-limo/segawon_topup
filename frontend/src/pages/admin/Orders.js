import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

function AdminOrders() {
  const navigate = useNavigate();
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [retrying,   setRetrying]   = useState(null); // order id yang sedang diretry
  const [toast,      setToast]      = useState(null);
  const [filters,    setFilters]    = useState({ status: '', search: '', page: 1, limit: 20 });
  const [pagination, setPagination] = useState({});

  const token      = localStorage.getItem('admin_token');
  const authHeader = { Authorization: `Bearer ${token}` };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });
      const res  = await fetch(`${API_URL}/api/admin/orders?${params}`, { headers: authHeader });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Load orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (order) => {
    if (!window.confirm(`Retry topup untuk order ${order.order_number}?\nProduk: ${order.product_name}\nUser ID: ${order.game_user_id}`)) return;
    setRetrying(order.id);
    try {
      const res  = await fetch(`${API_URL}/api/admin/orders/retry`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [order.id] }),
      });
      const data = await res.json();
      if (data.success && data.results.success.length > 0) {
        showToast(`✅ Retry berhasil! SN: ${data.results.success[0].sn}`, 'success');
        loadOrders();
      } else {
        const reason = data.results?.failed?.[0]?.reason || 'Unknown error';
        showToast(`❌ Retry gagal: ${reason}`, 'error');
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setRetrying(null);
    }
  };

  const formatRupiah = (n) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(n || 0);

  const formatDate = (d) => new Date(d).toLocaleString('id-ID');

  const STATUS_CONFIG = {
    completed:     { label: 'Completed',     cls: 'badge-success'  },
    success:       { label: 'Success',       cls: 'badge-success'  },
    pending:       { label: 'Pending',       cls: 'badge-pending'  },
    failed:        { label: 'Failed',        cls: 'badge-failed'   },
    pending_retry: { label: 'Pending Retry', cls: 'badge-warning'  },
    cancelled:     { label: 'Cancelled',     cls: 'badge-default'  },
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    return STATUS_CONFIG[s] || { label: status, cls: 'badge-default' };
  };

  const isRetryable = (order) => {
    const s = (order.order_status || '').toLowerCase();
    return s === 'failed' || s === 'pending_retry';
  };

  return (
    <div className="admin-dashboard">
      {/* Toast */}
      {toast && (
        <div className={`toast-notif ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}

      <div className="dashboard-header">
        <div className="header-left">
          <h1>📋 Orders Management</h1>
        </div>
        <div className="header-right">
          <button onClick={() => navigate('/admin/dashboard')} className="btn-secondary">← Dashboard</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Cari nomor order atau email..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          className="search-input"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="pending_retry">Pending Retry</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#a0aec0', padding: 32 }}>
                    Tidak ada order ditemukan
                  </td></tr>
                )}
                {orders.map(order => {
                  const badge = getStatusBadge(order.order_status);
                  const canRetry = isRetryable(order);
                  return (
                    <tr key={order.id}>
                      <td><strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{order.order_number}</strong></td>
                      <td>
                        <strong>{order.game_name}</strong><br />
                        <small style={{ color: '#718096' }}>{order.product_name}</small>
                      </td>
                      <td>
                        {order.customer_name}<br />
                        <small style={{ color: '#718096' }}>{order.customer_email}</small>
                      </td>
                      <td><strong>{formatRupiah(order.amount)}</strong></td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{order.payment_method}</span></td>
                      <td>
                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td><small>{formatDate(order.created_at)}</small></td>
                      <td>
                        {canRetry && (
                          <button
                            className="btn-action btn-edit"
                            onClick={() => handleRetry(order)}
                            disabled={retrying === order.id}
                            title="Retry topup ke Digiflazz"
                            style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
                          >
                            {retrying === order.id ? '⏳...' : '🔄 Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page === 1}
              className="btn-pagination"
            >
              ← Prev
            </button>
            <span className="pagination-info">
              Hal {pagination.page} / {pagination.totalPages} &nbsp;·&nbsp; {pagination.total} order
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page >= pagination.totalPages}
              className="btn-pagination"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminOrders;