/**
 * test_pascabayar_pay.js
 *
 * Script bayar tagihan pascabayar LANGSUNG ke Digiflazz (tanpa Duitku).
 * Dirancang untuk dijalankan dari Terminal Admin website Segawon.
 *
 * Cara jalankan:
 *   node test/test_pascabayar_pay.js <customer_no> [sku]
 *
 * Contoh:
 *   node test/test_pascabayar_pay.js 2190852
 *   node test/test_pascabayar_pay.js 2190852 MYRPB
 *
 * PERINGATAN: Script ini LANGSUNG memotong deposit Digiflazz
 * dan membayar tagihan asli pelanggan!
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const crypto = require('crypto');
const https  = require('https');

// Konfigurasi
const DIGIFLAZZ_USERNAME = process.env.DIGIFLAZZ_USERNAME;
const DIGIFLAZZ_API_KEY  = process.env.NODE_ENV === 'production'
  ? process.env.DIGIFLAZZ_PRODUCTION_KEY
  : process.env.DIGIFLAZZ_DEVELOPMENT_KEY;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const CUSTOMER_NO    = process.argv[2] || process.env.CUSTOMER_NO || '2190852';
const BUYER_SKU_CODE = process.argv[3] || process.env.SKU         || 'MYRPB';

// Helpers
const formatRupiah = (num) =>
  'Rp ' + (parseFloat(num) || 0).toLocaleString('id-ID');

const digiflazzPost = (body) => new Promise((resolve, reject) => {
  const bodyStr = JSON.stringify(body);
  const req = https.request({
    hostname: 'api.digiflazz.com',
    path:     '/v1/transaction',
    method:   'POST',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    },
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('Invalid JSON: ' + data)); }
    });
  });
  req.on('error', reject);
  req.write(bodyStr);
  req.end();
});

const makeSign = (refId) =>
  crypto.createHash('md5')
    .update(DIGIFLAZZ_USERNAME + DIGIFLAZZ_API_KEY + refId)
    .digest('hex');

const makeRefId = () => {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PB-${ts}-${rand}`;
};

// Main
async function main() {
  console.log('==================================================');
  console.log('  PASCABAYAR PAY — Digiflazz Direct');
  console.log('==================================================');
  console.log(`  Mode     : ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`  SKU      : ${BUYER_SKU_CODE}`);
  console.log(`  Customer : ${CUSTOMER_NO}`);
  console.log('--------------------------------------------------\n');

  if (!DIGIFLAZZ_USERNAME || !DIGIFLAZZ_API_KEY) {
    console.error('ERROR: DIGIFLAZZ_USERNAME atau API KEY tidak ditemukan di .env');
    process.exit(1);
  }

  // STEP 1: Inquiry
  const refId   = makeRefId();
  const signInq = makeSign(refId);

  console.log('STEP 1: Cek Tagihan (inq-pasca)');
  console.log(`  ref_id : ${refId}\n`);

  const inqRes  = await digiflazzPost({
    commands:       'inq-pasca',
    username:       DIGIFLAZZ_USERNAME,
    buyer_sku_code: BUYER_SKU_CODE,
    customer_no:    CUSTOMER_NO,
    ref_id:         refId,
    sign:           signInq,
    ...(!IS_PRODUCTION && { testing: true }),
  });

  console.log('Inquiry Response:');
  console.log(JSON.stringify(inqRes, null, 2));

  const inqData = inqRes?.data;

  if (!inqData || inqData.rc !== '00' || inqData.status === 'Gagal') {
    console.log('\nInquiry GAGAL!');
    console.log(`  RC      : ${inqData?.rc}`);
    console.log(`  Message : ${inqData?.message}`);
    process.exit(1);
  }

  console.log('\nTagihan ditemukan:');
  console.log(`  Nama           : ${inqData.customer_name || '-'}`);
  console.log(`  Nomor          : ${inqData.customer_no}`);
  console.log(`  Periode        : ${inqData.periode || '-'}`);
  console.log(`  Lembar Tagihan : ${inqData.desc?.lembar_tagihan || 1}`);
  if (inqData.desc?.detail?.length > 0) {
    inqData.desc.detail.forEach((d, i) => {
      console.log(`  Detail [${i+1}]     : ${d.periode} | ${formatRupiah(d.nilai_tagihan)}`);
    });
  }
  console.log(`  Price          : ${formatRupiah(inqData.price)}`);
  console.log(`  Selling Price  : ${formatRupiah(inqData.selling_price)}`);
  console.log(`  Admin Fee      : ${formatRupiah(inqData.admin)}`);

  // STEP 2: Pay
  console.log('\n--------------------------------------------------');
  console.log('STEP 2: Bayar Tagihan (pay-pasca)');
  console.log(`  ref_id : ${refId} (sama dengan inquiry)\n`);

  const signPay = makeSign(refId);

  const payRes  = await digiflazzPost({
    commands:       'pay-pasca',
    username:       DIGIFLAZZ_USERNAME,
    buyer_sku_code: BUYER_SKU_CODE,
    customer_no:    CUSTOMER_NO,
    ref_id:         refId,
    sign:           signPay,
    ...(!IS_PRODUCTION && { testing: true }),
  });

  console.log('Pay Response:');
  console.log(JSON.stringify(payRes, null, 2));

  // Summary
  const payData = payRes?.data;
  console.log('\n==================================================');
  console.log('  SUMMARY');
  console.log('==================================================');

  if (!payData) {
    console.log('ERROR: Tidak ada data dalam response pay');
    process.exit(1);
  }

  const status = payData.status?.toLowerCase();
  const rc     = payData.rc;

  if (status === 'sukses' || rc === '00') {
    console.log('HASIL: BERHASIL');
  } else if (status === 'pending') {
    console.log('HASIL: PENDING — Menunggu konfirmasi dari provider');
    console.log('       Cek webhook Digiflazz untuk update status');
  } else if (rc === '13') {
    console.log('HASIL: SUDAH DIBAYAR (RC 13)');
  } else if (status === 'gagal') {
    console.log(`HASIL: GAGAL — ${payData.message}`);
  } else {
    console.log(`HASIL: ${payData.status} (RC: ${rc})`);
  }

  console.log('');
  console.log(`  Status   : ${payData.status}`);
  console.log(`  RC       : ${payData.rc}`);
  console.log(`  SN       : ${payData.sn || '-'}`);
  console.log(`  Message  : ${payData.message || '-'}`);
  console.log(`  ref_id   : ${payData.ref_id}`);
  console.log(`  Harga    : ${formatRupiah(payData.selling_price)}`);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});