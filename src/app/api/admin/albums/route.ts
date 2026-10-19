import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AlbumType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const albumType = searchParams.get("albumType") as AlbumType | null;
    const academicYear = searchParams.get("academicYear")
      ? parseInt(searchParams.get("academicYear")!, 10)
      : undefined;
    const semester = searchParams.get("semester")
      ? parseInt(searchParams.get("semester")!, 10)
      : undefined;
    const divisionName = searchParams.get("divisionName") || undefined;
    const departmentName = searchParams.get("departmentName") || undefined;
    const filterType = searchParams.get("filterType"); // "all", "orphans", "linked"
    const isPublicParam = searchParams.get("isPublic");

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (academicYear) where.academicYear = academicYear;
    if (semester) where.semester = semester;
    if (divisionName) where.divisionName = divisionName;
    if (departmentName) where.departmentName = departmentName;

    if (albumType && Object.values(AlbumType).includes(albumType)) {
      where.albumType = albumType;
    }

    if (filterType === "orphans") {
      where.projectId = null;
    } else if (filterType === "linked") {
      where.projectId = { not: null };
    }

    if (isPublicParam === "true") {
      where.isPublic = true;
    } else if (isPublicParam === "false") {
      where.isPublic = false;
    }

    if (q.trim()) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { albumCode: { contains: q } },
        { project: { projectName: { contains: q } } },
        { project: { projectCode: { contains: q } } },
        { tags: { some: { tagName: { contains: q } } } },
      ];
    }

    const [total, albums] = await Promise.all([
      prisma.album.count({ where }),
      prisma.album.findMany({
        where,
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
        },
        orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const formatted = albums.map((a) => ({
      id: a.id,
      albumCode: a.albumCode,
      title: a.title,
      description: a.description,
      eventDate: a.eventDate,
      academicYear: a.academicYear,
      semester: a.semester,
      albumType: a.albumType,
      divisionName: a.divisionName,
      departmentName: a.departmentName,
      driveFolderId: a.driveFolderId,
      driveFolderUrl: a.driveFolderUrl,
      drivePathDisplay: a.drivePathDisplay,
      coverThumbnailUrl: a.coverThumbnailUrl,
      photoCount: a.photoCount,
      totalSizeBytes: Number(a.totalSizeBytes),
      viewCount: a.viewCount,
      isPublic: a.isPublic,
      isLineNotified: a.isLineNotified,
      projectId: a.projectId,
      project: a.project,
      tags: a.tags.map((t) => t.tagName),
      uploadedBy: a.uploadedBy,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      albums: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/albums:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch albums" },
      { status: 500 }
    );
  }
}
