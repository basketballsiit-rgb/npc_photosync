import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import {
  getGoogleDriveConfig,
  saveSystemSetting,
  invalidateSettingsCache,
} from "@/lib/services/systemSettingService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const host = req.headers.get("host") || "service.npc.ac.th";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const adminUrl = `${proto}://${host}/npc_photosync/admin`;

  if (error || !code) {
    return NextResponse.redirect(
      `${adminUrl}?tab=google_drive&oauth_error=${encodeURIComponent(
        error || "No authorization code provided"
      )}`
    );
  }

  try {
    const config = await getGoogleDriveConfig();
    const redirectUri = `${proto}://${host}/npc_photosync/api/admin/settings/google-drive/oauth-callback`;

    const oauth2Client = new google.auth.OAuth2(
      config.oauthClientId,
      config.oauthClientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (tokens.refresh_token) {
      await saveSystemSetting(
        "GOOGLE_OAUTH_REFRESH_TOKEN",
        tokens.refresh_token,
        "Google OAuth 2.0 Refresh Token"
      );
    }

    // Get user info to show connected email
    let userEmail = "Google Account (2TB)";
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      if (userInfo.data.email) {
        userEmail = userInfo.data.email;
        await saveSystemSetting(
          "GOOGLE_OAUTH_USER_EMAIL",
          userEmail,
          "Connected Google Drive Account Email"
        );
      }
    } catch (infoErr) {
      console.warn("Could not retrieve user info:", infoErr);
    }

    invalidateSettingsCache();

    return NextResponse.redirect(
      `${adminUrl}?tab=google_drive&oauth_success=1&email=${encodeURIComponent(
        userEmail
      )}`
    );
  } catch (err: any) {
    console.error("Error in OAuth callback:", err);
    return NextResponse.redirect(
      `${adminUrl}?tab=google_drive&oauth_error=${encodeURIComponent(
        err.message || "Failed to exchange token"
      )}`
    );
  }
}
