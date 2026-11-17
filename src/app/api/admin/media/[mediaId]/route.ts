import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { deleteFileFromDrive } from "@/lib/services/googleDriveService";

export const dynamic = "force-dynamic";

/**
 * PATCH: Update media file (e.g. caption, featured/cover status)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  const { mediaId } = params;

  try {
    const body = await req.json();
    const { aiCaption, isFeatured } = body;

    const media = await prisma.mediaFile.findUnique({
      where: { id: mediaId },
      include: { album: true },
    });

    if (!media) {
      return NextResponse.json(
        { success: false, error: "Media file not found" },
        { status: 404 }
      );
    }

    const dataToUpdate: any = {};
    if (aiCaption !== undefined) {
      dataToUpdate.aiCaption = aiCaption ? String(aiCaption).trim() : null;
    }
    if (typeof isFeatured === "boolean") {
      dataToUpdate.isFeatured = isFeatured;
    }

    const updatedMedia = await prisma.mediaFile.update({
      where: { id: mediaId },
      data: dataToUpdate,
    });

    // If set as featured/cover, update parent album's coverThumbnailUrl
    if (isFeatured === true) {
      await prisma.album.update({
        where: { id: media.albumId },
        data: { coverThumbnailUrl: media.thumbnailWebpUrl },
      });
    }

    return NextResponse.json({
      success: true,
      message: "บันทึกการแก้ไขข้อมูลภาพสำเร็จ",
      media: {
        ...updatedMedia,
        fileSizeBytes: Number(updatedMedia.fileSizeBytes),
      },
    });
  } catch (error: any) {
    console.error(`Error updating media ${mediaId}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update media" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Soft delete (move to Trash) or Hard delete (permanent removal)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  const { mediaId } = params;
  const { searchParams } = new URL(req.url);
  const isPermanent = searchParams.get("permanent") === "true";

  try {
    const media = await prisma.mediaFile.findUnique({
      where: { id: mediaId },
      include: { album: true },
    });

    if (!media) {
      return NextResponse.json(
        { success: false, error: "Media file not found" },
        { status: 404 }
      );
    }

    const album = media.album;

    if (!isPermanent) {
      // 1. Soft Delete: Mark photo as deletedAt
      await prisma.mediaFile.update({
        where: { id: media.id },
        data: { deletedAt: new Date() },
      });

      // Update parent album count and cover (active only)
      const remainingActivePhotos = await prisma.mediaFile.findMany({
        where: { albumId: album.id, deletedAt: null },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        select: { thumbnailWebpUrl: true, fileSizeBytes: true },
      });

      let newCoverUrl = album.coverThumbnailUrl;
      if (
        album.coverThumbnailUrl === media.thumbnailWebpUrl ||
        album.coverThumbnailUrl === media.reportReadyJpgUrl
      ) {
        newCoverUrl = remainingActivePhotos.length > 0 ? remainingActivePhotos[0].thumbnailWebpUrl : null;
      }

      const newPhotoCount = remainingActivePhotos.length;
      const newSizeBytes = remainingActivePhotos.reduce((acc, p) => acc + BigInt(p.fileSizeBytes), BigInt(0));

      const updatedAlbum = await prisma.album.update({
        where: { id: album.id },
        data: {
          photoCount: newPhotoCount,
          totalSizeBytes: newSizeBytes,
          coverThumbnailUrl: newCoverUrl,
        },
      });

      return NextResponse.json({
        success: true,
        message: `ย้ายรูปภาพ [${media.fileName}] ไปยังถังขยะเรียบร้อยแล้ว`,
        isTrash: true,
        album: {
          id: updatedAlbum.id,
          photoCount: updatedAlbum.photoCount,
          totalSizeBytes: Number(updatedAlbum.totalSizeBytes),
          coverThumbnailUrl: updatedAlbum.coverThumbnailUrl,
        },
      });
    }

    // 2. Permanent Delete:
    // 2.1 Delete from Google Drive if driveFileId exists
    if (media.driveFileId) {
      deleteFileFromDrive(media.driveFileId).catch((err) =>
        console.warn(`[Delete Media] Google Drive file deletion warning for ${media.id}:`, err)
      );
    }

    // 2.2 Delete local files from disk (thumbs, report, and original)
    const baseStorage = process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";
    try {
      const thumbFileName = media.thumbnailWebpUrl.split("/").pop() || `${media.id}.webp`;
      const reportFileName = media.reportReadyJpgUrl.split("/").pop() || `${media.id}.jpg`;

      const thumbPath = path.resolve(baseStorage, "thumbs", album.albumCode, thumbFileName);
      const reportPath = path.resolve(baseStorage, "report", album.albumCode, reportFileName);

      await fs.unlink(thumbPath).catch(() => {});
      await fs.unlink(reportPath).catch(() => {});

      // Original master
      const originalDir = path.resolve(baseStorage, "original", album.albumCode);
      const fileExt = path.extname(media.fileName || "");
      const possibleExts = Array.from(new Set([fileExt, ".jpg", ".jpeg", ".png", ".webp", ".heic"].filter(Boolean)));
      for (const ext of possibleExts) {
        const origFile = path.join(originalDir, `${media.id}${ext.startsWith(".") ? ext : "." + ext}`);
        await fs.unlink(origFile).catch(() => {});
      }
    } catch (diskErr) {
      console.warn(`[Delete Media] Failed to remove disk files for ${media.id}:`, diskErr);
    }

    // 2.3 Delete from Prisma database
    await prisma.mediaFile.delete({
      where: { id: media.id },
    });

    // 2.4 Update album counts and cover if needed
    const remainingPhotos = await prisma.mediaFile.findMany({
      where: { albumId: album.id, deletedAt: null },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: { thumbnailWebpUrl: true, fileSizeBytes: true },
    });

    let newCoverUrl = album.coverThumbnailUrl;
    if (
      album.coverThumbnailUrl === media.thumbnailWebpUrl ||
      album.coverThumbnailUrl === media.reportReadyJpgUrl
    ) {
      newCoverUrl = remainingPhotos.length > 0 ? remainingPhotos[0].thumbnailWebpUrl : null;
    }

    const newPhotoCount = remainingPhotos.length;
    const newSizeBytes = remainingPhotos.reduce((acc, p) => acc + BigInt(p.fileSizeBytes), BigInt(0));

    const updatedAlbum = await prisma.album.update({
      where: { id: album.id },
      data: {
        photoCount: newPhotoCount,
        totalSizeBytes: newSizeBytes,
        coverThumbnailUrl: newCoverUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: `ลบรูปภาพ [${media.fileName}] ถาวรเรียบร้อยแล้ว`,
      isPermanent: true,
      album: {
        id: updatedAlbum.id,
        photoCount: updatedAlbum.photoCount,
        totalSizeBytes: Number(updatedAlbum.totalSizeBytes),
        coverThumbnailUrl: updatedAlbum.coverThumbnailUrl,
      },
    });
  } catch (error: any) {
    console.error(`Error deleting media ${mediaId}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete media" },
      { status: 500 }
    );
  }
}
