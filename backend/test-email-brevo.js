require('dotenv').config();
const emailService = require('./src/services/email.service');

const testData = {
  orderNumber: 'TEST' + Date.now(),
  customerName: 'Test Customer',
  customerEmail: 'fajarmn19@gmail.com', // ← GANTI!
  productName: 'Valorant 600 VP',
  gameName: 'Valorant',
  userId: 'TestUser',
  zoneId: '1234',
  amount: 75000,
  voucherDiscount: 5000,
  paymentFee: 2500,
  totalAmount: 72500,
  paymentMethod: 'qris',
  paymentUrl: 'https://example.com/payment',
  qrUrl: null,
  vaNumber: '1234567890123456',
  expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

async function test() {
  console.log('📧 Testing Brevo email...');
  console.log('API Key:', process.env.BREVO_API_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('From:', process.env.BREVO_FROM_EMAIL);
  console.log('To:', testData.customerEmail);
  console.log('');
  
  const result = await emailService.sendInvoiceEmail(testData);
  
  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log('Message ID:', result.messageId);
    console.log('');
    console.log('📬 Check your email:', testData.customerEmail);
    console.log('');
    console.log('Dashboard: https://app.brevo.com/email-campaign/stats');
  } else {
    console.log('❌ FAILED!');
    console.log('Error:', result.error);
    if (result.details) {
      console.log('Details:', result.details);
    }
  }
}

test();