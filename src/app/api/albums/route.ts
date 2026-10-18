import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AlbumType } from "@prisma/client";
import {
  getAcademicTermInfo,
  generateNextAlbumCode,
  getCurrentConfiguredTerm,
} from "@/lib/academic-utils";
import { ensureAlbumDriveFolder } from "@/lib/services/googleDriveService";
import { ensureSeedData } from "@/lib/services/seedService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const academicYear = searchParams.get("academicYear")
    ? parseInt(searchParams.get("academicYear")!, 10)
    : undefined;
  const semester = searchParams.get("semester")
    ? parseInt(searchParams.get("semester")!, 10)
    : undefined;
  const albumType = searchParams.get("albumType") as AlbumType | null;
  const divisionName = searchParams.get("divisionName") || undefined;
  const departmentName = searchParams.get("departmentName") || undefined;
  const hasProject = searchParams.get("hasProject");
  const sortBy = searchParams.get("sortBy") || "latest";

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));
  const skip = (page - 1) * limit;

  try {
    // Auto-seed baseline albums if database is empty
    await ensureSeedData();

    const where: any = {};

    if (academicYear) where.academicYear = academicYear;
    if (semester) where.semester = semester;
    if (divisionName) where.divisionName = divisionName;
    if (departmentName) where.departmentName = departmentName;

    if (albumType && Object.values(AlbumType).includes(albumType)) {
      where.albumType = albumType;
    }

    if (hasProject === "true") {
      where.projectId = { not: null };
    } else if (hasProject === "false") {
      where.projectId = null;
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

    // Determine sorting: default to latest first (eventDate desc, createdAt desc)
    let orderBy: any = [{ eventDate: "desc" }, { createdAt: "desc" }];
    if (sortBy === "oldest") {
      orderBy = [{ eventDate: "asc" }, { createdAt: "asc" }];
    } else if (sortBy === "photos") {
      orderBy = [{ photoCount: "desc" }, { eventDate: "desc" }];
    }

    const [total, albums] = await Promise.all([
      prisma.album.count({ where }),
      prisma.album.findMany({
        where,
        include: {
          project: {
            select: {
              projectCode: true,
              projectName: true,
              ownerTeacherName: true,
            },
          },
          tags: true,
          uploadedBy: {
            select: { name: true, email: true },
          },
        },
        orderBy,
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
      driveFolderUrl: a.driveFolderUrl,
      drivePathDisplay: a.drivePathDisplay,
      coverThumbnailUrl: a.coverThumbnailUrl,
      photoCount: a.photoCount,
      totalSizeBytes: Number(a.totalSizeBytes),
      viewCount: a.viewCount,
      isPublic: a.isPublic,
      isLineNotified: a.isLineNotified,
      project: a.project,
      tags: a.tags.map((t) => t.tagName),
      uploadedBy: a.uploadedBy,
      createdAt: a.createdAt,
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
    });
  } catch (error) {
    console.error("Error in GET /api/albums:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      eventDate: rawEventDate,
      albumType: inputAlbumType,
      projectId,
      divisionName: inputDivision,
      departmentName: inputDepartment,
      isPublic = true,
      tags = [],
    } = body;

    if (!title || !rawEventDate) {
      return NextResponse.json(
        { success: false, error: "Title and eventDate are required fields." },
        { status: 400 }
      );
    }

    const eventDate = new Date(rawEventDate);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid eventDate provided." },
        { status: 400 }
      );
    }

    // Determine Academic Term and Year
    let { academicYear, semester } = getAcademicTermInfo(eventDate);
    if (body.academicYear && body.semester) {
      academicYear = parseInt(body.academicYear, 10);
      semester = parseInt(body.semester, 10);
    }

    // If projectId is provided, fetch project
    let project = null;
    let finalAlbumType: AlbumType = inputAlbumType || AlbumType.ROUTINE;
    let divisionName = inputDivision || "ฝ่ายบริหารทรัพยากร";
    let departmentName = inputDepartment || "งานประชาสัมพันธ์";

    if (projectId) {
      project = await prisma.smartFlowProject.findUnique({
        where: { id: projectId },
      });
      if (project) {
        finalAlbumType = AlbumType.PROJECT;
        divisionName = project.divisionName;
        departmentName = project.departmentName || departmentName;
      }
    }

    // Generate unique sequential albumCode (e.g. PRJ-6910-001)
    const albumCode = await generateNextAlbumCode(finalAlbumType, eventDate, prisma);

    // Ensure Google Shared Drive Folder
    const driveFolder = await ensureAlbumDriveFolder(
      academicYear,
      finalAlbumType,
      albumCode
    );

    // Resolve uploader (fallback to default PR user if not authenticated)
    const defaultUser = await prisma.user.findFirst({
      where: {
        email: { in: ["pr.staff@npc.ac.th", "pr.staff@pvc.ac.th"] },
      },
    });
    const uploadedById = defaultUser?.id || (await prisma.user.findFirst())?.id;

    if (!uploadedById) {
      return NextResponse.json(
        { success: false, error: "No system user found to associate upload." },
        { status: 500 }
      );
    }

    // Create Album
    const newAlbum = await prisma.album.create({
      data: {
        albumCode,
        title,
        description: description || null,
        eventDate,
        academicYear,
        semester,
        albumType: finalAlbumType,
        projectId: project ? project.id : null,
        divisionName,
        departmentName,
        driveFolderId: driveFolder.driveFolderId,
        driveFolderUrl: driveFolder.driveFolderUrl,
        drivePathDisplay: driveFolder.drivePathDisplay,
        isPublic,
        uploadedById,
        tags: Array.isArray(tags) && tags.length > 0
          ? {
              create: tags.map((t: string) => ({ tagName: String(t).trim() })),
            }
          : undefined,
      },
      include: {
        project: true,
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Album "${albumCode}" created successfully.`,
      data: {
        ...newAlbum,
        totalSizeBytes: Number(newAlbum.totalSizeBytes),
      },
    });
  } catch (error) {
    console.error("Error in POST /api/albums:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
