import prisma from "@/lib/prisma";

// In-memory cache for fast access
let settingsCache: Record<string, string> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute TTL

/**
 * Fetch all system settings from database with caching
 */
export async function getAllSystemSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (settingsCache && now - lastFetchTime < CACHE_TTL_MS) {
    return settingsCache;
  }

  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    settingsCache = map;
    lastFetchTime = now;
    return map;
  } catch (error) {
    console.warn("Could not query system_settings from database, falling back to empty:", error);
    return settingsCache || {};
  }
}

/**
 * Invalidate cache
 */
export function invalidateSettingsCache() {
  settingsCache = null;
  lastFetchTime = 0;
}

/**
 * Get a specific system setting with fallback to process.env
 */
export async function getSystemSetting(key: string, defaultValue?: string): Promise<string | undefined> {
  const all = await getAllSystemSettings();
  if (all[key] !== undefined && all[key].trim() !== "") {
    return all[key];
  }
  return process.env[key] ?? defaultValue;
}

/**
 * Save or update a system setting
 */
export async function saveSystemSetting(key: string, value: string, description?: string) {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value, description },
    create: { key, value, description },
  });
  invalidateSettingsCache();
}

export interface GoogleDriveConfig {
  clientEmail: string;
  privateKey: string;
  rootFolderId: string;
  isConfigured: boolean;
  isMock: boolean;
  source: "database" | "env" | "none";
}

/**
 * Get Google Drive configuration
 */
export async function getGoogleDriveConfig(): Promise<GoogleDriveConfig> {
  const all = await getAllSystemSettings();

  const clientEmail = (all["GOOGLE_SERVICE_ACCOUNT_EMAIL"] || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  let privateKey = (all["GOOGLE_PRIVATE_KEY"] || process.env.GOOGLE_PRIVATE_KEY || "").trim();
  const rootFolderId = (all["GOOGLE_SHARED_DRIVE_ROOT_ID"] || process.env.GOOGLE_SHARED_DRIVE_ROOT_ID || "").trim();

  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const isMock =
    !clientEmail ||
    clientEmail.includes("npc-photosync-sa@pvc-nan.iam") ||
    clientEmail.includes("your-gcp-project") ||
    privateKey.length < 500 ||
    privateKey.includes("MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...");

  const source = all["GOOGLE_SERVICE_ACCOUNT_EMAIL"]
    ? "database"
    : process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ? "env"
    : "none";

  return {
    clientEmail,
    privateKey,
    rootFolderId,
    isConfigured: Boolean(clientEmail && privateKey && !isMock),
    isMock,
    source,
  };
}
