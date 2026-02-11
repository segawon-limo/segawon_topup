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
        base_price, selling_price, profit_price,
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
    const userId = gameUserId || riotId;
    const zoneId = gameZoneId || riotTag || null;

    // Validate required fields
    if (!productId || !paymentMethod || !customerEmail || !customerName || !phoneNumber || !userId) {
      throw new Error('Missing required fields');
    }

    // 1. Get product - UPDATED: Fetch profit_price
    const productResult = await client.query(
      'SELECT id, name, sku, selling_price, profit_price, description FROM products WHERE id = $1 AND is_active = true',
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }

    const product = productResult.rows[0];
    const productPrice = parseFloat(product.selling_price);
    const profitPrice = parseFloat(product.profit_price); // NEW: Get profit price

    // NEW: Validate voucher if provided - WITH PROFIT PRICE
    let voucherDiscount = 0;
    let validatedVoucherCode = null;
    
    if (voucherCode && voucherCode.trim()) {
      // Pass profitPrice for admin voucher support
      const voucherResult = await voucherService.validateVoucher(
        voucherCode.trim(), 
        productPrice,
        profitPrice  // NEW: Pass profit_price for admin voucher
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

    // QRIS - 0.7%
    if (paymentMethod === 'qris') {
      paymentFee = Math.round(priceAfterDiscount * 0.007);
    }
    // Virtual Account - Rp 2,500 flat
    else if (paymentMethod.startsWith('va_')) {
      paymentFee = 2500;
    }
    // E-Wallet - 2% + Rp 1,000
    else if (['ovo', 'shopeepay', 'dana', 'linkaja'].includes(paymentMethod)) {
      paymentFee = Math.round(priceAfterDiscount * 0.02) + 1000;
    }
    // Retail - Rp 2,500 flat
    else if (['alfamart', 'indomaret'].includes(paymentMethod)) {
      paymentFee = 2500;
    }
    // Credit Card - 2.9% (min Rp 2,000)
    else if (paymentMethod === 'credit_card') {
      paymentFee = Math.max(Math.round(priceAfterDiscount * 0.029), 2000);
    }
    // Default
    else {
      paymentFee = 2500;
    }

    const totalAmount = priceAfterDiscount + paymentFee;

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
        voucher_code,
        voucher_discount,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING *
    `, [
      orderNumber,
      productId,
      customerEmail,
      customerName,
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
    }

    // 5. Create Duitku payment
    const duitkuMethod = duitkuService.getPaymentMethodCode(paymentMethod);
    
    const paymentResult = await duitkuService.createTransaction({
      merchantOrderId: orderNumber,
      paymentAmount: totalAmount,
      productDetails: `${product.name} - ${userId}${zoneId ? ' (' + zoneId + ')' : ''}`,
      email: customerEmail,
      customerVaName: customerName.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, ''),
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
        customerName: customerName,
        customerEmail: customerEmail,
        productName: product.description,
        // gameName dihapus - tidak perlu!
        userId: userId,
        zoneId: zoneId || null,
        amount: productPrice,
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
    // const emailData = {
    //   orderNumber: orderNumber,
    //   customerName: customerName,
    //   customerEmail: customerEmail,
    //   productName: product.description,
    //   // gameName: game.name,
    //   userId: userId,
    //   zoneId: zoneId || null,
    //   amount: productPrice,
    //   voucherDiscount: voucherDiscount,
    //   paymentFee: paymentFee,
    //   totalAmount: totalAmount,
    //   paymentMethod: paymentMethod,
    //   paymentUrl: paymentResult.paymentUrl,
    //   qrUrl: paymentResult.qrString || null,
    //   vaNumber: paymentResult.vaNumber || null,
    //   expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    // };

    // // Kirim email secara async (tidak menunggu)
    // emailService.sendInvoiceEmail(emailData).catch(err => {
    //   console.error('Email sending error (non-blocking):', err);
    // });



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
        productName: order.product_name,
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
      JOIN products p ON o.product_id = p.id
      JOIN games g ON p.game_id = g.id
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
