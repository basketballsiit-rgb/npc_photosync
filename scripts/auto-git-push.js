/**
 * Auto Git Watcher & Pusher for NPC_PhotoSync
 * Watches project file changes and automatically commits & pushes to GitHub with debounce.
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const DEBOUNCE_MS = 15000; // 15 seconds debounce to batch multiple file saves
let debounceTimer = null;
let isPushing = false;

// Folders and files to ignore from triggering auto-push
const IGNORED_PATHS = [
  ".git",
  "node_modules",
  ".next",
  "public/uploads",
  "tsconfig.tsbuildinfo",
  ".env",
  ".env.local",
  "npm-debug.log",
  "yarn-error.log",
];

function shouldIgnore(filename) {
  if (!filename) return true;
  const normalized = filename.replace(/\\/g, "/");
  return IGNORED_PATHS.some((ignored) => normalized.startsWith(ignored) || normalized.includes(`/${ignored}/`));
}

function runGitAutoPush() {
  if (isPushing) return;
  isPushing = true;

  try {
    const status = execSync("git status --porcelain", { encoding: "utf-8" }).trim();
    if (!status) {
      isPushing = false;
      return;
    }

    const changedFilesSummary = status
      .split("\n")
      .map((line) => line.trim())
      .slice(0, 5)
      .join(", ");

    const now = new Date();
    const thaiTime = now.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const commitMsg = `Auto-sync: ${thaiTime} [${changedFilesSummary.substring(0, 80)}]`;

    console.log(`\n🔄 [Auto-Git] Changes detected! Staging and committing...`);
    execSync("git add .", { stdio: "inherit" });
    execSync(`git commit -m "${commitMsg}"`, { stdio: "inherit" });

    console.log(`🚀 [Auto-Git] Pushing to origin main...`);
    execSync("git push origin main", { stdio: "inherit" });

    console.log(`✅ [Auto-Git] Successfully synced with GitHub at ${thaiTime}\n`);
  } catch (error) {
    console.error(`❌ [Auto-Git] Push failed:`, error.message);
  } finally {
    isPushing = false;
  }
}

function onFileChange(eventType, filename) {
  if (shouldIgnore(filename)) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    runGitAutoPush();
  }, DEBOUNCE_MS);
}

console.log("==========================================================");
console.log("   🚀 NPC_PhotoSync — Realtime Git Auto-Sync Active");
console.log("   Repository: https://github.com/basketballsiit-rgb/npc_photosync.git");
console.log(`   Debounce Delay: ${DEBOUNCE_MS / 1000}s`);
console.log("==========================================================\n");

// Initial check on start
runGitAutoPush();

// Watch root directory recursively (Windows natively supports recursive watching)
try {
  fs.watch(process.cwd(), { recursive: true }, onFileChange);
  console.log("👀 Watching for file changes... (Press Ctrl+C to stop)");
} catch (err) {
  console.error("Failed to start recursive watcher:", err);
}
