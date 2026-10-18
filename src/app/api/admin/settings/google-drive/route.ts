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
 * Retrieve current Google Drive settings
 */
export async function GET(req: NextRequest) {
  try {
    const config = await getGoogleDriveConfig();
    const testResult = await testDriveConnection();

    const host = req.headers.get("host") || "service.npc.ac.th";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const redirectUri = `${proto}://${host}/npc_photosync/api/admin/settings/google-drive/oauth-callback`;

    return NextResponse.json({
      success: true,
      settings: {
        authType: config.authType,
        isOAuthConnected: Boolean(config.oauthRefreshToken),
        oauthUserEmail: config.oauthUserEmail,
        oauthClientId: config.oauthClientId,
        oauthClientSecretMasked: config.oauthClientSecret
          ? "••••••••••••••••••••••••••••••"
          : "",
        redirectUri,
        rootFolderId: config.rootFolderId,
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
 * Update Google Drive OAuth & Folder settings from Web Admin UI
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      oauthClientId,
      oauthClientSecret,
      rootFolderId,
    } = body;

    let finalClientId = (oauthClientId || "").trim();
    let finalClientSecret = (oauthClientSecret || "").trim();
    let finalRootId = (rootFolderId || "").trim();

    // Extract folder ID if user pasted full Google Drive folder URL
    if (finalRootId.includes("drive.google.com")) {
      const match = finalRootId.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        finalRootId = match[1];
      }
    }

    if (finalClientId) {
      await saveSystemSetting(
        "GOOGLE_OAUTH_CLIENT_ID",
        finalClientId,
        "Google OAuth 2.0 Client ID"
      );
    }

    if (finalClientSecret && !finalClientSecret.includes("••••")) {
      await saveSystemSetting(
        "GOOGLE_OAUTH_CLIENT_SECRET",
        finalClientSecret,
        "Google OAuth 2.0 Client Secret"
      );
    }

    if (finalRootId) {
      await saveSystemSetting(
        "GOOGLE_SHARED_DRIVE_ROOT_ID",
        finalRootId,
        "Google Drive Root Folder ID"
      );
    }

    invalidateSettingsCache();

    const testResult = await testDriveConnection();

    return NextResponse.json({
      success: true,
      message: "บันทึกข้อมูลการตั้งค่าเรียบร้อยแล้ว",
      status: testResult,
    });
  } catch (error: any) {
    console.error("Error saving Google Drive settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
