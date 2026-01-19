// Payment Pricing Calculator Service
// Calculate prices based on payment method and gateway fees

class PaymentPricingCalculator {
  constructor() {
    // Fee structure for each payment method
    this.fees = {
      // QRIS (both gateways)
      qris: {
        type: 'percentage',
        value: 0.007, // 0.7%
        label: 'QRIS',
      },
      
      // E-wallets (Midtrans)
      gopay: {
        type: 'percentage',
        value: 0.02, // 2%
        label: 'GoPay',
      },
      shopeepay: {
        type: 'percentage',
        value: 0.02, // 2%
        label: 'ShopeePay',
      },
      
      // Virtual Accounts
      va_bca: {
        type: 'mixed',
        percentage: 0.007, // 0.7%
        flat: 1000, // + Rp 1.000
        label: 'BCA Virtual Account',
      },
      va_bni: {
        type: 'mixed',
        percentage: 0.007,
        flat: 1000,
        label: 'BNI Virtual Account',
      },
      va_mandiri: {
        type: 'mixed',
        percentage: 0.007,
        flat: 1000,
        label: 'Mandiri Virtual Account',
      },
      va_permata: {
        type: 'mixed',
        percentage: 0.007,
        flat: 1000,
        label: 'Permata Virtual Account',
      },
      va_bri: {
        type: 'mixed',
        percentage: 0.02, // BRI higher: 2%
        flat: 1000,
        label: 'BRI Virtual Account',
      },
      va_cimb: {
        type: 'mixed',
        percentage: 0.007,
        flat: 1000,
        label: 'CIMB Niaga Virtual Account',
      },
    };

    // Break-even point for gateway selection
    this.GATEWAY_BREAKEVEN = 428571; // Rp 428.571
  }

  /**
   * Calculate fee for a given price and payment method
   * @param {number} price - Selling price
   * @param {string} paymentMethod - Payment method code
   * @returns {number} - Calculated fee
   */
  calculateFee(price, paymentMethod) {
    const fee = this.fees[paymentMethod];
    
    if (!fee) {
      return 0;
    }

    if (fee.type === 'percentage') {
      return Math.round(price * fee.value);
    } else if (fee.type === 'mixed') {
      return Math.round(price * fee.percentage + fee.flat);
    }

    return 0;
  }

  /**
   * Get optimal payment gateway for amount
   * @param {number} amount - Transaction amount
   * @param {string} paymentMethod - Payment method
   * @returns {string} - 'midtrans' or 'xendit'
   */
  getOptimalGateway(amount, paymentMethod) {
    // E-wallets only work with Midtrans
    if (['gopay', 'dana', 'ovo', 'shopeepay', 'linkaja'].includes(paymentMethod)) {
      return 'midtrans';  // ✅ Works everywhere!
    }

    // For QRIS and VA, use break-even logic
    if (amount < this.GATEWAY_BREAKEVEN) {
      return 'midtrans'; // Cheaper for small amounts
    } else {
      return 'xendit'; // Cheaper for large amounts
    }
  }

  /**
   * Get payment method code from database column names
   * @param {string} paymentChannel - Channel like 'qris', 'va_bca', etc
   * @returns {string} - Payment method code
   */
  getPaymentMethodCode(paymentChannel) {
    return paymentChannel;
  }

  /**
   * Calculate net profit for given price
   * @param {number} sellingPrice - Customer pays
   * @param {number} basePrice - Provider cost
   * @param {string} paymentMethod - Payment method
   * @returns {Object} - Profit breakdown
   */
  calculateProfit(sellingPrice, basePrice, paymentMethod) {
    const fee = this.calculateFee(sellingPrice, paymentMethod);
    const netProfit = sellingPrice - basePrice - fee;
    const netProfitPercentage = (netProfit / sellingPrice) * 100;

    return {
      sellingPrice,
      basePrice,
      fee,
      netProfit,
      netProfitPercentage: netProfitPercentage.toFixed(2),
    };
  }

  /**
   * Get price comparison for different payment methods
   * @param {Object} product - Product from database
   * @returns {Object} - Price comparison
   */
  getPriceComparison(product) {
    return {
      qris: {
        price: product.selling_price_qris,
        fee: this.calculateFee(product.selling_price_qris, 'qris'),
        profit: this.calculateProfit(
          product.selling_price_qris,
          product.base_price,
          'qris'
        ),
        recommended: true,
      },
      va: {
        price: product.selling_price_va,
        fee: this.calculateFee(product.selling_price_va, 'va_bca'),
        profit: this.calculateProfit(
          product.selling_price_va,
          product.base_price,
          'va_bca'
        ),
      },
      ewallet: {
        price: product.selling_price_ewallet,
        fee: this.calculateFee(product.selling_price_ewallet, 'gopay'),
        profit: this.calculateProfit(
          product.selling_price_ewallet,
          product.base_price,
          'gopay'
        ),
      },
    };
  }

  /**
   * Get selling price based on payment method
   * @param {Object} product - Product from database
   * @param {string} paymentMethod - Payment method code
   * @returns {number} - Selling price
   */
  getSellingPrice(product, paymentMethod) {
    // Map payment method to product column
    if (paymentMethod === 'qris') {
      return product.selling_price_qris;
    } else if (paymentMethod.startsWith('va_')) {
      return product.selling_price_va;
    } else if (paymentMethod === 'gopay' || paymentMethod === 'shopeepay') {
      return product.selling_price_ewallet;
    }
    
    // Default to QRIS (cheapest)
    return product.selling_price_qris;
  }
}

module.exports = new PaymentPricingCalculator();
