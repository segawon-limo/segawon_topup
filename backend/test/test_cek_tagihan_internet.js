/**
 * Test Script: Digiflazz Cek Tagihan Internet (MYRPB)
 * 
 * Cara jalankan di server:
 *   node test_cek_tagihan_internet.js
 * 
 * Atau dengan nomor pelanggan custom:
 *   CUSTOMER_NO=1234567890 node test_cek_tagihan_internet.js
 */
require('dotenv').config({ path: '../.env' });
const crypto = require('crypto');
const https = require('https');

// ─── KONFIGURASI ─────────────────────────────────────────────────────────────
// Script ini otomatis baca dari environment variable (sama seperti backend)
const USERNAME    = process.env.DIGIFLAZZ_USERNAME;
const API_KEY     = process.env.DIGIFLAZZ_PRODUCTION_KEY || process.env.DIGIFLAZZ_DEVELOPMENT_KEY;
const IS_TESTING  = process.env.DIGIFLAZZ_MODE === 'development';
const CUSTOMER_NO = process.env.CUSTOMER_NO || '2190852'; // nomor pelanggan internet test

const SKU         = 'MYRPB';
const REF_ID      = 'test-internet-' + Date.now();
// ─────────────────────────────────────────────────────────────────────────────

if (!USERNAME || !API_KEY) {
  console.error('❌ ERROR: DIGIFLAZZ_USERNAME atau API KEY tidak ditemukan di environment');
  console.error('   Pastikan .env sudah di-load atau set manual:');
  console.error('   DIGIFLAZZ_USERNAME=xxx DIGIFLAZZ_PRODUCTION_KEY=yyy node test_cek_tagihan_internet.js');
  process.exit(1);
}

// Generate signature: md5(username + apiKey + ref_id)
const sign = crypto.createHash('md5').update(USERNAME + API_KEY + REF_ID).digest('hex');

const payload = {
  commands:       'inq-pasca',
  username:       USERNAME,
  buyer_sku_code: SKU,
  customer_no:    CUSTOMER_NO,
  ref_id:         REF_ID,
  sign:           sign,
  ...(IS_TESTING && { testing: true }),
};

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Digiflazz Cek Tagihan Internet');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Username    :', USERNAME);
console.log('SKU         :', SKU);
console.log('Customer No :', CUSTOMER_NO);
console.log('Ref ID      :', REF_ID);
console.log('Mode        :', IS_TESTING ? '🧪 TESTING' : '🚀 PRODUCTION');
console.log('Payload     :', JSON.stringify(payload, null, 2));
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Kirim request
const body = JSON.stringify(payload);
const options = {
  hostname: 'api.digiflazz.com',
  path:     '/v1/transaction',
  method:   'POST',
  headers:  {
    'Content-Type':   'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\n📥 HTTP Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log("\n📦 Raw Response:\n", data);
      console.log("\n✅ Parsed Response:\n", JSON.stringify(json, null, 2));

      // Parse internet-specific fields
      if (json.data) {
        const d = json.data;
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Summary:');
        console.log('  Status        :', d.status);
        console.log('  RC            :', d.rc);
        console.log('  Nama          :', d.customer_name);
        console.log('  Nomor         :', d.customer_no);
        console.log('  Periode       :', d.periode);
        console.log('  Harga (price) :', d.price);
        console.log('  Selling Price :', d.selling_price);
        console.log('  Admin         :', d.admin);
        if (d.desc) {
          console.log('  Lembar Tagihan:', d.desc.lembar_tagihan);
          if (d.desc.detail) {
            console.log('  Detail Tagihan:');
            d.desc.detail.forEach((item, i) => {
              console.log(`    [${i+1}] Periode: ${item.periode}, Tagihan: ${item.nilai_tagihan}, Admin: ${item.admin}`);
            });
          }
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(body);
req.end();