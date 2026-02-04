/**
 * Order Controller - Simplified for Duitku Only
 * No promo code (for now)
 * Fixed pricing from database
 */

const { pool } = require('../config/database');
const duitkuService = require('../services/duitku.service');

/**
 * Get all games
 * GET /api/games
 */
exports.getGames = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, slug, description, icon_url, is_active, sort_order
      FROM games
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
    `);

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

    // Get game
    const gameResult = await pool.query(
      'SELECT id, name FROM games WHERE slug = $1 AND is_active = true',
      [gameSlug]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    const game = gameResult.rows[0];

    // Get products
    const productsResult = await pool.query(`
      SELECT 
        id, name, description, sku,
        base_price, selling_price,
        is_active, sort_order
      FROM products
      WHERE game_id = $1 AND is_active = true
      ORDER BY sort_order ASC, selling_price ASC
    `, [game.id]);

    res.json({
      success: true,
      game: game,
      products: productsResult.rows.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sku: p.sku,
        price: parseFloat(p.selling_price),
        displayPrice: `Rp ${parseFloat(p.selling_price).toLocaleString('id-ID')}`
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
 * Create order with Duitku payment
 * POST /api/orders/create
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
      riotId,
      riotTag
    } = req.body;

    // Validate required fields
    if (!productId || !paymentMethod || !customerEmail || !customerName || !phoneNumber || !riotId || !riotTag) {
      throw new Error('Missing required fields');
    }

    // 1. Get product
    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1 AND is_active = true',
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }

    const product = productResult.rows[0];
    const productPrice = parseFloat(product.selling_price);

    // 2. Calculate payment fee
    let paymentFee = 0;
    if (paymentMethod.startsWith('va_')) {
      paymentFee = Math.round(productPrice * 0.007 + 1000); // 0.7% + Rp 1000
    } else if (paymentMethod === 'qris') {
      paymentFee = Math.round(productPrice * 0.007); // 0.7%
    } else {
      paymentFee = Math.round(productPrice * 0.02); // 2% for e-wallet
    }

    const totalAmount = productPrice + paymentFee;

    // 3. Generate order number
    const orderNumber = 'INV' + Date.now();

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
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *
    `, [
      orderNumber,
      productId,
      customerEmail,
      customerName,
      phoneNumber,
      riotId,
      riotTag,
      productPrice,
      paymentFee,
      totalAmount,
      totalAmount,
      paymentMethod,
      'duitku',
      'pending',
      'pending'
    ]);

    const order = orderResult.rows[0];

    // 5. Create Duitku payment
    const duitkuMethod = duitkuService.getPaymentMethodCode(paymentMethod);
    
    const paymentResult = await duitkuService.createTransaction({
      merchantOrderId: orderNumber,
      paymentAmount: totalAmount,
      productDetails: `${product.name} - ${riotId}#${riotTag}`,
      email: customerEmail,
      customerVaName: customerName.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, ''),
      phoneNumber: phoneNumber,
      paymentMethod: duitkuMethod,
      callbackUrl: `${process.env.BASE_URL}/api/duitku/callback`,
      returnUrl: `${process.env.FRONTEND_URL}/order/status/${orderNumber}`,
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
        updated_at = NOW()
      WHERE id = $3
    `, [paymentResult.paymentUrl, paymentResult.reference, order.id]);

    await client.query('COMMIT');

    // 7. Return success
    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: orderNumber,
        productName: product.name,
        riotId: `${riotId}#${riotTag}`,
        amount: productPrice,
        paymentFee: paymentFee,
        total: totalAmount,
        payment: {
          method: paymentMethod,
          gateway: 'duitku',
          url: paymentResult.paymentUrl,
          vaNumber: paymentResult.vaNumber || null,
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
        g.name as game_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN games g ON p.game_id = g.id
      WHERE o.order_number = $1
    `, [orderNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = result.rows[0];

    res.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        productName: order.product_name,
        gameName: order.game_name,
        gameUserId: `${order.game_user_id}#${order.game_user_tag}`,
        amount: parseFloat(order.amount),
        paymentFee: parseFloat(order.payment_fee) || 0,
        total: parseFloat(order.total_amount),
        payment: {
          method: order.payment_method,
          gateway: order.payment_gateway,
          status: order.payment_status,
          url: order.payment_url,
          reference: order.payment_reference,
          expiresAt: order.payment_expires_at
        },
        orderStatus: order.order_status,
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
        p.name as product_name,
        g.name as game_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN games g ON p.game_id = g.id
      WHERE o.customer_email = $1
      ORDER BY o.created_at DESC
      LIMIT 50
    `, [email]);

    res.json({
      success: true,
      orders: result.rows
    });

  } catch (error) {
    console.error('Get Order History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order history'
    });
  }
};
