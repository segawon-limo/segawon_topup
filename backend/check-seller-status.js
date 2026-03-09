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

function httpsPost(hostname, path, payload, timeoutMs = 30000) {
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

    // Timeout — jangan tunggu selamanya
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timeout setelah ${timeoutMs / 1000}s`));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Retry wrapper — coba ulang N kali dengan jeda
async function httpsPostWithRetry(hostname, path, payload, { retries = 3, delayMs = 5000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await httpsPost(hostname, path, payload);
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️  Attempt ${attempt}/${retries} gagal: ${err.message}`);
      if (attempt < retries) {
        console.log(`   Retry dalam ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
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
  }, 10000); // timeout 10 detik untuk Telegram
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
    const res = await httpsPostWithRetry('api.digiflazz.com', '/v1/price-list', {
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

  // 3b. Cek harga: bandingkan price Digiflazz dengan base_price di DB
  const availableSkus = available.map(p => p.buyer_sku_code);
  let priceMismatch = [];
  if (availableSkus.length > 0) {
    const client0 = await pool.connect();
    try {
      const result = await client0.query(
        `SELECT p.sku, p.name, p.base_price, g.name as game_name
         FROM products p
         LEFT JOIN games g ON p.game_id = g.id
         WHERE p.sku = ANY($1) AND p.base_price IS NOT NULL`,
        [availableSkus]
      );
      result.rows.forEach(dbProd => {
        const dfProd = available.find(p => p.buyer_sku_code === dbProd.sku);
        if (!dfProd) return;
        const dbPrice = parseFloat(dbProd.base_price);
        const dfPrice = parseFloat(dfProd.price);
        if (dbPrice !== dfPrice) {
          priceMismatch.push({
            sku:       dbProd.sku,
            name:      dbProd.name,
            game_name: dbProd.game_name,
            db_price:  dbPrice,
            df_price:  dfPrice,
            diff:      dfPrice - dbPrice,
          });
        }
      });
    } finally {
      client0.release();
    }
  }
  console.log(`⚠️  Harga tidak sinkron: ${priceMismatch.length} produk`);

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
    // Notif harga mismatch (terpisah dari unavailable)
    if (priceMismatch.length > 0) {
      let priceMsg = `⚠️ <b>Segawon Monitor — Harga Tidak Sinkron</b>\n\n`;
      priceMsg += `Ditemukan <b>${priceMismatch.length} produk</b> dengan harga Digiflazz berbeda dari DB:\n\n`;
      priceMismatch.forEach(p => {
        const arrow = p.diff > 0 ? '📈 naik' : '📉 turun';
        priceMsg += `• <b>${p.name}</b> (${p.sku})\n`;
        priceMsg += `  DB: ${formatRupiah(p.db_price)} → Digiflazz: ${formatRupiah(p.df_price)} (${arrow} ${formatRupiah(Math.abs(p.diff))})\n\n`;
      });
      priceMsg += `⚠️ Segera update harga di DB atau Catalog!\n`;
      priceMsg += `🕐 ${now()}`;
      await sendTelegram(priceMsg);
      console.log('📨 Notif Telegram harga mismatch terkirim:', priceMismatch.length, 'produk');
    }

    if (unavailable.length === 0) {
      const allOkMsg = priceMismatch.length === 0
        ? `✅ <b>Segawon Monitor</b>\n\nSemua produk Games/Voucher/PLN <b>available</b> dan harga <b>sinkron</b>!\n\n🕐 ${now()}`
        : null;
      if (allOkMsg) {
        await sendTelegram(allOkMsg);
        console.log('📨 Notif Telegram: semua available dan harga sinkron');
      }
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