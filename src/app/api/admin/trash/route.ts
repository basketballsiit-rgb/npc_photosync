import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { deleteFolderFromDrive, deleteFileFromDrive } from "@/lib/services/googleDriveService";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/trash
 * List all soft-deleted albums and individually soft-deleted photos
 */
export async function GET(req: NextRequest) {
  try {
    const [deletedAlbums, deletedPhotos] = await Promise.all([
      // 1. Deleted Albums
      prisma.album.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        include: {
          project: {
            select: {
              projectCode: true,
              projectName: true,
            },
          },
          _count: {
            select: { mediaFiles: true },
          },
        },
      }),

      // 2. Deleted Photos whose parent album is still active
      prisma.mediaFile.findMany({
        where: {
          deletedAt: { not: null },
          album: { deletedAt: null },
        },
        orderBy: { deletedAt: "desc" },
        include: {
          album: {
            select: {
              id: true,
              albumCode: true,
              title: true,
            },
          },
        },
        take: 200,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        albums: deletedAlbums.map((a) => ({
          ...a,
          totalSizeBytes: Number(a.totalSizeBytes),
          photoCount: a._count.mediaFiles,
        })),
        photos: deletedPhotos.map((p) => ({
          ...p,
          fileSizeBytes: Number(p.fileSizeBytes),
        })),
        totalAlbums: deletedAlbums.length,
        totalPhotos: deletedPhotos.length,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/trash:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch trash items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/trash
 * Handle restore, permanent-delete, and empty trash actions
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, albumIds = [], mediaIds = [] } = body;
    // action: 'restore' | 'permanent_delete' | 'empty_trash'

    const baseStorage = process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";

    if (action === "restore") {
      let restoredAlbumsCount = 0;
      let restoredPhotosCount = 0;

      // 1. Restore Albums
      if (Array.isArray(albumIds) && albumIds.length > 0) {
        await prisma.$transaction([
          prisma.album.updateMany({
            where: { id: { in: albumIds } },
            data: { deletedAt: null },
          }),
          prisma.mediaFile.updateMany({
            where: { albumId: { in: albumIds } },
            data: { deletedAt: null },
          }),
        ]);
        restoredAlbumsCount = albumIds.length;
      }

      // 2. Restore Individual Photos
      if (Array.isArray(mediaIds) && mediaIds.length > 0) {
        const photos = await prisma.mediaFile.findMany({
          where: { id: { in: mediaIds } },
          select: { id: true, albumId: true },
        });

        await prisma.mediaFile.updateMany({
          where: { id: { in: mediaIds } },
          data: { deletedAt: null },
        });

        // Recalculate parent albums for restored photos
        const affectedAlbumIds = Array.from(new Set(photos.map((p) => p.albumId)));
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
        restoredPhotosCount = mediaIds.length;
      }

      return NextResponse.json({
        success: true,
        message: `กู้คืนข้อมูลสำเร็จ (อัลบั้ม ${restoredAlbumsCount} รายการ, รูปภาพ ${restoredPhotosCount} รายการ)`,
      });
    }

    if (action === "permanent_delete") {
      let deletedAlbumsCount = 0;
      let deletedPhotosCount = 0;

      // 1. Permanent Delete Albums
      if (Array.isArray(albumIds) && albumIds.length > 0) {
        const albums = await prisma.album.findMany({
          where: { id: { in: albumIds } },
          include: { mediaFiles: true },
        });

        for (const a of albums) {
          // Delete Google Drive folder
          if (a.driveFolderId) {
            deleteFolderFromDrive(a.driveFolderId).catch(() => {});
          }

          // Delete disk directories
          try {
            await fs.rm(path.resolve(baseStorage, "thumbs", a.albumCode), { recursive: true, force: true });
            await fs.rm(path.resolve(baseStorage, "report", a.albumCode), { recursive: true, force: true });
            await fs.rm(path.resolve(baseStorage, "original", a.albumCode), { recursive: true, force: true });
          } catch {}
        }

        await prisma.album.deleteMany({
          where: { id: { in: albumIds } },
        });
        deletedAlbumsCount = albums.length;
      }

      // 2. Permanent Delete Individual Photos
      if (Array.isArray(mediaIds) && mediaIds.length > 0) {
        const photos = await prisma.mediaFile.findMany({
          where: { id: { in: mediaIds } },
          include: { album: true },
        });

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

        const affectedAlbumIds = Array.from(new Set(photos.map((p) => p.albumId)));

        await prisma.mediaFile.deleteMany({
          where: { id: { in: mediaIds } },
        });

        // Recalculate remaining active photos for affected albums
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
        deletedPhotosCount = photos.length;
      }

      return NextResponse.json({
        success: true,
        message: `ลบข้อมูลถาวรเรียบร้อยแล้ว (อัลบั้ม ${deletedAlbumsCount} รายการ, รูปภาพ ${deletedPhotosCount} รายการ)`,
      });
    }

    if (action === "empty_trash") {
      // Empty all deleted albums and photos
      const [allDeletedAlbums, allDeletedPhotos] = await Promise.all([
        prisma.album.findMany({
          where: { deletedAt: { not: null } },
        }),
        prisma.mediaFile.findMany({
          where: { deletedAt: { not: null } },
          include: { album: true },
        }),
      ]);

      // 1. Delete all Google Drive and disk files for albums
      for (const a of allDeletedAlbums) {
        if (a.driveFolderId) {
          deleteFolderFromDrive(a.driveFolderId).catch(() => {});
        }
        try {
          await fs.rm(path.resolve(baseStorage, "thumbs", a.albumCode), { recursive: true, force: true });
          await fs.rm(path.resolve(baseStorage, "report", a.albumCode), { recursive: true, force: true });
          await fs.rm(path.resolve(baseStorage, "original", a.albumCode), { recursive: true, force: true });
        } catch {}
      }

      // 2. Delete all Google Drive and disk files for standalone deleted photos
      for (const p of allDeletedPhotos) {
        if (p.driveFileId) {
          deleteFileFromDrive(p.driveFileId).catch(() => {});
        }
        if (p.album) {
          try {
            const thumbName = p.thumbnailWebpUrl.split("/").pop() || `${p.id}.webp`;
            const reportName = p.reportReadyJpgUrl.split("/").pop() || `${p.id}.jpg`;
            await fs.unlink(path.resolve(baseStorage, "thumbs", p.album.albumCode, thumbName)).catch(() => {});
            await fs.unlink(path.resolve(baseStorage, "report", p.album.albumCode, reportName)).catch(() => {});
          } catch {}
        }
      }

      // 3. Delete from DB
      await prisma.$transaction([
        prisma.mediaFile.deleteMany({
          where: { deletedAt: { not: null } },
        }),
        prisma.album.deleteMany({
          where: { deletedAt: { not: null } },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `ล้างถังขยะเรียบร้อยแล้ว (ลบอัลบั้ม ${allDeletedAlbums.length} รายการ และรูปภาพ ${allDeletedPhotos.length} รูป ถาวร)`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported: restore, permanent_delete, empty_trash" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/admin/trash:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
