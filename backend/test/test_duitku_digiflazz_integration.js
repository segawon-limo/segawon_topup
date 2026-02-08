/**
 * Test Script: Duitku Callback + Digiflazz Integration
 * 
 * Usage:
 *   node test-duitku-digiflazz-integration.js
 */

require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE;
const API_KEY = process.env.DUITKU_API_KEY;

console.log('🧪 Testing Duitku + Digiflazz Integration\n');

/**
 * Test 1: Check Digiflazz Connection
 */
async function testDigiflazzConnection() {
  console.log('1️⃣ Testing Digiflazz Connection...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/test/digiflazz-balance`);
    
    if (response.data.success) {
      console.log('✅ Digiflazz Connected');
      console.log('   Balance:', response.data.balance);
    } else {
      console.log('❌ Digiflazz Connection Failed');
      console.log('   Error:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('');
}

/**
 * Test 2: Create Test Order
 */
async function createTestOrder() {
  console.log('2️⃣ Creating Test Order...');
  
  try {
    // Get first available product
    const productsResponse = await axios.get(`${BASE_URL}/api/products`);
    
    if (!productsResponse.data || productsResponse.data.length === 0) {
      console.log('❌ No products available');
      return null;
    }
    
    const product = productsResponse.data[0];
    console.log('   Product:', product.name);
    
    // Create order
    const orderData = {
      productId: product.id,
      gameUserId: 'TestPlayer123',
      gameUserTag: '0001',
      email: 'test@segawontopup.net',
      phone: '081234567890',
      customerName: 'Test User'
    };
    
    const orderResponse = await axios.post(`${BASE_URL}/api/orders`, orderData);
    
    console.log('✅ Order Created');
    console.log('   Order Number:', orderResponse.data.orderNumber);
    console.log('   Amount:', orderResponse.data.totalAmount);
    
    return orderResponse.data;
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Test 3: Simulate Duitku Callback
 */
async function simulateDuitkuCallback(orderNumber, amount) {
  console.log('3️⃣ Simulating Duitku Callback...');
  
  try {
    // Generate signature
    const signatureData = MERCHANT_CODE + amount + orderNumber + API_KEY;
    const signature = crypto.createHash('md5').update(signatureData).digest('hex');
    
    const callbackData = {
      merchantCode: MERCHANT_CODE,
      amount: amount.toString(),
      merchantOrderId: orderNumber,
      productDetail: 'Test Product',
      resultCode: '00', // Success
      reference: 'REF-' + Date.now(),
      signature: signature,
      paymentCode: 'BC',
      settlementDate: new Date().toISOString()
    };
    
    console.log('   Callback Data:');
    console.log('   - Order:', orderNumber);
    console.log('   - Amount:', amount);
    console.log('   - Signature:', signature.substring(0, 20) + '...');
    
    const response = await axios.post(
      `${BASE_URL}/api/duitku/callback`,
      callbackData
    );
    
    if (response.data === 'success' || response.status === 200) {
      console.log('✅ Callback Processed');
      return true;
    } else {
      console.log('❌ Callback Failed');
      console.log('   Response:', response.data);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 4: Check Order Status
 */
async function checkOrderStatus(orderNumber) {
  console.log('4️⃣ Checking Order Status...');
  
  try {
    // Wait a bit for processing
    console.log('   Waiting 3 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const response = await axios.get(`${BASE_URL}/api/orders/${orderNumber}`);
    const order = response.data;
    
    console.log('✅ Order Status Retrieved');
    console.log('   Payment Status:', order.payment_status);
    console.log('   Order Status:', order.order_status);
    console.log('   Provider Order ID:', order.provider_order_id || 'N/A');
    console.log('   Serial Number:', order.provider_serial_number || 'N/A');
    
    if (order.notes) {
      console.log('   Notes:', order.notes);
    }
    
    // Show provider response if available
    if (order.provider_response) {
      try {
        const providerData = JSON.parse(order.provider_response);
        console.log('   Provider Status:', providerData.status || 'N/A');
        console.log('   Provider Message:', providerData.message || 'N/A');
      } catch (e) {
        // Skip if not JSON
      }
    }
    
    return order;
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * Main Test Flow
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 DUITKU + DIGIFLAZZ INTEGRATION TEST');
  console.log('='.repeat(60));
  console.log('');
  
  // Test 1: Digiflazz Connection
  await testDigiflazzConnection();
  
  // Test 2: Create Order
  console.log('');
  const order = await createTestOrder();
  
  if (!order) {
    console.log('❌ Cannot proceed without order');
    return;
  }
  
  // Test 3: Simulate Payment Callback
  console.log('');
  const callbackSuccess = await simulateDuitkuCallback(
    order.orderNumber,
    order.totalAmount
  );
  
  if (!callbackSuccess) {
    console.log('❌ Callback failed, but checking status anyway...');
  }
  
  // Test 4: Check Final Status
  console.log('');
  const finalOrder = await checkOrderStatus(order.orderNumber);
  
  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (finalOrder) {
    const paymentSuccess = finalOrder.payment_status === 'success';
    const orderCompleted = finalOrder.order_status === 'completed';
    const hasSerial = !!finalOrder.provider_serial_number;
    
    console.log('Payment Gateway (Duitku):', paymentSuccess ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Topup Provider (Digiflazz):', orderCompleted ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Serial Number Received:', hasSerial ? '✅ YES' : '⚠️  NO');
    
    if (orderCompleted && hasSerial) {
      console.log('');
      console.log('🎉 FULL INTEGRATION SUCCESS!');
      console.log('   The order was paid and topup completed automatically.');
    } else if (paymentSuccess && !orderCompleted) {
      console.log('');
      console.log('⚠️  PARTIAL SUCCESS');
      console.log('   Payment received but topup failed or pending.');
      console.log('   Check logs for Digiflazz errors.');
    } else {
      console.log('');
      console.log('❌ INTEGRATION FAILED');
      console.log('   Please check logs and configuration.');
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('💡 TIP: Check backend console logs for detailed processing info');
  console.log('');
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test Error:', error);
  process.exit(1);
});