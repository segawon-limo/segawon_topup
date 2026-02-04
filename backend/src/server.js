const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// IMPORTANT: Trust proxy (for Nginx)
// ========================================
app.set('trust proxy', true);

// ========================================
// MIDDLEWARE (order matters!)
// ========================================

// 1. Security
app.use(helmet());

// 2. CORS
app.use(cors({
  origin: [
    'https://segawontopup.net',
    'https://www.segawontopup.net',
    'http://localhost:3000'
  ],
  credentials: true
}));

// 3. Body parser (BEFORE routes!)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Logging
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// 5. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// ========================================
// ROUTES
// ========================================

// Import routes
const routes = require('./routes/index');
const duitkuRoutes = require('./routes/duitku.routes');

// Register routes
app.use('/api', routes);
app.use('/api/duitku', duitkuRoutes);

// ========================================
// ROOT ENDPOINT
// ========================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Segawon Topup API - Duitku Payment',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      games: '/api/games',
      products: '/api/products/:gameSlug',
      createOrder: 'POST /api/orders/create',
      orderStatus: '/api/orders/:orderNumber',
      duitkuCallback: 'POST /api/duitku/callback',
      duitkuTest: '/api/duitku/test'
    }
  });
});

// ========================================
// ERROR HANDLERS
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ========================================
// SERVER START
// ========================================

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🎮 Segawon Topup API                        ║
║   💳 Duitku Payment Gateway                   ║
║                                               ║
║   Server: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'production'}                     ║
║                                               ║
║   Ready to accept requests! 🚀                ║
╚═══════════════════════════════════════════════╝
  `);
  
  console.log('✓ Routes loaded');
  console.log('✓ Database connected');
  if (process.env.DUITKU_SANDBOX_MERCHANT_CODE) {
    console.log('✓ Duitku configured');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    pool.end(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

module.exports = app;
