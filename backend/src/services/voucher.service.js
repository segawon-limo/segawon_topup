/**
 * Voucher Service
 * Handles voucher validation and discount calculation
 * UPDATED: Use profit_price for admin voucher (simpler & more flexible)
 */

const { pool } = require('../config/database');

/**
 * Validate voucher code and calculate discount
 * @param {string} code - Voucher code
 * @param {number} orderAmount - Order amount before discount (selling_price)
 * @param {number} profitPrice - Profit price of product (for admin voucher)
 * @returns {Object} - Validation result with discount info
 */
exports.validateVoucher = async (code, orderAmount, profitPrice = null) => {
  try {
    // Get voucher from database
    const result = await pool.query(`
      SELECT * FROM vouchers 
      WHERE UPPER(code) = UPPER($1) 
      AND is_active = true
    `, [code]);

    if (result.rows.length === 0) {
      return {
        valid: false,
        message: 'Kode voucher tidak valid'
      };
    }

    const voucher = result.rows[0];

    // Check if voucher is within valid date range
    const now = new Date();
    if (voucher.valid_from && new Date(voucher.valid_from) > now) {
      return {
        valid: false,
        message: 'Voucher belum dapat digunakan'
      };
    }

    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      return {
        valid: false,
        message: 'Voucher sudah kadaluarsa'
      };
    }

    // Check usage limit
    if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
      return {
        valid: false,
        message: 'Voucher sudah mencapai batas penggunaan'
      };
    }

    // Check minimum purchase (skip for base_price type)
    if (voucher.discount_type !== 'base_price' && voucher.min_purchase && orderAmount < parseFloat(voucher.min_purchase)) {
      return {
        valid: false,
        message: `Minimal pembelian Rp ${parseFloat(voucher.min_purchase).toLocaleString('id-ID')} untuk menggunakan voucher ini`
      };
    }

    // Calculate discount based on type
    let discountAmount = 0;
    
    if (voucher.discount_type === 'percentage') {
      discountAmount = Math.round(orderAmount * parseFloat(voucher.discount_value) / 100);
      
      // Apply max discount limit if exists
      if (voucher.max_discount && discountAmount > parseFloat(voucher.max_discount)) {
        discountAmount = parseFloat(voucher.max_discount);
      }
    } 
    else if (voucher.discount_type === 'fixed') {
      discountAmount = parseFloat(voucher.discount_value);
    }
    else if (voucher.discount_type === 'base_price') {
      // UPDATED: Admin voucher - use profit_price directly as discount
      if (profitPrice === null || profitPrice === undefined) {
        return {
          valid: false,
          message: 'Harga Profit tidak ditemukan.'
        };
      }
      
      // Discount = profit_price (sudah dihitung di database)
      discountAmount = profitPrice;
      
      // Ensure discount is not negative
      if (discountAmount < 0) {
        discountAmount = 0;
      }
    }

    // Discount cannot exceed order amount
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    return {
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: parseFloat(voucher.discount_value),
        is_admin_only: voucher.is_admin_only,
        description: voucher.description
      },
      discount: Math.round(discountAmount),
      finalPrice: orderAmount - Math.round(discountAmount),
      message: voucher.discount_type === 'base_price' 
        ? 'Voucher admin diterapkan - Harga Base'
        : 'Voucher berhasil diterapkan'
    };

  } catch (error) {
    console.error('Validate Voucher Error:', error);
    return {
      valid: false,
      message: 'Terjadi kesalahan saat memvalidasi voucher'
    };
  }
};

/**
 * Increment voucher usage count
 * @param {string} code - Voucher code
 */
exports.incrementVoucherUsage = async (code) => {
  try {
    await pool.query(`
      UPDATE vouchers 
      SET used_count = used_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE UPPER(code) = UPPER($1)
    `, [code]);
  } catch (error) {
    console.error('Increment Voucher Usage Error:', error);
  }
};

/**
 * Get all active vouchers (for admin/display purposes)
 * @param {boolean} includeAdminOnly - Include admin-only vouchers
 */
exports.getActiveVouchers = async (includeAdminOnly = false) => {
  try {
    const query = `
      SELECT 
        id, code, discount_type, discount_value, 
        min_purchase, max_discount, usage_limit, 
        used_count, valid_from, valid_until, 
        is_admin_only, description
      FROM vouchers
      WHERE is_active = true
      ${includeAdminOnly ? '' : 'AND is_admin_only = false'}
      AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
      AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
      AND (usage_limit IS NULL OR used_count < usage_limit)
      ORDER BY is_admin_only DESC, created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Get Active Vouchers Error:', error);
    return [];
  }
};

module.exports = exports;
