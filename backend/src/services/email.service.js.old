/**
 * Email Service - Untuk mengirim invoice dan notifikasi
 * Menggunakan Brevo (formerly Sendinblue) API
 * 
 * KEUNTUNGAN BREVO:
 * - Free tier: 300 email/hari gratis! (3x lebih banyak dari SendGrid)
 * - Tidak perlu SMTP/IMAP
 * - Dashboard analytics lengkap
 * - SMS integration (untuk future)
 * - WhatsApp integration (untuk future)
 * - Marketing automation
 * 
 * CARA PAKAI:
 * 1. Copy file ini ke: backend/src/services/email.service.js
 * 2. Install Brevo: npm install @getbrevo/brevo
 * 3. Setup API Key di .env (lihat panduan)
 */

const brevo = require('@getbrevo/brevo');

/**
 * Initialize Brevo API Client
 */
const getBrevoClient = () => {
  const apiInstance = new brevo.TransactionalEmailsApi();
  const apiKey = apiInstance.authentications['apiKey'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  return apiInstance;
};

/**
 * Generate HTML Invoice Email
 */
const generateInvoiceHTML = (orderData) => {
  const {
    orderNumber,
    customerName,
    customerEmail,
    productName,
    gameName,
    userId,
    zoneId,
    amount,
    voucherDiscount,
    paymentFee,
    totalAmount,
    paymentMethod,
    paymentUrl,
    qrUrl,
    vaNumber,
    expiryTime
  } = orderData;

  // Format payment method name
  const paymentMethodNames = {
    'qris': 'QRIS',
    'va_bca': 'Virtual Account BCA',
    'va_mandiri': 'Virtual Account Mandiri',
    'va_bri': 'Virtual Account BRI',
    'va_bni': 'Virtual Account BNI',
    'va_permata': 'Virtual Account Permata',
    'va_cimb': 'Virtual Account CIMB',
    'ovo': 'OVO',
    'dana': 'DANA',
    'shopeepay': 'ShopeePay',
    'linkaja': 'LinkAja',
    'gopay': 'GoPay',
    'alfamart': 'Alfamart',
    'indomaret': 'Indomaret',
    'credit_card': 'Kartu Kredit'
  };

  const paymentMethodDisplay = paymentMethodNames[paymentMethod] || paymentMethod;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${orderNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #4f46e5;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4f46e5;
    }
    .invoice-title {
      font-size: 20px;
      color: #1f2937;
      margin-top: 10px;
    }
    .order-number {
      color: #6b7280;
      font-size: 14px;
      margin-top: 5px;
    }
    .section {
      margin: 25px 0;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-label {
      color: #6b7280;
      font-size: 14px;
    }
    .info-value {
      color: #1f2937;
      font-weight: 500;
      font-size: 14px;
      text-align: right;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
    }
    .price-label {
      color: #1f2937;
      font-size: 15px;
    }
    .price-value {
      font-weight: 500;
      font-size: 15px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      margin-top: 10px;
      border-top: 2px solid #e5e7eb;
      font-size: 18px;
      font-weight: bold;
    }
    .total-label {
      color: #1f2937;
    }
    .total-value {
      color: #4f46e5;
    }
    .payment-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .payment-method {
      font-size: 16px;
      margin-bottom: 10px;
    }
    .va-number {
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 15px 0;
      padding: 15px;
      background: rgba(255,255,255,0.2);
      border-radius: 6px;
    }
    .qr-code {
      margin: 15px 0;
      padding: 15px;
      background: white;
      border-radius: 8px;
    }
    .qr-code img {
      max-width: 200px;
      height: auto;
    }
    .payment-button {
      display: inline-block;
      background: white;
      color: #4f46e5;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 10px;
    }
    .expiry-notice {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #92400e;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 13px;
    }
    .footer a {
      color: #4f46e5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">⚡ SEGAWON TOPUP</div>
      <div class="invoice-title">Invoice Pembayaran</div>
      <div class="order-number">${orderNumber}</div>
    </div>

    <!-- Customer Info -->
    <div class="section">
      <div class="section-title">Informasi Pelanggan</div>
      <div class="info-row">
        <span class="info-label">Nama</span>
        <span class="info-value">${customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">${customerEmail}</span>
      </div>
    </div>

    <!-- Order Details -->
    <div class="section">
      <div class="section-title">Detail Pesanan</div>
      <div class="info-row">
        <span class="info-label">Produk</span>
        <span class="info-value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${gameName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">User ID</span>
        <span class="info-value">${userId}${zoneId ? ' (' + zoneId + ')' : ''}</span>
      </div>
    </div>

    <!-- Price Breakdown -->
    <div class="section">
      <div class="section-title">Rincian Harga</div>
      <div class="price-row">
        <span class="price-label">Harga Produk</span>
        <span class="price-value">Rp ${amount.toLocaleString('id-ID')}</span>
      </div>
      ${voucherDiscount > 0 ? `
      <div class="price-row">
        <span class="price-label" style="color: #10b981;">Diskon Voucher</span>
        <span class="price-value" style="color: #10b981;">- Rp ${voucherDiscount.toLocaleString('id-ID')}</span>
      </div>
      ` : ''}
      <div class="price-row">
        <span class="price-label">Biaya Admin</span>
        <span class="price-value">Rp ${paymentFee.toLocaleString('id-ID')}</span>
      </div>
      <div class="total-row">
        <span class="total-label">Total Pembayaran</span>
        <span class="total-value">Rp ${totalAmount.toLocaleString('id-ID')}</span>
      </div>
    </div>

    <!-- Payment Info -->
    <div class="payment-box">
      <div class="payment-method">Metode Pembayaran: <strong>${paymentMethodDisplay}</strong></div>
      
      ${vaNumber ? `
      <div class="va-number">${vaNumber}</div>
      <div style="font-size: 12px; margin-top: 10px;">Nomor Virtual Account</div>
      ` : ''}
      
      ${qrUrl ? `
      <div class="qr-code">
        <img src="${qrUrl}" alt="QR Code" />
      </div>
      <div style="font-size: 12px; margin-top: 10px;">Scan QR Code untuk membayar</div>
      ` : ''}
      
      ${paymentUrl ? `
      <a href="${paymentUrl}" class="payment-button">Bayar Sekarang</a>
      ` : ''}
    </div>

    <!-- Expiry Notice -->
    ${expiryTime ? `
    <div class="expiry-notice">
      <strong>⏰ Perhatian!</strong><br>
      Pembayaran ini akan kadaluarsa pada: <strong>${new Date(expiryTime).toLocaleString('id-ID', { 
        dateStyle: 'full', 
        timeStyle: 'short' 
      })}</strong>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>Terima kasih telah berbelanja di <strong>SEGAWON TOPUP</strong></p>
      <p>
        Butuh bantuan? Hubungi kami di 
        <a href="mailto:support@segawontopup.net">support@segawontopup.net</a>
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        Email ini dikirim secara otomatis, mohon tidak membalas email ini.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Kirim Invoice Email menggunakan Brevo
 */
const sendInvoiceEmail = async (orderData) => {
  try {
    const apiInstance = getBrevoClient();
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = {
      name: 'SEGAWON TOPUP',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@segawontopup.net'
    };
    
    sendSmtpEmail.to = [{
      email: orderData.customerEmail,
      name: orderData.customerName
    }];
    
    sendSmtpEmail.subject = `Invoice Pembayaran - ${orderData.orderNumber}`;
    sendSmtpEmail.htmlContent = generateInvoiceHTML(orderData);
    
    // Optional: Add tags for tracking
    sendSmtpEmail.tags = ['invoice', 'order', orderData.paymentMethod];
    
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Invoice email sent successfully via Brevo');
    console.log('  Message ID:', response.messageId);
    console.log('  To:', orderData.customerEmail);
    console.log('  Order:', orderData.orderNumber);
    
    return {
      success: true,
      messageId: response.messageId
    };

  } catch (error) {
    console.error('❌ Failed to send invoice email:', error);
    
    // Brevo specific error handling
    if (error.response) {
      console.error('  Brevo Error:', error.response.text);
    }
    
    return {
      success: false,
      error: error.message,
      details: error.response?.text
    };
  }
};

/**
 * Kirim Email Pembayaran Berhasil
 */
const sendPaymentSuccessEmail = async (orderData) => {
  try {
    const apiInstance = getBrevoClient();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .success-box {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="success-box">
    <h1 style="margin: 0;">✅ Pembayaran Berhasil!</h1>
    <p style="font-size: 16px; margin-top: 10px;">Order ${orderData.orderNumber}</p>
  </div>
  
  <p>Hai <strong>${orderData.customerName}</strong>,</p>
  
  <p>Pembayaran Anda telah kami terima! Pesanan Anda sedang diproses dan akan segera dikirim.</p>
  
  <div class="info-box">
    <strong>Detail Pesanan:</strong><br>
    Produk: ${orderData.productName}<br>
    User ID: ${orderData.userId}<br>
    Total: Rp ${orderData.totalAmount.toLocaleString('id-ID')}
  </div>
  
  <p>Anda akan menerima notifikasi melalui email ketika pesanan selesai diproses.</p>
  
  <p>Terima kasih telah berbelanja di SEGAWON TOPUP!</p>
</body>
</html>
    `;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: 'SEGAWON TOPUP',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@segawontopup.net'
    };
    sendSmtpEmail.to = [{
      email: orderData.customerEmail,
      name: orderData.customerName
    }];
    sendSmtpEmail.subject = `✅ Pembayaran Berhasil - ${orderData.orderNumber}`;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.tags = ['payment-success', 'order'];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Payment success email sent via Brevo');
    return { 
      success: true, 
      messageId: response.messageId 
    };

  } catch (error) {
    console.error('❌ Failed to send payment success email:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Kirim Email Order Complete
 */
const sendOrderCompleteEmail = async (orderData) => {
  try {
    const apiInstance = getBrevoClient();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .complete-box {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    .voucher-box {
      background: #fef3c7;
      border: 2px dashed #f59e0b;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .voucher-code {
      font-size: 24px;
      font-weight: bold;
      color: #92400e;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <div class="complete-box">
    <h1 style="margin: 0;">🎉 Pesanan Selesai!</h1>
    <p style="font-size: 16px; margin-top: 10px;">Order ${orderData.orderNumber}</p>
  </div>
  
  <p>Hai <strong>${orderData.customerName}</strong>,</p>
  
  <p>Pesanan Anda telah berhasil diproses dan ${orderData.productName} telah ditambahkan ke akun Anda!</p>
  
  ${orderData.voucherCode ? `
  <div class="voucher-box">
    <div>Kode Voucher Game Anda:</div>
    <div class="voucher-code">${orderData.voucherCode}</div>
  </div>
  ` : ''}
  
  <p>Terima kasih telah berbelanja di SEGAWON TOPUP. Sampai jumpa lagi! 🎮</p>
</body>
</html>
    `;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: 'SEGAWON TOPUP',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@segawontopup.net'
    };
    sendSmtpEmail.to = [{
      email: orderData.customerEmail,
      name: orderData.customerName
    }];
    sendSmtpEmail.subject = `🎉 Pesanan Selesai - ${orderData.orderNumber}`;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.tags = ['order-complete', 'order'];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Order complete email sent via Brevo');
    return { 
      success: true, 
      messageId: response.messageId 
    };

  } catch (error) {
    console.error('❌ Failed to send order complete email:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

module.exports = {
  sendInvoiceEmail,
  sendPaymentSuccessEmail,
  sendOrderCompleteEmail
};
