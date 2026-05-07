import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './SuccessPage.css';
import { Helmet } from 'react-helmet-async';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';
const WA_NUMBER    = process.env.REACT_APP_WHATSAPP || '6285791464598';
const CODE_PRODUCT_TYPES = ['voucher_code', 'token_pln'];
const MAX_POLLS    = 40;   // 40 × 3s = 2 menit
const CS_PER_PAGE  = 3;    // kartu cross-sell per halaman
const CS_INTERVAL  = 4000; // ms auto-advance

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const orderNumber    = searchParams.get('order_id');

  const [order,       setOrder]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);
  const [polling,     setPolling]     = useState(false);
  const [pollCount,   setPollCount]   = useState(0);
  const [crossSellGames, setCrossSellGames] = useState([]);
  const intervalRef = useRef(null);

  // ── cross-sell carousel refs (hindari re-render) ──────────
  const csPages    = useRef([]);
  const csCurrent  = useRef(0);
  const csPaused   = useRef(false);
  const csTimer    = useRef(null);
  const csStartTs  = useRef(null);
  const csElapsed  = useRef(0);
  const csTrackRef = useRef(null);
  const csDotsRef  = useRef(null);
  const csBarRef   = useRef(null);

  // ── drag / swipe refs ─────────────────────────────────────
  const csDragRef      = useRef(null); // ref ke viewport element
  const csDragging     = useRef(false);
  const csDragStartX   = useRef(0);
  const csDragCurrentX = useRef(0);
  const csDragStarted  = useRef(false); // true setelah threshold terlampaui

  const isCodeProduct = (o) => o && CODE_PRODUCT_TYPES.includes(o.productType);
  const hasCode       = (o) => o && o.serialNumber;

  // ── fetch ─────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/orders/${orderNumber}`);
      const data = await res.json();
      if (data.success) { setOrder(data.order); return data.order; }
    } catch (e) { console.error(e); }
    return null;
  }, [orderNumber]);

  // ── fetch cross-sell games ────────────────────────────────
  const fetchCrossSellGames = useCallback(async (currentSlug) => {
    try {
      const res  = await fetch(`${API_URL}/api/games`);
      const data = await res.json();
      const all  = data.games || [];
      const others = all
        .filter(g => g.slug !== currentSlug && g.category === 'games')
        .sort(() => Math.random() - 0.5)
        .slice(0, CS_PER_PAGE * 3);
      setCrossSellGames(others);
    } catch (e) { /* silent */ }
  }, []);

  // ── initial load ──────────────────────────────────────────
  useEffect(() => {
    if (!orderNumber) return;
    fetchOrder().then(o => {
      setLoading(false);
      if (isCodeProduct(o) && !hasCode(o)) setPolling(true);
      if (o?.gameSlug) fetchCrossSellGames(o.gameSlug);
      if (o?.gameUserId) {
        try { localStorage.setItem('lastUserId', o.gameUserId); } catch (_) {}
      }
    });
  }, [orderNumber]);

  // ── polling loop ──────────────────────────────────────────
  useEffect(() => {
    if (!polling) return;
    intervalRef.current = setInterval(async () => {
      setPollCount(c => {
        if (c + 1 >= MAX_POLLS) {
          clearInterval(intervalRef.current);
          setPolling(false);
        }
        return c + 1;
      });
      const o = await fetchOrder();
      if (hasCode(o)) { clearInterval(intervalRef.current); setPolling(false); }
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [polling]);

  // ── cross-sell carousel ───────────────────────────────────
  useEffect(() => {
    if (!crossSellGames.length) return;
    const pages = [];
    for (let i = 0; i + CS_PER_PAGE <= crossSellGames.length; i += CS_PER_PAGE)
      pages.push(crossSellGames.slice(i, i + CS_PER_PAGE));
    csPages.current   = pages;
    csCurrent.current = 0;
    csBuildTrack();
    csGoTo(0, false);
    csRenderDots();
    csStartBar();
    csTick();
    return () => clearTimeout(csTimer.current);
  }, [crossSellGames]);

  function csBuildTrack() {
    const track = csTrackRef.current; if (!track) return;
    track.innerHTML = '';
    const pages = csPages.current;
    track.style.width = `${pages.length * 100}%`;
    pages.forEach(page => {
      const pageEl = document.createElement('div');
      pageEl.className = 'sp-cs-page';
      pageEl.style.flex = `0 0 calc(${100 / pages.length}%)`;
      page.forEach(g => {
        const card = document.createElement('a');
        card.className = 'sp-cs-card';
        card.href = `/order/${g.slug}`;
        card.innerHTML = `
          <span class="sp-cs-arrow">↗</span>
          <div class="sp-cs-icon">
            <img src="${g.icon_url || ''}" alt="${g.name}" onerror="this.classList.add('errored')"/>
            <span class="sp-cs-initials">${g.name.slice(0,3).toUpperCase()}</span>
          </div>
          <span class="sp-cs-name">${g.name}</span>`;
        pageEl.appendChild(card);
      });
      track.appendChild(pageEl);
    });
  }

  function csRenderDots() {
    const el = csDotsRef.current; if (!el) return;
    const pages = csPages.current;
    el.innerHTML = pages.map((_, i) =>
      `<button class="sp-cs-dot ${i === csCurrent.current ? 'active' : ''}" data-i="${i}"></button>`
    ).join('');
    el.querySelectorAll('.sp-cs-dot').forEach(d =>
      d.addEventListener('click', () => { csGoTo(+d.dataset.i); csResetTimer(); })
    );
  }

  function csGoTo(idx, animate = true) {
    const pages = csPages.current;
    csCurrent.current = ((idx % pages.length) + pages.length) % pages.length;
    const track = csTrackRef.current; if (!track) return;
    track.style.transition = animate ? 'transform 0.45s cubic-bezier(0.4,0,0.2,1)' : 'none';
    track.style.transform  = `translateX(-${csCurrent.current * (100 / pages.length)}%)`;
    csRenderDots();
  }

  function csStartBar() {
    const bar = csBarRef.current; if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = `${(csElapsed.current / CS_INTERVAL) * 100}%`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!csBarRef.current) return;
      csBarRef.current.style.transition = `width ${CS_INTERVAL - csElapsed.current}ms linear`;
      csBarRef.current.style.width = '100%';
      csStartTs.current = performance.now();
    }));
  }

  function csPauseBar() {
    if (!csStartTs.current) return;
    csElapsed.current += performance.now() - csStartTs.current;
    csStartTs.current = null;
    const bar = csBarRef.current; if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = `${Math.min((csElapsed.current / CS_INTERVAL) * 100, 100)}%`;
  }

  function csResetBar() {
    csElapsed.current = 0; csStartTs.current = null;
    const bar = csBarRef.current; if (!bar) return;
    bar.style.transition = 'none'; bar.style.width = '0%';
  }

  function csTick() {
    clearTimeout(csTimer.current);
    csTimer.current = setTimeout(() => {
      csGoTo(csCurrent.current + 1);
      csResetBar();
      if (!csPaused.current) { csStartBar(); csTick(); }
    }, CS_INTERVAL - csElapsed.current);
  }

  function csResetTimer() {
    clearTimeout(csTimer.current); csResetBar(); csElapsed.current = 0;
    if (!csPaused.current) { csStartBar(); csTick(); }
  }

  function csPause() {
    if (csPaused.current) return;
    csPaused.current = true; clearTimeout(csTimer.current); csPauseBar();
  }

  function csResume() {
    if (!csPaused.current) return;
    csPaused.current = false; csResetBar(); csElapsed.current = 0; csStartBar(); csTick();
  }

  // ── drag / swipe handlers ─────────────────────────────────
  function csDragStart(clientX) {
    csDragging.current   = true;
    csDragStarted.current = false;
    csDragStartX.current = clientX;
    csDragCurrentX.current = clientX;
    csPause();
    const track = csTrackRef.current;
    if (track) track.style.transition = 'none';
  }

  function csDragMove(clientX) {
    if (!csDragging.current) return;
    csDragCurrentX.current = clientX;
    const diff = clientX - csDragStartX.current;

    // tandai drag dimulai setelah gerak ≥ 5px (biar klik tetap jalan)
    if (!csDragStarted.current && Math.abs(diff) >= 5) {
      csDragStarted.current = true;
    }
    if (!csDragStarted.current) return;

    const pages = csPages.current;
    if (!pages.length) return;
    const track = csTrackRef.current;
    if (!track) return;

    const pct = (csCurrent.current / pages.length) * 100;
    const offsetPct = (diff / track.parentElement.offsetWidth) * (100 / pages.length);
    track.style.transform = `translateX(calc(-${pct}% + ${offsetPct * pages.length}%))`;
  }

  function csDragEnd() {
    if (!csDragging.current) return;
    csDragging.current = false;

    const track = csTrackRef.current;
    if (track) track.style.transition = '';

    if (!csDragStarted.current) {
      // hanya klik biasa, resume auto-play
      csResume();
      return;
    }

    const diff = csDragCurrentX.current - csDragStartX.current;
    const threshold = (csDragRef.current?.offsetWidth || 200) * 0.2;

    if (Math.abs(diff) >= threshold) {
      const next = diff < 0
        ? csCurrent.current + 1
        : csCurrent.current - 1;
      csGoTo(next);
    } else {
      // kembalikan ke posisi semula
      csGoTo(csCurrent.current, true);
    }

    csResetBar();
    csElapsed.current = 0;
    csStartBar();
    csTick();
    csPaused.current = false;
  }

  // mouse events
  function csOnMouseDown(e) { csDragStart(e.clientX); }
  function csOnMouseMove(e) { csDragMove(e.clientX); }
  function csOnMouseUp()    { csDragEnd(); }
  function csOnMouseLeave() {
    if (csDragging.current) csDragEnd();
    else csResume();
  }

  // touch events
  function csOnTouchStart(e) { csDragStart(e.touches[0].clientX); }
  function csOnTouchMove(e)  {
    if (csDragStarted.current) e.preventDefault(); // cegah scroll halaman saat swipe
    csDragMove(e.touches[0].clientX);
  }
  function csOnTouchEnd()    { csDragEnd(); }

  // ── copy ──────────────────────────────────────────────────
  const copy = async () => {
    try { await navigator.clipboard.writeText(order.serialNumber); }
    catch {
      const el = document.createElement('textarea');
      el.value = order.serialNumber;
      document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const rp  = n => `Rp ${parseFloat(n||0).toLocaleString('id-ID')}`;
  const fmt = d => d ? new Date(d).toLocaleString('id-ID', {
    day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
  }) : '-';

  const codeLabel = t => t === 'token_pln' ? 'Token PLN' : 'Kode Voucher';
  const codeHint  = t => t === 'token_pln'
    ? 'Masukkan token ini di meteran listrik atau aplikasi PLN Mobile'
    : 'Di Steam: klik nama profil → Redeem a Steam Gift Card or Wallet Code';

  // ── Parse SN Token PLN ───────────────────────────────────
  // Format Digiflazz: TOKEN/NAMA_PELANGGAN/TARIF/DAYAva/KWH
  // Contoh: 7233-2511-2857-7999-2172/PT.-PERMAI-ABADI-SENTOSA/R1/2200VA/13,2Kwh
  const parsePlnSn = (sn) => {
    if (!sn) return { token: sn, nama: null, tarif: null, daya: null, kwh: null };
    const tokenMatch = sn.match(/^(\d{4}-\d{4}-\d{4}-\d{4}-\d{4})/);
    if (!tokenMatch) return { token: sn, nama: null, tarif: null, daya: null, kwh: null };
    const token = tokenMatch[1];
    const rest  = sn.slice(token.length + 1); // skip leading /
    const parts = rest.split('/');
    if (parts.length < 3) return { token, nama: parts[0] || null, tarif: null, daya: null, kwh: null };
    const kwh       = parts[parts.length - 1];
    const dayaRaw   = parts[parts.length - 2]; // e.g. "2200VA"
    const tarif     = parts[parts.length - 3]; // e.g. "R1"
    const namaParts = parts.slice(0, parts.length - 3);
    const nama      = namaParts.join('/');
    const daya      = dayaRaw.replace(/VA$/i, '') + ' VA';
    return { token, nama, tarif, daya, kwh };
  };

  // copy hanya token PLN (bukan full SN)
  const copyPln = async (token) => {
    try { await navigator.clipboard.writeText(token); }
    catch {
      const el = document.createElement('textarea');
      el.value = token;
      document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  // ── loading ───────────────────────────────────────────────
  if (loading) return (
    <div className="sp-page">
      <div className="sp-loader"><div className="sp-loader-ring"/><p>Memuat pesanan...</p></div>
    </div>
  );

  const isCode    = isCodeProduct(order);
  const ready     = hasCode(order);
  const timedOut  = !polling && isCode && !ready && pollCount >= MAX_POLLS;

  return (
    <>
      <Helmet>
        <title>Pembayaran Berhasil - Segawon Topup</title>
        <meta name="description" content="Transaksi top up game kamu berhasil diproses di Segawon Topup." />
        <link rel="canonical" href="https://segawontopup.net/success" />
      </Helmet>
    <div className="sp-page">
      {/* background blobs */}
      <div className="sp-blob sp-blob-1"/>
      <div className="sp-blob sp-blob-2"/>

      <div className="sp-card">

        {/* ── checkmark ─────────────────────────────── */}
        <div className="sp-check-wrap">
          <svg className="sp-check-svg" viewBox="0 0 52 52">
            <circle className="sp-check-circle" cx="26" cy="26" r="25" fill="none"/>
            <path  className="sp-check-mark"   fill="none" d="M14 27l8 8 16-16"/>
          </svg>
        </div>

        <h1 className="sp-title">Pembayaran Berhasil!</h1>
        <p  className="sp-subtitle">
          {isCode
            ? ready   ? 'Kode kamu sudah siap!' : 'Sedang menyiapkan kode...'
            : 'Pesanan kamu akan masuk ke akun dalam beberapa menit'}
        </p>

        {/* ── KODE AREA ─────────────────────────────── */}
        {isCode && (
          <div className={`sp-code-zone ${ready ? 'is-ready' : timedOut ? 'is-timeout' : 'is-waiting'}`}>

            {/* waiting */}
            {!ready && !timedOut && (
              <div className="sp-code-waiting">
                <div className="sp-pulse-ring">
                  <div className="sp-pulse-dot"/>
                </div>
                <p className="sp-waiting-title">Memproses kode</p>
                <p className="sp-waiting-hint">Halaman ini akan otomatis update. Jangan ditutup.</p>
                <div className="sp-progress-bar">
                  <div
                    className="sp-progress-fill"
                    style={{ width: `${Math.min((pollCount / MAX_POLLS) * 100, 95)}%` }}
                  />
                </div>
              </div>
            )}

            {/* timeout */}
            {timedOut && (
              <div className="sp-code-timeout">
                <span className="sp-timeout-icon">⚠️</span>
                <p>Kode sedang diproses lebih lama dari biasanya.</p>
                <p>Cek inbox email kamu atau hubungi CS kami.</p>
                <a
                  className="sp-btn-support"
                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Halo, saya ingin menanyakan pesanan saya ${orderNumber} yang belum selesai diproses.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 Hubungi Support
                </a>
              </div>
            )}

            {/* ready */}
            {ready && order.productType === 'token_pln' ? (() => {
              const pln = parsePlnSn(order.serialNumber);
              return (
                <div className="sp-code-ready">
                  <div className="sp-code-label">TOKEN PLN</div>

                  {/* Token utama — yang dicopy */}
                  <div className="sp-code-value" onClick={() => copyPln(pln.token)} title="Klik untuk menyalin token">
                    {pln.token}
                  </div>
                  <button className={`sp-btn-copy ${copied ? 'copied' : ''}`} onClick={() => copyPln(pln.token)}>
                    {copied ? '✓ Tersalin!' : '📋 Salin Token'}
                  </button>

                  {/* Info detail pelanggan */}
                  {pln.nama && (
                    <div className="sp-pln-info">
                      {pln.nama && (
                        <div className="sp-pln-row">
                          <span className="sp-pln-key">Nama Pelanggan</span>
                          <span className="sp-pln-val">{pln.nama}</span>
                        </div>
                      )}
                      {pln.tarif && pln.daya && (
                        <div className="sp-pln-row">
                          <span className="sp-pln-key">Tarif / Daya</span>
                          <span className="sp-pln-val">{pln.tarif} / {pln.daya}</span>
                        </div>
                      )}
                      {pln.kwh && (
                        <div className="sp-pln-row">
                          <span className="sp-pln-key">Jumlah kWh</span>
                          <span className="sp-pln-val">{pln.kwh}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="sp-code-hint">Masukkan token di meteran listrik atau aplikasi PLN Mobile</p>
                </div>
              );
            })() : ready && (
              <div className="sp-code-ready">
                <div className="sp-code-label">{codeLabel(order.productType)}</div>
                <div className="sp-code-value" onClick={copy} title="Klik untuk menyalin">
                  {order.serialNumber}
                </div>
                <button className={`sp-btn-copy ${copied ? 'copied' : ''}`} onClick={copy}>
                  {copied ? '✓ Tersalin!' : '📋 Salin Kode'}
                </button>
                <p className="sp-code-hint">{codeHint(order.productType)}</p>
              </div>
            )}
          </div>
        )}

        {/* ── ORDER DETAIL ───────────────────────────── */}
        {order && (
          <div className="sp-detail">
            <div className="sp-detail-header">Detail Pesanan</div>

            <div className="sp-row">
              <span>No. Pesanan</span>
              <span className="sp-mono">{order.orderNumber}</span>
            </div>
            <div className="sp-row">
              <span>Produk</span>
              <span>{order.productName}</span>
            </div>
            {!isCode && order.gameUserId && (
              <div className="sp-row">
                <span>Game ID</span>
                <span>{order.gameUserId}{order.gameUserTag && ` (${order.gameUserTag})`}</span>
              </div>
            )}
            <div className="sp-row">
              <span>Email</span>
              <span>{order.customer_email}</span>
            </div>
            <div className="sp-divider"/>
            <div className="sp-row sp-row-total">
              <span>Total</span>
              <span>{rp(order.total)}</span>
            </div>
            <div className="sp-row">
              <span>Waktu</span>
              <span>{fmt(order.createdAt)}</span>
            </div>
          </div>
        )}

        {/* ── NOTES ─────────────────────────────────── */}
        <div className="sp-notes">
          <div className="sp-note">
            <span>📧</span>
            <span>
              {isCode
                ? 'Kode juga dikirim ke email kamu sebagai backup'
                : 'Cek email untuk konfirmasi detail pesanan'}
            </span>
          </div>
          <div className="sp-note">
            <span>💬</span>
            <span>Kendala? Hubungi CS kami, kami siap membantu</span>
          </div>
        </div>

        {/* ── CROSS-SELL ────────────────────────────── */}
        {crossSellGames.length >= CS_PER_PAGE && (
          <div
            className="sp-crosssell"
            onMouseEnter={csPause}
            onMouseLeave={csOnMouseLeave}
          >
            <p className="sp-crosssell-label">Rekomendasi untuk kamu</p>
            <p className="sp-crosssell-title">🎮 Mau topup game lain?</p>
            <div
              className="sp-cs-viewport"
              ref={el => { csDragRef.current = el; }}
              onMouseDown={csOnMouseDown}
              onMouseMove={csOnMouseMove}
              onMouseUp={csOnMouseUp}
              onTouchStart={csOnTouchStart}
              onTouchMove={csOnTouchMove}
              onTouchEnd={csOnTouchEnd}
              onTouchCancel={csDragEnd}
            >
              <div className="sp-cs-track" ref={csTrackRef}/>
            </div>
            <div className="sp-cs-dots" ref={csDotsRef}/>
            <div className="sp-cs-progress">
              <div className="sp-cs-bar" ref={csBarRef}/>
            </div>
          </div>
        )}

        {/* ── BUTTONS ───────────────────────────────── */}
        <div className="sp-actions">
          <button className="sp-btn-primary" onClick={() => navigate('/')}>
            Kembali ke Beranda
          </button>
          <button
            className="sp-btn-secondary"
            onClick={() => navigate(`/order/${order?.gameSlug || 'steam-wallet'}`)}
          >
            Pesan Lagi
          </button>
        </div>

      </div>
    </div>
    </>
  );
}