/**
 * Duitku Controller - CORRECTED
 * Handles payment requests and callbacks from Duitku
 */

const duitkuService = require('../services/duitku.service');
const { pool } = require('../config/database');

/**
 * Get available payment methods
 * GET /api/duitku/payment-methods?amount=50000
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const amount = parseInt(req.query.amount) || 50000;
    
    const result = await duitkuService.getPaymentMethods(amount);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Group by category untuk kemudahan frontend
    const grouped = {
      va: [],
      qris: [],
      ewallet: [],
      retail: [],
      other: []
    };

    result.paymentMethods.forEach(method => {
      const code = method.paymentMethod;
      
      // Virtual Account
      if (['BC', 'M2', 'I1', 'BR', 'A1', 'B1', 'S1', 'DNA'].includes(code)) {
        grouped.va.push(method);
      } 
      // QRIS
      else if (code === 'BT') {
        grouped.qris.push(method);
      } 
      // E-Wallet
      else if (['OV', 'SA', 'DA', 'LA'].includes(code)) {
        grouped.ewallet.push(method);
      } 
      // Retail
      else if (['FT', 'IR'].includes(code)) {
        grouped.retail.push(method);
      } 
      // Other
      else {
        grouped.other.push(method);
      }
    });

    res.json({
      success: true,
      amount: amount,
      methods: grouped,
      allMethods: result.paymentMethods
    });

  } catch (error) {
    console.error('Get Payment Methods Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create payment transaction
 * POST /api/duitku/create-transaction
 */
exports.createTransaction = async (req, res) => {
  try {
    const {
      merchantOrderId,
      paymentAmount,
      paymentMethod,
      productDetails,
      email,
      customerVaName,
      phoneNumber,
      callbackUrl,
      returnUrl,
      expiryPeriod,
      itemDetails,      // For Credit Card
      customerDetail    // For Credit Card
    } = req.body;

    // Validation
    if (!merchantOrderId || !paymentAmount || !paymentMethod || 
        !productDetails || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['merchantOrderId', 'paymentAmount', 'paymentMethod', 'productDetails', 'email', 'phoneNumber']
      });
    }

    // Prepare transaction data
    const transactionData = {
      merchantOrderId,
      paymentAmount,
      paymentMethod,
      productDetails,
      email,
      customerVaName: customerVaName || email,
      phoneNumber,
      callbackUrl: callbackUrl || `${process.env.BASE_URL}/api/duitku/callback`,
      returnUrl: returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
      expiryPeriod: expiryPeriod || 1440
    };

    // Add Credit Card required fields
    if (paymentMethod === 'CC') {
      if (!itemDetails || !customerDetail) {
        return res.status(400).json({
          success: false,
          message: 'Credit Card requires itemDetails and customerDetail'
        });
      }
      transactionData.itemDetails = itemDetails;
      transactionData.customerDetail = customerDetail;
    }

    // Create transaction
    const result = await duitkuService.createTransaction(transactionData);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // TODO: Save to database
    // await pool.query(`
    //   INSERT INTO duitku_transactions (
    //     merchant_order_id, reference, payment_amount, payment_method,
    //     customer_email, customer_phone, va_number, qr_string, 
    //     payment_url, status, expires_at
    //   ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    // `, [
    //   merchantOrderId, result.reference, paymentAmount, paymentMethod,
    //   email, phoneNumber, result.vaNumber, result.qrString,
    //   result.paymentUrl, 'pending', 
    //   new Date(Date.now() + (expiryPeriod * 60000))
    // ]);

    res.json({
      success: true,
      message: 'Transaction created successfully',
      data: result
    });

  } catch (error) {
    console.error('Create Transaction Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
    console.log('Req body:', req.body);
  }
};

/**
 * Check transaction status
 * GET /api/duitku/check-transaction/:merchantOrderId
 */
exports.checkTransactionStatus = async (req, res) => {
  try {
    const { merchantOrderId } = req.params;

    if (!merchantOrderId) {
      return res.status(400).json({
        success: false,
        message: 'merchantOrderId is required'
      });
    }

    const result = await duitkuService.checkTransactionStatus(merchantOrderId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // TODO: Update database status jika perlu
    // if (result.statusCode === '00') {
    //   await pool.query(`
    //     UPDATE duitku_transactions 
    //     SET status = 'success', paid_at = CURRENT_TIMESTAMP
    //     WHERE merchant_order_id = $1
    //   `, [merchantOrderId]);
    // }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Check Transaction Status Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Handle Duitku callback (webhook)
 * POST /api/duitku/callback
 * 
 * CRITICAL: Endpoint ini HARUS bisa diakses dari internet!
 */
exports.duitkuCallback = async (req, res) => {
  try {
    console.log('=== Duitku Callback Received ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const {
      merchantCode,
      amount,
      merchantOrderId,
      productDetail,
      additionalParam,
      paymentCode,
      resultCode,
      merchantUserId,
      reference,
      signature,
      publisherOrderId,
      spUserHash,
      settlementDate,
      issuerCode
    } = req.body;

    // 1. Verify signature - CRITICAL untuk security!
    const isValid = duitkuService.verifyCallbackSignature({
      merchantCode,
      amount,
      merchantOrderId,
      signature
    });

    if (!isValid) {
      console.error('❌ Invalid Duitku signature!');
      // Tetap return success agar Duitku tidak retry
      // tapi log untuk investigasi
      await logCallbackError(req.body, 'Invalid signature');
      return res.status(200).send('success');
    }

    console.log('✓ Signature valid');

    // 2. Get order from database
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_number = $1',
      [merchantOrderId]
    );

    if (orderResult.rows.length === 0) {
      console.error('❌ Order not found:', merchantOrderId);
      await logCallbackError(req.body, 'Order not found');
      return res.status(200).send('success');
    }

    const order = orderResult.rows[0];

    // 3. Save callback log untuk audit
    await pool.query(`
      INSERT INTO duitku_callback_logs (
        merchant_order_id, callback_data, signature, is_valid
      ) VALUES ($1, $2, $3, $4)
    `, [merchantOrderId, JSON.stringify(req.body), signature, isValid]);

    // 4. Process based on result code
    // 00 = Success
    // 01 = Pending
    // 02 = Failed/Expired
    
    if (resultCode === '00') {
      // ✅ Payment SUCCESS
      console.log('✅ Payment SUCCESS:', merchantOrderId);

      // Cek apakah sudah diproses sebelumnya (prevent double processing)
      if (order.payment_status === 'success') {
        console.log('⚠️  Order already processed, skipping...');
        return res.status(200).send('success');
      }

      // Update order status
      await pool.query(`
        UPDATE orders 
        SET 
          payment_status = 'success',
          order_status = 'processing',
          paid_at = CURRENT_TIMESTAMP,
          provider_response = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE order_number = $2
      `, [
        JSON.stringify({
          reference,
          paymentCode,
          settlementDate,
          issuerCode,
          resultCode
        }),
        merchantOrderId
      ]);

      // Insert transaction record
      await pool.query(`
        INSERT INTO transactions (
          order_id,
          transaction_id,
          payment_type,
          payment_method,
          gross_amount,
          transaction_status,
          transaction_time,
          settlement_time,
          raw_response
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (transaction_id) DO NOTHING
      `, [
        order.id,
        reference,
        'duitku',
        paymentCode,
        amount,
        'settlement',
        new Date(),
        settlementDate ? new Date(settlementDate) : null,
        JSON.stringify(req.body)
      ]);

      // TODO: Process Digiflazz topup
      try {
        // await processDigiflazzTopup(order);
        console.log('TODO: Process Digiflazz topup for order:', order.id);
      } catch (error) {
        console.error('Digiflazz processing error:', error);
        // Jangan throw error, biar callback tetap return success
      }

      // TODO: Send notification to customer
      try {
        // await sendOrderSuccessNotification(order);
        console.log('TODO: Send notification to customer:', order.customer_email);
      } catch (error) {
        console.error('Notification error:', error);
      }

      console.log('✓ Order processed successfully');

    } else if (resultCode === '01') {
      // ⏳ Payment PENDING
      console.log('⏳ Payment PENDING:', merchantOrderId);

      await pool.query(`
        UPDATE orders 
        SET 
          payment_status = 'pending',
          provider_response = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE order_number = $2
      `, [
        JSON.stringify(req.body),
        merchantOrderId
      ]);

    } else {
      // ❌ Payment FAILED or EXPIRED
      console.log('❌ Payment FAILED/EXPIRED:', merchantOrderId, resultCode);

      await pool.query(`
        UPDATE orders 
        SET 
          payment_status = 'failed',
          order_status = 'failed',
          provider_response = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE order_number = $2
      `, [
        JSON.stringify(req.body),
        merchantOrderId
      ]);
    }

    // IMPORTANT: ALWAYS return "success" ke Duitku
    return res.status(200).send('success');

  } catch (error) {
    console.error('❌ Duitku Callback Error:', error);
    
    // Log error tapi tetap return success
    try {
      await logCallbackError(req.body, error.message);
    } catch (logError) {
      console.error('Failed to log callback error:', logError);
    }

    // CRITICAL: Tetap return success agar Duitku tidak terus retry
    return res.status(200).send('success');
  }
};

/**
 * Test Duitku connection
 * GET /api/duitku/test
 */
exports.testDuitku = async (req, res) => {
  try {
    // 1. Get payment methods
    const methods = await duitkuService.getPaymentMethods(50000);

    if (!methods.success) {
      return res.json({
        success: false,
        error: 'Failed to get payment methods',
        details: methods.error
      });
    }

    // 2. Create test transaction
    const testOrderId = 'TEST-' + Date.now();
    const transaction = await duitkuService.createTransaction({
      merchantOrderId: testOrderId,
      paymentAmount: 50000,
      productDetails: 'Test Product',
      email: 'test@segawontopup.net',
      customerVaName: 'Test User',
      phoneNumber: '081234567890',
      paymentMethod: 'BC', // BCA VA
      callbackUrl: `${process.env.BASE_URL || 'https://segawontopup.net'}/api/duitku/callback`,
      returnUrl: `${process.env.FRONTEND_URL || 'https://segawontopup.net'}/order/${testOrderId}`,
      expiryPeriod: 60
    });

    res.json({
      success: true,
      environment: duitkuService.isSandbox ? 'SANDBOX' : 'PRODUCTION',
      merchantCode: duitkuService.merchantCode,
      paymentMethods: {
        count: methods.paymentMethods.length,
        methods: methods.paymentMethods.slice(0, 5).map(m => ({
          code: m.paymentMethod,
          name: m.paymentName,
          fee: m.totalFee
        }))
      },
      testTransaction: transaction
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Helper: Log callback errors
 */
async function logCallbackError(callbackData, errorMessage) {
  try {
    await pool.query(`
      INSERT INTO duitku_callback_logs (
        merchant_order_id, callback_data, signature, is_valid, error_message
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      callbackData.merchantOrderId,
      JSON.stringify(callbackData),
      callbackData.signature,
      false,
      errorMessage
    ]);
  } catch (error) {
    console.error('Failed to log callback error:', error);
  }
}

module.exports = {
  getPaymentMethods: exports.getPaymentMethods,
  createTransaction: exports.createTransaction,
  checkTransactionStatus: exports.checkTransactionStatus,
  duitkuCallback: exports.duitkuCallback,
  testDuitku: exports.testDuitku
};
