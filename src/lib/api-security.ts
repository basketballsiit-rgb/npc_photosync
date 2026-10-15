import { NextRequest, NextResponse } from "next/server";

/**
 * Validate incoming requests from npc_smartflow using X-PhotoSync-Api-Key header
 */
export function validatePhotoSyncApiKey(req: NextRequest): {
  authorized: boolean;
  response?: NextResponse;
} {
  const apiKey = req.headers.get("x-photosync-api-key");
  const configuredKey = process.env.PHOTOSYNC_API_KEY;

  if (!configuredKey) {
    // If no key configured in environment, warn and deny
    console.warn("PHOTOSYNC_API_KEY is not defined in environment variables");
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "API key validation configuration missing on server",
        },
        { status: 500 }
      ),
    };
  }

  if (!apiKey || apiKey !== configuredKey) {
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
