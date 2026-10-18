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
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRefreshToken: string;
  oauthUserEmail: string;
  authType: "oauth" | "service_account" | "none";
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

  const oauthClientId = (all["GOOGLE_OAUTH_CLIENT_ID"] || process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
  const oauthClientSecret = (all["GOOGLE_OAUTH_CLIENT_SECRET"] || process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim();
  const oauthRefreshToken = (all["GOOGLE_OAUTH_REFRESH_TOKEN"] || process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "").trim();
  const oauthUserEmail = (all["GOOGLE_OAUTH_USER_EMAIL"] || process.env.GOOGLE_OAUTH_USER_EMAIL || "").trim();

  const clientEmail = (all["GOOGLE_SERVICE_ACCOUNT_EMAIL"] || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  let privateKey = (all["GOOGLE_PRIVATE_KEY"] || process.env.GOOGLE_PRIVATE_KEY || "").trim();
  const rootFolderId = (
    all["GOOGLE_SHARED_DRIVE_ROOT_ID"] ||
    process.env.GOOGLE_SHARED_DRIVE_ROOT_ID ||
    "1hYayVdA3Bm7-HIWiutHcJ3j8PI808CwV"
  ).trim();

  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const isOAuthValid = Boolean(oauthClientId && oauthClientSecret && oauthRefreshToken);
  const isSaValid = Boolean(
    clientEmail &&
    privateKey &&
    !clientEmail.includes("your-gcp-project") &&
    privateKey.length > 500
  );

  let authType: "oauth" | "service_account" | "none" = "none";
  if (isOAuthValid) {
    authType = "oauth";
  } else if (isSaValid) {
    authType = "service_account";
  }

  const isConfigured = isOAuthValid || isSaValid;
  const isMock = !isConfigured;

  const source = all["GOOGLE_OAUTH_REFRESH_TOKEN"] || all["GOOGLE_SERVICE_ACCOUNT_EMAIL"]
    ? "database"
    : process.env.GOOGLE_OAUTH_REFRESH_TOKEN || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    ? "env"
    : "none";

  return {
    oauthClientId,
    oauthClientSecret,
    oauthRefreshToken,
    oauthUserEmail,
    authType,
    clientEmail,
    privateKey,
    rootFolderId,
    isConfigured,
    isMock,
    source,
  };
}

export interface LineMessagingConfig {
  channelAccessToken: string;
  channelSecret: string;
  targetGroupId: string;
  isEnabled: boolean;
  isConfigured: boolean;
  lastDetectedGroupId?: string;
  source: "database" | "env" | "none";
}

/**
 * Get LINE Messaging API configuration from database or env fallback
 */
export async function getLineMessagingConfig(): Promise<LineMessagingConfig> {
  const all = await getAllSystemSettings();

  const channelAccessToken = (
    all["LINE_CHANNEL_ACCESS_TOKEN"] ||
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    ""
  ).trim();

  const channelSecret = (
    all["LINE_CHANNEL_SECRET"] ||
    process.env.LINE_CHANNEL_SECRET ||
    ""
  ).trim();

  const targetGroupId = (
    all["LINE_TARGET_GROUP_ID"] ||
    process.env.LINE_TARGET_GROUP_ID ||
    ""
  ).trim();

  const isEnabledStr = (
    all["LINE_NOTIFY_ENABLED"] ??
    process.env.LINE_NOTIFY_ENABLED ??
    "true"
  ).trim().toLowerCase();
  const isEnabled = isEnabledStr !== "false" && isEnabledStr !== "0";

  const lastDetectedGroupId = all["LINE_LAST_DETECTED_GROUP_ID"];

  const isMock =
    !channelAccessToken ||
    channelAccessToken.includes("your-line") ||
    channelAccessToken.includes("mock-");

  const source = all["LINE_CHANNEL_ACCESS_TOKEN"]
    ? "database"
    : process.env.LINE_CHANNEL_ACCESS_TOKEN
    ? "env"
    : "none";

  return {
    channelAccessToken,
    channelSecret,
    targetGroupId,
    isEnabled,
    isConfigured: Boolean(channelAccessToken && targetGroupId && !isMock),
    lastDetectedGroupId,
    source,
  };
}

