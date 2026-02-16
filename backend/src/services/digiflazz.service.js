// backend/src/services/digiflazz.service.js
// FULLY CORRECTED VERSION - Based on Official Digiflazz Documentation

const axios = require('axios');
const crypto = require('crypto');

// Helper: parse SN dari PLNCEK
// Format 1: "IDPEL:45107107679@NAMA :PT. PERMAI ABADI SENTOSA R1/2200"  (spasi sebelum tarif)
// Format 2: "IDPEL:12345678@NAMA :BUDI SANTOSO/R1/900"                  (slash sebelum tarif)
function parsePlnCekSn(sn) {
  if (!sn) return {};

  // IDPEL: hanya angka
  const idpelMatch = sn.match(/IDPEL[:\s]*(\d+)/i);
  const idpel = idpelMatch ? idpelMatch[1] : null;

  let nama = null, tarif = null, daya = null;
  const namaTarifMatch = sn.match(/NAMA\s*:\s*(.+)/i);
  if (namaTarifMatch) {
    const rest = namaTarifMatch[1].trim();
    // Format slash: NAMA/TARIF/DAYA
    const slashM = rest.match(/^(.+?)\/([A-Z]\d+)\/(\d+)\s*$/);
    if (slashM) {
      nama  = slashM[1].trim();
      tarif = slashM[2];
      daya  = slashM[3] + ' VA';
    } else {
      // Format spasi: NAMA TARIF/DAYA
      const spaceM = rest.match(/^(.+?)\s+([A-Z]\d+)\/(\d+)\s*$/);
      if (spaceM) {
        nama  = spaceM[1].trim();
        tarif = spaceM[2];
        daya  = spaceM[3] + ' VA';
      } else {
        nama = rest;
      }
    }
  }

  return { idpel, nama, tarif, daya };
}

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

      // Response cek saldo Digiflazz tidak punya field rc —
      // sukses kalau field deposit ada dan tidak null
      const deposit = response.data?.data?.deposit;
      if (response.data?.data && deposit !== undefined && deposit !== null) {
        console.log('✅ Digiflazz balance:', deposit);
        return {
          success: true,
          balance: deposit,
          data: response.data.data,
        };
      } else {
        console.error('❌ Digiflazz balance error:', response.data);
        return {
          success: false,
          message: response.data?.data?.message || 'Failed to check balance',
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

      // rc:00 = Sukses, rc:03 = Pending (normal, tunggu webhook), selain itu = Gagal
      const rc = response.data.data.rc;
      const isSuccess = rc === '00' || rc === '03'; // Pending juga dianggap sukses (webhook menyusul)
      const isFailed  = !isSuccess;

      return {
        success: isSuccess,
        isPending: rc === '03',
        data: {
          ref_id: response.data.data.ref_id,
          customer_no: response.data.data.customer_no,
          buyer_sku_code: response.data.data.buyer_sku_code,
          message: response.data.data.message,
          status: response.data.data.status,
          order_status: orderStatus,
          rc: rc,
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
   * Cek Nomor Meter / ID Pelanggan PLN
   * Flow: buat transaksi PLNCEK ke Digiflazz (async)
   *       → Digiflazz kirim webhook → kita parse & simpan ke pln_meter_checks
   *       → frontend polling /api/check-pln-meter/:refId sampai status = success
   */
  async checkPlnMeter(nomorMeter) {
    try {
      const refId = `CEK-${Date.now()}`;
      const signatureData = this.username + this.apiKey + refId;
      const signature = this.generateSignature(signatureData);

      console.log(`🔍 PLN Cek Meter: ${nomorMeter} (ref: ${refId})`);

      // Simpan ke DB dulu dengan status pending
      const { pool } = require('../config/database');
      await pool.query(
        `INSERT INTO pln_meter_checks (ref_id, nomor_meter, status)
         VALUES ($1, $2, 'pending')`,
        [refId, nomorMeter]
      );

      // Buat transaksi ke Digiflazz
      const response = await axios.post(
        `${this.apiUrl}/transaction`,
        {
          commands:       'inq-pasca',
          username:       this.username,
          buyer_sku_code: 'PLNCEK',
          customer_no:    nomorMeter,
          ref_id:         refId,
          sign:           signature,
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
      );

      const d = response.data?.data;
      console.log(`📦 PLNCEK response: rc=${d?.rc} status=${d?.status}`);

      // Jika langsung gagal (bukan pending), update DB
      if (d?.rc && d.rc !== '00' && d.rc !== '03') {
        await pool.query(
          `UPDATE pln_meter_checks SET status='failed', message=$1 WHERE ref_id=$2`,
          [d.message || 'Gagal', refId]
        );
        return {
          success: false,
          message: d.message || 'Nomor meter tidak ditemukan',
          rc: d.rc,
        };
      }

      // rc:00 sync (langsung ada SN) atau rc:03 async (tunggu webhook)
      if (d?.sn) {
        // Langsung parse dan simpan (jika sync)
        const parsed = parsePlnCekSn(d.sn);
        await pool.query(
          `UPDATE pln_meter_checks
           SET status='success', idpel=$1, nama=$2, tarif=$3, daya=$4, raw_sn=$5
           WHERE ref_id=$6`,
          [parsed.idpel || nomorMeter, parsed.nama, parsed.tarif, parsed.daya, d.sn, refId]
        );
      }

      // Return refId — frontend akan polling dengan ini
      return { success: true, refId };

    } catch (error) {
      console.error('❌ PLN cek meter error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.data?.message || 'Gagal mengecek nomor meter',
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

const digiflazzServiceInstance = new DigiflazzService();
module.exports = digiflazzServiceInstance;
module.exports.parsePlnCekSn = parsePlnCekSn;