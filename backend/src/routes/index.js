/**
 * Routes - UPDATED VERSION
 * Add these routes to your existing routes/index.js
 * 
 * NEW ROUTES:
 * - POST /api/calculate-price - Calculate price with promo
 * - POST /api/validate-promo - Validate promo code
 * - POST /api/orders/create - Create order (updated with promo)
 * - GET /api/orders/:orderNumber - Get order status
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// ========================================
// PRICE CALCULATION & PROMO
// ========================================

/**
 * Calculate final price with optional promo code
 * POST /api/calculate-price
 * 
 * Body: {
 *   productId: "uuid",
 *   paymentMethod: "qris",
 *   promoCode: "WELCOME10" (optional),
 *   customerEmail: "user@email.com" (optional)
 * }
 */
router.post('/calculate-price', orderController.calculatePrice);

/**
 * Validate promo code
 * POST /api/validate-promo
 * 
 * Body: {
 *   promoCode: "WELCOME10",
 *   amount: 50000,
 *   customerEmail: "user@email.com" (optional)
 * }
 */
router.post('/validate-promo', orderController.validatePromo);

// ========================================
// ORDER MANAGEMENT
// ========================================

/**
 * Create new order with promo support
 * POST /api/orders/create
 * 
 * Body: {
 *   productId: "uuid",
 *   paymentMethod: "qris",
 *   customerEmail: "user@email.com",
 *   customerName: "John Doe",
 *   phoneNumber: "081234567890",
 *   riotId: "PlayerName",
 *   riotTag: "TAG",
 *   promoCode: "WELCOME10" (optional)
 * }
 */
router.post('/orders/create', orderController.createOrder);

/**
 * Get order status
 * GET /api/orders/:orderNumber
 */
router.get('/orders/:orderNumber', orderController.getOrderStatus);

/**
 * Get products by game slug
 * GET /api/products/:gameSlug
 */
router.get('/products/:gameSlug', orderController.getProducts);

/**
 * Validate Riot ID
 * POST /api/validate-riot-id
 * 
 * Body: {
 *   riotId: "PlayerName",
 *   riotTag: "TAG"
 * }
 */
router.post('/validate-riot-id', orderController.validateRiotId);

// ========================================
// EXISTING ROUTES (keep your current routes)
// ========================================

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Games list
router.get('/games', orderController.getGames);

module.exports = router;
