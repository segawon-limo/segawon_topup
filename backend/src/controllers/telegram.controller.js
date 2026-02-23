/**
 * telegram.controller.js
 * Handles Telegram webhook for bot commands
 */

const https    = require('https');
const { Pool } = require('pg');

const pool      = new Pool({ connectionString: process.env.DATABASE_URL });
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

// ── Send Telegram message ─────────────────────────────────────
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

// ── Command handlers ──────────────────────────────────────────

async function handleUpdateStock(chatId) {
  try {
    // Ambil list yang saat ini OOS
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

    // Update semua seller_available = true
    await pool.query(`
      UPDATE products SET seller_available = true, updated_at = NOW()
      WHERE seller_available = false
    `);

    // Format list produk yang dipulihkan
    const grouped = {};
    oosResult.rows.forEach(p => {
      if (!grouped[p.game_name]) grouped[p.game_name] = [];
      grouped[p.game_name].push(p);
    });

    let msg = `✅ <b>Stock berhasil diperbarui!</b>\n\n`;
    msg += `<b>${count} produk</b> dikembalikan ke status Ready:\n\n`;

    Object.entries(grouped).forEach(([game, products]) => {
      msg += `<b>📦 ${game}</b>\n`;
      products.forEach(p => {
        msg += `  • ${p.name} (${p.sku})\n`;
      });
      msg += '\n';
    });

    msg += `🕐 ${now()}`;

    await sendMessage(chatId, msg);
    console.log(`[Telegram] /update_stock: ${count} produk dipulihkan`);

  } catch (err) {
    console.error('[Telegram] handleUpdateStock error:', err);
    await sendMessage(chatId, `❌ Gagal update stock: ${err.message}`);
  }
}

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
      `✅ Ready    : <b>${ready}</b> produk\n` +
      `⚠️ Out of Stock : <b>${oos}</b> produk\n` +
      `📦 Total    : <b>${total}</b> produk\n\n` +
      `🕐 ${now()}`
    );
  } catch (err) {
    await sendMessage(chatId, `❌ Gagal cek status: ${err.message}`);
  }
}

async function handleHelp(chatId) {
  await sendMessage(chatId,
    `🤖 <b>Segawon Monitor Bot</b>\n\n` +
    `Perintah yang tersedia:\n\n` +
    `/update_stock — Set semua produk OOS → Ready\n` +
    `/status — Lihat jumlah produk Ready vs OOS\n` +
    `/help — Tampilkan pesan ini\n\n` +
    `Bot ini mengirim notif otomatis jam 00:00 dan 12:00 WIB.`
  );
}

// ── Main webhook handler ──────────────────────────────────────
exports.handleWebhook = async (req, res) => {
  // Selalu respond 200 ke Telegram supaya tidak retry
  res.sendStatus(200);

  const update = req.body;
  if (!update?.message) return;

  const { message } = update;
  const chatId  = message.chat.id.toString();
  const text    = message.text || '';

  // Security: hanya terima dari CHAT_ID yang terdaftar
  if (chatId !== CHAT_ID) {
    console.warn(`[Telegram] Pesan dari chat_id tidak dikenal: ${chatId}`);
    await sendMessage(chatId, '⛔ Kamu tidak punya akses ke bot ini.');
    return;
  }

  console.log(`[Telegram] Command: ${text} dari ${chatId}`);

  const command = text.split(' ')[0].toLowerCase();
  switch (command) {
    case '/update_stock': await handleUpdateStock(chatId); break;
    case '/status':       await handleStatus(chatId);      break;
    case '/help':
    case '/start':        await handleHelp(chatId);        break;
    default:
      await sendMessage(chatId, `❓ Perintah tidak dikenal: <code>${text}</code>\nKetik /help untuk daftar perintah.`);
  }
};

// ── Register webhook ke Telegram ──────────────────────────────
exports.registerWebhook = async (req, res) => {
  const domain = process.env.APP_URL || `https://segawontopup.net`;
  const webhookUrl = `${domain}/api/telegram/webhook`;

  const body = JSON.stringify({ url: webhookUrl });
  const apiReq = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/setWebhook`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, (apiRes) => {
    let data = '';
    apiRes.on('data', c => data += c);
    apiRes.on('end', () => {
      const result = JSON.parse(data);
      console.log('[Telegram] setWebhook result:', result);
      res.json({ success: result.ok, result });
    });
  });
  apiReq.write(body);
  apiReq.end();
};