// Test VIP Reseller Transaction - Create Order
const vipResellerService = require('./src/services/vipreseller-working.service');
require('dotenv').config();

console.log('=== VIP RESELLER TRANSACTION TEST ===\n');

async function testTransaction() {
  console.log('Creating test order...');
  console.log('Product: 475 VP (VAL475-S10)');
  console.log('Riot ID: segawon#limo');
  console.log('');
  
  // IMPORTANT: This will create a REAL transaction!
  // Make sure you have sufficient balance
  
  const orderData = {
    productCode: 'VAL475-S10',  // Smallest product for testing
    userId: 'segawon',           // RiotID
    gameTag: 'limo',             // Tagline
    orderNumber: 'TEST_' + Date.now(),
  };
  
  console.log('Order Data:', orderData);
  console.log('');
  console.log('⚠️  WARNING: This will create a REAL order and deduct balance!');
  console.log('');
  
  // Uncomment this section when you're ready to test
  /*
  try {
    const result = await vipResellerService.createTransaction(orderData);
    
    console.log('Transaction Result:');
    console.log('-------------------');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    
    if (result.success) {
      console.log('✓ ORDER SUCCESS!');
      console.log('');
      console.log('Transaction Details:');
      console.log('  Transaction ID:', result.data.transactionId);
      console.log('  Status:', result.data.status);
      console.log('  Message:', result.data.message);
      console.log('  Price:', result.data.price);
      
      if (result.data.serialNumber) {
        console.log('  Serial Number:', result.data.serialNumber);
      }
      
      console.log('');
      console.log('Next: Check transaction status');
      console.log('---');
      console.log('Run: node test-vipreseller-status.js ' + result.data.transactionId);
      
    } else {
      console.log('✗ ORDER FAILED');
      console.log('  Error:', result.message);
      console.log('  Code:', result.code);
    }
    
  } catch (error) {
    console.log('✗ ERROR:', error.message);
  }
  */
  
  console.log('TO RUN REAL TRANSACTION:');
  console.log('1. Uncomment the transaction code above');
  console.log('2. Make sure VIP Reseller balance sufficient (min Rp 60.000)');
  console.log('3. Verify Riot ID: segawon#limo exists');
  console.log('4. Run: node test-vipreseller-transaction.js');
  console.log('');
}

// Also test with checking balance first
async function checkBalanceFirst() {
  console.log('Checking balance first...');
  console.log('');
  
  const balance = await vipResellerService.checkBalance();
  
  if (balance.success) {
    console.log('✓ Current Balance:', balance.data.balance);
    console.log('');
    
    if (balance.data.balance < 60000) {
      console.log('⚠️  WARNING: Insufficient balance for testing!');
      console.log('   Required: Rp 60.000 (for 475 VP)');
      console.log('   Current: Rp', balance.data.balance.toLocaleString('id-ID'));
      console.log('');
      console.log('Please top-up balance in VIP Reseller dashboard first.');
      return false;
    } else {
      console.log('✓ Balance sufficient for testing!');
      console.log('');
      return true;
    }
  } else {
    console.log('✗ Failed to check balance:', balance.message);
    return false;
  }
}

async function run() {
  const hasBalance = await checkBalanceFirst();
  
  if (hasBalance) {
    await testTransaction();
  }
}

run();
