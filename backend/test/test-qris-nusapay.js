/**
 * Test Script: QRIS Nusapay (SQ) - Duitku Integration
 * 
 * Usage:
 *   node test-qris-nusapay.js
 * 
 * Pastikan .env sudah ada di backend/ sebelum menjalankan script ini.
 * Jalankan dari folder: backend/test/
 */

require('dotenv').config({ path: '../.env' });
const crypto = require('crypto');
const https  = require('https');

// ── Credentials ──────────────────────────────────────────────────────────────
const MODE          = (process.env.DUITKU_MODE || 'sandbox').toLowerCase();
const IS_SANDBOX    = MODE === 'sandbox';
const MERCHANT_CODE = IS_SANDBOX
  ? process.env.DUITKU_SANDBOX_MERCHANT_CODE
  : process.env.DUITKU_MERCHANT_CODE;
const API_KEY       = IS_SANDBOX
  ? process.env.DUITKU_SANDBOX_API_KEY
  : process.env.DUITKU_API_KEY;
const BASE_URL      = IS_SANDBOX
  ? 'sandbox.duitku.com'
  : 'passport.duitku.com';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 Test QRIS Nusapay (SQ) — Duitku Integration');
console.log(`   Mode          : ${IS_SANDBOX ? 'SANDBOX' : 'PRODUCTION'}`);
console.log(`   Merchant Code : ${MERCHANT_CODE}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (!MERCHANT_CODE || !API_KEY) {
  console.error('❌ MERCHANT_CODE atau API_KEY tidak ditemukan di .env!');
  process.exit(1);
}

// ── Helper: HTTPS POST ────────────────────────────────────────────────────────
function httpsPost(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: BASE_URL,
      path,
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Test 1: Cek apakah SQ tersedia di payment methods ────────────────────────
async function testGetPaymentMethods() {
  console.log('1️⃣  Cek Payment Methods — apakah SQ (QRIS Nusapay) tersedia...\n');

  const amount   = 50000;
  const datetime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace('T', ' ');
  const sign     = crypto.createHash('sha256')
    .update(`${MERCHANT_CODE}${amount}${datetime}${API_KEY}`)
    .digest('hex');

  const payload = {
    merchantcode: MERCHANT_CODE,
    amount,
    datetime,
    signature: sign,
  };

  try {
    const res = await httpsPost('/webapi/api/merchant/paymentmethod/getpaymentmethod', payload);

    if (res.data?.paymentFee) {
      const methods = res.data.paymentFee;
      const sq      = methods.find(m => m.paymentMethod === 'SQ');

      console.log(`   Total metode tersedia : ${methods.length}`);
      console.log('\n   Semua metode QRIS yang tersedia:');
      methods
        .filter(m => ['SQ','BT','QR','GQ','NQ'].includes(m.paymentMethod))
        .forEach(m => console.log(`      [${m.paymentMethod}] ${m.paymentName} — fee: Rp ${parseInt(m.totalFee || 0).toLocaleString('id-ID')}`));

      console.log('\n   Semua metode tersedia:');
      methods.forEach(m => console.log(`      [${m.paymentMethod}] ${m.paymentName}`));

      if (sq) {
        console.log('\n   ✅ QRIS Nusapay (SQ) TERSEDIA!');
        console.log(`      Nama   : ${sq.paymentName}`);
        console.log(`      Fee    : Rp ${parseInt(sq.totalFee || 0).toLocaleString('id-ID')}`);
        console.log(`      Image  : ${sq.paymentImage}`);
      } else {
        console.log('\n   ⚠️  QRIS Nusapay (SQ) TIDAK tersedia di metode ini.');
        console.log('      Kemungkinan belum diaktifkan di dashboard Duitku.');
      }
    } else {
      console.log('   ❌ Gagal mendapatkan payment methods');
      console.log('   Response:', JSON.stringify(res.data, null, 2));
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }

  console.log('');
}

// ── Test 2: Buat transaksi QRIS Nusapay ──────────────────────────────────────
async function testCreateTransaction() {
  console.log('2️⃣  Buat Transaksi QRIS Nusapay (SQ)...\n');

  const orderId = `TEST-SQ-${Date.now()}`;
  const amount  = 50000;
  const sign    = crypto.createHash('md5')
    .update(`${MERCHANT_CODE}${orderId}${amount}${API_KEY}`)
    .digest('hex');

  const payload = {
    merchantCode:    MERCHANT_CODE,
    paymentAmount:   amount,
    paymentMethod:   'SQ',
    merchantOrderId: orderId,
    productDetails:  'Test QRIS Nusapay - Segawon Topup',
    email:           'test@segawontopup.net',
    customerVaName:  'Test Segawon',
    phoneNumber:     '081234567890',
    callbackUrl:     `${process.env.BASE_URL || 'https://segawontopup.net'}/api/duitku/callback`,
    returnUrl:       `${process.env.FRONTEND_URL || 'https://segawontopup.net'}/payment/${orderId}`,
    signature:       sign,
    expiryPeriod:    60,
  };

  console.log('   Request payload:');
  console.log(`      merchantOrderId : ${payload.merchantOrderId}`);
  console.log(`      paymentMethod   : ${payload.paymentMethod} (QRIS Nusapay)`);
  console.log(`      paymentAmount   : Rp ${amount.toLocaleString('id-ID')}`);
  console.log(`      signature (MD5) : ${sign}\n`);

  try {
    const res = await httpsPost('/webapi/api/merchant/v2/inquiry', payload);

    console.log(`   HTTP Status : ${res.status}`);
    console.log('   Full Response:');
    console.log(JSON.stringify(res.data, null, 2));

    if (res.data?.statusCode === '00') {
      console.log('\n   ✅ Transaksi BERHASIL dibuat!');
      console.log(`      Reference    : ${res.data.reference}`);
      console.log(`      Payment URL  : ${res.data.paymentUrl}`);
      console.log(`      vaNumber     : ${res.data.vaNumber || '(kosong)'}`);
      console.log(`      qrString     : ${res.data.qrString ? res.data.qrString.substring(0, 80) + '...' : '(kosong)'}`);
      console.log(`      qrString len : ${res.data.qrString?.length || 0} chars`);

      if (res.data.qrString) {
        console.log('\n   📱 QR Preview URL:');
        console.log(`      https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(res.data.qrString)}`);
      }

      return { reference: res.data.reference, orderId, data: res.data };
    } else {
      console.log(`\n   ❌ Transaksi GAGAL`);
      console.log(`      statusCode    : ${res.data?.statusCode}`);
      console.log(`      statusMessage : ${res.data?.statusMessage}`);
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }

  console.log('');
  return null;
}

// ── Test 3: Cek status transaksi ─────────────────────────────────────────────
async function testCheckStatus(result) {
  if (!result) return;

  console.log('\n3️⃣  Cek Status Transaksi...\n');

  const sign = crypto.createHash('md5')
    .update(`${MERCHANT_CODE}${result.orderId}${API_KEY}`)
    .digest('hex');

  const payload = {
    merchantCode:    MERCHANT_CODE,
    merchantOrderId: result.orderId,
    signature:       sign,
  };

  try {
    const res = await httpsPost('/webapi/api/merchant/transactionStatus', payload);
    console.log('   Response:', JSON.stringify(res.data, null, 2));

    if (res.data?.statusCode === '00') {
      console.log('\n   ✅ Status: SUKSES / LUNAS');
    } else if (res.data?.statusCode === '01') {
      console.log('\n   ⏳ Status: PENDING (menunggu pembayaran)');
    } else {
      console.log(`\n   ℹ️  Status Code: ${res.data?.statusCode}`);
    }
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }

  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  await testGetPaymentMethods();
  const result = await testCreateTransaction();
  await testCheckStatus(result);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Test selesai');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})();