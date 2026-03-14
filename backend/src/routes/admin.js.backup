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
router.use(authAdmin);

// Dashboard Overview
router.get('/dashboard', adminController.getDashboard);

// Statistics
router.get('/stats/daily',           adminController.getDailyStats);
router.get('/stats/top-products',    adminController.getTopProducts);
router.get('/stats/payment-methods', adminController.getPaymentStats);
router.get('/stats/hourly-pattern',  adminController.getHourlyPattern);

// Orders Management
router.get ('/orders',        adminController.getOrders);
router.post('/orders/retry',  adminController.retryFailedOrders);

// Alerts
router.get('/alerts', adminController.getAlerts);

// ══════════════════════════════════════════════════════════════
// CATALOG — Games & Products CRUD
// ══════════════════════════════════════════════════════════════
const catalogController = require('../controllers/catalog.controller');

// Games
router.get   ('/catalog/games',       catalogController.getGames);
router.get   ('/catalog/games/:id',   catalogController.getGame);
router.post  ('/catalog/games',       catalogController.createGame);
router.put   ('/catalog/games/:id',   catalogController.updateGame);
router.delete('/catalog/games/:id',   catalogController.deleteGame);

// Products
router.get   ('/catalog/products',          catalogController.getProducts);
router.post  ('/catalog/products',          catalogController.createProduct);
router.put   ('/catalog/products/:id',      catalogController.updateProduct);
router.delete('/catalog/products/:id',      catalogController.deleteProduct);
router.post  ('/catalog/products/bulk',     catalogController.bulkCreateProducts);

// Image Upload (base64, no multer)
router.post('/catalog/upload-image', catalogController.uploadImage);

// ══════════════════════════════════════════════════════════════
// VOUCHER ADMIN — CRUD + Usage Log
// ══════════════════════════════════════════════════════════════
const adminVoucherController = require('../controllers/admin.voucher.controller');

router.get   ('/vouchers',           adminVoucherController.getVouchers);
router.post  ('/vouchers',           adminVoucherController.createVoucher);
router.get   ('/vouchers/usage-log', adminVoucherController.getUsageLog);
router.put   ('/vouchers/:id',       adminVoucherController.updateVoucher);
router.patch ('/vouchers/:id/toggle',adminVoucherController.toggleVoucher);
router.delete('/vouchers/:id',       adminVoucherController.deleteVoucher);

// ══════════════════════════════════════════════════════════════
// FEEDBACK — List & Delete
// ══════════════════════════════════════════════════════════════
const feedbackController = require('../controllers/feedback.controller');

router.get   ('/feedbacks',     feedbackController.getFeedbacks);
router.delete('/feedbacks/:id', feedbackController.deleteFeedback);

// ══════════════════════════════════════════════════════════════
module.exports = router;