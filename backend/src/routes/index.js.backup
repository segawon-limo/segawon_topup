/**
 * Main Routes - Duitku Only Version
 * Removed: Midtrans, Xendit
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const voucherController = require('../controllers/voucher.controller');

// ========================================
// HEALTH CHECK
// ========================================
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// GAMES & PRODUCTS
// ========================================

// Get all games
router.get('/games', orderController.getGames);

// Get products by game slug
router.get('/products/:gameSlug', orderController.getProducts);

// ========================================
// RIOT ID VALIDATION
// ========================================
router.post('/validate-riot-id', orderController.validateRiotId);
router.post('/check-pln-meter', orderController.checkPlnMeter);
router.get('/check-pln-meter/:refId', orderController.getPlnMeterResult);

// ========================================
// VOUCHER MANAGEMENT
// ========================================

// Validate voucher code
router.post('/vouchers/validate', voucherController.validateVoucher);

// Get active vouchers (optional)
router.get('/vouchers/active', voucherController.getActiveVouchers);

// ========================================
// ORDER MANAGEMENT
// ========================================

// Create order (Duitku payment)
router.post('/orders/create', orderController.createOrder);

// Get order status
router.get('/orders/:orderNumber', orderController.getOrderStatus);

// Get order history (optional)
router.get('/orders/history', orderController.getOrderHistory);

module.exports = router;