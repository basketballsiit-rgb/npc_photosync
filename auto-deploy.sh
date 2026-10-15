#!/bin/bash
# ==============================================================
# NPC PhotoSync - Auto Deploy Script (For Crontab)
# วางที่: /var/www/npc_photosync/auto-deploy.sh
# รูปแบบเดียวกับ /var/www/npc_smartflow/auto-deploy.sh
# ==============================================================

PROJECT_DIR="/var/www/npc_photosync"
cd "$PROJECT_DIR" || exit 1

# โหลด Node.js
if [ -d "/root/.nvm/versions/node/v20.20.2/bin" ]; then
    export PATH="/root/.nvm/versions/node/v20.20.2/bin:$PATH"
fi

# ตรวจสอบการเชื่อมต่อกับ Remote ก่อนทำงาน
git fetch origin main > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "$(date): [Error] Cannot fetch from origin. Check network or Git configuration." >> deploy.log
    exit 1
fi

# ดึงสถานะปัจจุบันเทียบ
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

# หากพบว่าโค้ดบน GitHub มีการแก้ไข (Local ไม่ตรงกับ Remote)
if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date): [Update Found] Starting automated deployment..." >> deploy.log

    # 1. ดึงโค้ดล่าสุดลงมา
    git pull origin main >> deploy.log 2>&1

    # 2. ติดตั้งแพ็กเกจ & ซิงค์ฐานข้อมูล
    npm install >> deploy.log 2>&1
    npx prisma generate >> deploy.log 2>&1
    npx prisma db push --accept-data-loss >> deploy.log 2>&1

    # 3. Build Next.js Production
    echo "$(date): [Build] Running npm run build..." >> deploy.log
    npm run build >> deploy.log 2>&1

    if [ $? -eq 0 ]; then
        echo "$(date): [Build Success] Restarting Next.js server..." >> deploy.log

        # 4. ปรับสิทธิ์โฟลเดอร์รูปภาพ
        mkdir -p public/uploads/thumbnail public/uploads/report public/uploads/original
        chmod -R 777 public/uploads >> deploy.log 2>&1
        chcon -R -t httpd_sys_rw_content_t public/uploads >> deploy.log 2>/dev/null

        # 5. รีสตาร์ทผ่าน PM2
        if command -v pm2 > /dev/null 2>&1; then
            pm2 restart npc_photosync || pm2 start npm --name "npc_photosync" -- start -- -p 3005
            pm2 save >> deploy.log 2>&1
        else
            npx pm2 restart npc_photosync || npx pm2 start npm --name "npc_photosync" -- start -- -p 3005
            npx pm2 save >> deploy.log 2>&1
        fi

        echo "$(date): [Finished] Application is up to date and online!" >> deploy.log
    else
        echo "$(date): [Error] Build failed! Check deploy.log for errors." >> deploy.log
    fi
else
    # โค้ดตรงกับ GitHub อยู่แล้ว
    true
fi
