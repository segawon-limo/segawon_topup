/**
 * Duitku IP Whitelist Middleware
 * 
 * Hanya izinkan request callback dari IP resmi Duitku.
 * Referensi: https://docs.duitku.com/api/id/#callback
 * 
 * Jika IP berubah di masa depan, update daftar DUITKU_IPS di bawah
 * dan restart server.
 */

const DUITKU_IPS = [
  // ── Production ──────────────────────────────
  '182.23.85.8',
  '182.23.85.9',
  '182.23.85.10',
  '182.23.85.13',
  '182.23.85.14',
  '103.177.101.184',
  '103.177.101.185',
  '103.177.101.186',
  '103.177.101.189',
  '103.177.101.190',

  // ── Sandbox ──────────────────────────────────
  '182.23.85.11',
  '182.23.85.12',
  '103.177.101.187',
  '103.177.101.188',
];

/**
 * Ambil IP asli client.
 * Jika server di balik reverse proxy (Nginx, Cloudflare, dll.),
 * IP asli ada di header X-Forwarded-For, bukan req.socket.remoteAddress.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For bisa berisi banyak IP: "clientIP, proxy1, proxy2"
    // Ambil yang paling kiri (IP asli pengirim)
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '';
}

module.exports = function duitkuIpWhitelist(req, res, next) {
  const clientIp = getClientIp(req);

  // Mode development: skip whitelist agar bisa test lokal
  if (process.env.NODE_ENV === 'development' || process.env.DUITKU_MODE === 'sandbox') {
    console.log(`[DuitkuWhitelist] DEV/Sandbox mode - skip IP check (IP: ${clientIp})`);
    return next();
  }

  if (DUITKU_IPS.includes(clientIp)) {
    console.log(`[DuitkuWhitelist] ✓ IP diizinkan: ${clientIp}`);
    return next();
  }

  // IP tidak dikenal — tolak dan log untuk investigasi
  console.warn(`[DuitkuWhitelist] ⛔ Request ditolak dari IP: ${clientIp}`);
  console.warn(`[DuitkuWhitelist] Body:`, JSON.stringify(req.body));

  // Return 200 biar Duitku tidak terus retry (sesuai docs),
  // tapi JANGAN proses lebih lanjut
  return res.status(200).send('success');
};