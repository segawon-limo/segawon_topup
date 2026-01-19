const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');
require('dotenv').config();

class VipResellerService {
  constructor() {
    this.apiId = process.env.VIPRESELLER_API_ID;
    this.apiKey = process.env.VIPRESELLER_API_KEY;
    this.endpoint = process.env.VIPRESELLER_ENDPOINT || 'https://vip-reseller.co.id/api';
  }

  // Generate signature: md5(API_ID + API_KEY)
  generateSignature() {
    const string = this.apiId + this.apiKey;
    return crypto.createHash('md5').update(string).digest('hex');
  }

  // Cek Profile/Balance - WORKING VERSION!
  async checkBalance() {
    try {
      const signature = this.generateSignature();

      // CRITICAL: Use URLSearchParams for form-urlencoded
      const params = new URLSearchParams();
      params.append('key', this.apiKey);
      params.append('sign', signature);

      console.log('VIP Reseller Profile Request (form-urlencoded)');

      const response = await axios.post(`${this.endpoint}/profile`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      });

      console.log('VIP Reseller Response:', response.data);

      if (response.data.result === true) {
        return {
          success: true,
          data: {
            balance: response.data.data.balance || 0,
            username: response.data.data.username,
            fullName: response.data.data.full_name,
            level: response.data.data.level,
            point: response.data.data.point || 0,
          },
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to check balance',
        };
      }
    } catch (error) {
      console.error('Error checking balance:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check balance',
      };
    }
  }

  // Get Price List - with type=services
  async getPriceList(filter = {}) {
    try {
      const signature = this.generateSignature();

      const params = new URLSearchParams();
      params.append('key', this.apiKey);
      params.append('sign', signature);
      params.append('type', 'services'); // REQUIRED untuk get price list

      // Add filters if provided
      if (filter.game) {
        params.append('filter_game', filter.game); // e.g. "Valorant", "Mobile Legends"
      }
      if (filter.status) {
        params.append('filter_status', filter.status); // "available" or "empty"
      }

      console.log('VIP Reseller Price List Request:', {
        type: 'services',
        filter_game: filter.game || 'all',
        filter_status: filter.status || 'all',
      });

      const response = await axios.post(`${this.endpoint}/game-feature`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      });

      console.log('VIP Reseller Response:', response.data);

      if (response.data.result === true) {
        return {
          success: true,
          data: response.data.data || [],
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to get price list',
        };
      }
    } catch (error) {
      console.error('Error getting price list:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get price list',
      };
    }
  }

  // Create Transaction
  async createTransaction(orderData) {
    try {
      const signature = this.generateSignature();

      const params = new URLSearchParams();
      params.append('key', this.apiKey);
      params.append('sign', signature);
      params.append('type', 'order');
      params.append('service', orderData.productCode); // Product code/SKU
      params.append('data_no', orderData.userId); // User ID (RiotID for Valorant)
      
      // For games with zone (like Valorant: tagline)
      if (orderData.gameTag) {
        params.append('data_zone', orderData.gameTag);
      }

      console.log('VIP Reseller Transaction Request:', {
        type: 'order',
        service: orderData.productCode,
        data_no: orderData.userId,
        data_zone: orderData.gameTag || '',
      });

      const response = await axios.post(`${this.endpoint}/game-feature`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      });

      console.log('VIP Reseller Response:', response.data);

      if (response.data.result === true) {
        const data = response.data.data;

        return {
          success: true,
          data: {
            transactionId: data.trx_id || data.id,
            status: data.status, // success, pending, failed
            message: data.message || response.data.message,
            serialNumber: data.sn || null,
            price: data.price || 0,
            raw: data,
          },
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to create transaction',
          code: 'TRANSACTION_FAILED',
        };
      }
    } catch (error) {
      console.error('VIP Reseller Transaction Error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to process transaction',
        code: 'API_ERROR',
      };
    }
  }

  // Check Transaction Status
  async checkTransactionStatus(transactionId) {
    try {
      const signature = this.generateSignature();

      const params = new URLSearchParams();
      params.append('key', this.apiKey);
      params.append('sign', signature);
      params.append('type', 'status');
      params.append('trx_id', transactionId);

      const response = await axios.post(`${this.endpoint}/game-feature`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      });

      if (response.data.result === true) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to check transaction status',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check transaction status',
      };
    }
  }
}

module.exports = new VipResellerService();
