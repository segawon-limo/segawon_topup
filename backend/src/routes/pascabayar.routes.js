/**
 * pascabayar.routes.js
 * 
 * Tambahkan ke index.js / app.js:
 *   const pascabayarRoutes = require('./routes/pascabayar.routes');
 *   app.use('/api/pascabayar', pascabayarRoutes);
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/pascabayar.controller');

// GET  /api/pascabayar/products           → daftar produk pascabayar
router.get('/products', controller.getProducts);

// POST /api/pascabayar/inquiry            → cek tagihan ke Digiflazz
router.post('/inquiry', controller.inquiry);

// GET  /api/pascabayar/inquiry/:refId     → ambil data inquiry tersimpan
router.get('/inquiry/:refId', controller.getInquiry);

// POST /api/pascabayar/pay                → bayar tagihan + buat order + Duitku
router.post('/pay', controller.pay);

module.exports = router;