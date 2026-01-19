// VIP RESELLER ULTIMATE DEBUG TEST
// Try different variations to find what works

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const API_ID = process.env.VIPRESELLER_API_ID || 'cflWEUBF';
const API_KEY = process.env.VIPRESELLER_API_KEY;
const ENDPOINT = 'https://vip-reseller.co.id/api';

console.log('=== VIP RESELLER ULTIMATE DEBUG ===\n');
console.log('API ID:', API_ID);
console.log('API KEY:', API_KEY ? API_KEY.substring(0, 15) + '...' : 'NOT SET');
console.log('');

function generateSign() {
  return crypto.createHash('md5').update(API_ID + API_KEY).digest('hex');
}

// TEST 1: Standard POST with JSON
async function test1() {
  console.log('\n========================================');
  console.log('TEST 1: Standard JSON POST');
  console.log('========================================\n');
  
  try {
    const sign = generateSign();
    const payload = {
      key: API_KEY,
      sign: sign,
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(`${ENDPOINT}/profile`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log('✓ Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('✗ Error:', error.response?.data || error.message);
  }
}

// TEST 2: URL-encoded form data
async function test2() {
  console.log('\n========================================');
  console.log('TEST 2: URL-encoded Form Data');
  console.log('========================================\n');
  
  try {
    const sign = generateSign();
    
    const params = new URLSearchParams();
    params.append('key', API_KEY);
    params.append('sign', sign);
    
    console.log('Params:', params.toString());
    
    const response = await axios.post(`${ENDPOINT}/profile`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });
    
    console.log('✓ Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('✗ Error:', error.response?.data || error.message);
  }
}

// TEST 3: With additional headers
async function test3() {
  console.log('\n========================================');
  console.log('TEST 3: JSON with Extra Headers');
  console.log('========================================\n');
  
  try {
    const sign = generateSign();
    const payload = {
      key: API_KEY,
      sign: sign,
    };
    
    const response = await axios.post(`${ENDPOINT}/profile`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'TopupGame-API/1.0',
      },
      timeout: 30000,
    });
    
    console.log('✓ Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('✗ Error:', error.response?.data || error.message);
  }
}

// TEST 4: Try with lowercase sign
async function test4() {
  console.log('\n========================================');
  console.log('TEST 4: Lowercase vs Uppercase Sign');
  console.log('========================================\n');
  
  try {
    const signLower = generateSign().toLowerCase();
    const signUpper = generateSign().toUpperCase();
    
    console.log('Sign (lowercase):', signLower);
    console.log('Sign (uppercase):', signUpper);
    console.log('');
    
    // Try lowercase
    console.log('Trying lowercase...');
    const payload1 = {
      key: API_KEY,
      sign: signLower,
    };
    
    const response1 = await axios.post(`${ENDPOINT}/profile`, payload1, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log('✓ Lowercase Response:', JSON.stringify(response1.data, null, 2));
    
  } catch (error) {
    console.log('✗ Lowercase Error:', error.response?.data || error.message);
    
    // Try uppercase
    try {
      console.log('\nTrying uppercase...');
      const signUpper = generateSign().toUpperCase();
      const payload2 = {
        key: API_KEY,
        sign: signUpper,
      };
      
      const response2 = await axios.post(`${ENDPOINT}/profile`, payload2, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      
      console.log('✓ Uppercase Response:', JSON.stringify(response2.data, null, 2));
      
    } catch (error2) {
      console.log('✗ Uppercase Error:', error2.response?.data || error2.message);
    }
  }
}

// TEST 5: Check if endpoint is even reachable
async function test5() {
  console.log('\n========================================');
  console.log('TEST 5: Check Endpoint Reachable');
  console.log('========================================\n');
  
  try {
    const response = await axios.get('https://vip-reseller.co.id', {
      timeout: 10000,
    });
    
    console.log('✓ VIP Reseller website reachable');
    console.log('  Status:', response.status);
    
  } catch (error) {
    console.log('✗ Cannot reach VIP Reseller website');
    console.log('  Error:', error.message);
  }
}

// TEST 6: Verify signature generation
async function test6() {
  console.log('\n========================================');
  console.log('TEST 6: Verify Signature Generation');
  console.log('========================================\n');
  
  const string = API_ID + API_KEY;
  const sign = crypto.createHash('md5').update(string).digest('hex');
  
  console.log('String to hash:', string.substring(0, 30) + '...');
  console.log('MD5 Result:', sign);
  console.log('');
  console.log('Verification:');
  console.log('1. Go to: https://www.md5hashgenerator.com/');
  console.log('2. Input:', string);
  console.log('3. Should match:', sign);
}

async function runAllTests() {
  await test5(); // Check if site reachable
  await test6(); // Verify signature
  await test1(); // Standard JSON
  await test2(); // Form data
  await test3(); // Extra headers
  await test4(); // Case variations
  
  console.log('\n========================================');
  console.log('CONCLUSION');
  console.log('========================================\n');
  console.log('If ALL tests failed with "Request not detected":');
  console.log('');
  console.log('The issue is 99% IP WHITELIST!');
  console.log('');
  console.log('Your IP: 103.47.133.106');
  console.log('');
  console.log('SOLUTIONS:');
  console.log('');
  console.log('A. Contact VIP Reseller CS (FASTEST):');
  console.log('   WhatsApp/Telegram:');
  console.log('   "Hi, API ID: cflWEUBF');
  console.log('    IP sudah whitelist tapi masih error.');
  console.log('    Mohon bantu aktivasi manual."');
  console.log('');
  console.log('B. Check Dashboard Again:');
  console.log('   - Login vip-reseller.co.id');
  console.log('   - Profil → API → Whitelist IP');
  console.log('   - Add: 103.47.133.106');
  console.log('   - Or: 0.0.0.0 (all IPs)');
  console.log('   - Save & wait 5 minutes');
  console.log('');
  console.log('C. Alternative Provider (NO IP whitelist):');
  console.log('   - ApiGames.id (instant access)');
  console.log('   - LapakGaming (1 day setup)');
  console.log('   - Digiflazz (3 days but cheapest)');
  console.log('');
}

runAllTests();