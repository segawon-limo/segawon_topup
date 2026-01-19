#!/bin/bash

# Quick Start Script untuk Local Development
# Run: chmod +x quickstart.sh && ./quickstart.sh

echo "🎮 Instant Game Topup - Quick Start"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js tidak ditemukan. Install Node.js terlebih dahulu:"
    echo "   https://nodejs.org"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL tidak ditemukan. Install PostgreSQL terlebih dahulu:"
    echo "   https://www.postgresql.org/download/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ PostgreSQL detected"
echo ""

# Setup Database
echo "📊 Setting up database..."
echo "Pastikan PostgreSQL sudah running!"
read -p "Username PostgreSQL (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Password PostgreSQL: " DB_PASS
echo ""

# Create database
echo "Creating database..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -c "CREATE DATABASE topup_game;" 2>/dev/null
echo "Importing schema..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -d topup_game -f database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup complete!"
else
    echo "⚠️  Error setting up database. Check your credentials."
fi
echo ""

# Setup Backend
echo "🔧 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    
    # Update database URL
    sed -i.bak "s|postgresql://postgres:password@localhost:5432/topup_game|postgresql://$DB_USER:$DB_PASS@localhost:5432/topup_game|g" .env
    rm .env.bak 2>/dev/null
    
    echo "⚠️  PENTING: Edit file backend/.env dan isi:"
    echo "   - DIGIFLAZZ_USERNAME dan DIGIFLAZZ_API_KEY"
    echo "   - MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY"
fi

echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Backend setup complete!"
else
    echo "❌ Error installing backend dependencies"
    exit 1
fi

cd ..
echo ""

# Setup Frontend
echo "🌐 Setting up frontend..."
cd frontend

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    
    echo "⚠️  PENTING: Edit file frontend/.env dan isi REACT_APP_MIDTRANS_CLIENT_KEY"
fi

echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Frontend setup complete!"
else
    echo "❌ Error installing frontend dependencies"
    exit 1
fi

cd ..
echo ""
echo "===================================="
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit backend/.env dengan credentials Digiflazz dan Midtrans"
echo "2. Edit frontend/.env dengan Midtrans Client Key"
echo "3. Run backend: cd backend && npm run dev"
echo "4. Run frontend: cd frontend && npm start"
echo ""
echo "📖 Lihat docs/SETUP_GUIDE.md untuk panduan lengkap"
echo "===================================="
