#!/bin/bash
# ══════════════════════════════════════════════════════════════
# deploy-frontend.sh — Frontend Only Deploy (Zero Downtime)
# Build ke temp folder, swap atomik, reload Nginx
# TIDAK reload pm2 — dipakai untuk update gambar/UI saja
# ══════════════════════════════════════════════════════════════

set -e

APP_DIR="/home/segawon/apps/segawon_topup"
FRONTEND_DIR="$APP_DIR/frontend"
BUILD_DIR="$FRONTEND_DIR/build"
BUILD_NEW="$FRONTEND_DIR/build_new"
BUILD_OLD="$FRONTEND_DIR/build_old"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   🎨 Segawon — Deploy Frontend Only      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Step 1: Build ke folder sementara ─────────────────────────
echo "🔨 [1/3] Building frontend ke folder sementara..."
rm -rf "$BUILD_NEW"

cd "$FRONTEND_DIR"
BUILD_PATH=./build_new npm run build

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build gagal! Website tetap berjalan dengan versi lama."
  rm -rf "$BUILD_NEW"
  exit 1
fi

echo "✅ Build selesai."
echo ""

# ── Step 2: Swap folder ────────────────────────────────────────
echo "🔄 [2/3] Swap folder build..."
mv "$BUILD_DIR" "$BUILD_OLD"
mv "$BUILD_NEW" "$BUILD_DIR"
rm -rf "$BUILD_OLD"
echo "✅ Swap selesai."
echo ""

# ── Step 3: Reload Nginx ───────────────────────────────────────
echo "♻️  [3/3] Reload Nginx..."
sudo nginx -s reload
echo "✅ Nginx reloaded."
echo ""

echo "╔══════════════════════════════════════════╗"
echo "║   ✅ Frontend deploy selesai!            ║"
echo "╚══════════════════════════════════════════╝"
echo ""