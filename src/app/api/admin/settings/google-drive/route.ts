import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleDriveConfig,
  saveSystemSetting,
  invalidateSettingsCache,
} from "@/lib/services/systemSettingService";
import { testDriveConnection } from "@/lib/services/googleDriveService";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/google-drive
 * Retrieve current Google Drive settings (with masked private key)
 */
export async function GET() {
  try {
    const config = await getGoogleDriveConfig();
    const testResult = await testDriveConnection();

    // Mask private key for security
    let maskedKey = "";
    if (config.privateKey) {
      if (config.privateKey.length > 50) {
        maskedKey = `${config.privateKey.substring(0, 30)}...[ซ่อนคีย์ ${config.privateKey.length} ตัวอักษร]...${config.privateKey.substring(config.privateKey.length - 25)}`;
      } else {
        maskedKey = "••••••••••••••••••••••••••••••";
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        clientEmail: config.clientEmail,
        rootFolderId: config.rootFolderId,
        hasPrivateKey: Boolean(config.privateKey && !config.isMock),
        privateKeyMasked: maskedKey,
        isConfigured: config.isConfigured,
        isMock: config.isMock,
        source: config.source,
      },
      status: testResult,
    });
  } catch (error: any) {
    console.error("Error fetching Google Drive settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings/google-drive
 * Update Google Drive settings from Web Admin UI
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      credentialsJson,
      clientEmail,
      privateKey,
      rootFolderId,
    } = body;

    let finalEmail = (clientEmail || "").trim();
    let finalPrivateKey = (privateKey || "").trim();
    let finalRootId = (rootFolderId || "").trim();

    // 1. If user provided a raw JSON service account file content, parse it automatically
    if (credentialsJson && credentialsJson.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(credentialsJson);
        if (parsed.client_email) {
          finalEmail = parsed.client_email;
        }
        if (parsed.private_key) {
          finalPrivateKey = parsed.private_key;
        }
      } catch (jsonErr) {
        return NextResponse.json(
          { success: false, error: "ไฟล์ JSON Service Account ไม่ถูกต้องตามรูปแบบ (Invalid JSON format)" },
          { status: 400 }
        );
      }
    }

    // Extract folder ID if user pasted full Google Drive folder URL
    // e.g., https://drive.google.com/drive/folders/1a2b3c4d5e6f... or https://drive.google.com/drive/u/0/folders/...
    if (finalRootId.includes("drive.google.com")) {
      const match = finalRootId.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        finalRootId = match[1];
      }
    }

    // Save into database
    if (finalEmail) {
      await saveSystemSetting("GOOGLE_SERVICE_ACCOUNT_EMAIL", finalEmail, "Google Service Account Client Email");
    }
    if (finalPrivateKey && !finalPrivateKey.includes("[ซ่อนคีย์")) {
      await saveSystemSetting("GOOGLE_PRIVATE_KEY", finalPrivateKey, "Google Service Account RSA Private Key");
    }
    if (finalRootId) {
      await saveSystemSetting("GOOGLE_SHARED_DRIVE_ROOT_ID", finalRootId, "Google Shared Drive / Folder Root ID");
    }

    invalidateSettingsCache();

    // Test connection with new credentials immediately
    const testResult = await testDriveConnection();

    return NextResponse.json({
      success: true,
      message: "บันทึกการตั้งค่า Google Drive สำเร็จเรียบร้อยแล้ว",
      status: testResult,
    });
  } catch (error: any) {
    console.error("Error saving Google Drive settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save Google Drive settings" },
      { status: 500 }
    );
  }
}
