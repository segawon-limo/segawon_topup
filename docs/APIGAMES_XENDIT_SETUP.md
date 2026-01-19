# 🚀 Setup Guide - ApiGames + Xendit + Riot ID Checker

Panduan lengkap dengan **3 fitur utama**:
1. ✅ **Xendit** - Payment Gateway (mudah & langsung)
2. ✅ **ApiGames** - Voucher Provider (NO IP whitelist!)
3. ✅ **Riot ID Checker** - Validasi user input

---

## 🎯 Kenapa Kombinasi Ini?

### Xendit (Payment Gateway)
✅ Daftar langsung dapat sandbox API key  
✅ Testing gratis tanpa deposit  
✅ Support QRIS, VA, E-wallet, Cards  
✅ Dokumentasi bahasa Indonesia  

### ApiGames (Voucher Provider)
✅ **NO IP Whitelist** - langsung bisa!  
✅ API simple & straightforward  
✅ Harga kompetitif  
✅ Support responsive (WhatsApp)  
✅ Testing sandbox available  

### Riot ID Checker
✅ Validasi real-time Riot ID  
✅ Tampilkan nama player  
✅ Prevent order errors  
✅ Better user experience  

---

## 📋 Step 1: Daftar ApiGames (5 Menit!)

### A. Register Account

1. **Buka:** https://member.apigames.id/register
2. **Isi form:**
   - Email
   - Password
   - Nama
   - No. HP
3. **Verifikasi email** (cek inbox)
4. **Login** ke dashboard

### B. Get API Credentials

1. **Dashboard** → **API**
2. **Copy:**
   - ✅ Merchant ID (contoh: M123456)
   - ✅ Secret Key (panjang string)
3. **Save** credentials ini!

### C. (Optional) Deposit untuk Testing Real

1. **Menu:** Deposit
2. **Minimal:** Rp 10.000
3. **Transfer** ke rekening yang ditampilkan
4. **Konfirmasi** deposit

⚠️ **Note:** ApiGames punya sandbox mode, jadi bisa test tanpa deposit dulu!

---

## 📋 Step 2: Setup Backend

### A. Update .env

**Edit `backend/.env`:**

```env
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/topup_game

# JWT
JWT_SECRET=your_super_secure_random_key

# ApiGames (BARU!)
APIGAMES_MERCHANT_ID=M123456
APIGAMES_SECRET_KEY=your_secret_key_from_apigames
APIGAMES_ENDPOINT=https://v1.apigames.id

# Xendit
XENDIT_SECRET_KEY=xnd_development_xxxxx
XENDIT_PUBLIC_KEY=xnd_public_development_xxxxx
XENDIT_IS_PRODUCTION=false
XENDIT_CALLBACK_TOKEN=random_token_123

# URLs
CALLBACK_URL=http://localhost:5000/api/payment/callback
FRONTEND_URL=http://localhost:3000
```

### B. Test ApiGames Connection

```bash
cd backend
node test-apigames.js
```

**Expected Output:**
```
=== APIGAMES API TEST ===

Merchant ID: Set ✓
Secret Key: Set ✓

TEST 1: Check Balance
---------------------
✓ SUCCESS!
  Balance: 100000
  Merchant: M123456

TEST 2: Get Price List (Valorant)
----------------------------------
✓ SUCCESS!
  Found 15 products

  Sample products:
    - VLR475VP: Valorant 475 VP (Rp 52000)
    - VLR1000VP: Valorant 1000 VP (Rp 104000)
    - VLR1475VP: Valorant 1475 VP (Rp 156000)
```

✅ **Kalau muncul ini, ApiGames BERHASIL!**

---

## 📋 Step 3: Update Database dengan Product Code ApiGames

### A. Get Product Code dari Test

Dari output `test-apigames.js`, catat product code Valorant.

### B. Update Database

```bash
psql -U postgres -d topup_game
```

```sql
-- Hapus products lama
DELETE FROM products;

-- Insert products dengan ApiGames code (sesuaikan dengan price list kamu)
-- 475 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '475 Valorant Points', 
  '475 VP untuk region Indonesia', 
  'VLR475VP', -- Product code dari ApiGames
  52000, -- Base price dari ApiGames
  61000, -- Selling price (margin 17.3%)
  17.3, 
  true, 
  1
);

-- 1000 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '1000 Valorant Points', 
  '1000 VP untuk region Indonesia', 
  'VLR1000VP',
  104000,
  121000,
  16.3,
  true,
  2
);

-- 1475 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '1475 Valorant Points', 
  '1475 VP untuk region Indonesia', 
  'VLR1475VP',
  156000,
  179000,
  14.7,
  true,
  3
);

-- 2050 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '2050 Valorant Points', 
  '2050 VP untuk region Indonesia', 
  'VLR2050VP',
  208000,
  237000,
  13.9,
  true,
  4
);

-- 2525 VP
INSERT INTO products (game_id, name, description, sku, base_price, selling_price, profit_margin, is_active, sort_order) 
VALUES (
  (SELECT id FROM games WHERE slug = 'valorant'), 
  '2525 Valorant Points', 
  '2525 VP untuk region Indonesia', 
  'VLR2525VP',
  260000,
  290000,
  11.5,
  true,
  5
);

-- Verify
SELECT name, sku, base_price, selling_price, profit_margin FROM products ORDER BY sort_order;

\q
```

⚠️ **PENTING:** Sesuaikan SKU dan harga dengan output dari `test-apigames.js`!

---

## 📋 Step 4: Test Riot ID Checker

```bash
node test-riotid.js
```

**Expected Output:**
```
=== RIOT ID VALIDATION TEST ===

TEST 1: Validating Real Riot ID
--------------------------------
Input: TenZ#TenZ (pro player)

✓ VALIDATION SUCCESS!
  Game Name: TenZ
  Tag Line: TenZ
  Full Riot ID: TenZ#TenZ
  Region: na
  Account Level: 500+

TEST 2: Validating Invalid Riot ID
-----------------------------------
Input: InvalidPlayer123#XXX

✗ Expected Result - Not Found: Riot ID tidak ditemukan

Riot ID Validation is WORKING!
```

✅ **Feature Riot ID Checker READY!**

---

## 📋 Step 5: Start Application

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

### Terminal 2: Frontend
```bash
cd frontend
npm start
```

**Frontend akan buka di:** http://localhost:3000

---

## 🧪 Step 6: Test End-to-End

### Test Flow Lengkap:

1. **Buka:** http://localhost:3000
2. **Klik:** Valorant
3. **Pilih:** 475 VP (atau nominal lain)
4. **Input Riot ID:**
   - Riot ID: `TestPlayer`
   - Tagline: `TEST`
5. **Tunggu...** Riot ID checker akan validasi otomatis
   - ✅ Kalau valid: Muncul nama player
   - ✗ Kalau invalid: Error message
6. **Input email:** test@example.com (optional)
7. **Klik:** "Lanjut ke Pembayaran"
8. **Redirect ke Xendit** payment page
9. **Pilih:** Virtual Account BCA
10. **Di Xendit sandbox:** Simulate payment
11. **Callback** ke backend
12. **Backend process** order ke ApiGames
13. **Order status:** SUCCESS!

---

## ✅ Feature Checklist

Setelah setup complete, kamu punya:

- [x] **Xendit Payment** - Working ✅
- [x] **ApiGames Voucher** - No IP whitelist ✅
- [x] **Riot ID Checker** - Real-time validation ✅
- [x] **Automatic Processing** - Order otomatis ✅
- [x] **Database Updated** - Product codes correct ✅

---

## 💡 Riot ID Checker - How It Works

### Di Frontend:
```javascript
// User input Riot ID + Tagline
Riot ID: PlayerName
Tagline: SEA

// System validate (automatic, saat user selesai input)
→ Call API: POST /api/validate-riot-id

// Response jika valid:
✓ Riot ID ditemukan!
  Player: PlayerName#SEA
  Level: 45
  Region: Asia Pacific

// User yakin → Lanjut payment
```

### Benefits:
✅ **Prevent typos** - User tahu kalau salah input  
✅ **Confirm identity** - Tampilkan nama player  
✅ **Better UX** - User confident sebelum bayar  
✅ **Reduce refunds** - Less wrong ID orders  

---

## 🚨 Troubleshooting

### ApiGames Error "Unauthorized"
**Solution:**
- Check Merchant ID dan Secret Key benar
- Copy ulang dari dashboard ApiGames
- No spaces, no quotes di .env

### Riot ID Checker Error "Too Many Requests"
**Solution:**
- API gratis ada rate limit
- Tunggu 1-2 menit
- Atau pakai format validation only (offline check)

### Product Code Tidak Cocok
**Solution:**
```bash
# Cek price list lagi
node test-apigames.js

# Update SKU di database sesuai output
```

---

## 🎯 Next Steps

**Untuk Testing Lokal:**
1. ✅ Test payment flow dengan Xendit sandbox
2. ✅ Test Riot ID validation dengan real accounts
3. ✅ Monitor logs untuk ensure everything working

**Untuk Production:**
1. Deploy ke VPS (follow DEPLOYMENT_GUIDE.md)
2. Upgrade Xendit ke production mode
3. Top-up ApiGames balance yang cukup
4. Setup domain & SSL
5. Marketing time! 🚀

---

## 💰 Pricing Summary

**ApiGames Valorant (estimates):**
```
475 VP   → Base: Rp 52.000, Jual: Rp 61.000 (margin 17%)
1000 VP  → Base: Rp 104.000, Jual: Rp 121.000 (margin 16%)
1475 VP  → Base: Rp 156.000, Jual: Rp 179.000 (margin 15%)
2050 VP  → Base: Rp 208.000, Jual: Rp 237.000 (margin 14%)
2525 VP  → Base: Rp 260.000, Jual: Rp 290.000 (margin 12%)
```

**Xendit Fee:** 2.9% + Rp 2.000 per transaksi

**Net Profit per Transaction:**
- 475 VP: ~Rp 5.500 (after fees)
- 1000 VP: ~Rp 11.000
- 2050 VP: ~Rp 21.000

---

## 📞 Support

**ApiGames:**
- Dashboard: https://member.apigames.id
- Docs: https://docs.apigames.id
- WhatsApp: (cek di website)

**Xendit:**
- Dashboard: https://dashboard.xendit.co
- Docs: https://docs.xendit.co
- Email: support@xendit.co

**Riot ID API:**
- Free API by Henrik Dev
- Docs: https://docs.henrikdev.xyz

---

**Selamat! System kamu sekarang:**
✅ Gampang setup (no IP whitelist hassle!)  
✅ Feature complete (payment + voucher + validation)  
✅ Professional (Riot ID checker = pro touch!)  

**Good luck dengan side hustle-mu! 🚀💰**
