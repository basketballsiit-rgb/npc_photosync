import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET: Retrieve specific album by ID or albumCode with all media files
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
        project: {
          select: {
            id: true,
            projectCode: true,
            projectName: true,
            ownerTeacherName: true,
            divisionName: true,
            departmentName: true,
          },
        },
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
        { success: false, error: `ไม่พบอัลบั้มรหัส "${albumId}"` },
        { status: 404 }
      );
    }

    // Increment view count in background
    prisma.album
      .update({
        where: { id: album.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err) => console.warn("Failed to increment view count:", err));

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
    console.error("Error fetching album detail:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch album" },
      { status: 500 }
    );
  }
}
