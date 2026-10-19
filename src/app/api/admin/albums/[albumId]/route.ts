import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { AlbumType } from "@prisma/client";
import { deleteFolderFromDrive } from "@/lib/services/googleDriveService";

export const dynamic = "force-dynamic";

/**
 * GET: Retrieve album details for Admin editing (including media files and project)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { albumId: string } }
) {
  const { albumId } = params;

  try {
    const album = await prisma.album.findFirst({
      where: {
        OR: [{ id: albumId }, { albumCode: albumId }],
      },
      include: {
        project: true,
        tags: true,
        uploadedBy: {
          select: { name: true, email: true },
        },
        mediaFiles: {
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: "Album not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      album: {
        ...album,
        totalSizeBytes: Number(album.totalSizeBytes),
        mediaFiles: album.mediaFiles.map((m) => ({
          ...m,
          fileSizeBytes: Number(m.fileSizeBytes),
        })),
      },
    });
  } catch (error: any) {
    console.error(`Error fetching album ${albumId}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch album" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update album details
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { albumId: string } }
) {
  const { albumId } = params;

  try {
    const body = await req.json();
    const {
      title,
      description,
      eventDate: rawEventDate,
      albumType,
      divisionName,
      departmentName,
      academicYear,
      semester,
      projectId,
      isPublic,
      coverThumbnailUrl,
    } = body;

    const album = await prisma.album.findFirst({
      where: {
        OR: [{ id: albumId }, { albumCode: albumId }],
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: "Album not found" },
        { status: 404 }
      );
    }

    const dataToUpdate: any = {};

    if (typeof isPublic === "boolean") {
      dataToUpdate.isPublic = isPublic;
    }
    if (typeof title === "string" && title.trim()) {
      dataToUpdate.title = title.trim();
    }
    if (description !== undefined) {
      dataToUpdate.description = description ? String(description).trim() : null;
    }
    if (rawEventDate) {
      const parsedDate = new Date(rawEventDate);
      if (!isNaN(parsedDate.getTime())) {
        dataToUpdate.eventDate = parsedDate;
      }
    }
    if (albumType && Object.values(AlbumType).includes(albumType as AlbumType)) {
      dataToUpdate.albumType = albumType as AlbumType;
    }
    if (typeof divisionName === "string" && divisionName.trim()) {
      dataToUpdate.divisionName = divisionName.trim();
    }
    if (departmentName !== undefined) {
      dataToUpdate.departmentName = departmentName ? String(departmentName).trim() : null;
    }
    if (academicYear) {
      dataToUpdate.academicYear = parseInt(String(academicYear), 10);
    }
    if (semester) {
      dataToUpdate.semester = parseInt(String(semester), 10);
    }
    if (projectId !== undefined) {
      dataToUpdate.projectId = projectId ? String(projectId) : null;
      if (projectId) {
        dataToUpdate.albumType = AlbumType.PROJECT;
      }
    }
    if (coverThumbnailUrl !== undefined) {
      dataToUpdate.coverThumbnailUrl = coverThumbnailUrl;
    }

    const updated = await prisma.album.update({
      where: { id: album.id },
      data: dataToUpdate,
      include: {
        project: true,
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกการแก้ไขอัลบั้ม [${updated.albumCode}] สำเร็จ`,
      data: {
        ...updated,
        totalSizeBytes: Number(updated.totalSizeBytes),
      },
    });
  } catch (error: any) {
    console.error(`Error updating album ${albumId}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update album" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete album, associated media files, local disk folders, and Google Drive folder
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { albumId: string } }
) {
  const { albumId } = params;

  try {
    const album = await prisma.album.findFirst({
      where: {
        OR: [{ id: albumId }, { albumCode: albumId }],
      },
      include: {
        mediaFiles: true,
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: "Album not found" },
        { status: 404 }
      );
    }

    // 1. Delete album folder from Google Drive in background
    if (album.driveFolderId) {
      deleteFolderFromDrive(album.driveFolderId).catch((err) =>
        console.warn(`[Delete Album] Drive deletion warning for ${album.albumCode}:`, err)
      );
    }

    // 2. Delete local directories on disk: thumbs and report
    const baseStorage = process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";
    try {
      const thumbsDir = path.resolve(baseStorage, "thumbs", album.albumCode);
      const reportDir = path.resolve(baseStorage, "report", album.albumCode);
      await fs.rm(thumbsDir, { recursive: true, force: true });
      await fs.rm(reportDir, { recursive: true, force: true });
    } catch (diskErr) {
      console.warn(`[Delete Album] Failed to remove disk directory for ${album.albumCode}:`, diskErr);
    }

    // 3. Delete from Prisma database (Cascade deletes MediaFile, AlbumTag, DownloadLog)
    await prisma.album.delete({
      where: { id: album.id },
    });

    return NextResponse.json({
      success: true,
      message: `ลบอัลบั้ม [${album.albumCode}] และรูปภาพทั้งหมดเรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error(`Error deleting album ${albumId}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
