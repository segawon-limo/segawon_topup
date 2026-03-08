import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';
import './Admin.css';
import './AdminFeedback.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

export default function AdminFeedback() {
  const navigate  = useNavigate();
  const token     = localStorage.getItem('admin_token');
  const headers   = { Authorization: `Bearer ${token}` };

  const [feedbacks,    setFeedbacks]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [lightbox,     setLightbox]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // id yang akan dihapus
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    loadFeedbacks();
  }, []); // eslint-disable-line

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/admin/feedbacks`, { headers });
      const data = await res.json();
      if (data.success) setFeedbacks(data.feedbacks);
    } catch (err) {
      console.error('loadFeedbacks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id) => setDeleteTarget(id);
  const cancelDelete  = () => setDeleteTarget(null);

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`${API_URL}/api/admin/feedbacks/${deleteTarget}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setFeedbacks(prev => prev.filter(f => f.id !== deleteTarget));
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('deleteFeedback error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
      day:    '2-digit',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  };

  const deviceIcon = (type) => {
    if (type === 'Mobile')  return '📱';
    if (type === 'Tablet')  return '📟';
    return '🖥️';
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">

      {/* Lightbox */}
      {lightbox && (
        <div className="af-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Feedback" onClick={e => e.stopPropagation()} />
          <button className="af-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="af-dialog-overlay">
          <div className="af-dialog">
            <div className="af-dialog-icon">🗑️</div>
            <h3>Hapus Feedback?</h3>
            <p>Feedback dan semua gambar terkait akan dihapus permanen dari server. Tindakan ini tidak bisa dibatalkan.</p>
            <div className="af-dialog-actions">
              <button className="af-btn-cancel" onClick={cancelDelete} disabled={deleting}>
                Batal
              </button>
              <button className="af-btn-delete" onClick={doDelete} disabled={deleting}>
                {deleting ? '⏳ Menghapus...' : '🗑️ Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminPageHeader title="Feedback" subtitle={`${feedbacks.length} pesan masuk`}>
        <button onClick={() => navigate('/admin/dashboard')} className="btn-secondary">📊 Dashboard</button>
        <button onClick={() => navigate('/admin/orders')}    className="btn-secondary">📋 Orders</button>
        <button onClick={() => navigate('/admin/catalog')}   className="btn-secondary">🎮 Catalog</button>
        <button onClick={() => navigate('/admin/vouchers')}  className="btn-secondary">🎟️ Vouchers</button>
        <button onClick={() => navigate('/admin/terminal')}  className="btn-secondary">⌨️ Server</button>
        <button onClick={handleLogout} className="btn-danger">Logout</button>
      </AdminPageHeader>

      <div className="af-container">
        {feedbacks.length === 0 ? (
          <div className="af-empty">
            <div className="af-empty-icon">💬</div>
            <div className="af-empty-title">Belum ada feedback</div>
            <div className="af-empty-sub">Feedback dari pengguna akan muncul di sini.</div>
          </div>
        ) : (
          <div className="af-list">
            {feedbacks.map(fb => {
              const images = fb.images || [];
              return (
                <div key={fb.id} className="af-card">
                  <div className="af-card-header">
                    <div className="af-meta">
                      <span className="af-meta-id">#{fb.id}</span>
                      <span className="af-meta-date">{formatDate(fb.created_at)}</span>
                      <span className="af-meta-device">
                        {deviceIcon(fb.device_type)} {fb.device_type}
                      </span>
                    </div>
                    <button
                      className="af-btn-del"
                      onClick={() => confirmDelete(fb.id)}
                      title="Hapus feedback"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="af-message">{fb.message}</div>

                  {images.length > 0 && (
                    <div className="af-images">
                      {images.map((img, i) => (
                        <img
                          key={i}
                          src={`${API_URL}${img.url}`}
                          alt={`feedback-${fb.id}-${i}`}
                          className="af-thumb"
                          onClick={() => setLightbox(`${API_URL}${img.url}`)}
                          title="Klik untuk perbesar"
                        />
                      ))}
                    </div>
                  )}

                  <div className="af-info-row">
                    {fb.browser && (
                      <span className="af-info-tag">🌐 {fb.browser}</span>
                    )}
                    {fb.os && (
                      <span className="af-info-tag">💻 {fb.os}</span>
                    )}
                    {fb.ip_address && (
                      <span className="af-info-tag af-info-tag--ip">🌍 {fb.ip_address}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}