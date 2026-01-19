const axios = require('axios');

class MidtransService {
  constructor() {
    this.serverKey = process.env.MIDTRANS_SERVER_KEY;
    this.clientKey = process.env.MIDTRANS_CLIENT_KEY;
    this.isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    this.apiUrl = this.isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';
    
    if (!this.serverKey) {
      console.warn('WARNING: MIDTRANS_SERVER_KEY not configured in .env');
    } else {
      console.log('✓ Midtrans Server Key loaded');
    }
  }

  /**
   * Get authorization header (Base64 encoded server key)
   */
  getAuthHeader() {
    const auth = Buffer.from(`${this.serverKey}:`).toString('base64');
    return `Basic ${auth}`;
  }

  /**
   * Create Snap Transaction
   * FIXED: Accept complete transaction data from controller
   */
  async createTransaction(transactionData) {
    try {
      if (!this.serverKey) {
        return {
          success: false,
          message: 'Midtrans server key not configured',
          error: { code: 'NO_SERVER_KEY' }
        };
      }

      console.log('Midtrans Service: Creating transaction');

      // Use transactionData directly - don't rebuild!
      const response = await axios.post(
        `${this.apiUrl}/v2/charge`,
        transactionData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': this.getAuthHeader(),
          },
          timeout: 30000,
        }
      );

      console.log('✓ Midtrans transaction created:', {
        order_id: response.data.order_id,
        transaction_status: response.data.transaction_status,
        payment_type: response.data.payment_type,
        va_numbers: response.data.va_numbers,      // Debug
        bill_key: response.data.bill_key,          // Debug
        biller_code: response.data.biller_code,    // Debug
        permata_va_number: response.data.permata_va_number,  // Debug
      });

      console.log('Full Midtrans response:', JSON.stringify(response.data, null, 2));  // See everything!

      // Get redirect URL based on payment type
      let redirectUrl = '';

      if (response.data.redirect_url) {
        redirectUrl = response.data.redirect_url;
      } else if (response.data.actions && response.data.actions.length > 0) {
        const redirectAction = response.data.actions.find(a => a.name === 'deeplink-redirect' || a.name === 'generate-qr-code');
        if (redirectAction) {
          redirectUrl = redirectAction.url;
        }
      }

      return {
        success: true,
        data: {
          transactionId: response.data.transaction_id,
          orderId: response.data.order_id,
          redirectUrl: redirectUrl,
          token: response.data.redirect_url || redirectUrl,
          paymentType: response.data.payment_type,
          transactionStatus: response.data.transaction_status,
          qrString: response.data.qr_string,
          
          // ALL VA formats
          vaNumbers: response.data.va_numbers,              // BCA, BNI, BRI, CIMB
          billKey: response.data.bill_key,                  // Mandiri
          billerCode: response.data.biller_code,            // Mandiri
          permataVaNumber: response.data.permata_va_number, // Permata
          
          actions: response.data.actions,
        },
      };

    } catch (error) {
      console.error('✗ Error creating Midtrans transaction:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.error_messages?.[0] || 'Failed to create Midtrans transaction',
        error: error.response?.data || { message: error.message },
      };
    }
  }

  /**
   * Create Snap Token (for pop-up payment)
   */
  async createSnapToken(transactionData) {
    try {
      if (!this.serverKey) {
        return {
          success: false,
          message: 'Midtrans server key not configured',
        };
      }

      const response = await axios.post(
        `${this.apiUrl}/snap/v1/transactions`,
        transactionData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': this.getAuthHeader(),
          },
          timeout: 30000,
        }
      );

      return {
        success: true,
        data: {
          token: response.data.token,
          redirectUrl: response.data.redirect_url,
        },
      };

    } catch (error) {
      console.error('Error creating Snap token:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.error_messages?.[0] || 'Failed to create Snap token',
        error: error.response?.data,
      };
    }
  }

  /**
   * Check Transaction Status
   */
  async checkStatus(orderId) {
    try {
      if (!this.serverKey) {
        return {
          success: false,
          message: 'Midtrans server key not configured',
        };
      }

      const response = await axios.get(
        `${this.apiUrl}/v2/${orderId}/status`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': this.getAuthHeader(),
          },
          timeout: 30000,
        }
      );

      return {
        success: true,
        data: {
          transactionStatus: response.data.transaction_status,
          fraudStatus: response.data.fraud_status,
          statusCode: response.data.status_code,
          grossAmount: response.data.gross_amount,
          paymentType: response.data.payment_type,
          transactionTime: response.data.transaction_time,
        },
      };

    } catch (error) {
      console.error('Error checking transaction status:', error.response?.data || error.message);
      
      return {
        success: false,
        message: 'Failed to check transaction status',
        error: error.response?.data,
      };
    }
  }

  /**
   * Cancel Transaction
   */
  async cancelTransaction(orderId) {
    try {
      if (!this.serverKey) {
        return {
          success: false,
          message: 'Midtrans server key not configured',
        };
      }

      const response = await axios.post(
        `${this.apiUrl}/v2/${orderId}/cancel`,
        {},
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': this.getAuthHeader(),
          },
          timeout: 30000,
        }
      );

      return {
        success: true,
        data: response.data,
      };

    } catch (error) {
      console.error('Error canceling transaction:', error.response?.data || error.message);
      
      return {
        success: false,
        message: 'Failed to cancel transaction',
      };
    }
  }

  /**
   * Handle Webhook from Midtrans
   */
  handleWebhook(webhookData) {
    try {
      const {
        transaction_status,
        fraud_status,
        order_id,
        gross_amount,
        payment_type,
      } = webhookData;

      console.log('Received Midtrans webhook:', JSON.stringify(webhookData, null, 2));

      // Map Midtrans status to internal status
      let paymentStatus = 'pending';
      let orderStatus = 'pending';

      if (transaction_status === 'capture') {
        if (fraud_status === 'accept') {
          paymentStatus = 'success';
          orderStatus = 'processing';
        } else if (fraud_status === 'challenge') {
          paymentStatus = 'pending';
          orderStatus = 'pending';
        }
      } else if (transaction_status === 'settlement') {
        paymentStatus = 'success';
        orderStatus = 'processing';
      } else if (transaction_status === 'pending') {
        paymentStatus = 'pending';
        orderStatus = 'pending';
      } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
        paymentStatus = 'failed';
        orderStatus = 'failed';
      }

      return {
        success: true,
        data: {
          orderId: order_id,
          paymentStatus,
          orderStatus,
          amount: gross_amount,
          paymentType: payment_type,
          transactionStatus: transaction_status,
          fraudStatus: fraud_status,
          raw: webhookData,
        },
      };

    } catch (error) {
      console.error('Error handling Midtrans webhook:', error);
      return {
        success: false,
        message: error.message || 'Failed to process webhook',
      };
    }
  }
}

module.exports = new MidtransService();
