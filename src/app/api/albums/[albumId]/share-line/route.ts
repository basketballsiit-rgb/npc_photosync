import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendNewAlbumFlexMessage } from "@/lib/services/lineNotifyService";
import { getLineMessagingConfig } from "@/lib/services/systemSettingService";

export const dynamic = "force-dynamic";

/**
 * POST /api/albums/[albumId]/share-line
 * Directly send the rich LINE Flex Message card for this album to the configured LINE group
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { albumId: string } }
) {
  const { albumId } = params;

  try {
    const config = await getLineMessagingConfig();

    if (!config.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ระบบยังไม่ได้ตั้งค่า LINE Messaging API (Channel Access Token และ Group ID) ในหน้าตั้งค่าระบบ (Admin Settings > LINE Notify) จึงยังไม่สามารถส่งผ่านระบบได้ แนะนำให้ใช้ปุ่ม 'คัดลอกรูปภาพการ์ด' หรือ 'แชร์ผ่าน LINE' แทน",
          isConfigured: false,
        },
        { status: 400 }
      );
    }

    const album = await prisma.album.findFirst({
      where: {
        OR: [{ id: albumId }, { albumCode: albumId }],
      },
      include: {
        project: {
          select: {
            projectCode: true,
            projectName: true,
          },
        },
        mediaFiles: {
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: `ไม่พบอัลบั้มรหัส "${albumId}"` },
        { status: 404 }
      );
    }

    const coverUrl =
      album.coverThumbnailUrl ||
      album.mediaFiles[0]?.thumbnailWebpUrl ||
      album.mediaFiles[0]?.reportReadyJpgUrl ||
      null;

    const lineRes = await sendNewAlbumFlexMessage(
      {
        albumCode: album.albumCode,
        title: album.title,
        description: album.description,
        albumType: album.albumType,
        photoCount: album.photoCount,
        totalSizeBytes: album.totalSizeBytes,
        eventDate: album.eventDate,
        coverThumbnailUrl: coverUrl,
        divisionName: album.divisionName,
        departmentName: album.departmentName,
        projectCode: album.project?.projectCode,
        projectName: album.project?.projectName,
      },
      { bypassEnabledCheck: true }
    );

    if (!lineRes.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            lineRes.error ||
            "ไม่สามารถส่งข้อความเข้ากลุ่ม LINE ได้ กรุณาตรวจสอบว่าบอทอยู่ในกลุ่มและโควตาข้อความยังไม่เต็ม",
        },
        { status: 500 }
      );
    }

    await prisma.album.update({
      where: { id: album.id },
      data: { isLineNotified: true },
    });

    return NextResponse.json({
      success: true,
      message: "ส่งการ์ดสรุปเข้ากลุ่ม LINE ทางการของวิทยาลัยสำเร็จแล้ว!",
      messageId: lineRes.messageId,
    });
  } catch (error: any) {
    console.error("Error sending LINE notification manually:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}
