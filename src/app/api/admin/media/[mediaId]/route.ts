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
 * DELETE: Delete individual media file from database, local disk, and Google Drive
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  const { mediaId } = params;

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

    // 1. Delete from Google Drive if driveFileId exists
    if (media.driveFileId) {
      deleteFileFromDrive(media.driveFileId).catch((err) =>
        console.warn(`[Delete Media] Google Drive file deletion warning for ${media.id}:`, err)
      );
    }

    // 2. Delete local files from disk (thumbs and report)
    const baseStorage = process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";
    try {
      // Determine file names from URL or ID
      const thumbFileName = media.thumbnailWebpUrl.split("/").pop() || `${media.id}.webp`;
      const reportFileName = media.reportReadyJpgUrl.split("/").pop() || `${media.id}.jpg`;

      const thumbPath = path.resolve(baseStorage, "thumbs", album.albumCode, thumbFileName);
      const reportPath = path.resolve(baseStorage, "report", album.albumCode, reportFileName);

      await fs.unlink(thumbPath).catch(() => {});
      await fs.unlink(reportPath).catch(() => {});
    } catch (diskErr) {
      console.warn(`[Delete Media] Failed to remove disk files for ${media.id}:`, diskErr);
    }

    // 3. Delete from Prisma database
    await prisma.mediaFile.delete({
      where: { id: media.id },
    });

    // 4. Update album counts and cover if needed
    const remainingPhotos = await prisma.mediaFile.findMany({
      where: { albumId: album.id },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: { thumbnailWebpUrl: true },
    });

    let newCoverUrl = album.coverThumbnailUrl;
    if (
      album.coverThumbnailUrl === media.thumbnailWebpUrl ||
      album.coverThumbnailUrl === media.reportReadyJpgUrl
    ) {
      newCoverUrl = remainingPhotos.length > 0 ? remainingPhotos[0].thumbnailWebpUrl : null;
    }

    const newPhotoCount = Math.max(0, album.photoCount - 1);
    const newSizeBytes =
      album.totalSizeBytes > media.fileSizeBytes
        ? album.totalSizeBytes - media.fileSizeBytes
        : BigInt(0);

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
      message: `ลบรูปภาพ [${media.fileName}] สำเร็จ`,
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
