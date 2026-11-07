import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAlbumFlexMessage, LineAlbumNotificationPayload } from "@/lib/services/lineNotifyService";
import { getLineMessagingConfig } from "@/lib/services/systemSettingService";
import { AlbumType } from "@prisma/client";

export const dynamic = "force-dynamic";

function toAbsoluteHttpsUrl(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("https://")) return rawUrl;
  if (rawUrl.startsWith("http://")) return rawUrl.replace(/^http:\/\//i, "https://");

  let clean = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  // Prefer JPG for universal LINE Flex Message compatibility
  if (clean.endsWith(".webp")) {
    clean = clean.replace("/thumbs/", "/report/").replace(/\.webp$/i, ".jpg");
  }

  if (clean.startsWith("/npc_photosync/")) {
    return `https://service.npc.ac.th${clean}`;
  }
  return `https://service.npc.ac.th/npc_photosync${clean}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const albumCode = searchParams.get("albumCode");
    const isTest = searchParams.get("test") === "1" || albumCode?.startsWith("TEST-");

    const config = await getLineMessagingConfig();
    const liffId = config.liffId || "2012443779-ygwuql9o";

    // If test requested or no albumCode, attempt to fetch latest real album from database
    if (isTest || !albumCode) {
      let realAlbum = null;
      try {
        realAlbum = await prisma.album.findFirst({
          orderBy: { createdAt: "desc" },
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
      } catch (err) {
        console.warn("Could not load latest album for flex route:", err);
      }

      if (realAlbum) {
        const rawCover =
          realAlbum.mediaFiles[0]?.reportReadyJpgUrl ||
          realAlbum.coverThumbnailUrl ||
          realAlbum.mediaFiles[0]?.thumbnailWebpUrl ||
          null;

        const absoluteCover = toAbsoluteHttpsUrl(rawCover);

        const payload: LineAlbumNotificationPayload = {
          albumCode: realAlbum.albumCode,
          title: realAlbum.title,
          description: realAlbum.description,
          albumType: realAlbum.albumType,
          photoCount: realAlbum.photoCount,
          totalSizeBytes: realAlbum.totalSizeBytes,
          eventDate: realAlbum.eventDate,
          coverThumbnailUrl: absoluteCover,
          divisionName: realAlbum.divisionName,
          departmentName: realAlbum.departmentName,
          projectCode: realAlbum.project?.projectCode || null,
          projectName: realAlbum.project?.projectName || null,
        };

        const flexMessage = buildAlbumFlexMessage(payload, { liffId });
        return NextResponse.json({
          success: true,
          liffId,
          album: {
            title: payload.title,
            albumCode: payload.albumCode,
            coverThumbnailUrl: absoluteCover,
            photoCount: payload.photoCount,
          },
          flexMessage,
        });
      }

      // Fallback only if no albums exist in database
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

    // Lookup specific album by code
    const album = await prisma.album.findUnique({
      where: { albumCode },
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
        { success: false, error: `ไม่พบอัลบั้มรหัส ${albumCode}` },
        { status: 404 }
      );
    }

    const rawCover =
      album.mediaFiles[0]?.reportReadyJpgUrl ||
      album.coverThumbnailUrl ||
      album.mediaFiles[0]?.thumbnailWebpUrl ||
      null;

    const absoluteCover = toAbsoluteHttpsUrl(rawCover);

    const payload: LineAlbumNotificationPayload = {
      albumCode: album.albumCode,
      title: album.title,
      description: album.description,
      albumType: album.albumType,
      photoCount: album.photoCount,
      totalSizeBytes: album.totalSizeBytes,
      eventDate: album.eventDate,
      coverThumbnailUrl: absoluteCover,
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
        coverThumbnailUrl: absoluteCover,
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
