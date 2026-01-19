const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import ORIGINAL routes (from routes/index.js)
const routes = require('./routes/index');

// Import NEW controllers for multi-payment
const orderController = require('./controllers/order.controller');
const webhookController = require('./controllers/webhook.controller');

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ========================================
// EXISTING ROUTES (your original routes from routes/index.js)
// Now includes validateRiotId and getGames methods
// ========================================
app.use('/api', routes);

// ========================================
// NEW ROUTES FOR MULTI-PAYMENT
// These are ADDITIONAL routes on top of your existing ones
// ========================================

// Order routes with multi-payment support
app.get('/api/orders/products/:gameSlug', orderController.getProducts);
app.post('/api/orders/create', orderController.createOrder);
app.post('/api/validate-riot-id', orderController.validateRiotId);
app.get('/api/orders/:orderNumber', orderController.getOrderStatus);
app.get('/api/orders/:orderNumber/status', orderController.checkPaymentStatus);
app.get('/api/orders/history', orderController.getOrderHistory);

// Webhook routes for payment notifications
app.post('/api/webhooks/midtrans', webhookController.midtransWebhook);
app.post('/api/webhooks/xendit', webhookController.xenditWebhook);

// Test topup endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/webhooks/test-topup/:orderNumber', webhookController.testTopup);
}

// ========================================
// ROOT ENDPOINT (Updated with new endpoints)
// ========================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Instant Game Topup API - Multi Payment Support',
    version: '2.0.0',
    endpoints: {
      // Existing endpoints
      health: '/api/health',
      games: '/api/games',
      validateRiotId: 'POST /api/validate-riot-id',
      products: '/api/products/:gameSlug',
      createOrder: 'POST /api/orders',
      orderStatus: '/api/orders/:orderNumber',
      paymentCallback: 'POST /api/payment/callback',
      paymentStatus: '/api/payment/status/:orderNumber',
      
      // New multi-payment endpoints
      productsWithPricing: '/api/orders/products/:gameSlug',
      createOrderNew: 'POST /api/orders/create',
      checkPaymentStatus: '/api/orders/:orderNumber/status',
      orderHistory: '/api/orders/history?email=xxx',
      
      // Webhook endpoints
      midtransWebhook: 'POST /api/webhooks/midtrans',
      xenditWebhook: 'POST /api/webhooks/xendit',
      
      // Development only
      ...(process.env.NODE_ENV === 'development' && {
        testTopup: 'POST /api/webhooks/test-topup/:orderNumber',
      }),
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   🎮 Instant Game Topup API v2.0              ║
║   💳 Multi-Payment Support                    ║
║                                               ║
║   Server: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                     ║
║                                               ║
║   📡 Webhook URLs:                            ║
║   Midtrans: /api/webhooks/midtrans            ║
║   Xendit: /api/webhooks/xendit                ║
║                                               ║
║   ✅ All Routes Active (Old + New)            ║
║                                               ║
║   Ready to accept requests! 🚀                ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `);
  
  // Log webhook URLs for easy copy-paste
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  console.log('\n🔗 Copy these webhook URLs to your payment gateway dashboards:\n');
  console.log(`Midtrans: ${baseUrl}/api/webhooks/midtrans`);
  console.log(`Xendit:   ${baseUrl}/api/webhooks/xendit\n`);
});

module.exports = app;
