/**
 * Digiflazz Webhook Controller
 *
 * Menerima notifikasi async dari Digiflazz saat transaksi selesai.
 * Daftarkan URL ini di dashboard Digiflazz:
 *   Settings → Callback URL → https://segawontopup.net/api/digiflazz/webhook
 *
 * Docs: https://developer.digiflazz.com/
 */

const { pool }        = require('../config/database');
const digiflazzService = require('../services/digiflazz.service');
const emailService     = require('../services/email.service');

/**
 * POST /api/digiflazz/webhook
 * Dipanggil Digiflazz saat transaksi async (Steam Wallet, dll) selesai
 */
exports.digiflazzWebhook = async (req, res) => {
  console.log('\n=== 🔔 Digiflazz Webhook Received ===');
  console.log('Body:', JSON.stringify(req.body, null, 2));

  // Digiflazz selalu expect HTTP 200 — jangan return 4xx/5xx
  // atau mereka akan retry terus
  try {

    // ── 1. Validasi field wajib ───────────────────────────────
    const data = req.body?.data || req.body;

    if (!data || !data.ref_id) {
      console.error('❌ Webhook: ref_id tidak ada di payload');
      return res.status(200).json({ success: false, message: 'Missing ref_id' });
    }

    const {
      ref_id,
      buyer_sku_code,
      customer_no,
      status,
      rc,
      sn,
      message,
      price,
      buyer_last_saldo,
      sign: receivedSign,
    } = data;

    // ── 2. Verifikasi signature ───────────────────────────────
    // Formula: MD5(username + apiKey + ref_id)
    const crypto    = require('crypto');
    const username  = digiflazzService.username;
    const apiKey    = digiflazzService.apiKey;
    const rawSign   = `${username}${apiKey}${ref_id}`;
    const calcSign  = crypto.createHash('md5').update(rawSign).digest('hex');

    if (receivedSign && receivedSign !== calcSign) {
      console.error(`❌ Webhook: Signature tidak valid!`);
      console.error(`   Received : ${receivedSign}`);
      console.error(`   Expected : ${calcSign}`);
      // Tetap 200 tapi jangan proses
      return res.status(200).json({ success: false, message: 'Invalid signature' });
    }

    console.log(`✓ Signature valid`);
    console.log(`  ref_id : ${ref_id}`);
    console.log(`  status : ${status} (rc: ${rc})`);
    console.log(`  sn     : ${sn || '(kosong)'}`);

    // ── 3. Simpan log webhook ─────────────────────────────────
    await pool.query(`
      INSERT INTO digiflazz_webhook_logs
        (ref_id, status, rc, sn, raw_payload, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT DO NOTHING
    `, [ref_id, status, rc, sn || null, JSON.stringify(req.body)])
    .catch(() => {}); // tabel log opsional, jangan block proses utama

    // ── 4. Cari order di database ─────────────────────────────
    const orderResult = await pool.query(`
      SELECT o.*, p.sku, p.name AS product_name, g.product_type, g.category
      FROM orders o
      JOIN products p ON p.id = o.product_id
      JOIN games   g ON g.id  = p.game_id
      WHERE o.order_number = $1
    `, [ref_id]);

    if (orderResult.rows.length === 0) {
      console.error(`❌ Webhook: Order tidak ditemukan untuk ref_id: ${ref_id}`);
      return res.status(200).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // ── 5. Idempotency — jangan proses ulang yang sudah selesai ─
    if (['completed', 'success'].includes(order.order_status)) {
      console.log(`⚠️  Webhook: Order ${ref_id} sudah diproses sebelumnya, skip.`);
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // ── 6. Proses berdasarkan status Digiflazz ────────────────
    if (status === 'Sukses' || rc === '00') {
      // ✅ SUKSES
      console.log(`✅ Webhook: Transaksi SUKSES — ${ref_id}`);
      console.log(`   SN / Kode : ${sn}`);

      await pool.query(`
        UPDATE orders
        SET
          order_status            = 'completed',
          provider_serial_number  = $1,
          provider_order_id       = $2,
          provider_response       = $3,
          processed_at            = NOW(),
          updated_at              = NOW()
        WHERE order_number = $4
      `, [
        sn    || null,
        ref_id,
        JSON.stringify({ status, rc, sn, message, price, buyer_last_saldo }),
        ref_id,
      ]);

      // Kirim email ke customer (non-blocking)
      sendCompletionEmail(order, { sn, status, message, price })
        .catch(err => console.error('❌ Email error (non-blocking):', err.message));

      console.log(`✅ Order ${ref_id} marked as completed.`);

    } else if (status === 'Gagal' || rc === '12' || rc === '13') {
      // ❌ GAGAL
      console.error(`❌ Webhook: Transaksi GAGAL — ${ref_id}`);
      console.error(`   Message: ${message}`);
      console.error(`   RC     : ${rc}`);

      await pool.query(`
        UPDATE orders
        SET
          order_status      = 'failed',
          provider_response = $1,
          notes             = $2,
          updated_at        = NOW()
        WHERE order_number = $3
      `, [
        JSON.stringify({ status, rc, sn, message, price }),
        `Digiflazz: ${message || 'Transaksi gagal'}`,
        ref_id,
      ]);

      // TODO: Kirim notifikasi gagal + proses refund
      console.warn(`⚠️  Order ${ref_id} failed — pertimbangkan refund ke customer`);

    } else if (status === 'Pending') {
      // ⏳ MASIH PENDING — update saja, jangan ubah order_status
      console.log(`⏳ Webhook: Transaksi masih Pending — ${ref_id}`);

      await pool.query(`
        UPDATE orders
        SET
          provider_response = $1,
          updated_at        = NOW()
        WHERE order_number = $2
      `, [
        JSON.stringify({ status, rc, message }),
        ref_id,
      ]);

    } else {
      console.warn(`⚠️  Webhook: Status tidak dikenal "${status}" (rc: ${rc}) untuk ${ref_id}`);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('💥 Digiflazz Webhook Error:', error.message);
    console.error(error.stack);
    // Tetap 200 agar Digiflazz tidak retry
    return res.status(200).json({ success: false, message: 'Internal error' });
  }
};

/**
 * GET /api/digiflazz/webhook-test
 * Endpoint untuk verifikasi bahwa URL webhook bisa dijangkau Digiflazz
 */
exports.webhookVerify = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Digiflazz webhook endpoint aktif',
    timestamp: new Date().toISOString(),
  });
};

// ── Helper: kirim email setelah transaksi selesai ─────────────
async function sendCompletionEmail(order, digiflazzData) {
  try {
    const { sn, price } = digiflazzData;
    const isVoucher = order.product_type === 'voucher_code';

    await emailService.sendOrderCompleteEmail({
      orderNumber:   order.order_number,
      customerName:  order.customer_name,
      customerEmail: order.customer_email,
      productName:   order.product_name,
      userId:        order.game_user_id || null,
      zoneId:        order.game_zone_id || null,

      // SN / kode voucher — ini yang ditunggu customer
      voucherCode:   sn || null,
      isVoucher:     isVoucher,

      totalAmount:   order.total_amount,
      price:         price || null,
    });

    console.log(`📧 Email completion sent to ${order.customer_email}`);
  } catch (err) {
    console.error('❌ sendCompletionEmail failed:', err.message);
    throw err;
  }
}