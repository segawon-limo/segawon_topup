// Simple test untuk VIP Reseller API
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const API_ID = process.env.VIPRESELLER_API_ID;
const API_KEY = process.env.VIPRESELLER_API_KEY;
const ENDPOINT = 'https://vip-reseller.co.id/api';

console.log('Testing VIP Reseller API...\n');
console.log('API ID:', API_ID ? 'Set ✓' : 'NOT SET ✗');
console.log('API KEY:', API_KEY ? 'Set ✓' : 'NOT SET ✗');
console.log('');

// Test 1: Check Balance
async function testBalance() {
  try {
    console.log('1. Testing Balance...');
    
    const sign = crypto.createHash('md5').update(API_ID + API_KEY).digest('hex');
    
    const payload = {
      key: API_KEY,
      sign: sign,
    };
    
    const response = await axios.post(`${ENDPOINT}/profile`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.result) {
      console.log('✓ Balance Check SUCCESS');
      console.log('  Balance:', response.data.data.balance);
      console.log('  Username:', response.data.data.username);
    } else {
      console.log('✗ Balance Check FAILED');
      console.log('  Message:', response.data.message);
    }
  } catch (error) {
    console.log('✗ Balance Check ERROR');
    console.log('  Error:', error.response?.data || error.message);
  }
  console.log('');
}

// Test 2: Get Products (filter by Valorant)
async function testProducts() {
  try {
    console.log('2. Testing Get Products (Valorant)...');
    
    const requestData = {
      filter_type: 'game',
      filter_value: 'valorant'
    };
    
    const sign = crypto.createHash('md5').update(API_ID + API_KEY + JSON.stringify(requestData)).digest('hex');
    
    const payload = {
      key: API_KEY,
      sign: sign,
      ...requestData,
    };
    
    const response = await axios.post(`${ENDPOINT}/game-feature`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.data.result) {
      console.log('✓ Get Products SUCCESS');
      console.log('  Found', Array.isArray(response.data.data) ? response.data.data.length : 'N/A', 'products');
      
      if (Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log('  Sample product:', response.data.data[0]?.name || response.data.data[0]);
      }
    } else {
      console.log('✗ Get Products FAILED');
      console.log('  Message:', response.data.message);
    }
  } catch (error) {
    console.log('✗ Get Products ERROR');
    console.log('  Error:', error.response?.data || error.message);
  }
  console.log('');
}

// Test 3: Check Product Detail
async function testProductDetail() {
  try {
    console.log('3. Testing Product Detail (VAL475-S10)...');
    
    const requestData = {
      type: 'services',
      code: 'VAL475-S10'
    };
    
    const sign = crypto.createHash('md5').update(API_ID + API_KEY + JSON.stringify(requestData)).digest('hex');
    
    const payload = {
      key: API_KEY,
      sign: sign,
      ...requestData,
    };
    
    const response = await axios.post(`${ENDPOINT}/game-feature`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.data.result) {
      console.log('✓ Product Detail SUCCESS');
      console.log('  Product:', JSON.stringify(response.data.data, null, 2));
    } else {
      console.log('✗ Product Detail FAILED');
      console.log('  Message:', response.data.message);
    }
  } catch (error) {
    console.log('✗ Product Detail ERROR');
    console.log('  Error:', error.response?.data || error.message);
  }
  console.log('');
}

// Run all tests
async function runTests() {
  if (!API_ID || !API_KEY) {
    console.log('ERROR: API_ID or API_KEY not set in .env file!');
    console.log('Please add:');
    console.log('  VIPRESELLER_API_ID=your_api_id');
    console.log('  VIPRESELLER_API_KEY=your_api_key');
    return;
  }
  
  await testBalance();
  await testProducts();
  await testProductDetail();
  
  console.log('===== TESTING COMPLETE =====');
}

runTests();
