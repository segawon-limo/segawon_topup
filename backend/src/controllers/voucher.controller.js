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
 */
exports.validateVoucher = async (req, res) => {
  try {
    const { code, orderAmount, productId } = req.body;

    if (!code || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: 'Kode voucher dan jumlah pesanan harus diisi'
      });
    }

    // UPDATED: Fetch profit_price instead of base_price
    let profitPrice = null;
    if (productId) {
      const productResult = await pool.query(
        'SELECT profit_price FROM products WHERE id = $1',
        [productId]
      );
      
      if (productResult.rows.length > 0) {
        profitPrice = parseFloat(productResult.rows[0].profit_price);
      }
    }

    // Validate voucher with profit price
    const result = await voucherService.validateVoucher(
      code, 
      parseFloat(orderAmount),
      profitPrice  // Pass profit_price instead of base_price
    );

    if (result.valid) {
      return res.json({
        success: true,
        ...result
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
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

module.exports = exports;
