import { NextRequest, NextResponse } from "next/server";
import { validatePhotoSyncApiKey } from "@/lib/api-security";
import prisma from "@/lib/prisma";
import { AlbumType } from "@prisma/client";
import { moveAlbumFolderOnProjectLink } from "@/lib/services/googleDriveService";
import { notifySmartFlowWebhook } from "@/lib/services/smartflowService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { albumCode: string } }
) {
  const auth = validatePhotoSyncApiKey(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  const { albumCode } = params;

  try {
    const body = await req.json();
    const { projectCode } = body;

    if (!projectCode) {
      return NextResponse.json(
        { success: false, error: "Field 'projectCode' is required in request body" },
        { status: 400 }
      );
    }

    // 1. Find the target album
    const album = await prisma.album.findUnique({
      where: { albumCode },
      include: { project: true },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: `Album "${albumCode}" not found.` },
        { status: 404 }
      );
    }

    // 2. Find the target project in local cache
    const project = await prisma.smartFlowProject.findUnique({
      where: { projectCode },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: `Project "${projectCode}" not found. Please sync projects first.`,
        },
        { status: 404 }
      );
    }

    // 3. Move Google Shared Drive folder to 01_โครงการตามแผน if folder exists
    let updatedDrivePathDisplay = album.drivePathDisplay;
    let updatedDriveFolderUrl = album.driveFolderUrl;

    if (album.driveFolderId) {
      try {
        const moveResult = await moveAlbumFolderOnProjectLink(
          album.driveFolderId,
          album.academicYear,
          album.albumCode
        );
        updatedDrivePathDisplay = moveResult.drivePathDisplay;
        updatedDriveFolderUrl = moveResult.driveFolderUrl;
      } catch (driveErr) {
        console.warn("Could not move Google Drive folder during project link:", driveErr);
      }
    }

    // 4. Update Album in database
    const updatedAlbum = await prisma.album.update({
      where: { id: album.id },
      data: {
        projectId: project.id,
        albumType: AlbumType.PROJECT,
        divisionName: project.divisionName,
        departmentName: project.departmentName || album.departmentName,
        drivePathDisplay: updatedDrivePathDisplay,
        driveFolderUrl: updatedDriveFolderUrl,
      },
      include: {
        project: true,
        tags: true,
      },
    });

    // 5. Notify SmartFlow via outgoing webhook
    await notifySmartFlowWebhook({
      projectCode: project.projectCode,
      albumCode: updatedAlbum.albumCode,
      albumTitle: updatedAlbum.title,
      coverThumbnailUrl: updatedAlbum.coverThumbnailUrl,
      photoCount: updatedAlbum.photoCount,
      driveFolderUrl: updatedAlbum.driveFolderUrl,
      eventDate: updatedAlbum.eventDate,
      action: "ALBUM_LINKED",
    });

    return NextResponse.json({
      success: true,
      message: `Album "${albumCode}" successfully retroactively linked to project "${projectCode}".`,
      data: {
        albumCode: updatedAlbum.albumCode,
        title: updatedAlbum.title,
        albumType: updatedAlbum.albumType,
        project: {
          projectCode: project.projectCode,
          projectName: project.projectName,
          divisionName: project.divisionName,
          departmentName: project.departmentName,
        },
        drivePathDisplay: updatedAlbum.drivePathDisplay,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error linking album ${albumCode} to project:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
