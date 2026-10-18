import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidateSettingsCache } from "@/lib/services/systemSettingService";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await prisma.systemSetting.deleteMany({
      where: {
        key: {
          in: ["GOOGLE_OAUTH_REFRESH_TOKEN", "GOOGLE_OAUTH_USER_EMAIL"],
        },
      },
    });

    invalidateSettingsCache();

    return NextResponse.json({
      success: true,
      message: "ตัดการเชื่อมต่อ Google Drive เรียบร้อยแล้ว",
    });
  } catch (error: any) {
    console.error("Error disconnecting Google OAuth:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to disconnect" },
      { status: 500 }
    );
  }
}
