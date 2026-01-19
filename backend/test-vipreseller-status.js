// Check VIP Reseller Transaction Status
const vipResellerService = require('./src/services/vipreseller-working.service');
require('dotenv').config();

// Get transaction ID from command line argument
const transactionId = process.argv[2];

console.log('=== VIP RESELLER STATUS CHECK ===\n');

if (!transactionId) {
  console.log('Usage: node test-vipreseller-status.js <transaction_id>');
  console.log('');
  console.log('Example:');
  console.log('  node test-vipreseller-status.js TRX123456789');
  console.log('');
  process.exit(1);
}

async function checkStatus() {
  console.log('Checking status for:', transactionId);
  console.log('');
  
  try {
    const result = await vipResellerService.checkTransactionStatus(transactionId);
    
    console.log('Status Result:');
    console.log('-------------');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    
    if (result.success) {
      console.log('✓ STATUS RETRIEVED');
      console.log('');
      console.log('Transaction Status:', result.data.status);
      
      // Interpret status
      if (result.data.status === 'success') {
        console.log('');
        console.log('🎉 Transaction completed successfully!');
        if (result.data.sn) {
          console.log('   Serial Number:', result.data.sn);
        }
      } else if (result.data.status === 'waiting' || result.data.status === 'pending') {
        console.log('');
        console.log('⏳ Transaction is being processed...');
        console.log('   Check again in a few moments.');
      } else if (result.data.status === 'failed') {
        console.log('');
        console.log('✗ Transaction failed');
        if (result.data.message) {
          console.log('   Reason:', result.data.message);
        }
      }
      
    } else {
      console.log('✗ FAILED TO GET STATUS');
      console.log('  Error:', result.message);
    }
    
  } catch (error) {
    console.log('✗ ERROR:', error.message);
  }
}

checkStatus();
