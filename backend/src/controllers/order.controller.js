// Order Controller - PostgreSQL Version (Raw SQL)
// UPDATED: Xendit Custom UI - Direct APIs (VA, QRIS, E-wallet)
const { pool } = require('../config/database');
const midtransService = require('../services/midtrans.service');
const xenditService = require('../services/xendit.service');
const vipResellerService = require('../services/vipreseller-working.service');
const pricingCalculator = require('../services/payment-pricing-calculator.service');

/**
 * Get all products with pricing for all payment methods
 */
exports.getProducts = async (req, res) => {
  try {
    const { gameSlug } = req.params;

    // Get products from database with multi-payment pricing
    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.sku,
        p.base_price,
        p.selling_price_qris,
        p.selling_price_va,
        p.selling_price_ewallet,
        p.profit_margin,
        p.recommended_payment,
        p.gateway_preference,
        g.name as game_name,
        g.slug as game_slug
      FROM products p
      JOIN games g ON p.game_id = g.id
      WHERE g.slug = $1 AND p.is_active = true
      ORDER BY p.sort_order ASC
    `;

    const result = await pool.query(query, [gameSlug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found for this game',
      });
    }

    // Add pricing comparison to each product
    const productsWithPricing = result.rows.map(product => {
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        basePrice: parseFloat(product.base_price),
        pricing: {
          qris: {
            price: parseFloat(product.selling_price_qris),
            fee: pricingCalculator.calculateFee(parseFloat(product.selling_price_qris), 'qris'),
            recommended: true,
          },
          va: {
            price: parseFloat(product.selling_price_va),
            fee: pricingCalculator.calculateFee(parseFloat(product.selling_price_va), 'va_bca'),
          },
          ewallet: {
            price: parseFloat(product.selling_price_ewallet),
            fee: pricingCalculator.calculateFee(parseFloat(product.selling_price_ewallet), 'gopay'),
          },
        },
        recommendedPayment: product.recommended_payment,
        gatewayPreference: product.gateway_preference,
      };
    });

    return res.json({
      success: true,
      data: productsWithPricing,
    });

  } catch (error) {
    console.error('Get Products Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Create Order with Multi-Payment Support
 * UPDATED: Xendit Custom UI with Direct APIs
 */
exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      productId,
      gameUserId,
      gameUserTag,
      customerEmail,
      customerPhone,
      customerName,
      paymentMethod, // 'qris', 'gopay', 'va_bca', etc
    } = req.body;

    console.log('Create order request:', req.body);

    // Validate required fields
    if (!productId || !gameUserId || !paymentMethod || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: productId, gameUserId, customerEmail, paymentMethod',
      });
    }

    // FIXED: Validate and format phone number
    let formattedPhone = (customerPhone || '').trim();
    
    if (!formattedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Nomor HP wajib diisi',
      });
    }
    
    // Remove any non-digit characters
    formattedPhone = formattedPhone.replace(/\D/g, '');
    
    // Add 62 prefix if not present
    if (!formattedPhone.startsWith('62')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      } else {
        formattedPhone = '62' + formattedPhone;
      }
    }
    
    // Validate minimum length (at least 10 digits after +62)
    if (formattedPhone.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Nomor HP tidak valid. Minimal 10 digit.',
      });
    }

    console.log('Formatted phone:', formattedPhone);

    // Start transaction
    await client.query('BEGIN');

    // 1. Get product
    const productQuery = `
      SELECT * FROM products 
      WHERE id = $1 AND is_active = true
    `;
    const productResult = await client.query(productQuery, [productId]);
    
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Product not found or not active',
      });
    }

    const product = productResult.rows[0];

    // 2. Get price based on payment method
    let price;
    if (paymentMethod === 'qris') {
      price = parseFloat(product.selling_price_qris);
    } else if (paymentMethod.startsWith('va_') || paymentMethod === 'va') {
      price = parseFloat(product.selling_price_va);
    } else {
      price = parseFloat(product.selling_price_ewallet);
    }
    
    // 3. Determine optimal gateway
    const gateway = pricingCalculator.getOptimalGateway(price, paymentMethod);
    
    // 4. Calculate fee
    const fee = pricingCalculator.calculateFee(price, paymentMethod);

    // 5. Generate order number
    const orderNumber = 'INV' + Date.now() + Math.random().toString(36).substring(2, 9).toUpperCase();

    // 6. Create order in database
    const insertOrderQuery = `
      INSERT INTO orders (
        order_number,
        product_id,
        game_user_id,
        game_user_tag,
        customer_email,
        customer_phone,
        customer_name,
        amount,
        total_amount,
        payment_method,
        payment_channel,
        payment_gateway,
        gateway_fee,
        order_status,
        payment_status,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const orderValues = [
      orderNumber,
      productId,
      gameUserId,
      gameUserTag || null,
      customerEmail,
      formattedPhone,
      customerName || 'Customer',
      price,
      price,
      paymentMethod,
      paymentMethod,
      gateway,
      fee,
      'pending',
      'pending',
      req.ip,
      req.get('user-agent'),
    ];

    const orderResult = await client.query(insertOrderQuery, orderValues);
    const order = orderResult.rows[0];

    console.log('Order created:', {
      orderNumber,
      productName: product.name,
      amount: price,
      paymentMethod,
      gateway,
      fee,
    });

    // 7. Create payment with selected gateway
    let paymentResult;
    let paymentType = paymentMethod;
    let bankTransferData = {};

    if (gateway === 'midtrans') {
      // MIDTRANS PAYMENT
      // Map payment method to Midtrans payment_type
      if (paymentMethod === 'qris') {
        paymentType = 'qris';
      } else if (paymentMethod === 'gopay') {
        paymentType = 'gopay';
      } else if (paymentMethod === 'dana') {
        paymentType = 'shopeepay';
      } else if (paymentMethod === 'ovo' || paymentMethod === 'shopeepay') {
        paymentType = 'shopeepay';
      } else if (paymentMethod === 'va' || paymentMethod.startsWith('va_')) {
        paymentType = 'bank_transfer';
        
        // Get bank code from paymentMethod
        let bankCode = 'bca';  // Default
        if (paymentMethod.includes('bri')) bankCode = 'bri';
        else if (paymentMethod.includes('bni')) bankCode = 'bni';
        else if (paymentMethod.includes('mandiri')) bankCode = 'mandiri';
        else if (paymentMethod.includes('permata')) bankCode = 'permata';
        else if (paymentMethod.includes('cimb')) bankCode = 'cimb';
        
        bankTransferData = {
          bank: bankCode,
        };
      } else {
        paymentType = 'gopay';  // Default fallback
      }

      const transactionData = {
        payment_type: paymentType,
        transaction_details: {
          order_id: orderNumber,
          gross_amount: price,
        },
        customer_details: {
          first_name: customerName || 'Customer',
          email: customerEmail,
          phone: `+${formattedPhone}`,
        },
        item_details: [
          {
            id: product.sku || product.id,
            price: price,
            quantity: 1,
            name: product.name,
          },
        ],
      };
      
      // Add bank_transfer details if VA selected
      if (paymentType === 'bank_transfer') {
        transactionData.bank_transfer = bankTransferData;
      }

      console.log('Creating Midtrans transaction:', JSON.stringify(transactionData, null, 2));
      
      paymentResult = await midtransService.createTransaction(transactionData);
      
    } else {
      // XENDIT PAYMENT - UPDATED: Use Direct APIs for custom UI
      
      if (paymentMethod.startsWith('va_')) {
        // Virtual Account - Direct API
        const bankCode = paymentMethod.replace('va_', '').toUpperCase();
        
        console.log('Creating Xendit VA:', {
          bank: bankCode,
          amount: price,
        });
        
        paymentResult = await xenditService.createVirtualAccount({
          orderNumber,
          bankCode,  // BCA, BNI, BRI, MANDIRI, PERMATA
          customerName: customerName || 'Customer',
          amount: price,
        });
        
      } else if (paymentMethod === 'qris') {
        // QRIS - Direct API
        console.log('Creating Xendit QRIS:', {
          amount: price,
        });
        
        paymentResult = await xenditService.createQRIS({
          orderNumber,
          amount: price,
        });
        
      } else if (['ovo', 'dana', 'linkaja'].includes(paymentMethod)) {
        // E-Wallet - Direct API
        console.log('Creating Xendit E-Wallet:', {
          type: paymentMethod.toUpperCase(),
          amount: price,
        });
        
        paymentResult = await xenditService.createEWallet({
          orderNumber,
          ewalletType: paymentMethod.toUpperCase(),
          amount: price,
          customerPhone: formattedPhone,
        });
        
      } else {
        // Fallback to invoice (legacy method)
        console.log('Creating Xendit Invoice (fallback)');
        
        const invoiceData = {
          external_id: orderNumber,
          amount: price,
          payer_email: customerEmail,
          description: `Topup ${product.name}`,
          invoice_duration: 86400,
          success_redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/success?order_id=${orderNumber}`,
          failure_redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/failed`,
          currency: 'IDR',
          items: [
            {
              name: product.name,
              quantity: 1,
              price: price,
            },
          ],
          customer: {
            given_names: customerName || 'Customer',
            email: customerEmail,
            mobile_number: `+${formattedPhone}`,
          },
          fees: [],
        };

        paymentResult = await xenditService.createInvoice(invoiceData);
      }
    }

    if (!paymentResult.success) {
      console.error('Payment creation failed:', paymentResult);
      
      // Update order status to failed
      await client.query(
        `UPDATE orders SET order_status = $1, payment_status = $2, notes = $3 WHERE order_number = $4`,
        ['failed', 'failed', paymentResult.message || 'Payment gateway error', orderNumber]
      );
      
      await client.query('COMMIT');

      return res.status(400).json({
        success: false,
        message: 'Failed to create payment',
        error: paymentResult.message || 'Unknown error',
      });
    }

    console.log('Payment created successfully:', {
      orderNumber,
      paymentType,
      hasRedirectUrl: !!paymentResult.data.redirectUrl,
      hasQrString: !!paymentResult.data.qrString,
    });

    // 8. Update order with payment info
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    let redirectUrl;

    // UPDATED: Redirect logic for both Midtrans and Xendit Custom UI
    if (gateway === 'midtrans') {
      switch(paymentType) {
        case 'bank_transfer':
          // VA → Our payment instructions page
          redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/payment?order_id=${orderNumber}`;
          break;
        
        case 'qris':
          // QRIS → Our QR display page
          redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/qr?order_id=${orderNumber}`;
          break;
        
        case 'gopay':
        case 'shopeepay':
          // E-wallet → Our QR page (user can scan or click deep link)
          redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/qr?order_id=${orderNumber}`;
          break;
        
        default:
          // Fallback
          redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/pending?order_id=${orderNumber}`;
      }
    } else {
      // XENDIT - UPDATED: Custom UI for all payment types
      
      if (paymentMethod.startsWith('va_')) {
        // VA → Our payment instruction page (same as Midtrans)
        redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/payment?order_id=${orderNumber}`;
      } else if (paymentMethod === 'qris') {
        // QRIS → Our QR display page (same as Midtrans)
        redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/qr?order_id=${orderNumber}`;
      } else if (['ovo', 'dana', 'linkaja'].includes(paymentMethod)) {
        // E-wallet → Our QR page
        redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/qr?order_id=${orderNumber}`;
      } else {
        // Fallback (invoice)
        redirectUrl = paymentResult.data.invoice_url || 
                     paymentResult.data.redirectUrl ||
                     `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/pending?order_id=${orderNumber}`;
      }
    }

    // Final fallback
    if (!redirectUrl) {
      redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order/pending?order_id=${orderNumber}`;
    }

    console.log('Final redirect URL:', redirectUrl);

    await client.query(
      `UPDATE orders SET payment_url = $1, payment_expires_at = $2, payment_data = $3 WHERE order_number = $4`,
      [
        redirectUrl, 
        expiresAt, 
        JSON.stringify(paymentResult.data),
        orderNumber
      ]
    );

    // Commit transaction
    await client.query('COMMIT');

    // 9. Return response
    return res.json({
      success: true,
      data: {
        order: {
          orderNumber: order.order_number,
          productName: product.name,
          amount: price,
          paymentMethod,
          gateway,
          status: order.order_status,
        },
        payment: {
          redirectUrl: redirectUrl,
          paymentType: paymentType,
          vaNumbers: paymentResult.data.vaNumbers || null,
          qrString: paymentResult.data.qrString || null,
          token: paymentResult.data.token || null,
          expiresAt: expiresAt,
        },
      },
      message: 'Order created successfully',
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create Order Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
};

/**
 * Get Order Status
 */
exports.getOrderStatus = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const query = `
      SELECT 
        o.*,
        p.name as product_name,
        g.name as game_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN games g ON p.game_id = g.id
      WHERE o.order_number = $1
    `;

    const result = await pool.query(query, [orderNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const order = result.rows[0];

    return res.json({
      success: true,
      data: {
        orderNumber: order.order_number,
        productName: order.product_name,
        gameName: order.game_name,
        amount: parseFloat(order.amount),
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        gameUserId: order.game_user_id,
        gameUserTag: order.game_user_tag,
        paymentData: order.payment_data,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        processedAt: order.processed_at,
      },
    });

  } catch (error) {
    console.error('Get Order Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get Order History (for customer)
 */
exports.getOrderHistory = async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone required',
      });
    }

    let query = `
      SELECT 
        o.order_number,
        o.amount,
        o.payment_status,
        o.order_status,
        o.created_at,
        p.name as product_name,
        g.name as game_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN games g ON p.game_id = g.id
      WHERE 
    `;

    const values = [];
    if (email) {
      query += `o.customer_email = $1`;
      values.push(email);
    } else {
      query += `o.customer_phone = $1`;
      values.push(phone);
    }

    query += ` ORDER BY o.created_at DESC LIMIT 10`;

    const result = await pool.query(query, values);

    return res.json({
      success: true,
      data: result.rows.map(order => ({
        orderNumber: order.order_number,
        productName: order.product_name,
        gameName: order.game_name,
        amount: parseFloat(order.amount),
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
        createdAt: order.created_at,
      })),
    });

  } catch (error) {
    console.error('Get Order History Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Check payment status and update order
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    // Get order
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_number = $1',
      [orderNumber]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const order = orderResult.rows[0];

    // Check status with payment gateway
    let statusResult;
    if (order.payment_gateway === 'midtrans') {
      statusResult = await midtransService.checkStatus(orderNumber);
    } else {
      statusResult = await xenditService.checkStatus(orderNumber);
    }

    if (statusResult.success) {
      // Update order if status changed
      const paymentStatus = statusResult.data.transactionStatus;
      
      if (paymentStatus !== order.payment_status) {
        await pool.query(
          'UPDATE orders SET payment_status = $1 WHERE order_number = $2',
          [paymentStatus, orderNumber]
        );
      }
    }

    return res.json({
      success: true,
      data: {
        orderNumber: order.order_number,
        paymentStatus: order.payment_status,
        orderStatus: order.order_status,
      },
    });

  } catch (error) {
    console.error('Check Payment Status Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Validate Riot ID
 */
exports.validateRiotId = async (req, res) => {
  try {
    const { riotId, tagline } = req.body;

    if (!riotId || !tagline) {
      return res.status(400).json({
        success: false,
        message: 'Riot ID and tagline are required',
      });
    }

    const riotService = require('../services/riotid.service');
    const result = await riotService.validateRiotId(riotId, tagline);

    return res.json({
      success: result.success,
      data: result.data,
      message: result.message,
    });

  } catch (error) {
    console.error('Validate Riot ID Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate Riot ID',
    });
  }
};

/**
 * Get all games (for old routes compatibility)
 */
exports.getGames = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        slug,
        description,
        icon_url,
        is_active
      FROM games
      WHERE is_active = true
      ORDER BY sort_order ASC
    `;

    const result = await pool.query(query);

    return res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error('Get Games Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get games',
    });
  }
};

module.exports = exports;
