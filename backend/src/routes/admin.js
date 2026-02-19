const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authAdmin = require('../middleware/authAdmin');

// ══════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth required)
// ══════════════════════════════════════════════════════════════
router.post('/login', adminController.login);

// ══════════════════════════════════════════════════════════════
// PROTECTED ROUTES (require JWT token)
// ══════════════════════════════════════════════════════════════
router.use(authAdmin); // All routes below require authentication

// Dashboard Overview
router.get('/dashboard', adminController.getDashboard);

// Statistics
router.get('/stats/daily', adminController.getDailyStats);
router.get('/stats/top-products', adminController.getTopProducts);
router.get('/stats/payment-methods', adminController.getPaymentStats);
router.get('/stats/hourly-pattern', adminController.getHourlyPattern);

// Orders Management
router.get('/orders', adminController.getOrders);
router.post('/orders/retry', adminController.retryFailedOrders);

// Alerts
router.get('/alerts', adminController.getAlerts);

module.exports = router;
