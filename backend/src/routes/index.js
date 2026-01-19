const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const paymentController = require('../controllers/payment.controller');

// Public routes

// Riot ID Validation
router.post('/validate-riot-id', orderController.validateRiotId);

// Games
router.get('/games', orderController.getGames);

// Products
router.get('/products/:gameSlug', orderController.getProducts);

// Orders
router.post('/orders', orderController.createOrder);
// router.get('/orders/:orderNumber', orderController.getOrderStatus);
router.get('/orders/status/:orderNumber', orderController.getOrderStatus);

// Payment
router.post('/payment/callback', paymentController.handleCallback);
router.get('/payment/status/:orderNumber', paymentController.checkPaymentStatus);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
