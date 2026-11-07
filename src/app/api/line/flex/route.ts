import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAlbumFlexMessage, LineAlbumNotificationPayload } from "@/lib/services/lineNotifyService";
import { getLineMessagingConfig } from "@/lib/services/systemSettingService";
import { AlbumType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const albumCode = searchParams.get("albumCode");
    const isTest = searchParams.get("test") === "1" || albumCode?.startsWith("TEST-");

    const config = await getLineMessagingConfig();
    const liffId = config.liffId || "2012443779-ygwuql9o";

    if (isTest || !albumCode) {
      const testPayload: LineAlbumNotificationPayload = {
        albumCode: albumCode || `TEST-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`,
        title: "🔔 ทดสอบการเชื่อมต่อระบบแจ้งเตือน LINE Messaging API",
        description: "ทดสอบการส่งข้อความแจ้งเตือนอัตโนมัติจากระบบ NPC_PhotoSync วิทยาลัยสารพัดช่างน่าน การเชื่อมต่อสำเร็จสมบูรณ์พร้อมใช้งาน!",
        albumType: AlbumType.PORTFOLIO,
        photoCount: 1,
        eventDate: new Date(),
        divisionName: "ฝ่ายบริหารทรัพยากร",
        departmentName: "งานศูนย์ดิจิทัลและสื่อสารองค์กร",
        coverThumbnailUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80",
      };

      const flexMessage = buildAlbumFlexMessage(testPayload, { liffId });
      return NextResponse.json({
        success: true,
        liffId,
        album: {
          title: testPayload.title,
          albumCode: testPayload.albumCode,
          coverThumbnailUrl: testPayload.coverThumbnailUrl,
          photoCount: testPayload.photoCount,
        },
        flexMessage,
      });
    }

    const album = await prisma.album.findUnique({
      where: { albumCode },
      include: {
        project: {
          select: {
            projectCode: true,
            projectName: true,
          },
        },
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: `ไม่พบอัลบั้มรหัส ${albumCode}` },
        { status: 404 }
      );
    }

    const payload: LineAlbumNotificationPayload = {
      albumCode: album.albumCode,
      title: album.title,
      description: album.description,
      albumType: album.albumType,
      photoCount: album.photoCount,
      totalSizeBytes: album.totalSizeBytes,
      eventDate: album.eventDate,
      coverThumbnailUrl: album.coverThumbnailUrl,
      divisionName: album.divisionName,
      departmentName: album.departmentName,
      projectCode: album.project?.projectCode || null,
      projectName: album.project?.projectName || null,
    };

    const flexMessage = buildAlbumFlexMessage(payload, { liffId });

    return NextResponse.json({
      success: true,
      liffId,
      album: {
        title: album.title,
        albumCode: album.albumCode,
        coverThumbnailUrl: album.coverThumbnailUrl,
        photoCount: album.photoCount,
      },
      flexMessage,
    });
  } catch (error) {
    console.error("GET /api/line/flex error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
