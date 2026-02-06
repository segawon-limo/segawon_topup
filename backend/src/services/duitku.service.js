/**
 * Duitku Payment Gateway Service - FULLY CORRECTED v2
 * Based on official documentation: https://docs.duitku.com/api/id/
 * 
 * ✅ CRITICAL FIXES:
 * 1. Get Payment Method uses SHA256 (not MD5!)
 * 2. All signatures use apiKey (not merchantKey!)
 * 3. Proper signature formulas for each endpoint
 * 4. Correct request/response handling
 */

const crypto = require('crypto');
const axios = require('axios');

class DuitkuService {
  constructor() {
    // Determine environment
    this.isSandbox = process.env.DUITKU_MODE === 'sandbox' || 
                     process.env.NODE_ENV === 'development';
    
    // Set credentials based on environment
    if (this.isSandbox) {
      this.merchantCode = process.env.DUITKU_SANDBOX_MERCHANT_CODE || 'DS27856';
      this.apiKey = process.env.DUITKU_SANDBOX_API_KEY || '87c3877e96d2bfcde05ff66638b57a13';
      this.baseUrl = 'https://sandbox.duitku.com/webapi/api/merchant';
    } else {
      this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
      this.apiKey = process.env.DUITKU_API_KEY;
      this.baseUrl = 'https://passport.duitku.com/webapi/api/merchant';
    }

    console.log(`✓ Duitku initialized (${this.isSandbox ? 'SANDBOX' : 'PRODUCTION'})`);
    console.log(`  Merchant Code: ${this.merchantCode}`);
  }

  /**
   * ✅ CORRECTED: SHA256 signature for Get Payment Method
   * Formula: SHA256(merchantCode + amount + datetime + apiKey)
   * 
   * IMPORTANT: Hanya endpoint Get Payment Method yang pakai SHA256!
   */
  generatePaymentMethodSignature(amount, datetime) {
    const string = `${this.merchantCode}${amount}${datetime}${this.apiKey}`;
    return crypto.createHash('sha256').update(string).digest('hex');
  }

  /**
   * ✅ CORRECTED: MD5 signature for transaction requests
   * Formula: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
   * 
   * IMPORTANT: Pakai apiKey, BUKAN merchantKey!
   */
  generateTransactionSignature(merchantOrderId, paymentAmount) {
    const string = `${this.merchantCode}${merchantOrderId}${paymentAmount}${this.apiKey}`;
    return crypto.createHash('md5').update(string).digest('hex');
  }

  /**
   * ✅ CORRECTED: MD5 signature for check status
   * Formula: MD5(merchantCode + merchantOrderId + apiKey)
   */
  generateStatusSignature(merchantOrderId) {
    const string = `${this.merchantCode}${merchantOrderId}${this.apiKey}`;
    return crypto.createHash('md5').update(string).digest('hex');
  }

  /**
   * ✅ CORRECTED: Get payment methods using POST with SHA256
   * Endpoint: POST /paymentmethod/getpaymentmethod
   * Signature: SHA256(merchantCode + amount + datetime + apiKey)
   */
  async getPaymentMethods(amount = 10000) {
    try {
      /*const datetime = new Date().getTime(); // Milliseconds timestamp*/
      const datetime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace('T', ' ');
      const signature = this.generatePaymentMethodSignature(amount, datetime);
      
      const payload = {
        merchantcode: this.merchantCode,  // lowercase!
        amount: amount,
        datetime: datetime,
        signature: signature
      };

      console.log('Get Payment Methods Request:', {
        url: `${this.baseUrl}/paymentmethod/getpaymentmethod`,
        merchantcode: payload.merchantcode,
        amount: payload.amount,
        datetime: payload.datetime,
        signatureAlgorithm: 'SHA256'
      });

      const response = await axios.post(
        `${this.baseUrl}/paymentmethod/getpaymentmethod`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.data && response.data.paymentFee) {
        return {
          success: true,
          paymentMethods: response.data.paymentFee
        };
      }

      return {
        success: false,
        error: 'No payment methods returned'
      };

    } catch (error) {
      console.error('Duitku Get Payment Methods Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.Message || error.message
      };
    }
  }

  /**
   * Create payment transaction
   * Endpoint: POST /v2/inquiry
   * Signature: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
   * 
   * @param {Object} orderData - Order information
   * @returns {Object} Payment URL and reference
   */
  async createTransaction(orderData) {
    try {
      const {
        merchantOrderId,     // Unique order ID (max 50 chars)
        paymentAmount,       // Amount in IDR (integer)
        productDetails,      // Product name/description (max 50 chars)
        email,               // Customer email
        customerVaName,      // Customer name for VA (max 20 chars)
        phoneNumber,         // Customer phone (max 50 chars)
        paymentMethod,       // Payment method code (e.g., 'BC' for BCA VA)
        callbackUrl,         // Webhook callback URL
        returnUrl,           // Return URL after payment
        expiryPeriod = 1440, // Expiry in minutes (default 24 hours)
        itemDetails = [],    // Required for Credit Card
        customerDetail = {}  // Required for Credit Card
      } = orderData;

      // ✅ Generate signature dengan apiKey (BUKAN merchantKey!)
      const signature = this.generateTransactionSignature(merchantOrderId, paymentAmount);

      // Prepare request payload
      const payload = {
        merchantCode: this.merchantCode,  // uppercase C!
        paymentAmount: parseInt(paymentAmount),
        paymentMethod: paymentMethod,
        merchantOrderId: merchantOrderId,
        productDetails: productDetails,
        email: email,
        customerVaName: customerVaName.substring(0, 20), // Max 20 chars
        phoneNumber: phoneNumber,
        callbackUrl: callbackUrl,
        returnUrl: returnUrl,
        signature: signature,
        expiryPeriod: expiryPeriod
      };

      // Add itemDetails for Credit Card
      if (itemDetails && itemDetails.length > 0) {
        payload.itemDetails = itemDetails;
      }

      // Add customerDetail for Credit Card
      if (customerDetail && Object.keys(customerDetail).length > 0) {
        payload.customerDetail = customerDetail;
      }

      console.log('Duitku Create Transaction Request:', {
        merchantCode: payload.merchantCode,
        merchantOrderId: payload.merchantOrderId,
        paymentAmount: payload.paymentAmount,
        paymentMethod: payload.paymentMethod,
        signatureAlgorithm: 'MD5'
      });

      // Make API request
      const response = await axios.post(
        `${this.baseUrl}/v2/inquiry`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Duitku Response:', response.data);

      // Check response
      if (response.data.statusCode === '00') {
        return {
          success: true,
          reference: response.data.reference,
          paymentUrl: response.data.paymentUrl,
          vaNumber: response.data.vaNumber, // For VA methods
          qrString: response.data.qrString,  // For QRIS
          amount: response.data.amount
        };
      } else {
        return {
          success: false,
          statusCode: response.data.statusCode,
          statusMessage: response.data.statusMessage
        };
      }

    } catch (error) {
      console.error('Duitku Create Transaction Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * ✅ CORRECTED: Verify callback signature from Duitku
   * Formula: MD5(merchantCode + amount + merchantOrderId + apiKey)
   * 
   * IMPORTANT: Pakai apiKey, BUKAN merchantKey!
   */
  verifyCallbackSignature(callbackData) {
    const {
      merchantCode,
      amount,
      merchantOrderId,
      signature
    } = callbackData;

    // ✅ Generate expected signature dengan apiKey
    const expectedSignature = crypto
      .createHash('md5')
      .update(`${merchantCode}${amount}${merchantOrderId}${this.apiKey}`)
      .digest('hex');

    const isValid = signature === expectedSignature;

    if (!isValid) {
      console.error('Signature Mismatch!', {
        received: signature,
        expected: expectedSignature,
        data: { merchantCode, amount, merchantOrderId }
      });
    }

    return isValid;
  }

  /**
   * Check transaction status
   * Endpoint: POST /transactionStatus
   * Signature: MD5(merchantCode + merchantOrderId + apiKey)
   */
  async checkTransactionStatus(merchantOrderId) {
    try {
      const signature = this.generateStatusSignature(merchantOrderId);

      const payload = {
        merchantCode: this.merchantCode,
        merchantOrderId: merchantOrderId,
        signature: signature
      };

      console.log('Check Transaction Status Request:', {
        merchantOrderId: merchantOrderId,
        signatureAlgorithm: 'MD5'
      });

      const response = await axios.post(
        `${this.baseUrl}/transactionStatus`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        statusCode: response.data.statusCode,
        statusMessage: response.data.statusMessage,
        amount: response.data.amount,
        reference: response.data.reference
      };

    } catch (error) {
      console.error('Check Status Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Map payment method to Duitku code
   */
  getPaymentMethodCode(method, channel = null) {
    const methodMap = {
      // Virtual Account
      'va_bca': 'BC',
      'va_mandiri': 'M2',
      'va_bni': 'I1',
      'va_bri': 'BR',
      'va_permata': 'BT',
      'va_cimb': 'B1',
      'va_danamon': 'DM',
      'va_bsi': 'BV',
      
      // QRIS
      'qris': 'SP',
      
      // E-Wallet
      'gopay': 'OV',
      'shopeepay': 'SA',
      'dana': 'DA',
      'linkaja': 'LF',
      'ovo': 'OV',
      
      // Retail
      'alfamart': 'FT',
      'indomaret': 'IR',
      
      // Credit Card
      'credit_card': 'CC'
    };

    // If specific channel provided
    if (channel) {
      return methodMap[`${method}_${channel}`] || methodMap[method] || 'BC';
    }

    return methodMap[method] || 'BC'; // Default to BCA VA
  }

  /**
   * Calculate total amount with Duitku fee
   * Note: Fee bisa berbeda-beda, sebaiknya pakai data dari getPaymentMethods()
   */
  calculateTotalWithFee(baseAmount, paymentMethodCode) {
    // Fee structure based on Duitku (approximate)
    // BETTER: Use actual fee from getPaymentMethods() response
    const feeStructure = {
      'BC': { percentage: 0.7, fixed: 1000 },  // BCA VA
      'M2': { percentage: 0.7, fixed: 1000 },  // Mandiri VA
      'I1': { percentage: 0.7, fixed: 1000 },  // BNI VA
      'BR': { percentage: 0.7, fixed: 1000 },  // BRI VA
      'BT': { percentage: 0.7, fixed: 0 },     // QRIS
      'OV': { percentage: 2.0, fixed: 0 },     // OVO/GoPay
      'SA': { percentage: 2.0, fixed: 0 },     // ShopeePay
      'DA': { percentage: 2.0, fixed: 0 }      // DANA
    };

    const fee = feeStructure[paymentMethodCode] || { percentage: 0.7, fixed: 1000 };
    const feeAmount = (baseAmount * fee.percentage / 100) + fee.fixed;
    
    return {
      baseAmount: baseAmount,
      feeAmount: Math.ceil(feeAmount),
      totalAmount: Math.ceil(baseAmount + feeAmount)
    };
  }

  /**
   * Helper: Build item details for Credit Card
   */
  buildItemDetails(items) {
    return items.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity || 1
    }));
  }

  /**
   * Helper: Build customer detail for Credit Card
   */
  buildCustomerDetail(customer) {
    const {
      firstName,
      lastName = '',
      email,
      phoneNumber,
      address = '',
      city = '',
      postalCode = '',
      countryCode = 'ID'
    } = customer;

    const billingAddress = {
      firstName,
      lastName,
      address,
      city,
      postalCode,
      phone: phoneNumber,
      countryCode
    };

    return {
      firstName,
      lastName,
      email,
      phoneNumber,
      billingAddress,
      shippingAddress: billingAddress
    };
  }
}

module.exports = new DuitkuService();
