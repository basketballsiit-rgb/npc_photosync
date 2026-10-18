import crypto from "crypto";
import { getSystemSetting, saveSystemSetting } from "@/lib/services/systemSettingService";

const AUTH_COOKIE_NAME = "npc_admin_auth";
const DEFAULT_ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASSWORD || "npcadmin2026";
const SECRET_KEY = process.env.NEXTAUTH_SECRET || "npc-photosync-super-secret-key-2026-auth";

export interface AdminSession {
  username: string;
  name: string;
  role: "SUPER_ADMIN";
  loginAt: number;
  expiresAt: number;
}

/**
 * Get current configured admin password
 */
export async function getAdminCredentials(): Promise<{ username: string; passwordHash: string; plainPassword?: string }> {
  try {
    const customPass = await getSystemSetting("ADMIN_PASSWORD_HASH");
    const customUser = await getSystemSetting("ADMIN_USERNAME");

    if (customPass) {
      return {
        username: (customUser || DEFAULT_ADMIN_USER).trim(),
        passwordHash: customPass,
      };
    }
  } catch (err) {
    console.warn("Could not load custom admin password from settings:", err);
  }

  // Default password hash
  const defaultHash = hashPassword(DEFAULT_ADMIN_PASS);
  return {
    username: DEFAULT_ADMIN_USER,
    passwordHash: defaultHash,
    plainPassword: DEFAULT_ADMIN_PASS,
  };
}

/**
 * Hash password with salt
 */
export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(password).digest("hex");
}

/**
 * Validate username and password
 */
export async function verifyAdminCredentials(usernameInput: string, passwordInput: string): Promise<boolean> {
  const { username, passwordHash } = await getAdminCredentials();

  const cleanUser = usernameInput.trim().toLowerCase();
  const validUser =
    cleanUser === username.toLowerCase() ||
    cleanUser === "admin@npc.ac.th" ||
    cleanUser === "admin";

  if (!validUser) {
    return false;
  }

  const inputHash = hashPassword(passwordInput);
  return inputHash === passwordHash;
}

/**
 * Update admin password
 */
export async function updateAdminPassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
  }
  const newHash = hashPassword(newPassword);
  await saveSystemSetting("ADMIN_PASSWORD_HASH", newHash, "รหัสผ่านผู้ดูแลระบบเข้ารหัส SHA-256");
}

/**
 * Create signed session token (Valid for 7 days)
 */
export function createSessionToken(username: string): string {
  const session: AdminSession = {
    username,
    name: "ผู้ดูแลระบบ (Admin)",
    role: "SUPER_ADMIN",
    loginAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}

/**
 * Verify and decode session token
 */
export function verifySessionToken(token: string): AdminSession | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const session: AdminSession = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export { AUTH_COOKIE_NAME };
