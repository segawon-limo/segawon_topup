import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useIdleTimeout from '../../hooks/useIdleTimeout';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import AdminPageHeader from '../../components/AdminPageHeader';
import './Admin.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';
const COLORS   = ['#667eea','#f56565','#48bb78','#ed8936','#4299e1','#9f7aea','#38b2ac','#fc8181'];

function AdminVisitors() {
  const navigate = useNavigate();
  useIdleTimeout();

  const [stats,      setStats]      = useState(null);
  const [log,        setLog]        = useState([]);
  const [logMeta,    setLogMeta]    = useState({ total: 0, total_pages: 1, page: 1 });
  const [loading,    setLoading]    = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [days,       setDays]       = useState(30);

  // Filters
  const [filterPath,   setFilterPath]   = useState('');
  const [filterDevice, setFilterDevice] = useState('');
  const [filterBrowser,setFilterBrowser]= useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [page,         setPage]         = useState(1);

  const token   = localStorage.getItem('admin_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/api/admin/visitors/stats?days=${days}`, { headers });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [days]);

  const loadLog = useCallback(async (p = 1) => {
    try {
      setLogLoading(true);
      const params = new URLSearchParams({
        page: p, limit: 50,
        ...(filterPath    && { path: filterPath }),
        ...(filterDevice  && { device_type: filterDevice }),
        ...(filterBrowser && { browser: filterBrowser }),
        ...(filterFrom    && { date_from: filterFrom }),
        ...(filterTo      && { date_to: filterTo }),
      });
      const res  = await fetch(`${API_URL}/api/admin/visitors/log?${params}`, { headers });
      const data = await res.json();
      if (data.success) {
        setLog(data.data.rows);
        setLogMeta({ total: data.data.total, total_pages: data.data.total_pages, page: p });
      }
    } catch (e) { console.error(e); }
    finally { setLogLoading(false); }
  }, [filterPath, filterDevice, filterBrowser, filterFrom, filterTo]);

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    loadStats();
  }, [days, loadStats, navigate, token]);

  useEffect(() => {
    loadLog(1);
    setPage(1);
  }, [loadLog]);

  const handlePageChange = (p) => {
    setPage(p);
    loadLog(p);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const deviceIcon = (d) => d === 'mobile' ? '📱' : d === 'tablet' ? '📟' : '🖥️';

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  };

  const shortReferrer = (ref) => {
    if (!ref) return <span style={{ color: '#aaa' }}>Direct</span>;
    try {
      const u = new URL(ref);
      return <span title={ref}>{u.hostname}</span>;
    } catch { return <span title={ref}>{ref.slice(0, 30)}</span>; }
  };

  if (loading) return <div className="admin-dashboard"><div className="loading">Loading...</div></div>;

  return (
    <div className="admin-dashboard">
      <AdminPageHeader title="Visitor Analytics" subtitle="Tracking pengunjung halaman produk">
        <button onClick={() => navigate('/admin/dashboard')} className="btn-secondary">📊 Dashboard</button>
        <button onClick={() => navigate('/admin/orders')}    className="btn-secondary">📋 Orders</button>
        <button onClick={() => navigate('/admin/catalog')}   className="btn-secondary">🗂️ Catalog</button>
        <button onClick={() => navigate('/admin/vouchers')}  className="btn-secondary">🎫 Vouchers</button>
        <button onClick={() => navigate('/admin/terminal')}  className="btn-secondary">⌨️ Server</button>
        <button onClick={() => navigate('/admin/feedback')}  className="btn-secondary">💬 Feedback</button>
        <button onClick={handleLogout} className="btn-danger">Logout</button>
      </AdminPageHeader>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, color: '#555' }}>Periode:</span>
        {[7, 14, 30, 90].map(d => (
          <button key={d}
            onClick={() => setDays(d)}
            className={days === d ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '4px 14px', fontSize: 13 }}
          >{d} hari</button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <h3>Total Views</h3>
          <div className="stat-value">{parseInt(stats?.summary?.total_views || 0).toLocaleString('id-ID')}</div>
          <div className="stat-label">{days} hari terakhir</div>
        </div>
        <div className="stat-card">
          <h3>Unique Visitors</h3>
          <div className="stat-value">{parseInt(stats?.summary?.unique_sessions || 0).toLocaleString('id-ID')}</div>
          <div className="stat-label">Sesi unik</div>
        </div>
        <div className="stat-card">
          <h3>Views Hari Ini</h3>
          <div className="stat-value">{parseInt(stats?.summary?.views_today || 0).toLocaleString('id-ID')}</div>
          <div className="stat-label">24 jam terakhir</div>
        </div>
        <div className="stat-card">
          <h3>Views 7 Hari</h3>
          <div className="stat-value">{parseInt(stats?.summary?.views_7days || 0).toLocaleString('id-ID')}</div>
          <div className="stat-label">7 hari terakhir</div>
        </div>
      </div>

      {/* Charts Row 1: Daily trend + By Path */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="chart-card">
          <h3>Trend Harian</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats?.daily_trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total_views"     stroke="#667eea" name="Views" dot={false} />
              <Line type="monotone" dataKey="unique_sessions" stroke="#48bb78" name="Unique" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Views per Halaman</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats?.by_path || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="page_title" width={110} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total_views"     fill="#667eea" name="Views" />
              <Bar dataKey="unique_sessions" fill="#48bb78" name="Unique" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Device + Browser + OS */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="chart-card">
          <h3>Device Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats?.by_device || []} dataKey="total" nameKey="device_type"
                   cx="50%" cy="45%" outerRadius={75}
                   label={({ device_type, percent }) => `${device_type} ${(percent*100).toFixed(0)}%`}>
                {(stats?.by_device || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Browser</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.by_browser || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="browser" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#667eea" name="Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Operating System</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.by_os || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="os" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#48bb78" name="Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Visitor Log ────────────────────────────────────────────────────── */}
      <div className="chart-card" style={{ marginTop: 24 }}>
        <h3>Log Visitor Detail</h3>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <input placeholder="Filter path (contoh: valorant)"
            value={filterPath} onChange={e => setFilterPath(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, width: 180 }} />
          <select value={filterDevice} onChange={e => setFilterDevice(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
            <option value="">Semua Device</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
            <option value="desktop">Desktop</option>
          </select>
          <select value={filterBrowser} onChange={e => setFilterBrowser(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
            <option value="">Semua Browser</option>
            {['Chrome','Firefox','Safari','Edge','Opera','Samsung','UC Browser','Other'].map(b =>
              <option key={b} value={b}>{b}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
          <span style={{ alignSelf: 'center', color: '#888' }}>s/d</span>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
          <button className="btn-secondary" style={{ fontSize: 13 }}
            onClick={() => { setFilterPath(''); setFilterDevice(''); setFilterBrowser(''); setFilterFrom(''); setFilterTo(''); }}>
            Reset
          </button>
        </div>

        {/* Table */}
        {logLoading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#888' }}>Memuat...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f7f8fc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={th}>Waktu</th>
                    <th style={th}>Halaman</th>
                    <th style={th}>Device</th>
                    <th style={th}>Browser</th>
                    <th style={th}>OS</th>
                    <th style={th}>Referrer</th>
                    <th style={th}>Session</th>
                  </tr>
                </thead>
                <tbody>
                  {log.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#aaa' }}>Belum ada data</td></tr>
                  ) : log.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={td}>{formatDate(row.created_at)}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 600, color: '#667eea' }}>{row.page_title || '—'}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{row.path}</div>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>{deviceIcon(row.device_type)} {row.device_type}</td>
                      <td style={td}>{row.browser}</td>
                      <td style={td}>{row.os}</td>
                      <td style={td}>{shortReferrer(row.referrer)}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#999' }}>
                        {row.session_id?.slice(0, 8)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>
                Total: {logMeta.total.toLocaleString('id-ID')} records
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}
                  disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>← Prev</button>
                <span style={{ alignSelf: 'center', fontSize: 13 }}>
                  {page} / {logMeta.total_pages}
                </span>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}
                  disabled={page >= logMeta.total_pages} onClick={() => handlePageChange(page + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const th = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 12, whiteSpace: 'nowrap' };
const td = { padding: '9px 12px', verticalAlign: 'top' };

export default AdminVisitors;