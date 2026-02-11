/**
 * Email Service - FIXED VERSION
 * - QR Code image fix (convert data URI to image)
 * - Better spacing for readability
 */

const brevo = require('@getbrevo/brevo');

const getBrevoClient = () => {
  const apiInstance = new brevo.TransactionalEmailsApi();
  const apiKey = apiInstance.authentications['apiKey'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  return apiInstance;
};

const generateInvoiceHTML = async (orderData) => {
  const {
    orderNumber,
    customerName,
    customerEmail,
    productName,
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

  const logoUrl = process.env.LOGO_URL || 'https://segawontopup.net/images/logo.png';

  const paymentMethodNames = {
    'qris': 'QRIS',
    'SP': 'ShopeePay',
    'OV': 'OVO',
    'DA': 'DANA',
    'LA': 'LinkAja',
    'I1': 'Indomaret',
    'A1': 'Alfamart',
    'BT': 'BCA Virtual Account',
    'M2': 'Mandiri Virtual Account',
    'B1': 'BRI Virtual Account',
    'VA': 'BNI Virtual Account',
  };

  const paymentMethodDisplay = paymentMethodNames[paymentMethod] || paymentMethod;

  // FIX: Convert QR string to proper image URL for email clients
  // Duitku returns base64-like string, need to format properly
  // let qrImageTag = '';
  // if (qrUrl && qrUrl.length > 50) {
  //   // If it's EMV QR string (long text), show as text + link to generate QR
  //   qrImageTag = `
  //     <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
  //       <div style="font-size: 10px; color: #1a2332; word-break: break-all; font-family: monospace; line-height: 1.4;">
  //         ${qrUrl}
  //       </div>
  //       <div style="margin-top: 10px; font-size: 12px; color: #6b7280;">
  //         Gunakan aplikasi e-wallet untuk scan QR di atas
  //       </div>
  //     </div>
  //   `;
  // } else if (qrUrl && (qrUrl.startsWith('http://') || qrUrl.startsWith('https://'))) {
  //   // If it's a URL to QR image
  //   qrImageTag = `
  //     <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
  //       <img src="${qrUrl}" alt="QR Code" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
  //     </div>
  //   `;
  // }

  let qrImageTag = '';

  // Hanya generate QR jika qrUrl ada
  console.log('QR URL:', qrUrl);
  if (qrUrl && qrUrl.length > 50) {
    // Gunakan QR Server API (free, no key needed, still maintained)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`;
    
    qrImageTag = `
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center;">
        <img src="${qrImageUrl}" alt="QR Code" style="max-width: 250px; height: auto; display: block; margin: 0 auto;" />
        <div style="font-size: 12px; color: #6b7280; margin-top: 10px;">
          Scan QR Code untuk membayar
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${orderNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
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
      border-bottom: 2px solid #FF6B35;
      margin-bottom: 30px;
    }
    .logo-container {
      margin-bottom: 15px;
    }
    .logo {
      width: 120px;
      height: 120px;
      display: inline-block;
    }
    .brand-name {
      font-size: 28px;
      font-weight: bold;
      color: #1a2332;
      margin: 10px 0 5px 0;
    }
    .tagline {
      font-size: 14px;
      color: #FF6B35;
      font-weight: 600;
    }
    .invoice-title {
      font-size: 20px;
      color: #1f2937;
      margin-top: 15px;
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
      margin-bottom: 15px;
    }
    .info-row {
      display: table;
      width: 100%;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-label {
      display: table-cell;
      color: #6b7280;
      font-size: 14px;
      width: 40%;
      padding-right: 20px;
    }
    .info-value {
      display: table-cell;
      color: #1f2937;
      font-weight: 500;
      font-size: 14px;
      text-align: right;
      width: 60%;
    }
    .price-row {
      display: table;
      width: 100%;
      padding: 12px 0;
    }
    .price-label {
      display: table-cell;
      color: #1f2937;
      font-size: 15px;
      width: 60%;
    }
    .price-value {
      display: table-cell;
      font-weight: 500;
      font-size: 15px;
      text-align: right;
      width: 40%;
    }
    .total-row {
      display: table;
      width: 100%;
      padding: 15px 0;
      margin-top: 10px;
      border-top: 2px solid #e5e7eb;
      font-size: 18px;
      font-weight: bold;
    }
    .total-label {
      display: table-cell;
      color: #1f2937;
      width: 60%;
    }
    .total-value {
      display: table-cell;
      color: #FF6B35;
      text-align: right;
      width: 40%;
    }
    .payment-box {
      background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%);
      color: white;
      padding: 25px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      border: 3px solid #FF6B35;
    }
    .payment-method {
      font-size: 16px;
      margin-bottom: 15px;
    }
    .va-number {
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 15px 0;
      padding: 15px;
      background: rgba(255,107,53,0.2);
      border-radius: 6px;
    }
    .payment-button {
      display: inline-block;
      background: #FF6B35;
      color: white;
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
      color: #FF6B35;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header with Logo -->
    <div class="header">
      <div class="logo-container">
        <img src="${logoUrl}" alt="SEGAWON TOPUP Logo" class="logo">
      </div>
      <div class="brand-name">SEGAWON TOPUP</div>
      <div class="tagline">⚡ Instant Gaming Topup</div>
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
      
      ${qrImageTag}
      
      ${qrImageTag && !vaNumber ? `
      <div style="font-size: 12px; margin-top: 10px; color: rgba(255,255,255,0.8);">
        Scan QR Code untuk membayar
      </div>
      ` : ''}
      
      ${paymentUrl ? `
      <a href="${paymentUrl}" class="payment-button">💳 Bayar Sekarang</a>
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
      <p>🎮 Your Trusted Gaming Partner</p>
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
    
    sendSmtpEmail.subject = `🎮 Invoice Pembayaran - ${orderData.orderNumber}`;
    sendSmtpEmail.htmlContent = await generateInvoiceHTML(orderData);
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

const sendPaymentSuccessEmail = async (orderData) => {
  try {
    const apiInstance = getBrevoClient();
    const logoUrl = process.env.LOGO_URL || 'https://segawontopup.net/images/logo.png';
    
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}
.success-box{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;border-radius:8px;text-align:center;margin-bottom:20px}
.logo{width:80px;height:80px;margin-bottom:10px}
.info-box{background:#f9fafb;padding:20px;border-radius:6px;margin:20px 0}
</style></head>
<body>
  <div class="success-box">
    <img src="${logoUrl}" alt="Logo" class="logo">
    <h1 style="margin:0">✅ Pembayaran Berhasil!</h1>
    <p>Order ${orderData.orderNumber}</p>
  </div>
  <p>Hai <strong>${orderData.customerName}</strong>,</p>
  <p>Pembayaran Anda telah kami terima!</p>
  <div class="info-box">
    <strong>Detail Pesanan:</strong><br>
    Produk: ${orderData.productName}<br>
    User ID: ${orderData.userId}<br>
    Total: Rp ${orderData.totalAmount.toLocaleString('id-ID')}
  </div>
  <p>Terima kasih! 🎮</p>
</body>
</html>`;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: 'SEGAWON TOPUP',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@segawontopup.net'
    };
    sendSmtpEmail.to = [{ email: orderData.customerEmail, name: orderData.customerName }];
    sendSmtpEmail.subject = `✅ Pembayaran Berhasil - ${orderData.orderNumber}`;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.tags = ['payment-success'];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Payment success email sent');
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error('❌ Payment success email failed:', error);
    return { success: false, error: error.message };
  }
};

const sendOrderCompleteEmail = async (orderData) => {
  try {
    const apiInstance = getBrevoClient();
    const logoUrl = process.env.LOGO_URL || 'https://segawontopup.net/images/logo.png';
    
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}
.complete-box{background:linear-gradient(135deg,#1a2332 0%,#2d3e50 100%);color:white;padding:30px;border-radius:8px;text-align:center;margin-bottom:20px;border:3px solid #FF6B35}
.logo{width:100px;height:100px;margin-bottom:10px}
.voucher-box{background:#fef3c7;border:2px dashed #FF6B35;padding:20px;border-radius:8px;text-align:center;margin:20px 0}
.voucher-code{font-size:24px;font-weight:bold;color:#1a2332;letter-spacing:2px}
</style></head>
<body>
  <div class="complete-box">
    <img src="${logoUrl}" alt="Logo" class="logo">
    <h1 style="margin:0">🎉 Pesanan Selesai!</h1>
    <p>Order ${orderData.orderNumber}</p>
  </div>
  <p>Hai <strong>${orderData.customerName}</strong>,</p>
  <p>Pesanan Anda telah berhasil diproses!</p>
  ${orderData.voucherCode ? `
  <div class="voucher-box">
    <div>Kode Voucher:</div>
    <div class="voucher-code">${orderData.voucherCode}</div>
  </div>` : ''}
  <p>Terima kasih! 🎮</p>
</body>
</html>`;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: 'SEGAWON TOPUP',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@segawontopup.net'
    };
    sendSmtpEmail.to = [{ email: orderData.customerEmail, name: orderData.customerName }];
    sendSmtpEmail.subject = `🎉 Pesanan Selesai - ${orderData.orderNumber}`;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.tags = ['order-complete'];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Order complete email sent');
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error('❌ Order complete email failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendInvoiceEmail,
  sendPaymentSuccessEmail,
  sendOrderCompleteEmail
};