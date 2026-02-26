#!/usr/bin/env node
/**
 * inquiry-pln.js
 * Script untuk cek/validasi No ID Pelanggan PLN via Digiflazz API
 *
 * Usage:
 *   node inquiry-pln.js <customer_no>
 *   node inquiry-pln.js 1234554321
 *
 * Pastikan .env sudah diisi DIGIFLAZZ_USERNAME & DIGIFLAZZ_API_KEY
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const crypto = require('crypto');
const https  = require('https');

// ── Konfigurasi ──────────────────────────────────────────────
const USERNAME = process.env.DIGIFLAZZ_USERNAME;
const MODE     = (process.env.DIGIFLAZZ_MODE || 'production').toLowerCase();
const API_KEY  = MODE === 'production'
  ? process.env.DIGIFLAZZ_PRODUCTION_KEY
  : process.env.DIGIFLAZZ_DEVELOPMENT_KEY;
const ENDPOINT = 'https://api.digiflazz.com/v1/inquiry-pln';

// ── Validasi env ─────────────────────────────────────────────
if (!USERNAME || !API_KEY) {
  console.error('\n❌ ERROR: DIGIFLAZZ_USERNAME atau DIGIFLAZZ_PRODUCTION_KEY/DEVELOPMENT_KEY belum diisi di .env\n');
  process.exit(1);
}

// ── Ambil customer_no dari argument ─────────────────────────
const customer_no = process.argv[2];

if (!customer_no) {
  console.error('\n❌ Usage: node inquiry-pln.js <customer_no>');
  console.error('  Contoh: node inquiry-pln.js 1234554321\n');
  process.exit(1);
}

// ── Generate signature: md5(username + apiKey + customer_no) ─
const sign = crypto
  .createHash('md5')
  .update(USERNAME + API_KEY + customer_no)
  .digest('hex');

const payload = JSON.stringify({ username: USERNAME, customer_no, sign });

console.log('\n⚡ Digiflazz PLN Inquiry');
console.log('═'.repeat(45));
console.log(`  Customer No : ${customer_no}`);
console.log(`  Username    : ${USERNAME}`);
console.log(`  Mode        : ${MODE.toUpperCase()}`);
console.log(`  Signature   : ${sign}`);
console.log('─'.repeat(45));
console.log('  Menghubungi Digiflazz API...\n');

// ── HTTP Request ─────────────────────────────────────────────
const url = new URL(ENDPOINT);
const options = {
  hostname : url.hostname,
  path     : url.pathname,
  method   : 'POST',
  headers  : {
    'Content-Type'   : 'application/json',
    'Content-Length' : Buffer.byteLength(payload),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      const data = json.data || json;

      console.log('📡 Response HTTP:', res.statusCode);
      console.log('─'.repeat(45));

      if (data.status === 'Sukses' || data.rc === '00') {
        console.log('✅ STATUS    :', data.status);
        console.log('   RC        :', data.rc);
        console.log('   Message   :', data.message);
        console.log('─'.repeat(45));
        console.log('📋 Data Pelanggan:');
        console.log('   Nama           :', data.name        || '-');
        console.log('   Customer No    :', data.customer_no || '-');
        console.log('   No Meter       :', data.meter_no    || '-');
        console.log('   Subscriber ID  :', data.subscriber_id || '-');
        console.log('   Daya/Segmen    :', data.segment_power || '-');
        console.log('─'.repeat(45));
        console.log('\n✅ ID PLN VALID — pelanggan ditemukan!\n');
      } else {
        console.log('❌ STATUS    :', data.status || 'Gagal');
        console.log('   RC        :', data.rc || '-');
        console.log('   Message   :', data.message || 'Tidak diketahui');
        console.log('\n❌ ID PLN tidak valid atau tidak ditemukan\n');
      }

      // Raw response untuk debugging
      if (process.argv.includes('--debug')) {
        console.log('\n🔍 Raw Response:');
        console.log(JSON.stringify(json, null, 2));
      }

    } catch (err) {
      console.error('❌ Gagal parse response:', err.message);
      console.error('   Raw body:', body);
    }
  });
});

req.on('error', (err) => {
  console.error('\n❌ Request error:', err.message, '\n');
  process.exit(1);
});

req.write(payload);
req.end();