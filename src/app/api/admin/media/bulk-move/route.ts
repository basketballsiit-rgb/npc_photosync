import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDriveClient } from "@/lib/services/googleDriveService";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/media/bulk-move
 * Move one or more media files from their current album(s) to a target album
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mediaIds, targetAlbumId } = body;

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรูปภาพที่ต้องการย้ายอย่างน้อย 1 รูป" },
        { status: 400 }
      );
    }

    if (!targetAlbumId) {
      return NextResponse.json(
        { success: false, error: "กรุณาเลือกอัลบั้มเป้าหมายที่ต้องการย้ายไป" },
        { status: 400 }
      );
    }

    // 1. Fetch Target Album
    const targetAlbum = await prisma.album.findFirst({
      where: {
        OR: [{ id: targetAlbumId }, { albumCode: targetAlbumId }],
      },
    });

    if (!targetAlbum) {
      return NextResponse.json(
        { success: false, error: `ไม่พบอัลบั้มเป้าหมาย "${targetAlbumId}"` },
        { status: 404 }
      );
    }

    // 2. Fetch Media Files to Move
    const mediaList = await prisma.mediaFile.findMany({
      where: { id: { in: mediaIds } },
      include: { album: true },
    });

    if (mediaList.length === 0) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรูปภาพที่ระบุในระบบ" },
        { status: 404 }
      );
    }

    // 3. Filter out photos already in the target album
    const toMove = mediaList.filter((m) => m.albumId !== targetAlbum.id);
    if (toMove.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `รูปภาพทั้งหมดที่เลือกอยู่ในอัลบั้ม "${targetAlbum.title}" (${targetAlbum.albumCode}) อยู่แล้ว`,
        },
        { status: 400 }
      );
    }

    // 4. Group by source album for accurate count and byte recalculations
    const sourceGroups = new Map<
      string,
      {
        count: number;
        bytes: bigint;
        album: (typeof mediaList)[0]["album"];
        mediaIds: string[];
        covers: string[];
      }
    >();

    let totalMovedBytes = BigInt(0);

    for (const m of toMove) {
      totalMovedBytes += BigInt(m.fileSizeBytes);

      if (!sourceGroups.has(m.albumId)) {
        sourceGroups.set(m.albumId, {
          count: 0,
          bytes: BigInt(0),
          album: m.album,
          mediaIds: [],
          covers: [],
        });
      }
      const g = sourceGroups.get(m.albumId)!;
      g.count += 1;
      g.bytes += BigInt(m.fileSizeBytes);
      g.mediaIds.push(m.id);
      g.covers.push(m.thumbnailWebpUrl);
      if (m.reportReadyJpgUrl) g.covers.push(m.reportReadyJpgUrl);
    }

    // 5. Execute atomic database update in transaction
    await prisma.$transaction(async (tx) => {
      // 5.1 Update media records to target album
      await tx.mediaFile.updateMany({
        where: { id: { in: toMove.map((m) => m.id) } },
        data: {
          albumId: targetAlbum.id,
          isFeatured: false, // Reset featured status in new album
        },
      });

      // 5.2 Recalculate and update each source album
      for (const [sourceId, g] of Array.from(sourceGroups.entries())) {
        const newCount = Math.max(0, g.album.photoCount - g.count);
        const newSize = BigInt(g.album.totalSizeBytes) - g.bytes;

        // If moved photo was the source album's cover, reassign cover
        let newCover = g.album.coverThumbnailUrl;
        if (
          g.album.coverThumbnailUrl &&
          g.covers.includes(g.album.coverThumbnailUrl)
        ) {
          const remainingMedia = await tx.mediaFile.findFirst({
            where: {
              albumId: sourceId,
              id: { notIn: g.mediaIds },
            },
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          });
          newCover = remainingMedia ? remainingMedia.thumbnailWebpUrl : null;
        }

        await tx.album.update({
          where: { id: sourceId },
          data: {
            photoCount: newCount,
            totalSizeBytes: newSize < BigInt(0) ? BigInt(0) : newSize,
            coverThumbnailUrl: newCover,
          },
        });
      }

      // 5.3 Update target album counts and cover
      const newTargetCount = targetAlbum.photoCount + toMove.length;
      const newTargetSize = BigInt(targetAlbum.totalSizeBytes) + totalMovedBytes;
      const newTargetCover =
        targetAlbum.coverThumbnailUrl || toMove[0].thumbnailWebpUrl;

      await tx.album.update({
        where: { id: targetAlbum.id },
        data: {
          photoCount: newTargetCount,
          totalSizeBytes: newTargetSize,
          coverThumbnailUrl: newTargetCover,
        },
      });
    });

    // 6. Background move in Google Drive (Safe async, non-blocking)
    if (targetAlbum.driveFolderId) {
      const targetDriveFolderId = targetAlbum.driveFolderId;
      (async () => {
        try {
          const client = await getDriveClient();
          if (!client) return;

          for (const m of toMove) {
            if (m.driveFileId && m.album?.driveFolderId) {
              await client.drive.files.update({
                fileId: m.driveFileId,
                addParents: targetDriveFolderId,
                removeParents: m.album.driveFolderId,
                supportsAllDrives: true,
              });
            }
          }
        } catch (driveErr) {
          console.warn("[Move Photo] Google Drive folder move error:", driveErr);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      message: `ย้ายรูปภาพจำนวน ${toMove.length} รูป ไปยังอัลบั้ม "${targetAlbum.title}" (${targetAlbum.albumCode}) สำเร็จเรียบร้อยแล้ว`,
      movedCount: toMove.length,
      targetAlbum: {
        id: targetAlbum.id,
        albumCode: targetAlbum.albumCode,
        title: targetAlbum.title,
      },
    });
  } catch (error: any) {
    console.error("Error in bulk-move media:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "เกิดข้อผิดพลาดในการย้ายรูปภาพ" },
      { status: 500 }
    );
  }
}
