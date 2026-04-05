/**
 * usePageTracking
 * Custom hook untuk mencatat page view ke backend.
 *
 * Cara pakai:
 *   usePageTracking('Valorant');   // di dalam komponen halaman
 *
 * Session ID disimpan di sessionStorage (bukan localStorage) →
 *   - Unik per tab
 *   - Otomatis hilang saat tab ditutup
 *   - Tidak persisten antar sesi
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'https://segawontopup.net';

// Halaman yang TIDAK di-track
const EXCLUDED_PATHS = [/^\/$/, /^\/admin/, /^\/payment/, /^\/status/, /^\/order\/success/, /^\/order\/qr/];

function getOrCreateSessionId() {
  let sid = sessionStorage.getItem('_sg_sid');
  if (!sid) {
    // Buat UUID v4 sederhana tanpa library
    sid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    sessionStorage.setItem('_sg_sid', sid);
  }
  return sid;
}

export default function usePageTracking(pageTitle) {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    // Skip halaman yang tidak perlu di-track
    if (EXCLUDED_PATHS.some((re) => re.test(path))) return;

    const session_id = getOrCreateSessionId();
    const referrer   = document.referrer || null;

    // Fire-and-forget: tidak block UI, tidak perlu await
    fetch(`${API_URL}/api/track/pageview`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id, path, page_title: pageTitle || null, referrer }),
    }).catch(() => { /* silent fail */ });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}