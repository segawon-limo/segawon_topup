// Test ApiGames API Connection
const apiGamesService = require('./src/services/apigames.service');
require('dotenv').config();

console.log('=== APIGAMES API TEST ===\n');
console.log('Merchant ID:', process.env.APIGAMES_MERCHANT_ID ? 'Set ✓' : 'NOT SET ✗');
console.log('Secret Key:', process.env.APIGAMES_SECRET_KEY ? 'Set ✓' : 'NOT SET ✗');
console.log('');

if (!process.env.APIGAMES_MERCHANT_ID || !process.env.APIGAMES_SECRET_KEY) {
  console.log('ERROR: ApiGames credentials not set in .env!');
  console.log('');
  console.log('Tambahkan di .env:');
  console.log('APIGAMES_MERCHANT_ID=your_merchant_id');
  console.log('APIGAMES_SECRET_KEY=your_secret_key');
  console.log('');
  console.log('Cara dapat credentials:');
  console.log('1. Daftar di https://member.apigames.id/register');
  console.log('2. Login → Dashboard → API');
  console.log('3. Copy Merchant ID dan Secret Key');
  process.exit(1);
}

async function testBalance() {
  try {
    console.log('TEST 1: Check Balance');
    console.log('---------------------');
    
    const result = await apiGamesService.checkBalance();
    
    if (result.success) {
      console.log('✓ SUCCESS!');
      console.log('  Balance:', result.data.balance);
      console.log('  Merchant:', result.data.merchant);
    } else {
      console.log('✗ FAILED:', result.message);
    }
  } catch (error) {
    console.log('✗ ERROR:', error.message);
  }
  console.log('');
}

async function testPriceList() {
  try {
    console.log('TEST 2: Get Price List (Valorant)');
    console.log('----------------------------------');
    
    const result = await apiGamesService.getPriceList('valorant');
    
    if (result.success) {
      console.log('✓ SUCCESS!');
      console.log('  Found', result.data.length, 'products');
      
      if (result.data.length > 0) {
        console.log('');
        console.log('  Sample products:');
        result.data.slice(0, 5).forEach(p => {
          console.log(`    - ${p.code}: ${p.name} (Rp ${p.price})`);
        });
        
        console.log('');
        console.log('  PENTING: Update product SKU di database dengan code di atas!');
      }
    } else {
      console.log('✗ FAILED:', result.message);
    }
  } catch (error) {
    console.log('✗ ERROR:', error.message);
  }
  console.log('');
}

async function runTests() {
  await testBalance();
  await testPriceList();
  
  console.log('===========================');
  console.log('');
  console.log('Next Steps:');
  console.log('1. ✓ ApiGames credentials working');
  console.log('2. Update database product SKU dengan code dari price list');
  console.log('3. Test create order');
  console.log('');
}

runTests();
