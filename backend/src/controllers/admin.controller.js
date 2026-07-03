const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const digiflazzService = require('../services/digiflazz.service');
const pascabayarController = require('./pascabayar.controller');

const JWT_SECRET = process.env.JWT_SECRET || 'segawon-admin-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Admin Login
 * POST /api/admin/login
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi'
      });
    }

    // Get admin user
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    const admin = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah'
      });
    }

    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login_at = NOW() WHERE id = $1',
      [admin.id]
    );

    // Generate JWT
    const token = jwt.sign(
      { 
        id: admin.id, 
        username: admin.username,
        full_name: admin.full_name 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

/**
 * Dashboard Overview
 * GET /api/admin/dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    // Get overview stats via function
    const overviewResult = await pool.query('SELECT get_dashboard_overview() as data');
    const overview = overviewResult.rows[0].data;

    // Get Digiflazz saldo
    // let digiflazzSaldo = null; checkBalance()
    //  TEMPORARY: Disabled until cekSaldo() method implemented in digiflazz.service.js
    try {
      const saldoRes = await digiflazzService.checkBalance();
      if (saldoRes.success && saldoRes.data) {
        digiflazzSaldo = {
          deposit: parseFloat(saldoRes.data.deposit || 0),
          status: saldoRes.data.deposit > 1000000 ? 'SAFE' : 
                  saldoRes.data.deposit > 500000 ? 'WARNING' : 'CRITICAL'
        };
      }
    } catch (err) {
      console.error('Failed to fetch Digiflazz saldo:', err);
    }

    // Get recent failed orders (need retry)
    const failedOrders = await pool.query(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE order_status IN ('FAILED', 'PENDING_RETRY')
        AND created_at >= NOW() - INTERVAL '24 hours'
    `);

    res.json({
      success: true,
      data: {
        overview,
        digiflazz: digiflazzSaldo,
        alerts: {
          failed_orders_24h: parseInt(failedOrders.rows[0].count)
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard'
    });
  }
};

/**
 * Daily Stats (Chart data)
 * GET /api/admin/stats/daily?days=30
 */
exports.getDailyStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const result = await pool.query(`
      SELECT * FROM v_daily_stats
      WHERE date >= CURRENT_DATE - INTERVAL '1 day' * $1
      ORDER BY date ASC
    `, [days]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load stats'
    });
  }
};

/**
 * Top Products
 * GET /api/admin/stats/top-products
 */
exports.getTopProducts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_top_products');

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load top products'
    });
  }
};

/**
 * Payment Method Stats
 * GET /api/admin/stats/payment-methods
 */
exports.getPaymentStats = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_payment_stats');

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load payment stats'
    });
  }
};

/**
 * Hourly Pattern (Peak hours)
 * GET /api/admin/stats/hourly-pattern
 */
exports.getHourlyPattern = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_hourly_pattern');

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get hourly pattern error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load hourly pattern'
    });
  }
};

/**
 * Recent Orders (with filters & pagination)
 * GET /api/admin/orders?page=1&limit=20&status=SUCCESS&search=INV123
 */
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ` AND LOWER(o.order_status) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (o.order_number ILIKE $${params.length} OR o.customer_email ILIKE $${params.length})`;
    }

    // Count total
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    // Get paginated orders
    params.push(limit, offset);
    const result = await pool.query(`
      SELECT 
        o.id, o.order_number, o.product_id, o.game_user_id, o.game_user_tag,
        o.customer_name, o.customer_email, o.customer_phone,
        o.amount, o.payment_fee, o.subtotal, o.total_amount,
        o.order_status, o.payment_status, o.payment_method, o.payment_gateway,
        o.voucher_code, o.voucher_discount,
        o.provider_serial_number, o.payment_url,
        o.created_at, o.updated_at,
        p.sku, p.base_price,
        -- [UPDATED] Fallback ke provider_response untuk order pascabayar (product_id = NULL)
        COALESCE(
          p.name,
          CASE
            WHEN o.provider_response IS NOT NULL
            THEN CONCAT(
              (o.provider_response::jsonb)->>'provider_name',
              ' — ',
              (o.provider_response::jsonb)->>'customer_no'
            )
            ELSE NULL
          END
        ) AS product_name,
        -- [UPDATED] game_name fallback untuk pascabayar
        COALESCE(g.name, 'Pascabayar') AS game_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN games g ON p.game_id = g.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load orders'
    });
  }
};

/**
 * Retry Failed Orders (manual trigger)
 * POST /api/admin/orders/retry
 */
exports.retryFailedOrders = async (req, res) => {
  try {
    const { orderIds } = req.body; // Array of order IDs to retry

    if (!orderIds || !Array.isArray(orderIds)) {
      return res.status(400).json({
        success: false,
        message: 'orderIds array required'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const orderId of orderIds) {
      try {
        // Get order details
        const orderResult = await pool.query(
          'SELECT * FROM orders WHERE id = $1 AND order_status IN ($2, $3, $4, $5)',
          [orderId, 'failed', 'FAILED', 'pending_retry', 'PENDING_RETRY']
        );

        if (orderResult.rows.length === 0) {
          results.failed.push({ orderId, reason: 'Order not found or not retryable' });
          continue;
        }

        const order = orderResult.rows[0];

        // Pascabayar orders (product_id = NULL) tidak bisa di-retry lewat endpoint ini.
        // Retry pascabayar butuh inquiry ulang ke Digiflazz dulu — gunakan
        // POST /api/admin/orders/retry-pascabayar-inquiry endpoint yang terpisah.
        if (!order.product_id) {
          results.failed.push({
            orderId,
            reason: 'Order ini adalah pascabayar. Gunakan tombol "Retry Inquiry" untuk cek tagihan terbaru dulu.',
            isPascabayar: true,
          });
          continue;
        }

        // Get product SKU
        const productResult = await pool.query(
          'SELECT sku FROM products WHERE id = $1',
          [order.product_id]
        );

        if (productResult.rows.length === 0) {
          results.failed.push({ orderId, reason: 'Product not found' });
          continue;
        }

        const sku = productResult.rows[0].sku;

        // Generate retry order number dengan suffix _r{n}
        // Strip suffix lama dulu kalau sudah ada (misal _r1 → base)
        const baseOrderNumber = order.order_number.replace(/_r\d+$/, '');

        // Hitung berapa kali sudah retry dari retry_count atau cek suffix
        const retryCount = (order.retry_count || 0) + 1;
        const retryOrderNumber = `${baseOrderNumber}_r${retryCount}`;

        // Retry Digiflazz transaction — pakai retryOrderNumber
        const digiflazzRes = await digiflazzService.createTransaction({
          sku,
          customerNo: order.game_user_id,
          orderNumber: retryOrderNumber
        });

        const rc = digiflazzRes.data?.rc;
        const isSuccess = rc === '00' || digiflazzRes.data?.status === 'Sukses';
        const isPending  = rc === '03' || digiflazzRes.data?.status === 'Pending';

        if (isSuccess) {
          // ✅ Langsung sukses (jarang terjadi, biasanya via webhook)
          await pool.query(
            `UPDATE orders
             SET order_status           = 'completed',
                 provider_serial_number = $1,
                 order_number           = $2,
                 retry_count            = $3,
                 updated_at             = NOW()
             WHERE id = $4`,
            [digiflazzRes.data.sn, baseOrderNumber, retryCount, orderId]
          );
          results.success.push({ orderId, sn: digiflazzRes.data.sn, orderNumber: baseOrderNumber });

        } else if (isPending) {
          // ⏳ Pending — simpan retryOrderNumber supaya webhook bisa cocokkan nanti
          await pool.query(
            `UPDATE orders
             SET order_status = 'pending_retry',
                 order_number = $1,
                 retry_count  = $2,
                 updated_at   = NOW()
             WHERE id = $3`,
            [retryOrderNumber, retryCount, orderId]
          );
          results.success.push({ orderId, status: 'pending_retry', orderNumber: retryOrderNumber,
            note: 'Digiflazz pending — menunggu webhook konfirmasi' });

        } else {
          // ❌ Gagal — tetap simpan retryOrderNumber agar webhook bisa cocokkan jika ternyata berhasil
          await pool.query(
            `UPDATE orders
             SET order_status = 'failed',
                 order_number = $1,
                 retry_count  = $2,
                 updated_at   = NOW()
             WHERE id = $3`,
            [retryOrderNumber, retryCount, orderId]
          );
          results.failed.push({
            orderId,
            reason: digiflazzRes.data?.message || 'Digiflazz error'
          });
        }

      } catch (err) {
        console.error(`Retry order ${orderId} error:`, err);
        results.failed.push({ orderId, reason: err.message });
      }
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Retry orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry orders'
    });
  }
};

/**
 * Get Alert Logs
 * GET /api/admin/alerts?limit=50
 */
exports.getAlerts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(`
      SELECT * FROM alert_logs
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load alerts'
    });
  }
};
/**
 * POST /api/admin/orders/retry-pascabayar-inquiry
 * Body: { orderId }
 *
 * Step 1 dari 2-step retry untuk order pascabayar yang failed:
 * Jalankan ulang inquiry ke Digiflazz pakai buyer_sku_code + customer_no
 * yang tersimpan di provider_response order lama.
 *
 * Ini TIDAK langsung membayar — hasilnya (tagihan terbaru) dikembalikan
 * ke admin untuk dikonfirmasi dulu sebelum bayar.
 * Step 2 adalah admin klik konfirmasi, yang akan memanggil langsung
 * processPascabayarPayment (tanpa perlu customer bayar lagi karena sudah Lunas).
 */
exports.retryPascabayarInquiry = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId wajib diisi' });
    }

    // Ambil order — harus failed, lunas (payment_status completed), dan pascabayar
    const orderResult = await pool.query(
      `SELECT * FROM orders
       WHERE id = $1
         AND product_id IS NULL
         AND order_status IN ('failed', 'FAILED', 'pending_retry', 'PENDING_RETRY')`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order pascabayar tidak ditemukan atau statusnya tidak bisa di-retry'
      });
    }

    const order = orderResult.rows[0];

    // Ambil buyer_sku_code dan customer_no dari provider_response yang tersimpan
    const providerData = typeof order.provider_response === 'string'
      ? (() => { try { return JSON.parse(order.provider_response); } catch (e) { return {}; } })()
      : (order.provider_response || {});

    const buyer_sku_code = providerData.buyer_sku_code || providerData.digiflazz?.buyer_sku_code;
    const customer_no    = providerData.customer_no;

    if (!buyer_sku_code || !customer_no) {
      return res.status(400).json({
        success: false,
        message: 'Data buyer_sku_code atau customer_no tidak ditemukan di order lama. Tidak bisa inquiry ulang.'
      });
    }

    // Delegate ke pascabayar inquiry — persis sama dengan flow normal customer,
    // tapi dipanggil oleh admin. Hasilnya dikembalikan ke frontend untuk ditampilkan
    // sebelum admin konfirmasi pembayaran.
    const fakeReq = {
      body: { buyer_sku_code, customer_no }
    };

    let inquiryResult = null;
    let inquiryError  = null;

    const fakeRes = {
      status: (code) => ({
        json: (data) => { inquiryError = { code, ...data }; }
      }),
      json: (data) => { inquiryResult = data; }
    };

    await pascabayarController.inquiry(fakeReq, fakeRes);

    if (inquiryError) {
      return res.status(inquiryError.code || 400).json({
        success: false,
        message: inquiryError.message || 'Gagal inquiry ulang ke Digiflazz',
      });
    }

    // Kembalikan hasil inquiry + orderId agar frontend bisa konfirmasi di step 2
    return res.json({
      success: true,
      orderId,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName:  order.customer_name,
      customerPhone: order.customer_phone,
      inquiry: inquiryResult?.data,
    });

  } catch (err) {
    console.error('retryPascabayarInquiry error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

/**
 * POST /api/admin/orders/retry-pascabayar-pay
 * Body: { orderId, ref_id }
 *
 * Step 2 dari 2-step retry:
 * Admin sudah konfirmasi tagihan dari inquiry terbaru.
 * Langsung hit Digiflazz pay-pasca pakai ref_id inquiry baru,
 * lalu update order_status ke completed/failed.
 * Tidak perlu buat order baru atau bayar ke Duitku lagi — sudah Lunas.
 */
exports.retryPascabayarPay = async (req, res) => {
  try {
    const { orderId, ref_id } = req.body;

    if (!orderId || !ref_id) {
      return res.status(400).json({ success: false, message: 'orderId dan ref_id wajib diisi' });
    }

    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND product_id IS NULL`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
    }

    const order = orderResult.rows[0];

    // Cek inquiry masih valid di DB
    const inquiryResult = await pool.query(
      `SELECT * FROM pascabayar_inquiries WHERE ref_id = $1 AND status = 'pending'`,
      [ref_id]
    );

    if (inquiryResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry sudah expired atau tidak ditemukan. Lakukan retry inquiry ulang.'
      });
    }

    // Delegate ke duitku processPascabayarPayment — fungsi yang sama dengan
    // alur normal (sudah include kirim email, update order, dll)
    const { processPascabayarPayment } = require('./duitku.controller');

    // Override ref_id dan provider_response untuk pakai inquiry baru
    const orderForRetry = {
      ...order,
      provider_response: {
        ...(typeof order.provider_response === 'object'
          ? order.provider_response
          : (() => { try { return JSON.parse(order.provider_response); } catch (e) { return {}; } })()),
        ref_id,
      }
    };

    await processPascabayarPayment(orderForRetry);

    // Cek hasil: apakah order sudah completed?
    const updatedOrder = await pool.query(
      `SELECT order_status, provider_serial_number FROM orders WHERE id = $1`,
      [orderId]
    );
    const updated = updatedOrder.rows[0];

    return res.json({
      success: updated.order_status === 'completed',
      order_status: updated.order_status,
      sn: updated.provider_serial_number || null,
      message: updated.order_status === 'completed'
        ? 'Pembayaran pascabayar berhasil diproses'
        : 'Digiflazz memproses — cek kembali status order',
    });

  } catch (err) {
    console.error('retryPascabayarPay error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};