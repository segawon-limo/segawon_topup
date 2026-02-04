/**
 * Price Calculator Service
 * Handles all pricing calculations including smart promo strategy
 * 
 * PROFIT STRATEGY:
 * - Normal: 3% profit margin
 * - With Promo: Inflate price first (15% markup), then apply discount
 *   Result: Customer sees discount, you still profit 1-3%
 */

const { pool } = require('../config/database');

class PriceCalculator {
  /**
   * Profit margins configuration
   */
  static PROFIT_MARGINS = {
    normal: 3,           // 3% profit for normal sales
    withPromo: 15,       // 15% markup when promo is used (to allow discount while keeping profit)
    minPromoProfit: 1    // Minimum 1% profit when using promo
  };

  /**
   * Calculate final price with all fees and discounts
   */
  static async calculateFinalPrice(params) {
    const {
      productId,
      paymentMethod,
      paymentGateway = 'duitku',
      promoCode = null,
      customerEmail = null
    } = params;

    try {
      // 1. Get product
      const productResult = await pool.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = true',
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const product = productResult.rows[0];
      const basePrice = parseFloat(product.base_price);

      // 2. Check if promo will be used
      let willUsePromo = false;
      if (promoCode) {
        const quickCheck = await pool.query(
          `SELECT * FROM promo_codes 
           WHERE code = $1 AND is_active = true 
           AND (valid_until IS NULL OR valid_until > NOW())`,
          [promoCode]
        );
        willUsePromo = quickCheck.rows.length > 0;
      }

      // 3. Calculate selling price
      let sellingPrice, displayedNormalPrice, profitMargin;

      if (willUsePromo) {
        // SMART: Inflate 15% first (allows 10% discount + still profit)
        profitMargin = this.PROFIT_MARGINS.withPromo;
        displayedNormalPrice = basePrice * (1 + profitMargin / 100);
        sellingPrice = displayedNormalPrice;
      } else {
        // Normal: 3% profit
        profitMargin = this.PROFIT_MARGINS.normal;
        sellingPrice = basePrice * (1 + profitMargin / 100);
        displayedNormalPrice = sellingPrice;
      }

      // 4. Calculate payment fee
      const paymentFee = this.calculatePaymentFee(sellingPrice, paymentMethod, paymentGateway);

      // 5. Subtotal
      const subtotal = sellingPrice + paymentFee;

      // 6. Apply promo
      let promoDiscount = 0;
      let promoDetails = null;
      let actualProfit = profitMargin;

      if (promoCode && willUsePromo) {
        const promoResult = await this.validateAndCalculatePromo({
          promoCode, subtotal, customerEmail, productId, basePrice
        });

        if (promoResult.valid) {
          promoDiscount = promoResult.discount;
          promoDetails = promoResult.details;

          // Calculate actual profit after promo
          const finalProductPrice = sellingPrice - promoDiscount;
          actualProfit = ((finalProductPrice - basePrice) / basePrice) * 100;

          // Ensure minimum 1% profit
          if (actualProfit < this.PROFIT_MARGINS.minPromoProfit) {
            const minPrice = basePrice * (1 + this.PROFIT_MARGINS.minPromoProfit / 100);
            const maxDiscount = sellingPrice - minPrice;
            promoDiscount = Math.min(promoDiscount, maxDiscount);
            actualProfit = this.PROFIT_MARGINS.minPromoProfit;
          }
        } else {
          return { success: false, error: promoResult.error };
        }
      }

      // 7. Final total
      const total = Math.max(0, subtotal - promoDiscount);

      return {
        success: true,
        breakdown: {
          productName: product.name,
          productSku: product.sku,
          basePrice: Math.round(basePrice),
          displayedNormalPrice: Math.round(displayedNormalPrice),
          sellingPrice: Math.round(sellingPrice),
          paymentMethod,
          paymentFee: Math.round(paymentFee),
          subtotal: Math.round(subtotal),
          promoCode: promoCode || null,
          promoDiscount: Math.round(promoDiscount),
          total: Math.round(total),
          _profit: actualProfit.toFixed(2) // Internal use only
        },
        promoDetails
      };

    } catch (error) {
      console.error('Price Calculation Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate payment fee
   */
  static calculatePaymentFee(amount, paymentMethod, gateway = 'duitku') {
    const fees = {
      'qris': { percentage: 0.7, fixed: 0 },
      'va_bca': { percentage: 0.7, fixed: 1000 },
      'va_mandiri': { percentage: 0.7, fixed: 1000 },
      'va_bni': { percentage: 0.7, fixed: 1000 },
      'va_bri': { percentage: 0.7, fixed: 1000 },
      'ovo': { percentage: 2.0, fixed: 0 },
      'shopeepay': { percentage: 2.0, fixed: 0 },
      'dana': { percentage: 2.0, fixed: 0 }
    };

    const fee = fees[paymentMethod] || { percentage: 0.7, fixed: 1000 };
    return (amount * fee.percentage / 100) + fee.fixed;
  }

  /**
   * Validate and calculate promo
   */
  static async validateAndCalculatePromo(params) {
    const { promoCode, subtotal, customerEmail } = params;

    try {
      const promoResult = await pool.query(
        'SELECT * FROM promo_codes WHERE code = $1 AND is_active = true',
        [promoCode]
      );

      if (promoResult.rows.length === 0) {
        return { valid: false, error: 'Promo code not found' };
      }

      const promo = promoResult.rows[0];

      // Check validity
      const now = new Date();
      if (promo.valid_until && new Date(promo.valid_until) < now) {
        return { valid: false, error: 'Promo code expired' };
      }

      if (promo.min_order_amount && subtotal < parseFloat(promo.min_order_amount)) {
        return { valid: false, error: `Minimum order Rp ${parseFloat(promo.min_order_amount).toLocaleString()}` };
      }

      // Check usage limits
      if (promo.max_usage_per_user && customerEmail) {
        const usageResult = await pool.query(
          'SELECT COUNT(*) FROM promo_code_usage WHERE promo_code_id = $1 AND user_email = $2',
          [promo.id, customerEmail]
        );

        if (parseInt(usageResult.rows[0].count) >= promo.max_usage_per_user) {
          return { valid: false, error: 'Promo already used' };
        }
      }

      // Calculate discount
      let discount = 0;
      if (promo.discount_type === 'percentage') {
        discount = subtotal * (parseFloat(promo.discount_value) / 100);
        if (promo.max_discount_amount) {
          discount = Math.min(discount, parseFloat(promo.max_discount_amount));
        }
      } else {
        discount = parseFloat(promo.discount_value);
      }

      discount = Math.min(discount, subtotal);

      return {
        valid: true,
        discount: Math.round(discount),
        details: {
          id: promo.id,
          code: promo.code,
          description: promo.description,
          discountType: promo.discount_type,
          discountValue: parseFloat(promo.discount_value),
          appliedDiscount: Math.round(discount)
        }
      };

    } catch (error) {
      console.error('Promo Validation Error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }
}

module.exports = PriceCalculator;
