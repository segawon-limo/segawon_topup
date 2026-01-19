# 🚀 Setup Guide - Xendit + VIP Reseller (MUDAH!)

Panduan setup dengan provider yang **API-nya mudah diakses** dan **tidak ribet**!

## ✅ Keunggulan Kombinasi Ini

### Xendit (Payment Gateway)
✅ **Super mudah** - Daftar langsung dapat API key  
✅ **Sandbox gratis** - Testing tanpa deposit  
✅ **Dokumentasi jelas** - Bahasa Indonesia  
✅ **Support payment lengkap** - QRIS, E-wallet, VA, Cards  
✅ **No verification** untuk sandbox  

### VIP Reseller (Voucher Provider)
✅ **API sederhana** - JSON REST API  
✅ **Deposit minimal rendah** - Mulai Rp 10.000  
✅ **Produk lengkap** - 100+ game  
✅ **CS responsive** - WhatsApp support  
✅ **Harga kompetitif**  

---

## 📋 Step 1: Daftar Xendit (5 Menit!)

### A. Register Account

1. **Buka**: https://dashboard.xendit.co/register
2. **Isi form**:
   - Email
   - Password
   - Nama Bisnis
   - Nomor HP
3. **Verifikasi email** (cek inbox)
4. **Login** ke dashboard

### B. Get API Keys (Sandbox)

1. **Pastikan mode**: **Sandbox** (toggle di kanan atas)
2. **Menu**: Settings → Developers → API Keys
3. **Klik**: "Generate secret key"
4. **Copy**:
   - ✅ Secret Key (starts with `xnd_development_...`)
   - ✅ Public Key (starts with `xnd_public_...`)

**Simpan keys ini!** Akan dipakai di `.env`

### C. Setup Webhook/Callback

1. **Menu**: Settings → Developers → Callbacks
2. **Invoice Paid**:
   - URL: `http://your-domain.com/api/payment/callback`
   - ⚠️ Untuk local testing: gunakan ngrok (dijelaskan di bawah)
3. **Save**

### D. Test Payment Methods

Di sandbox, semua metode payment bisa langsung dipakai:
- ✅ Virtual Account (BCA, Mandiri, BNI, BRI, Permata)
- ✅ E-Wallets (OVO, DANA, LinkAja, ShopeePay)
- ✅ QRIS
- ✅ Credit Card (test card: 4000000000000002)

**DONE!** Xendit siap dipakai. Super mudah kan?

---

## 📋 Step 2: Daftar VIP Reseller (10 Menit!)

### A. Register Account

1. **Buka**: https://vip-reseller.co.id
2. **Klik**: "Daftar" di pojok kanan atas
3. **Isi form**:
   - Username
   - Email
   - Password
   - Nama Lengkap
   - No. WhatsApp
   - Pin (6 digit)
4. **Verifikasi email**
5. **Login** ke dashboard

### B. Get API Credentials

1. **Menu**: Profil → API
2. **Dapatkan**:
   - ✅ API ID (Merchant ID)
   - ✅ API Key (Secret Key)
3. **Copy dan simpan!**

### C. Deposit Saldo (Minimal Rp 10.000)

1. **Menu**: Deposit → Pilih Bank
2. **Input nominal**: Rp 50.000 (recommended untuk testing)
3. **Transfer** ke rekening yang ditampilkan
4. **Konfirmasi** deposit
5. **Tunggu** approved (biasanya 5-15 menit)

### D. Cek Product Code Valorant

1. **Menu**: Layanan → Game → Valorant
2. **Catat product code**, contoh:
   ```
   VAL125    → 125 VP
   VAL420    → 420 VP  
   VAL700    → 700 VP
   VAL1375   → 1375 VP
   VAL2400   → 2400 VP
   VAL4000   → 4000 VP
   ```
3. **Catat harga** untuk update di database

**DONE!** VIP Reseller siap!

---

## ⚙️ Step 3: Update Project Files

### A. Backend Configuration

**Edit `backend/.env`:**

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/topup_game

# JWT
JWT_SECRET=your_super_secure_random_key_12345

# VIP Reseller
VIPRESELLER_API_ID=your_api_id_from_vipreseller
VIPRESELLER_API_KEY=your_api_key_from_vipreseller
VIPRESELLER_ENDPOINT=https://vip-reseller.co.id/api

# Xendit
XENDIT_SECRET_KEY=xnd_development_your_secret_key
XENDIT_PUBLIC_KEY=xnd_public_test_your_public_key
XENDIT_IS_PRODUCTION=false
XENDIT_CALLBACK_TOKEN=your_random_token_for_security_123

# URLs
CALLBACK_URL=http://localhost:5000/api/payment/callback
FRONTEND_URL=http://localhost:3000

# WhatsApp (Optional)
FONNTE_TOKEN=
FONNTE_ENABLED=false
```

### B. Frontend Configuration

**Edit `frontend/.env`:**

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_XENDIT_PUBLIC_KEY=xnd_public_test_your_public_key
REACT_APP_SITE_NAME=TopupGame.id
REACT_APP_WHATSAPP=628123456789
```

### C. Update Database (Product Codes)

**Sesuaikan SKU dengan VIP Reseller:**

```sql
psql -U postgres -d topup_game

-- Update product codes
UPDATE products SET sku = 'VAL125' WHERE name LIKE '%125%';
UPDATE products SET sku = 'VAL420' WHERE name LIKE '%420%';
UPDATE products SET sku = 'VAL700' WHERE name LIKE '%700%';
UPDATE products SET sku = 'VAL1375' WHERE name LIKE '%1375%';
UPDATE products SET sku = 'VAL2400' WHERE name LIKE '%2400%';
UPDATE products SET sku = 'VAL4000' WHERE name LIKE '%4000%';

-- Update prices sesuai VIP Reseller + margin
-- Contoh: Base price dari VIP = Rp 12.000, jual Rp 14.000 (margin 16%)
UPDATE products SET base_price = 12000, selling_price = 14000 WHERE sku = 'VAL125';
-- Ulangi untuk product lain

\q
```

---

## 🧪 Step 4: Testing Local

### A. Test Backend API

```bash
cd backend
npm install
npm run dev
```

**Test endpoints:**

```bash
# Health check
curl http://localhost:5000/api/health

# Get products
curl http://localhost:5000/api/products/valorant
```

### B. Test VIP Reseller Connection

**Buat file test `backend/test-vipreseller.js`:**

```javascript
const vipreseller = require('./src/services/vipreseller.service');

async function test() {
  console.log('Testing VIP Reseller...\n');
  
  // Test 1: Check Balance
  const balance = await vipreseller.checkBalance();
  console.log('1. Balance:', balance);
  
  // Test 2: Get Products
  const products = await vipreseller.getPriceList();
  console.log('\n2. Products:', products.success ? 'OK' : 'FAILED');
  
  // Test 3: Check Product Detail
  const detail = await vipreseller.getProductDetail('VAL125');
  console.log('\n3. Product Detail:', detail);
}

test();
```

**Run:**
```bash
node backend/test-vipreseller.js
```

### C. Test Xendit Connection

**Buat file test `backend/test-xendit.js`:**

```javascript
const xendit = require('./src/services/xendit.service');

async function test() {
  console.log('Testing Xendit...\n');
  
  const orderData = {
    orderNumber: 'TEST' + Date.now(),
    productName: 'Test Product 125 VP',
    amount: 14000,
    adminFee: 0,
    totalAmount: 14000,
    customerEmail: 'test@example.com',
    customerPhone: '+62812345678',
    customerName: 'Test User',
  };
  
  const invoice = await xendit.createInvoice(orderData);
  console.log('Invoice created:', invoice);
  
  if (invoice.success) {
    console.log('\n✅ Open this URL to test payment:');
    console.log(invoice.data.invoiceUrl);
  }
}

test();
```

**Run:**
```bash
node backend/test-xendit.js
```

**Output:** URL payment → buka di browser untuk test!

### D. Test Frontend

```bash
cd frontend
npm install
npm start
```

Website buka di: http://localhost:3000

---

## 🌐 Step 5: Setup Callback untuk Local Testing

**Problem:** Xendit perlu send callback ke server, tapi server di localhost!

**Solution:** Pakai **ngrok** (tunnel localhost ke internet)

### Install ngrok

1. **Download**: https://ngrok.com/download
2. **Extract** dan simpan di folder mudah diakses
3. **Sign up** gratis di ngrok.com untuk dapat authtoken

### Run ngrok

```bash
# Windows
ngrok.exe http 5000

# Mac/Linux
./ngrok http 5000
```

**Output:**
```
Forwarding: https://abc123.ngrok.io -> http://localhost:5000
```

### Update Xendit Webhook

1. **Copy URL** dari ngrok (https://abc123.ngrok.io)
2. **Xendit Dashboard** → Settings → Callbacks
3. **Invoice Paid URL**: `https://abc123.ngrok.io/api/payment/callback`
4. **Save**

**Sekarang callback bisa masuk!**

---

## 🎯 Step 6: Test End-to-End

### Full Flow Test:

1. **Start backend**: `npm run dev` di backend/
2. **Start ngrok**: `ngrok http 5000`
3. **Update callback** di Xendit dengan ngrok URL
4. **Start frontend**: `npm start` di frontend/
5. **Buka website**: http://localhost:3000
6. **Test order**:
   - Pilih Valorant
   - Pilih 125 VP
   - Input Riot ID: `TestPlayer`
   - Tagline: `TEST`
   - Email: test@example.com
7. **Klik "Lanjut ke Pembayaran"**
8. **Redirect ke Xendit** payment page
9. **Pilih metode**: Virtual Account BCA (paling mudah test)
10. **Copy VA number** yang muncul
11. **Di Xendit Sandbox**, klik "Simulate Payment"
12. **Paste VA number** → Pay
13. **Tunggu 2-5 detik**
14. **Callback masuk** ke backend
15. **Check database**:

```bash
psql -U postgres -d topup_game

SELECT order_number, payment_status, order_status 
FROM orders 
ORDER BY created_at DESC 
LIMIT 1;

-- Harus:
-- payment_status: success
-- order_status: processing atau success
```

**✅ SUKSES!** Sistem berjalan end-to-end!

---

## 📊 Perbandingan: Before vs After

| Fitur | Midtrans + Digiflazz | Xendit + VIP Reseller |
|-------|---------------------|---------------------|
| **Setup Complexity** | 😰 Susah | 😊 Mudah |
| **API Access** | 🔒 Ribet | ✅ Langsung |
| **Documentation** | 📚 Banyak | 📖 Simple |
| **Sandbox** | ⚠️ Perlu setup | ✅ Auto |
| **Support** | 💬 Slow | ⚡ Fast |
| **Min Deposit** | Rp 50.000+ | Rp 10.000 |

---

## 🚨 Common Issues & Solutions

### Issue 1: "API Key Invalid" di VIP Reseller

**Solution:**
```bash
# Check API credentials
# Login ke VIP Reseller → Profil → API
# Copy ulang API ID dan API Key
# Paste ke backend/.env
```

### Issue 2: "Insufficient Balance" di VIP Reseller

**Solution:**
```bash
# Deposit lagi minimal Rp 50.000
# Menu: Deposit → Transfer → Konfirmasi
```

### Issue 3: Xendit Callback tidak masuk

**Solution:**
```bash
# Check ngrok masih running
# Check webhook URL di Xendit dashboard
# Check backend logs untuk error
```

### Issue 4: Product code tidak cocok

**Solution:**
```sql
-- Cek product code di VIP Reseller website
-- Update di database:
UPDATE products SET sku = 'CORRECT_CODE' WHERE id = 'product_id';
```

---

## 💰 Pricing Comparison

**VIP Reseller (Valorant):**
```
125 VP   → Rp 11.500 - 12.500
420 VP   → Rp 38.000 - 40.000
700 VP   → Rp 63.000 - 66.000
1375 VP  → Rp 125.000 - 130.000
```

**Margin Recommendation:**
- Small (< Rp 50k): 15-20%
- Medium (Rp 50-150k): 12-15%
- Large (> Rp 150k): 10-12%

**Xendit Fee:** 2.9% + Rp 2.000 per transaction

**Contoh Kalkulasi:**
```
Product: 125 VP
Base price: Rp 12.000
Margin 15%: Rp 1.800
Selling price: Rp 13.800
Xendit fee: Rp 2.400 (2.9% + Rp 2.000)
Your profit: Rp 13.800 - Rp 12.000 - Rp 2.400 = -Rp 600 ❌

FIXED - Hitung fee ke customer:
Selling price: Rp 16.500
Xendit fee: Rp 2.479
Net: Rp 14.021
Cost: Rp 12.000
Profit: Rp 2.021 ✅ (16.8%)
```

**Tips:** Tambahin fee payment gateway ke harga jual!

---

## 🎉 Next Steps

Setelah testing sukses di local:

1. **Update harga** sesuai market
2. **Deploy ke VPS** (ikuti DEPLOYMENT_GUIDE.md)
3. **Upgrade Xendit** ke production mode
4. **Top-up VIP Reseller** saldo yang cukup
5. **Marketing!** Instagram, TikTok, WhatsApp

---

## 📞 Support

**Xendit:**
- Dashboard: https://dashboard.xendit.co
- Docs: https://docs.xendit.co
- Email: support@xendit.co

**VIP Reseller:**
- Website: https://vip-reseller.co.id
- WhatsApp: (cek di website)
- Telegram: (cek di website)

---

**Selamat! Setup kamu sekarang jauh lebih mudah! 🚀**

Kombinasi Xendit + VIP Reseller adalah **pilihan terbaik** untuk pemula karena setup-nya **straightforward** dan API-nya **mudah diakses**.
