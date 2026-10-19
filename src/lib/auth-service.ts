import crypto from "crypto";
import { getSystemSetting, saveSystemSetting } from "@/lib/services/systemSettingService";

const AUTH_COOKIE_NAME = "npc_admin_auth";
const DEFAULT_ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASSWORD || "npcadmin2026";

const DEFAULT_PR_USER = process.env.PR_USERNAME || "pr";
const DEFAULT_PR_PASS = process.env.PR_PASSWORD || "prnpc2026";

const SECRET_KEY = process.env.NEXTAUTH_SECRET || "npc-photosync-super-secret-key-2026-auth";

export interface UserSession {
  username: string;
  name: string;
  role: "SUPER_ADMIN" | "PR_STAFF";
  loginAt: number;
  expiresAt: number;
}

export type AdminSession = UserSession;

/**
 * Get current configured admin credentials
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

  const defaultHash = hashPassword(DEFAULT_ADMIN_PASS);
  return {
    username: DEFAULT_ADMIN_USER,
    passwordHash: defaultHash,
    plainPassword: DEFAULT_ADMIN_PASS,
  };
}

/**
 * Get current configured PR staff credentials
 */
export async function getPrCredentials(): Promise<{ username: string; passwordHash: string; plainPassword?: string }> {
  try {
    const customPass = await getSystemSetting("PR_PASSWORD_HASH");
    const customUser = await getSystemSetting("PR_USERNAME");

    if (customPass) {
      return {
        username: (customUser || DEFAULT_PR_USER).trim(),
        passwordHash: customPass,
      };
    }
  } catch (err) {
    console.warn("Could not load custom PR staff password from settings:", err);
  }

  const defaultHash = hashPassword(DEFAULT_PR_PASS);
  return {
    username: DEFAULT_PR_USER,
    passwordHash: defaultHash,
    plainPassword: DEFAULT_PR_PASS,
  };
}

/**
 * Hash password with salt
 */
export function hashPassword(password: string): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(password).digest("hex");
}

/**
 * Validate credentials for any system role (SUPER_ADMIN or PR_STAFF)
 */
export async function verifyUserCredentials(usernameInput: string, passwordInput: string): Promise<{
  isValid: boolean;
  user?: {
    username: string;
    name: string;
    role: "SUPER_ADMIN" | "PR_STAFF";
  };
}> {
  const cleanUser = usernameInput.trim().toLowerCase();
  const inputHash = hashPassword(passwordInput);

  // 1. Check Super Admin
  const adminCreds = await getAdminCredentials();
  const isAdminUser =
    cleanUser === adminCreds.username.toLowerCase() ||
    cleanUser === "admin@npc.ac.th" ||
    cleanUser === "admin";

  if (isAdminUser) {
    if (inputHash === adminCreds.passwordHash) {
      return {
        isValid: true,
        user: {
          username: adminCreds.username,
          name: "ผู้ดูแลระบบสูงสุด (Super Admin)",
          role: "SUPER_ADMIN",
        },
      };
    }
    return { isValid: false };
  }

  // 2. Check PR Staff
  const prCreds = await getPrCredentials();
  const isPrUser =
    cleanUser === prCreds.username.toLowerCase() ||
    cleanUser === "pr" ||
    cleanUser === "prstaff" ||
    cleanUser === "pr.staff@npc.ac.th" ||
    cleanUser === "pr@npc.ac.th";

  if (isPrUser) {
    if (inputHash === prCreds.passwordHash) {
      return {
        isValid: true,
        user: {
          username: prCreds.username,
          name: "เจ้าหน้าที่งานประชาสัมพันธ์ (PR)",
          role: "PR_STAFF",
        },
      };
    }
    return { isValid: false };
  }

  return { isValid: false };
}

/**
 * Legacy wrapper for backward compatibility
 */
export async function verifyAdminCredentials(usernameInput: string, passwordInput: string): Promise<boolean> {
  const result = await verifyUserCredentials(usernameInput, passwordInput);
  return result.isValid;
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
 * Update PR staff password
 */
export async function updatePrPassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
  }
  const newHash = hashPassword(newPassword);
  await saveSystemSetting("PR_PASSWORD_HASH", newHash, "รหัสผ่านงานประชาสัมพันธ์เข้ารหัส SHA-256");
}

/**
 * Create signed session token (Valid for 7 days)
 */
export function createSessionToken(
  username: string,
  role: "SUPER_ADMIN" | "PR_STAFF" = "SUPER_ADMIN",
  name?: string
): string {
  const defaultName = role === "PR_STAFF" ? "เจ้าหน้าที่งานประชาสัมพันธ์ (PR)" : "ผู้ดูแลระบบสูงสุด (Super Admin)";
  const session: UserSession = {
    username,
    name: name || defaultName,
    role,
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
export function verifySessionToken(token: string): UserSession | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const session: UserSession = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export { AUTH_COOKIE_NAME };
