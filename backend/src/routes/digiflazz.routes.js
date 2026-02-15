/**
 * Digiflazz Routes
 *
 * Setelah deploy, daftarkan webhook URL di dashboard Digiflazz:
 * Settings → URL Callback → https://segawontopup.net/api/digiflazz/webhook
 */

const express              = require('express');
const router               = express.Router();
const digiflazzController  = require('../controllers/digiflazz.controller');

/**
 * GET /api/digiflazz/webhook
 * Endpoint verifikasi — Digiflazz kadang GET dulu untuk cek URL aktif
 */
router.get('/webhook', digiflazzController.webhookVerify);

/**
 * POST /api/digiflazz/webhook
 * Notifikasi transaksi async dari Digiflazz
 * (Steam Wallet, Token PLN, Pulsa, dll yang statusnya Pending dulu)
 */
router.post('/webhook', digiflazzController.digiflazzWebhook);

module.exports = router;