// Routes Configuration
// Add these to your Express app

const express = require('express');
const orderController = require('./controllers/order.controller');
const webhookController = require('./controllers/webhook.controller');

// ========================================
// ORDER ROUTES
// ========================================
const orderRoutes = express.Router();

// Get products for a game
orderRoutes.get('/products/:gameSlug', orderController.getProducts);

// Create new order
orderRoutes.post('/create', orderController.createOrder);

// Get order status
orderRoutes.get('/:orderNumber', orderController.getOrderStatus);

// Check payment status
orderRoutes.get('/:orderNumber/status', orderController.checkPaymentStatus);

// Get order history
orderRoutes.get('/history', orderController.getOrderHistory);

// ========================================
// WEBHOOK ROUTES
// ========================================
const webhookRoutes = express.Router();

// Midtrans notification
webhookRoutes.post('/midtrans', webhookController.midtransWebhook);

// Xendit notification
webhookRoutes.post('/xendit', webhookController.xenditWebhook);

// Test topup (development only)
if (process.env.NODE_ENV === 'development') {
  webhookRoutes.post('/test-topup/:orderNumber', webhookController.testTopup);
}

// ========================================
// EXPORT ROUTES
// ========================================
module.exports = {
  orderRoutes,
  webhookRoutes,
};

// ========================================
// USAGE IN APP.JS or SERVER.JS
// ========================================
/*
const { orderRoutes, webhookRoutes } = require('./routes');

// Mount routes
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);

// Or if you have separate route files:
// const orderRoutes = require('./routes/order.routes');
// const webhookRoutes = require('./routes/webhook.routes');
// app.use('/api/orders', orderRoutes);
// app.use('/api/webhooks', webhookRoutes);
*/
