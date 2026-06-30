/**
 * resend-pascabayar-emails.js
 *
 * Kirim ulang email struk pascabayar untuk order COMPLETED di masa lalu yang
 * tidak pernah dapat email — akibat bug: processPascabayarPayment() di
 * duitku.controller.js menyelesaikan order secara sinkron, tapi sebelumnya
 * tidak pernah memanggil emailService.sendPascabayarCompleteEmail().
 *
 * Aman dipakai berkali-kali: SELALU dry-run kecuali --confirm diberikan.
 * Default rentang waktu cuma 7 hari terakhir — KIRIM SENGAJA TIDAK
 * default ke "semua history", supaya tidak mengejutkan customer dengan
 * email "tagihan lunas" untuk transaksi yang sudah lama berlalu.
 *
 * Pemakaian:
 *   node resend-pascabayar-emails.js                     # dry-run, 7 hari terakhir
 *   node resend-pascabayar-emails.js --days=30            # dry-run, 30 hari terakhir
 *   node resend-pascabayar-emails.js --days=30 --confirm  # BENAR-BENAR KIRIM
 *   node resend-pascabayar-emails.js --order=SGW-20260530-IZ1BS --confirm  # 1 order spesifik
 */

require('dotenv').config();
const { Pool } = require('pg');
const emailService = require('./src/services/email.service');

const DB_URL = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DB_URL });

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const daysArg = args.find(a => a.startsWith('--days='));
const orderArg = args.find(a => a.startsWith('--order='));
const DAYS = daysArg ? parseInt(daysArg.split('=')[1], 10) : 7;
const SPECIFIC_ORDER = orderArg ? orderArg.split('=')[1] : null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📧 Resend Pascabayar Emails — ${CONFIRM ? '🔴 LIVE MODE' : '🧪 DRY RUN'}`);
  console.log(`${'='.repeat(60)}\n`);

  let query, params;
  if (SPECIFIC_ORDER) {
    query = `SELECT * FROM orders WHERE order_number = $1 AND product_id IS NULL`;
    params = [SPECIFIC_ORDER];
  } else {
    query = `
      SELECT * FROM orders
      WHERE product_id IS NULL
        AND order_status IN ('completed', 'success')
        AND created_at >= NOW() - ($1 || ' days')::INTERVAL
      ORDER BY created_at ASC
    `;
    params = [DAYS];
  }

  const result = await pool.query(query, params);
  console.log(`Ditemukan ${result.rows.length} order pascabayar yang akan diproses.\n`);

  if (result.rows.length === 0) {
    console.log('Tidak ada yang perlu dikirim. Selesai.');
    await pool.end();
    return;
  }

  let sent = 0, failed = 0, skipped = 0;

  for (const order of result.rows) {
    const providerData = typeof order.provider_response === 'string'
      ? (() => { try { return JSON.parse(order.provider_response); } catch (e) { return {}; } })()
      : (order.provider_response || {});

    const digi = providerData.digiflazz || {};

    if (!order.customer_email) {
      console.log(`⏭️  SKIP ${order.order_number} — customer_email kosong`);
      skipped++;
      continue;
    }

    const payload = {
      orderNumber:       order.order_number,
      customerName:      order.customer_name || digi.customer_name || null,
      customerEmail:     order.customer_email,
      buyer_sku_code:    providerData.buyer_sku_code || digi.buyer_sku_code || null,
      customerNo:        providerData.customer_no || null,
      pln_customer_name: digi.customer_name || null,
      tarif:             providerData.tarif || digi.desc?.tarif || null,
      daya:              providerData.daya  || digi.desc?.daya  || null,
      periode:           providerData.periode || digi.periode || null,
      detail:            digi.desc?.detail || providerData.detail || [],
      selling_price:     digi.selling_price || providerData.detail_tagihan || null,
      admin_fee:         providerData.admin_fee || digi.admin || 0,
      payment_fee:       order.payment_fee || 0,
      voucher_code:      order.voucher_code || null,
      voucher_discount:  order.voucher_discount || 0,
      totalAmount:       order.total_amount,
      paymentMethod:     order.payment_method || null,
      noRef:             digi.sn || null,
      paidAt:            (order.processed_at || order.updated_at || order.created_at).toISOString(),
    };

    console.log(`${CONFIRM ? '📤' : '🧪'} ${order.order_number} → ${order.customer_email} [${payload.buyer_sku_code}]`);

    if (CONFIRM) {
      const res = await emailService.sendPascabayarCompleteEmail(payload);
      if (res.success) {
        sent++;
        console.log(`   ✅ Terkirim`);
      } else {
        failed++;
        console.log(`   ❌ Gagal: ${res.error}`);
      }
      // Jeda antar kirim, supaya tidak kena rate-limit Brevo
      await sleep(1200);
    } else {
      sent++; // dihitung sebagai "akan terkirim" di dry-run
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Ringkasan: ${sent} ${CONFIRM ? 'terkirim' : 'akan dikirim (dry-run)'}, ${failed} gagal, ${skipped} dilewati`);
  if (!CONFIRM) {
    console.log(`\nIni masih DRY RUN — tidak ada email yang benar-benar terkirim.`);
    console.log(`Jalankan ulang dengan --confirm untuk benar-benar mengirim.`);
  }
  console.log(`${'='.repeat(60)}\n`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});