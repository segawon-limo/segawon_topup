# 📖 Panduan Setup Lengkap - Instant Game Topup

Panduan ini akan membantu kamu setup project dari awal hingga bisa running di local.

## 📋 Prerequisites

Pastikan kamu sudah install:
- Node.js v18 atau lebih baru (download di https://nodejs.org)
- PostgreSQL 14 atau lebih baru (download di https://www.postgresql.org/download/)
- Git (download di https://git-scm.com)
- Text editor (VS Code recommended)

## 🔧 Step 1: Setup Database

### Install PostgreSQL
1. Download PostgreSQL dari website resmi
2. Install dengan mengikuti wizard
3. Catat username dan password yang kamu buat
4. Default port: 5432

### Create Database
Buka terminal/cmd dan jalankan:

```bash
# Login ke PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE topup_game;

# Exit
\q
```

### Import Schema
```bash
# Masuk ke folder database
cd database

# Import schema
psql -U postgres -d topup_game -f schema.sql
```

Jika berhasil, database sudah siap dengan:
- ✅ Tabel-tabel yang diperlukan
- ✅ Default admin user (email: admin@topup.com, password: admin123)
- ✅ Data Valorant game dan products

## 🔧 Step 2: Setup Backend

### Install Dependencies
```bash
cd backend
npm install
```

### Configure Environment
```bash
# Copy file .env.example
cp .env.example .env

# Edit file .env dengan text editor
nano .env
# atau
code .env
```

Isi konfigurasi berikut:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/topup_game
# Ganti 'password' dengan password PostgreSQL kamu

# JWT Secret (generate random string)
JWT_SECRET=random_secret_key_yang_aman_dan_panjang

# Digiflazz (daftar di digiflazz.com dulu)
DIGIFLAZZ_USERNAME=your_username
DIGIFLAZZ_API_KEY=your_api_key
DIGIFLAZZ_ENDPOINT=https://api.digiflazz.com/v1

# Midtrans (daftar di midtrans.com dulu, gunakan sandbox untuk testing)
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_IS_PRODUCTION=false

# URLs
CALLBACK_URL=http://localhost:5000/api/payment/callback
FRONTEND_URL=http://localhost:3000
```

### Test Backend
```bash
npm run dev
```

Jika berhasil, kamu akan melihat:
```
╔═══════════════════════════════════════════════╗
║   🎮 Instant Game Topup API                   ║
║   Server: http://localhost:5000               ║
║   Ready to accept requests! 🚀                ║
╚═══════════════════════════════════════════════╝
```

Test dengan buka browser: http://localhost:5000
Kamu akan melihat API info.

## 🔧 Step 3: Setup Frontend

### Install Dependencies
Buka terminal baru (jangan tutup terminal backend):

```bash
cd frontend
npm install
```

### Configure Environment
```bash
# Copy file .env.example
cp .env.example .env

# Edit file .env
nano .env
# atau
code .env
```

Isi konfigurasi:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
REACT_APP_SITE_NAME=TopupGame.id
REACT_APP_WHATSAPP=628123456789
```

### Run Frontend
```bash
npm start
```

Frontend akan otomatis terbuka di browser: http://localhost:3000

## 🔐 Step 4: Daftar Akun Provider & Payment Gateway

### 1. Digiflazz (Provider Voucher Game)

**Daftar:**
1. Buka https://digiflazz.com
2. Klik "Daftar" di pojok kanan atas
3. Isi form registrasi
4. Verifikasi email
5. Login ke dashboard

**Setup:**
1. Isi saldo (minimal Rp 10.000-50.000 untuk testing)
2. Dapatkan API Key:
   - Menu: Pengaturan → API
   - Copy Username dan API Key
   - Paste ke `.env` backend

**Cek Product Code Valorant:**
1. Menu: Price List → Prepaid
2. Cari "Valorant" atau "Riot"
3. Catat SKU code (contoh: VALORANT125)
4. Update SKU di database jika berbeda

### 2. Midtrans (Payment Gateway)

**Daftar:**
1. Buka https://midtrans.com
2. Klik "Sign Up" atau "Daftar"
3. Pilih "Start with Sandbox" (gratis untuk testing)
4. Isi form registrasi
5. Verifikasi email

**Setup Sandbox (untuk testing):**
1. Login ke dashboard Midtrans
2. Pilih environment: **Sandbox**
3. Menu: Settings → Access Keys
4. Copy:
   - Server Key
   - Client Key
5. Paste ke `.env` backend dan frontend

**Test Payment di Sandbox:**
Gunakan kartu test ini untuk pembayaran:
- Card Number: `4811 1111 1111 1114`
- CVV: `123`
- Expiry: `01/25` (bulan/tahun di masa depan)

### 3. Fonnte (WhatsApp Notification - Opsional)

**Daftar:**
1. Buka https://fonnte.com
2. Klik "Daftar Gratis"
3. Connect WhatsApp kamu
4. Dapatkan Token dari dashboard
5. Paste ke `.env` backend

## 🧪 Step 5: Testing

### Test Flow Lengkap:

1. **Buka website:** http://localhost:3000
2. **Pilih game:** Klik "Valorant"
3. **Pilih nominal:** Contoh: 125 VP
4. **Input data:**
   - Riot ID: `TestPlayer`
   - Tagline: `TEST`
   - Email: `test@example.com` (opsional)
5. **Klik:** "Lanjut ke Pembayaran"
6. **Di halaman Midtrans:**
   - Pilih metode: Credit Card
   - Input kartu test
   - Klik Pay
7. **Kembali ke website**
8. **Cek status order**

### Troubleshooting

**Problem: Backend tidak bisa connect ke database**
```bash
# Cek PostgreSQL running
# Windows:
services.msc → cari PostgreSQL

# Mac/Linux:
brew services list
```

**Problem: Frontend tidak bisa connect ke backend**
- Pastikan backend running di http://localhost:5000
- Cek REACT_APP_API_URL di frontend/.env

**Problem: Payment tidak muncul**
- Pastikan MIDTRANS_CLIENT_KEY sudah benar
- Cek console browser (F12) untuk error

**Problem: Order stuck di "processing"**
- Cek saldo Digiflazz mencukupi
- Cek DIGIFLAZZ_API_KEY valid
- Lihat logs backend untuk error

## 📊 Monitoring

### Check Database
```bash
psql -U postgres -d topup_game

# Lihat orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

# Lihat products
SELECT * FROM products;

# Exit
\q
```

### Check Logs
- **Backend logs:** Lihat di terminal yang running `npm run dev`
- **Frontend logs:** Buka browser → F12 → Console

## 🚀 Next Steps

Setelah testing berhasil di local:

1. **Update Product Price:**
   - Cek harga real di Digiflazz
   - Update di database sesuai margin yang kamu inginkan

2. **Setup Domain:**
   - Beli domain di Namecheap, Cloudflare, atau Niagahoster
   - Setup DNS pointing ke VPS

3. **Deploy ke Production:**
   - Sewa VPS (DigitalOcean, AWS, atau lokal)
   - Follow deployment guide

4. **Enable Production Mode:**
   - Ganti Midtrans dari Sandbox ke Production
   - Update MIDTRANS_IS_PRODUCTION=true
   - Isi saldo Digiflazz yang cukup

5. **Marketing:**
   - Buat social media (Instagram, TikTok)
   - Join grup komunitas game
   - Promosi dengan harga kompetitif

## 📞 Support

Jika ada masalah saat setup:
1. Cek logs backend dan frontend
2. Pastikan semua dependencies terinstall
3. Verifikasi .env sudah benar
4. Cek PostgreSQL running
5. Test koneksi API dengan Postman

Selamat mencoba! 🎮🚀
