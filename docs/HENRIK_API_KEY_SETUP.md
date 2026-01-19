# 🔑 Setup Henrik API Key - Quick Guide

Henrik API sekarang **WAJIB pakai API key** untuk validasi Riot ID.

## ⚡ Quick Setup (5 Menit)

### Step 1: Get API Key

1. **Join Discord Henrik Dev:**
   ```
   https://discord.gg/X3GaVkX2YN
   ```

2. **Find API Key Channel:**
   - Look for `#api-key` or `#get-started` channel
   - Follow bot instructions (biasanya ada command)
   - Contoh command: `/api-key` atau follow form

3. **Get Your Key:**
   - Bot akan DM kamu API key
   - Format: string panjang (50+ characters)
   - Save key ini!

### Step 2: Add to .env

**Edit `backend/.env`:**

```env
# Henrik Dev API Key (untuk Riot ID validation)
HENRIKDEV_API_KEY=your_api_key_here_paste_from_discord
```

**Example:**
```env
HENRIKDEV_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### Step 3: Test

```bash
cd backend
node test-riotid.js
```

**Expected Output:**
```
=== RIOT ID VALIDATION TEST ===

Henrik API Key: Set ✓

TEST 1: Validating Real Riot ID
--------------------------------
Input: TenZ#TenZ (pro player)

✓ VALIDATION SUCCESS!
  Game Name: TenZ
  Tag Line: TenZ
  Full Riot ID: TenZ#TenZ
  Region: na
  Account Level: 500+

TEST 2: Validating Your Riot ID
--------------------------------
Input: segawon#limo

✓ Found: segawon#limo
  Region: ap
  Level: XX

✅ Riot ID Validation is WORKING with API key!
Rate Limit: 300 requests per minute
```

---

## ✅ What Changed?

### **Before (Old Code):**
```javascript
// No authentication
const response = await axios.get(apiUrl);
```
❌ Error 401 Unauthorized

### **After (Updated Code):**
```javascript
// With API key
const response = await axios.get(apiUrl, {
  headers: {
    'Authorization': process.env.HENRIKDEV_API_KEY
  }
});
```
✅ Works perfectly!

---

## 🎯 Benefits dengan API Key

**Without Key (Old):**
- ❌ Can't use (Unauthorized error)

**With Key (New):**
- ✅ 300 requests per minute
- ✅ Stable & reliable
- ✅ Priority support
- ✅ Better rate limits

---

## 🚨 Troubleshooting

### Error: "API Key invalid"
**Solution:**
```bash
# Check .env file
cat backend/.env | grep HENRIKDEV

# Make sure:
# 1. No spaces around =
# 2. No quotes
# 3. Correct key dari Discord
```

### Error: "HENRIKDEV_API_KEY not set"
**Solution:**
```bash
# Add to .env
echo "HENRIKDEV_API_KEY=your_key_here" >> backend/.env

# Restart backend
# Ctrl+C, then npm run dev
```

### Error: Still 401 Unauthorized
**Solution:**
1. Check key is correct (copy ulang dari Discord)
2. Check no extra spaces/characters
3. Restart backend server
4. Check Discord - key might be expired (request new one)

---

## 📝 Complete .env Example

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/topup_game

# JWT
JWT_SECRET=your_random_secret_key

# ApiGames
APIGAMES_MERCHANT_ID=M123456
APIGAMES_SECRET_KEY=your_apigames_secret

# Xendit
XENDIT_SECRET_KEY=xnd_development_xxxxx
XENDIT_PUBLIC_KEY=xnd_public_development_xxxxx
XENDIT_IS_PRODUCTION=false
XENDIT_CALLBACK_TOKEN=random_token_123

# Henrik Dev API (NEW!)
HENRIKDEV_API_KEY=your_henrik_api_key_from_discord

# URLs
CALLBACK_URL=http://localhost:5000/api/payment/callback
FRONTEND_URL=http://localhost:3000
```

---

## ✅ Verification Checklist

- [ ] Joined Henrik Discord server
- [ ] Requested and received API key
- [ ] Added `HENRIKDEV_API_KEY` to .env
- [ ] Tested with `node test-riotid.js`
- [ ] See "✓ VALIDATION SUCCESS" message
- [ ] Ready to use Riot ID checker!

---

## 🎮 Usage in Application

After setup, Riot ID validation will work automatically:

**Frontend (Order Page):**
```
User inputs:
  Riot ID: segawon
  Tagline: limo

[System validates in background]

✓ Riot ID ditemukan!
  segawon#limo
  Level: 45
  Region: Asia Pacific

[User can proceed to payment]
```

**Backend automatically:**
- Calls Henrik API with authentication
- Returns player info
- Validates account exists
- Shows confirmation to user

---

## 🚀 Next Steps

1. ✅ Get Henrik API key (5 min)
2. ✅ Add to .env
3. ✅ Test with script
4. ✅ Start backend & frontend
5. ✅ Test full order flow!

---

**Henrik Discord:** https://discord.gg/X3GaVkX2YN

**Rate Limit dengan API Key:** 300 requests/minute = 18,000 requests/hour!

More than enough untuk side hustle! 🚀💰
