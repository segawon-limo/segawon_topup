const { query } = require('../config/database');
const xenditService = require('../services/xendit.service');
const orderController = require('./order.controller');

class PaymentController {
  // Handle Xendit notification/callback
  async handleCallback(req, res) {
    try {
      console.log('Received Xendit webhook:', JSON.stringify(req.body, null, 2));

      const webhookData = req.body;

      // Verify callback token (optional but recommended)
      const callbackToken = req.headers['x-callback-token'];
      if (callbackToken && !xenditService.verifyCallbackToken(callbackToken)) {
        console.error('Invalid callback token');
        return res.status(401).json({
          success: false,
          message: 'Invalid callback token',
        });
      }

      // Process webhook
      const result = xenditService.handleWebhook(webhookData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      const { orderId, paymentStatus, orderStatus } = result.data;

      // Get order from database
      const orderResult = await query(
        'SELECT * FROM orders WHERE order_number = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      const order = orderResult.rows[0];

      // Update order dan transaction
      await query(
        `UPDATE orders 
         SET payment_status = $1, 
             order_status = $2,
             paid_at = CASE WHEN $1 = 'success' THEN NOW() ELSE paid_at END
         WHERE order_number = $3`,
        [paymentStatus, orderStatus, orderId]
      );

      // Insert/Update transaction record
      await query(
        `INSERT INTO transactions (
          order_id, transaction_id, payment_type, payment_method,
          gross_amount, transaction_status, transaction_time,
          settlement_time, fraud_status, status_message, raw_response
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (transaction_id) DO UPDATE
        SET transaction_status = EXCLUDED.transaction_status,
            settlement_time = EXCLUDED.settlement_time,
            status_message = EXCLUDED.status_message,
            raw_response = EXCLUDED.raw_response,
            updated_at = NOW()`,
        [
          order.id,
          webhookData.id,
          webhookData.payment_method || 'unknown',
          webhookData.payment_channel || webhookData.payment_method,
          webhookData.amount || webhookData.paid_amount,
          webhookData.status,
          webhookData.created || new Date().toISOString(),
          webhookData.paid_at || null,
          null, // fraud_status
          webhookData.failure_code || null,
          JSON.stringify(webhookData),
        ]
      );

      // Jika payment success, process order ke VIP Reseller
      if (paymentStatus === 'success' && order.order_status === 'pending') {
        // Process order secara async
        orderController.processOrder(order.id).catch((error) => {
          console.error('Error processing order:', error);
        });
      }

      res.json({
        success: true,
        message: 'Webhook processed',
      });
    } catch (error) {
      console.error('Error handling payment callback:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process webhook',
      });
    }
  }

  // Manual check payment status
  async checkPaymentStatus(req, res) {
    try {
      const { orderNumber } = req.params;

      // Get order
      const orderResult = await query(
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

      // Get invoice ID dari transaction atau payment_url
      // Xendit invoice URL format: https://checkout.xendit.co/v2/xxxxx
      // Extract invoice ID
      const invoiceId = order.payment_url ? order.payment_url.split('/').pop() : null;

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          message: 'Invoice ID not found',
        });
      }

      // Check status di Xendit
      const statusResult = await xenditService.getInvoiceStatus(invoiceId);

      if (!statusResult.success) {
        return res.status(500).json({
          success: false,
          message: statusResult.message,
        });
      }

      const xenditData = statusResult.data;

      // Determine status
      let paymentStatus = 'pending';
      let orderStatus = 'pending';

      if (xenditData.status === 'PAID' || xenditData.status === 'SETTLED') {
        paymentStatus = 'success';
        orderStatus = 'processing';
      } else if (xenditData.status === 'EXPIRED') {
        paymentStatus = 'expired';
        orderStatus = 'failed';
      }

      // Update database jika ada perubahan
      if (order.payment_status !== paymentStatus) {
        await query(
          `UPDATE orders 
           SET payment_status = $1, 
               order_status = $2,
               paid_at = CASE WHEN $1 = 'success' THEN NOW() ELSE paid_at END
           WHERE id = $3`,
          [paymentStatus, orderStatus, order.id]
        );

        // Process order jika payment success
        if (paymentStatus === 'success' && order.order_status === 'pending') {
          orderController.processOrder(order.id).catch((error) => {
            console.error('Error processing order:', error);
          });
        }
      }

      res.json({
        success: true,
        data: {
          orderNumber,
          paymentStatus,
          orderStatus,
          xenditStatus: xenditData.status,
        },
      });
    } catch (error) {
      console.error('Error checking payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check payment status',
      });
    }
  }
}

module.exports = new PaymentController();
