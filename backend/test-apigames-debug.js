const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const MERCHANT_ID = process.env.APIGAMES_MERCHANT_ID;
const SECRET_KEY = process.env.APIGAMES_SECRET_KEY;
const ENDPOINT = process.env.APIGAMES_ENDPOINT || 'https://v1.apigames.id';

console.log('=== APIGAMES DEBUG TEST ===\n');
console.log('Endpoint:', ENDPOINT);
console.log('Merchant ID:', MERCHANT_ID);
console.log('Secret Key:', SECRET_KEY ? SECRET_KEY.substring(0, 10) + '...' : 'NOT SET');
console.log('');

async function testRawAPI() {
  try {
    console.log('TEST 1: Raw API Call to Merchant Endpoint');
    console.log('------------------------------------------');
    
    const ref_id = `TEST${Date.now()}`;
    const signature = crypto.createHash('md5')
      .update(MERCHANT_ID + SECRET_KEY + ref_id)
      .digest('hex');
    
    const payload = {
      merchant_id: MERCHANT_ID,
      secret: SECRET_KEY,
      signature: signature,
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('');
    console.log('Calling:', `${ENDPOINT}/merchant`);
    console.log('');
    
    const response = await axios.post(`${ENDPOINT}/merchant`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.status === 'success' || response.data.status === 1) {
      console.log('\n✓ API WORKING!');
      console.log('Balance:', response.data.data?.balance || 0);
    } else {
      console.log('\n✗ API Error:', response.data.error_msg || response.data.message);
    }
    
  } catch (error) {
    console.log('\n✗ REQUEST FAILED');
    console.log('Error Type:', error.constructor.name);
    console.log('Error Message:', error.message);
    
    if (error.response) {
      console.log('\nResponse Status:', error.response.status);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('\nNo response received from server');
      console.log('This usually means:');
      console.log('1. Server is down');
      console.log('2. Wrong endpoint URL');
      console.log('3. Network/firewall issue');
    } else {
      console.log('\nRequest setup error:', error.message);
    }
  }
}

async function testPriceList() {
  try {
    console.log('\n\nTEST 2: Get Price List');
    console.log('----------------------');
    
    const ref_id = `PRICE${Date.now()}`;
    const signature = crypto.createHash('md5')
      .update(MERCHANT_ID + SECRET_KEY + ref_id)
      .digest('hex');
    
    const payload = {
      merchant_id: MERCHANT_ID,
      secret: SECRET_KEY,
      signature: signature,
    };
    
    console.log('Calling:', `${ENDPOINT}/game/pricelist`);
    console.log('');
    
    const response = await axios.post(`${ENDPOINT}/game/pricelist`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log('Response Status:', response.status);
    
    if (response.data.status === 'success' || response.data.status === 1) {
      console.log('✓ SUCCESS!');
      
      // Filter Valorant products
      const valorantProducts = response.data.data?.filter(p => 
        p.game?.toLowerCase().includes('valorant') ||
        p.code?.toLowerCase().includes('valorant') ||
        p.name?.toLowerCase().includes('valorant')
      ) || [];
      
      console.log(`\nFound ${valorantProducts.length} Valorant products:\n`);
      
      valorantProducts.slice(0, 10).forEach(p => {
        console.log(`- ${p.code}: ${p.name} (Rp ${p.price})`);
      });
      
    } else {
      console.log('✗ FAILED:', response.data.error_msg || response.data.message);
    }
    
  } catch (error) {
    console.log('\n✗ REQUEST FAILED');
    console.log('Error:', error.message);
    
    if (error.response) {
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runTests() {
  await testRawAPI();
  await testPriceList();
  
  console.log('\n\n=========================');
  console.log('TROUBLESHOOTING:');
  console.log('');
  console.log('If "No response received":');
  console.log('- Check ApiGames dashboard is accessible');
  console.log('- Try https://member.apigames.id');
  console.log('- Verify endpoint URL is correct');
  console.log('');
  console.log('If "Unauthorized" or "Invalid signature":');
  console.log('- Check Merchant ID is correct');
  console.log('- Check Secret Key is correct');
  console.log('- Copy credentials again from dashboard');
}

runTests();