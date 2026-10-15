import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { processAndSaveImage } from "@/lib/services/imageProcessor";
import { uploadOriginalToDrive } from "@/lib/services/googleDriveService";
import { analyzeActivityPhoto } from "@/lib/services/geminiVisionService";
import { sendNewAlbumFlexMessage } from "@/lib/services/lineNotifyService";

export async function POST(
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
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: `Album "${albumId}" not found.` },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const runAi = formData.get("runAiTagging") === "true";
    const sendLine = formData.get("sendLineNotify") === "true";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided in FormData under 'files'" },
        { status: 400 }
      );
    }

    const uploadedMediaList = [];
    let addedSizeBytes = BigInt(0);
    const newTagsCollector = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        continue;
      }

      const mediaId = `m_${crypto.randomBytes(8).toString("hex")}`;
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const fileSize = BigInt(fileBuffer.length);
      addedSizeBytes += fileSize;

      // 1. Image Processing Pipeline (Thumbnail WebP & Report-Ready HD JPG)
      const processed = await processAndSaveImage(fileBuffer, {
        albumCode: album.albumCode,
        mediaId,
      });

      // 2. Upload Original Master Photo to Google Shared Drive
      let driveFileId = `drive_${mediaId}`;
      if (album.driveFolderId) {
        try {
          const driveResult = await uploadOriginalToDrive(
            fileBuffer,
            file.name,
            file.type,
            album.driveFolderId
          );
          driveFileId = driveResult.driveFileId;
        } catch (driveErr) {
          console.warn("Failed to upload to Google Drive, using local fallback ID:", driveErr);
        }
      }

      // 3. AI Vision Tagging & Caption (Optional or default for first few photos)
      let aiCaption: string | null = null;
      let aiTags: string[] = [];

      if (runAi || i === 0) {
        try {
          const aiAnalysis = await analyzeActivityPhoto(
            processed.thumbnailBuffer,
            album.title
          );
          aiCaption = aiAnalysis.caption;
          aiTags = aiAnalysis.tags;
          aiTags.forEach((t) => newTagsCollector.add(t));
        } catch (aiErr) {
          console.warn("AI analysis skipped for file:", aiErr);
        }
      }

      // 4. Save MediaFile Record
      const isFirstPhoto = album.photoCount === 0 && i === 0;
      const mediaRecord = await prisma.mediaFile.create({
        data: {
          id: mediaId,
          albumId: album.id,
          fileName: file.name,
          mimeType: file.type,
          fileSizeBytes: fileSize,
          width: processed.width,
          height: processed.height,
          driveFileId,
          thumbnailWebpUrl: processed.thumbnailUrl,
          reportReadyJpgUrl: processed.reportReadyUrl,
          capturedAt: processed.capturedAt || null,
          cameraModel: processed.cameraModel || null,
          aiCaption,
          aiTagsJson: aiTags.length > 0 ? JSON.stringify(aiTags) : null,
          isFeatured: isFirstPhoto,
        },
      });

      uploadedMediaList.push({
        id: mediaRecord.id,
        fileName: mediaRecord.fileName,
        thumbnailUrl: mediaRecord.thumbnailWebpUrl,
        reportReadyUrl: mediaRecord.reportReadyJpgUrl,
        aiCaption: mediaRecord.aiCaption,
        aiTags,
      });
    }

    // 5. Update Album cover, count, and size
    const updatedPhotoCount = album.photoCount + uploadedMediaList.length;
    const updatedTotalSize = album.totalSizeBytes + addedSizeBytes;
    const coverUrl =
      album.coverThumbnailUrl ||
      uploadedMediaList[0]?.thumbnailUrl ||
      null;

    const updatedAlbum = await prisma.album.update({
      where: { id: album.id },
      data: {
        photoCount: updatedPhotoCount,
        totalSizeBytes: updatedTotalSize,
        coverThumbnailUrl: coverUrl,
      },
    });

    // 6. Persist newly collected AI tags
    for (const tag of Array.from(newTagsCollector)) {
      try {
        await prisma.albumTag.upsert({
          where: {
            albumId_tagName: {
              albumId: album.id,
              tagName: tag,
            },
          },
          update: {},
          create: {
            albumId: album.id,
            tagName: tag,
          },
        });
      } catch (tagErr) {
        // Ignore duplicate tag race conditions
      }
    }

    // 7. LINE Flex Message Notification
    if (sendLine || (!album.isLineNotified && uploadedMediaList.length > 0)) {
      try {
        await sendNewAlbumFlexMessage({
          albumCode: album.albumCode,
          title: album.title,
          description: album.description,
          albumType: album.albumType,
          photoCount: updatedPhotoCount,
          totalSizeBytes: updatedTotalSize,
          eventDate: album.eventDate,
          coverThumbnailUrl: coverUrl,
          divisionName: album.divisionName,
          departmentName: album.departmentName,
          projectCode: album.project?.projectCode,
          projectName: album.project?.projectName,
        });

        await prisma.album.update({
          where: { id: album.id },
          data: { isLineNotified: true },
        });
      } catch (lineErr) {
        console.warn("LINE notification skipped or failed:", lineErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed and uploaded ${uploadedMediaList.length} photo(s).`,
      data: {
        albumCode: updatedAlbum.albumCode,
        photoCount: updatedAlbum.photoCount,
        totalSizeBytes: Number(updatedAlbum.totalSizeBytes),
        uploadedPhotos: uploadedMediaList,
      },
    });
  } catch (error) {
    console.error(`Error uploading files to album ${albumId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
