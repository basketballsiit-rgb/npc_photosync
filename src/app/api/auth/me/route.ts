import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, AUTH_COOKIE_NAME } from "@/lib/auth-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({
      success: true,
      isAuthenticated: false,
    });
  }

  const session = verifySessionToken(token);

  if (!session) {
    return NextResponse.json({
      success: true,
      isAuthenticated: false,
    });
  }

  return NextResponse.json({
    success: true,
    isAuthenticated: true,
    user: {
      username: session.username,
      name: session.name,
      role: session.role,
    },
  });
}
