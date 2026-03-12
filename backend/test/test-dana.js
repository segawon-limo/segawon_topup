// test-dana.js
// Testing raw response Duitku saat pakai DANA (code: DA)
// Jalankan: node test-dana.js
// Jalankan sandbox: DUITKU_MODE=sandbox node test-dana.js

require('dotenv').config();
const crypto = require('crypto');
const axios  = require('axios');

// ── Config ────────────────────────────────────────────────────
const IS_SANDBOX   = process.env.DUITKU_MODE === 'sandbox';
const MERCHANT     = IS_SANDBOX
  ? (process.env.DUITKU_SANDBOX_MERCHANT_CODE || 'DS27856')
  : process.env.DUITKU_MERCHANT_CODE;
const API_KEY      = IS_SANDBOX
  ? (process.env.DUITKU_SANDBOX_API_KEY || '87c3877e96d2bfcde05ff66638b57a13')
  : process.env.DUITKU_API_KEY;
const BASE_URL     = IS_SANDBOX
  ? 'https://sandbox.duitku.com/webapi/api/merchant'
  : 'https://passport.duitku.com/webapi/api/merchant';

const TEST_AMOUNT  = 15000; // Rp 15.000 — above minimum
const ORDER_ID     = `TEST-DANA-${Date.now()}`;

console.log('══════════════════════════════════════════');
console.log('  DUITKU — DANA PAYMENT METHOD TEST');
console.log('══════════════════════════════════════════');
console.log(`Mode        : ${IS_SANDBOX ? '🟡 SANDBOX' : '🔴 PRODUCTION'}`);
console.log(`Merchant    : ${MERCHANT}`);
console.log(`API Key     : ${API_KEY ? API_KEY.slice(0, 8) + '...' : '❌ NOT SET'}`);
console.log(`Base URL    : ${BASE_URL}`);
console.log(`Order ID    : ${ORDER_ID}`);
console.log(`Amount      : Rp ${TEST_AMOUNT.toLocaleString('id-ID')}`);
console.log('');

if (!MERCHANT || !API_KEY) {
  console.error('❌ MERCHANT CODE atau API KEY tidak ditemukan di .env!');
  process.exit(1);
}

// ── Signature helpers ─────────────────────────────────────────
function signaturePaymentMethod(amount) {
  const datetime = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const str      = `${MERCHANT}${amount}${datetime}${API_KEY}`;
  return {
    datetime,
    signature: crypto.createHash('sha256').update(str).digest('hex'),
  };
}

function signatureTransaction(orderId, amount) {
  const str = `${MERCHANT}${orderId}${amount}${API_KEY}`;
  return crypto.createHash('md5').update(str).digest('hex');
}

// ── TEST 1: Get Payment Methods — cek apakah DA muncul ────────
async function testGetPaymentMethods() {
  console.log('──────────────────────────────────────────');
  console.log('TEST 1: Get Payment Methods (cek DA tersedia)');
  console.log('──────────────────────────────────────────');

  const { datetime, signature } = signaturePaymentMethod(TEST_AMOUNT);

  const payload = {
    merchantcode: MERCHANT,
    amount:       TEST_AMOUNT,
    datetime,
    signature,
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('');

  try {
    const res = await axios.post(
      `${BASE_URL}/paymentmethod/getpaymentmethod`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('✅ Response status:', res.status);
    console.log('');

    const methods = res.data?.paymentFee || [];
    const dana    = methods.find(m => m.paymentMethod === 'DA');

    console.log(`Total payment methods: ${methods.length}`);
    console.log('');

    if (dana) {
      console.log('✅ DANA (DA) DITEMUKAN:');
      console.log(JSON.stringify(dana, null, 2));
    } else {
      console.log('❌ DANA (DA) TIDAK ADA di response');
      console.log('');
      console.log('Semua methods yang tersedia:');
      methods.forEach(m => {
        console.log(`  - ${m.paymentMethod.padEnd(4)} | ${m.paymentName.padEnd(30)} | Fee: Rp ${m.totalFee}`);
      });
    }

    return dana;
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    return null;
  }
}

// ── TEST 2: Create Transaction pakai DA ───────────────────────
async function testCreateTransaction() {
  console.log('');
  console.log('──────────────────────────────────────────');
  console.log('TEST 2: Create Transaction dengan DANA (DA)');
  console.log('──────────────────────────────────────────');

  const signature = signatureTransaction(ORDER_ID, TEST_AMOUNT);

  const payload = {
    merchantCode:    MERCHANT,
    paymentAmount:   TEST_AMOUNT,
    paymentMethod:   'DA',
    merchantOrderId: ORDER_ID,
    productDetails:  'Test Top Up DANA Segawon',
    customerVaName:  'Test Customer',
    email:           'test@segawontopup.net',
    phoneNumber:     '081234567890',
    callbackUrl:     'https://segawontopup.net/api/duitku/callback',
    returnUrl:       'https://segawontopup.net/order/success',
    signature,
    expiryPeriod:    60,
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('');

  try {
    const res = await axios.post(
      `${BASE_URL}/v2/inquiry`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('✅ Response status:', res.status);
    console.log('');
    console.log('RAW RESPONSE:');
    console.log(JSON.stringify(res.data, null, 2));
    console.log('');

    // Parse field penting
    const data = res.data;
    console.log('── Field Summary ──────────────────────');
    console.log(`paymentUrl     : ${data.paymentUrl      || '(kosong)'}`);
    console.log(`merchantOrderId: ${data.merchantOrderId || '(kosong)'}`);
    console.log(`reference      : ${data.reference       || '(kosong)'}`);
    console.log(`statusCode     : ${data.statusCode      || '(kosong)'}`);
    console.log(`statusMessage  : ${data.statusMessage   || '(kosong)'}`);
    console.log(`vaNumber       : ${data.vaNumber        || '(tidak ada — expected untuk e-wallet)'}`);
    console.log(`qrString       : ${data.qrString        || '(tidak ada)'}`);

    if (data.paymentUrl) {
      console.log('');
      console.log('✅ DANA berhasil! Payment URL:');
      console.log(`   ${data.paymentUrl}`);
      console.log('');
      console.log('👆 Buka URL ini di browser untuk lanjut bayar via DANA');
    }

  } catch (err) {
    console.error('❌ Error HTTP:', err.response?.status);
    console.error('RAW ERROR RESPONSE:');
    console.error(JSON.stringify(err.response?.data, null, 2));
    console.error('Message:', err.message);
  }
}

// ── Run ───────────────────────────────────────────────────────
(async () => {
  const dana = await testGetPaymentMethods();

  if (!dana && !IS_SANDBOX) {
    console.log('');
    console.log('⚠️  DA tidak muncul di getPaymentMethod tapi tetap lanjut test create transaction...');
  }

  await testCreateTransaction();

  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  TEST SELESAI');
  console.log('══════════════════════════════════════════');
})();