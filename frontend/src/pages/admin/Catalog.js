import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';
import './Catalog.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

const PRODUCT_TYPES   = ['topup_game', 'voucher_code', 'token_pln', 'pulsa', 'data_package'];
const CATEGORIES      = ['games', 'voucher', 'utilities', 'pulsa_data'];
const FORMAT_KEYS     = ['userId_only', 'userId_concat_zoneId', 'userId_pipe_server', 'roleId_pipe_server', 'riotId_hash_tag'];

const FORMAT_KEY_LABELS = {
  userId_only:          'userId saja (AOV, FF, HFH, HOK, MRV, PGM)',
  userId_concat_zoneId: 'userId + zoneId concat (Mobile Legends)',
  userId_pipe_server:   'userId|server (GIP, HSR, ZZZ)',
  roleId_pipe_server:   'roleId|server (PGR)',
  riotId_hash_tag:      'riotId#tag (Valorant, LoL)',
};

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

// ── Reusable confirm dialog ──────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">⚠️ Konfirmasi</h3>
        <p style={{ color: '#4a5568', margin: '16px 0 24px' }}>{message}</p>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>Batal</button>
          <button className="btn-danger"    onClick={onConfirm}>Ya, Lanjutkan</button>
        </div>
      </div>
    </div>
  );
}

// ── Toast notification ───────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.type === 'success' ? '✅' : '❌'} {toast.message}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GAME FORM MODAL
// ══════════════════════════════════════════════════════════════
function GameModal({ game, onClose, onSaved, authHeader }) {
  const isEdit = !!game?.id;
  const [form, setForm] = useState({
    name:                 game?.name               || '',
    slug:                 game?.slug               || '',
    description:          game?.description        || '',
    icon_url:             game?.icon_url           || '',
    category:             game?.category           || 'games',
    product_type:         game?.product_type       || 'topup_game',
    digiflazz_format_key: game?.digiflazz_format_key || 'userId_only',
    is_active:            game?.is_active !== false,
    sort_order:           game?.sort_order         ?? 0,
    // form_config fields — simplified inputs
    fc_header_image: game?.form_config?.headerImage   || '',
    fc_icon_file:    game?.form_config?.iconFile      || '',
    fc_page_title:   game?.form_config?.pageTitle     || '',
    fc_display_fmt:  game?.form_config?.displayFormat || 'userId',
    fc_validation:   game?.form_config?.validation    || '',
    fc_fields_json:  game?.form_config?.fields
      ? JSON.stringify(game.form_config.fields, null, 2)
      : JSON.stringify([
          { name: 'userId', label: 'User ID', placeholder: 'Contoh: 123456789', type: 'number' }
        ], null, 2),
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Auto-generate slug dari name
  const handleNameChange = (e) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm(f => ({ ...f, name, ...(!isEdit && { slug }) }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    let fields;
    try {
      fields = JSON.parse(form.fc_fields_json);
    } catch {
      setError('Format JSON fields tidak valid. Periksa sintaks.');
      setSaving(false);
      return;
    }

    const payload = {
      name:                 form.name,
      slug:                 form.slug,
      description:          form.description || null,
      icon_url:             form.icon_url    || null,
      category:             form.category,
      product_type:         form.product_type,
      digiflazz_format_key: form.digiflazz_format_key,
      is_active:            form.is_active,
      sort_order:           parseInt(form.sort_order) || 0,
      form_config: {
        fields,
        displayFormat: form.fc_display_fmt,
        validation:    form.fc_validation || null,
        headerImage:   form.fc_header_image || null,
        iconFile:      form.fc_icon_file    || null,
        pageTitle:     form.fc_page_title   || null,
      },
    };

    try {
      const url    = isEdit ? `${API_URL}/api/admin/catalog/games/${game.id}` : `${API_URL}/api/admin/catalog/games`;
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      onSaved(data.data, isEdit ? 'update' : 'create');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '✏️ Edit Game' : '➕ Tambah Game Baru'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">❌ {error}</div>}

          {/* Row 1 */}
          <div className="form-row">
            <div className="form-group">
              <label>Nama Game *</label>
              <input name="name" value={form.name} onChange={handleNameChange} placeholder="Contoh: Mobile Legends" required />
            </div>
            <div className="form-group">
              <label>Slug * <span className="label-hint">(auto dari nama)</span></label>
              <input name="slug" value={form.slug} onChange={handleChange} placeholder="mobile-legends" required />
            </div>
          </div>

          {/* Row 2 */}
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Product Type</label>
              <select name="product_type" value={form.product_type} onChange={handleChange}>
                {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="form-row">
            <div className="form-group">
              <label>Digiflazz Format Key</label>
              <select name="digiflazz_format_key" value={form.digiflazz_format_key} onChange={handleChange}>
                {FORMAT_KEYS.map(k => (
                  <option key={k} value={k}>{FORMAT_KEY_LABELS[k] || k}</option>
                ))}
              </select>
            </div>
            <div className="form-group form-group-row">
              <div>
                <label>Sort Order</label>
                <input name="sort_order" type="number" value={form.sort_order} onChange={handleChange} style={{ width: 90 }} />
              </div>
              <div className="checkbox-group">
                <input type="checkbox" id="is_active_g" name="is_active" checked={form.is_active} onChange={handleChange} />
                <label htmlFor="is_active_g">Aktif</label>
              </div>
            </div>
          </div>

          {/* Row 4 — assets */}
          <div className="form-row">
            <div className="form-group">
              <label>Icon URL / filename <span className="label-hint">(icon_url di DB)</span></label>
              <input name="icon_url" value={form.icon_url} onChange={handleChange} placeholder="https://... atau mlb.webp" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input name="description" value={form.description} onChange={handleChange} placeholder="Opsional" />
            </div>
          </div>

          {/* form_config section */}
          <div className="section-divider">⚙️ form_config (OrderPage)</div>

          <div className="form-row">
            <div className="form-group">
              <label>Header Image <span className="label-hint">(public/images/header/)</span></label>
              <input name="fc_header_image" value={form.fc_header_image} onChange={handleChange} placeholder="mobile-legends-header.jpg" />
            </div>
            <div className="form-group">
              <label>Icon File <span className="label-hint">(public/images/games_icon/)</span></label>
              <input name="fc_icon_file" value={form.fc_icon_file} onChange={handleChange} placeholder="mlb.webp" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Page Title <span className="label-hint">(label currency di order page)</span></label>
              <input name="fc_page_title" value={form.fc_page_title} onChange={handleChange} placeholder="Diamonds" />
            </div>
            <div className="form-group">
              <label>Display Format</label>
              <select name="fc_display_fmt" value={form.fc_display_fmt} onChange={handleChange}>
                <option value="userId">userId</option>
                <option value="userId#zoneId">userId#zoneId</option>
                <option value="userId (zoneId)">userId (zoneId)</option>
                <option value="—">— (voucher, tidak ada ID)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Validation Key <span className="label-hint">(kosongkan jika tidak ada validasi)</span></label>
              <select name="fc_validation" value={form.fc_validation} onChange={handleChange}>
                <option value="">— Tidak ada</option>
                <option value="riot_id">riot_id (Valorant / LoL)</option>
                <option value="pln_meter">pln_meter (Token PLN)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>
              Fields JSON *{' '}
              <span className="label-hint">array of {'{ name, label, placeholder, type }'}</span>
            </label>
            <textarea
              name="fc_fields_json"
              value={form.fc_fields_json}
              onChange={handleChange}
              rows={7}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
              spellCheck={false}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : isEdit ? '💾 Simpan Perubahan' : '➕ Buat Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PRODUCT FORM MODAL
// ══════════════════════════════════════════════════════════════
function ProductModal({ product, games, onClose, onSaved, authHeader }) {
  const isEdit = !!product?.id;
  const [form, setForm] = useState({
    game_id:          product?.game_id          || games[0]?.id || '',
    name:             product?.name             || '',
    description:      product?.description      || '',
    sku:              product?.sku              || '',
    base_price:       product?.base_price       || '',
    selling_price:    product?.selling_price    || '',
    profit_price:     product?.profit_price     || '',
    icon_product_url: product?.icon_product_url || '',
    is_active:        product?.is_active !== false,
    sort_order:       product?.sort_order       ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: type === 'checkbox' ? checked : value };
      // Auto-hitung profit kalau base/selling berubah
      if (name === 'base_price' || name === 'selling_price') {
        const sp = parseFloat(name === 'selling_price' ? value : updated.selling_price) || 0;
        const bp = parseFloat(name === 'base_price'    ? value : updated.base_price)    || 0;
        updated.profit_price = sp > 0 ? (sp - bp).toFixed(0) : updated.profit_price;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      base_price:    parseFloat(form.base_price)    || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      profit_price:  parseFloat(form.profit_price)  || 0,
      sort_order:    parseInt(form.sort_order)       || 0,
    };
    try {
      const url    = isEdit ? `${API_URL}/api/admin/catalog/products/${product.id}` : `${API_URL}/api/admin/catalog/products`;
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      onSaved(data.data, isEdit ? 'update' : 'create');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const profitMargin = form.selling_price && form.base_price
    ? (Math.ceil(((form.selling_price - form.base_price) / form.selling_price) * 1000) / 10).toFixed(1)
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '✏️ Edit Product' : '➕ Tambah Product'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">❌ {error}</div>}

          <div className="form-group">
            <label>Game *</label>
            <select name="game_id" value={form.game_id} onChange={handleChange} required>
              <option value="">— Pilih Game —</option>
              {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nama Produk *</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Contoh: 100 Diamonds" required />
            </div>
            <div className="form-group">
              <label>SKU Digiflazz *</label>
              <input name="sku" value={form.sku} onChange={handleChange} placeholder="MLB100" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Harga Modal (base_price)</label>
              <input name="base_price" type="number" value={form.base_price} onChange={handleChange} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Harga Jual (selling_price) *</label>
              <input name="selling_price" type="number" value={form.selling_price} onChange={handleChange} placeholder="15000" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Profit Price <span className="label-hint">(auto dari selling - base)</span></label>
              <input name="profit_price" type="number" value={form.profit_price} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Icon Produk <span className="label-hint">(public/images/icon_product/)</span></label>
              <input name="icon_product_url" value={form.icon_product_url} onChange={handleChange} placeholder="diamond-100.webp" />
            </div>
          </div>

          {profitMargin !== null && (
            <div className="profit-preview">
              💰 Profit: {formatRupiah(form.selling_price - form.base_price)} &nbsp;·&nbsp;
              Margin: <strong>{profitMargin}%</strong>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Sort Order</label>
              <input name="sort_order" type="number" value={form.sort_order} onChange={handleChange} style={{ width: 100 }} />
            </div>
            <div className="form-group">
              <label>Description <span className="label-hint">(opsional)</span></label>
              <input name="description" value={form.description} onChange={handleChange} placeholder="Opsional" />
            </div>
          </div>

          <div className="checkbox-group" style={{ marginBottom: 16 }}>
            <input type="checkbox" id="is_active_p" name="is_active" checked={form.is_active} onChange={handleChange} />
            <label htmlFor="is_active_p">Produk Aktif (tampil di OrderPage)</label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : isEdit ? '💾 Simpan' : '➕ Tambah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN CATALOG PAGE
// ══════════════════════════════════════════════════════════════
function AdminCatalog() {
  const navigate = useNavigate();
  const [tab,      setTab]      = useState('games');   // 'games' | 'products'
  const [games,    setGames]    = useState([]);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Filters
  const [filterGame,    setFilterGame]    = useState('');
  const [filterSearch,  setFilterSearch]  = useState('');
  const [filterActive,  setFilterActive]  = useState('all'); // 'all' | 'active' | 'inactive'

  // Modals
  const [gameModal,    setGameModal]    = useState(null);  // null | 'new' | {game}
  const [productModal, setProductModal] = useState(null);  // null | 'new' | {product}
  const [confirmDel,   setConfirmDel]   = useState(null);  // { type, id, name }

  // Toast
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('admin_token');
  const authHeader = { Authorization: `Bearer ${token}` };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [gRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/catalog/games`,    { headers: authHeader }),
        fetch(`${API_URL}/api/admin/catalog/products`, { headers: authHeader }),
      ]);
      const [gData, pData] = await Promise.all([gRes.json(), pRes.json()]);
      if (gData.success) setGames(gData.data);
      if (pData.success) setProducts(pData.data);
    } catch (err) {
      showToast('Gagal load data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  // ── Delete handler ─────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDel) return;
    const { type, id } = confirmDel;
    const url = type === 'game'
      ? `${API_URL}/api/admin/catalog/games/${id}`
      : `${API_URL}/api/admin/catalog/products/${id}`;

    try {
      const res  = await fetch(url, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(data.message);
      await loadAll();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setConfirmDel(null);
    }
  };

  // ── Save callbacks ─────────────────────────────────────────
  const handleGameSaved = async (saved, mode) => {
    setGameModal(null);
    showToast(mode === 'create' ? `Game "${saved.name}" berhasil dibuat!` : `Game "${saved.name}" diperbarui.`);
    await loadAll();
  };

  const handleProductSaved = async (saved, mode) => {
    setProductModal(null);
    showToast(mode === 'create' ? `Produk "${saved.name}" berhasil dibuat!` : `Produk "${saved.name}" diperbarui.`);
    await loadAll();
  };

  // ── Toggle active ──────────────────────────────────────────
  const toggleGameActive = async (game) => {
    try {
      const res  = await fetch(`${API_URL}/api/admin/catalog/games/${game.id}`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !game.is_active }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`${game.name} ${!game.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
      await loadAll();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const toggleProductActive = async (product) => {
    try {
      const res  = await fetch(`${API_URL}/api/admin/catalog/products/${product.id}`, {
        method: 'PUT',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product.is_active }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(`${product.name} ${!product.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
      await loadAll();
    } catch (err) { showToast(err.message, 'error'); }
  };

  // ── Filtered lists ─────────────────────────────────────────
  const filteredGames = games.filter(g => {
    if (filterSearch && !g.name.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !g.slug.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterActive === 'active'   && !g.is_active) return false;
    if (filterActive === 'inactive' &&  g.is_active) return false;
    return true;
  });

  const filteredProducts = products.filter(p => {
    if (filterGame && p.game_id !== filterGame) return false;
    if (filterSearch && !p.name.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !p.sku.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    if (filterActive === 'active'   && !p.is_active) return false;
    if (filterActive === 'inactive' &&  p.is_active) return false;
    return true;
  });

  if (loading) return <div className="admin-dashboard"><div className="loading">Loading catalog...</div></div>;

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>🗂️ Catalog Manager</h1>
          <p>Kelola Games &amp; Products</p>
        </div>
        <div className="header-right">
          <button onClick={() => navigate('/admin/dashboard')} className="btn-secondary">📊 Dashboard</button>
          <button onClick={() => navigate('/admin/orders')}    className="btn-secondary">📋 Orders</button>
          <button onClick={handleLogout} className="btn-danger">Logout</button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="catalog-stats">
        <div className="cstat"><strong>{games.filter(g => g.is_active).length}</strong> Games Aktif</div>
        <div className="cstat"><strong>{games.filter(g => !g.is_active).length}</strong> Games Nonaktif</div>
        <div className="cstat cstat-divider" />
        <div className="cstat"><strong>{products.filter(p => p.is_active).length}</strong> Products Aktif</div>
        <div className="cstat"><strong>{products.filter(p => !p.is_active).length}</strong> Products Nonaktif</div>
      </div>

      {/* Tabs */}
      <div className="catalog-tabs">
        <button className={`tab-btn ${tab === 'games' ? 'active' : ''}`} onClick={() => setTab('games')}>
          🎮 Games ({games.length})
        </button>
        <button className={`tab-btn ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
          📦 Products ({products.length})
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          className="search-input"
          placeholder={tab === 'games' ? '🔍 Cari nama / slug game...' : '🔍 Cari nama / SKU produk...'}
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
        />
        {tab === 'products' && (
          <select className="filter-select" value={filterGame} onChange={e => setFilterGame(e.target.value)}>
            <option value="">Semua Products</option>
            {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <select className="filter-select" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="active">Aktif Saja</option>
          <option value="inactive">Nonaktif Saja</option>
        </select>
        <button
          className="btn-primary"
          onClick={() => tab === 'games' ? setGameModal('new') : setProductModal('new')}
        >
          {tab === 'games' ? '➕ Game Baru' : '➕ Produk Baru'}
        </button>
      </div>

      {/* ── GAMES TABLE ──────────────────────────────────────── */}
      {tab === 'games' && (
        <div className="table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Game</th>
                <th>Slug</th>
                <th>Category</th>
                <th>Product Type</th>
                <th>Format Key</th>
                <th>Products</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#a0aec0' }}>Tidak ada game ditemukan</td></tr>
              )}
              {filteredGames.map((g, i) => (
                <tr key={g.id}>
                  <td style={{ color: '#a0aec0' }}>{i + 1}</td>
                  <td>
                    <div className="cell-game-name">
                      {g.form_config?.iconFile && (
                        <img
                          src={`/images/games_icon/${g.form_config.iconFile}`}
                          alt=""
                          className="table-game-icon"
                          onError={e => e.target.style.display = 'none'}
                        />
                      )}
                      <strong>{g.name}</strong>
                    </div>
                  </td>
                  <td><code className="slug-badge">{g.slug}</code></td>
                  <td><span className="badge badge-pending">{g.category}</span></td>
                  <td><span className="badge badge-warning">{g.product_type}</span></td>
                  <td><code style={{ fontSize: 12 }}>{g.digiflazz_format_key || '—'}</code></td>
                  <td style={{ textAlign: 'center' }}>
                    <strong>{g.active_products}</strong> aktif
                  </td>
                  <td>
                    <button
                      className={`toggle-btn ${g.is_active ? 'toggle-on' : 'toggle-off'}`}
                      onClick={() => toggleGameActive(g)}
                      title={g.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                    >
                      {g.is_active ? '● Aktif' : '○ Nonaktif'}
                    </button>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-action btn-edit" onClick={() => setGameModal(g)} title="Edit">✏️</button>
                      <button className="btn-action btn-del"  onClick={() => setConfirmDel({ type: 'game', id: g.id, name: g.name })} title="Nonaktifkan">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PRODUCTS TABLE ────────────────────────────────────── */}
      {tab === 'products' && (
        <div className="table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Game</th>
                <th>Nama Produk</th>
                <th>SKU</th>
                <th>Harga Modal</th>
                <th>Harga Jual</th>
                <th>Profit</th>
                <th>Sort</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#a0aec0' }}>Tidak ada produk ditemukan</td></tr>
              )}
              {filteredProducts.map((p, i) => {
                const profitMargin = p.selling_price > 0
                  ? (Math.ceil((p.profit_price / p.selling_price) * 1000) / 10).toFixed(1)
                  : 0;
                return (
                  <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.5 }}>
                    <td style={{ color: '#a0aec0' }}>{i + 1}</td>
                    <td><span className="badge badge-pending">{p.game_name}</span></td>
                    <td><strong>{p.name}</strong></td>
                    <td><code className="slug-badge">{p.sku}</code></td>
                    <td>{formatRupiah(p.base_price)}</td>
                    <td><strong>{formatRupiah(p.selling_price)}</strong></td>
                    <td>
                      <span style={{ color: '#48bb78', fontWeight: 600 }}>{formatRupiah(p.profit_price)}</span>
                      <span style={{ color: '#a0aec0', fontSize: 12, marginLeft: 4 }}>({profitMargin}%)</span>
                    </td>
                    <td style={{ textAlign: 'center', color: '#a0aec0' }}>{p.sort_order}</td>
                    <td>
                      <button
                        className={`toggle-btn ${p.is_active ? 'toggle-on' : 'toggle-off'}`}
                        onClick={() => toggleProductActive(p)}
                      >
                        {p.is_active ? '● Aktif' : '○ Nonaktif'}
                      </button>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-action btn-edit" onClick={() => setProductModal(p)} title="Edit">✏️</button>
                        <button className="btn-action btn-del"  onClick={() => setConfirmDel({ type: 'product', id: p.id, name: p.name })} title="Nonaktifkan">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODALS ───────────────────────────────────────────── */}
      {(gameModal === 'new' || (gameModal && gameModal.id)) && (
        <GameModal
          game={gameModal === 'new' ? null : gameModal}
          onClose={() => setGameModal(null)}
          onSaved={handleGameSaved}
          authHeader={authHeader}
        />
      )}

      {(productModal === 'new' || (productModal && productModal.id)) && (
        <ProductModal
          product={productModal === 'new' ? null : productModal}
          games={games.filter(g => g.is_active)}
          onClose={() => setProductModal(null)}
          onSaved={handleProductSaved}
          authHeader={authHeader}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          message={`Nonaktifkan "${confirmDel.name}"? Game/produk tidak akan tampil di halaman order, tapi data tetap aman.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export default AdminCatalog;