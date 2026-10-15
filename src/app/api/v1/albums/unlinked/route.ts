import { NextRequest, NextResponse } from "next/server";
import { validatePhotoSyncApiKey } from "@/lib/api-security";
import prisma from "@/lib/prisma";
import { AlbumType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const auth = validatePhotoSyncApiKey(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const academicYear = searchParams.get("academicYear")
    ? parseInt(searchParams.get("academicYear")!, 10)
    : undefined;
  const semester = searchParams.get("semester")
    ? parseInt(searchParams.get("semester")!, 10)
    : undefined;
  const albumTypeParam = searchParams.get("albumType") as AlbumType | null;
  const divisionName = searchParams.get("divisionName") || undefined;
  const departmentName = searchParams.get("departmentName") || undefined;

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  try {
    const where: any = {
      projectId: null, // Strictly unlinked albums
    };

    if (academicYear) where.academicYear = academicYear;
    if (semester) where.semester = semester;
    if (divisionName) where.divisionName = divisionName;
    if (departmentName) where.departmentName = departmentName;

    if (albumTypeParam && Object.values(AlbumType).includes(albumTypeParam)) {
      where.albumType = albumTypeParam;
    } else {
      // Default to ROUTINE and ADHOC (the two types eligible for linking)
      where.albumType = { in: [AlbumType.ROUTINE, AlbumType.ADHOC, AlbumType.PORTFOLIO] };
    }

    if (q.trim()) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { albumCode: { contains: q } },
        { tags: { some: { tagName: { contains: q } } } },
      ];
    }

    const [total, albums] = await Promise.all([
      prisma.album.count({ where }),
      prisma.album.findMany({
        where,
        include: {
          tags: true,
          uploadedBy: {
            select: { name: true, email: true },
          },
        },
        orderBy: { eventDate: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

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
      photoCount: a.photoCount,
      totalSizeBytes: Number(a.totalSizeBytes),
      coverThumbnailUrl: a.coverThumbnailUrl?.startsWith("http")
        ? a.coverThumbnailUrl
        : `${baseUrl}${a.coverThumbnailUrl || ""}`,
      tags: a.tags.map((t) => t.tagName),
      uploadedBy: a.uploadedBy,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in GET /api/v1/albums/unlinked:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
