// Webhook Controller - PostgreSQL Version (Raw SQL)
const { pool } = require('../config/database');
const midtransService = require('../services/midtrans.service');
const vipResellerService = require('../services/vipreseller-working.service');

/**
 * Handle Midtrans Webhook Notification
 */
exports.midtransWebhook = async (req, res) => {
  try {
    console.log('=== Midtrans Webhook Received ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Process notification
    const result = midtransService.handleNotification(req.body);

    if (!result.success) {
      console.error('Invalid signature or notification');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid notification',
      });
    }

    const { orderId, orderStatus, transactionStatus, paymentType, amount } = result.data;

    // Find order with product info
    const orderQuery = `
      SELECT o.*, p.sku, p.name as product_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.order_number = $1
    `;
    
    const orderResult = await pool.query(orderQuery, [orderId]);

    if (orderResult.rows.length === 0) {
      console.error('Order not found:', orderId);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found',
      });
    }

    const order = orderResult.rows[0];

    console.log('Order found:', {
      orderNumber: order.order_number,
      currentStatus: order.payment_status,
      newStatus: orderStatus,
    });

    // Update payment status
    await pool.query(
      `UPDATE orders 
       SET payment_status = $1, payment_channel = $2, updated_at = NOW()
       WHERE order_number = $3`,
      [orderStatus, paymentType, orderId]
    );

    // If payment successful, process topup
    if (orderStatus === 'paid' && order.order_status === 'pending') {
      console.log('Payment successful, processing topup...');
      
      // Mark as paid
      await pool.query(
        `UPDATE orders SET paid_at = NOW() WHERE order_number = $1`,
        [orderId]
      );

      // Process topup in background
      processTopup(order).catch(error => {
        console.error('Background topup error:', error);
      });
    }

    return res.json({ 
      success: true,
      message: 'Notification processed',
    });

  } catch (error) {
    console.error('Midtrans Webhook Error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Handle Xendit Webhook Notification
 */
exports.xenditWebhook = async (req, res) => {
  try {
    console.log('=== Xendit Webhook Received ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { external_id, status, paid_amount, payment_channel } = req.body;

    // Verify webhook token (optional but recommended)
    const webhookToken = req.headers['x-callback-token'];
    if (process.env.XENDIT_WEBHOOK_TOKEN && webhookToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
      console.error('Invalid webhook token');
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized',
      });
    }

    // Find order with product info
    const orderQuery = `
      SELECT o.*, p.sku, p.name as product_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.order_number = $1
    `;
    
    const orderResult = await pool.query(orderQuery, [external_id]);

    if (orderResult.rows.length === 0) {
      console.error('Order not found:', external_id);
      return res.status(404).json({ 
        success: false,
        message: 'Order not found',
      });
    }

    const order = orderResult.rows[0];

    console.log('Order found:', {
      orderNumber: order.order_number,
      currentStatus: order.payment_status,
      newStatus: status,
    });

    // Map Xendit status to our status
    let paymentStatus = 'pending';
    if (status === 'PAID') {
      paymentStatus = 'paid';
    } else if (status === 'EXPIRED') {
      paymentStatus = 'expired';
    } else if (status === 'PENDING') {
      paymentStatus = 'pending';
    }

    // Update payment status
    await pool.query(
      `UPDATE orders 
       SET payment_status = $1, payment_channel = $2, updated_at = NOW()
       WHERE order_number = $3`,
      [paymentStatus, payment_channel, external_id]
    );

    // If payment successful, process topup
    if (paymentStatus === 'paid' && order.order_status === 'pending') {
      console.log('Payment successful, processing topup...');
      
      // Mark as paid
      await pool.query(
        `UPDATE orders SET paid_at = NOW() WHERE order_number = $1`,
        [external_id]
      );

      // Process topup in background
      processTopup(order).catch(error => {
        console.error('Background topup error:', error);
      });
    }

    return res.json({ 
      success: true,
      message: 'Notification processed',
    });

  } catch (error) {
    console.error('Xendit Webhook Error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Process topup to VIP Reseller (async)
 */
async function processTopup(order) {
  try {
    console.log('=== Processing Topup ===');
    console.log('Order:', order.order_number);
    console.log('Product:', order.sku);
    console.log('User:', order.game_user_id + (order.game_user_tag ? '#' + order.game_user_tag : ''));

    // Update status to processing
    await pool.query(
      `UPDATE orders SET order_status = $1, updated_at = NOW() WHERE order_number = $2`,
      ['processing', order.order_number]
    );

    // Call VIP Reseller API
    const result = await vipResellerService.createTransaction({
      productCode: order.sku,
      userId: order.game_user_id,
      gameTag: order.game_user_tag,
      orderNumber: order.order_number,
    });

    console.log('VIP Reseller Response:', result);

    if (result.success) {
      // Topup successful
      await pool.query(
        `UPDATE orders 
         SET order_status = $1,
             provider_order_id = $2,
             provider_serial_number = $3,
             provider_response = $4,
             processed_at = NOW(),
             updated_at = NOW()
         WHERE order_number = $5`,
        [
          'completed',
          result.data.transactionId || null,
          result.data.serialNumber || null,
          JSON.stringify(result.data),
          order.order_number,
        ]
      );

      console.log('✅ Topup completed successfully!');
      
      // TODO: Send email/SMS notification to customer
      // await sendSuccessNotification(order);

    } else {
      // Topup failed
      await pool.query(
        `UPDATE orders 
         SET order_status = $1,
             provider_response = $2,
             notes = $3,
             updated_at = NOW()
         WHERE order_number = $4`,
        [
          'failed',
          JSON.stringify(result),
          result.message,
          order.order_number,
        ]
      );

      console.error('❌ Topup failed:', result.message);
      
      // TODO: Send failure notification
      // await sendFailureNotification(order);
    }

  } catch (error) {
    console.error('Process Topup Error:', error);
    
    await pool.query(
      `UPDATE orders 
       SET order_status = $1, notes = $2, updated_at = NOW()
       WHERE order_number = $3`,
      ['failed', error.message, order.order_number]
    );
  }
}

/**
 * Test endpoint to manually trigger topup (for testing)
 */
exports.testTopup = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const orderQuery = `
      SELECT o.*, p.sku, p.name as product_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.order_number = $1
    `;
    
    const orderResult = await pool.query(orderQuery, [orderNumber]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const order = orderResult.rows[0];

    if (order.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order not paid yet',
        currentStatus: order.payment_status,
      });
    }

    // Process topup
    await processTopup(order);

    return res.json({
      success: true,
      message: 'Topup process triggered',
    });

  } catch (error) {
    console.error('Test Topup Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = exports;
