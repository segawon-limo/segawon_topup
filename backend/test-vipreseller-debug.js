// Test VIP Reseller dengan format yang benar
// Berdasarkan dokumentasi resmi VIP Reseller

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const API_ID = process.env.VIPRESELLER_API_ID;
const API_KEY = process.env.VIPRESELLER_API_KEY;

console.log('=== VIP RESELLER API TEST ===\n');
console.log('API ID:', API_ID);
console.log('API KEY:', API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT SET');
console.log('');

if (!API_ID || !API_KEY) {
  console.log('ERROR: Credentials not set in .env!');
  process.exit(1);
}

// Test 1: Profile/Balance dengan format PALING SIMPLE
async function testSimple() {
  try {
    console.log('TEST 1: Simple Profile Check');
    console.log('----------------------------');
    
    // Format paling simple: hanya key dan sign
    const sign = crypto.createHash('md5').update(API_ID + API_KEY).digest('hex');
    
    console.log('Generated Sign:', sign);
    
    const payload = {
      key: API_KEY,
      sign: sign
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('');
    
    const response = await axios.post('https://vip-reseller.co.id/api/profile', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.result) {
      console.log('\n✓ SUCCESS!');
      console.log('Balance:', response.data.data.balance);
    } else {
      console.log('\n✗ FAILED:', response.data.message);
    }
  } catch (error) {
    console.log('\n✗ ERROR:', error.response?.data || error.message);
  }
  console.log('\n');
}

// Test dengan IP check
async function checkIP() {
  try {
    console.log('TEST 2: Checking Your IP');
    console.log('------------------------');
    
    const ipResponse = await axios.get('https://api.ipify.org?format=json');
    console.log('Your IP:', ipResponse.data.ip);
    console.log('');
    console.log('IMPORTANT: Whitelist IP ini di VIP Reseller dashboard!');
    console.log('Dashboard → Profil → API → Whitelist IP');
    console.log('');
  } catch (error) {
    console.log('Cannot check IP:', error.message);
  }
}

async function main() {
  await checkIP();
  await testSimple();
  
  console.log('=== TROUBLESHOOTING ===');
  console.log('');
  console.log('Jika masih error "Request not detected":');
  console.log('1. Pastikan API ID & API KEY benar (copy dari dashboard)');
  console.log('2. Whitelist IP kamu di dashboard VIP Reseller');
  console.log('3. Atau whitelist semua IP dengan: 0.0.0.0 atau *');
  console.log('4. Hubungi CS VIP Reseller via WhatsApp untuk bantuan');
  console.log('');
  console.log('Alternatif: Pakai ApiGames.id (lebih mudah, no IP whitelist)');
}

main();
