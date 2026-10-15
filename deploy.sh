#!/bin/bash
set -e

# ==============================================================
# NPC PhotoSync - Manual & CI/CD Deployment Script
# วางที่: /var/www/npc_photosync/deploy.sh
# ==============================================================

PROJECT_DIR="/var/www/npc_photosync"
echo "=== 🚀 Starting NPC_PhotoSync Deployment ==="
cd "$PROJECT_DIR"

# 1. โหลด Node.js Environment (รองรับ NVM v20 ตามมาตรฐานเซิร์ฟเวอร์วิทยาลัย)
if [ -d "/root/.nvm/versions/node/v20.20.2/bin" ]; then
    export PATH="/root/.nvm/versions/node/v20.20.2/bin:$PATH"
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 2. ดึงโค้ดล่าสุดจาก GitHub main branch
echo "=== 📥 Git Pull & Reset ==="
git fetch origin main
git reset --hard origin/main

# 3. ตรวจสอบไฟล์ .env
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# 4. ติดตั้ง Node Dependencies
echo "=== 📦 Installing NPM Packages ==="
npm install

# 5. ซิงค์ฐานข้อมูล Prisma (MySQL)
echo "=== 🗄️ Prisma Generate & DB Push ==="
npx prisma generate
npx prisma db push --accept-data-loss || true

# 6. Build Next.js Production
echo "=== ⚡ Building Next.js Application ==="
npm run build

# 7. ตรวจสอบสิทธิ์โฟลเดอร์สำหรับเก็บไฟล์ภาพแคช
echo "=== 🔒 Ensuring Uploads Directory & Permissions ==="
mkdir -p public/uploads/thumbnail public/uploads/report public/uploads/original
chmod -R 777 public/uploads
chcon -R -t httpd_sys_rw_content_t public/uploads 2>/dev/null || true

# 8. รีสตาร์ท Process ด้วย PM2 (พอร์ต 3006)
echo "=== 🔄 Restarting Application via PM2 ==="
if command -v pm2 > /dev/null 2>&1; then
    pm2 restart npc_photosync || pm2 start ecosystem.config.js
    pm2 save
else
    npx pm2 restart npc_photosync || npx pm2 start ecosystem.config.js
    npx pm2 save
fi

echo "=== ✅ NPC_PhotoSync Deployment Completed Successfully ==="
