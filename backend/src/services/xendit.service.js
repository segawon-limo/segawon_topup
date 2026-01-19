const axios = require('axios');

class XenditService {
  constructor() {
    this.secretKey = process.env.XENDIT_SECRET_KEY;
    this.publicKey = process.env.XENDIT_PUBLIC_KEY;
    this.isProduction = process.env.XENDIT_IS_PRODUCTION === 'true';
    this.apiUrl = 'https://api.xendit.co';
    
    if (!this.secretKey) {
      console.warn('WARNING: XENDIT_SECRET_KEY not configured in .env');
    } else {
      console.log('✓ Xendit Secret Key loaded');
    }
  }

  /**
   * Get authorization header (Base64 encoded secret key)
   */
  getAuthHeader() {
    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    return `Basic ${auth}`;
  }

  /**
   * Create Virtual Account (Direct API - Custom UI)
   * Returns VA number directly - no redirect!
   */
  async createVirtualAccount(orderData) {
    try {
      if (!this.secretKey) {
        return {
          success: false,
          message: 'Xendit secret key not configured',
        };
      }

      console.log('Xendit Service: Creating Virtual Account:', {
        bank: orderData.bankCode,
        amount: orderData.amount,
      });

      const response = await axios.post(
        `${this.apiUrl}/callback_virtual_accounts`,
        {
          external_id: orderData.orderNumber,
          bank_code: orderData.bankCode,  // BCA, BNI, BRI, MANDIRI, PERMATA
          name: orderData.customerName || 'Customer',
          expected_amount: orderData.amount,
          is_closed: true,  // Exact amount
          expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('✓ Xendit VA created:', {
        bank: response.data.bank_code,
        va_number: response.data.account_number,
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          external_id: response.data.external_id,
          bank_code: response.data.bank_code,
          account_number: response.data.account_number,  // VA number!
          name: response.data.name,
          expected_amount: response.data.expected_amount,
          expiration_date: response.data.expiration_date,
          status: response.data.status,
          // Format for compatibility with frontend
          vaNumbers: [
            {
              bank: response.data.bank_code.toLowerCase(),
              va_number: response.data.account_number,
            }
          ],
        },
      };

    } catch (error) {
      console.error('✗ Error creating Xendit VA:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create virtual account',
        error: error.response?.data,
      };
    }
  }

  /**
   * Create QRIS Payment (Direct API - Custom UI)
   * Returns QR string directly - no redirect!
   */
  async createQRIS(orderData) {
    try {
      if (!this.secretKey) {
        return {
          success: false,
          message: 'Xendit secret key not configured',
        };
      }

      console.log('Xendit Service: Creating QRIS:', {
        amount: orderData.amount,
      });

      // Determine callback_url
      const backendUrl = process.env.BACKEND_URL;
      let callbackUrl;
      
      if (backendUrl && (backendUrl.startsWith('http://') || backendUrl.startsWith('https://'))) {
        // Production: Use real backend URL
        callbackUrl = `${backendUrl}/api/payment/callback`;
        console.log('Using callback URL:', callbackUrl);
      } else {
        // Development: Use dummy URL (Xendit requires it, but won't actually send webhooks)
        callbackUrl = 'https://example.com/webhook';
        console.log('⚠️  Using dummy callback URL (development mode)');
        console.log('Webhook notifications will not work in development');
      }

      const requestData = {
        external_id: orderData.orderNumber,
        type: 'DYNAMIC',
        callback_url: callbackUrl,  // Always include (required by Xendit)
        amount: orderData.amount,
      };

      const response = await axios.post(
        `${this.apiUrl}/qr_codes`,
        requestData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('✓ Xendit QRIS created:', {
        id: response.data.id,
        status: response.data.status,
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          external_id: response.data.external_id,
          qr_string: response.data.qr_string,  // QR code data!
          qrString: response.data.qr_string,   // camelCase for compatibility
          amount: response.data.amount,
          status: response.data.status,
          created: response.data.created,
          updated: response.data.updated,
        },
      };

    } catch (error) {
      console.error('✗ Error creating Xendit QRIS:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create QRIS',
        error: error.response?.data,
      };
    }
  }

  /**
   * Create E-Wallet Payment (OVO, DANA, LinkAja)
   * Returns payment link or QR code
   */
  async createEWallet(orderData) {
    try {
      if (!this.secretKey) {
        return {
          success: false,
          message: 'Xendit secret key not configured',
        };
      }

      console.log('Xendit Service: Creating E-Wallet:', {
        type: orderData.ewalletType,
        amount: orderData.amount,
      });

      // Map e-wallet type to Xendit channel code
      const channelCodeMap = {
        'DANA': 'ID_DANA',
        'OVO': 'ID_OVO',
        'SHOPEEPAY': 'ID_SHOPEEPAY',
        'LINKAJA': 'ID_LINKAJA',
      };

      const channelCode = channelCodeMap[orderData.ewalletType];
      
      if (!channelCode) {
        return {
          success: false,
          message: `Unsupported e-wallet type: ${orderData.ewalletType}. Supported: DANA, OVO, SHOPEEPAY, LINKAJA`,
        };
      }

      console.log('Using channel code:', channelCode);

      // Determine return URLs (like callback for QRIS)
      const backendUrl = process.env.BACKEND_URL;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      let successReturnUrl;
      let failureReturnUrl;
      let callbackUrl;
      
      if (backendUrl && (backendUrl.startsWith('http://') || backendUrl.startsWith('https://'))) {
        // Production: Use real URLs
        successReturnUrl = `${frontendUrl}/order/success?order_id=${orderData.orderNumber}`;
        failureReturnUrl = `${frontendUrl}/order/failed?order_id=${orderData.orderNumber}`;
        callbackUrl = `${backendUrl}/api/payment/callback`;
        console.log('Using real callback URL:', callbackUrl);
      } else {
        // Development: Use dummy URL (same trick as QRIS!)
        successReturnUrl = `${frontendUrl}/order/success?order_id=${orderData.orderNumber}`;
        failureReturnUrl = `${frontendUrl}/order/failed?order_id=${orderData.orderNumber}`;
        callbackUrl = 'https://example.com/webhook';  // Dummy but valid!
        console.log('⚠️  Using dummy callback URL (development mode)');
        console.log('Webhook notifications will not work in development');
      }

      const response = await axios.post(
        `${this.apiUrl}/ewallets/charges`,
        {
          reference_id: orderData.orderNumber,
          currency: 'IDR',
          amount: orderData.amount,
          checkout_method: 'ONE_TIME_PAYMENT',
          channel_code: channelCode,
          channel_properties: {
            success_return_url: successReturnUrl,
            failure_return_url: failureReturnUrl,
            mobile_number: orderData.customerPhone,
          },
          metadata: {
            order_id: orderData.orderNumber,
          },
        },
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'x-callback-url': callbackUrl,  // Try adding callback as header!
          },
          timeout: 30000,
        }
      );

      console.log('✓ Xendit E-Wallet created:', {
        type: response.data.channel_code,
        status: response.data.status,
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          reference_id: response.data.reference_id,
          channel_code: response.data.channel_code,
          actions: response.data.actions,
          status: response.data.status,
          // Extract redirect URL or QR from actions
          redirectUrl: response.data.actions?.mobile_web_checkout_url || 
                      response.data.actions?.mobile_deeplink_checkout_url ||
                      response.data.actions?.desktop_web_checkout_url,
        },
      };

    } catch (error) {
      console.error('✗ Error creating Xendit E-Wallet:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create e-wallet payment',
        error: error.response?.data,
      };
    }
  }

  /**
   * OLD METHOD - Create Invoice (Redirect to Xendit page)
   * Keep for backward compatibility but not recommended
   */
  async createInvoice(invoiceData) {
    try {
      if (!this.secretKey) {
        return {
          success: false,
          message: 'Xendit secret key not configured',
        };
      }

      console.log('Xendit Service: Creating Invoice (Legacy method)');

      const response = await axios.post(
        `${this.apiUrl}/v2/invoices`,
        invoiceData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('✓ Xendit invoice created:', response.data.id);

      return {
        success: true,
        data: {
          id: response.data.id,
          external_id: response.data.external_id,
          invoice_url: response.data.invoice_url,
          redirectUrl: response.data.invoice_url,
          expiry_date: response.data.expiry_date,
          status: response.data.status,
        },
      };

    } catch (error) {
      console.error('✗ Error creating Xendit invoice:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create invoice',
        error: error.response?.data,
      };
    }
  }

  /**
   * Check Payment Status
   */
  async checkPaymentStatus(paymentId, type = 'invoice') {
    try {
      if (!this.secretKey) {
        return {
          success: false,
          message: 'Xendit secret key not configured',
        };
      }

      let url;
      if (type === 'invoice') {
        url = `${this.apiUrl}/v2/invoices/${paymentId}`;
      } else if (type === 'va') {
        url = `${this.apiUrl}/callback_virtual_accounts/${paymentId}`;
      } else if (type === 'qris') {
        url = `${this.apiUrl}/qr_codes/${paymentId}`;
      } else if (type === 'ewallet') {
        url = `${this.apiUrl}/ewallets/charges/${paymentId}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': this.getAuthHeader(),
        },
        timeout: 30000,
      });

      return {
        success: true,
        data: response.data,
      };

    } catch (error) {
      console.error('Error checking Xendit status:', error.response?.data || error.message);
      
      return {
        success: false,
        message: 'Failed to check payment status',
        error: error.response?.data,
      };
    }
  }

  /**
   * Handle Webhook from Xendit
   */
  handleWebhook(webhookData, webhookType) {
    try {
      console.log('Received Xendit webhook:', webhookType, JSON.stringify(webhookData, null, 2));

      let paymentStatus = 'pending';
      let orderStatus = 'pending';
      let orderId = null;

      if (webhookType === 'invoice') {
        orderId = webhookData.external_id;
        
        if (webhookData.status === 'PAID' || webhookData.status === 'SETTLED') {
          paymentStatus = 'success';
          orderStatus = 'processing';
        } else if (webhookData.status === 'EXPIRED') {
          paymentStatus = 'failed';
          orderStatus = 'failed';
        }
      } else if (webhookType === 'va') {
        orderId = webhookData.external_id;
        
        if (webhookData.payment_id) {
          paymentStatus = 'success';
          orderStatus = 'processing';
        }
      } else if (webhookType === 'qris') {
        orderId = webhookData.external_id;
        
        if (webhookData.status === 'COMPLETED') {
          paymentStatus = 'success';
          orderStatus = 'processing';
        }
      } else if (webhookType === 'ewallet') {
        orderId = webhookData.reference_id;
        
        if (webhookData.status === 'SUCCEEDED') {
          paymentStatus = 'success';
          orderStatus = 'processing';
        } else if (webhookData.status === 'FAILED') {
          paymentStatus = 'failed';
          orderStatus = 'failed';
        }
      }

      return {
        success: true,
        data: {
          orderId,
          paymentStatus,
          orderStatus,
          amount: webhookData.amount || webhookData.expected_amount,
          raw: webhookData,
        },
      };

    } catch (error) {
      console.error('Error handling Xendit webhook:', error);
      return {
        success: false,
        message: error.message || 'Failed to process webhook',
      };
    }
  }
}

module.exports = new XenditService();
