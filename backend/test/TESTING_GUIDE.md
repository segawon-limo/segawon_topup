# 🧪 Digiflazz Service Testing Guide

## 🚀 Quick Start

### Step 1: Setup

```bash
# 1. Copy test-digiflazz.js to backend/test/
cp test-digiflazz.js backend/test/

# 2. Make sure .env has Digiflazz credentials
# backend/.env should have:
DIGIFLAZZ_USERNAME=your_username
DIGIFLAZZ_PRODUCTION_KEY=your_production_key
DIGIFLAZZ_TESTING=false
```

### Step 2: Run Tests

```bash
# Navigate to backend folder
cd backend

# Run ALL tests
node test/test-digiflazz.js

# Or run specific test (see below)
```

---

## 📋 Individual Test Commands

### Test 1: Check Balance
```bash
node test/test-digiflazz.js balance
# or
node test/test-digiflazz.js 1
```

**What it does:**
- Checks your Digiflazz account balance
- Shows remaining saldo
- Warns if balance is low

**Example output:**
```
TEST 1: Check Balance
✓ Success!
Balance: Rp 1.500.000
```

---

### Test 2: Get All Products
```bash
node test/test-digiflazz.js pricelist
# or
node test/test-digiflazz.js all
# or
node test/test-digiflazz.js 2
```

**What it does:**
- Fetches ALL products from Digiflazz
- Shows first 5 products as sample
- Displays total product count

**Example output:**
```
TEST 2: Get Price List (All Products)
✓ Success!
Total products: 1247

First 5 products:

1. Valorant 125 VP
   SKU: valorant125
   Brand: Valorant
   Price: Rp 13.000
   Selling: Rp 13.500
   Status: Available ✓

... and 1242 more products
```

---

### Test 3: Get Valorant Products
```bash
node test/test-digiflazz.js valorant
# or
node test/test-digiflazz.js val
# or
node test/test-digiflazz.js 3
```

**What it does:**
- Filters only Valorant products
- Shows all available VP packages
- Displays prices and margins

**Example output:**
```
TEST 3: Get Valorant Products
✓ Success!
Found 8 Valorant products

Valorant Products:

1. Valorant 125 VP
   SKU: valorant125
   Price: Rp 13.000
   Selling: Rp 13.500
   Margin: Rp 500
   Status: Available ✓

2. Valorant 420 VP
   SKU: valorant420
   Price: Rp 42.000
   Selling: Rp 43.500
   Margin: Rp 1.500
   Status: Available ✓

... (more products)
```

---

### Test 4: Get Mobile Legends Products
```bash
node test/test-digiflazz.js ml
# or
node test/test-digiflazz.js mobilelegends
# or
node test/test-digiflazz.js 4
```

**What it does:**
- Filters Mobile Legends products
- Shows diamonds packages
- Useful for planning ML expansion

---

### Test 5: Search Product by SKU
```bash
node test/test-digiflazz.js sku valorant125
# or
node test/test-digiflazz.js 5 valorant125
```

**What it does:**
- Searches for specific product by SKU code
- Shows detailed product information
- Displays description and specs

**Example output:**
```
TEST 5: Search Product by SKU
✓ Success! Product found:

Product: Valorant 125 VP
SKU: valorant125
Brand: Valorant
Category: Games
Type: Umum
Price: Rp 13.000
Selling: Rp 13.500
Margin: Rp 500
Multi: No
Status: Available ✓

Description:
  - Enter Riot ID correctly
  - Format: Username#TAG
  - Processing time: Instant
```

---

### Test 6: Create Test Transaction (Sandbox)
```bash
# First, enable testing mode in .env:
# DIGIFLAZZ_TESTING=true

node test/test-digiflazz.js transaction
# or
node test/test-digiflazz.js test
# or
node test/test-digiflazz.js 6
```

**⚠️ IMPORTANT:**
- Only works if `DIGIFLAZZ_TESTING=true` in .env
- Creates a TEST transaction (not real)
- Won't charge your balance in test mode
- Won't deliver actual VP

**What it does:**
- Creates a test transaction
- Tests the full API flow
- Returns test serial number

**Example output:**
```
TEST 6: Create Transaction (Testing Mode)
✓ Transaction Created!

Ref ID: TEST-1705384920123
Status: Sukses
Message: Transaksi Sukses
Order Status: completed
Serial Number: TEST123456
```

---

## 🎯 Common Use Cases

### Check if Digiflazz is working
```bash
node test/test-digiflazz.js balance
```
If this succeeds, your credentials are correct!

---

### Find Valorant product prices
```bash
node test/test-digiflazz.js valorant
```
Copy the SKU codes to map to your products table.

---

### Check specific product details
```bash
# First get list of products
node test/test-digiflazz.js valorant

# Then search specific SKU
node test/test-digiflazz.js sku valorant2400
```

---

### Test complete flow (safe)
```bash
# 1. Enable testing mode
# Edit .env: DIGIFLAZZ_TESTING=true

# 2. Run transaction test
node test/test-digiflazz.js transaction

# 3. Disable testing mode when done
# Edit .env: DIGIFLAZZ_TESTING=false
```

---

## ✅ Run All Tests at Once

```bash
node test/test-digiflazz.js
```

**This will:**
1. Check balance ✓
2. Get all products ✓
3. Get Valorant products ✓
4. Get Mobile Legends products ✓
5. Search first Valorant product ✓
6. Create test transaction (if testing mode enabled) ✓

**Example Summary:**
```
📊 TEST SUMMARY
==================================================
✓ PASS - Check Balance
✓ PASS - Get Price List
✓ PASS - Get Valorant Products
✓ PASS - Get Mobile Legends Products
✓ PASS - Search Product by SKU
==================================================
Total: 5 tests
Passed: 5
Failed: 0
==================================================
🎉 All tests passed! Digiflazz service is ready!
```

---

## 🐛 Troubleshooting

### Error: Credentials not found
```bash
# Fix: Add to backend/.env
DIGIFLAZZ_USERNAME=your_username
DIGIFLAZZ_PRODUCTION_KEY=your_key
```

### Error: Module not found
```bash
# Make sure you're in backend directory
cd backend
node test/test-digiflazz.js
```

### Error: Invalid signature
```bash
# Check your credentials are correct
# Username and API Key must match what's in Digiflazz dashboard
```

### Error: Insufficient balance
```bash
# Top-up your Digiflazz balance at:
# https://member.digiflazz.com
```

### No Valorant products found
```bash
# Digiflazz might use different product naming
# Try searching for "Mobile Legends" instead:
node test/test-digiflazz.js ml

# Or get all products and search manually:
node test/test-digiflazz.js pricelist
```

---

## 💡 Pro Tips

### Save product list to file
```bash
node test/test-digiflazz.js pricelist > products.txt
```

### Filter specific game from all products
```bash
node test/test-digiflazz.js pricelist | grep -i "free fire"
```

### Check balance regularly
```bash
# Add to crontab (run every hour)
0 * * * * cd /path/to/backend && node test/test-digiflazz.js balance
```

---

## 📊 What to Do with Test Results

### After running Valorant test:

1. **Note the SKU codes:**
   ```
   valorant125
   valorant420
   valorant700
   ... etc
   ```

2. **Note the prices:**
   ```
   valorant125: Rp 13.000 (cost)
   Your margin: 15% = Rp 1.950
   Your selling price: Rp 14.950
   ```

3. **Map to your database:**
   ```sql
   UPDATE products SET
     supplier_sku = 'valorant125',
     base_price = 13000,
     selling_price_qris = 14950
   WHERE sku = 'VAL125-S10';
   ```

---

## 🎉 Success Criteria

**✅ All tests pass = You're ready to integrate!**

**✅ Balance > 0 = Can process transactions**

**✅ Found products = Can add to your catalog**

**✅ Transaction test works = API flow is correct**

---

## 📞 Need Help?

**If tests fail:**
1. Check .env credentials
2. Check internet connection
3. Check Digiflazz dashboard status
4. Contact Digiflazz support

**If you see weird product names:**
- Digiflazz uses Indonesian naming
- "Valorant" might be listed differently
- Check full price list and search manually

---

**Happy Testing!** 🚀✨
