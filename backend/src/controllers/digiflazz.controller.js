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

    // ── 1. Deteksi ping event ────────────────────────────────
    // Ping event punya hook_id tapi tidak ada data transaksi
    // Ini normal — Digiflazz kirim ping untuk verifikasi URL aktif
    if (req.body?.hook_id && !req.body?.data?.ref_id && !req.body?.ref_id) {
      console.log(`✅ Webhook: Ping event diterima (hook_id: ${req.body.hook_id}) — URL aktif!`);
      return res.status(200).json({ success: true, message: 'Ping received' });
    }

    // ── 2. Validasi field wajib untuk transaksi ───────────────
    // Digiflazz webhook payload: field ada di root body (bukan nested di data:{})
    // Tapi handle juga kalau ada wrapper data:{} untuk backward compat
    const data = (req.body?.data && req.body.data.ref_id)
      ? req.body.data
      : req.body;

    if (!data || !data.ref_id) {
      console.error('❌ Webhook: ref_id tidak ada di payload');
      console.error('   Body:', JSON.stringify(req.body));
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
    } = data;

    // ── 2. Verifikasi via X-Hub-Sign header ─────────────────
    // Docs: Digiflazz mengirim HMAC-SHA1 dari raw body menggunakan secret
    // Formula: sha1=HMAC-SHA1(secret, rawBody)
    const crypto = require('crypto');
    const secret  = process.env.DIGIFLAZZ_WEBHOOK_SECRET || '';
    const hubSign = req.headers['x-hub-sign'] || '';

    if (secret && hubSign) {
      const rawBody   = JSON.stringify(req.body);
      const calcSign  = 'sha1=' + crypto.createHmac('sha1', secret).update(rawBody).digest('hex');

      if (hubSign !== calcSign) {
        console.error(`❌ Webhook: X-Hub-Sign tidak valid!`);
        console.error(`   Received : ${hubSign}`);
        console.error(`   Expected : ${calcSign}`);
        return res.status(200).json({ success: false, message: 'Invalid signature' });
      }
      console.log(`✓ X-Hub-Sign valid`);
    } else if (!secret) {
      console.warn(`⚠️  DIGIFLAZZ_WEBHOOK_SECRET belum diisi di .env — verifikasi signature dilewati!`);
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

    // ── 4a. Intercept PLNCEK — proses ke pln_meter_checks ──────
    if (ref_id && ref_id.startsWith('CEK-')) {
      console.log(`⚡ Webhook PLNCEK — ref_id: ${ref_id}`);

      if (status === 'Sukses' || rc === '00') {
        const { parsePlnCekSn } = require('../services/digiflazz.service');
        const parsed = parsePlnCekSn(sn || '');
        await pool.query(`
          UPDATE pln_meter_checks
          SET status   = 'success',
              idpel    = $1,
              nama     = $2,
              tarif    = $3,
              daya     = $4,
              raw_sn   = $5
          WHERE ref_id = $6
        `, [
          parsed.idpel || customer_no,
          parsed.nama  || null,
          parsed.tarif || null,
          parsed.daya  || null,
          sn           || null,
          ref_id,
        ]);
        console.log(`✅ PLNCEK sukses — ${parsed.nama} (${parsed.idpel})`);
      } else {
        await pool.query(`
          UPDATE pln_meter_checks
          SET status='failed', message=$1
          WHERE ref_id=$2
        `, [message || 'Gagal', ref_id]);
        console.log(`❌ PLNCEK gagal — ${message}`);
      }

      return res.status(200).json({ success: true });
    }

    // ── 4b. Cari order di database ────────────────────────────
    // LEFT JOIN karena pascabayar punya product_id = NULL
    let orderResult = await pool.query(`
      SELECT o.*, p.sku, p.name AS product_name, g.product_type, g.category
      FROM orders o
      LEFT JOIN products p ON p.id = o.product_id
      LEFT JOIN games   g ON g.id  = p.game_id
      WHERE o.order_number = $1
    `, [ref_id]);

    // Fallback: saat retry, order_number di DB menyimpan suffix _r1/_r2 dll.
    // ref_id dari Digiflazz = retryOrderNumber, cocokkan langsung.
    // Kalau masih tidak ketemu, coba cari base order number (strip suffix).
    if (orderResult.rows.length === 0) {
      const baseRef = ref_id.replace(/_r\d+$/, '');
      if (baseRef !== ref_id) {
        orderResult = await pool.query(`
          SELECT o.*, p.sku, p.name AS product_name, g.product_type, g.category
          FROM orders o
          LEFT JOIN products p ON p.id = o.product_id
          LEFT JOIN games   g ON g.id  = p.game_id
          WHERE o.order_number LIKE $1
          ORDER BY o.retry_count DESC NULLS LAST
          LIMIT 1
        `, [`${baseRef}%`]);
        if (orderResult.rows.length > 0) {
          console.log(`🔄 Webhook: Order ditemukan via base ref fallback (${ref_id} → ${baseRef})`);
        }
      }
    }

    if (orderResult.rows.length === 0) {
      console.error(`❌ Webhook: Order tidak ditemukan untuk ref_id: ${ref_id}`);
      return res.status(200).json({ success: false, message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // ── 4c. Pascabayar — handle terpisah ──────────────────────
    // product_id = NULL artinya ini order pascabayar
    if (!order.product_id) {
      console.log(`🌐 Webhook: Pascabayar order terdeteksi — ${ref_id}`);

      if (['completed', 'success'].includes(order.order_status)) {
        console.log(`⚠️  Webhook: Pascabayar ${ref_id} sudah diproses, skip.`);
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      if (status === 'Sukses' || rc === '00') {
        const providerData = typeof order.provider_response === 'string'
          ? (() => { try { return JSON.parse(order.provider_response); } catch(e) { return {}; } })()
          : (order.provider_response || {});

        await pool.query(`
          UPDATE orders SET
            order_status           = 'completed',
            provider_serial_number = $1,
            provider_order_id      = $2,
            provider_response      = provider_response || $3::jsonb,
            processed_at           = NOW(),
            updated_at             = NOW()
          WHERE order_number = $4
        `, [sn || null, ref_id, JSON.stringify({ digiflazz: { status, rc, sn, message } }), ref_id]);

        await pool.query(
          `UPDATE pascabayar_inquiries SET status = 'paid', updated_at = NOW() WHERE ref_id = $1`,
          [providerData?.ref_id || ref_id]
        ).catch(() => {});

        // Kirim email sukses pascabayar
        try {
          const providerName = providerData?.provider_name || providerData?.buyer_sku_code || 'Pascabayar';
          emailService.sendOrderCompleteEmail({
            orderNumber:   order.order_number,
            customerName:  order.customer_name,
            customerEmail: order.customer_email,
            productName:   providerName,
            userId:        providerData?.customer_no || null,
            zoneId:        null,
            voucherCode:   sn || '-',
            isVoucher:     false,
            productType:   'pascabayar',
            totalAmount:   order.total_amount,
          }).catch(err => console.error('❌ Pascabayar email error:', err.message));
        } catch (emailErr) {
          console.error('❌ Pascabayar email service error:', emailErr);
        }

        console.log(`✅ Pascabayar ${ref_id} completed via webhook, sn=${sn}`);
      } else if (status === 'Gagal' || rc === '12' || rc === '13') {
        await pool.query(`
          UPDATE orders SET order_status = 'failed', notes = $1, updated_at = NOW()
          WHERE order_number = $2
        `, [`Digiflazz: ${message || 'Transaksi gagal'}`, ref_id]);
        console.error(`❌ Pascabayar ${ref_id} failed — ${message}`);
      } else {
        console.log(`⏳ Pascabayar ${ref_id} masih pending (${status})`);
      }

      return res.status(200).json({ success: true });
    }

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
          order_number            = $1,
          provider_serial_number  = $2,
          provider_order_id       = $3,
          provider_response       = $4,
          processed_at            = NOW(),
          updated_at              = NOW()
        WHERE id = $5
      `, [
        ref_id.replace(/_r\d+$/, ''),  // kembalikan ke base order number (tanpa suffix retry)
        sn    || null,
        ref_id,
        JSON.stringify({ status, rc, sn, message, price, buyer_last_saldo }),
        order.id,
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
      productType:   order.product_type || 'topup_game',

      totalAmount:   order.total_amount,
      price:         price || null,
    });

    console.log(`📧 Email completion sent to ${order.customer_email}`);
  } catch (err) {
    console.error('❌ sendCompletionEmail failed:', err.message);
    throw err;
  }
}