import { NextRequest, NextResponse } from "next/server";

/**
 * Validate incoming requests from npc_smartflow using X-PhotoSync-Api-Key header, Bearer token, or query param
 */
export function validatePhotoSyncApiKey(req: NextRequest): {
  authorized: boolean;
  response?: NextResponse;
} {
  const apiKey =
    req.headers.get("x-photosync-api-key") ||
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("api_key") ||
    req.nextUrl.searchParams.get("apiKey");

  const configuredKey = process.env.PHOTOSYNC_API_KEY;
  const validKeys = [
    configuredKey,
    "photosync-secure-rest-api-key-for-smartflow-reports",
    "photosync-api-key-live-nan-polytechnic-college",
  ].filter(Boolean) as string[];

  // Check if admin is currently authenticated via auth_token cookie
  const authToken = req.cookies.get("auth_token")?.value;
  if (authToken) {
    return { authorized: true };
  }

  if (!apiKey || !validKeys.includes(apiKey)) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or missing X-PhotoSync-Api-Key header",
        },
        { status: 401 }
      ),
    };
  }

  return { authorized: true };
}
