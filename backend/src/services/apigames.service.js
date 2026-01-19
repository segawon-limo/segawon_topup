const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

class ApiGamesService {
  constructor() {
    this.merchantId = process.env.APIGAMES_MERCHANT_ID;
    this.secretKey = process.env.APIGAMES_SECRET_KEY;
    this.endpoint = process.env.APIGAMES_ENDPOINT || 'https://v1.apigames.id';
  }

  // Generate signature untuk ApiGames
  generateSignature(merchant, secret, ref_id) {
    const string = `${merchant}:${secret}:${ref_id}`;
    return crypto.createHash('md5').update(string).digest('hex');
  }

  // Cek Saldo
  async checkBalance() {
    try {
      const ref_id = `BAL${Date.now()}`;
      const signature = this.generateSignature(this.merchantId, this.secretKey, ref_id);

      const payload = {
        merchant_id: this.merchantId,
        secret: this.secretKey,
        signature: signature,
      };

      console.log('ApiGames Balance Request:', { merchant_id: this.merchantId, signature: '***' });

      const response = await axios.post(`${this.endpoint}/merchant`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      if (response.data.status === 'success' || response.data.status === 1) {
        return {
          success: true,
          data: {
            balance: response.data.data?.balance || 0,
            merchant: response.data.data?.merchant || this.merchantId,
          },
        };
      } else {
        return {
          success: false,
          message: response.data.error_msg || 'Failed to check balance',
        };
      }
    } catch (error) {
      console.error('Error checking balance:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.error_msg || 'Failed to check balance',
      };
    }
  }

  // Get Price List / Product List
  async getPriceList(gameCode = 'valorant') {
    try {
      const ref_id = `PRICE${Date.now()}`;
      const signature = this.generateSignature(this.merchantId, this.secretKey, ref_id);

      const payload = {
        merchant_id: this.merchantId,
        secret: this.secretKey,
        signature: signature,
      };

      const response = await axios.post(`${this.endpoint}/game/pricelist`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      if (response.data.status === 'success' || response.data.status === 1) {
        // Filter by game if needed
        let products = response.data.data || [];
        if (gameCode) {
          products = products.filter(p => 
            p.game?.toLowerCase().includes(gameCode.toLowerCase()) ||
            p.code?.toLowerCase().includes(gameCode.toLowerCase())
          );
        }

        return {
          success: true,
          data: products,
        };
      } else {
        return {
          success: false,
          message: response.data.error_msg || 'Failed to get price list',
        };
      }
    } catch (error) {
      console.error('Error getting price list:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.error_msg || 'Failed to get price list',
      };
    }
  }

  // Create Transaction / Order
  async createTransaction(orderData) {
    try {
      const ref_id = orderData.orderNumber;
      const signature = this.generateSignature(this.merchantId, this.secretKey, ref_id);

      // Format target untuk Valorant: RiotID|Tagline (tanpa #)
      const target = orderData.gameTag 
        ? `${orderData.userId}|${orderData.gameTag}`
        : orderData.userId;

      const payload = {
        merchant_id: this.merchantId,
        secret: this.secretKey,
        signature: signature,
        product: orderData.productCode, // Product code dari ApiGames
        destination: target, // Format: RiotID|Tagline
        ref_id: ref_id,
      };

      console.log('ApiGames Transaction Request:', { 
        ...payload, 
        secret: '***', 
        signature: '***',
      });

      const response = await axios.post(`${this.endpoint}/order`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      console.log('ApiGames Response:', response.data);

      if (response.data.status === 'success' || response.data.status === 1) {
        const data = response.data.data;

        return {
          success: true,
          data: {
            transactionId: data.trx_id || ref_id,
            status: data.status || 'success', // success, pending, failed
            message: data.message || response.data.error_msg || 'Transaction processed',
            serialNumber: data.serial_number || data.sn || null,
            price: data.price || 0,
            raw: data,
          },
        };
      } else {
        return {
          success: false,
          message: response.data.error_msg || 'Failed to create transaction',
          code: 'TRANSACTION_FAILED',
        };
      }
    } catch (error) {
      console.error('ApiGames Transaction Error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.error_msg || error.message || 'Failed to process transaction',
        code: 'API_ERROR',
      };
    }
  }

  // Check Transaction Status
  async checkTransactionStatus(refId) {
    try {
      const signature = this.generateSignature(this.merchantId, this.secretKey, refId);

      const payload = {
        merchant_id: this.merchantId,
        secret: this.secretKey,
        signature: signature,
        ref_id: refId,
      };

      const response = await axios.post(`${this.endpoint}/order/status`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      if (response.data.status === 'success' || response.data.status === 1) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          message: response.data.error_msg || 'Failed to check transaction status',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error_msg || 'Failed to check transaction status',
      };
    }
  }

  // Mapping product code untuk Valorant (sesuaikan dengan ApiGames)
  // Product code harus di-update dari price list ApiGames
  getValorantProductCode(nominalVP) {
    // Ini mapping sementara - harus dicek di ApiGames price list
    const productMap = {
      '475': 'VLR475VP', // Example - cek ApiGames dashboard
      '1000': 'VLR1000VP',
      '1475': 'VLR1475VP',
      '2050': 'VLR2050VP',
      '2525': 'VLR2525VP',
    };

    return productMap[nominalVP.toString()] || null;
  }
}

module.exports = new ApiGamesService();
