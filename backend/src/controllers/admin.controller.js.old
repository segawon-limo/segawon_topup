const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const digiflazzService = require('../services/digiflazz.service');

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
        o.id, o.order_number, o.game_user_id, o.game_user_tag,
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

        if (digiflazzRes.success && digiflazzRes.data.rc === '00') {
          // Berhasil — simpan SN, kembalikan order_number ke base (tanpa suffix)
          await pool.query(
            `UPDATE orders 
             SET order_status = $1, 
                 provider_serial_number = $2, 
                 order_number = $3,
                 retry_count = $4,
                 updated_at = NOW()
             WHERE id = $5`,
            ['SUCCESS', digiflazzRes.data.sn, baseOrderNumber, retryCount, orderId]
          );

          results.success.push({ orderId, sn: digiflazzRes.data.sn, orderNumber: baseOrderNumber });
        } else {
          // Gagal — update retry_count dan simpan suffix sementara di DB
          await pool.query(
            `UPDATE orders 
             SET retry_count = $1, updated_at = NOW()
             WHERE id = $2`,
            [retryCount, orderId]
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