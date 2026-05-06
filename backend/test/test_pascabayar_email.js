/**
 * test_pascabayar_email.js
 *
 * Script untuk test pengiriman email struk pascabayar (PLN & Internet)
 * menggunakan data mock yang mirip response Digiflazz production.
 *
 * Jalankan dari folder backend/:
 *   node test/test_pascabayar_email.js
 *   node test/test_pascabayar_email.js pln
 *   node test/test_pascabayar_email.js internet
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const emailService = require('../src/services/email.service');

// ── Warna console ─────────────────────────────────────────────────────────────
const C = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ── Mock data PLN (berdasarkan response production inquiry sebelumnya) ─────────
const MOCK_PLN = {
  orderNumber:       'SGW-20260506-PLN01',
  customerName:      'Fajar',           // nama customer di website
  customerEmail:     'fajarmn19@gmail.com',
  buyer_sku_code:    'PLNPB',
  customerNo:        '515430346045',
  pln_customer_name: 'D*S*A*U*G*W*Y*T*', // nama dari Digiflazz (tersensor)
  tarif:             'R1M',
  daya:              900,
  periode:           '202605',
  detail: [
    {
      periode:      '202605',
      nilai_tagihan: '240926',
      admin:         '3000',
      denda:         '0',
      meter_awal:   '00011793',
      meter_akhir:  '00011955',
    },
  ],
  selling_price:    243926,
  admin_fee:        3000,
  payment_fee:      2500,    // biaya layanan QRIS
  voucher_code:     null,    // tidak pakai voucher
  voucher_discount: 0,
  totalAmount:      246426,
  paymentMethod:    'SQ',    // QRIS
  noRef:            '2RAN21VS19542E9CCAE4F42026080425',
  paidAt:           new Date().toISOString(),
};

// ── Mock data Internet (MyRepublic) ───────────────────────────────────────────
const MOCK_INTERNET = {
  orderNumber:       'SGW-20260506-INT01',
  customerName:      'Fajar',
  customerEmail:     'fajarmn19@gmail.com',
  buyer_sku_code:    'MYRPB',
  customerNo:        '1122334455',
  pln_customer_name: 'FAJAR MAULANA',   // internet biasanya tidak tersensor
  tarif:             null,
  daya:              null,
  periode:           '202605',
  detail: [
    {
      periode:       '202605',
      nilai_tagihan: '285000',
      admin:         '2500',
      denda:         '0',
    },
  ],
  selling_price:    287500,
  admin_fee:        2500,
  payment_fee:      0,
  voucher_code:     'HEMAT10',
  voucher_discount: 10000,   // diskon voucher Rp 10.000
  totalAmount:      277500,
  paymentMethod:    'BR',    // BRI Virtual Account
  noRef:            'MYRPB-20260506-XYZ789',
  paidAt:           new Date().toISOString(),
};

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const mode = process.argv[2] || 'both'; // 'pln', 'internet', atau 'both'

  console.log(C.bold('\n══════════════════════════════════════════════'));
  console.log(C.bold('  TEST EMAIL STRUK PASCABAYAR'));
  console.log(C.bold('══════════════════════════════════════════════\n'));
  console.log('  Mode      :', C.bold(mode));
  console.log('  Target    :', C.bold('fajarmn19@gmail.com'));
  console.log('  BREVO_KEY :', process.env.BREVO_API_KEY ? C.green('✓ found') : C.red('✗ NOT SET'));
  console.log('');

  if (!process.env.BREVO_API_KEY) {
    console.log(C.red('❌ BREVO_API_KEY tidak ditemukan di .env, abort.\n'));
    process.exit(1);
  }

  const tasks = [];
  if (mode === 'pln'      || mode === 'both') tasks.push({ label: 'PLN',           data: MOCK_PLN });
  if (mode === 'internet' || mode === 'both') tasks.push({ label: 'MyRepublic',    data: MOCK_INTERNET });

  for (const task of tasks) {
    console.log(C.cyan(`📤 Mengirim struk ${task.label}...`));
    console.log(C.dim(`   Order    : ${task.data.orderNumber}`));
    console.log(C.dim(`   SKU      : ${task.data.buyer_sku_code}`));
    console.log(C.dim(`   Total    : Rp ${Number(task.data.totalAmount).toLocaleString('id-ID')}`));
    console.log(C.dim(`   Voucher  : ${task.data.voucher_code || '-'}`));
    console.log(C.dim(`   Pay fee  : Rp ${Number(task.data.payment_fee).toLocaleString('id-ID')}`));

    try {
      const result = await emailService.sendPascabayarCompleteEmail(task.data);

      if (result.success) {
        console.log(C.green(`   ✅ Berhasil! messageId: ${result.messageId || '-'}\n`));
      } else {
        console.log(C.red(`   ❌ Gagal: ${result.error}\n`));
      }
    } catch (err) {
      console.log(C.red(`   ❌ Error: ${err.message}\n`));
    }
  }

  console.log(C.bold('══════════════════════════════════════════════'));
  console.log(C.dim('  Cek inbox fajarmn19@gmail.com (termasuk folder Spam)\n'));
})();