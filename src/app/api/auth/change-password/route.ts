import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken,
  verifyUserCredentials,
  updateAdminPassword,
  updatePrPassword,
  AUTH_COOKIE_NAME,
} from "@/lib/auth-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" },
        { status: 401 }
      );
    }

    const session = verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรหัสผ่านเดิมและรหัสผ่านใหม่" },
        { status: 400 }
      );
    }

    const verifyResult = await verifyUserCredentials(session.username, currentPassword);
    if (!verifyResult.isValid) {
      return NextResponse.json(
        { success: false, error: "รหัสผ่านเดิมไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" },
        { status: 400 }
      );
    }

    if (session.role === "PR_STAFF") {
      await updatePrPassword(newPassword);
    } else {
      await updateAdminPassword(newPassword);
    }

    return NextResponse.json({
      success: true,
      message: `เปลี่ยนรหัสผ่านสำหรับ ${session.name} สำเร็จแล้ว`,
    });
  } catch (error) {
    console.error("Error changing admin password:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
