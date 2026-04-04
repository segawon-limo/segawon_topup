/**
 * Voucher Controller
 * Handles voucher validation endpoints
 * UPDATED: Use profit_price for admin voucher
 */

const voucherService = require('../services/voucher.service');
const { pool } = require('../config/database');

/**
 * Validate voucher code
 * POST /api/vouchers/validate
 * Body: { code: string, orderAmount: number, productId: number }
 * 
 * UPDATED: Now fetches product's profit_price for admin vouchers
 * UPDATED: Now calls reserveVoucher() instead of validateVoucher() to prevent dual-tab abuse.
 *          Frontend wajib kirim sessionToken (crypto.randomUUID() dibuat saat komponen mount).
 */
exports.validateVoucher = async (req, res) => {
  try {
    const { code, orderAmount, productId, profitPrice: profitPriceDirect, customerEmail, customerPhone, sessionToken } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: 'Kode voucher dan jumlah pesanan harus diisi'
      });
    }

    // [ADDED] sessionToken wajib ada untuk sistem reservasi
    if (!sessionToken) {
      return res.status(400).json({ success: false, message: 'sessionToken wajib diisi' });
    }

    // Prioritas: profitPrice langsung (untuk pascabayar) > ambil dari productId (untuk topup biasa)
    let profitPrice = null;
    if (profitPriceDirect !== undefined && profitPriceDirect !== null) {
      // Pascabayar: komisi dikirim langsung dari frontend
      profitPrice = parseFloat(profitPriceDirect);
    } else if (productId) {
      // Topup biasa: ambil dari tabel products
      const productResult = await pool.query(
        'SELECT profit_price FROM products WHERE id = $1',
        [productId]
      );
      if (productResult.rows.length > 0) {
        profitPrice = parseFloat(productResult.rows[0].profit_price);
      }
    }

    // [CHANGED] Panggil reserveVoucher (bukan validateVoucher) agar slot langsung dikunci
    const result = await voucherService.reserveVoucher(
      code,
      parseFloat(orderAmount),
      profitPrice,
      customerEmail || null,
      customerPhone || null,
      sessionToken
    );

    if (result.success) {
      return res.json({ success: true, ...result });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }

  } catch (error) {
    console.error('Validate Voucher Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memvalidasi voucher'
    });
  }
};

/**
 * Get all active vouchers
 * GET /api/vouchers/active
 * Query: ?includeAdmin=true (optional)
 */
exports.getActiveVouchers = async (req, res) => {
  try {
    const includeAdmin = req.query.includeAdmin === 'true';
    const vouchers = await voucherService.getActiveVouchers(includeAdmin);
    
    res.json({
      success: true,
      vouchers: vouchers
    });

  } catch (error) {
    console.error('Get Active Vouchers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar voucher'
    });
  }
};

/**
 * [ADDED] Release voucher reservation
 * DELETE /api/vouchers/release
 * Dipanggil saat user klik tombol "Hapus" voucher di form.
 * Melepas reservation aktif → voucher bebas dipakai di produk/tab lain tanpa tunggu expired.
 * Body: { code: string, sessionToken: string }
 */
exports.releaseVoucher = async (req, res) => {
  try {
    const { code, sessionToken } = req.body;
    if (!code || !sessionToken) {
      return res.status(400).json({ success: false, message: 'code dan sessionToken wajib diisi' });
    }
    await voucherService.releaseReservation(code, sessionToken);
    // Selalu 200 — kalau reservation sudah expired pun tidak masalah
    return res.json({ success: true });
  } catch (error) {
    console.error('Release Voucher Controller Error:', error);
    res.status(500).json({ success: false, message: 'Gagal melepas reservasi voucher' });
  }
};

module.exports = exports;