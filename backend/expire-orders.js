/**
 * expire-orders.js
 * Cron: 0 * * * * (tiap jam)
 * - Cari order dengan payment_status = 'pending' dan payment_expires_at < NOW()
 * - Update order_status & payment_status jadi 'expired'
 * - Kirim notif Telegram ringkasan
 */

const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const { Pool } = require('pg');

// ── Load .env manual (tanpa dotenv package) ───────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...rest] = line.trim().split('=');
    if (key && !key.startsWith('#') && rest.length) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
const DB_URL    = process.env.DATABASE_URL;

const pool = new Pool({ connectionString: DB_URL });

// ── Helpers ───────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  console.log(`[${ts}] ${msg}`);
}

function now() {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function sendTelegram(text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', (e) => { log(`Telegram error: ${e.message}`); resolve(); });
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────
async function expireOrders() {
  log('=== Expire Orders Job START ===');

  try {
    // 1. Cari order yang sudah expired
    const findResult = await pool.query(`
      SELECT 
        o.id, o.order_number, o.customer_name, o.customer_email,
        o.amount, o.payment_expires_at,
        p.name as product_name,
        g.name as game_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN games   g ON p.game_id = g.id
      WHERE o.payment_status = 'pending'
        AND o.order_status   = 'pending'
        AND o.payment_expires_at < NOW()
      ORDER BY o.payment_expires_at ASC
    `);

    const expired = findResult.rows;
    log(`Ditemukan ${expired.length} order yang perlu di-expire`);

    if (expired.length === 0) {
      log('Tidak ada order yang perlu di-expire. Selesai.');
      await pool.end();
      return;
    }

    // 2. Update semua sekaligus
    const ids = expired.map(o => o.id);
    const updateResult = await pool.query(`
      UPDATE orders
      SET 
        order_status   = 'expired',
        payment_status = 'expired',
        updated_at     = NOW()
      WHERE id = ANY($1::uuid[])
      RETURNING id
    `, [ids]);

    log(`✅ ${updateResult.rowCount} order berhasil di-expire`);

    // 3. Kirim notif Telegram
    const formatRupiah = (n) => 'Rp ' + parseFloat(n).toLocaleString('id-ID');

    let msg = `🕐 <b>Segawon — Order Expired</b>\n\n`;
    msg += `<b>${expired.length} order</b> telah kadaluarsa (tidak dibayar dalam 24 jam):\n\n`;

    // Group by game
    const grouped = {};
    expired.forEach(o => {
      const key = o.game_name || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(o);
    });

    Object.entries(grouped).forEach(([game, orders]) => {
      msg += `<b>🎮 ${game}</b>\n`;
      orders.forEach(o => {
        msg += `  • ${o.order_number} — ${o.product_name} (${formatRupiah(o.amount)})\n`;
      });
      msg += '\n';
    });

    msg += `🕐 ${now()}`;

    await sendTelegram(msg);
    log('Notif Telegram terkirim');

  } catch (err) {
    log(`❌ ERROR: ${err.message}`);
    console.error(err);
    // Kirim error ke Telegram juga
    try {
      await sendTelegram(`❌ <b>Expire Orders Error</b>\n\n${err.message}\n\n🕐 ${now()}`);
    } catch (_) {}
  } finally {
    await pool.end();
    log('=== Expire Orders Job DONE ===');
  }
}

expireOrders();