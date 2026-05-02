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
    customerName: rawName,
    customerEmail,
    productName,
    userId,
    zoneId,
    amount,
    voucherCode,
    voucherDiscount,
    paymentFee,
    totalAmount,
    paymentMethod,
    paymentUrl,
    qrUrl,
    vaNumber,
    expiryTime,
    productType
  } = orderData;

  // Fallback nama: pakai bagian sebelum @ dari email jika nama kosong
  const customerName = (rawName && rawName.trim()) ? rawName.trim() : customerEmail.split('@')[0];

  // const logoUrl = process.env.LOGO_URL || 'https://segawontopup.net/images/logo.png';
  // Gunakan URL dari CDN tempat Anda upload logo email
  const logoHeaderUrl = process.env.LOGO_EMAIL_HEADER_URL || 'https://res.cloudinary.com/yourname/image/upload/logo-header.png';
  const logoSmallUrl = process.env.LOGO_EMAIL_SMALL_URL || 'https://res.cloudinary.com/yourname/image/upload/logo-small.png';

  // Kode Duitku VA aktif: BR=BRI | M2=Mandiri | NC=BNC | I1=BNI | BV=BSI | B1=CIMB | DM=Danamon | BT=Permata
  const paymentMethodNames = {
    'BR': 'BRI Virtual Account',
    'M2': 'Mandiri Virtual Account',
    'NC': 'Bank Neo Commerce (BNC) Virtual Account',
    'I1': 'BNI Virtual Account',
    'BV': 'BSI Virtual Account',
    'B1': 'CIMB Niaga Virtual Account',
    'DM': 'Danamon Virtual Account',
    'BT': 'Permata Bank Virtual Account',
    'SA': 'ShopeePay',
    'OV': 'OVO',
    'DA': 'DANA',
    'SQ': 'QRIS',
  };

  const VA_BANK_NAMES = {
    'BR': 'BRI',
    'M2': 'Mandiri',
    'NC': 'BNC',
    'I1': 'BNI',
    'BV': 'BSI',
    'B1': 'CIMB Niaga',
    'DM': 'Danamon',
    'BT': 'Permata',
  };

  const paymentMethodDisplay = paymentMethodNames[paymentMethod] || paymentMethod;

  // PAYMENT INSTRUCTIONS BERDASARKAN METODE
  const getPaymentInstructions = (method) => {
    const methodUpper = method.toUpperCase();
    
    // QRIS
    if (methodUpper === 'QRIS' || methodUpper === 'SQ') {
      return `
        <div class="instructions">
          <h3>📱 Cara Pembayaran QRIS:</h3>
          <ol>
            <li>Buka aplikasi e-wallet atau mobile banking favorit Anda (GoPay, OVO, Livin', BCA Mobile, dll)</li>
            <li>Pilih menu <strong>"Scan QR"</strong> atau <strong>"Bayar"</strong></li>
            <li>Scan QR Code yang tertera di atas</li>
            <li>Periksa detail pembayaran</li>
            <li>Konfirmasi pembayaran dengan PIN Anda</li>
            <li>Simpan bukti pembayaran</li>
          </ol>
        </div>
      `;
    }
    
    // E-Wallet (ShopeePay, OVO, DANA, LinkAja)
    if (['SP', 'OV', 'DA', 'LA'].includes(methodUpper)) {
      const walletName = paymentMethodNames[methodUpper] || paymentMethodNames[method] || method;
      return `
        <div class="instructions">
          <h3>📱 Cara Pembayaran ${walletName}:</h3>
          <ol>
            <li>Klik tombol <strong>"Bayar Sekarang"</strong> di atas</li>
            <li>Anda akan diarahkan ke aplikasi ${walletName}</li>
            <li>Login ke akun ${walletName} Anda</li>
            <li>Periksa detail pembayaran (Rp ${totalAmount.toLocaleString('id-ID')})</li>
            <li>Konfirmasi pembayaran dengan PIN</li>
            <li>Tunggu notifikasi pembayaran berhasil</li>
          </ol>
          ${qrUrl ? `
          <p style="margin-top: 15px; font-size: 14px; color: #6b7280;">
            <strong>Alternatif:</strong> Anda juga bisa scan QR Code di atas menggunakan aplikasi ${walletName}
          </p>
          ` : ''}
        </div>
      `;
    }

    // ShopeePay App (SA)
    if (methodUpper === 'SA') {
      return `
        <div class="instructions">
          <h3>📱 Cara Pembayaran ShopeePay:</h3>
          <ol>
            <li>Klik tombol <strong>"Bayar Sekarang dengan ShopeePay"</strong> di atas</li>
            <li>Di smartphone: aplikasi Shopee akan terbuka otomatis</li>
            <li>Di PC/laptop: scan QR Code yang tampil menggunakan kamera Shopee</li>
            <li>Periksa detail pembayaran (<strong>Rp ${totalAmount.toLocaleString('id-ID')}</strong>)</li>
            <li>Konfirmasi pembayaran dengan PIN ShopeePay</li>
            <li>Tunggu notifikasi pembayaran berhasil</li>
          </ol>
          <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px 14px; margin-top: 12px;">
            <p style="font-size: 12px; color: #92400e; margin: 0;">
              💡 <strong>Tips:</strong> Pastikan saldo ShopeePay Anda mencukupi sebelum melanjutkan pembayaran.
            </p>
          </div>
        </div>
      `;
    }
    

    // OVO
    if (methodUpper === 'OV') {
      return `
        <div class="instructions">
          <h3>📱 Cara Pembayaran OVO:</h3>
          <ol>
            <li>Klik tombol <strong>"Bayar dengan OVO"</strong> di atas</li>
            <li>Halaman konfirmasi Duitku akan terbuka — nomor HP sudah terisi otomatis</li>
            <li>Pastikan nomor HP sesuai, lalu langsung klik <strong>PAY NOW</strong></li>
            <li>Notifikasi pembayaran akan muncul di aplikasi OVO kamu</li>
            <li>Pilih metode: <strong>OVO Cash</strong>, <strong>OVO Points</strong>, atau <strong>Split</strong></li>
            <li>Periksa detail (<strong>Rp ${totalAmount.toLocaleString('id-ID')}</strong>) lalu klik <strong>"Bayar"</strong></li>
            <li>Selesaikan dalam <strong>30 detik</strong> setelah notifikasi muncul</li>
          </ol>
          <div style="background: #f3f0ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 10px 14px; margin-top: 12px;">
            <p style="font-size: 12px; color: #5b21b6; margin: 0;">
              💡 <strong>Tips:</strong> Pastikan nomor HP yang kamu masukkan adalah nomor yang terdaftar di akun OVO kamu.
            </p>
          </div>
        </div>
      `;
    }

    // Virtual Account — semua kode aktif
    if (['BR', 'M2', 'NC', 'I1', 'BV', 'B1', 'DM', 'BT'].includes(methodUpper)) {
      const bankName = VA_BANK_NAMES[methodUpper] || methodUpper;
      
      return `
        <div class="instructions">
          <h3>🏦 Cara Pembayaran ${bankName} Virtual Account:</h3>
          
          <div style="margin: 20px 0;">
            <strong>📱 Via Mobile Banking:</strong>
            <ol>
              <li>Buka aplikasi ${bankName} Mobile</li>
              <li>Pilih menu <strong>"Transfer"</strong> atau <strong>"Pembayaran"</strong></li>
              <li>Pilih <strong>"Virtual Account"</strong> atau <strong>"VA ${bankName}"</strong></li>
              <li>Masukkan nomor VA: <strong>${vaNumber}</strong></li>
              <li>Periksa detail pembayaran (Rp ${totalAmount.toLocaleString('id-ID')})</li>
              <li>Konfirmasi dengan PIN/password</li>
              <li>Simpan bukti transfer</li>
            </ol>
          </div>
          
          <div style="margin: 20px 0; padding-top: 15px; border-top: 1px dashed #e5e7eb;">
            <strong>🏧 Via ATM ${bankName}:</strong>
            <ol>
              <li>Masukkan kartu ATM dan PIN</li>
              <li>Pilih menu <strong>"Transaksi Lainnya"</strong></li>
              <li>Pilih <strong>"Transfer"</strong></li>
              <li>Pilih <strong>"Ke Rek ${bankName} Virtual Account"</strong></li>
              <li>Masukkan nomor VA: <strong>${vaNumber}</strong></li>
              <li>Masukkan nominal: <strong>Rp ${totalAmount.toLocaleString('id-ID')}</strong></li>
              <li>Konfirmasi dan selesaikan transaksi</li>
              <li>Simpan struk sebagai bukti</li>
            </ol>
          </div>
          
          <div style="margin: 20px 0; padding-top: 15px; border-top: 1px dashed #e5e7eb;">
            <strong>💻 Via Internet Banking:</strong>
            <ol>
              <li>Login ke ${bankName} Internet Banking</li>
              <li>Pilih menu <strong>"Transfer"</strong></li>
              <li>Pilih <strong>"Transfer ke ${bankName} Virtual Account"</strong></li>
              <li>Masukkan nomor VA: <strong>${vaNumber}</strong></li>
              <li>Nominal akan terisi otomatis</li>
              <li>Konfirmasi transaksi</li>
              <li>Download bukti transfer</li>
            </ol>
          </div>
        </div>
      `;
    }
    
    // Retail (Indomaret, Alfamart)
    if (['I1', 'A1'].includes(methodUpper)) {
      const storeName = methodUpper === 'I1' ? 'Indomaret' : 'Alfamart';
      return `
        <div class="instructions">
          <h3>🏪 Cara Pembayaran di ${storeName}:</h3>
          <ol>
            <li>Kunjungi <strong>gerai ${storeName}</strong> terdekat</li>
            <li>Tunjukkan kode pembayaran ke kasir</li>
            <li>Kasir akan memproses pembayaran</li>
            <li>Bayar sejumlah <strong>Rp ${totalAmount.toLocaleString('id-ID')}</strong></li>
            <li>Simpan struk pembayaran sebagai bukti</li>
            <li>Pembayaran akan otomatis terkonfirmasi</li>
          </ol>
          <p style="margin-top: 15px; padding: 10px; background: #fef3c7; border-left: 3px solid #f59e0b; font-size: 13px;">
            💡 <strong>Tips:</strong> Pastikan kasir sudah mengkonfirmasi pembayaran berhasil sebelum meninggalkan kasir.
          </p>
        </div>
      `;
    }
    
    return '';
  };

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
      <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; box-sizing: border-box; width: 100%;">
        <img src="${qrImageUrl}" alt="QR Code" style="max-width: 250px; width: 100%; height: auto; display: block; margin: 0 auto;" />
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
        <img 
          src="${logoHeaderUrl}" 
          srcset="${logoHeaderUrl.replace('.png', '@2x.png')} 2x"
          alt="Segawon Top Up Logo" 
          class="logo"
          style="width: 100px; height: 100px; margin-bottom: 15px; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));"
        >
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
      ${userId && userId !== 'null' ? `
      <div class="info-row">
        <span class="info-label">${productType === 'token_pln' ? 'No. Meter' : 'User ID'}</span>
        <span class="info-value">${userId}${zoneId ? ' (' + zoneId + ')' : ''}</span>
      </div>
      ` : ''}
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
        <span class="price-label" style="color: #10b981;">Diskon Voucher${voucherCode ? ` (${voucherCode})` : ''}</span>
        <span class="price-value" style="color: #10b981;">- Rp ${voucherDiscount.toLocaleString('id-ID')}</span>
      </div>
      ` : ''}
      <div class="price-row">
        <span class="price-label">Biaya Layanan</span>
        <span class="price-value">Rp ${paymentFee.toLocaleString('id-ID')}</span>
      </div>
      ${paymentMethod === 'M2' ? `
      <div class="price-row" style="background: #fffbeb; border-radius: 6px; padding: 8px 12px; margin: 4px 0; border: 1px solid #fde68a;">
        <span class="price-label" style="color: #92400e; font-size: 12px;">
          ⚠️ Biaya Bank Mandiri*
        </span>
        <span class="price-value" style="color: #92400e; font-size: 12px;">
          ${parseFloat(amount - (voucherDiscount || 0)) >= 1000000 ? 'Rp 5.000' :
            parseFloat(amount - (voucherDiscount || 0)) >= 500000  ? 'Rp 3.000' : 'Rp 2.500'}
        </span>
      </div>
      <div style="font-size: 11px; color: #92400e; padding: 0 4px 8px; font-style: italic;">
        *Ditagih langsung oleh Bank Mandiri, tidak termasuk dalam total di atas
      </div>
      ` : ''}
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

      ${paymentMethod === 'SA' && paymentUrl ? `
      <div style="text-align: center; margin-top: 20px;">
        <a href="${paymentUrl}" 
           style="display: inline-block; background: #ee4d2d; color: #fff; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(238,77,45,0.35);">
          💳 Bayar Sekarang dengan ShopeePay
        </a>
        <p style="font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 10px;">
          Klik tombol di atas atau buka link berikut:<br>
          <a href="${paymentUrl}" style="color: rgba(255,255,255,0.9); word-break: break-all;">${paymentUrl}</a>
        </p>
      </div>
      ` : ''}

      ${paymentMethod === 'OV' && paymentUrl ? `
      <div style="text-align: center; margin-top: 20px;">
        <a href="${paymentUrl}"
           style="display: inline-block; background: #4c3494; color: #fff; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(76,52,148,0.35);">
          💜 Bayar dengan OVO
        </a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
          Klik tombol di atas atau buka link berikut:<br>
          <a href="${paymentUrl}" style="color: #4c3494; word-break: break-all;">${paymentUrl}</a>
        </p>
      </div>
      ` : ''}

      ${paymentMethod === 'DA' && paymentUrl ? `
      <div style="text-align: center; margin-top: 20px;">
        <a href="${paymentUrl}"
           style="display: inline-block; background: #118EEA; color: #fff; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(17,142,234,0.35);">
          💙 Bayar dengan DANA
        </a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
          Klik tombol di atas atau buka link berikut:<br>
          <a href="${paymentUrl}" style="color: #118EEA; word-break: break-all;">${paymentUrl}</a>
        </p>
      </div>
      ` : ''}
    </div>
    
    <!-- PAYMENT INSTRUCTIONS - TAMBAHAN BARU -->
    ${getPaymentInstructions(paymentMethod)}

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

// after ${qrImageTag && !vaNumber ? `
// ${paymentUrl ? `
// <a href="${paymentUrl}" class="payment-button">💳 Bayar Sekarang</a>
// ` : ''}

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
    // const logoUrl = process.env.LOGO_URL || 'https://segawontopup.net/images/logo.png';
    // Gunakan URL dari CDN tempat Anda upload logo email
    const logoHeaderUrl = process.env.LOGO_EMAIL_HEADER_URL || 'https://res.cloudinary.com/yourname/image/upload/logo-header.png';
    const logoSmallUrl = process.env.LOGO_EMAIL_SMALL_URL || 'https://res.cloudinary.com/yourname/image/upload/logo-small.png';
    
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
    <img 
      src="${logoSmallUrl}" 
      alt="Segawon Top Up Logo" 
      class="logo"
      style="width: 80px; height: 80px; margin-bottom: 10px;"
    >
    <h1 style="margin:0">✅ Pembayaran Berhasil!</h1>
    <p>Order ${orderData.orderNumber}</p>
  </div>
  <p>Hai <strong>${orderData.customerName || orderData.customerEmail.split('@')[0]}</strong>,</p>
  <p>Pembayaran Anda telah kami terima!</p>
  <div class="info-box">
    <strong>Detail Pesanan:</strong><br>
    Produk: ${orderData.productName}<br>
    ${orderData.productType === 'token_pln' ? 'No. Meter' : 'User ID'}: ${orderData.userId}<br>
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
    const apiInstance   = getBrevoClient();
    const logoHeaderUrl = process.env.LOGO_EMAIL_HEADER_URL || 'https://segawontopup.net/images/logo.png';

    const {
      orderNumber, customerName: rawName, customerEmail, productName,
      userId, zoneId, voucherCode, isVoucher, totalAmount, productType
    } = orderData;

    // Fallback nama: pakai bagian sebelum @ dari email jika nama kosong
    const customerName = (rawName && rawName.trim()) ? rawName.trim() : customerEmail.split('@')[0];

    // Rupiah formatter
    const rp = (n) => n
      ? `Rp ${Number(n).toLocaleString('id-ID')}`
      : '-';

    // ── Parser SN Token PLN ─────────────────────────────────
    // Format: TOKEN/NAMA/TARIF/DAYAva/KWH
    const parsePlnSn = (sn) => {
      if (!sn) return null;
      const m = sn.match(/^(\d{4}-\d{4}-\d{4}-\d{4}-\d{4})/);
      if (!m) return null;
      const token = m[1];
      const parts = sn.slice(token.length + 1).split('/');
      if (parts.length < 3) return { token, nama: parts[0] };
      const kwh   = parts[parts.length - 1];
      const daya  = parts[parts.length - 2].replace(/VA$/i, '') + ' VA';
      const tarif = parts[parts.length - 3];
      const nama  = parts.slice(0, parts.length - 3).join('/');
      return { token, nama, tarif, daya, kwh };
    };

    // Bagian kode voucher / serial number — hanya tampil kalau ada
    let snSection;
    if (voucherCode && productType === 'token_pln') {
      // Token PLN: parse dan tampilkan detail
      const pln = parsePlnSn(voucherCode);
      const plnInfoRows = pln ? `
        <table style="width:100%;margin-top:12px;border-top:1px solid #22c55e33;padding-top:8px;">
          ${pln.nama ? `<tr>
            <td style="padding:6px 0;font-size:12px;color:#4ade80;">Nama Pelanggan</td>
            <td style="padding:6px 0;font-size:12px;font-weight:600;color:#f0fdf4;text-align:right;">${pln.nama}</td>
          </tr>` : ''}
          ${pln.tarif && pln.daya ? `<tr>
            <td style="padding:6px 0;font-size:12px;color:#4ade80;">Tarif / Daya</td>
            <td style="padding:6px 0;font-size:12px;font-weight:600;color:#f0fdf4;text-align:right;">${pln.tarif} / ${pln.daya}</td>
          </tr>` : ''}
          ${pln.kwh ? `<tr>
            <td style="padding:6px 0;font-size:12px;color:#4ade80;">Jumlah kWh</td>
            <td style="padding:6px 0;font-size:12px;font-weight:600;color:#f0fdf4;text-align:right;">${pln.kwh}</td>
          </tr>` : ''}
        </table>` : '';
      snSection = `
      <div style="background:linear-gradient(135deg,#052e16,#14532d);border:1px solid #22c55e44;padding:24px;border-radius:12px;text-align:center;margin:24px 0;box-shadow:0 0 24px #22c55e18;">
        <p style="margin:0 0 8px;color:#4ade80;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
          ⚡ Token PLN Kamu
        </p>
        <p style="margin:0;font-size:26px;font-weight:bold;color:#f0fdf4;letter-spacing:3px;font-family:monospace;">
          ${pln ? pln.token : voucherCode}
        </p>
        ${plnInfoRows}
        <p style="margin:12px 0 0;font-size:12px;color:#4ade80aa;">Masukkan token di meteran listrik atau aplikasi PLN Mobile</p>
      </div>`;
    } else if (voucherCode) {
      // Voucher biasa (Steam Wallet, dll)
      snSection = `
      <div style="background:#fef3c7;border:2px dashed #FF6B35;padding:24px;border-radius:8px;text-align:center;margin:24px 0;">
        <p style="margin:0 0 8px;color:#92400e;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
          🎁 Kode Voucher Kamu
        </p>
        <p style="margin:0;font-size:26px;font-weight:bold;color:#1a2332;letter-spacing:3px;font-family:monospace;">
          ${voucherCode}
        </p>
        <p style="margin:8px 0 0;font-size:12px;color:#92400e;">Masukkan kode ini di platform tujuan</p>
      </div>`;
    } else {
      snSection = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin:24px 0;text-align:center;">
        <p style="margin:0;color:#166534;">✅ Topup berhasil masuk ke akun kamu!</p>
      </div>`;
    }

    // Info tujuan — tidak tampil untuk voucher
    const targetSection = !isVoucher && userId ? `
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Tujuan</td>
        <td style="padding:8px 0;font-weight:600;text-align:right;">
          ${userId}${zoneId ? ' (' + zoneId + ')' : ''}
        </td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1a2332 0%,#2d3e50 100%);color:white;padding:32px;border-radius:12px;text-align:center;margin-bottom:24px;border:3px solid #FF6B35;">
    <img src="${logoHeaderUrl}" alt="Segawon" style="width:80px;height:80px;margin-bottom:12px;border-radius:12px;">
    <h1 style="margin:0;font-size:24px;">🎉 Pesanan Selesai!</h1>
    <p style="margin:6px 0 0;opacity:.8;font-size:14px;">${orderNumber}</p>
  </div>

  <!-- Body -->
  <div style="background:white;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <p style="margin:0 0 16px;">Hai <strong>${customerName}</strong>,</p>
    <p style="margin:0 0 20px;color:#374151;">
      Pesanan <strong>${productName}</strong> kamu telah berhasil diproses. 
      ${isVoucher ? 'Gunakan kode di bawah ini untuk melakukan redeem.' : ''}
    </p>

    ${snSection}

    <!-- Detail order -->
    <table style="width:100%;border-top:1px solid #e5e7eb;margin-top:20px;padding-top:16px;">
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;">No. Order</td>
        <td style="padding:8px 0;font-weight:600;text-align:right;">${orderNumber}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Produk</td>
        <td style="padding:8px 0;font-weight:600;text-align:right;">${productName}</td>
      </tr>
      ${targetSection}
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Total Bayar</td>
        <td style="padding:8px 0;font-weight:700;text-align:right;color:#FF6B35;">${rp(totalAmount)}</td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <p style="text-align:center;margin-top:20px;color:#9ca3af;font-size:12px;">
    Ada pertanyaan? Hubungi CS kami di 
    <a href="https://segawontopup.net" style="color:#FF6B35;">segawontopup.net</a>
  </p>

</body>
</html>`;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name:  'SEGAWON TOPUP',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@segawontopup.net'
    };
    sendSmtpEmail.to      = [{ email: customerEmail, name: customerName }];
    sendSmtpEmail.subject = `🎉 Pesanan Selesai - ${orderNumber}`;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.tags    = ['order-complete'];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Order complete email sent to', customerEmail);
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