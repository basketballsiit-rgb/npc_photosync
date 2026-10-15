import { NextRequest, NextResponse } from "next/server";
import { validatePhotoSyncApiKey } from "@/lib/api-security";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectCode: string } }
) {
  const auth = validatePhotoSyncApiKey(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const projectCode = params.projectCode;
  if (!projectCode) {
    return NextResponse.json(
      { success: false, error: "Project code parameter is required" },
      { status: 400 }
    );
  }

  try {
    const project = await prisma.smartFlowProject.findUnique({
      where: { projectCode },
      include: {
        albums: {
          include: {
            tags: true,
            mediaFiles: {
              orderBy: [
                { isFeatured: "desc" },
                { capturedAt: "asc" },
                { createdAt: "asc" },
              ],
            },
          },
          orderBy: { eventDate: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: `Project with code "${projectCode}" was not found in PhotoSync registry.`,
        },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const formattedAlbums = project.albums.map((album) => ({
      albumCode: album.albumCode,
      title: album.title,
      description: album.description,
      eventDate: album.eventDate,
      academicYear: album.academicYear,
      semester: album.semester,
      divisionName: album.divisionName,
      departmentName: album.departmentName,
      driveFolderUrl: album.driveFolderUrl,
      drivePathDisplay: album.drivePathDisplay,
      photoCount: album.photoCount,
      coverThumbnailUrl: album.coverThumbnailUrl?.startsWith("http")
        ? album.coverThumbnailUrl
        : `${baseUrl}${album.coverThumbnailUrl || ""}`,
      tags: album.tags.map((t) => t.tagName),
      photos: album.mediaFiles.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        fileSizeBytes: Number(file.fileSizeBytes),
        width: file.width,
        height: file.height,
        capturedAt: file.capturedAt,
        cameraModel: file.cameraModel,
        aiCaption: file.aiCaption,
        aiTags: file.aiTagsJson ? JSON.parse(file.aiTagsJson) : [],
        isFeatured: file.isFeatured,
        // High-speed CDN/Proxy URLs for direct embedding into Word/PDF reports
        thumbnailWebpUrl: `${baseUrl}/api/v1/image-proxy/${file.id}?type=thumb`,
        reportReadyJpgUrl: `${baseUrl}/api/v1/image-proxy/${file.id}?type=report`,
        watermarkJpgUrl: `${baseUrl}/api/v1/image-proxy/${file.id}?type=watermark`,
        originalDownloadUrl: `${baseUrl}/api/v1/image-proxy/${file.id}?type=original`,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        project: {
          projectCode: project.projectCode,
          projectName: project.projectName,
          academicYear: project.academicYear,
          divisionName: project.divisionName,
          departmentName: project.departmentName,
          ownerTeacherName: project.ownerTeacherName,
          ownerEmail: project.ownerEmail,
        },
        albumCount: formattedAlbums.length,
        totalPhotos: formattedAlbums.reduce((sum, a) => sum + a.photos.length, 0),
        albums: formattedAlbums,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error in GET /api/v1/media/by-project/${projectCode}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
