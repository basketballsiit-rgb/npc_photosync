import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleDriveConfig } from "@/lib/services/systemSettingService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const config = await getGoogleDriveConfig();

    if (!config.oauthClientId || !config.oauthClientSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาระบุ Google Client ID และ Client Secret ก่อนกดเชื่อมต่อ",
        },
        { status: 400 }
      );
    }

    const host = req.headers.get("host") || "service.npc.ac.th";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${proto}://${host}/npc_photosync`;
    const redirectUri = `${baseUrl}/api/admin/settings/google-drive/oauth-callback`;

    const oauth2Client = new google.auth.OAuth2(
      config.oauthClientId,
      config.oauthClientSecret,
      redirectUri
    );

    const scopes = [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/userinfo.email",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent", // Force to always get refresh_token
      include_granted_scopes: true,
    });

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri,
    });
  } catch (error: any) {
    console.error("Error generating OAuth URL:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
