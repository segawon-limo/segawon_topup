import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadOrders();
  }, [filters, navigate]);

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`${API_URL}/api/admin/orders?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
        setPagination(data.pagination);
      }
      setLoading(false);
    } catch (error) {
      console.error('Load orders error:', error);
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('id-ID');
  };

  const getStatusBadge = (status) => {
    const badges = {
      'SUCCESS': 'badge-success',
      'PENDING': 'badge-pending',
      'FAILED': 'badge-failed',
      'PENDING_RETRY': 'badge-warning'
    };
    return badges[status] || 'badge-default';
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>📋 Orders Management</h1>
        </div>
        <div className="header-right">
          <button onClick={() => navigate('/admin/dashboard')} className="btn-secondary">
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search order number or email..."
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
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING_RETRY">Pending Retry</option>
        </select>
      </div>

      {/* Orders Table */}
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
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td><strong>{order.order_number}</strong></td>
                    <td>
                      {order.game_name}<br />
                      <small>{order.product_name}</small>
                    </td>
                    <td>
                      {order.customer_name}<br />
                      <small>{order.customer_email}</small>
                    </td>
                    <td><strong>{formatRupiah(order.amount)}</strong></td>
                    <td>{order.payment_method}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td><small>{formatDate(order.created_at)}</small></td>
                  </tr>
                ))}
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
              Previous
            </button>
            
            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total orders)
            </span>

            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page >= pagination.totalPages}
              className="btn-pagination"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminOrders;
