# 🪟 Setup Guide untuk Windows - Instant Game Topup

Panduan lengkap setup project di Windows 10/11 dari NOL sampai JALAN.

## 📋 Step 0: Download & Install Prerequisites

### 1. Install Node.js

**Download:**
- Buka https://nodejs.org
- Download versi **LTS** (Long Term Support)
- Pilih **Windows Installer (.msi)** - 64-bit

**Install:**
1. Double click file installer
2. Next → Next → Accept → Next
3. ✅ Checklist "Automatically install necessary tools"
4. Install
5. **PENTING: RESTART Command Prompt setelah install**

**Verify:**
```cmd
node --version
npm --version
```

Harus muncul versi (contoh: v18.17.0)

### 2. Install PostgreSQL

**Download:**
- Buka https://www.postgresql.org/download/windows/
- Klik "Download the installer"
- Pilih versi **14.x** atau **15.x**

**Install:**
1. Double click installer
2. Next → Next
3. **CATAT PASSWORD** yang kamu buat untuk user `postgres`
4. Port: biarkan **5432**
5. Locale: **Indonesian, Indonesia**
6. Next → Install
7. **Jangan** checklist Stack Builder (skip)

**Verify:**
```cmd
psql --version
```

**Set Environment Variable (Jika psql tidak dikenali):**
1. Search "Environment Variables" di Windows
2. Klik "Edit the system environment variables"
3. Klik "Environment Variables"
4. Di "System variables", double click "Path"
5. Klik "New"
6. Tambahkan: `C:\Program Files\PostgreSQL\14\bin`
7. OK → OK → OK
8. **RESTART Command Prompt**

### 3. Install Git (Optional tapi Recommended)

**Download:**
- https://git-scm.com/download/win

**Install:**
- Default settings semua, Next → Next → Install

### 4. Install Text Editor

**Pilihan 1: VS Code (Recommended)**
- Download: https://code.visualstudio.com
- Install dengan default settings
- Extensions recommended:
  - ESLint
  - Prettier
  - PostgreSQL (by cweijan)

**Pilihan 2: Notepad++**
- Download: https://notepad-plus-plus.org

## 📦 Step 1: Extract Project

1. **Extract file ZIP** `topup-game-project.zip`
2. **Pindahkan** ke lokasi yang mudah diakses, contoh:
   ```
   C:\Users\YourName\Documents\topup-game-project\
   ```

## 🗄️ Step 2: Setup Database

### Cara 1: Via Command Prompt

**Buka Command Prompt as Administrator:**
1. Tekan `Win + X`
2. Pilih "Windows Terminal (Admin)" atau "Command Prompt (Admin)"

```cmd
REM Masuk ke folder project
cd C:\Users\YourName\Documents\topup-game-project

REM Login ke PostgreSQL
psql -U postgres

REM Masukkan password yang kamu buat saat install PostgreSQL
```

**Di PostgreSQL prompt (`postgres=#`):**
```sql
-- Create database
CREATE DATABASE topup_game;

-- Verify
\l

-- Exit
\q
```

**Import Schema:**
```cmd
cd database
psql -U postgres -d topup_game -f schema.sql

REM Masukkan password lagi
```

**Jika Success:**
```
CREATE TABLE
CREATE TABLE
INSERT 0 1
...
```

### Cara 2: Via pgAdmin 4 (GUI)

**Buka pgAdmin 4:**
1. Start Menu → pgAdmin 4
2. Masukkan master password (yang kamu buat saat install)
3. Expand "Servers" → "PostgreSQL 14"
4. Masukkan password postgres

**Create Database:**
1. Right click "Databases" → Create → Database
2. Database name: `topup_game`
3. Save

**Import Schema:**
1. Right click database `topup_game` → Query Tool
2. File → Open → Pilih `database\schema.sql`
3. Klik tombol ▶️ (Execute)
4. Harus muncul "Query returned successfully"

**Verify:**
1. Expand `topup_game` → Schemas → public → Tables
2. Harus ada: games, products, orders, dll

## 🔧 Step 3: Setup Backend

**Buka Command Prompt/Terminal baru:**

```cmd
REM Masuk ke folder backend
cd C:\Users\YourName\Documents\topup-game-project\backend

REM Install dependencies
npm install

REM Tunggu sampai selesai (bisa 2-5 menit)
```

**Copy file .env:**
```cmd
copy .env.example .env
```

**Edit file .env:**
```cmd
REM Buka dengan Notepad
notepad .env

REM Atau dengan VS Code (jika sudah install)
code .env
```

**Isi konfigurasi di .env:**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
# GANTI 'your_password' dengan password PostgreSQL kamu!
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/topup_game

# JWT Secret (generate random string)
JWT_SECRET=topup_game_secret_key_2024_super_secure_random

# Digiflazz API (isi setelah daftar di digiflazz.com)
DIGIFLAZZ_USERNAME=
DIGIFLAZZ_API_KEY=
DIGIFLAZZ_ENDPOINT=https://api.digiflazz.com/v1

# Midtrans (isi setelah daftar di midtrans.com - pakai SANDBOX untuk testing)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# Callback URLs
CALLBACK_URL=http://localhost:5000/api/payment/callback
FRONTEND_URL=http://localhost:3000

# WhatsApp Notification (opsional)
FONNTE_TOKEN=
FONNTE_ENABLED=false

# Email (opsional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@topupgame.id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Save:** Ctrl+S, lalu close

**Test Backend:**
```cmd
npm run dev
```

**Jika Berhasil, akan muncul:**
```
╔═══════════════════════════════════════════════╗
║   🎮 Instant Game Topup API                   ║
║   Server: http://localhost:5000               ║
║   Ready to accept requests! 🚀                ║
╚═══════════════════════════════════════════════╝
```

**Test di Browser:**
Buka: http://localhost:5000
Harus muncul JSON response

**Jangan close terminal ini!** Backend harus tetap running.

## 🌐 Step 4: Setup Frontend

**Buka Command Prompt/Terminal BARU** (jangan close yang backend):

```cmd
REM Masuk ke folder frontend
cd C:\Users\YourName\Documents\topup-game-project\frontend

REM Install dependencies
npm install

REM Tunggu sampai selesai (bisa 3-7 menit)
```

**Copy file .env:**
```cmd
copy .env.example .env
```

**Edit file .env:**
```cmd
notepad .env
```

**Isi konfigurasi:**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
REACT_APP_SITE_NAME=TopupGame.id
REACT_APP_WHATSAPP=628123456789
```

**Save:** Ctrl+S, lalu close

**Start Frontend:**
```cmd
npm start
```

**Tunggu...**
- Akan compile (30 detik - 1 menit)
- Browser akan AUTO OPEN ke http://localhost:3000

**Jika Berhasil:**
- ✅ Website terbuka di browser
- ✅ Tampil landing page dengan Valorant
- ✅ Navbar, footer muncul
- ✅ Tidak ada error di console (tekan F12 untuk cek)

## 🎯 Step 5: Testing Aplikasi

### Test 1: Homepage
1. Buka http://localhost:3000
2. Scroll ke bawah
3. Cek section "Pilih Game Favorit Kamu"
4. Harus ada card **Valorant**

### Test 2: Order Page
1. Klik card **Valorant**
2. URL berubah ke `/order/valorant`
3. Muncul list products:
   - 125 Valorant Points - Rp 14.000
   - 420 Valorant Points - Rp 46.000
   - dst...

### Test 3: Create Order (Tanpa Payment dulu)
1. Pilih nominal (contoh: 125 VP)
2. Input:
   - Riot ID: `TestPlayer`
   - Tagline: `TEST`
   - Email: `test@example.com` (opsional)
3. Klik "Lanjut ke Pembayaran"

**Yang Terjadi:**
- Jika Midtrans belum setup: Error
- Jika Midtrans sudah setup: Redirect ke payment page

**Normal jika error** karena Midtrans belum di-setup. Lanjut ke Step 6!

## 🔐 Step 6: Daftar Akun Provider & Payment

### A. Daftar Digiflazz (Provider Voucher)

**Register:**
1. Buka https://digiflazz.com
2. Klik "Daftar"
3. Isi form:
   - Email
   - Password
   - Nama Toko
   - No. HP
4. Verifikasi email
5. Login

**Setup:**
1. Dashboard → Deposit
2. Isi saldo minimal **Rp 50.000** (untuk testing)
   - Transfer ke rekening yang ditampilkan
   - Konfirmasi deposit
3. Tunggu approve (biasanya 5-15 menit)

**Get API Key:**
1. Menu: **API**
2. Copy **Username** dan **API Key**
3. Paste ke `backend/.env`:
   ```env
   DIGIFLAZZ_USERNAME=your_username_here
   DIGIFLAZZ_API_KEY=your_api_key_here
   ```

**Cek Product Code Valorant:**
1. Menu: **Price List** → **Prepaid**
2. Search: "Valorant"
3. Catat SKU (contoh: `VALORANT125`)
4. **PENTING:** Update SKU di database jika beda

**Update SKU di Database (jika perlu):**
```cmd
psql -U postgres -d topup_game

UPDATE products SET sku = 'VALORANT125' WHERE name LIKE '%125%';
UPDATE products SET sku = 'VALORANT420' WHERE name LIKE '%420%';
-- dst untuk product lainnya

\q
```

### B. Daftar Midtrans (Payment Gateway)

**Register:**
1. Buka https://midtrans.com
2. Klik "Sign Up"
3. Pilih: **"Start with Sandbox"** (GRATIS untuk testing)
4. Isi form registrasi
5. Verifikasi email
6. Login

**Get API Keys (SANDBOX):**
1. Pastikan environment: **Sandbox** (ada toggle di kanan atas)
2. Menu: **Settings** → **Access Keys**
3. Copy:
   - **Server Key** (starts with `SB-Mid-server-...`)
   - **Client Key** (starts with `SB-Mid-client-...`)

**Update .env Files:**

Backend (`backend\.env`):
```env
MIDTRANS_SERVER_KEY=SB-Mid-server-your_key_here
MIDTRANS_CLIENT_KEY=SB-Mid-client-your_key_here
MIDTRANS_IS_PRODUCTION=false
```

Frontend (`frontend\.env`):
```env
REACT_APP_MIDTRANS_CLIENT_KEY=SB-Mid-client-your_key_here
```

**RESTART Backend & Frontend:**
```cmd
# Di terminal backend: Ctrl+C
npm run dev

# Di terminal frontend: Ctrl+C
npm start
```

## 🧪 Step 7: Test End-to-End

### Test Payment Flow

1. **Buka website:** http://localhost:3000
2. **Pilih Valorant**
3. **Pilih 125 VP**
4. **Input data:**
   - Riot ID: `TestPlayer`
   - Tagline: `TEST`
   - Email: `test@example.com`
5. **Klik "Lanjut ke Pembayaran"**
6. **Redirect ke Midtrans** (payment page sandbox)

### Test Payment dengan Test Card

Di halaman Midtrans:
1. Pilih **Credit Card**
2. Input test card:
   ```
   Card Number: 4811 1111 1111 1114
   CVV: 123
   Expiry: 01/25 (atau bulan/tahun di masa depan)
   ```
3. Klik **Pay Now**
4. Akan muncul **3D Secure** → klik **OK**

**Hasil:**
- ✅ Payment Success
- ✅ Redirect kembali ke website
- ✅ Muncul halaman "Pembayaran Berhasil"
- ✅ Auto redirect ke status page

### Verify di Database

```cmd
psql -U postgres -d topup_game

-- Check order terakhir
SELECT order_number, payment_status, order_status, total_amount 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Harus muncul order dengan:
-- payment_status: success
-- order_status: processing atau success

\q
```

### Check Backend Logs

Di terminal backend, kamu akan lihat:
```
Received Midtrans notification: {...}
Processing order: [order-id]
Order processed successfully: INV20240101XXXX
```

## ✅ Success Checklist

Jika semua ini ✅, berarti SUKSES:

- [ ] Backend running di http://localhost:5000
- [ ] Frontend running di http://localhost:3000
- [ ] Database topup_game created dengan 8+ tables
- [ ] Bisa lihat list products Valorant
- [ ] Bisa create order
- [ ] Payment redirect ke Midtrans
- [ ] Payment success dengan test card
- [ ] Order status update di database

## 🚨 Troubleshooting Windows

### Error: "psql is not recognized"

**Solution:**
```cmd
REM Tambahkan PostgreSQL ke PATH
set PATH=%PATH%;C:\Program Files\PostgreSQL\14\bin

REM Atau restart Command Prompt setelah install PostgreSQL
```

### Error: "Port 5000 is already in use"

**Solution:**
```cmd
REM Check apa yang pakai port 5000
netstat -ano | findstr :5000

REM Kill process (ganti PID dengan yang muncul)
taskkill /PID [PID] /F

REM Atau ganti PORT di backend/.env
PORT=5001
```

### Error: "npm is not recognized"

**Solution:**
```cmd
REM Restart Command Prompt setelah install Node.js
REM Atau install ulang Node.js dengan checklist "Add to PATH"
```

### Error: Backend tidak bisa connect ke database

**Solution:**
```cmd
REM Check PostgreSQL service running
REM Tekan Win+R, ketik: services.msc
REM Cari "postgresql-x64-14"
REM Klik Start jika stopped

REM Check DATABASE_URL di .env
REM Format: postgresql://postgres:PASSWORD@localhost:5432/topup_game
REM Ganti PASSWORD dengan password postgres kamu
```

### Error: Frontend blank page / tidak muncul

**Solution:**
```cmd
REM Check browser console (F12)
REM Check REACT_APP_API_URL di frontend\.env
REM Harus: http://localhost:5000/api

REM Clear cache dan restart
del /F /S /Q node_modules
rmdir /S /Q node_modules
npm install
npm start
```

### Error: "ENOSPC: System limit for number of file watchers"

**Solution:**
```cmd
REM Ini jarang terjadi di Windows, tapi jika terjadi:
REM Restart komputer
REM Atau close aplikasi lain yang banyak pakai file watcher
```

## 📊 Check Services Running

**Buka Task Manager** (Ctrl+Shift+Esc):
1. Tab "Details"
2. Harus ada:
   - `node.exe` (2x - untuk backend & frontend)
   - `postgres.exe` (database)

## 🎯 Next Steps Setelah Berhasil

1. **Update Product Prices:**
   - Cek harga real di Digiflazz
   - Update di database sesuai margin kamu

2. **Customization:**
   - Edit logo, warna, text di frontend
   - Update WhatsApp number di Footer

3. **Deploy ke Production:**
   - Sewa VPS (DigitalOcean, AWS, dll)
   - Beli domain
   - Follow `docs\DEPLOYMENT_GUIDE.md`

4. **Marketing:**
   - Buat Instagram/TikTok
   - Promosi di grup game
   - Mulai dapat customer!

## 📁 Struktur Folder Project

```
C:\Users\YourName\Documents\topup-game-project\
│
├── backend\           ← Backend API (port 5000)
├── frontend\          ← Frontend Website (port 3000)
├── database\          ← Database schema
└── docs\              ← Dokumentasi lengkap
```

## 💡 Tips Windows

1. **Pakai Windows Terminal** - Lebih modern dari CMD
2. **Pin folder ke Quick Access** - Mudah akses
3. **Buat shortcut** untuk start backend & frontend
4. **Backup .env files** - Jangan sampai hilang
5. **Pakai VS Code** - Built-in terminal, easier

## 🎮 Selamat!

Kamu sekarang punya **instant topup game system** yang running di Windows lokal!

**Tutorial selanjutnya:** Lihat `docs\BUSINESS_TIPS.md` untuk strategi bisnis!

---

**Need Help?** 
- Baca `docs\TESTING_GUIDE.md` untuk testing lengkap
- Baca `docs\DEPLOYMENT_GUIDE.md` untuk deploy online

**Good luck! 🚀**
