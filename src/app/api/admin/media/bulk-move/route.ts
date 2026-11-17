import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
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

    // 5. Move Physical Files on Local Disk from Source to Target Folders
    const baseStorage = process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";
    const targetThumbsDir = path.resolve(baseStorage, "thumbs", targetAlbum.albumCode);
    const targetReportDir = path.resolve(baseStorage, "report", targetAlbum.albumCode);
    const targetOriginalDir = path.resolve(baseStorage, "original", targetAlbum.albumCode);

    try {
      await fs.mkdir(targetThumbsDir, { recursive: true });
      await fs.mkdir(targetReportDir, { recursive: true });
      await fs.mkdir(targetOriginalDir, { recursive: true });

      for (const m of toMove) {
        const sourceAlbumCode = m.album.albumCode;

        // 5.1 Move Thumbnail WebP
        const oldThumbPath = path.resolve(baseStorage, "thumbs", sourceAlbumCode, `${m.id}.webp`);
        const newThumbPath = path.resolve(targetThumbsDir, `${m.id}.webp`);
        if (existsSync(oldThumbPath)) {
          try {
            await fs.rename(oldThumbPath, newThumbPath);
          } catch {
            await fs.copyFile(oldThumbPath, newThumbPath);
            await fs.unlink(oldThumbPath).catch(() => {});
          }
        }

        // 5.2 Move Report-Ready HD JPG
        const oldReportPath = path.resolve(baseStorage, "report", sourceAlbumCode, `${m.id}.jpg`);
        const newReportPath = path.resolve(targetReportDir, `${m.id}.jpg`);
        if (existsSync(oldReportPath)) {
          try {
            await fs.rename(oldReportPath, newReportPath);
          } catch {
            await fs.copyFile(oldReportPath, newReportPath);
            await fs.unlink(oldReportPath).catch(() => {});
          }
        }

        // 5.3 Move 100% Original Camera Master
        const oldOriginalDir = path.resolve(baseStorage, "original", sourceAlbumCode);
        const ext = path.extname(m.fileName || "") || ".jpg";
        const possibleExts = Array.from(new Set([ext, ".jpg", ".jpeg", ".png", ".webp", ".heic"].filter(Boolean)));
        for (const e of possibleExts) {
          const oldOrigFile = path.join(oldOriginalDir, `${m.id}${e.startsWith(".") ? e : "." + e}`);
          if (existsSync(oldOrigFile)) {
            const newOrigFile = path.join(targetOriginalDir, `${m.id}${e.startsWith(".") ? e : "." + e}`);
            try {
              await fs.rename(oldOrigFile, newOrigFile);
            } catch {
              await fs.copyFile(oldOrigFile, newOrigFile);
              await fs.unlink(oldOrigFile).catch(() => {});
            }
            break;
          }
        }
      }
    } catch (diskMoveErr) {
      console.warn("[Bulk Move] Local disk file move warning:", diskMoveErr);
    }

    // 6. Execute atomic database update in transaction
    await prisma.$transaction(async (tx) => {
      // 6.1 Update media records to target album with newly updated file URLs
      for (const m of toMove) {
        await tx.mediaFile.update({
          where: { id: m.id },
          data: {
            albumId: targetAlbum.id,
            thumbnailWebpUrl: `/uploads/thumbs/${targetAlbum.albumCode}/${m.id}.webp`,
            reportReadyJpgUrl: `/uploads/report/${targetAlbum.albumCode}/${m.id}.jpg`,
            isFeatured: false, // Reset featured status in new album
          },
        });
      }

      // 6.2 Recalculate and update each source album
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
              deletedAt: null,
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

      // 6.3 Update target album counts and cover
      const newTargetCount = targetAlbum.photoCount + toMove.length;
      const newTargetSize = BigInt(targetAlbum.totalSizeBytes) + totalMovedBytes;
      const newTargetCover =
        targetAlbum.coverThumbnailUrl || `/uploads/thumbs/${targetAlbum.albumCode}/${toMove[0].id}.webp`;

      await tx.album.update({
        where: { id: targetAlbum.id },
        data: {
          photoCount: newTargetCount,
          totalSizeBytes: newTargetSize,
          coverThumbnailUrl: newTargetCover,
        },
      });
    });

    // 7. Background move in Google Drive (Safe async, non-blocking)
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
