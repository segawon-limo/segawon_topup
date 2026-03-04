/**
 * pascabayar.controller.js
 * 
 * Handles pascabayar (postpaid) transactions via Digiflazz
 * Flow:
 *   1. POST /api/pascabayar/inquiry  → cek tagihan (inq-pasca) ke Digiflazz
 *   2. POST /api/pascabayar/pay      → bayar tagihan (pay-pasca) + buat order + proses Duitku
 *   3. GET  /api/pascabayar/inquiry/:refId → ambil data inquiry tersimpan
 * 
 * Catatan Digiflazz:
 *   - ref_id harus SAMA antara inq-pasca dan pay-pasca
 *   - Pembayaran hanya bisa di hari yang sama dengan inquiry
 */

const crypto         = require('crypto');
const https          = require('https');
const { pool }       = require('../config/database');
const duitkuService  = require('../services/duitku.service');
const voucherService = require('../services/voucher.service');

const DIGIFLAZZ_USERNAME = process.env.DIGIFLAZZ_USERNAME;
const DIGIFLAZZ_API_KEY  = process.env.DIGIFLAZZ_API_KEY;

const IS_PRODUCTION      = process.env.NODE_ENV === 'production';

// ── Helper: HTTP POST ke Digiflazz (native https) ────────────────────────────
const digiflazzPost = (body) => {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'api.digiflazz.com',
      path:     '/v1/transaction',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from Digiflazz')); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
};

// ── Helper: buat signature Digiflazz ─────────────────────────────────────────
const makeSign = (refId) => {
  return crypto
    .createHash('md5')
    .update(DIGIFLAZZ_USERNAME + DIGIFLAZZ_API_KEY + refId)
    .digest('hex');
};

// ── Helper: buat ref_id unik ─────────────────────────────────────────────────
const makeRefId = () => {
  const ts    = Date.now().toString(36).toUpperCase();
  const rand  = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PB-${ts}-${rand}`;
};

// ── Helper: hitung expires_at (akhir hari ini, WIB midnight) ─────────────────
const getTodayMidnight = () => {
  const now = new Date();
  // Set ke 23:59:59 hari ini (server time)
  now.setHours(23, 59, 59, 999);
  return now;
};


/**
 * POST /api/pascabayar/inquiry
 * Body: { buyer_sku_code, customer_no }
 * 
 * Cek tagihan ke Digiflazz, simpan hasilnya ke DB
 */
exports.inquiry = async (req, res) => {
  try {
    const { buyer_sku_code, customer_no } = req.body;

    // Validasi input
    if (!buyer_sku_code || !customer_no) {
      return res.status(400).json({
        success: false,
        message: 'buyer_sku_code dan customer_no wajib diisi'
      });
    }

    const refId = makeRefId();
    const sign  = makeSign(refId);

    console.log(`[PASCABAYAR] Inquiry: sku=${buyer_sku_code} customer=${customer_no} ref=${refId}`);

    // Hit Digiflazz
    const digiJson = await digiflazzPost({
      commands:       'inq-pasca',
      username:       DIGIFLAZZ_USERNAME,
      buyer_sku_code,
      customer_no,
      ref_id:         refId,
      sign,
      ...(!IS_PRODUCTION && { testing: true })
    });

    const data = digiJson?.data;

    console.log(`[PASCABAYAR] Inquiry response:`, JSON.stringify(data));

    // Cek response Digiflazz
    if (!data || data.rc !== '00' || data.status === 'Gagal') {
      return res.status(400).json({
        success: false,
        message: data?.message || 'Gagal mengambil data tagihan',
        rc:      data?.rc
      });
    }

    // Simpan inquiry ke DB
    const expiresAt = getTodayMidnight();
    const detail    = data.desc?.detail || null;

    const insertResult = await pool.query(`
      INSERT INTO pascabayar_inquiries
        (ref_id, customer_no, buyer_sku_code, customer_name,
         selling_price, admin_fee, periode, lembar_tagihan,
         detail, inquiry_data, status, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11)
      ON CONFLICT (ref_id) DO UPDATE SET
        inquiry_data  = EXCLUDED.inquiry_data,
        updated_at    = NOW()
      RETURNING id, ref_id
    `, [
      refId,
      customer_no,
      buyer_sku_code,
      data.customer_name      || null,
      data.selling_price      || null,
      data.admin              || 0,
      data.periode            || null,
      data.desc?.lembar_tagihan || 1,
      detail ? JSON.stringify(detail) : null,
      JSON.stringify(data),
      expiresAt
    ]);

    const inquiry = insertResult.rows[0];

    return res.json({
      success: true,
      message: 'Tagihan berhasil dicek',
      data: {
        ref_id:         refId,
        inquiry_id:     inquiry.id,
        customer_no:    data.customer_no,
        customer_name:  data.customer_name,
        buyer_sku_code: data.buyer_sku_code,
        selling_price:  data.selling_price,
        admin_fee:      data.admin,
        periode:        data.periode,
        lembar_tagihan: data.desc?.lembar_tagihan || 1,
        detail:         data.desc?.detail || [],
        expires_at:     expiresAt
      }
    });

  } catch (err) {
    console.error('[PASCABAYAR] Inquiry error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error saat cek tagihan'
    });
  }
};


/**
 * GET /api/pascabayar/inquiry/:refId
 * 
 * Ambil data inquiry tersimpan (untuk ditampilkan ulang di frontend)
 */
exports.getInquiry = async (req, res) => {
  try {
    const { refId } = req.params;

    const result = await pool.query(`
      SELECT
        id, ref_id, customer_no, buyer_sku_code,
        customer_name, selling_price, admin_fee,
        periode, lembar_tagihan, detail, status,
        order_id, expires_at, created_at
      FROM pascabayar_inquiries
      WHERE ref_id = $1
    `, [refId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry tidak ditemukan'
      });
    }

    const inquiry = result.rows[0];

    // Cek apakah sudah expired
    if (new Date() > new Date(inquiry.expires_at) && inquiry.status === 'pending') {
      await pool.query(
        `UPDATE pascabayar_inquiries SET status = 'expired' WHERE ref_id = $1`,
        [refId]
      );
      inquiry.status = 'expired';
    }

    return res.json({
      success: true,
      data:    inquiry
    });

  } catch (err) {
    console.error('[PASCABAYAR] getInquiry error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


/**
 * POST /api/pascabayar/pay
 * Body: {
 *   ref_id,          -- dari inquiry sebelumnya
 *   customer_email,
 *   customer_name,   -- nama customer (bukan nama pelanggan listrik/internet)
 *   customer_phone,
 *   payment_method   -- kode Duitku (BR, M2, OV, SA, dll)
 * }
 * 
 * Flow:
 *   1. Validasi inquiry masih pending & belum expired
 *   2. Bayar ke Digiflazz (pay-pasca) dengan ref_id yang SAMA
 *   3. Hitung fee payment method
 *   4. Buat order di tabel orders
 *   5. Buat payment di Duitku
 *   6. Update inquiry → status = 'paid', link ke order_id
 */
exports.pay = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      ref_id,
      customer_email,
      customer_name,
      customer_phone,
      payment_method,
      voucher_code     // opsional
    } = req.body;

    // Validasi input
    if (!ref_id || !customer_email || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'ref_id, customer_email, dan payment_method wajib diisi'
      });
    }

    // ── 1. Ambil inquiry dari DB ───────────────────────────────────────────
    const inquiryResult = await client.query(
      `SELECT * FROM pascabayar_inquiries WHERE ref_id = $1`,
      [ref_id]
    );

    if (inquiryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry tidak ditemukan. Lakukan cek tagihan ulang.'
      });
    }

    const inquiry = inquiryResult.rows[0];

    // Cek status inquiry
    if (inquiry.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Tagihan ini sudah dibayar.'
      });
    }
    if (inquiry.status === 'expired' || new Date() > new Date(inquiry.expires_at)) {
      await client.query(
        `UPDATE pascabayar_inquiries SET status = 'expired' WHERE ref_id = $1`,
        [ref_id]
      );
      return res.status(400).json({
        success: false,
        message: 'Inquiry sudah expired. Lakukan cek tagihan ulang.'
      });
    }

    // ── 2. Bayar ke Digiflazz ──────────────────────────────────────────────
    const sign = makeSign(ref_id); // ref_id SAMA dengan inquiry

    console.log(`[PASCABAYAR] Pay: ref=${ref_id} sku=${inquiry.buyer_sku_code}`);

    const digiJson = await digiflazzPost({
      commands:       'pay-pasca',
      username:       DIGIFLAZZ_USERNAME,
      buyer_sku_code: inquiry.buyer_sku_code,
      customer_no:    inquiry.customer_no,
      ref_id,
      sign,
      ...(!IS_PRODUCTION && { testing: true })
    });

    const data = digiJson?.data;

    console.log(`[PASCABAYAR] Pay response:`, JSON.stringify(data));

    if (!data || data.rc === '13') {
      // rc 13 = tagihan sudah dibayar
      return res.status(400).json({
        success: false,
        message: 'Tagihan ini sudah pernah dibayar.',
        rc: data?.rc
      });
    }

    if (!data || (data.status === 'Gagal' && data.rc !== '00')) {
      return res.status(400).json({
        success: false,
        message: data?.message || 'Gagal memproses pembayaran tagihan',
        rc:      data?.rc
      });
    }

    // Status bisa 'Sukses' atau 'Pending' — keduanya lanjut buat order
    const digiStatus = data.status; // 'Sukses' | 'Pending'
    const sn         = data.sn || null;

    // ── 3. Validasi voucher (opsional) ────────────────────────────────────
    let voucherDiscount      = 0;
    let validatedVoucherCode = null;

    if (voucher_code && voucher_code.trim()) {
      const sellingPrice  = inquiry.selling_price || 0;
      // profit = selisih selling_price - price (dari inquiry_data)
      const inquiryRaw    = typeof inquiry.inquiry_data === 'string'
        ? JSON.parse(inquiry.inquiry_data)
        : inquiry.inquiry_data;
      const profitPrice   = sellingPrice - (inquiryRaw?.price || sellingPrice);

      const voucherResult = await voucherService.validateVoucher(
        voucher_code.trim(),
        sellingPrice,
        profitPrice
      );

      if (voucherResult.valid) {
        voucherDiscount      = voucherResult.discount;
        validatedVoucherCode = voucher_code.trim();
        console.log(`[PASCABAYAR] Voucher applied: ${voucher_code} discount=Rp${voucherDiscount}`);
      } else {
        return res.status(400).json({
          success: false,
          message: voucherResult.message || 'Voucher tidak valid'
        });
      }
    }

    // ── 4. Hitung payment fee Duitku ───────────────────────────────────────
    const basePrice = (inquiry.selling_price || 0) - voucherDiscount;
    let paymentFee  = 0;

    if (payment_method === 'M2') {
      paymentFee = 4000;
    } else if (['BR','I1','BT','B1','DM','BV','NC'].includes(payment_method)) {
      paymentFee = 3000;
    } else if (payment_method === 'SA') {
      paymentFee = Math.round(basePrice / 0.98) - basePrice;
    } else if (payment_method === 'OV') {
      paymentFee = Math.round(basePrice / 0.9697) - basePrice;
    } else {
      paymentFee = 3000;
    }

    const totalAmount = basePrice + paymentFee;

    // ── 4. Generate order number ───────────────────────────────────────────
    const today       = new Date();
    const dateStr     = today.toISOString().slice(0,10).replace(/-/g,'');
    const randomPart  = Math.random().toString(36).substring(2,7).toUpperCase();
    const orderNumber = `SGW-${dateStr}-${randomPart}`;

    // ── 5. Begin transaction DB ────────────────────────────────────────────
    await client.query('BEGIN');

    // Insert order — gunakan product_id = NULL untuk pascabayar
    // Simpan info pascabayar di kolom notes / provider_response
    const orderInsert = await client.query(`
      INSERT INTO orders (
        order_number, product_id, customer_email, customer_name,
        customer_phone,
        amount, payment_fee, total_amount,
        payment_method, payment_status,
        voucher_code, voucher_discount,
        notes,
        provider_response, created_at
      ) VALUES (
        $1, NULL, $2, $3,
        $4,
        $5, $6, $7,
        $8, 'pending',
        $9, $10,
        $11,
        $12, NOW()
      ) RETURNING id
    `, [
      orderNumber,
      customer_email,
      customer_name    || inquiry.customer_name,
      customer_phone   || null,
      inquiry.selling_price || 0,   // amount = selling_price sebelum diskon
      paymentFee,
      totalAmount,
      payment_method,
      validatedVoucherCode,
      voucherDiscount,
      // notes: simpan info pascabayar ringkas
      `PASCABAYAR | ${inquiry.buyer_sku_code.toUpperCase()} | ${inquiry.customer_no} | ${inquiry.periode || '-'}`,
      JSON.stringify({
        type:           'pascabayar',
        buyer_sku_code: inquiry.buyer_sku_code,
        customer_no:    inquiry.customer_no,
        ref_id,
        digiflazz_status: digiStatus,
        sn,
        periode:        inquiry.periode,
        lembar_tagihan: inquiry.lembar_tagihan,
        detail:         inquiry.detail,
        digiflazz_data: data
      })
    ]);

    const orderId = orderInsert.rows[0].id;

    // ── 6. Buat payment Duitku via duitkuService langsung ────────────────
    let paymentResult = null;

    try {
      paymentResult = await duitkuService.createTransaction({
        merchantOrderId: orderNumber,
        paymentAmount:   totalAmount,
        paymentMethod:   payment_method,
        productDetails:  `${inquiry.buyer_sku_code.toUpperCase()} - ${inquiry.periode || inquiry.customer_no}`,
        email:           customer_email,
        customerVaName:  customer_name || inquiry.customer_name || customer_email,
        phoneNumber:     customer_phone || '08000000000',
        callbackUrl:     `${process.env.BASE_URL}/api/duitku/callback`,
        returnUrl:       `${process.env.FRONTEND_URL}/payment/${orderNumber}`,
        expiryPeriod:    1440
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.message || 'Duitku error');
      }
    } catch (duitkuErr) {
      console.error('[PASCABAYAR] Duitku error:', duitkuErr);
      await client.query('ROLLBACK');
      return res.status(500).json({
        success: false,
        message: 'Gagal membuat pembayaran. Silakan coba lagi.'
      });
    }

    // Update order dengan payment info dari Duitku
    await client.query(`
      UPDATE orders SET
        payment_url        = $1,
        payment_reference  = $2,
        payment_expires_at = NOW() + INTERVAL '24 hours',
        provider_response  = $3,
        updated_at         = NOW()
      WHERE id = $4
    `, [
      paymentResult.paymentUrl,
      paymentResult.reference,
      JSON.stringify({ duitku: paymentResult }),
      orderId
    ]);

    // Update inquiry → paid, link ke order
    await client.query(`
      UPDATE pascabayar_inquiries
      SET status = 'paid', order_id = $1, updated_at = NOW()
      WHERE ref_id = $2
    `, [orderId, ref_id]);

    await client.query('COMMIT');

    console.log(`[PASCABAYAR] Order created: ${orderNumber} orderId=${orderId}`);

    return res.json({
      success:        true,
      message:        'Berhasil. Lanjutkan pembayaran.',
      orderNumber,
      paymentUrl:     paymentResult.paymentUrl,
      paymentMethod:  payment_method,
      sellingPrice:   inquiry.selling_price || 0,
      voucherDiscount,
      voucherCode:    validatedVoucherCode,
      basePrice,
      paymentFee,
      totalAmount
    });

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[PASCABAYAR] Pay error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error saat memproses pembayaran'
    });
  } finally {
    client.release();
  }
};


/**
 * GET /api/pascabayar/products
 * 
 * Daftar produk pascabayar yang tersedia
 * (hardcoded untuk sekarang, bisa dikembangkan dari DB nanti)
 */
exports.getProducts = async (req, res) => {
  const products = [
    {
      buyer_sku_code: 'myrepublic',
      name:           'MyRepublic Internet',
      category:       'Internet',
      icon:           '🌐',
      description:    'Pembayaran tagihan internet MyRepublic',
      customer_no_label: 'Nomor Pelanggan MyRepublic',
      customer_no_hint:  'Contoh: 6391601001'
    }
    // Tambah produk lain di sini nanti:
    // { buyer_sku_code: 'pln', name: 'PLN Pascabayar', ... }
    // { buyer_sku_code: 'bpjs', name: 'BPJS Kesehatan', ... }
  ];

  return res.json({ success: true, data: products });
};