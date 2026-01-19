# 🧪 Testing Guide - Local Development

Panduan testing lengkap untuk memastikan semua fitur berjalan dengan baik.

## 📋 Prerequisites Testing

Sebelum mulai testing, pastikan:
- ✅ PostgreSQL running
- ✅ Backend running di http://localhost:5000
- ✅ Frontend running di http://localhost:3000
- ✅ Database sudah di-import dengan schema.sql

## 🔍 Test Checklist

### 1. Database Connection Test

```bash
# Login ke database
psql -U postgres -d topup_game

# Check tables
\dt

# Check data products
SELECT * FROM products;

# Check data games
SELECT * FROM games;

# Exit
\q
```

**Expected Result:**
- Tables: users, games, products, orders, transactions, dll
- 1 game: Valorant
- 6 products: 125 VP, 420 VP, dst

### 2. Backend API Test

#### Test 1: Health Check
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Test 2: Get Games
```bash
curl http://localhost:5000/api/games
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Valorant",
      "slug": "valorant",
      "description": "...",
      "is_active": true
    }
  ]
}
```

#### Test 3: Get Products
```bash
curl http://localhost:5000/api/products/valorant
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "125 Valorant Points",
      "sku": "VALORANT125",
      "selling_price": "14000.00",
      ...
    }
  ]
}
```

#### Test 4: Create Order (via Postman)
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "gameUserId": "TestPlayer",
    "gameUserTag": "TEST",
    "customerEmail": "test@example.com",
    "customerPhone": "08123456789",
    "customerName": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {...},
    "payment": {
      "token": "...",
      "redirectUrl": "https://..."
    }
  }
}
```

### 3. Frontend Test

#### Test 1: Homepage
1. Buka http://localhost:3000
2. Check:
   - ✅ Navbar muncul
   - ✅ Hero section muncul
   - ✅ Features section muncul
   - ✅ Games card muncul (Valorant)
   - ✅ Footer muncul

#### Test 2: Order Page
1. Klik game Valorant
2. URL berubah ke `/order/valorant`
3. Check:
   - ✅ Products list muncul (6 items)
   - ✅ Form input muncul (Riot ID, Tagline)
   - ✅ Bisa select product
   - ✅ Order summary muncul setelah select

#### Test 3: Create Order Flow
1. Pilih product (contoh: 125 VP)
2. Input:
   - Riot ID: `TestPlayer`
   - Tagline: `TEST`
   - Email: `test@example.com`
   - Phone: `08123456789`
3. Klik "Lanjut ke Pembayaran"
4. Check console browser (F12):
   - ✅ No error
   - ✅ API call ke `/api/orders` success

**Expected Result:**
- Redirect ke Midtrans payment page
- Atau error jika Midtrans credentials belum setup

### 4. Payment Flow Test (Sandbox)

#### Setup Test Mode
Pastikan di `.env` backend:
```
MIDTRANS_IS_PRODUCTION=false
```

#### Test Payment
1. Setelah redirect ke Midtrans
2. Pilih **Credit Card**
3. Input test card:
   - Card Number: `4811 1111 1111 1114`
   - CVV: `123`
   - Expiry: `01/25`
4. Klik **Pay**

**Expected Result:**
- Payment success
- Redirect kembali ke website
- Muncul di halaman success

#### Verify Order
```bash
# Check di database
psql -U postgres -d topup_game

SELECT order_number, payment_status, order_status 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- payment_status: `success`
- order_status: `processing` atau `success`

### 5. Status Page Test

1. Copy order number dari database atau URL
2. Buka: http://localhost:3000/status/INV20240101XXXX
3. Check:
   - ✅ Order details muncul
   - ✅ Status icon correct (processing/success)
   - ✅ Game info, product, harga benar

### 6. Digiflazz Integration Test

**PENTING: Test ini akan hit API real Digiflazz**

#### Test 1: Check Balance
```bash
# Di backend terminal, buka Node REPL
node

# Load service
const digiflazz = require('./src/services/digiflazz.service');

// Check balance
digiflazz.checkBalance().then(console.log);
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "deposit": 100000
  }
}
```

#### Test 2: Get Price List
```javascript
digiflazz.getPriceList('VALORANT125').then(console.log);
```

**Expected:**
```json
{
  "success": true,
  "data": [{
    "product_name": "VALORANT 125 VP",
    "price": 12000,
    ...
  }]
}
```

#### Test 3: Create Transaction (Development Mode)
**NOTE:** Ini akan menggunakan saldo test di Digiflazz

```javascript
const orderData = {
  orderNumber: 'TEST' + Date.now(),
  sku: 'VALORANT125',
  customerId: 'TestPlayer',
  gameTag: 'TEST'
};

digiflazz.createTransaction(orderData).then(console.log);
```

**Expected (Development Mode):**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "message": "SUKSES"
  }
}
```

### 7. End-to-End Test Scenario

#### Complete Flow Test
1. **Step 1:** User buka website
2. **Step 2:** Pilih Valorant
3. **Step 3:** Pilih 125 VP (Rp 14.000)
4. **Step 4:** Input Riot ID: `TestPlayer#TEST`
5. **Step 5:** Input email: `test@example.com`
6. **Step 6:** Klik "Lanjut ke Pembayaran"
7. **Step 7:** Redirect ke Midtrans
8. **Step 8:** Bayar dengan test card
9. **Step 9:** Payment success, callback ke backend
10. **Step 10:** Backend process order ke Digiflazz
11. **Step 11:** Order status → SUCCESS
12. **Step 12:** User dapat notifikasi (jika enabled)

**Verify Each Step:**
```sql
-- Check order creation
SELECT * FROM orders WHERE order_number = 'INVxxxxxxxxx';

-- Check transaction record
SELECT * FROM transactions WHERE order_id = 'order-uuid';

-- Check if processed
SELECT order_status, provider_order_id, provider_response 
FROM orders 
WHERE order_number = 'INVxxxxxxxxx';
```

### 8. Error Handling Test

#### Test 1: Invalid Product ID
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "invalid-uuid",
    "gameUserId": "TestPlayer",
    "gameUserTag": "TEST"
  }'
```

**Expected:** 404 Product not found

#### Test 2: Missing Required Fields
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "valid-uuid"
  }'
```

**Expected:** 400 Validation error

#### Test 3: Invalid Order Number
Buka: http://localhost:3000/status/INVALID123

**Expected:** Order tidak ditemukan

### 9. Performance Test

#### Test Load Time
```bash
# Install Apache Bench (optional)
ab -n 100 -c 10 http://localhost:3000/

# Or use browser DevTools
# Network tab → Check load time
```

**Target:**
- Homepage: < 2 seconds
- Order page: < 3 seconds
- API response: < 500ms

### 10. Browser Compatibility Test

Test di berbagai browser:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (if Mac)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

Check:
- Layout responsive
- Forms working
- Payment redirect working
- No console errors

### 11. Mobile Responsive Test

1. Buka Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Test di berbagai ukuran:
   - Mobile: 375x667 (iPhone SE)
   - Mobile: 414x896 (iPhone 11 Pro)
   - Tablet: 768x1024 (iPad)
   - Desktop: 1920x1080

Check:
- ✅ Navigation menu responsive
- ✅ Cards tidak overlap
- ✅ Forms usable
- ✅ Text readable

## 🐛 Common Testing Issues

### Issue: Backend tidak start
**Solution:**
```bash
# Check logs
npm run dev

# Check port already in use
lsof -i :5000
# Kill if needed: kill -9 PID
```

### Issue: Frontend tidak bisa hit backend
**Solution:**
```bash
# Check REACT_APP_API_URL di .env
# Should be: http://localhost:5000/api

# Check CORS di backend
# backend/src/server.js - cors origin should include frontend URL
```

### Issue: Payment redirect tidak jalan
**Solution:**
```bash
# Check Midtrans Client Key di:
# 1. backend/.env (MIDTRANS_CLIENT_KEY)
# 2. frontend/.env (REACT_APP_MIDTRANS_CLIENT_KEY)
# 3. frontend/public/index.html (script tag)

# Must be same key!
```

### Issue: Database connection failed
**Solution:**
```bash
# Check PostgreSQL running
# Windows: services.msc
# Mac: brew services list
# Linux: systemctl status postgresql

# Check DATABASE_URL format:
# postgresql://username:password@localhost:5432/database_name
```

## ✅ Testing Checklist Before Production

- [ ] All API endpoints tested
- [ ] Order creation working
- [ ] Payment flow complete
- [ ] Callback handling working
- [ ] Order status updates correctly
- [ ] Error handling graceful
- [ ] No console errors
- [ ] Mobile responsive
- [ ] All browsers tested
- [ ] Performance acceptable
- [ ] Security headers present
- [ ] Database backup tested

## 📊 Testing Tools Recommendations

### API Testing
- **Postman** - GUI untuk test API
- **curl** - Command line testing
- **Insomnia** - Alternative Postman

### Frontend Testing
- **Chrome DevTools** - Built-in browser
- **React DevTools** - Chrome extension
- **Lighthouse** - Performance audit

### Database Testing
- **pgAdmin** - GUI PostgreSQL client
- **DBeaver** - Universal database tool
- **psql** - Command line

### Load Testing
- **Apache Bench (ab)** - Simple load test
- **Artillery** - Modern load testing
- **k6** - Advanced load testing

## 🎓 Testing Best Practices

1. **Test early, test often** - Don't wait until done
2. **Automate when possible** - Write test scripts
3. **Test edge cases** - Not just happy path
4. **Document bugs** - Keep track of issues
5. **Test in production-like environment** - Not just local

## 📝 Test Report Template

```markdown
## Test Report - [Date]

### Environment
- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- Database: PostgreSQL 14

### Tests Performed
1. ✅ Health check - PASSED
2. ✅ Order creation - PASSED
3. ⚠️  Payment flow - ISSUES FOUND
4. ✅ Status page - PASSED

### Issues Found
1. Payment redirect slow (3s)
   - Priority: Medium
   - Solution: Optimize API call

### Next Steps
- Fix payment redirect issue
- Re-test payment flow
- Proceed to staging deployment
```

---

Happy Testing! 🧪✅
