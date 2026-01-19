// backend/test/test-digiflazz.js
// Complete testing script for Digiflazz service

require('dotenv').config();
const digiflazzService = require('../src/services/digiflazz.service');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function separator() {
  console.log('\n' + '='.repeat(60) + '\n');
}

// Test 1: Check Balance
async function testCheckBalance() {
  separator();
  log('TEST 1: Check Balance', 'bright');
  log('Testing digiflazzService.checkBalance()', 'cyan');
  
  try {
    const result = await digiflazzService.checkBalance();
    
    if (result.success) {
      log('✓ Success!', 'green');
      log(`Balance: Rp ${result.balance.toLocaleString('id-ID')}`, 'green');
      
      // Warning if balance is low
      if (result.balance < 100000) {
        log('⚠️  Warning: Balance is low! Consider top-up.', 'yellow');
      }
    } else {
      log('✗ Failed!', 'red');
      log('Error: ' + result.message, 'red');
    }
    
    return result;
  } catch (error) {
    log('✗ Error: ' + error.message, 'red');
    return { success: false, error: error.message };
  }
}

// Test 2: Get All Products
async function testGetPriceList() {
  separator();
  log('TEST 2: Get Price List (All Products)', 'bright');
  log('Testing digiflazzService.getPriceList()', 'cyan');
  
  try {
    const result = await digiflazzService.getPriceList();
    
    if (result.success) {
      log('✓ Success!', 'green');
      log(`Total products: ${result.data.length}`, 'green');
      
      // Show first 5 products as sample
      log('\nFirst 5 products:', 'yellow');
      result.data.slice(0, 5).forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.product_name}`);
        console.log(`   SKU: ${product.buyer_sku_code}`);
        console.log(`   Brand: ${product.brand}`);
        console.log(`   Price: Rp ${product.price.toLocaleString('id-ID')}`);
        console.log(`   Selling: Rp ${product.selling_price.toLocaleString('id-ID')}`);
        console.log(`   Status: ${product.buyer_product_status ? 'Available ✓' : 'Not Available ✗'}`);
      });
      
      log(`\n... and ${result.data.length - 5} more products`, 'yellow');
    } else {
      log('✗ Failed!', 'red');
      log('Error: ' + result.message, 'red');
    }
    
    return result;
  } catch (error) {
    log('✗ Error: ' + error.message, 'red');
    return { success: false, error: error.message };
  }
}

// Test 3: Get Valorant Products
async function testGetValorantProducts() {
  separator();
  log('TEST 3: Get Valorant Products', 'bright');
  log('Testing digiflazzService.getProductsByGame("valorant")', 'cyan');
  
  try {
    const result = await digiflazzService.getProductsByGame('valorant');
    
    if (result.success) {
      log('✓ Success!', 'green');
      log(`Found ${result.data.length} Valorant products`, 'green');
      
      if (result.data.length > 0) {
        log('\nValorant Products:', 'yellow');
        result.data.forEach((product, index) => {
          console.log(`\n${index + 1}. ${product.product_name}`);
          console.log(`   SKU: ${product.buyer_sku_code}`);
          console.log(`   Price: Rp ${product.price.toLocaleString('id-ID')}`);
          console.log(`   Selling: Rp ${product.selling_price.toLocaleString('id-ID')}`);
          console.log(`   Margin: Rp ${(product.selling_price - product.price).toLocaleString('id-ID')}`);
          console.log(`   Status: ${product.buyer_product_status ? 'Available ✓' : 'Not Available ✗'}`);
        });
      } else {
        log('No Valorant products found. Try "Mobile Legends" or "Free Fire"', 'yellow');
      }
    } else {
      log('✗ Failed!', 'red');
      log('Error: ' + result.message, 'red');
    }
    
    return result;
  } catch (error) {
    log('✗ Error: ' + error.message, 'red');
    return { success: false, error: error.message };
  }
}

// Test 4: Get Mobile Legends Products
async function testGetMLProducts() {
  separator();
  log('TEST 4: Get Mobile Legends Products', 'bright');
  log('Testing digiflazzService.getProductsByGame("mobile legends")', 'cyan');
  
  try {
    const result = await digiflazzService.getProductsByGame('mobile legends');
    
    if (result.success) {
      log('✓ Success!', 'green');
      log(`Found ${result.data.length} Mobile Legends products`, 'green');
      
      if (result.data.length > 0) {
        log('\nFirst 10 ML Products:', 'yellow');
        result.data.slice(0, 10).forEach((product, index) => {
          console.log(`\n${index + 1}. ${product.product_name}`);
          console.log(`   SKU: ${product.buyer_sku_code}`);
          console.log(`   Price: Rp ${product.price.toLocaleString('id-ID')}`);
          console.log(`   Status: ${product.buyer_product_status ? '✓' : '✗'}`);
        });
        
        if (result.data.length > 10) {
          log(`\n... and ${result.data.length - 10} more ML products`, 'yellow');
        }
      }
    } else {
      log('✗ Failed!', 'red');
      log('Error: ' + result.message, 'red');
    }
    
    return result;
  } catch (error) {
    log('✗ Error: ' + error.message, 'red');
    return { success: false, error: error.message };
  }
}

// Test 5: Search Product by SKU
async function testGetProductBySKU(sku) {
  separator();
  log('TEST 5: Search Product by SKU', 'bright');
  log(`Testing digiflazzService.getProductBySKU("${sku}")`, 'cyan');
  
  try {
    const result = await digiflazzService.getProductBySKU(sku);
    
    if (result.success) {
      log('✓ Success! Product found:', 'green');
      const product = result.data;
      console.log(`\nProduct: ${product.product_name}`);
      console.log(`SKU: ${product.buyer_sku_code}`);
      console.log(`Brand: ${product.brand}`);
      console.log(`Category: ${product.category}`);
      console.log(`Type: ${product.type}`);
      console.log(`Price: Rp ${product.price.toLocaleString('id-ID')}`);
      console.log(`Selling: Rp ${product.selling_price.toLocaleString('id-ID')}`);
      console.log(`Margin: Rp ${(product.selling_price - product.price).toLocaleString('id-ID')}`);
      console.log(`Multi: ${product.multi ? 'Yes' : 'No'}`);
      console.log(`Status: ${product.buyer_product_status ? 'Available ✓' : 'Not Available ✗'}`);
      
      if (product.desc && product.desc.length > 0) {
        console.log(`\nDescription:`);
        product.desc.forEach(line => console.log(`  - ${line}`));
      }
    } else {
      log('✗ Failed!', 'red');
      log('Error: ' + result.message, 'red');
      log('Tip: Try running test 3 to see available Valorant SKUs', 'yellow');
    }
    
    return result;
  } catch (error) {
    log('✗ Error: ' + error.message, 'red');
    return { success: false, error: error.message };
  }
}

// Test 6: Create Test Transaction (Sandbox Mode)
async function testCreateTransaction() {
  separator();
  log('TEST 6: Create Transaction (Testing Mode)', 'bright');
  log('⚠️  This will create a TEST transaction (not real)', 'yellow');
  
  // Check if testing mode is enabled
  if (process.env.DIGIFLAZZ_TESTING !== 'true') {
    log('✗ Skipped! Testing mode is not enabled.', 'yellow');
    log('To enable: Set DIGIFLAZZ_TESTING=true in .env', 'yellow');
    return { success: false, message: 'Testing mode not enabled' };
  }
  
  try {
    log('Creating test transaction...', 'cyan');
    
    const result = await digiflazzService.createTransaction({
      sku: 'valorant125', // Example SKU (adjust if different)
      customerNo: 'TestUser#TAG',
      orderNumber: 'TEST-' + Date.now(),
    });
    
    if (result.success) {
      log('✓ Transaction Created!', 'green');
      console.log(`\nRef ID: ${result.data.ref_id}`);
      console.log(`Status: ${result.data.status}`);
      console.log(`Message: ${result.data.message}`);
      console.log(`Order Status: ${result.data.order_status}`);
      
      if (result.data.sn) {
        console.log(`Serial Number: ${result.data.sn}`);
      }
      
      if (result.data.balance) {
        console.log(`Remaining Balance: Rp ${result.data.balance.toLocaleString('id-ID')}`);
      }
    } else {
      log('✗ Failed!', 'red');
      log('Error: ' + result.message, 'red');
      
      if (result.message.includes('saldo')) {
        log('Tip: Check your balance with test 1', 'yellow');
      }
      if (result.message.includes('sku')) {
        log('Tip: Check available SKUs with test 3', 'yellow');
      }
    }
    
    return result;
  } catch (error) {
    log('✗ Error: ' + error.message, 'red');
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runAllTests() {
  console.clear();
  log('\n🚀 DIGIFLAZZ SERVICE TESTING SUITE\n', 'bright');
  
  log('Environment:', 'cyan');
  log(`Username: ${process.env.DIGIFLAZZ_USERNAME || '(not set)'}`, 'cyan');
  log(`API Key: ${process.env.DIGIFLAZZ_PRODUCTION_KEY ? '***' + process.env.DIGIFLAZZ_PRODUCTION_KEY.slice(-4) : '(not set)'}`, 'cyan');
  log(`Testing Mode: ${process.env.DIGIFLAZZ_TESTING === 'true' ? 'Enabled ✓' : 'Disabled'}`, 'cyan');
  
  // Check credentials
  if (!process.env.DIGIFLAZZ_USERNAME || !process.env.DIGIFLAZZ_PRODUCTION_KEY) {
    log('\n✗ Error: Digiflazz credentials not found in .env!', 'red');
    log('Please add:', 'yellow');
    log('  DIGIFLAZZ_USERNAME=your_username', 'yellow');
    log('  DIGIFLAZZ_PRODUCTION_KEY=your_key', 'yellow');
    return;
  }
  
  const results = {};
  
  // Run tests sequentially
  results.balance = await testCheckBalance();
  await sleep(2000); // Wait 2s between tests
  
  results.priceList = await testGetPriceList();
  await sleep(2000);
  
  results.valorant = await testGetValorantProducts();
  await sleep(2000);
  
  results.ml = await testGetMLProducts();
  await sleep(2000);
  
  // If Valorant products exist, test specific SKU
  if (results.valorant.success && results.valorant.data.length > 0) {
    const firstSKU = results.valorant.data[0].buyer_sku_code;
    results.productBySKU = await testGetProductBySKU(firstSKU);
    await sleep(2000);
  }
  
  // Only run transaction test if explicitly enabled
  if (process.env.DIGIFLAZZ_TESTING === 'true') {
    results.transaction = await testCreateTransaction();
  }
  
  // Summary
  separator();
  log('📊 TEST SUMMARY', 'bright');
  separator();
  
  const testNames = {
    balance: 'Check Balance',
    priceList: 'Get Price List',
    valorant: 'Get Valorant Products',
    ml: 'Get Mobile Legends Products',
    productBySKU: 'Search Product by SKU',
    transaction: 'Create Transaction',
  };
  
  let passed = 0;
  let failed = 0;
  
  Object.entries(results).forEach(([key, result]) => {
    const status = result && result.success ? '✓ PASS' : '✗ FAIL';
    const color = result && result.success ? 'green' : 'red';
    
    log(`${status} - ${testNames[key]}`, color);
    
    if (result && result.success) passed++;
    else failed++;
  });
  
  separator();
  log(`Total: ${passed + failed} tests`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'cyan');
  separator();
  
  if (passed === passed + failed) {
    log('🎉 All tests passed! Digiflazz service is ready!', 'green');
  } else {
    log('⚠️  Some tests failed. Check errors above.', 'yellow');
  }
}

// Helper: Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run specific test based on command line argument
async function runSpecificTest() {
  const testArg = process.argv[2];
  
  if (!testArg) {
    // No argument, run all tests
    await runAllTests();
    return;
  }
  
  console.clear();
  
  switch(testArg.toLowerCase()) {
    case 'balance':
    case '1':
      await testCheckBalance();
      break;
      
    case 'pricelist':
    case 'all':
    case '2':
      await testGetPriceList();
      break;
      
    case 'valorant':
    case 'val':
    case '3':
      await testGetValorantProducts();
      break;
      
    case 'ml':
    case 'mobilelegends':
    case '4':
      await testGetMLProducts();
      break;
      
    case 'sku':
    case '5':
      if (!process.argv[3]) {
        log('Error: Please provide SKU code', 'red');
        log('Usage: node test-digiflazz.js sku <sku_code>', 'yellow');
        log('Example: node test-digiflazz.js sku valorant125', 'yellow');
      } else {
        await testGetProductBySKU(process.argv[3]);
      }
      break;
      
    case 'transaction':
    case 'test':
    case '6':
      await testCreateTransaction();
      break;
      
    default:
      log('Unknown test: ' + testArg, 'red');
      log('\nAvailable tests:', 'yellow');
      log('  balance (1)     - Check balance', 'cyan');
      log('  pricelist (2)   - Get all products', 'cyan');
      log('  valorant (3)    - Get Valorant products', 'cyan');
      log('  ml (4)          - Get Mobile Legends products', 'cyan');
      log('  sku (5) <code>  - Search product by SKU', 'cyan');
      log('  transaction (6) - Create test transaction', 'cyan');
      log('\nOr run without arguments to run all tests', 'yellow');
  }
  
  separator();
}

// Run!
runSpecificTest().catch(error => {
  log('\n✗ Fatal Error: ' + error.message, 'red');
  console.error(error);
});
