/**
 * Voucher Controller
 * Handles voucher validation endpoints
 * UPDATED: Support for base_price voucher type
 */

const voucherService = require('../services/voucher.service');
const { pool } = require('../config/database');

/**
 * Validate voucher code
 * POST /api/vouchers/validate
 * Body: { code: string, orderAmount: number, productId: number }
 * 
 * UPDATED: Now fetches product's base_price for admin vouchers
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

    // NEW: Fetch base_price if productId is provided
    let basePrice = null;
    if (productId) {
      const productResult = await pool.query(
        'SELECT base_price FROM products WHERE id = $1',
        [productId]
      );
      
      if (productResult.rows.length > 0) {
        basePrice = parseFloat(productResult.rows[0].base_price);
      }
    }

    // Validate voucher with base price
    const result = await voucherService.validateVoucher(
      code, 
      parseFloat(orderAmount),
      basePrice
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
