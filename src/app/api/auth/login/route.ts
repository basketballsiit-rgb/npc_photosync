import { NextRequest, NextResponse } from "next/server";
import {
  verifyUserCredentials,
  createSessionToken,
  AUTH_COOKIE_NAME,
} from "@/lib/auth-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุชื่อผู้ใช้และรหัสผ่าน" },
        { status: 400 }
      );
    }

    const authResult = await verifyUserCredentials(username, password);

    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
        },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const token = createSessionToken(user.username, user.role, user.name);

    const response = NextResponse.json({
      success: true,
      message: `เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${user.name}`,
      user,
    });

    // Set secure HTTP-only cookie valid for 7 days
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Error during admin login:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
