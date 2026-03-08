import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';
import AdminPageHeader from '../../components/AdminPageHeader';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

const formatRupiah = (n) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(n || 0);

const formatDate = (d) => new Date(d).toLocaleString('id-ID', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});

const STATUS_CONFIG = {
  completed:     { label: 'Completed',     cls: 'badge-success',  icon: '✅' },
  success:       { label: 'Success',       cls: 'badge-success',  icon: '✅' },
  pending:       { label: 'Pending',       cls: 'badge-pending',  icon: '⏳' },
  failed:        { label: 'Failed',        cls: 'badge-failed',   icon: '❌' },
  pending_retry: { label: 'Pending Retry', cls: 'badge-warning',  icon: '🔄' },
  expired:       { label: 'Expired',       cls: 'badge-expired',  icon: '⏰' },
  cancelled:     { label: 'Cancelled',     cls: 'badge-default',  icon: '🚫' },
};
const PAY_CONFIG = {
  success: { label: 'Lunas',       cls: 'badge-success' },
  paid:    { label: 'Lunas',       cls: 'badge-success' },
  pending: { label: 'Belum Bayar', cls: 'badge-pending' },
  expired: { label: 'Kadaluarsa', cls: 'badge-expired' },
};
const VA_NAMES = {
  BR:'BRI', M2:'Mandiri', NC:'BNC', I1:'BNI', BV:'BSI', B1:'CIMB', DM:'Danamon', BT:'Permata',
  va_bri:'BRI', va_mandiri:'Mandiri',
};
const getStatus    = (s) => STATUS_CONFIG[(s||'').toLowerCase()] || { label: s, cls: 'badge-default', icon: '•' };
const getPayStatus = (s) => PAY_CONFIG[(s||'').toLowerCase()]    || { label: s, cls: 'badge-default' };

// ── Confirm Retry Modal ───────────────────────────────────────
function ConfirmModal({ order, onConfirm, onCancel }) {
  const hasUserId = !!order.game_user_id;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:48, marginBottom:6 }}>🔄</div>
          <h2 style={{ margin:0, fontSize:20 }}>Konfirmasi Retry</h2>
          <p style={{ color:'#718096', fontSize:13, margin:'6px 0 0' }}>
            Kirim ulang request topup ke Digiflazz
          </p>
        </div>

        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
          {[
            ['Order',    order.order_number, true],
            ['Produk',   order.product_name, false],
            ['Customer', order.customer_name, false],
            ['User ID',  order.game_user_id,  false],
          ].map(([label, value, mono]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid #edf2f7' }}>
              <span style={{ color:'#718096', fontSize:13 }}>{label}</span>
              <span style={{ fontFamily: mono ? 'monospace':'inherit', fontSize:13, fontWeight:600, color: (!value && label==='User ID') ? '#e53e3e':'#2d3748' }}>
                {value || (label === 'User ID' ? '⚠ Kosong' : '—')}
              </span>
            </div>
          ))}
        </div>

        {!hasUserId && (
          <div style={{ background:'#fff5f5', border:'1px solid #fed7d7', borderRadius:8, padding:'10px 14px', marginBottom:16, color:'#c53030', fontSize:13 }}>
            ⚠️ User ID kosong — topup kemungkinan akan gagal lagi.
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel}  className="btn-secondary" style={{ flex:1, padding:'11px 0' }}>Batal</button>
          <button onClick={onConfirm} className="btn-primary"   style={{ flex:1, padding:'11px 0' }}>🔄 Ya, Retry</button>
        </div>
      </div>
    </div>
  );
}

// ── Order Detail Modal ────────────────────────────────────────
function OrderDetailModal({ order, onClose, onRetry, retrying }) {
  const status    = getStatus(order.order_status);
  const payStatus = getPayStatus(order.payment_status);
  const canRetry  = ['failed','pending_retry'].includes((order.order_status||'').toLowerCase());

  const Row = ({ label, value, mono, highlight, green, red }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'9px 0', borderBottom:'1px solid #f0f4f8' }}>
      <span style={{ color:'#a0aec0', fontSize:12, flexShrink:0, marginRight:12, paddingTop:1 }}>{label}</span>
      <span style={{
        fontFamily: mono ? 'monospace':'inherit',
        fontSize: mono ? 12:13,
        fontWeight: highlight ? 700:400,
        color: green ? '#22543d' : red ? '#c53030' : highlight ? '#2d3748':'#4a5568',
        textAlign:'right', wordBreak:'break-all'
      }}>{value || '—'}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#cbd5e0', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2, paddingBottom:6, borderBottom:'2px solid #edf2f7' }}>
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth:520, maxHeight:'90vh', overflowY:'auto', padding:24 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, marginBottom:4 }}>Detail Order</h2>
            <code style={{ fontSize:13, color:'#667eea', background:'#f0f4ff', padding:'2px 8px', borderRadius:6 }}>
              {order.order_number}
            </code>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#a0aec0', lineHeight:1, marginTop:-4 }}>×</button>
        </div>

        {/* Status pills */}
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          {[
            { label:'ORDER', content: <span className={`badge ${status.cls}`}>{status.icon} {status.label}</span> },
            { label:'PAYMENT', content: <span className={`badge ${payStatus.cls}`}>{payStatus.label}</span> },
            { label:'TOTAL', content: <strong style={{ fontSize:15, color:'#2d3748' }}>{formatRupiah(parseFloat(order.amount) - parseFloat(order.voucher_discount || 0) + parseFloat(order.payment_fee || 0))}</strong> },
          ].map(({ label, content }) => (
            <div key={label} style={{ flex:1, background:'#f8fafc', border:'1px solid #edf2f7', borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#a0aec0', fontWeight:700, letterSpacing:'0.08em', marginBottom:6 }}>{label}</div>
              {content}
            </div>
          ))}
        </div>

        <Section title="Produk">
          <Row label="Game"         value={order.game_name} />
          <Row label="Produk"       value={order.product_name} highlight />
          <Row label="SKU"          value={order.sku} mono />
          <Row label="Harga Modal"  value={formatRupiah(order.base_price)} />
          <Row label="Harga Jual"   value={formatRupiah(order.amount)} />
          {order.voucher_discount > 0 && <Row label={`Diskon (${order.voucher_code})`} value={`- ${formatRupiah(order.voucher_discount)}`} green />}
          <Row label="Biaya Layanan" value={formatRupiah(order.payment_fee)} />
          <Row label="Total Bayar"   value={formatRupiah(parseFloat(order.amount) - parseFloat(order.voucher_discount || 0) + parseFloat(order.payment_fee || 0))} highlight />
        </Section>

        <Section title="Customer">
          <Row label="Nama"  value={order.customer_name} highlight />
          <Row label="Email" value={order.customer_email} mono />
          <Row label="HP"    value={order.customer_phone} />
        </Section>

        <Section title="Game Account">
          <Row label="User ID"    value={order.game_user_id}  highlight red={!order.game_user_id} />
          <Row label="Zone / Tag" value={order.game_user_tag} />
        </Section>

        <Section title="Pembayaran">
          <Row label="Metode"  value={VA_NAMES[order.payment_method] || order.payment_method} />
          <Row label="Gateway" value={order.payment_gateway} />
        </Section>

        {order.provider_serial_number && (
          <Section title="Hasil Topup">
            <Row label="SN / Serial Number" value={order.provider_serial_number} mono highlight green />
          </Section>
        )}

        <Section title="Waktu">
          <Row label="Order dibuat"    value={formatDate(order.created_at)} />
          <Row label="Terakhir update" value={formatDate(order.updated_at)} />
        </Section>

        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex:1, padding:'11px 0' }}>Tutup</button>
          {canRetry && (
            <button onClick={() => onRetry(order)} className="btn-primary" disabled={retrying === order.id} style={{ flex:1, padding:'11px 0' }}>
              {retrying === order.id ? '⏳ Memproses...' : '🔄 Retry Topup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
function AdminOrders() {
  const navigate = useNavigate();
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [retrying,     setRetrying]     = useState(null);
  const [toast,        setToast]        = useState(null);
  const [detailOrder,  setDetailOrder]  = useState(null);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [filters,      setFilters]      = useState({ status:'', search:'', page:1, limit:20 });
  const [pagination,   setPagination]   = useState({});

  const token      = localStorage.getItem('admin_token');
  const authHeader = { Authorization: `Bearer ${token}` };

  const showToast = useCallback((message, type='success') => {
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
        page: filters.page, limit: filters.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });
      const res  = await fetch(`${API_URL}/api/admin/orders?${params}`, { headers: authHeader });
      const data = await res.json();
      if (data.success) { setOrders(data.data); setPagination(data.pagination); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const doRetry = async (order) => {
    setConfirmOrder(null);
    setDetailOrder(null);
    setRetrying(order.id);
    try {
      const res  = await fetch(`${API_URL}/api/admin/orders/retry`, {
        method:'POST',
        headers: { ...authHeader, 'Content-Type':'application/json' },
        body: JSON.stringify({ orderIds:[order.id] }),
      });
      const data = await res.json();
      if (data.success && data.results.success.length > 0) {
        showToast(`✅ Retry berhasil! SN: ${data.results.success[0].sn}`, 'success');
        loadOrders();
      } else {
        showToast(`❌ Retry gagal: ${data.results?.failed?.[0]?.reason || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally { setRetrying(null); }
  };

  const handleRetryClick = (order, e) => { e?.stopPropagation(); setConfirmOrder(order); };

  return (
    <div className="admin-dashboard">
      {toast && <div className={`toast-notif ${toast.type==='error'?'toast-error':'toast-success'}`}>{toast.message}</div>}
      {detailOrder  && <OrderDetailModal order={detailOrder}  onClose={() => setDetailOrder(null)}  onRetry={handleRetryClick} retrying={retrying} />}
      {confirmOrder && <ConfirmModal     order={confirmOrder} onConfirm={() => doRetry(confirmOrder)} onCancel={() => setConfirmOrder(null)} />}

      <AdminPageHeader title="Orders Management">
        <button onClick={() => navigate('/admin/dashboard')} className="btn-secondary">📊 Dashboard</button>
        <button onClick={() => navigate('/admin/catalog')}   className="btn-secondary">🗂️ Catalog</button>
        <button onClick={() => navigate('/admin/vouchers')}  className="btn-secondary">🎫 Vouchers</button>
        <button onClick={() => navigate('/admin/terminal')}  className="btn-secondary">⌨️ Server</button>
        <button onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); navigate('/admin/login'); }} className="btn-danger">Logout</button>
      </AdminPageHeader>

      <div className="filters-bar">
        <input type="text" placeholder="🔍 Cari nomor order atau email..." value={filters.search}
          onChange={(e) => setFilters({ ...filters, search:e.target.value, page:1 })} className="search-input" />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status:e.target.value, page:1 })} className="filter-select">
          <option value="">Semua Status</option>
          <option value="completed">✅ Completed</option>
          <option value="pending">⏳ Pending</option>
          <option value="failed">❌ Failed</option>
          <option value="pending_retry">🔄 Pending Retry</option>
          <option value="expired">⏰ Expired</option>
        </select>
      </div>

      {loading ? <div className="loading">Loading orders...</div> : (
        <>
          <div className="table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order Number</th><th>Product</th><th>Customer</th>
                  <th>Amount</th><th>Payment</th><th>Order Status</th>
                  <th>Pay Status</th><th>Date</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign:'center', color:'#a0aec0', padding:40 }}>Tidak ada order ditemukan</td></tr>
                )}
                {orders.map(order => {
                  const s = getStatus(order.order_status);
                  const p = getPayStatus(order.payment_status);
                  const canRetry = ['failed','pending_retry'].includes((order.order_status||'').toLowerCase());
                  return (
                    <tr key={order.id} onClick={() => setDetailOrder(order)}
                      style={{ cursor:'pointer' }} className="order-row-hover">
                      <td><strong style={{ fontFamily:'monospace', fontSize:12 }}>{order.order_number}</strong></td>
                      <td>
                        <strong style={{ fontSize:13 }}>{order.game_name}</strong><br />
                        <small style={{ color:'#718096' }}>{order.product_name}</small>
                      </td>
                      <td>
                        <span style={{ fontSize:13 }}>{order.customer_name}</span><br />
                        <small style={{ color:'#718096' }}>{order.customer_email}</small>
                      </td>
                      <td><strong>{formatRupiah(order.amount)}</strong></td>
                      <td>
                        <span style={{ fontFamily:'monospace', fontSize:12, background:'#f0f4f8', padding:'2px 8px', borderRadius:4 }}>
                          {VA_NAMES[order.payment_method] || order.payment_method}
                        </span>
                      </td>
                      <td><span className={`badge ${s.cls}`}>{s.icon} {s.label}</span></td>
                      <td><span className={`badge ${p.cls}`}>{p.label}</span></td>
                      <td><small style={{ color:'#718096' }}>{formatDate(order.created_at)}</small></td>
                      <td onClick={e => e.stopPropagation()}>
                        {canRetry && (
                          <button className="btn-action btn-edit" disabled={retrying===order.id}
                            onClick={(e) => handleRetryClick(order, e)}
                            style={{ fontSize:12, padding:'4px 10px', whiteSpace:'nowrap' }}>
                            {retrying===order.id ? '⏳':'🔄 Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button onClick={() => setFilters({ ...filters, page:filters.page-1 })} disabled={filters.page===1} className="btn-pagination">← Prev</button>
            <span className="pagination-info">Hal {pagination.page} / {pagination.totalPages} · {pagination.total} order</span>
            <button onClick={() => setFilters({ ...filters, page:filters.page+1 })} disabled={filters.page>=pagination.totalPages} className="btn-pagination">Next →</button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminOrders;