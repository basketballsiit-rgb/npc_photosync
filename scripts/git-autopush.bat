@echo off
title NPC_PhotoSync - Realtime Git Auto-Sync
cd /d "%~dp0\.."
echo ========================================================
echo    Starting NPC_PhotoSync Git Auto-Push Watcher...
echo ========================================================
node scripts/auto-git-push.js
pause
