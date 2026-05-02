//const CUSTOMER_NO   = '515430346045';
/**
 * test_pln_inquiry.js
 *
 * Script untuk test cek tagihan PLN Pascabayar langsung ke Digiflazz API.
 * Print raw response lengkap dari Digiflazz.
 *
 * Jalankan:
 *   node test_pln_inquiry.js
 *
 * Dari folder backend:
 *   node test/test_pln_inquiry.js
 */

const path   = require('path');
// Cari .env dari lokasi manapun script dijalankan
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const https  = require('https');
const crypto = require('crypto');

// ── Konfigurasi ───────────────────────────────────────────────────────────────
const USERNAME   = process.env.DIGIFLAZZ_USERNAME;
// Ikuti DigiflazzService (prabayar): pakai DIGIFLAZZ_MODE
const isDevelopment = process.env.DIGIFLAZZ_MODE === 'development';
const API_KEY       = isDevelopment
  ? process.env.DIGIFLAZZ_DEVELOPMENT_KEY
  : process.env.DIGIFLAZZ_PRODUCTION_KEY;

// Nomor ID Pelanggan PLN yang ingin dicek (ganti sesuai kebutuhan)
const CUSTOMER_NO   = '530000000001';  // ← Ganti dengan ID Pelanggan PLN
const BUYER_SKU_CODE = 'PLNPB';

// ── Warna console ─────────────────────────────────────────────────────────────
const C = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeRefId = () => {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PLNTEST-${ts}-${rand}`;
};

const makeSign = (refId) =>
  crypto.createHash('md5').update(USERNAME + API_KEY + refId).digest('hex');

const digiflazzPost = (body) =>
  new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'api.digiflazz.com',
      path:     '/v1/transaction',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data), raw: data });
        } catch {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(C.bold('\n══════════════════════════════════════════════'));
  console.log(C.bold('  TEST CEK TAGIHAN PLN PASCABAYAR — DIGIFLAZZ'));
  console.log(C.bold('══════════════════════════════════════════════\n'));

  // Validasi env
  if (!USERNAME || !API_KEY) {
    console.log(C.red('❌ ERROR: Credentials tidak ditemukan di .env\n'));
    console.log(C.yellow('Pastikan file .env berisi:'));
    console.log(C.dim('  DIGIFLAZZ_USERNAME=...'));
    console.log(C.dim('  DIGIFLAZZ_DEVELOPMENT_KEY=...  (atau DIGIFLAZZ_PRODUCTION_KEY)'));
    console.log(C.dim('  NODE_ENV=development            (atau production)\n'));
    process.exit(1);
  }

  const refId = makeRefId();
  const sign  = makeSign(refId);

  const requestBody = {
    commands:       'inq-pasca',
    username:       USERNAME,
    buyer_sku_code: BUYER_SKU_CODE,
    customer_no:    CUSTOMER_NO,
    ref_id:         refId,
    sign,
    testing:        true, // ← hapus atau set false untuk mode production
  };

  // Print info request
  console.log(C.cyan('📤 REQUEST'));
  console.log(C.dim('─────────────────────────────────────────────'));
  console.log('  Endpoint    :', C.bold('POST https://api.digiflazz.com/v1/transaction'));
  console.log('  Username    :', C.bold(USERNAME));
  console.log('  Mode        :', C.bold(`DIGIFLAZZ_MODE=${process.env.DIGIFLAZZ_MODE || '(not set)'} → pakai ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} key`));
  console.log('  API Key     :', C.dim(API_KEY?.slice(0, 6) + '...' + API_KEY?.slice(-4)));
  console.log('  SKU Code    :', C.bold(BUYER_SKU_CODE));
  console.log('  Customer No :', C.bold(CUSTOMER_NO));
  console.log('  Ref ID      :', C.bold(refId));
  console.log('  Sign (MD5)  :', C.dim(sign));
  console.log('\n  Body JSON   :');
  console.log(C.dim(JSON.stringify(requestBody, null, 4)));

  console.log(C.dim('\n─────────────────────────────────────────────'));
  console.log('  Menghubungi Digiflazz...\n');

  try {
    const result = await digiflazzPost(requestBody);

    // ── Raw Response ──
    console.log(C.cyan('📥 RAW RESPONSE'));
    console.log(C.dim('─────────────────────────────────────────────'));
    console.log('  HTTP Status :', C.bold(result.statusCode));
    console.log('\n  Raw JSON    :');
    console.log(C.dim(result.raw));

    // ── Parsed Response ──
    console.log(C.dim('\n─────────────────────────────────────────────'));
    console.log(C.cyan('📦 PARSED RESPONSE'));
    console.log(C.dim('─────────────────────────────────────────────'));
    console.log(JSON.stringify(result.body, null, 4));

    // ── Interpretasi ──
    const data = result.body?.data;
    console.log(C.dim('\n─────────────────────────────────────────────'));
    console.log(C.cyan('📊 INTERPRETASI'));
    console.log(C.dim('─────────────────────────────────────────────'));

    if (!data) {
      console.log(C.red('  ❌ Tidak ada field "data" dalam response'));
    } else {
      const rc     = data.rc;
      const status = data.status;

      if (rc === '00') {
        console.log(C.green(`  ✅ Sukses! rc=${rc} status=${status}`));
      } else if (rc === '14') {
        console.log(C.yellow(`  ⚠️  ID Pelanggan tidak ditemukan (rc=${rc})`));
      } else {
        console.log(C.red(`  ❌ Gagal: rc=${rc} status=${status}`));
      }

      if (data.customer_name) console.log(`  Nama         : ${C.bold(data.customer_name)}`);
      if (data.period)        console.log(`  Periode      : ${C.bold(data.period)}`);
      if (data.selling_price) console.log(`  Selling Price: ${C.bold('Rp ' + data.selling_price?.toLocaleString('id-ID'))}`);
      if (data.admin)         console.log(`  Admin Fee    : ${C.bold('Rp ' + data.admin?.toLocaleString('id-ID'))}`);

      const desc = data.desc;
      if (desc) {
        if (desc.tarif)         console.log(`  Tarif        : ${C.bold(desc.tarif)}`);
        if (desc.daya)          console.log(`  Daya         : ${C.bold(desc.daya + ' VA')}`);
        if (desc.lembar_tagihan) console.log(`  Lembar       : ${C.bold(desc.lembar_tagihan)}`);
        if (Array.isArray(desc.detail) && desc.detail.length > 0) {
          console.log(`  Detail tagihan:`);
          desc.detail.forEach((d, i) => {
            console.log(`    [${i + 1}] periode=${d.periode}  nilai=${d.nilai_tagihan}  denda=${d.denda || 0}  admin=${d.admin || 0}`);
          });
        }
      }

      if (data.message) console.log(`  Message      : ${C.yellow(data.message)}`);
    }

    console.log(C.dim('\n══════════════════════════════════════════════\n'));

  } catch (err) {
    console.log(C.red(`\n❌ Error: ${err.message}\n`));
    process.exit(1);
  }
})();