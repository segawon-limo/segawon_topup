/**
 * Short Link Service
 * Membuat & resolve URL pendek untuk e-wallet payment redirect
 * Format: dana_XXXXXX | shopee_XXXXXX | ovo_XXXXXX
 */

const { pool } = require('../config/database');

// Prefix per metode pembayaran
const METHOD_PREFIX = {
  'DA': 'dana',
  'SA': 'shopee',
  'OV': 'ovo',
};

/**
 * Generate random alphanumeric string (6 karakter)
 */
function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Buat short link untuk e-wallet URL
 * @param {string} longUrl   - URL panjang dari Duitku (DANA/ShopeePay/OVO)
 * @param {string} method    - Kode metode: 'DA' | 'SA' | 'OV'
 * @param {string} orderNumber
 * @param {Date}   expiresAt - Kapan link expired (sama dengan order expiry)
 * @returns {string} short URL lengkap, e.g. https://segawontopup.net/r/dana_aB3xK9
 */
async function createShortLink(longUrl, method, orderNumber, expiresAt) {
  if (!longUrl) return null;

  const prefix = METHOD_PREFIX[method];
  if (!prefix) return longUrl; // bukan ewallet redirect, return as-is

  const baseUrl = process.env.FRONTEND_URL || 'https://segawontopup.net';

  // Coba generate unique code (max 5 kali retry jika collision)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${prefix}${randomCode(6)}`;
    try {
      await pool.query(
        `INSERT INTO short_links (code, long_url, order_number, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [code, longUrl, orderNumber, expiresAt]
      );
      console.log(`[ShortLink] Created: ${code} → ${longUrl.substring(0, 60)}...`);
      return `${baseUrl}/r/${code}`;
    } catch (err) {
      if (err.code === '23505') {
        // Unique violation — coba lagi dengan code baru
        continue;
      }
      throw err;
    }
  }

  // Fallback: return URL asli jika semua attempt gagal
  console.error('[ShortLink] Failed to generate unique code after 5 attempts, using original URL');
  return longUrl;
}

/**
 * Resolve short code → long URL
 * @param {string} code - e.g. "dana_aB3xK9"
 * @returns {string|null} long URL atau null jika tidak ditemukan / expired
 */
async function resolveShortLink(code) {
  const result = await pool.query(
    `SELECT long_url FROM short_links
     WHERE code = $1 AND expires_at > NOW()`,
    [code]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].long_url;
}

/**
 * Hapus short links yang sudah expired (untuk cron job)
 */
async function cleanupExpiredLinks() {
  const result = await pool.query(
    `DELETE FROM short_links WHERE expires_at < NOW()`
  );
  console.log(`[ShortLink] Cleanup: ${result.rowCount} expired links deleted`);
  return result.rowCount;
}

module.exports = { createShortLink, resolveShortLink, cleanupExpiredLinks };