/**
 * Duitku Routes
 */

const express = require('express');
const router = express.Router();
const duitkuController = require('../controllers/duitku.controller');
const duitkuIpWhitelist = require('../middleware/duitkuIpWhitelist');

/**
 * GET /api/duitku/payment-methods?amount=50000
 * Get available payment methods
 */
router.get('/payment-methods', duitkuController.getPaymentMethods);

/**
 * POST /api/duitku/create-transaction
 * Create new payment transaction
 */
router.post('/create-transaction', duitkuController.createTransaction);

/**
 * GET /api/duitku/check-transaction/:merchantOrderId
 * Check transaction status
 */
router.get('/check-transaction/:merchantOrderId', duitkuController.checkTransactionStatus);

/**
 * POST /api/duitku/callback
 * Duitku webhook callback
 * 
 * Dilindungi IP whitelist — hanya IP resmi Duitku yang bisa masuk.
 * Di mode development/sandbox, whitelist dinonaktifkan otomatis.
 */
router.post('/callback', duitkuIpWhitelist, duitkuController.duitkuCallback);

/**
 * GET /api/duitku/test
 * Test Duitku connection
 */
router.get('/test', duitkuController.testDuitku);

module.exports = router;