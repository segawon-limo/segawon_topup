/**
 * Order Controller - UPDATED for Custom Payment Page
 * Modified to return payment info instead of redirecting to Duitku
 * UPDATED: Use profit_price for admin voucher (simpler & more flexible)
 */

const { pool } = require('../config/database');
const duitkuService = require('../services/duitku.service');
const voucherService = require('../services/voucher.service');
const emailService = require('../services/email.service');

/**
 * Get all games
 * GET /api/games
 */
exports.getGames = async (req, res) => {
  try {
    const { category } = req.query; // ?category=games | voucher | utilities | pulsa_data

    let query = `
      SELECT id, name, slug, description, icon_url,
             category, product_type, is_active, sort_order
      FROM games
      WHERE is_active = true
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ` ORDER BY sort_order ASC, name ASC`;

    const result = await pool.query(query, params);

    // Jika tidak ada filter category, kelompokkan per category untuk frontend
    if (!category) {
      const grouped = {};
      result.rows.forEach((g) => {
        const cat = g.category || 'games';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(g);
      });

      return res.json({
        success: true,
        games: result.rows,   // flat list (kompatibel dengan kode lama)
        grouped: grouped      // grouped per category (untuk HomePage baru)
      });
    }

    res.json({
      success: true,
      games: result.rows
    });

  } catch (error) {
    console.error('Get Games Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get games'
    });
  }
};

/**
 * Get products by game slug
 * GET /api/products/:gameSlug
 */
exports.getProducts = async (req, res) => {
  try {
    const { gameSlug } = req.params;

    // Get game — include category, product_type & form_config
    const gameResult = await pool.query(
      `SELECT id, name, slug, icon_url, category, product_type, form_config,
              section_general_label, section_bundle_label
       FROM games WHERE slug = $1 AND is_active = true`,
      [gameSlug]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    const game = gameResult.rows[0];

    // Get products — include compare_price & compare_percentage untuk harga coret
    const productsResult = await pool.query(`
      SELECT 
        p.id, p.name, p.description, p.sku,
        p.base_price, p.selling_price, p.profit_price,
        p.is_active, p.sort_order, p.seller_available,
        p.compare_price, p.compare_percentage,
        p.section,
        g.icon_product_url,
        g.icon_product_bundle_url
      FROM products p
      JOIN games g ON g.id = p.game_id
      WHERE p.game_id = $1 AND p.is_active = true
      ORDER BY p.sort_order ASC, p.selling_price ASC
    `, [game.id]);

    res.json({
      success: true,
      game: {
        id:           game.id,
        name:         game.name,
        slug:         game.slug,
        icon_url:     game.icon_url,
        category:     game.category     || 'games',
        product_type: game.product_type || 'topup_game',
        form_config:  game.form_config  || null,
        section_general_label: game.section_general_label || null,
        section_bundle_label:  game.section_bundle_label  || null,
      },
      products: productsResult.rows.map(p => ({
        id:               p.id,
        name:             p.name,
        description:      p.description,
        sku:              p.sku,
        price:            parseFloat(p.selling_price),
        displayPrice:     `Rp ${parseFloat(p.selling_price).toLocaleString('id-ID')}`,
        section:          p.section || null,
        icon_product_url: p.section === 'bundle'
          ? (p.icon_product_bundle_url || p.icon_product_url || null)
          : (p.icon_product_url || null),
        seller_available: p.seller_available !== false,
        compare_price:      p.compare_price ? parseFloat(p.compare_price) : null,
        compare_percentage: p.compare_percentage || null,
      }))
    });

  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products'
    });
  }
};

/**
 * Validate Riot ID
 * POST /api/validate-riot-id
 */
exports.validateRiotId = async (req, res) => {
  try {
    const { riotId, riotTag } = req.body;

    if (!riotId || !riotTag) {
      return res.status(400).json({
        success: false,
        message: 'Riot ID and tag are required'
      });
    }

    // Basic validation
    if (riotId.length < 3 || riotId.length > 16) {
      return res.status(400).json({
        success: false,
        message: 'Riot ID must be 3-16 characters'
      });
    }

    if (riotTag.length < 3 || riotTag.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Riot tag must be 3-5 characters'
      });
    }

    // TODO: Add actual Riot API validation if needed

    res.json({
      success: true,
      message: 'Riot ID is valid',
      riotId: `${riotId}#${riotTag}`
    });

  } catch (error) {
    console.error('Validate Riot ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate Riot ID'
    });
  }
};

/**
 * Cek Nomor Meter / ID Pelanggan PLN via Digiflazz PLNCEK
 * POST /api/check-pln-meter
 * Body: { nomorMeter: "45107107679" }
 * Direct call ke Digiflazz /v1/inquiry-pln — synchronous, tidak perlu polling
 */
// POST /api/check-pln-meter
exports.checkPlnMeter = async (req, res) => {
  try {
    const { nomorMeter } = req.body;

    if (!nomorMeter || !nomorMeter.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Nomor meter wajib diisi' });
    }

    const meter = nomorMeter.toString().trim();

    // Validasi: hanya angka, 11-12 digit
    if (!/^\d{11,12}$/.test(meter)) {
      return res.status(400).json({
        success: false,
        message: 'Nomor meter harus 11-12 digit angka',
      });
    }

    const crypto  = require('crypto');
    const https   = require('https');

    const username = process.env.DIGIFLAZZ_USERNAME;
    const mode     = (process.env.DIGIFLAZZ_MODE || 'production').toLowerCase();
    const apiKey   = mode === 'production'
      ? process.env.DIGIFLAZZ_PRODUCTION_KEY
      : process.env.DIGIFLAZZ_DEVELOPMENT_KEY;

    if (!username || !apiKey) {
      console.error('checkPlnMeter: DIGIFLAZZ_USERNAME atau API KEY belum diisi di .env');
      return res.status(500).json({ success: false, message: 'Konfigurasi Digiflazz belum lengkap' });
    }

    const sign    = crypto.createHash('md5').update(username + apiKey + meter).digest('hex');
    const payload = JSON.stringify({ username, customer_no: meter, sign });

    // ── Helper: HTTPS POST dengan timeout ────────────────────
    function httpsPost(path, body) {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.digiflazz.com',
          path,
          method:   'POST',
          headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        };
        const req = https.request(options, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error('Invalid JSON dari Digiflazz')); }
          });
        });
        req.setTimeout(15000, () => {
          req.destroy(new Error('Digiflazz inquiry-pln timeout'));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
    }

    // ── Fase 1: Coba inquiry-pln dulu ────────────────────────
    let useInquiry = true;
    let data;
    try {
      console.log(`[PLN Inquiry] Mencoba inquiry-pln untuk ${meter}...`);
      data = await httpsPost('/v1/inquiry-pln', payload);
      const d = data.data || data;
      console.log(`[PLN Inquiry] inquiry-pln response → status: ${d.status}, rc: ${d.rc}, nama: ${d.name}`);

      if (d.status === 'Sukses' || d.rc === '00') {
        // Normalisasi segment_power → tarif & daya
        // inquiry-pln: "R1/900" → split → tarif="R1", daya="900"
        // Tambahkan " VA" agar konsisten dengan format PLNCEK
        const parts  = (d.segment_power || '').split('/').map(s => s.trim());
        const tarif  = parts[0] || null;
        const dayaRaw = parts[1] || null;
        const daya   = dayaRaw ? (dayaRaw.toUpperCase().endsWith('VA') ? dayaRaw : dayaRaw + ' VA') : null;

        return res.json({
          success: true,
          idpel:   d.customer_no || meter,
          nama:    d.name        || null,
          tarif,
          daya,
          noMeter: d.meter_no    || meter,
          method:  'inquiry-pln',
        });
      }

      // inquiry-pln gagal → tentukan apakah ini salah user atau service error
      const rc  = d.rc || '';
      const msg = (d.message || '').toLowerCase();

      // RC yang PASTI salah nomor user (bukan service error) — jangan fallback
      // RC 40 = nomor pelanggan tidak ditemukan
      // RC 41 = nomor pelanggan tidak valid / format salah
      const isUserError = ['40', '41'].includes(rc) ||
                          msg.includes('tidak ditemukan') ||
                          msg.includes('tidak valid') ||
                          msg.includes('nomor salah') ||
                          msg.includes('pelanggan tidak');

      if (isUserError) {
        // Nomor memang salah — langsung return error, jangan fallback
        return res.status(400).json({
          success: false,
          message: d.message || 'Nomor meter tidak ditemukan',
        });
      }

      // Semua RC lain (termasuk 02, 14, timeout, dll) → fallback ke PLNCEK
      console.warn(`[PLN Inquiry] inquiry-pln gagal (rc=${rc}, msg="${d.message}"), fallback ke PLNCEK...`);
      useInquiry = false;

    } catch (inquiryErr) {
      console.warn(`[PLN Inquiry] inquiry-pln gagal: ${inquiryErr.message}, fallback ke PLNCEK...`);
      useInquiry = false;
    }

    // ── Fase 2: Fallback ke PLNCEK (async + poll) ────────────
    if (!useInquiry) {
      const digiflazzService = require('../services/digiflazz.service');
      console.log(`[PLN PLNCEK] Menjalankan PLNCEK untuk ${meter}...`);

      const plncekResult = await digiflazzService.checkPlnMeter(meter);

      if (!plncekResult.success) {
        return res.status(400).json({
          success: false,
          message: plncekResult.message || 'Nomor meter tidak ditemukan',
        });
      }

      // PLNCEK sukses langsung (sync response)
      if (plncekResult.idpel || plncekResult.nama) {
        return res.json({
          success: true,
          idpel:   plncekResult.idpel  || meter,
          nama:    plncekResult.nama   || null,
          tarif:   plncekResult.tarif  || null,
          daya:    plncekResult.daya   || null,
          noMeter: meter,
          method:  'plncek-sync',
        });
      }

      // PLNCEK async — polling hingga selesai (max 30 detik)
      const { pool: dbPool } = require('../config/database');
      const refId = plncekResult.refId;
      console.log(`[PLN PLNCEK] Polling refId: ${refId}`);

      const POLL_INTERVAL = 2000;  // 2 detik
      const POLL_TIMEOUT  = 30000; // 30 detik max
      const startTime = Date.now();

      while (Date.now() - startTime < POLL_TIMEOUT) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));

        const row = await dbPool.query(
          `SELECT status, idpel, nama, tarif, daya, message
           FROM pln_meter_checks
           WHERE ref_id = $1`,
          [refId]
        );

        if (row.rows.length === 0) continue;
        const check = row.rows[0];

        if (check.status === 'success') {
          console.log(`[PLN PLNCEK] ✅ ${meter} → nama: ${check.nama}`);
          return res.json({
            success: true,
            idpel:   check.idpel  || meter,
            nama:    check.nama   || null,
            tarif:   check.tarif  || null,
            daya:    check.daya   || null,
            noMeter: meter,
            method:  'plncek-async',
          });
        }

        if (check.status === 'failed') {
          return res.status(400).json({
            success: false,
            message: check.message || 'Nomor meter tidak ditemukan',
          });
        }

        // status masih 'pending' → lanjut poll
        console.log(`[PLN PLNCEK] Masih pending... (${Math.round((Date.now() - startTime) / 1000)}s)`);
      }

      // Timeout polling
      console.error(`[PLN PLNCEK] Timeout setelah 30 detik untuk refId: ${refId}`);
      return res.status(504).json({
        success: false,
        message: 'Pengecekan nomor meter timeout. Silakan coba lagi.',
      });
    }

  } catch (error) {
    console.error('checkPlnMeter Error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengecek nomor meter' });
  }
};

// GET /api/check-pln-meter/:refId
// Polling — cek apakah hasil PLNCEK sudah tersedia
exports.getPlnMeterResult = async (req, res) => {
  try {
    const { refId } = req.params;
    if (!refId || !refId.startsWith('CEK-')) {
      return res.status(400).json({ success: false, message: 'refId tidak valid' });
    }

    const { pool } = require('../config/database');
    const result = await pool.query(
      `SELECT status, idpel, nama, tarif, daya, message
       FROM pln_meter_checks
       WHERE ref_id = $1 AND expires_at > NOW()`,
      [refId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan atau sudah expired' });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      status:  row.status,           // pending | success | failed
      idpel:   row.idpel,
      nama:    row.nama,
      tarif:   row.tarif,
      daya:    row.daya,
      message: row.message,
    });

  } catch (error) {
    console.error('getPlnMeterResult Error:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil hasil cek meter' });
  }
};

/**
 * Create order with Duitku payment
 * POST /api/orders/create
 * 
 * UPDATED: Return payment info instead of redirecting to Duitku
 * UPDATED: Use profit_price for admin voucher (simpler than base_price calculation)
 */
exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      productId,
      paymentMethod,
      customerEmail,
      customerName,
      phoneNumber,
      gameUserId,      // Generic field
      gameZoneId,      // Generic field (optional)
      voucherCode,     // Voucher code
      // Legacy support for Valorant
      riotId,
      riotTag
    } = req.body;

    // Use generic fields or fall back to Valorant-specific fields
    const userId = gameUserId || riotId || null;
    const zoneId = gameZoneId || riotTag || null;

    // Validate required fields
    if (!productId || !paymentMethod || !customerEmail || !phoneNumber) {
      throw new Error('Missing required fields: productId, paymentMethod, customerEmail, phoneNumber');
    }

    // Fallback nama: pakai bagian sebelum @ dari email jika nama kosong
    const resolvedName = (customerName && customerName.trim())
      ? customerName.trim()
      : customerEmail.split('@')[0];

    // 1. Get product + product_type dari game — UPDATED: Fetch profit_price & product_type
    const productResult = await client.query(
      `SELECT p.id, p.name, p.sku, p.selling_price, p.profit_price, p.description,
              g.product_type, g.category
       FROM products p
       JOIN games g ON g.id = p.game_id
       WHERE p.id = $1 AND p.is_active = true`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }

    const product = productResult.rows[0];
    const productPrice = parseFloat(product.selling_price);
    const profitPrice  = parseFloat(product.profit_price);
    const productType  = product.product_type || 'topup_game';

    // userId wajib untuk semua produk KECUALI voucher_code (Steam Wallet, dll)
    const needsUserId = productType !== 'voucher_code';
    if (needsUserId && !userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID / nomor tujuan wajib diisi untuk produk ini'
      });
    }

    // NEW: Validate voucher if provided - WITH PROFIT PRICE
    let voucherDiscount = 0;
    let validatedVoucherCode = null;
    
    if (voucherCode && voucherCode.trim()) {
      // Pass profitPrice for admin voucher + email/phone for per-user limit
      const voucherResult = await voucherService.validateVoucher(
        voucherCode.trim(), 
        productPrice,
        profitPrice,
        customerEmail || null,
        phoneNumber   || null
      );
      
      if (voucherResult.valid) {
        voucherDiscount = voucherResult.discount;
        validatedVoucherCode = voucherCode.trim();
        
        // Log admin voucher usage
        if (voucherResult.voucher && voucherResult.voucher.discount_type === 'base_price') {
          console.log(`[ADMIN VOUCHER USED]`);
          console.log(`  Code: ${voucherCode}`);
          console.log(`  Product: ${product.name} (ID: ${product.id})`);
          console.log(`  Customer: ${customerEmail}`);
          console.log(`  Selling Price: Rp ${productPrice.toLocaleString('id-ID')}`);
          console.log(`  Profit Price: Rp ${profitPrice.toLocaleString('id-ID')}`);
          console.log(`  Discount (= Profit): Rp ${voucherDiscount.toLocaleString('id-ID')}`);
          console.log(`  Final Price: Rp ${(productPrice - voucherDiscount).toLocaleString('id-ID')}`);
          console.log(`  Timestamp: ${new Date().toISOString()}`);
        }
      } else {
        // Return error if invalid voucher is provided
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: voucherResult.message
        });
      }
    }

    // Calculate price after voucher discount
    const priceAfterDiscount = productPrice - voucherDiscount;

    // 2. Calculate payment fee - Based on price AFTER voucher discount
    let paymentFee = 0;

    // Kode Duitku VA yang aktif (BCA dihapus, BNC/BSI/Danamon ditambah)
    // BR=BRI | M2=Mandiri | NC=BNC | I1=BNI | BV=BSI | B1=CIMB | DM=Danamon | BT=Permata
    const duitkuVaMandiri  = ['M2'];
    const duitkuVaLainnya  = ['BR', 'I1', 'BT', 'B1', 'DM', 'BV', 'NC'];
    const duitkuEwallet    = ['OV', 'SA'];

    if (duitkuVaMandiri.includes(paymentMethod)) {
      // Mandiri VA - Rp 4.000
      paymentFee = 4000;
    } else if (duitkuVaLainnya.includes(paymentMethod)) {
      // VA lainnya (BRI, BNC, BNI, BSI, CIMB, Danamon, Permata) - Rp 3.000
      paymentFee = 3000;
          } else if (paymentMethod === 'SQ') {
      // QRIS Nusapay — 0.7% dari harga setelah diskon
      paymentFee = Math.round(priceAfterDiscount / 0.993) - priceAfterDiscount; // Alternatif: hitung mundur dari total
    } else if (paymentMethod === 'SA') {
      // ShopeePay — 2% dari harga setelah diskon
      paymentFee = Math.round(priceAfterDiscount / 0.98) - priceAfterDiscount;
    } else if (paymentMethod === 'OV') {
      // OVO — 3.03% dari harga setelah diskon
      paymentFee = Math.round(priceAfterDiscount / 0.9697) - priceAfterDiscount;
    } else {
      // Default fallback
      paymentFee = 3000;
    }

    const totalAmount = priceAfterDiscount + paymentFee;

    // 3. Generate order number
    const rand = Math.random().toString(36).substring(2, 4).toUpperCase();
    const tail = Date.now().toString().slice(-3);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `SGW-${date}-${rand}${tail}`;

    // 4. Insert order
    const orderResult = await client.query(`
      INSERT INTO orders (
        order_number,
        product_id,
        customer_email,
        customer_name,
        customer_phone,
        game_user_id,
        game_user_tag,
        amount,
        payment_fee,
        subtotal,
        total_amount,
        payment_method,
        payment_gateway,
        payment_status,
        order_status,
        voucher_code,
        voucher_discount,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING *
    `, [
      orderNumber,
      productId,
      customerEmail,
      resolvedName,
      phoneNumber,
      userId,
      zoneId || null,
      productPrice,           // Original selling price
      paymentFee,
      priceAfterDiscount,     // Subtotal after voucher discount
      totalAmount,
      paymentMethod,
      'duitku',
      'pending',
      'pending',
      validatedVoucherCode,
      voucherDiscount
    ]);

    const order = orderResult.rows[0];

    // NEW: Increment voucher usage if voucher was used
    if (validatedVoucherCode) {
      await voucherService.incrementVoucherUsage(validatedVoucherCode);
      await voucherService.recordVoucherUsage(validatedVoucherCode, orderNumber, customerEmail, phoneNumber);
    }

    // 5. Create Duitku payment
    const duitkuMethod = duitkuService.getPaymentMethodCode(paymentMethod);
    
    const paymentResult = await duitkuService.createTransaction({
      merchantOrderId: orderNumber,
      paymentAmount: totalAmount,
      productDetails: userId
        ? `${product.name} - ${userId}${zoneId ? ' (' + zoneId + ')' : ''}`
        : product.name,
      email: customerEmail,
      customerVaName: resolvedName.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, ''),
      phoneNumber: phoneNumber,
      paymentMethod: duitkuMethod,
      callbackUrl: `${process.env.BASE_URL}/api/duitku/callback`,
      returnUrl: `${process.env.FRONTEND_URL}/payment/${orderNumber}`,
      expiryPeriod: 1440 // 24 hours
    });

    if (!paymentResult.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment',
        error: paymentResult.statusMessage || paymentResult.error
      });
    }

    // 6. Update order with payment details
    await client.query(`
      UPDATE orders 
      SET 
        payment_url = $1,
        payment_reference = $2,
        payment_expires_at = NOW() + INTERVAL '24 hours',
        provider_response = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [
      paymentResult.paymentUrl, 
      paymentResult.reference, 
      JSON.stringify({
        vaNumber: paymentResult.vaNumber || null,
        qrString: paymentResult.qrString || null,
        reference: paymentResult.reference,
        merchantCode: paymentResult.merchantCode,
        paymentUrl: paymentResult.paymentUrl,
        amount: paymentResult.amount
      }),
      order.id
    ]);

    await client.query('COMMIT');

    // Kirim Invoice Email otomatis via Brevo
    try {
      const emailData = {
        orderNumber: orderNumber,
        customerName: resolvedName,
        customerEmail: customerEmail,
        productName: product.description || product.name,
        userId: userId,
        zoneId: zoneId || null,
        amount: productPrice,
        voucherCode: validatedVoucherCode || null,
        voucherDiscount: voucherDiscount || 0,
        paymentFee: paymentFee,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod,
        paymentUrl: paymentResult.paymentUrl || '',
        qrUrl: paymentResult.qrString || null,
        vaNumber: paymentResult.vaNumber || null,
        expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Kirim email async (non-blocking)
      emailService.sendInvoiceEmail(emailData).catch(err => {
        console.error('Email sending error (non-blocking):', err);
      });
    } catch (emailErr) {
      console.error('Email service error:', emailErr);
    }

    // 7. Return success WITH PAYMENT INFO
    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: orderNumber,
        productName: product.name,
        riotId: `${userId}#${zoneId || ''}`,
        amount: productPrice,
        voucherDiscount: voucherDiscount,
        voucherCode: validatedVoucherCode,
        subtotal: priceAfterDiscount,
        paymentFee: paymentFee,
        total: totalAmount,
        payment: {
          method: duitkuMethod,
          gateway: 'duitku',
          url: paymentResult.paymentUrl,
          vaNumber: paymentResult.vaNumber || null,
          qrString: paymentResult.qrString || null,
          reference: paymentResult.reference,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create Order Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  } finally {
    client.release();
  }
};

/**
 * Get order status
 * GET /api/orders/:orderNumber
 */
exports.getOrderStatus = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const result = await pool.query(`
      SELECT 
        o.*,
        p.name as product_name,
        p.sku as product_sku,
        g.name as game_name,
        g.product_type,
        g.slug as game_slug
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN games g ON p.game_id = g.id
      WHERE o.order_number = $1
    `, [orderNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = result.rows[0];

    // Parse provider_response if exists
    let providerData = {};
    if (order.provider_response) {
      try {
        providerData = typeof order.provider_response === 'string' 
          ? JSON.parse(order.provider_response) 
          : order.provider_response;
      } catch (e) {
        console.error('Error parsing provider_response:', e);
      }
    }

    res.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        productName: !order.product_id
          ? (providerData?.provider_name || providerData?.buyer_sku_code || 'Pascabayar')
          : order.product_name,
        gameName: order.game_name,
        gameUserId: order.game_user_id,
        gameUserTag: order.game_user_tag,
        amount: parseFloat(order.amount),
        voucherCode: order.voucher_code,
        voucherDiscount: parseFloat(order.voucher_discount) || 0,
        subtotal: parseFloat(order.subtotal),
        paymentFee: parseFloat(order.payment_fee) || 0,
        total: parseFloat(order.total_amount),
        customer_email: order.customer_email,
        notes: order.notes || null,
        // Pascabayar: cek apakah order ini pascabayar (product_id = NULL)
        isPascabayar: !order.product_id,
        // Untuk pascabayar: parse admin_fee dari provider_response jika ada
        adminFee: providerData?.type === 'pascabayar'
          ? (providerData.admin_fee || 0)
          : 0,
        payment: {
          method: order.payment_method,
          gateway: order.payment_gateway,
          status: order.payment_status,
          url: order.payment_url,
          reference: order.payment_reference,
          vaNumber: providerData.vaNumber || null,
          qrString: providerData.qrString || null,
          expiresAt: order.payment_expires_at
        },
        orderStatus: order.order_status,
        serialNumber: order.provider_serial_number || null,
        gameSlug: order.game_slug,
        productType: order.product_type || 'topup_game',
        createdAt: order.created_at,
        completedAt: order.completed_at
      }
    });

  } catch (error) {
    console.error('Get Order Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order status'
    });
  }
};

/**
 * Get order history (optional)
 * GET /api/orders/history?email=xxx
 */
exports.getOrderHistory = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = await pool.query(`
      SELECT 
        o.order_number,
        o.created_at,
        o.total_amount,
        o.payment_status,
        o.order_status,
        o.voucher_code,
        o.voucher_discount,
        p.name as product_name,
        g.name as game_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN games g ON p.game_id = g.id
      WHERE o.customer_email = $1
      ORDER BY o.created_at DESC
      LIMIT 50
    `, [email]);

    res.json({
      success: true,
      orders: result.rows.map(order => ({
        orderNumber: order.order_number,
        createdAt: order.created_at,
        totalAmount: parseFloat(order.total_amount),
        voucherCode: order.voucher_code,
        voucherDiscount: parseFloat(order.voucher_discount) || 0,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        productName: order.product_name,
        gameName: order.game_name
      }))
    });

  } catch (error) {
    console.error('Get Order History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order history'
    });
  }
};