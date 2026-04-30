/**
 * telegram.controller.js
 * Handles Telegram webhook for bot commands
 *
 * Commands:
 *   /update_stock  — Set semua OOS produk → Ready
 *   /status        — Lihat jumlah Ready vs OOS
 *   /topup         — Manual topup ke Digiflazz (multi-step)
 *   /cancel        — Batalkan sesi /topup yang sedang berjalan
 *   /help          — Daftar perintah
 */

const https           = require('https');
const { Pool }        = require('pg');
const digiflazz       = require('../services/digiflazz.service');

const pool      = new Pool({ connectionString: process.env.DATABASE_URL });
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

// ── Session state (in-memory, cukup untuk 1 admin) ────────────
// { [chatId]: { step: 'sku'|'customer'|'confirm', sku, customerNo } }
const sessions = {};

// ── Helpers ───────────────────────────────────────────────────
function sendMessage(chatId, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function now() {
  return new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRupiah(num) {
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function httpsPost(hostname, path, payload, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Timeout ${timeoutMs / 1000}s`)));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function genOrderNumber() {
  const rand = Math.random().toString(36).substring(2, 4).toUpperCase();
  const tail = Date.now().toString().slice(-3);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SGW-${date}-${rand}${tail}`;
}

// ── Command: /update_stock ────────────────────────────────────
async function handleUpdateStock(chatId) {
  try {
    const oosResult = await pool.query(`
      SELECT p.name, p.sku, g.name as game_name
      FROM products p
      LEFT JOIN games g ON g.id = p.game_id
      WHERE p.seller_available = false
      ORDER BY g.name, p.name
    `);

    if (oosResult.rows.length === 0) {
      await sendMessage(chatId, `✅ <b>Update Stock</b>\n\nTidak ada produk yang Out of Stock saat ini.\n🕐 ${now()}`);
      return;
    }

    const count = oosResult.rows.length;
    await pool.query(`UPDATE products SET seller_available = true, updated_at = NOW() WHERE seller_available = false`);

    const grouped = {};
    oosResult.rows.forEach(p => {
      if (!grouped[p.game_name]) grouped[p.game_name] = [];
      grouped[p.game_name].push(p);
    });

    let msg = `✅ <b>Stock berhasil diperbarui!</b>\n\n<b>${count} produk</b> dikembalikan ke status Ready:\n\n`;
    Object.entries(grouped).forEach(([game, products]) => {
      msg += `<b>📦 ${game}</b>\n`;
      products.forEach(p => { msg += `  • ${p.name} (${p.sku})\n`; });
      msg += '\n';
    });
    msg += `🕐 ${now()}`;

    await sendMessage(chatId, msg);
  } catch (err) {
    await sendMessage(chatId, `❌ Gagal update stock: ${err.message}`);
  }
}

// ── Command: /status ──────────────────────────────────────────
async function handleStatus(chatId) {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE seller_available = true)  as ready,
        COUNT(*) FILTER (WHERE seller_available = false) as oos,
        COUNT(*) as total
      FROM products WHERE is_active = true
    `);
    const { ready, oos, total } = result.rows[0];
    await sendMessage(chatId,
      `📊 <b>Status Produk</b>\n\n` +
      `✅ Ready         : <b>${ready}</b> produk\n` +
      `⚠️ Out of Stock  : <b>${oos}</b> produk\n` +
      `📦 Total         : <b>${total}</b> produk\n\n` +
      `🕐 ${now()}`
    );
  } catch (err) {
    await sendMessage(chatId, `❌ Gagal cek status: ${err.message}`);
  }
}

// ── Command: /help ────────────────────────────────────────────
// ── Command: /warning_prices ──────────────────────────────────
async function handleWarningPrices(chatId) {
  try {
    const result = await pool.query(`
      SELECT p.name, p.sku, p.base_price, g.name as game_name
      FROM products p
      LEFT JOIN games g ON g.id = p.game_id
      WHERE p.seller_price_warning = true
      ORDER BY g.name, p.name
    `);

    if (result.rows.length === 0) {
      await sendMessage(chatId,
        `✅ <b>Harga Seller</b>\n\n` +
        `Tidak ada produk dengan harga Digiflazz lebih tinggi dari harga modal saat ini.\n\n` +
        `🕐 ${now()}`
      );
      return;
    }

    // Fetch harga aktual Digiflazz untuk tampilkan selisih
    const crypto = require('crypto');
    const USERNAME = process.env.DIGIFLAZZ_USERNAME;
    const API_KEY  = process.env.DIGIFLAZZ_PRODUCTION_KEY;
    let priceMap = {};
    try {
      const sign = crypto.createHash('md5').update(USERNAME + API_KEY + 'pricelist').digest('hex');
      const dfRes = await httpsPost('api.digiflazz.com', '/v1/price-list', {
        cmd: 'pricelist', username: USERNAME, sign,
      }, 20000);
      const list = Array.isArray(dfRes) ? dfRes : (dfRes?.data?.data || dfRes?.data || []);
      list.forEach(p => { priceMap[p.buyer_sku_code] = parseFloat(p.price); });
    } catch (e) {
      // Lanjut tanpa data DF — tampilkan tanpa selisih
    }

    const grouped = {};
    result.rows.forEach(p => {
      if (!grouped[p.game_name]) grouped[p.game_name] = [];
      grouped[p.game_name].push(p);
    });

    const total = result.rows.length;
    const CHUNK = 20;
    const entries = Object.entries(grouped);
    let chunk = [];
    let chunkIdx = 1;

    const flushChunk = async (rows, isFirst) => {
      let msg = isFirst
        ? `🔴 <b>Harga Seller Naik</b> — ${total} produk\n\n`
        : `🔴 <b>Harga Seller Naik</b> (lanjutan)\n\n`;

      rows.forEach(([game, prods]) => {
        msg += `<b>📦 ${game}</b>\n`;
        prods.forEach(p => {
          const dbPrice = parseFloat(p.base_price);
          const dfPrice = priceMap[p.sku];
          if (dfPrice && dfPrice > dbPrice) {
            const diff = dfPrice - dbPrice;
            msg += `  • ${p.name} <code>(${p.sku})</code>\n`;
            msg += `    Modal: ${formatRupiah(dbPrice)} → DF: ${formatRupiah(dfPrice)} <b>(+${formatRupiah(diff)})</b>\n`;
          } else {
            msg += `  • ${p.name} <code>(${p.sku})</code> — modal: ${formatRupiah(dbPrice)}\n`;
          }
        });
        msg += '\n';
      });

      if (isFirst) {
        msg += `💡 Setelah update harga modal di catalog, ketik /reset_warnings untuk hapus flag.\n`;
        msg += `🕐 ${now()}`;
      }
      await sendMessage(chatId, msg);
    };

    let rowCount = 0;
    let isFirst = true;
    for (const [game, prods] of entries) {
      chunk.push([game, prods]);
      rowCount += prods.length;
      if (rowCount >= CHUNK) {
        await flushChunk(chunk, isFirst);
        isFirst = false;
        chunk = [];
        rowCount = 0;
      }
    }
    if (chunk.length > 0) await flushChunk(chunk, isFirst);

  } catch (err) {
    await sendMessage(chatId, `❌ Gagal cek warning harga: ${err.message}`);
  }
}

// ── Command: /reset_warnings ──────────────────────────────────
async function handleResetWarnings(chatId) {
  try {
    const check = await pool.query(`
      SELECT COUNT(*) as count FROM products WHERE seller_price_warning = true
    `);
    const count = parseInt(check.rows[0].count);

    if (count === 0) {
      await sendMessage(chatId,
        `✅ <b>Reset Warning</b>\n\n` +
        `Tidak ada produk dengan flag harga naik saat ini.\n\n` +
        `🕐 ${now()}`
      );
      return;
    }

    // Ambil daftar sebelum reset (untuk laporan)
    const before = await pool.query(`
      SELECT p.name, p.sku, g.name as game_name
      FROM products p
      LEFT JOIN games g ON g.id = p.game_id
      WHERE p.seller_price_warning = true
      ORDER BY g.name, p.name
    `);

    await pool.query(`
      UPDATE products
      SET seller_price_warning = false, updated_at = NOW()
      WHERE seller_price_warning = true
    `);

    const grouped = {};
    before.rows.forEach(p => {
      if (!grouped[p.game_name]) grouped[p.game_name] = [];
      grouped[p.game_name].push(p);
    });

    let msg = `✅ <b>Warning harga berhasil direset!</b>\n\n<b>${count} produk</b> flag-nya dihapus:\n\n`;
    Object.entries(grouped).forEach(([game, prods]) => {
      msg += `<b>📦 ${game}</b>\n`;
      prods.forEach(p => { msg += `  • ${p.name} <code>(${p.sku})</code>\n`; });
      msg += '\n';
    });
    msg += `⚠️ Pastikan kamu sudah update <b>harga modal & harga jual</b> di catalog.\n`;
    msg += `Flag akan muncul lagi saat cron berikutnya jika harga DF masih lebih tinggi.\n\n`;
    msg += `🕐 ${now()}`;

    await sendMessage(chatId, msg);
  } catch (err) {
    await sendMessage(chatId, `❌ Gagal reset warnings: ${err.message}`);
  }
}

// ── Command: /help ────────────────────────────────────────────
async function handleHelp(chatId) {
  await sendMessage(chatId,
    `🤖 <b>Segawon Monitor Bot</b>\n\n` +
    `Perintah yang tersedia:\n\n` +
    `🔄 /update_stock — Set semua produk OOS → Ready\n` +
    `🔴 /warning_prices — Lihat produk dengan harga Digiflazz lebih tinggi dari modal\n` +
    `✅ /reset_warnings — Reset flag harga naik setelah update harga di catalog\n` +
    `📊 /status — Lihat jumlah produk Ready vs OOS\n` +
    `💳 /topup — Manual topup via Digiflazz\n` +
    `🚫 /cancel — Batalkan sesi topup\n` +
    `❓ /help — Tampilkan pesan ini\n\n` +
    `Bot ini mengirim notif otomatis jam 00:00 dan 12:00 WIB.`
  );
}

// ── Command: /topup (multi-step) ──────────────────────────────
async function handleTopup(chatId) {
  sessions[chatId] = { step: 'sku' };
  await sendMessage(chatId,
    `💳 <b>Manual Topup</b>\n\n` +
    `Ketik /cancel kapan saja untuk membatalkan.\n\n` +
    `<b>Langkah 1/3</b>\n` +
    `Masukkan <b>SKU Digiflazz</b>:\n` +
    `<i>(contoh: PGM60, VLRNT475, FF100)</i>`
  );
}

async function handleTopupStep(chatId, text) {
  const session = sessions[chatId];

  // Step 1: Terima SKU
  if (session.step === 'sku') {
    const sku = text.trim().toUpperCase();

    // Validasi SKU ada di DB
    const result = await pool.query(
      `SELECT p.sku, p.name, p.selling_price, g.name as game_name
       FROM products p
       LEFT JOIN games g ON g.id = p.game_id
       WHERE UPPER(p.sku) = $1 AND p.is_active = true`,
      [sku]
    );

    if (result.rows.length === 0) {
      await sendMessage(chatId,
        `❌ SKU <code>${sku}</code> tidak ditemukan di database.\n\n` +
        `Coba lagi atau ketik /cancel untuk membatalkan.`
      );
      return; // tetap di step 'sku'
    }

    const product = result.rows[0];
    session.sku        = product.sku;
    session.productName = product.name;
    session.gameName   = product.game_name;
    session.price      = product.selling_price;
    session.step       = 'customer';

    await sendMessage(chatId,
      `✅ Produk ditemukan:\n` +
      `🎮 <b>${product.game_name}</b> — ${product.name}\n` +
      `💰 Harga Modal: Rp ${parseFloat(product.selling_price).toLocaleString('id-ID')}\n\n` +
      `<b>Langkah 2/3</b>\n` +
      `Masukkan <b>Nomor Customer / User ID</b>:`
    );
    return;
  }

  // Step 2: Terima Customer No
  if (session.step === 'customer') {
    const customerNo = text.trim();

    if (!customerNo || customerNo.length < 3) {
      await sendMessage(chatId, `❌ Nomor customer tidak valid. Coba lagi:`);
      return;
    }

    session.customerNo = customerNo;
    session.step       = 'confirm';

    await sendMessage(chatId,
      `<b>Langkah 3/3 — Konfirmasi</b>\n\n` +
      `⚠️ Periksa data berikut sebelum melanjutkan:\n\n` +
      `🎮 Game      : <b>${session.gameName}</b>\n` +
      `📦 Produk    : <b>${session.productName}</b>\n` +
      `🔑 SKU       : <code>${session.sku}</code>\n` +
      `👤 Customer  : <code>${session.customerNo}</code>\n\n` +
      `Ketik <b>YA</b> untuk eksekusi topup\n` +
      `Ketik <b>BATAL</b> atau /cancel untuk membatalkan`
    );
    return;
  }

  // Step 3: Konfirmasi
  if (session.step === 'confirm') {
    const answer = text.trim().toUpperCase();

    if (answer === 'BATAL' || answer === 'CANCEL' || answer === 'TIDAK') {
      delete sessions[chatId];
      await sendMessage(chatId, `🚫 Topup dibatalkan.`);
      return;
    }

    if (answer !== 'YA') {
      await sendMessage(chatId, `❓ Ketik <b>YA</b> untuk lanjut atau <b>BATAL</b> untuk membatalkan.`);
      return;
    }

    // Eksekusi topup
    session.step = 'processing';
    await sendMessage(chatId, `⏳ Memproses topup ke Digiflazz...`);

    try {
      const orderNumber = genOrderNumber();
      const result = await digiflazz.createTransaction({
        sku:         session.sku,
        customerNo:  session.customerNo,
        orderNumber,
      });

      delete sessions[chatId];

      if (result.success && (result.data?.rc === '00' || result.data?.status === 'Sukses')) {
        await sendMessage(chatId,
          `✅ <b>Topup Berhasil!</b>\n\n` +
          `🎮 ${session.gameName} — ${session.productName}\n` +
          `👤 Customer  : <code>${session.customerNo}</code>\n` +
          `🔑 SKU       : <code>${session.sku}</code>\n` +
          `📋 Order No  : <code>${orderNumber}</code>\n` +
          `🎫 SN        : <code>${result.data?.sn || '-'}</code>\n\n` +
          `🕐 ${now()}`
        );
      } else {
        const reason = result.data?.message || result.data?.rc || 'Unknown error';
        await sendMessage(chatId,
          `❌ <b>Topup Gagal!</b>\n\n` +
          `SKU      : <code>${session.sku}</code>\n` +
          `Customer : <code>${session.customerNo}</code>\n` +
          `Order No : <code>${orderNumber}</code>\n` +
          `Alasan   : ${reason}\n\n` +
          `🕐 ${now()}`
        );
      }
    } catch (err) {
      delete sessions[chatId];
      await sendMessage(chatId, `❌ Error saat topup: ${err.message}\n\n🕐 ${now()}`);
    }
  }
}

// ── Command: /cancel ──────────────────────────────────────────
async function handleCancel(chatId) {
  if (sessions[chatId]) {
    delete sessions[chatId];
    await sendMessage(chatId, `🚫 Sesi topup dibatalkan.`);
  } else {
    await sendMessage(chatId, `ℹ️ Tidak ada sesi aktif yang perlu dibatalkan.`);
  }
}

// ── Main webhook handler ──────────────────────────────────────
exports.handleWebhook = async (req, res) => {
  res.sendStatus(200); // Selalu 200 supaya Telegram tidak retry

  const update = req.body;
  if (!update?.message) return;

  const { message } = update;
  const chatId = message.chat.id.toString();
  const text   = (message.text || '').trim();

  // Security: hanya CHAT_ID terdaftar
  if (chatId !== CHAT_ID) {
    console.warn(`[Telegram] Akses ditolak dari chat_id: ${chatId}`);
    await sendMessage(chatId, '⛔ Kamu tidak punya akses ke bot ini.');
    return;
  }

  console.log(`[Telegram] Pesan: "${text}" dari ${chatId}`);

  const command = text.split(' ')[0].toLowerCase();

  // /cancel bisa interrupt sesi kapan saja
  if (command === '/cancel') {
    await handleCancel(chatId);
    return;
  }

  // Kalau ada sesi aktif → teruskan ke step handler
  if (sessions[chatId] && sessions[chatId].step !== 'processing') {
    // Command baru saat sesi aktif → tanya dulu
    if (text.startsWith('/') && command !== '/cancel') {
      await sendMessage(chatId,
        `⚠️ Kamu sedang dalam sesi /topup.\n` +
        `Ketik /cancel untuk membatalkan sesi, atau lanjutkan input.`
      );
      return;
    }
    await handleTopupStep(chatId, text);
    return;
  }

  // Normal command routing
  switch (command) {
    case '/topup':           await handleTopup(chatId);          break;
    case '/update_stock':    await handleUpdateStock(chatId);    break;
    case '/warning_prices':  await handleWarningPrices(chatId);  break;
    case '/reset_warnings':  await handleResetWarnings(chatId);  break;
    case '/status':          await handleStatus(chatId);         break;
    case '/help':
    case '/start':           await handleHelp(chatId);           break;
    default:
      await sendMessage(chatId,
        `❓ Perintah tidak dikenal: <code>${text}</code>\nKetik /help untuk daftar perintah.`
      );
  }
};

// ── Notifikasi order baru ─────────────────────────────────────
/**
 * Kirim notif ke Telegram saat order baru berhasil dibuat.
 * Dipanggil dari order.controller.js dan pascabayar.controller.js.
 *
 * @param {object} params
 * @param {string} params.orderNumber
 * @param {string} params.productName   - nama produk / provider pascabayar
 * @param {string} params.customerName
 * @param {string} params.customerEmail
 * @param {string|null} params.userId   - game user ID / nomor pelanggan
 * @param {string} params.paymentMethod
 * @param {number} params.amount        - harga produk sebelum diskon
 * @param {number} params.paymentFee
 * @param {number} params.total
 * @param {number} params.voucherDiscount
 * @param {string|null} params.voucherCode
 * @param {'topup'|'pascabayar'} params.orderType
 */
exports.notifyNewOrder = async (params) => {
  if (!BOT_TOKEN || !CHAT_ID) return; // Tidak ada konfigurasi Telegram → skip

  try {
    const {
      orderNumber, productName, customerName, customerEmail,
      userId, paymentMethod, amount, paymentFee,
      total, voucherDiscount = 0, voucherCode = null,
      orderType = 'topup',
    } = params;

    const fmt = (n) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`;

    const typeIcon = orderType === 'pascabayar' ? '🔌' : '🎮';
    const typeLabel = orderType === 'pascabayar' ? 'Pascabayar' : 'Top-Up';

    let msg =
      `${typeIcon} <b>Order Baru — ${typeLabel}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 <b>Order</b>  : <code>${orderNumber}</code>\n` +
      `📦 <b>Produk</b>  : ${productName || '—'}\n`;

    if (userId) {
      const userLabel = orderType === 'pascabayar' ? 'No. Pelanggan' : 'User ID';
      msg += `👤 <b>${userLabel}</b>: <code>${userId}</code>\n`;
    }

    msg +=
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Customer</b> : ${customerName || '—'}\n` +
      `📧 <b>Email</b>    : ${customerEmail || '—'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 <b>Harga</b>    : ${fmt(amount)}\n`;

    if (voucherDiscount > 0) {
      msg += `🎫 <b>Voucher</b>   : -${fmt(voucherDiscount)}${voucherCode ? ` (${voucherCode})` : ''}\n`;
    }

    msg +=
      `🏦 <b>Biaya</b>    : ${fmt(paymentFee)}\n` +
      `💳 <b>Total</b>    : <b>${fmt(total)}</b>\n` +
      `💳 <b>Payment</b>  : ${paymentMethod}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🕐 ${now()}`;

    await sendMessage(CHAT_ID, msg);
  } catch (err) {
    // Jangan sampai error notif menggangu flow order
    console.error('[Telegram] notifyNewOrder error:', err.message);
  }
};

// ── Register webhook ke Telegram ──────────────────────────────
exports.registerWebhook = async (req, res) => {
  const domain     = process.env.APP_URL || 'https://segawontopup.net';
  const webhookUrl = `${domain}/api/telegram/webhook`;

  try {
    // 1. Set webhook URL
    const webhookResult = await httpsPost('api.telegram.org', `/bot${BOT_TOKEN}/setWebhook`, {
      url: webhookUrl,
    });
    console.log('[Telegram] setWebhook result:', webhookResult);

    // 2. Daftarkan daftar command supaya menu "/" di Telegram ikut update
    const commandsResult = await httpsPost('api.telegram.org', `/bot${BOT_TOKEN}/setMyCommands`, {
      commands: [
        { command: 'update_stock',   description: 'Set semua produk OOS → Ready' },
        { command: 'warning_prices', description: 'Produk dengan harga Digiflazz lebih tinggi dari modal' },
        { command: 'reset_warnings', description: 'Reset flag harga naik setelah update harga di catalog' },
        { command: 'status',         description: 'Lihat jumlah produk Ready vs OOS' },
        { command: 'topup',          description: 'Manual topup via Digiflazz' },
        { command: 'help',           description: 'Tampilkan daftar perintah' },
      ],
    });
    console.log('[Telegram] setMyCommands result:', commandsResult);

    res.json({
      success: webhookResult.ok && commandsResult.ok,
      webhook: webhookResult,
      commands: commandsResult,
    });
  } catch (err) {
    console.error('[Telegram] registerWebhook error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};