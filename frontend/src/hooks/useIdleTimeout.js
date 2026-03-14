import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit
const WARNING_BEFORE_MS = 60 * 1000;    // Warning 1 menit sebelum logout

/**
 * Hook idle timeout untuk halaman admin.
 * Auto logout setelah 30 menit tidak ada aktivitas.
 * Muncul warning 1 menit sebelum logout.
 *
 * Usage: tambahkan 1 baris di setiap halaman admin:
 *   useIdleTimeout();
 */
export default function useIdleTimeout() {
  const navigate = useNavigate();
  const logoutTimer  = useRef(null);
  const warningTimer = useRef(null);
  const warningShown = useRef(false);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    // Hapus warning toast jika masih ada
    const toast = document.getElementById('idle-warning-toast');
    if (toast) toast.remove();
    navigate('/admin/login', { state: { reason: 'idle' } });
  }, [navigate]);

  const showWarning = useCallback(() => {
    if (warningShown.current) return;
    warningShown.current = true;

    // Buat toast warning
    const toast = document.createElement('div');
    toast.id = 'idle-warning-toast';
    toast.innerHTML = `
      <div style="
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: #1e293b; color: #fff; padding: 14px 24px; border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4); z-index: 99999;
        display: flex; align-items: center; gap: 14px; font-size: 14px;
        border-left: 4px solid #f59e0b; min-width: 320px;
      ">
        <span>⏰</span>
        <span>Sesi akan berakhir dalam <strong>1 menit</strong> karena tidak ada aktivitas.</span>
        <button id="idle-stay-btn" style="
          margin-left: auto; background: #f59e0b; color: #000; border: none;
          padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;
        ">Lanjutkan</button>
      </div>
    `;
    document.body.appendChild(toast);

    document.getElementById('idle-stay-btn').addEventListener('click', resetTimer);
  }, []);

  const resetTimer = useCallback(() => {
    // Hapus timer lama
    clearTimeout(logoutTimer.current);
    clearTimeout(warningTimer.current);
    warningShown.current = false;

    // Hapus toast jika ada
    const toast = document.getElementById('idle-warning-toast');
    if (toast) toast.remove();

    // Set timer baru
    warningTimer.current = setTimeout(showWarning, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
    logoutTimer.current  = setTimeout(logout, IDLE_TIMEOUT_MS);
  }, [logout, showWarning]);

  useEffect(() => {
    // Events yang dianggap "aktivitas"
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    // Mulai timer pertama
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(logoutTimer.current);
      clearTimeout(warningTimer.current);
      const toast = document.getElementById('idle-warning-toast');
      if (toast) toast.remove();
    };
  }, [resetTimer]);
}