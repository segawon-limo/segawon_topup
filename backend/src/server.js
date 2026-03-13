require('dotenv').config();
const express = require('express');
const { initWebSocket } = require('./controllers/terminal.controller');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// IMPORTANT: Trust proxy (for Nginx)
// '1' = trust one hop (Nginx sebagai reverse proxy langsung)
// Ini membuat express-rate-limit bisa baca IP asli dari X-Forwarded-For
// tanpa bisa di-spoof dari luar
// ========================================
app.set('trust proxy', 1);

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3b. Static file serving — feedback uploads
const path = require('path');
app.use('/uploads/feedback', express.static(
  path.join(__dirname, '..', 'uploads', 'feedback')
));

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
const routes          = require('./routes/index');
const duitkuRoutes    = require('./routes/duitku.routes');
const digiflazzRoutes = require('./routes/digiflazz.routes');
const pascabayarRoutes = require('./routes/pascabayar.routes');
app.use('/api/pascabayar', pascabayarRoutes);

// Register routes
app.use('/api', routes);
app.use('/api/duitku', duitkuRoutes);
app.use('/api/digiflazz', digiflazzRoutes);

// ========================================
// SITEMAP.XML — Dinamis dari DB games
// ========================================
app.get('/sitemap.xml', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const BASE_URL = 'https://segawontopup.net';
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT slug, updated_at FROM games WHERE is_active = true ORDER BY sort_order ASC`
    );

    const staticUrls = [
      { loc: '/',              priority: '1.0', changefreq: 'daily'   },
      { loc: '/cek-transaksi', priority: '0.5', changefreq: 'monthly' },
      { loc: '/pascabayar',    priority: '0.6', changefreq: 'monthly' },
      { loc: '/faq',           priority: '0.5', changefreq: 'monthly' },
    ];

    const gameUrls = result.rows.map(g => ({
      loc:        `/order/${g.slug}`,
      priority:   '0.9',
      changefreq: 'weekly',
      lastmod:    g.updated_at ? g.updated_at.toISOString().split('T')[0] : today,
    }));

    const allUrls = [...staticUrls, ...gameUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // cache 1 jam
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

// ========================================
// SHORT LINK REDIRECT
// ========================================
app.get('/r/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const shortlinkService = require('./services/shortlink.service');
    const longUrl = await shortlinkService.resolveShortLink(code);

    if (!longUrl) {
      return res.status(404).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:40px;">
          <h2>Link tidak ditemukan atau sudah kadaluarsa</h2>
          <p>Silakan buka halaman order Anda untuk mendapatkan link pembayaran baru.</p>
          <a href="${process.env.FRONTEND_URL || 'https://segawontopup.net'}">Kembali ke Segawon Topup</a>
        </body></html>
      `);
    }

    // 302 redirect ke URL asli e-wallet
    res.redirect(302, longUrl);
  } catch (err) {
    console.error('[ShortLink] Redirect error:', err);
    res.status(500).send('Terjadi kesalahan, silakan coba lagi.');
  }
});

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
      duitkuCallback:      'POST /api/duitku/callback',
      duitkuTest:          '/api/duitku/test',
      digiflazzWebhook:    'POST /api/digiflazz/webhook',
      digiflazzWebhookGet: 'GET /api/digiflazz/webhook'
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

// Init WebSocket terminal
initWebSocket(server);

// Graceful shutdown — SIGTERM (pm2 stop/restart) & SIGINT (pm2 reload)
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, closing server gracefully...`);
  server.close(() => {
    pool.end(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });

  // Force kill jika tidak selesai dalam 10 detik
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

module.exports = app;