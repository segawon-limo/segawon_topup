/**
 * Order Controller - UPDATED VERSION
 * Add these methods to your existing order.controller.js
 * 
 * ADDITIONS:
 * - calculatePrice: Calculate price with promo
 * - validatePromo: Validate promo code
 * - createOrder: Updated to support promo
 */

const PriceCalculator = require('../services/PriceCalculator');
const { pool } = require('../config/database');
const duitkuService = require('../services/duitku.service');

/**
 * Calculate price with optional promo
 * POST /api/calculate-price
 */
exports.calculatePrice = async (req, res) => {
  try {
    const {
      productId,
      paymentMethod,
      promoCode,
      customerEmail
    } = req.body;

    // Validate required
    if (!productId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and payment method required'
      });
    }

    // Calculate
    const result = await PriceCalculator.calculateFinalPrice({
      productId,
      paymentMethod,
      paymentGateway: 'duitku',
      promoCode: promoCode || null,
      customerEmail: customerEmail || null
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Calculate Price Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate price'
    });
  }
};

/**
 * Validate promo code
 * POST /api/validate-promo
 */
exports.validatePromo = async (req, res) => {
  try {
    const { promoCode, amount, customerEmail } = req.body;

    if (!promoCode || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Promo code and amount required'
      });
    }

    const result = await PriceCalculator.validateAndCalculatePromo({
      promoCode,
      subtotal: parseFloat(amount),
      customerEmail: customerEmail || null
    });

    res.json(result);

  } catch (error) {
    console.error('Validate Promo Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate promo'
    });
  }
};

/**
 * Create order - UPDATED WITH PROMO SUPPORT
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
      riotTag,
      promoCode
    } = req.body;

    // Validate required fields
    if (!productId || !paymentMethod || !customerEmail || !customerName || !riotId || !riotTag) {
      throw new Error('Missing required fields');
    }

    // 1. Calculate final price with promo
    const priceResult = await PriceCalculator.calculateFinalPrice({
      productId,
      paymentMethod,
      promoCode: promoCode || null,
      customerEmail
    });

    if (!priceResult.success) {
      await client.query('ROLLBACK');
      return res.status(400).json(priceResult);
    }

    const pricing = priceResult.breakdown;

    // 2. Generate order number
    const orderNumber = 'INV' + Date.now();

    // 3. Get product details
    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }

    const product = productResult.rows[0];

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
        promo_code,
        promo_discount,
        discount_amount,
        total_amount,
        payment_method,
        payment_gateway,
        payment_status,
        order_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      orderNumber,
      productId,
      customerEmail,
      customerName,
      phoneNumber,
      riotId,
      riotTag,
      pricing.sellingPrice,
      pricing.paymentFee,
      pricing.subtotal,
      pricing.promoCode,
      pricing.promoDiscount,
      pricing.promoDiscount,
      pricing.total,
      paymentMethod,
      'duitku',
      'pending',
      'pending'
    ]);

    const order = orderResult.rows[0];

    // 5. Record promo usage
    if (promoCode && priceResult.promoDetails) {
      await client.query(`
        INSERT INTO promo_code_usage (
          promo_code_id,
          order_id,
          user_email,
          discount_amount,
          used_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        priceResult.promoDetails.id,
        order.id,
        customerEmail,
        pricing.promoDiscount
      ]);
    }

    // 6. Create payment via Duitku
    const duitkuPaymentMethod = duitkuService.getPaymentMethodCode(paymentMethod);
    
    const paymentResult = await duitkuService.createTransaction({
      merchantOrderId: orderNumber,
      paymentAmount: pricing.total,
      productDetails: `${product.name} - ${riotId}#${riotTag}`,
      email: customerEmail,
      customerVaName: customerName.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, ''),
      phoneNumber: phoneNumber,
      paymentMethod: duitkuPaymentMethod,
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

    // 7. Update order with payment details
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

    // 8. Return success
    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: orderNumber,
        productName: product.name,
        riotId: `${riotId}#${riotTag}`,
        pricing: {
          displayedNormalPrice: pricing.displayedNormalPrice,
          subtotal: pricing.subtotal,
          promoDiscount: pricing.promoDiscount,
          total: pricing.total
        },
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
        pricing: {
          amount: parseFloat(order.amount),
          paymentFee: parseFloat(order.payment_fee),
          subtotal: parseFloat(order.subtotal),
          promoCode: order.promo_code,
          promoDiscount: parseFloat(order.promo_discount) || 0,
          total: parseFloat(order.total_amount)
        },
        payment: {
          method: order.payment_method,
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
