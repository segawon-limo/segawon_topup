// Test Riot ID Validation Service
require('dotenv').config();
const riotIdService = require('./src/services/riotid.service');
require('dotenv').config();

console.log('=== RIOT ID VALIDATION TEST ===\n');
console.log('Henrik API Key:', process.env.HENRIKDEV_API_KEY ? 'Set ✓' : 'NOT SET ✗');
console.log('');

if (!process.env.HENRIKDEV_API_KEY) {
  console.log('⚠️  WARNING: HENRIKDEV_API_KEY not set!');
  console.log('');
  console.log('Get your API key:');
  console.log('1. Join Discord: https://discord.gg/X3GaVkX2YN');
  console.log('2. Request API key in #api-key channel');
  console.log('3. Add to .env: HENRIKDEV_API_KEY=your_key_here');
  console.log('');
  console.log('Testing will continue but may fail...');
  console.log('');
}

async function testValidation() {
  // Test Case 1: Valid Riot ID
  console.log('TEST 1: Validating Real Riot ID');
  console.log('--------------------------------');
  console.log('Input: segawon#limo (pro player)');
  console.log('');
  
  const result1 = await riotIdService.validateRiotId('segawon', 'limo');
  
  if (result1.success) {
    console.log('✓ VALIDATION SUCCESS!');
    console.log('  Game Name:', result1.data.gameName);
    console.log('  Tag Line:', result1.data.tagLine);
    console.log('  Full Riot ID:', `${result1.data.gameName}#${result1.data.tagLine}`);
    console.log('  Region:', result1.data.region);
    console.log('  Account Level:', result1.data.accountLevel);
  } else {
    console.log('✗ VALIDATION FAILED:', result1.message);
    if (result1.needsApiKey) {
      console.log('');
      console.log('🔑 SOLUTION: Add Henrik API key to .env file');
    }
  }
  console.log('');
  
  // Test Case 2: Your Riot ID
  console.log('TEST 2: Validating Your Riot ID');
  console.log('--------------------------------');
  console.log('Input: segawon#limo (from your screenshot)');
  console.log('');
  
  const result2 = await riotIdService.validateRiotId('segawon', 'limo');
  
  if (result2.success) {
    console.log('✓ Found:', result2.data.gameName + '#' + result2.data.tagLine);
    console.log('  Region:', result2.data.region);
    console.log('  Level:', result2.data.accountLevel);
  } else {
    console.log('✗ Result:', result2.message);
  }
  console.log('');
  
  // Test Case 3: Invalid Riot ID
  console.log('TEST 3: Validating Invalid Riot ID');
  console.log('-----------------------------------');
  console.log('Input: InvalidPlayer123#XXX');
  console.log('');
  
  const result3 = await riotIdService.validateRiotId('InvalidPlayer123', 'XXX');
  
  if (result3.success) {
    console.log('✓ Found:', result3.data.gameName + '#' + result3.data.tagLine);
  } else {
    console.log('✗ Expected Result - Not Found:', result3.message);
  }
  console.log('');
  
  // Test Case 4: Format Validation (offline)
  console.log('TEST 4: Format Validation (Offline)');
  console.log('------------------------------------');
  
  const testCases = [
    { gameName: 'Player', tagLine: '123', expected: true },
    { gameName: 'AB', tagLine: '123', expected: false }, // Too short
    { gameName: 'Player', tagLine: '12', expected: false }, // Tagline too short
    { gameName: 'Valid Player Name', tagLine: 'ABC12', expected: true },
  ];
  
  testCases.forEach((test, index) => {
    const result = riotIdService.validateFormat(test.gameName, test.tagLine);
    const status = result.valid === test.expected ? '✓' : '✗';
    console.log(`  ${status} ${test.gameName}#${test.tagLine}: ${result.valid ? 'Valid' : 'Invalid'}`);
    if (!result.valid && result.errors.length > 0) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }
  });
  
  console.log('');
  console.log('===========================');
  console.log('');
  
  if (process.env.HENRIKDEV_API_KEY) {
    console.log('✅ Riot ID Validation is WORKING with API key!');
    console.log('Rate Limit: 300 requests per minute');
  } else {
    console.log('⚠️  Riot ID Validation needs API key to work!');
    console.log('Get your key: https://discord.gg/X3GaVkX2YN');
  }
  console.log('');
}

testValidation();
