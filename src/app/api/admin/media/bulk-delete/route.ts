import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import { deleteFileFromDrive } from "@/lib/services/googleDriveService";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/media/bulk-delete
 * Soft-delete (move to trash) or Hard-delete multiple media files
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mediaIds = [], permanent = false } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "กรุณาเลือกรูปภาพอย่างน้อย 1 รูป" },
        { status: 400 }
      );
    }

    const photos = await prisma.mediaFile.findMany({
      where: { id: { in: mediaIds } },
      include: { album: true },
    });

    if (photos.length === 0) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรูปภาพที่ระบุ" },
        { status: 404 }
      );
    }

    const baseStorage = process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";
    const affectedAlbumIds = Array.from(new Set(photos.map((p) => p.albumId)));

    if (!permanent) {
      // 1. Soft Delete: Mark photos with deletedAt
      const now = new Date();
      await prisma.mediaFile.updateMany({
        where: { id: { in: mediaIds } },
        data: { deletedAt: now },
      });

      // Recalculate parent albums
      for (const albId of affectedAlbumIds) {
        const activePhotos = await prisma.mediaFile.findMany({
          where: { albumId: albId, deletedAt: null },
          select: { fileSizeBytes: true, thumbnailWebpUrl: true },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        });
        const newSize = activePhotos.reduce((acc, p) => acc + BigInt(p.fileSizeBytes), BigInt(0));
        await prisma.album.update({
          where: { id: albId },
          data: {
            photoCount: activePhotos.length,
            totalSizeBytes: newSize,
            coverThumbnailUrl: activePhotos[0]?.thumbnailWebpUrl || null,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `ย้ายรูปภาพจำนวน ${photos.length} รูป ไปยังถังขยะเรียบร้อยแล้ว (สามารถกู้คืนได้)`,
        deletedCount: photos.length,
        isTrash: true,
      });
    }

    // 2. Permanent Delete
    for (const p of photos) {
      if (p.driveFileId) {
        deleteFileFromDrive(p.driveFileId).catch(() => {});
      }

      try {
        const thumbName = p.thumbnailWebpUrl.split("/").pop() || `${p.id}.webp`;
        const reportName = p.reportReadyJpgUrl.split("/").pop() || `${p.id}.jpg`;
        await fs.unlink(path.resolve(baseStorage, "thumbs", p.album.albumCode, thumbName)).catch(() => {});
        await fs.unlink(path.resolve(baseStorage, "report", p.album.albumCode, reportName)).catch(() => {});

        const origDir = path.resolve(baseStorage, "original", p.album.albumCode);
        const ext = path.extname(p.fileName || "");
        const possibleExts = [ext, ".jpg", ".jpeg", ".png", ".webp", ".heic"].filter(Boolean);
        for (const e of possibleExts) {
          await fs.unlink(path.join(origDir, `${p.id}${e.startsWith(".") ? e : "." + e}`)).catch(() => {});
        }
      } catch {}
    }

    await prisma.mediaFile.deleteMany({
      where: { id: { in: mediaIds } },
    });

    // Recalculate parent albums
    for (const albId of affectedAlbumIds) {
      const activePhotos = await prisma.mediaFile.findMany({
        where: { albumId: albId, deletedAt: null },
        select: { fileSizeBytes: true, thumbnailWebpUrl: true },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      });
      const newSize = activePhotos.reduce((acc, p) => acc + BigInt(p.fileSizeBytes), BigInt(0));
      await prisma.album.update({
        where: { id: albId },
        data: {
          photoCount: activePhotos.length,
          totalSizeBytes: newSize,
          coverThumbnailUrl: activePhotos[0]?.thumbnailWebpUrl || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `ลบรูปภาพจำนวน ${photos.length} รูป ถาวรเรียบร้อยแล้ว`,
      deletedCount: photos.length,
      isPermanent: true,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/media/bulk-delete:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
