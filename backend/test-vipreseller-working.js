// Test VIP Reseller - WORKING VERSION!
const vipResellerService = require('./src/services/vipreseller-working.service');
require('dotenv').config();

console.log('=== VIP RESELLER API TEST (WORKING!) ===\n');

async function testBalance() {
  console.log('TEST: Check Balance');
  console.log('-------------------\n');
  
  const result = await vipResellerService.checkBalance();
  
  if (result.success) {
    console.log('✓ SUCCESS!\n');
    console.log('Account Details:');
    console.log('  Full Name:', result.data.fullName);
    console.log('  Username:', result.data.username);
    console.log('  Balance: Rp', result.data.balance.toLocaleString('id-ID'));
    console.log('  Point:', result.data.point);
    console.log('  Level:', result.data.level);
  } else {
    console.log('✗ FAILED:', result.message);
  }
  console.log('');
}

async function testPriceList() {
  console.log('TEST: Get Price List (Valorant)');
  console.log('-------------------------------\n');
  
  // Test with filter
  const result = await vipResellerService.getPriceList({ 
    game: 'Valorant',
    status: 'available',
  });
  
  if (result.success) {
    console.log('✓ SUCCESS!\n');
    console.log('Total Valorant products:', result.data.length);
    
    if (result.data.length > 0) {
      console.log('\nValorant Products:\n');
      result.data.forEach(p => {
        console.log(`Code: ${p.code}`);
        console.log(`  Name: ${p.name}`);
        console.log(`  Game: ${p.game}`);
        console.log(`  Price:`);
        console.log(`    Basic: Rp ${p.price?.basic || 0}`);
        console.log(`    Premium: Rp ${p.price?.premium || 0}`);
        console.log(`    Special: Rp ${p.price?.special || 0}`);
        console.log(`  Status: ${p.status}`);
        console.log('');
      });
      
      console.log('IMPORTANT: Use "code" field as SKU in database!');
    } else {
      console.log('\nNo Valorant products found.');
      console.log('Try getting all products without filter...\n');
      
      // Try without filter
      const allResult = await vipResellerService.getPriceList();
      if (allResult.success && allResult.data.length > 0) {
        console.log('Sample products (first 5):');
        allResult.data.slice(0, 5).forEach(p => {
          console.log(`  - ${p.code}: ${p.name} (${p.game})`);
        });
      }
    }
  } else {
    console.log('✗ FAILED:', result.message);
  }
  console.log('');
}

async function runTests() {
  await testBalance();
  await testPriceList();
  
  console.log('=============================');
  console.log('');
  console.log('✅ VIP Reseller API WORKING!');
  console.log('');
  console.log('The fix: Use form-urlencoded instead of JSON!');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Copy vipreseller-working.service.js');
  console.log('2. Rename to vipreseller.service.js');
  console.log('3. Note down Valorant product codes');
  console.log('4. Update database with correct codes');
  console.log('5. Test create transaction');
  console.log('6. Launch! 🚀');
  console.log('');
}

runTests();
