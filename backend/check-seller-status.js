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
  }, 15000); // timeout 15 detik untuk Telegram
}

// Wrapper aman — gagal kirim tidak membunuh proses utama
async function safeSendTelegram(message, label = '') {
  try {
    await sendTelegram(message);
  } catch (err) {
    console.warn(`⚠️  Gagal kirim Telegram${label ? ' (' + label + ')' : ''}: ${err.message}`);
    // Coba sekali lagi setelah 5 detik
    await new Promise(r => setTimeout(r, 5000));
    try {
      await sendTelegram(message);
      console.log(`✅ Retry Telegram berhasil${label ? ' (' + label + ')' : ''}`);
    } catch (err2) {
      console.error(`❌ Retry Telegram gagal${label ? ' (' + label + ')' : ''}: ${err2.message}`);
    }
  }
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
    // Handle semua kemungkinan struktur response
    if (Array.isArray(res)) {
      priceList = res;                  // response langsung array
    } else if (Array.isArray(res?.data)) {
      priceList = res.data;             // { data: [...] }
    } else if (Array.isArray(res?.data?.data)) {
      priceList = res.data.data;        // { data: { data: [...] } }
    } else if (res?.data?.rc && res?.data?.message) {
      // Rate limit atau error spesifik dari Digiflazz
      const rc      = res.data.rc;
      const message = res.data.message;
      console.warn(`⚠️  Digiflazz error rc=${rc}: ${message}`);
      // Kirim notif tapi JANGAN ubah status produk apapun
      await safeSendTelegram(
        `⏳ <b>Segawon Monitor — Digiflazz Rate Limit</b>\n\n` +
        `Pengecekan seller dibatalkan, tidak ada perubahan status produk.\n\n` +
        `🔴 RC: ${rc}\n` +
        `💬 Pesan: ${message}\n\n` +
        `⏰ Coba lagi beberapa saat lagi.\n` +
        `🕐 ${now()}`,
        'rate-limit'
      );
      return; // exit tanpa mengubah status apapun
    } else {
      console.error('❌ Struktur response tidak dikenali:', JSON.stringify(res).substring(0, 200));
      throw new Error('Response Digiflazz tidak mengandung array produk');
    }
    console.log(`✅ Berhasil fetch ${priceList.length} produk dari Digiflazz`);
  } catch (err) {
    console.error('❌ Gagal fetch Digiflazz:', err.message);
    await safeSendTelegram(`❌ <b>Segawon Monitor</b>\nGagal fetch price-list Digiflazz!\nError: ${err.message}\nWaktu: ${now()}`, 'fetch-error');
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
  // FIX: cek SEMUA produk monitored (available + unavailable), karena
  // seller tipe 'IP' atau yang harganya naik bisa masuk ke unavailable
  const allMonitoredSkus = monitored.map(p => p.buyer_sku_code);
  let priceMismatch = [];
  let priceDropped  = [];
  if (allMonitoredSkus.length > 0) {
    const client0 = await pool.connect();
    try {
      const result = await client0.query(
        `SELECT p.sku, p.name, p.base_price, g.name as game_name
         FROM products p
         LEFT JOIN games g ON p.game_id = g.id
         WHERE p.sku = ANY($1) AND p.base_price IS NOT NULL`,
        [allMonitoredSkus]
      );
      result.rows.forEach(dbProd => {
        // Cari di seluruh monitored (available + unavailable)
        const dfProd = monitored.find(p => p.buyer_sku_code === dbProd.sku);
        if (!dfProd) return;
        const dbPrice = parseFloat(dbProd.base_price);
        const dfPrice = parseFloat(dfProd.price);
        // Harga Digiflazz NAIK — berbahaya, set unavailable
        if (dfPrice > dbPrice) {
          priceMismatch.push({
            sku:           dbProd.sku,
            name:          dbProd.name,
            game_name:     dbProd.game_name,
            db_price:      dbPrice,
            df_price:      dfPrice,
            diff:          dfPrice - dbPrice,
            seller_active: dfProd.seller_product_status,
          });
        }
        // Harga Digiflazz TURUN — kita jual lebih mahal, warning saja
        else if (dfPrice < dbPrice) {
          priceDropped.push({
            sku:       dbProd.sku,
            name:      dbProd.name,
            game_name: dbProd.game_name,
            db_price:  dbPrice,
            df_price:  dfPrice,
            diff:      dbPrice - dfPrice,
          });
        }
      });
    } finally {
      client0.release();
    }
  }
  console.log(`⚠️  Harga naik (unavailable): ${priceMismatch.length} produk`);
  console.log(`💡 Harga turun (warning)   : ${priceDropped.length} produk`);

  // Pisahkan priceMismatch: seller aktif (warning saja) vs seller mati (OOS)
  const priceMismatchActiveOnly  = priceMismatch.filter(p => p.seller_active);   // warning, tetap bisa dibeli
  const priceMismatchSellerDead  = priceMismatch.filter(p => !p.seller_active);  // OOS, harga naik + seller mati

  // Pisahkan unavailable yang murni seller mati vs yang harganya naik
  const priceMismatchSkuSet = new Set(priceMismatch.map(p => p.sku));
  const unavailableSellerOnly = unavailable.filter(
    p => !priceMismatchSkuSet.has(p.buyer_sku_code)
  );
  console.log(`🔴 Seller mati (bukan harga)  : ${unavailableSellerOnly.length} produk`);
  console.log(`⚠️  Harga naik + seller aktif : ${priceMismatchActiveOnly.length} produk (warning only)`);
  console.log(`🔴 Harga naik + seller mati  : ${priceMismatchSellerDead.length} produk (OOS)`);

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
    // Exclude hanya yang harga naik + seller mati (mereka di-set false di bawah)
    // Yang harga naik tapi seller aktif tetap dibiarkan true (warning saja)
    if (available.length > 0) {
      const deadPriceMismatchSkus = new Set(priceMismatchSellerDead.map(p => p.sku));
      const skus = available
        .map(p => p.buyer_sku_code)
        .filter(sku => !deadPriceMismatchSkus.has(sku)); // jangan pulihkan yang harga naik + seller mati
      if (skus.length > 0) {
        // Hanya update produk yang memang ada di DB dengan seller=digiflazz
        // Gunakan WHERE sku = ANY($1) AND seller_type = 'digiflazz' agar
        // produk VipReseller/non-Digiflazz tidak tersentuh
        await client.query(
          `UPDATE products SET seller_available = true, updated_at = NOW()
           WHERE sku = ANY($1) AND (seller_type = 'digiflazz' OR seller_type IS NULL)`,
          [skus]
        );
        console.log(`📝 Set seller_available=true untuk ${skus.length} SKU (Digiflazz)`);
      }
    }

    // Set false HANYA untuk yang harga naik + seller mati
    // Yang harga naik tapi seller masih aktif: biarkan tetap available (warning saja)
    if (priceMismatchSellerDead.length > 0) {
      const skus = priceMismatchSellerDead.map(p => p.sku);
      await client.query(
        `UPDATE products SET seller_available = false, updated_at = NOW() WHERE sku = ANY($1)`,
        [skus]
      );
      console.log(`📝 Set seller_available=false untuk ${skus.length} SKU (harga naik + seller mati)`);
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
    // Notif harga naik + seller AKTIF — warning saja, produk masih bisa dibeli
    if (priceMismatchActiveOnly.length > 0) {
      let warnMsg = `⚠️ <b>Segawon Monitor — Warning Harga Naik</b>\n\n`;
      warnMsg += `<b>${priceMismatchActiveOnly.length} produk</b> harga Digiflazz naik, tapi seller masih aktif.\n`;
      warnMsg += `Produk <b>masih bisa dibeli</b>, namun margin kamu berkurang:\n\n`;
      priceMismatchActiveOnly.forEach(p => {
        warnMsg += `• <b>${p.name}</b> (${p.sku})\n`;
        warnMsg += `  Modal DB: ${formatRupiah(p.db_price)} → Digiflazz: ${formatRupiah(p.df_price)} (📈 naik ${formatRupiah(p.diff)})\n\n`;
      });
      warnMsg += `💡 Segera update harga modal & harga jual di DB!\n`;
      warnMsg += `🕐 ${now()}`;
      await safeSendTelegram(warnMsg, 'harga-naik-warning');
      console.log('📨 Notif Telegram warning harga naik (seller aktif):', priceMismatchActiveOnly.length, 'produk');
    }

    // Notif harga naik + seller MATI — produk sudah di-set OOS
    if (priceMismatchSellerDead.length > 0) {
      let priceMsg = `🔴 <b>Segawon Monitor — Harga Naik + Seller Mati!</b>\n\n`;
      priceMsg += `<b>${priceMismatchSellerDead.length} produk</b> harga naik DAN seller tidak aktif.\n`;
      priceMsg += `Produk sudah di-set <b>Out of Stock</b> otomatis:\n\n`;
      priceMismatchSellerDead.forEach(p => {
        priceMsg += `• <b>${p.name}</b> (${p.sku})\n`;
        priceMsg += `  Modal DB: ${formatRupiah(p.db_price)} → Digiflazz: ${formatRupiah(p.df_price)} (📈 naik ${formatRupiah(p.diff)})\n\n`;
      });
      priceMsg += `⚠️ Segera ganti seller & update harga modal di DB!\n`;
      priceMsg += `🕐 ${now()}`;
      await safeSendTelegram(priceMsg, 'harga-naik-OOS');
      console.log('📨 Notif Telegram harga naik + seller mati:', priceMismatchSellerDead.length, 'produk');
    }

    // Warning: harga Digiflazz turun, kita jual lebih mahal
    if (priceDropped.length > 0) {
      let dropMsg = `💡 <b>Segawon Monitor — Harga Bisa Diturunkan</b>\n\n`;
      dropMsg += `Ditemukan <b>${priceDropped.length} produk</b> dengan harga Digiflazz lebih murah dari DB kita:\n\n`;
      priceDropped.forEach(p => {
        dropMsg += `• <b>${p.name}</b> (${p.sku})\n`;
        dropMsg += `  DB: ${formatRupiah(p.db_price)} → Digiflazz: ${formatRupiah(p.df_price)} (📉 selisih ${formatRupiah(p.diff)})\n\n`;
      });
      dropMsg += `ℹ️ Produk tetap aktif, tidak ada tindakan otomatis.\n`;
      dropMsg += `💡 Pertimbangkan update harga jual agar lebih kompetitif.\n`;
      dropMsg += `🕐 ${now()}`;
      await safeSendTelegram(dropMsg, 'harga-turun');
      console.log('📨 Notif Telegram harga turun terkirim:', priceDropped.length, 'produk');
    }

    if (unavailableSellerOnly.length === 0 && priceMismatchSellerDead.length === 0) {
      if (priceDropped.length === 0) {
        const allOkMsg = `✅ <b>Segawon Monitor</b>\n\nSemua produk Games/Voucher/PLN <b>available</b> dan harga <b>tidak ada kenaikan</b>!\n\n🕐 ${now()}`;
        await safeSendTelegram(allOkMsg, 'all-ok');
        console.log('📨 Notif Telegram: semua available dan harga sinkron');
      }
      // Jika ada priceDropped, notif sudah dikirim di atas, tidak perlu all-ok
    } else {
      // Group by game/brand — hanya tampilkan yang seller mati (bukan harga naik)
      const grouped = {};
      unavailableSellerOnly.forEach(p => {
        const key = p.brand;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      });

      // Hanya kirim notif OOS jika memang ada seller yang mati
      if (unavailableSellerOnly.length > 0) {
      let msg = `🔴 <b>Segawon Monitor — Out of Stock Alert</b>\n\n`;
      msg += `Ditemukan <b>${unavailableSellerOnly.length} produk</b> dengan seller tidak aktif:\n\n`;

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

      await safeSendTelegram(msg, 'OOS-alert');
      console.log('📨 Notif Telegram OOS terkirim:', unavailableSellerOnly.length, 'produk');
      } // end if unavailableSellerOnly.length > 0
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