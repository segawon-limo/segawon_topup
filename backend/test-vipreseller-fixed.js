// Test VIP Reseller API - FIXED VERSION
// Sesuai dokumentasi resmi VIP Reseller

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const API_ID = process.env.VIPRESELLER_API_ID;
const API_KEY = process.env.VIPRESELLER_API_KEY;
const ENDPOINT = 'https://vip-reseller.co.id/api';

console.log('=== VIP RESELLER API TEST (FIXED) ===\n');
console.log('API ID:', API_ID || 'NOT SET');
console.log('API KEY:', API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT SET');
console.log('');

if (!API_ID || !API_KEY) {
  console.log('ERROR: Credentials not set!');
  console.log('');
  console.log('Add to .env:');
  console.log('VIPRESELLER_API_ID=cflWEUBF');
  console.log('VIPRESELLER_API_KEY=kp02KtCOxwnDmiWGIYRTJYdd6UpfqRzD8dGKkhrtOyKNDg25Q3m5xdKrH4K4Nn1o');
  process.exit(1);
}

// Generate signature: md5(API_ID + API_KEY) - SESUAI DOKUMENTASI
function generateSignature() {
  const string = API_ID + API_KEY;
  return crypto.createHash('md5').update(string).digest('hex');
}

async function testProfile() {
  try {
    console.log('TEST: Profile / Balance Check');
    console.log('==============================');
    console.log('');
    
    const signature = generateSignature();
    console.log('Generated signature:', signature);
    console.log('');
    
    const payload = {
      key: API_KEY,
      sign: signature,
    };
    
    console.log('Request payload:', JSON.stringify(payload, null, 2));
    console.log('');
    console.log('Calling:', `${ENDPOINT}/profile`);
    console.log('');
    
    const response = await axios.post(`${ENDPOINT}/profile`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('');
    
    if (response.data.result === true) {
      console.log('✓ SUCCESS!');
      console.log('  Full Name:', response.data.data.full_name);
      console.log('  Username:', response.data.data.username);
      console.log('  Balance:', response.data.data.balance);
      console.log('  Level:', response.data.data.level);
    } else {
      console.log('✗ FAILED:', response.data.message);
    }
    
  } catch (error) {
    console.log('✗ ERROR!');
    console.log('');
    
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received from server');
      console.log('Possible issues:');
      console.log('- Server down');
      console.log('- Wrong endpoint');
      console.log('- Network/firewall issue');
      console.log('- IP not whitelisted');
    } else {
      console.log('Request setup error:', error.message);
    }
  }
  
  console.log('');
  console.log('==============================');
  console.log('');
  console.log('TROUBLESHOOTING:');
  console.log('');
  console.log('If still "Request not detected":');
  console.log('1. Check IP whitelist di dashboard');
  console.log('2. Add exact IP atau 0.0.0.0');
  console.log('3. Contact CS VIP Reseller (WhatsApp/Telegram)');
  console.log('4. Ask them to activate whitelist manually');
  console.log('');
  console.log('Format signature SUDAH BENAR sesuai dokumentasi:');
  console.log('sign = md5(API_ID + API_KEY)');
}

testProfile();
