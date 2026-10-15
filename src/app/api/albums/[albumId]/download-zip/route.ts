import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import archiver from "archiver";
import { PassThrough } from "stream";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { generateWatermarkedBuffer } from "@/lib/services/imageProcessor";
import { getOriginalFileStream } from "@/lib/services/googleDriveService";

export async function POST(
  req: NextRequest,
  { params }: { params: { albumId: string } }
) {
  const { albumId } = params;

  try {
    const body = await req.json().catch(() => ({}));
    const { mediaIds = [], quality = "report" } = body as {
      mediaIds?: string[];
      quality?: "original" | "report" | "watermark";
    };

    const album = await prisma.album.findFirst({
      where: {
        OR: [{ id: albumId }, { albumCode: albumId }],
      },
      include: {
        mediaFiles: {
          where:
            Array.isArray(mediaIds) && mediaIds.length > 0
              ? { id: { in: mediaIds } }
              : undefined,
        },
      },
    });

    if (!album) {
      return NextResponse.json(
        { success: false, error: `Album "${albumId}" not found.` },
        { status: 404 }
      );
    }

    if (album.mediaFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: "No media files found to download." },
        { status: 400 }
      );
    }

    // Initialize PassThrough and Archiver
    const archive = archiver("zip", { zlib: { level: 5 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    const baseUploadPath =
      process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";

    // Asynchronously feed archive entries without blocking response initiation
    (async () => {
      try {
        for (const file of album.mediaFiles) {
          const reportPath = path.resolve(
            baseUploadPath,
            "report",
            album.albumCode,
            `${file.id}.jpg`
          );

          // 1. If Original and Drive stream available, use it directly
          if (quality === "original" && file.driveFileId && !file.driveFileId.startsWith("mock_")) {
            try {
              const stream = await getOriginalFileStream(file.driveFileId);
              archive.append(stream, { name: file.fileName });
              continue;
            } catch (driveErr) {
              console.warn(`Drive stream failed for ${file.fileName}, fallback to buffer:`, driveErr);
            }
          }

          // 2. Resolve image buffer from local disk or remote URL (e.g. mock/seed or CDN)
          let imgBuffer: Buffer | null = null;
          if (existsSync(reportPath)) {
            imgBuffer = await fs.readFile(reportPath);
          } else if (file.reportReadyJpgUrl && file.reportReadyJpgUrl.startsWith("http")) {
            try {
              const res = await fetch(file.reportReadyJpgUrl);
              if (res.ok) {
                imgBuffer = Buffer.from(await res.arrayBuffer());
              }
            } catch (e) {
              console.warn(`Could not fetch remote report URL for ${file.fileName}:`, e);
            }
          }

          // Fallback to thumbnail URL if reportReadyJpgUrl was unavailable
          if (!imgBuffer && file.thumbnailWebpUrl && file.thumbnailWebpUrl.startsWith("http")) {
            try {
              const res = await fetch(file.thumbnailWebpUrl);
              if (res.ok) {
                imgBuffer = Buffer.from(await res.arrayBuffer());
              }
            } catch (e) {
              console.warn(`Could not fetch remote thumb URL for ${file.fileName}:`, e);
            }
          }

          if (!imgBuffer) {
            console.warn(`No image data source found for file ${file.fileName} (id: ${file.id})`);
            continue;
          }

          const nameNoExt = file.fileName.replace(/\.[^/.]+$/, "");

          if (quality === "watermark") {
            try {
              const watermarked = await generateWatermarkedBuffer(imgBuffer);
              archive.append(watermarked, { name: `${nameNoExt}_WM.jpg` });
            } catch (wmErr) {
              console.warn(`Watermark generation failed, appending standard image:`, wmErr);
              archive.append(imgBuffer, { name: `${nameNoExt}_WM.jpg` });
            }
          } else if (quality === "original") {
            archive.append(imgBuffer, { name: file.fileName });
          } else {
            // Default: Report-ready HD JPG (~1920px)
            archive.append(imgBuffer, { name: `${nameNoExt}_HD.jpg` });
          }
        }

        await archive.finalize();
      } catch (archErr) {
        console.error("Error archiving files:", archErr);
        archive.abort();
      }
    })();

    // Log the download activity
    try {
      await prisma.downloadLog.create({
        data: {
          albumId: album.id,
          downloadType: `ZIP_${quality.toUpperCase()}`,
        },
      });
    } catch (logErr) {
      console.warn("Failed to create download log entry:", logErr);
    }

    // Convert PassThrough stream to Web ReadableStream
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webStream = new ReadableStream({
      start(controller) {
        passThrough.on("data", (chunk) => controller.enqueue(chunk));
        passThrough.on("end", () => controller.close());
        passThrough.on("error", (err) => controller.error(err));
      },
    });

    const safeFilename = `${album.albumCode}_${quality.toUpperCase()}.zip`;

    return new NextResponse(webStream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeFilename)}"`,
      },
    });
  } catch (error) {
    console.error(`Error generating ZIP download for album ${albumId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
