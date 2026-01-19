# 🎮 Segawon Top-Up Platform

Full-stack game top-up platform with multi-payment gateway support.

## 🏗️ Project Structure
```
topup-game-project/
├── backend/           # Express.js API
├── frontend/          # React/Next.js App
└── README.md
```

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your API keys in .env
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

## 📦 Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL
- Midtrans, Xendit, Duitku (Payment)
- Digiflazz (Supplier)

**Frontend:**
- React / Next.js
- Tailwind CSS
- Axios

## 🔐 Environment Variables

See `.env.example` files in each folder for required variables.

## 📝 License

Private - All rights reserved
