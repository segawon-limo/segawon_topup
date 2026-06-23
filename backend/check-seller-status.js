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

// ── Auto-reprice config ──────────────────────────────────────
// DRY_RUN=true  -> hitung & catat ke price_history (is_dry_run=true) + notif Telegram,
//                  TAPI TIDAK mengubah base_price/selling_price/profit_price.
// DRY_RUN=false -> benar-benar UPDATE harga.
const DRY_RUN = (process.env.AUTO_REPRICE_DRY_RUN ?? 'true') !== 'false';

const NOISE_THRESHOLD_RUPIAH  = parseFloat(process.env.REPRICE_NOISE_RUPIAH  ?? '300');
const NOISE_THRESHOLD_PERCENT = parseFloat(process.env.REPRICE_NOISE_PERCENT ?? '0.3'); // % dari base_price lama

const pool = new Pool({ connectionString: DB_URL });

function shouldReprice(oldBase, newBase) {
  const diff = Math.abs(newBase - oldBase);
  const threshold = Math.max(NOISE_THRESHOLD_RUPIAH, (oldBase * NOISE_THRESHOLD_PERCENT) / 100);
  return diff >= threshold;
}

// Hitung selling price baru sesuai pricing_mode produk — logic-nya sekarang
// di pricingFields.service.js (satu sumber kebenaran, dipakai juga oleh
// catalog.controller.js supaya manual edit & auto-reprice tidak divergen).
const { calculateNewSellingPrice } = require('./src/services/pricingFields.service');

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

  // 3b. Cek harga: HANYA untuk seller aktif (available)
  // Seller mati langsung OOS tanpa cek harga
  const availableSkus = available.map(p => p.buyer_sku_code);
  let priceMismatchActiveOnly = []; // seller aktif + harga naik → warning saja
  let priceDropped            = []; // seller aktif + harga turun → info saja
  if (availableSkus.length > 0) {
    const client0 = await pool.connect();
    try {
      const result = await client0.query(
        `SELECT p.id, p.sku, p.name, p.base_price, p.selling_price, p.profit_price,
                p.pricing_mode, p.margin_percent, p.fixed_profit_amount,
                g.name as game_name
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
        if (dfPrice > dbPrice) {
          priceMismatchActiveOnly.push({
            sku:       dbProd.sku,
            name:      dbProd.name,
            game_name: dbProd.game_name,
            db_price:  dbPrice,
            df_price:  dfPrice,
            diff:      dfPrice - dbPrice,
            product:   dbProd,
          });
        } else if (dfPrice < dbPrice) {
          priceDropped.push({
            sku:       dbProd.sku,
            name:      dbProd.name,
            game_name: dbProd.game_name,
            db_price:  dbPrice,
            df_price:  dfPrice,
            diff:      dbPrice - dfPrice,
            product:   dbProd,
          });
        }
      });
    } finally {
      client0.release();
    }
  }
  // unavailableSellerOnly = semua seller mati (tidak perlu filter lagi)
  const unavailableSellerOnly    = unavailable;
  console.log(`⚠️  Harga naik + seller aktif : ${priceMismatchActiveOnly.length} produk`);
  console.log(`💡 Harga turun (info)         : ${priceDropped.length} produk`);
  console.log(`🔴 Seller mati                : ${unavailableSellerOnly.length} produk (OOS)`);

  // 3c. Hitung auto-reprice untuk SEMUA produk yang cost-nya berubah (naik & turun),
  //     setelah lolos noise threshold. Tidak pernah mengubah produk yang datanya
  //     belum lengkap (margin_percent / fixed_profit_amount kosong) — itu masuk skippedRepricing.
  const repriceActions   = []; // { product, oldBase, newBase, oldSelling, newSelling, oldProfit, newProfit, trigger }
  const skippedRepricing = []; // { product, reason }

  [...priceMismatchActiveOnly, ...priceDropped].forEach(item => {
    const p = item.product;
    const oldBase = parseFloat(p.base_price);
    const newBase = item.df_price;

    if (!shouldReprice(oldBase, newBase)) return; // dianggap noise, tidak diapa-apakan

    const calc = calculateNewSellingPrice(p, newBase);
    if (calc.skip) {
      skippedRepricing.push({ product: p, reason: calc.reason, oldBase, newBase });
      return;
    }

    repriceActions.push({
      product:    p,
      oldBase,
      newBase,
      oldSelling: parseFloat(p.selling_price),
      newSelling: calc.newSelling,
      oldProfit:  parseFloat(p.profit_price),
      newProfit:  calc.newSelling - newBase,
      trigger:    newBase > oldBase ? 'auto_cron_increase' : 'auto_cron_decrease',
    });
  });

  console.log(`💰 Auto-reprice akan dijalankan untuk: ${repriceActions.length} produk ${DRY_RUN ? '(DRY RUN — tidak benar-benar update)' : '(LIVE)'}`);
  console.log(`⏭️  Dilewati (data pricing belum lengkap): ${skippedRepricing.length} produk`);

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

    // Set true untuk semua yang seller aktif (harga naik tapi aktif tetap true)
    if (available.length > 0) {
      const skus = available.map(p => p.buyer_sku_code);
      await client.query(
        `UPDATE products SET seller_available = true, updated_at = NOW() WHERE sku = ANY($1)`,
        [skus]
      );
      console.log(`📝 Set seller_available=true untuk ${skus.length} SKU`);
    }

    // Update seller_price_warning:
    // - TRUE  untuk produk aktif yang harga Digiflazz > base_price (harga modal)
    // - FALSE untuk semua SKU yang harganya sudah normal / seller mati (OOS sudah cukup)
    const warnSkus = priceMismatchActiveOnly.map(p => p.sku);
    if (warnSkus.length > 0) {
      await client.query(
        `UPDATE products SET seller_price_warning = true,  updated_at = NOW() WHERE sku = ANY($1)`,
        [warnSkus]
      );
      console.log(`⚠️  Set seller_price_warning=true untuk ${warnSkus.length} SKU`);
    }
    // Reset warning untuk SKU yang sudah tidak bermasalah (harga normal kembali)
    const allCheckedSkus = [...available.map(p => p.buyer_sku_code), ...unavailable.map(p => p.buyer_sku_code)];
    if (allCheckedSkus.length > 0) {
      await client.query(
        `UPDATE products SET seller_price_warning = false, updated_at = NOW()
         WHERE sku = ANY($1) AND sku != ALL($2)`,
        [allCheckedSkus, warnSkus.length > 0 ? warnSkus : ['']]
      );
      console.log(`✅ Reset seller_price_warning=false untuk SKU yang harganya sudah normal`);
    }

    // 4b. Eksekusi auto-reprice (atau cuma catat kalau DRY_RUN)
    for (const action of repriceActions) {
      await client.query(
        `INSERT INTO price_history
           (product_id, sku, old_base_price, new_base_price,
            old_selling_price, new_selling_price, old_profit_price, new_profit_price,
            pricing_mode, digiflazz_price_at_trigger, trigger_source, is_dry_run)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          action.product.id, action.product.sku, action.oldBase, action.newBase,
          action.oldSelling, action.newSelling, action.oldProfit, action.newProfit,
          action.product.pricing_mode, action.newBase, action.trigger, DRY_RUN,
        ]
      );

      if (!DRY_RUN) {
        await client.query(
          `UPDATE products
           SET base_price = $1, selling_price = $2, profit_price = $3, updated_at = NOW()
           WHERE id = $4`,
          [action.newBase, action.newSelling, action.newProfit, action.product.id]
        );
      }
    }
    if (repriceActions.length > 0) {
      console.log(`${DRY_RUN ? '📝 [DRY RUN] Dicatat' : '✅ Diterapkan'} reprice untuk ${repriceActions.length} produk`);
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
    // Pecah jadi beberapa pesan jika terlalu panjang (Telegram limit 4096 char)
    if (priceMismatchActiveOnly.length > 0) {
      const CHUNK = 20; // max produk per pesan
      const total = priceMismatchActiveOnly.length;
      const pages = Math.ceil(total / CHUNK);
      for (let i = 0; i < pages; i++) {
        const slice = priceMismatchActiveOnly.slice(i * CHUNK, (i + 1) * CHUNK);
        const pageInfo = pages > 1 ? ` (${i + 1}/${pages})` : '';
        let warnMsg = `⚠️ <b>Segawon Monitor — Harga Naik${pageInfo}</b>\n\n`;
        warnMsg += `<b>${total} produk</b> harga Digiflazz naik.\n\n`;
        slice.forEach(p => {
          const acted   = repriceActions.find(a => a.product.sku === p.sku);
          const skipped = skippedRepricing.find(s => s.product.sku === p.sku);
          warnMsg += `• <b>${p.name}</b> (${p.sku})\n`;
          warnMsg += `  Cost: ${formatRupiah(p.db_price)} → ${formatRupiah(p.df_price)} (📈 +${formatRupiah(p.diff)})\n`;
          if (acted) {
            warnMsg += `  ${DRY_RUN ? '🧪 [DRY RUN] akan' : '✅'} reprice jual: ${formatRupiah(acted.oldSelling)} → ${formatRupiah(acted.newSelling)}\n\n`;
          } else if (skipped) {
            warnMsg += `  ⏭️ DILEWATI — ${skipped.reason}, perlu isi manual di Catalog\n\n`;
          } else {
            warnMsg += `  ℹ️ Selisih masih di bawah ambang batas, tidak direprice\n\n`;
          }
        });
        warnMsg += `🕐 ${now()}`;
        await safeSendTelegram(warnMsg, `harga-naik-${i+1}`);
        if (i < pages - 1) await new Promise(r => setTimeout(r, 1000)); // delay 1s antar chunk
      }
      console.log('📨 Notif Telegram harga naik:', total, 'produk');
    }

    // Seller mati sudah masuk OOS Alert di bawah — tidak perlu notif terpisah

    if (priceDropped.length > 0) {
      let dropMsg = `💡 <b>Segawon Monitor — Harga Turun</b>\n\n`;
      dropMsg += `Ditemukan <b>${priceDropped.length} produk</b> dengan harga Digiflazz lebih murah:\n\n`;
      priceDropped.forEach(p => {
        const acted   = repriceActions.find(a => a.product.sku === p.sku);
        const skipped = skippedRepricing.find(s => s.product.sku === p.sku);
        dropMsg += `• <b>${p.name}</b> (${p.sku})\n`;
        dropMsg += `  Cost: ${formatRupiah(p.db_price)} → ${formatRupiah(p.df_price)} (📉 -${formatRupiah(p.diff)})\n`;
        if (acted) {
          dropMsg += `  ${DRY_RUN ? '🧪 [DRY RUN] akan' : '✅'} reprice jual: ${formatRupiah(acted.oldSelling)} → ${formatRupiah(acted.newSelling)}\n\n`;
        } else if (skipped) {
          dropMsg += `  ⏭️ DILEWATI — ${skipped.reason}\n\n`;
        } else {
          dropMsg += `  ℹ️ Selisih masih di bawah ambang batas, tidak direprice\n\n`;
        }
      });
      dropMsg += `🕐 ${now()}`;
      await safeSendTelegram(dropMsg, 'harga-turun');
      console.log('📨 Notif Telegram harga turun terkirim:', priceDropped.length, 'produk');
    }

    if (unavailableSellerOnly.length === 0 && priceMismatchActiveOnly.length === 0) {
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