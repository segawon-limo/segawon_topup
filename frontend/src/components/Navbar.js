import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SITE_NAME = process.env.REACT_APP_SITE_NAME || 'Segawon Top Up';
const WA_NUMBER = process.env.REACT_APP_WHATSAPP  || '';
const API_URL   = process.env.REACT_APP_API_URL   || 'https://segawontopup.net';

function Navbar() {
  const navigate = useNavigate();

  const [menuOpen,    setMenuOpen]    = useState(false);
  const [query,       setQuery]       = useState('');
  const [games,       setGames]       = useState([]);
  const [results,     setResults]     = useState([]);
  const [searchOpen,  setSearchOpen]  = useState(false); // mobile search bar toggle
  const [focused,     setFocused]     = useState(false);

  const inputRef      = useRef(null);
  const containerRef  = useRef(null);

  // ── Fetch semua games sekali saat mount ────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/games`)
      .then(r => r.json())
      .then(d => { if (d.success) setGames(d.games || []); })
      .catch(() => {});
  }, []);

  // ── Filter lokal saat query berubah ────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      games
        .filter(g => g.name.toLowerCase().includes(q))
        .slice(0, 8)
    );
  }, [query, games]);

  // ── Klik di luar → tutup dropdown ─────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (slug) => {
    setQuery('');
    setResults([]);
    setFocused(false);
    setSearchOpen(false);
    setMenuOpen(false);
    navigate(`/order/${slug}`);
  };

  const showDropdown = focused && results.length > 0;

  return (
    <nav className="bg-gradient-to-r from-pink-600 to-red-600 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16 gap-3">

          {/* ── Logo & Brand ── */}
          <Link
            to="/"
            className="flex items-center gap-2 group flex-shrink-0"
            onClick={() => { setMenuOpen(false); setSearchOpen(false); }}
          >
            <img
              src="/images/logo/logo-navbar.png"
              srcSet="/images/logo/logo-navbar@2x.png 2x"
              alt="Segawon Top Up Logo"
              className="w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg"
            />
            <span className="text-base sm:text-xl md:text-2xl font-bold text-white drop-shadow-md">
              {SITE_NAME}
            </span>
          </Link>

          {/* ── Search Bar — Desktop (tengah) ── */}
          <div ref={containerRef} className="relative hidden md:flex flex-1 max-w-md mx-auto">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                type="text"
                value={query}
                placeholder="Cari game atau voucher..."
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                className="w-full pl-8 pr-4 py-2 rounded-xl text-sm bg-white/15 text-white placeholder-white/50
                           border border-white/20 focus:outline-none focus:bg-white/25 focus:border-white/40
                           transition-all duration-200"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-lg leading-none"
                >×</button>
              )}
            </div>

            {/* Dropdown hasil */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden z-50 border border-gray-100">
                {results.map(g => (
                  <button
                    key={g.id}
                    onMouseDown={() => handleSelect(g.slug)}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-pink-50 transition-colors duration-150 text-left border-b border-gray-50 last:border-0"
                  >
                    {g.icon_url
                      ? <img src={g.icon_url} alt={g.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-red-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {g.name.charAt(0)}
                        </div>
                    }
                    <span className="text-sm font-medium text-gray-800">{g.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Desktop Menu ── */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <Link to="/" className="text-white hover:text-pink-100 font-medium transition-colors duration-200 text-sm">
              Home
            </Link>
            <a href="#games" className="text-white hover:text-pink-100 font-medium transition-colors duration-200 text-sm">
              Games
            </a>
            <Link to="/cek-transaksi" className="text-white hover:text-pink-100 font-medium transition-colors duration-200 text-sm">
              Cek Transaksi
            </Link>
            <Link to="/pascabayar" className="bg-white/20 hover:bg-white/30 text-white font-semibold transition-all duration-200 text-sm px-3 py-1.5 rounded-lg border border-white/40 flex items-center gap-1.5">
              🌐 Internet Pascabayar
            </Link>
            <a
              href={`https://wa.me/${WA_NUMBER}`}
              target="_blank" rel="noopener noreferrer"
              className="bg-white text-pink-700 px-5 py-2 rounded-lg font-semibold hover:bg-pink-50 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm"
            >
              Hubungi CS
            </a>
          </div>

          {/* ── Mobile: tombol search + hamburger ── */}
          <div className="md:hidden flex items-center gap-2 ml-auto">
            {/* Tombol search mobile */}
            <button
              onClick={() => { setSearchOpen(p => !p); setMenuOpen(false); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white"
              aria-label="Cari"
            >
              {searchOpen
                ? <span className="text-xl leading-none">×</span>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
              }
            </button>

            {/* Hamburger */}
            <button
              onClick={() => { setMenuOpen(p => !p); setSearchOpen(false); }}
              className="flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-white/10 transition-colors duration-200 focus:outline-none"
              aria-label="Toggle menu"
            >
              <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-6 h-0.5 bg-white my-1 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Search Bar ── */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${searchOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 py-3 bg-red-700/50 border-t border-white/20">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Cari game atau voucher..."
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm bg-white/15 text-white placeholder-white/50
                         border border-white/20 focus:outline-none focus:bg-white/25 transition-all duration-200"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-xl leading-none"
              >×</button>
            )}
          </div>

          {/* Hasil search mobile */}
          {results.length > 0 && (
            <div className="mt-2 bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
              {results.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleSelect(g.slug)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-pink-50 transition-colors duration-150 text-left border-b border-gray-50 last:border-0"
                >
                  {g.icon_url
                    ? <img src={g.icon_url} alt={g.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-red-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                        {g.name.charAt(0)}
                      </div>
                  }
                  <span className="text-sm font-medium text-gray-800">{g.name}</span>
                </button>
              ))}
            </div>
          )}

          {query && results.length === 0 && (
            <p className="text-white/60 text-sm text-center mt-3 py-2">
              Produk "{query}" tidak ditemukan
            </p>
          )}
        </div>
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-gradient-to-b from-red-600 to-red-700 px-4 pb-4 pt-2 flex flex-col gap-1 border-t border-white/20">
          <Link
            to="/"
            className="text-white font-medium py-3 px-4 rounded-lg hover:bg-white/10 transition-colors duration-200"
            onClick={() => setMenuOpen(false)}
          >
            🏠 Home
          </Link>
          <a
            href="#games"
            className="text-white font-medium py-3 px-4 rounded-lg hover:bg-white/10 transition-colors duration-200"
            onClick={() => setMenuOpen(false)}
          >
            🎮 Games
          </a>
          <Link
            to="/cek-transaksi"
            className="text-white font-medium py-3 px-4 rounded-lg hover:bg-white/10 transition-colors duration-200"
            onClick={() => setMenuOpen(false)}
          >
            🔍 Cek Transaksi
          </Link>
          <Link
            to="/pascabayar"
            className="text-white font-medium py-3 px-4 rounded-lg hover:bg-white/10 transition-colors duration-200"
            onClick={() => setMenuOpen(false)}
          >
            🌐 Internet Pascabayar
          </Link>
          <a
            href={`https://wa.me/${WA_NUMBER}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-1 bg-white text-pink-700 text-center py-3 px-4 rounded-lg font-semibold hover:bg-pink-50 transition-colors duration-200 shadow-md"
            onClick={() => setMenuOpen(false)}
          >
            💬 Hubungi CS
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;