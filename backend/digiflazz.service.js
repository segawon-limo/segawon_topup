// backend/src/services/digiflazz.service.js
const axios = require('axios');
const crypto = require('crypto');

class DigiflazzService {
  constructor() {
    this.username = process.env.DIGIFLAZZ_USERNAME;
    this.apiKey = process.env.DIGIFLAZZ_PRODUCTION_KEY; // or DEVELOPMENT_KEY
    this.apiUrl = 'https://api.digiflazz.com/v1';
  }

  /**
   * Generate MD5 signature for authentication
   */
  generateSignature(refId) {
    // Sign = md5(username + apiKey + refId)
    const data = this.username + this.apiKey + refId;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Get price list from Digiflazz
   */
  async getPriceList() {
    try {
      const refId = 'pricelist-' + Date.now();
      const signature = this.generateSignature(refId);

      console.log('Digiflazz Service: Getting price list');

      const response = await axios.post(
        `${this.apiUrl}/price-list`,
        {
          cmd: 'prepaid',
          username: this.username,
          sign: signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log(`✓ Got ${response.data.data.length} products from Digiflazz`);

      return {
        success: true,
        data: response.data.data,
      };

    } catch (error) {
      console.error('✗ Error getting Digiflazz price list:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get price list',
        error: error.response?.data,
      };
    }
  }

  /**
   * Check balance
   */
  async checkBalance() {
    try {
      const refId = 'balance-' + Date.now();
      const signature = this.generateSignature(refId);

      console.log('Digiflazz Service: Checking balance');

      const response = await axios.post(
        `${this.apiUrl}/cek-saldo`,
        {
          cmd: 'deposit',
          username: this.username,
          sign: signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('✓ Digiflazz balance:', response.data.data.deposit);

      return {
        success: true,
        balance: response.data.data.deposit,
      };

    } catch (error) {
      console.error('✗ Error checking Digiflazz balance:', error.response?.data || error.message);
      
      return {
        success: false,
        message: 'Failed to check balance',
      };
    }
  }

  /**
   * Create topup transaction (Valorant, Mobile Legends, etc)
   */
  async createTransaction(orderData) {
    try {
      const refId = orderData.orderNumber;
      const signature = this.generateSignature(refId);

      console.log('Digiflazz Service: Creating transaction:', {
        sku: orderData.sku,
        customer_no: orderData.customerNo,
        ref_id: refId,
      });

      const response = await axios.post(
        `${this.apiUrl}/transaction`,
        {
          username: this.username,
          buyer_sku_code: orderData.sku,
          customer_no: orderData.customerNo,
          ref_id: refId,
          sign: signature,
          testing: process.env.DIGIFLAZZ_TESTING === 'true', // For sandbox testing
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('✓ Digiflazz transaction created:', {
        ref_id: response.data.data.ref_id,
        status: response.data.data.status,
        message: response.data.data.message,
      });

      // Map status
      let orderStatus = 'pending';
      if (response.data.data.status === 'Sukses') {
        orderStatus = 'completed';
      } else if (response.data.data.status === 'Gagal') {
        orderStatus = 'failed';
      } else if (response.data.data.status === 'Pending') {
        orderStatus = 'processing';
      }

      return {
        success: true,
        data: {
          ref_id: response.data.data.ref_id,
          customer_no: response.data.data.customer_no,
          buyer_sku_code: response.data.data.buyer_sku_code,
          message: response.data.data.message,
          status: response.data.data.status,
          order_status: orderStatus,
          rc: response.data.data.rc,
          sn: response.data.data.sn, // Serial number (for successful transactions)
          balance: response.data.data.buyer_last_saldo,
          price: response.data.data.price,
        },
      };

    } catch (error) {
      console.error('✗ Error creating Digiflazz transaction:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.data?.message || 'Failed to create transaction',
        error: error.response?.data,
      };
    }
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(refId) {
    try {
      const signature = this.generateSignature(refId);

      console.log('Digiflazz Service: Checking transaction status:', refId);

      // Recheck by making transaction request with same ref_id
      const response = await axios.post(
        `${this.apiUrl}/transaction`,
        {
          username: this.username,
          buyer_sku_code: 'status', // Special SKU for status check
          ref_id: refId,
          sign: signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return {
        success: true,
        data: response.data.data,
      };

    } catch (error) {
      console.error('✗ Error checking transaction status:', error.response?.data || error.message);
      
      return {
        success: false,
        message: 'Failed to check transaction status',
      };
    }
  }

  /**
   * Handle webhook callback from Digiflazz
   */
  handleWebhook(webhookData) {
    try {
      console.log('Digiflazz webhook received:', {
        ref_id: webhookData.data?.ref_id,
        status: webhookData.data?.status,
      });

      // Verify signature
      const receivedSign = webhookData.sign || webhookData.data?.sign;
      const refId = webhookData.data?.ref_id || webhookData.ref_id;
      const calculatedSign = this.generateSignature(refId);

      if (receivedSign !== calculatedSign) {
        console.error('✗ Invalid webhook signature');
        return {
          success: false,
          message: 'Invalid signature',
        };
      }

      // Extract data
      const data = webhookData.data || webhookData;

      // Map status
      let paymentStatus = 'pending';
      let orderStatus = 'pending';

      if (data.status === 'Sukses') {
        paymentStatus = 'success';
        orderStatus = 'completed';
      } else if (data.status === 'Gagal') {
        paymentStatus = 'failed';
        orderStatus = 'failed';
      } else if (data.status === 'Pending') {
        paymentStatus = 'pending';
        orderStatus = 'processing';
      }

      return {
        success: true,
        orderNumber: data.ref_id,
        paymentStatus,
        orderStatus,
        serialNumber: data.sn,
        message: data.message,
        balance: data.buyer_last_saldo,
        price: data.price,
      };

    } catch (error) {
      console.error('✗ Error processing webhook:', error);
      
      return {
        success: false,
        message: 'Webhook processing failed',
      };
    }
  }

  /**
   * Get products by game/category
   */
  async getProductsByGame(gameCode) {
    try {
      const priceList = await this.getPriceList();
      
      if (!priceList.success) {
        return priceList;
      }

      // Filter products by game
      const filteredProducts = priceList.data.filter(product => {
        return product.brand.toLowerCase().includes(gameCode.toLowerCase()) ||
               product.product_name.toLowerCase().includes(gameCode.toLowerCase());
      });

      return {
        success: true,
        data: filteredProducts,
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to get products by game',
      };
    }
  }

  /**
   * Search product by SKU
   */
  async getProductBySKU(sku) {
    try {
      const priceList = await this.getPriceList();
      
      if (!priceList.success) {
        return priceList;
      }

      const product = priceList.data.find(p => p.buyer_sku_code === sku);

      if (!product) {
        return {
          success: false,
          message: 'Product not found',
        };
      }

      return {
        success: true,
        data: product,
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to get product',
      };
    }
  }
}

module.exports = new DigiflazzService();
