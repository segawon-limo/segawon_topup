/**
 * Main Routes - Duitku Only Version
 * Removed: Midtrans, Xendit
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const voucherController      = require('../controllers/voucher.controller');
const adminVoucherController = require('../controllers/admin.voucher.controller');

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
router.get('/validate-riot-id', (req, res) => {
  res.status(405).json({ success: false, message: 'Method Not Allowed. Use POST.' });
});
router.post('/check-pln-meter', orderController.checkPlnMeter);

// ========================================
// VOUCHER MANAGEMENT
// ========================================

// Validate voucher code
router.post('/vouchers/validate', voucherController.validateVoucher);

// Get active vouchers (optional)
router.get('/vouchers/active', voucherController.getActiveVouchers);

// Promo popup — voucher yang di-set tampil di homepage
router.get('/promo-popup', adminVoucherController.getPromoPopup);

// ========================================
// ORDER MANAGEMENT
// ========================================

// Create order (Duitku payment)
router.post('/orders/create', orderController.createOrder);

// Get order status
router.get('/orders/:orderNumber', orderController.getOrderStatus);

// Get order history (optional)
router.get('/orders/history', orderController.getOrderHistory);

// ========================================
// TELEGRAM WEBHOOK
// ========================================
const telegramController = require('../controllers/telegram.controller');
router.post('/telegram/webhook',   telegramController.handleWebhook);
router.get ('/telegram/register',  telegramController.registerWebhook);  // panggil sekali untuk setup

// ========================================
// FEEDBACK
// ========================================
const feedbackController = require('../controllers/feedback.controller');
router.post('/feedback', feedbackController.submitFeedback);

// ========================================
// CONTACT VALIDATION (email + phone)
// ========================================
const validationService = require('../services/validation.service');

router.post('/validate-contact', async (req, res) => {
  const { type, value } = req.body;
  if (!type || !value) {
    return res.status(400).json({ success: false, message: 'type dan value wajib diisi' });
  }
  try {
    if (type === 'email') {
      const result = await validationService.validateEmailFull(value);
      return res.json({ success: true, ...result });
    }
    if (type === 'phone') {
      const result = validationService.validatePhone(value);
      return res.json({ success: true, ...result });
    }
    return res.status(400).json({ success: false, message: 'type harus "email" atau "phone"' });
  } catch (err) {
    console.error('[validate-contact] error:', err);
    return res.json({ success: true, valid: true, source: 'server_error_fallback' });
  }
});

module.exports = router;

// ══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════════
const adminRoutes = require('./admin');
router.use('/admin', adminRoutes);