/**
 * check-seller-status.js
 * Cron: 0 0,12 * * *
 * - Fetch price-list Digiflazz
 * - Filter Games/Voucher/PLN yang seller unavailable
 * - Update DB products.seller_available
 * - Kirim notif Telegram
 */

require('dotenv').config();
const https    = require('https');
const crypto   = require('crypto');
const { Pool } = require('pg');

const USERNAME  = process.env.DIGIFLAZZ_USERNAME;
const API_KEY   = process.env.DIGIFLAZZ_PRODUCTION_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
const DB_URL    = process.env.DATABASE_URL;

const MONITORED_CATEGORIES = ['Games', 'Voucher', 'PLN'];

const pool = new Pool({ connectionString: DB_URL });

// ── Helpers ──────────────────────────────────────────────────

function httpsPost(hostname, path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sendTelegram(message) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diset');
    return Promise.resolve();
  }
  return httpsPost('api.telegram.org', `/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML',
  });
}

function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function now() {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`\n[${now()}] 🔍 Memulai pengecekan seller status Digiflazz...`);

  // 1. Fetch price-list dari Digiflazz
  const sign = crypto.createHash('md5')
    .update(USERNAME + API_KEY + 'pricelist')
    .digest('hex');

  let priceList;
  try {
    const res = await httpsPost('api.digiflazz.com', '/v1/price-list', {
      cmd: 'prepaid', username: USERNAME, sign,
    });
    priceList = res.data || [];
    console.log(`✅ Berhasil fetch ${priceList.length} produk dari Digiflazz`);
  } catch (err) {
    console.error('❌ Gagal fetch Digiflazz:', err.message);
    await sendTelegram(`❌ <b>Segawon Monitor</b>\nGagal fetch price-list Digiflazz!\nError: ${err.message}\nWaktu: ${now()}`);
    process.exit(1);
  }

  // 2. Filter hanya category yang dimonitor
  const monitored = priceList.filter(p => MONITORED_CATEGORIES.includes(p.category));
  console.log(`📋 Produk di kategori ${MONITORED_CATEGORIES.join('/')}: ${monitored.length}`);

  // 3. Pisahkan available vs unavailable
  const unavailable = monitored.filter(p => !p.seller_product_status);
  const available   = monitored.filter(p => p.seller_product_status);

  console.log(`🔴 Seller unavailable: ${unavailable.length}`);
  console.log(`🟢 Seller available  : ${available.length}`);

  // 4. Update DB
  const client = await pool.connect();
  try {
    // Set false untuk yang unavailable
    if (unavailable.length > 0) {
      const skus = unavailable.map(p => p.buyer_sku_code);
      await client.query(
        `UPDATE products SET seller_available = false, updated_at = NOW() WHERE sku = ANY($1)`,
        [skus]
      );
      console.log(`📝 Set seller_available=false untuk ${skus.length} SKU`);
    }

    // Set true untuk yang available (pulih)
    if (available.length > 0) {
      const skus = available.map(p => p.buyer_sku_code);
      await client.query(
        `UPDATE products SET seller_available = true, updated_at = NOW() WHERE sku = ANY($1)`,
        [skus]
      );
      console.log(`📝 Set seller_available=true untuk ${skus.length} SKU`);
    }

    // Ambil detail produk yang unavailable dari DB (untuk notif lebih informatif)
    let dbUnavailable = [];
    if (unavailable.length > 0) {
      const skus = unavailable.map(p => p.buyer_sku_code);
      const result = await client.query(
        `SELECT p.name, p.sku, p.selling_price, g.name as game_name
         FROM products p
         LEFT JOIN games g ON p.game_id = g.id
         WHERE p.sku = ANY($1)
         ORDER BY g.name, p.name`,
        [skus]
      );
      dbUnavailable = result.rows;
    }

    // 5. Kirim notif Telegram
    if (unavailable.length === 0) {
      const msg = `✅ <b>Segawon Monitor</b>\n\nSemua produk Games/Voucher/PLN <b>available</b>!\n\n🕐 ${now()}`;
      await sendTelegram(msg);
      console.log('📨 Notif Telegram: semua available');
    } else {
      // Group by game/brand
      const grouped = {};
      unavailable.forEach(p => {
        const key = p.brand;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      });

      let msg = `🔴 <b>Segawon Monitor — Out of Stock Alert</b>\n\n`;
      msg += `Ditemukan <b>${unavailable.length} produk</b> dengan seller tidak aktif:\n\n`;

      Object.entries(grouped).forEach(([brand, products]) => {
        msg += `<b>📦 ${brand}</b>\n`;
        products.forEach(p => {
          // Cari di DB untuk nama & harga jual kita
          const dbProd = dbUnavailable.find(d => d.sku === p.buyer_sku_code);
          const nama   = dbProd ? dbProd.name : p.product_name;
          const harga  = dbProd ? formatRupiah(dbProd.selling_price) : formatRupiah(p.price);
          msg += `  • ${nama} (${p.buyer_sku_code}) — ${harga}\n`;
          msg += `    Seller: ${p.seller_name}\n`;
        });
        msg += '\n';
      });

      msg += `⚠️ Segera ganti seller di dashboard Digiflazz!\n`;
      msg += `🕐 ${now()}`;

      await sendTelegram(msg);
      console.log('📨 Notif Telegram terkirim:', unavailable.length, 'produk unavailable');
    }

  } finally {
    client.release();
    await pool.end();
  }

  console.log(`✅ Selesai!\n`);
}

main().catch(async (err) => {
  console.error('❌ Fatal error:', err);
  await sendTelegram(`❌ <b>Segawon Monitor</b>\nFatal error saat cek seller!\n${err.message}\n🕐 ${now()}`).catch(() => {});
  process.exit(1);
});