# 🚀 Deployment Guide - Production Setup

Panduan deploy project ke production server (VPS).

## 🎯 Pilihan Hosting

### Budget Rendah (Rp 50.000 - 150.000/bulan)
- **Niagahoster VPS** - Rp 50.000/bulan
- **Dewaweb Cloud** - Rp 80.000/bulan
- **Hostinger VPS** - Rp 70.000/bulan

### Budget Medium (Rp 200.000 - 500.000/bulan)
- **DigitalOcean Droplet** - $6/bulan (~Rp 90.000)
- **Vultr** - $6/bulan
- **AWS Lightsail** - $5/bulan

### Recommended: DigitalOcean
Paling populer, mudah digunakan, dokumentasi lengkap.

## 📦 Step 1: Setup VPS

### Create Droplet di DigitalOcean

1. **Daftar di DigitalOcean:**
   - Buka https://www.digitalocean.com
   - Sign up (dapat $200 credit untuk 60 hari)

2. **Create Droplet:**
   - Klik "Create" → "Droplets"
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic $6/month (1GB RAM, 25GB SSD)
   - **Datacenter:** Singapore (paling dekat dengan Indonesia)
   - **Authentication:** SSH Key (recommended) atau Password
   - **Hostname:** topup-game-server
   - Klik "Create Droplet"

3. **Catat IP Address**
   Setelah droplet dibuat, catat IP address (contoh: 128.199.123.456)

### Connect ke VPS

```bash
# Via SSH
ssh root@YOUR_VPS_IP

# Jika pakai password, masukkan password
# Jika pakai SSH key, langsung connect
```

## 🔧 Step 2: Install Dependencies di VPS

### Update System
```bash
apt update && apt upgrade -y
```

### Install Node.js
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Verify
node --version
npm --version
```

### Install PostgreSQL
```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start service
systemctl start postgresql
systemctl enable postgresql

# Verify
sudo -u postgres psql --version
```

### Install Nginx (Web Server)
```bash
apt install -y nginx

# Start service
systemctl start nginx
systemctl enable nginx
```

### Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### Install Git
```bash
apt install -y git
```

## 🗄️ Step 3: Setup Database

```bash
# Login sebagai postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE topup_game;

# Create user
CREATE USER topup_admin WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE topup_game TO topup_admin;

# Exit
\q
```

### Import Schema
```bash
# Upload schema.sql ke VPS (dari komputer local)
scp database/schema.sql root@YOUR_VPS_IP:/root/

# Di VPS, import schema
sudo -u postgres psql topup_game < /root/schema.sql
```

## 📁 Step 4: Deploy Backend

### Clone/Upload Project
**Option A: Via Git (Recommended)**
```bash
cd /var/www
git clone YOUR_REPO_URL topup-game
cd topup-game/backend
```

**Option B: Upload Manual**
```bash
# Di komputer local, compress project
tar -czf topup-game.tar.gz topup-game-project/

# Upload ke VPS
scp topup-game.tar.gz root@YOUR_VPS_IP:/var/www/

# Di VPS, extract
cd /var/www
tar -xzf topup-game.tar.gz
mv topup-game-project topup-game
cd topup-game/backend
```

### Install Dependencies
```bash
npm install --production
```

### Setup Environment
```bash
# Create .env file
nano .env
```

Isi dengan konfigurasi production:
```env
PORT=5000
NODE_ENV=production

DATABASE_URL=postgresql://topup_admin:your_secure_password@localhost:5432/topup_game

JWT_SECRET=your_super_secure_random_jwt_secret_key

DIGIFLAZZ_USERNAME=your_real_username
DIGIFLAZZ_API_KEY=your_real_api_key
DIGIFLAZZ_ENDPOINT=https://api.digiflazz.com/v1

MIDTRANS_SERVER_KEY=your_production_server_key
MIDTRANS_CLIENT_KEY=your_production_client_key
MIDTRANS_IS_PRODUCTION=true
MIDTRANS_MERCHANT_ID=your_merchant_id

CALLBACK_URL=https://api.yourdomain.com/api/payment/callback
FRONTEND_URL=https://yourdomain.com

FONNTE_TOKEN=your_fonnte_token
FONNTE_ENABLED=true

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Save: `Ctrl + O`, `Enter`, `Ctrl + X`

### Start Backend with PM2
```bash
# Start
pm2 start src/server.js --name topup-backend

# Setup auto-restart on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs topup-backend
```

## 🌐 Step 5: Deploy Frontend

### Build Frontend
```bash
cd /var/www/topup-game/frontend

# Create .env.production
nano .env.production
```

Isi:
```env
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_MIDTRANS_CLIENT_KEY=your_production_client_key
REACT_APP_SITE_NAME=TopupGame.id
REACT_APP_WHATSAPP=628123456789
```

```bash
# Install dependencies
npm install

# Build
npm run build
```

### Setup Nginx

**Backend Config:**
```bash
nano /etc/nginx/sites-available/api.yourdomain.com
```

Isi:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Frontend Config:**
```bash
nano /etc/nginx/sites-available/yourdomain.com
```

Isi:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/topup-game/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable Sites:**
```bash
# Enable configs
ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/

# Remove default
rm /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Restart nginx
systemctl restart nginx
```

## 🔒 Step 6: Setup SSL (HTTPS)

### Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### Get SSL Certificate
```bash
# Untuk frontend
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Untuk backend API
certbot --nginx -d api.yourdomain.com

# Follow prompts:
# 1. Enter email
# 2. Agree to terms
# 3. Choose redirect HTTP to HTTPS: Yes
```

### Auto-Renewal
```bash
# Test renewal
certbot renew --dry-run

# Certbot akan auto-renew setiap 90 hari
```

## 🔐 Step 7: Security Hardening

### Firewall
```bash
# Install UFW
apt install -y ufw

# Allow SSH, HTTP, HTTPS
ufw allow 22
ufw allow 80
ufw allow 443

# Enable firewall
ufw enable
ufw status
```

### Fail2Ban (Anti Bruteforce)
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### Secure PostgreSQL
```bash
# Edit PostgreSQL config
nano /etc/postgresql/14/main/postgresql.conf

# Set: listen_addresses = 'localhost'

# Restart
systemctl restart postgresql
```

## 📊 Step 8: Monitoring

### Setup PM2 Monitoring
```bash
# Install PM2 Web Dashboard (optional)
pm2 install pm2-server-monit
```

### Log Rotation
```bash
# Setup log rotation for PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Check Logs
```bash
# Backend logs
pm2 logs topup-backend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

## 🔄 Step 9: Maintenance & Updates

### Update Application
```bash
cd /var/www/topup-game

# Pull latest code
git pull

# Backend
cd backend
npm install --production
pm2 restart topup-backend

# Frontend
cd ../frontend
npm install
npm run build

# No need to restart nginx (static files updated)
```

### Backup Database
```bash
# Manual backup
pg_dump -U topup_admin topup_game > backup_$(date +%Y%m%d).sql

# Auto backup script
nano /root/backup.sh
```

Script:
```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
pg_dump -U topup_admin topup_game > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

```bash
chmod +x /root/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup.sh
```

## 🎯 Post-Deployment Checklist

- [ ] Website accessible via HTTPS
- [ ] SSL certificate valid (green lock)
- [ ] API endpoint working
- [ ] Test order flow end-to-end
- [ ] Payment gateway configured (production mode)
- [ ] Digiflazz API working with real balance
- [ ] WhatsApp notification working
- [ ] Database backup automated
- [ ] Monitoring setup
- [ ] Firewall enabled
- [ ] PM2 auto-restart working

## 🚨 Common Issues

**Backend tidak start:**
```bash
pm2 logs topup-backend --lines 50
# Check error messages
```

**Nginx error:**
```bash
nginx -t  # Test config
systemctl status nginx
tail -f /var/log/nginx/error.log
```

**Database connection failed:**
```bash
# Check PostgreSQL running
systemctl status postgresql

# Check credentials in .env
# Check DATABASE_URL format
```

**Cannot connect to API:**
- Check firewall: `ufw status`
- Check nginx config: `nginx -t`
- Check backend running: `pm2 status`
- Check DNS pointing to correct IP

## 💰 Estimated Costs

**Monthly:**
- VPS (DigitalOcean): $6 (~Rp 90.000)
- Domain (.com): $12/year (~Rp 15.000/month)
- **Total: ~Rp 105.000/bulan**

**Additional:**
- Digiflazz saldo: Sesuai kebutuhan (recommend mulai Rp 500.000)
- Marketing budget: Sesuai kebutuhan

## 📈 Scaling Tips

Jika traffic tinggi:
1. **Upgrade VPS** - Tambah RAM & CPU
2. **CDN** - Pakai Cloudflare (gratis)
3. **Database Optimization** - Add indexes, tune PostgreSQL
4. **Load Balancer** - Multiple backend instances
5. **Redis Cache** - Cache products & settings

Good luck! 🚀
