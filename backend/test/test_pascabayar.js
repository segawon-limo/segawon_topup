/**
 * test_pascabayar.js
 * 
 * Testing script untuk endpoint pascabayar
 * Jalankan: node test_pascabayar.js
 * 
 * Pastikan server sudah running: pm2 start / node index.js
 */
require('dotenv').config({ path: '../.env' });
const BASE_URL = 'https://segawontopup.net'; // ganti ke http://localhost:PORT saat dev

// ── Warna console ─────────────────────────────────────────────────────────────
const C = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

const log   = (msg)       => console.log(msg);
const ok    = (msg)       => console.log(C.green(`  ✅ ${msg}`));
const fail  = (msg)       => console.log(C.red(`  ❌ ${msg}`));
const info  = (msg)       => console.log(C.cyan(`  ℹ️  ${msg}`));
const warn  = (msg)       => console.log(C.yellow(`  ⚠️  ${msg}`));
const title = (msg)       => console.log(C.bold(`\n${'─'.repeat(50)}\n${msg}\n${'─'.repeat(50)}`));

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function request(method, path, body = null) {
  const https = require('https');
  const http  = require('http');
  const url   = new URL(BASE_URL + path);
  const lib   = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':   'application/json',
        ...(bodyStr && { 'Content-Length': Buffer.byteLength(bodyStr) })
      }
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
let savedRefId = null;

async function testGetProducts() {
  title('TEST 1: GET /api/pascabayar/products');
  try {
    const res = await request('GET', '/api/pascabayar/products');
    log(`  Status: ${res.status}`);

    if (res.status === 200 && res.body.success) {
      ok(`Berhasil. ${res.body.data.length} produk ditemukan`);
      res.body.data.forEach(p => info(`${p.name} (${p.buyer_sku_code})`));
    } else {
      fail(`Gagal: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    fail(`Error: ${err.message}`);
  }
}

async function testInquiry() {
  title('TEST 2: POST /api/pascabayar/inquiry (TEST MODE)');
  try {
    // Test case dari Digiflazz untuk INTERNET
    const body = {
      buyer_sku_code: 'MYRPB',
      customer_no:    '2190852'  // nomor test Digiflazz
    };
    info(`Request: ${JSON.stringify(body)}`);

    const res = await request('POST', '/api/pascabayar/inquiry', body);
    log(`  Status: ${res.status}`);
    log(`  Response: ${JSON.stringify(res.body, null, 2)}`);

    if (res.status === 200 && res.body.success) {
      ok('Inquiry berhasil!');
      savedRefId = res.body.data.ref_id;
      ok(`ref_id tersimpan: ${savedRefId}`);
      info(`customer_name: ${res.body.data.customer_name}`);
      info(`selling_price: Rp ${res.body.data.selling_price?.toLocaleString('id-ID')}`);
      info(`periode: ${res.body.data.periode}`);
      info(`lembar_tagihan: ${res.body.data.lembar_tagihan}`);
      if (res.body.data.detail?.length > 0) {
        info(`detail: ${JSON.stringify(res.body.data.detail)}`);
      }
    } else {
      warn(`Inquiry gagal (mungkin kode SKU belum aktif di akun Digiflazz)`);
      warn(`Response: ${JSON.stringify(res.body)}`);
      warn(`Cek buyer_sku_code yang benar di dashboard Digiflazz`);
    }
  } catch (err) {
    fail(`Error: ${err.message}`);
  }
}

async function testGetInquiry() {
  title('TEST 3: GET /api/pascabayar/inquiry/:refId');
  if (!savedRefId) {
    warn('Skip — tidak ada refId dari test sebelumnya');
    return;
  }

  try {
    const res = await request('GET', `/api/pascabayar/inquiry/${savedRefId}`);
    log(`  Status: ${res.status}`);

    if (res.status === 200 && res.body.success) {
      ok('Data inquiry ditemukan di DB');
      info(`status: ${res.body.data.status}`);
      info(`expires_at: ${res.body.data.expires_at}`);
    } else {
      fail(`Gagal: ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    fail(`Error: ${err.message}`);
  }
}

async function testInquiryValidation() {
  title('TEST 4: Validasi input inquiry (harus error)');
  try {
    const res = await request('POST', '/api/pascabayar/inquiry', {
      buyer_sku_code: 'myrepublic'
      // customer_no sengaja tidak dikirim
    });
    log(`  Status: ${res.status}`);

    if (res.status === 400 && !res.body.success) {
      ok(`Validasi benar: ${res.body.message}`);
    } else {
      fail(`Seharusnya return 400, dapat: ${res.status}`);
    }
  } catch (err) {
    fail(`Error: ${err.message}`);
  }
}

async function testNotFoundInquiry() {
  title('TEST 5: GET inquiry dengan refId tidak ada');
  try {
    const res = await request('GET', '/api/pascabayar/inquiry/REF-TIDAK-ADA-123');
    log(`  Status: ${res.status}`);

    if (res.status === 404) {
      ok(`404 benar dikembalikan`);
    } else {
      fail(`Seharusnya 404, dapat: ${res.status}`);
    }
  } catch (err) {
    fail(`Error: ${err.message}`);
  }
}

// Tes bayar — hanya jalankan jika inquiry berhasil dan kamu konfirmasi
async function testPay() {
  title('TEST 6: POST /api/pascabayar/pay (SKIP - manual only)');
  warn('Test ini tidak dijalankan otomatis karena akan membuat order nyata.');
  warn('Untuk test manual, uncomment kode di bawah dan isi data yang valid.');

  /*
  // Uncomment untuk test manual:
  if (!savedRefId) {
    warn('Tidak ada refId');
    return;
  }
  const res = await request('POST', '/api/pascabayar/pay', {
    ref_id:         savedRefId,
    customer_email: 'test@example.com',
    customer_name:  'Test Customer',
    customer_phone: '08123456789',
    payment_method: 'BR'  // BRI VA
  });
  log(`  Status: ${res.status}`);
  log(`  Response: ${JSON.stringify(res.body, null, 2)}`);
  */
}

// ── Run all tests ─────────────────────────────────────────────────────────────
(async () => {
  log(C.bold('\n🧪 PASCABAYAR ENDPOINT TESTS'));
  log(`   Base URL: ${BASE_URL}`);
  log(`   Time: ${new Date().toLocaleString('id-ID')}\n`);

  await testGetProducts();
  await testInquiry();
  await testGetInquiry();
  await testInquiryValidation();
  await testNotFoundInquiry();
  await testPay();

  log(C.bold('\n✅ Semua test selesai\n'));
})();