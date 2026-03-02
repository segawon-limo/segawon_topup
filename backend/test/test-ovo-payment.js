/**
 * Test Script: Duitku OVO Payment (OV vs OL)
 * Tujuan: Cek response dari kode OV (OVO Support Void) dan OL (OVO Account Link)
 *
 * Jalankan dari folder backend:
 *   node -r dotenv/config test/test_ovo_payment.js
 *
 * Custom amount:
 *   AMOUNT=50000 node -r dotenv/config test/test_ovo_payment.js
 */
require('dotenv').config({ path: '../.env' });
const https   = require('https');
const crypto  = require('crypto');

const MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE;
const API_KEY       = process.env.DUITKU_API_KEY;
const IS_SANDBOX    = process.env.DUITKU_MODE === 'sandbox';
const BASE_URL      = IS_SANDBOX
  ? 'sandbox.duitku.com'
  : 'passport.duitku.com';

const AMOUNT        = parseInt(process.env.AMOUNT || '50000');
const EMAIL         = process.env.TEST_EMAIL || 'test@segawontopup.net';
const PHONE         = process.env.TEST_PHONE || '085791464598';
const ORDER_ID_BASE = 'TEST-OVO-' + Date.now();

if (!MERCHANT_CODE || !API_KEY) {
  console.error('❌ DUITKU_MERCHANT_CODE atau DUITKU_API_KEY tidak ditemukan di .env');
  process.exit(1);
}

function httpsPost(hostname, path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log(`\n📦 Raw Response (HTTP ${res.statusCode}):\n${data}`);
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function generateSignature(merchantOrderId, amount) {
  // MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
  return crypto.createHash('md5')
    .update(MERCHANT_CODE + merchantOrderId + amount + API_KEY)
    .digest('hex');
}

async function testPaymentMethod(paymentCode, label) {
  const merchantOrderId = `${ORDER_ID_BASE}-${paymentCode}`;
  const signature = generateSignature(merchantOrderId, AMOUNT);

  const payload = {
    merchantCode:    MERCHANT_CODE,
    paymentAmount:   AMOUNT,
    paymentMethod:   paymentCode,
    merchantOrderId: merchantOrderId,
    productDetails:  `Test OVO Payment ${paymentCode}`,
    email:           EMAIL,
    phoneNumber:     PHONE,
    itemDetails: [{
      name:     `Test Product`,
      price:    AMOUNT,
      quantity: 1,
    }],
    customerVaName:  'Test Customer',
    returnUrl:       'https://segawontopup.net/payment/success',
    callbackUrl:     'https://segawontopup.net/api/duitku/callback',
    signature:       signature,
  };

  console.log('\n' + '━'.repeat(60));
  console.log(`🧪 Testing: ${label} (${paymentCode})`);
  console.log('━'.repeat(60));
  console.log('Merchant Code   :', MERCHANT_CODE);
  console.log('Order ID        :', merchantOrderId);
  console.log('Amount          :', AMOUNT);
  console.log('Mode            :', IS_SANDBOX ? '🧪 SANDBOX' : '🚀 PRODUCTION');
  console.log('Payload         :', JSON.stringify(payload, null, 2));

  try {
    const result = await httpsPost(
      BASE_URL,
      '/webapi/api/merchant/v2/inquiry',
      payload
    );

    console.log('\n✅ Parsed Response:');
    console.log(JSON.stringify(result.body, null, 2));

    if (result.body?.paymentUrl) {
      console.log('\n🔗 Payment URL:', result.body.paymentUrl);
    }
    if (result.body?.vaNumber) {
      console.log('🏦 VA Number   :', result.body.vaNumber);
    }
    if (result.body?.qrString) {
      console.log('📱 QR String   :', result.body.qrString?.substring(0, 50) + '...');
    }

    return result;
  } catch (err) {
    console.error(`❌ Error untuk ${paymentCode}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  Duitku OVO Payment Test — OV vs OL');
  console.log('═'.repeat(60));

  // Test OV (OVO Support Void)
  const ovResult = await testPaymentMethod('OV', 'OVO (Support Void)');

  // Jeda 2 detik
  await new Promise(r => setTimeout(r, 2000));

  // Test OL (OVO Account Link)
  const olResult = await testPaymentMethod('OL', 'OVO Account Link');

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`OV (OVO Support Void) : ${ovResult?.body?.statusCode === '00' ? '✅ Sukses' : '❌ Gagal — ' + (ovResult?.body?.statusMessage || 'Unknown')}`);
  console.log(`OL (OVO Account Link) : ${olResult?.body?.statusCode === '00' ? '✅ Sukses' : '❌ Gagal — ' + (olResult?.body?.statusMessage || 'Unknown')}`);
  console.log('═'.repeat(60));
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});