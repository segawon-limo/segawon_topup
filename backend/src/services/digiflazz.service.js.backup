// backend/src/services/digiflazz.service.js
// FULLY CORRECTED VERSION - Based on Official Digiflazz Documentation

const axios = require('axios');
const crypto = require('crypto');

class DigiflazzService {
  constructor() {
    this.username = process.env.DIGIFLAZZ_USERNAME;
    
    // Use development or production key based on DIGIFLAZZ_MODE
    const isDevelopment = process.env.DIGIFLAZZ_MODE === 'development';
    this.apiKey = isDevelopment 
      ? process.env.DIGIFLAZZ_DEVELOPMENT_KEY 
      : process.env.DIGIFLAZZ_PRODUCTION_KEY;
    
    this.apiUrl = 'https://api.digiflazz.com/v1';
    
    // Debug log
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 Digiflazz Service Initialized:');
      console.log('   Username:', this.username || '❌ NOT SET');
      console.log('   Mode:', isDevelopment ? '🧪 DEVELOPMENT' : '🚀 PRODUCTION');
      console.log('   API Key:', this.apiKey ? '✅ ***' + this.apiKey.slice(-4) : '❌ NOT SET');
    }
  }

  /**
   * Generate MD5 signature
   * Different endpoints use different signature formats!
   */
  generateSignature(data) {
    const signature = crypto.createHash('md5').update(data).digest('hex');
    
    if (process.env.DIGIFLAZZ_DEBUG === 'true') {
      console.log('🔐 Signature Debug:');
      console.log('   Raw:', data);
      console.log('   MD5:', signature);
    }
    
    return signature;
  }

  /**
   * Get price list from Digiflazz
   * Signature: md5(username + apiKey + "pricelist")
   */
  async getPriceList() {
    try {
      // IMPORTANT: Price list uses fixed string "pricelist"!
      const signatureData = this.username + this.apiKey + "pricelist";
      const signature = this.generateSignature(signatureData);

      console.log('📋 Digiflazz: Getting price list...');

      const response = await axios.post(
        `${this.apiUrl}/price-list`,
        {
          cmd: 'prepaid',
          username: this.username,
          sign: signature,
          category: 'Games', // Example: filter by category
          // brand: 'Valorant', // Example: filter by brand
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      // Check if we got data
      if (response.data && response.data.data) {
        console.log(`✅ Got ${response.data.data.length} products from Digiflazz`);
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        console.error('❌ Digiflazz price list error:', response.data);
        return {
          success: false,
          message: 'Invalid response format',
          error: response.data,
        };
      }

    } catch (error) {
      console.error('❌ Error getting Digiflazz price list:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.data?.message || 'Failed to get price list',
        error: error.response?.data,
      };
    }
  }

  /**
   * Check balance
   * Signature: md5(username + apiKey + "depo")
   */
  async checkBalance() {
    try {
      // IMPORTANT: Cek saldo uses fixed string "depo"!
      const signatureData = this.username + this.apiKey + "depo";
      const signature = this.generateSignature(signatureData);

      console.log('💰 Digiflazz: Checking balance...');

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

      // Check response code
      if (response.data && response.data.data && response.data.data.rc === '00') {
        console.log('✅ Digiflazz balance:', response.data.data.deposit);
        return {
          success: true,
          balance: response.data.data.deposit,
          data: response.data.data,
        };
      } else {
        console.error('❌ Digiflazz balance error:', response.data);
        return {
          success: false,
          message: response.data.data?.message || 'Failed to check balance',
          error: response.data,
        };
      }

    } catch (error) {
      console.error('❌ Error checking Digiflazz balance:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.data?.message || 'Failed to check balance',
        error: error.response?.data,
      };
    }
  }

  /**
   * Create topup transaction
   * Signature: md5(username + apiKey + refId)
   */
  async createTransaction(orderData) {
    try {
      const refId = orderData.orderNumber;
      
      // For transaction: uses refId
      const signatureData = this.username + this.apiKey + refId;
      const signature = this.generateSignature(signatureData);

      console.log('🎮 Digiflazz: Creating transaction:', {
        sku: orderData.sku,
        customer_no: orderData.customerNo,
        ref_id: refId,
      });

      const requestBody = {
        username: this.username,
        buyer_sku_code: orderData.sku,
        customer_no: orderData.customerNo,
        ref_id: refId,
        sign: signature,
      };

      // Only add testing flag if explicitly true
      if (process.env.DIGIFLAZZ_TESTING === 'true') {
        requestBody.testing = true;
        console.log('⚠️  Testing mode enabled - transaction won\'t be real!');
      }

      const response = await axios.post(
        `${this.apiUrl}/transaction`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('📦 Digiflazz response:', {
        ref_id: response.data.data.ref_id,
        status: response.data.data.status,
        rc: response.data.data.rc,
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
        success: response.data.data.rc === '00',
        data: {
          ref_id: response.data.data.ref_id,
          customer_no: response.data.data.customer_no,
          buyer_sku_code: response.data.data.buyer_sku_code,
          message: response.data.data.message,
          status: response.data.data.status,
          order_status: orderStatus,
          rc: response.data.data.rc,
          sn: response.data.data.sn,
          balance: response.data.data.buyer_last_saldo,
          price: response.data.data.price,
        },
      };

    } catch (error) {
      console.error('❌ Error creating Digiflazz transaction:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.data?.message || 'Failed to create transaction',
        error: error.response?.data,
      };
    }
  }

  /**
   * Check transaction status
   * Signature: md5(username + apiKey + refId)
   */
  async checkTransactionStatus(refId) {
    try {
      const signatureData = this.username + this.apiKey + refId;
      const signature = this.generateSignature(signatureData);

      console.log('🔍 Digiflazz: Checking transaction status:', refId);

      const response = await axios.post(
        `${this.apiUrl}/transaction`,
        {
          username: this.username,
          buyer_sku_code: 'status',
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
        success: response.data.data.rc === '00',
        data: response.data.data,
      };

    } catch (error) {
      console.error('❌ Error checking transaction status:', error.response?.data || error.message);
      
      return {
        success: false,
        message: 'Failed to check transaction status',
      };
    }
  }

  /**
   * Handle webhook callback from Digiflazz
   * Signature: md5(username + apiKey + refId)
   */
  handleWebhook(webhookData) {
    try {
      console.log('🔔 Digiflazz webhook received:', {
        ref_id: webhookData.data?.ref_id,
        status: webhookData.data?.status,
      });

      // Verify signature
      const receivedSign = webhookData.sign || webhookData.data?.sign;
      const refId = webhookData.data?.ref_id || webhookData.ref_id;
      
      const signatureData = this.username + this.apiKey + refId;
      const calculatedSign = this.generateSignature(signatureData);

      if (receivedSign !== calculatedSign) {
        console.error('❌ Invalid webhook signature');
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
      console.error('❌ Error processing webhook:', error);
      
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
        const productName = (product.product_name || '').toLowerCase();
        const brand = (product.brand || '').toLowerCase();
        const searchTerm = gameCode.toLowerCase();
        
        return productName.includes(searchTerm) || brand.includes(searchTerm);
      });

      console.log(`🔍 Found ${filteredProducts.length} products for "${gameCode}"`);

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
