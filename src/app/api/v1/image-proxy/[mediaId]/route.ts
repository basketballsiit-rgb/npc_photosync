import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { getOriginalFileStream } from "@/lib/services/googleDriveService";
import { generateWatermarkedBuffer } from "@/lib/services/imageProcessor";
import sharp from "sharp";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PhotoSync-Api-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err: any) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  const { mediaId } = params;
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "report").toLowerCase(); // thumb, report, watermark, original
  const isDownload = searchParams.get("download") === "1" || searchParams.has("download");

  try {
    const media = await prisma.mediaFile.findUnique({
      where: { id: mediaId },
      include: { album: true },
    });

    if (!media) {
      return new NextResponse("Media not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const albumCode = media.album.albumCode;
    const baseUploadPath =
      process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";

    // Formulate safe download filename
    const rawBaseName = (media.fileName || "photo").replace(/\.[^/.]+$/, "");
    const ext = type === "thumb" ? "webp" : "jpg";
    const downloadSuffix = type === "watermark" ? "_PR" : type === "thumb" ? "_thumb" : type === "original" ? "" : "_HD";
    const downloadFilename = type === "original" ? media.fileName : `${rawBaseName}${downloadSuffix}.${ext}`;
    const encodedFilename = encodeURIComponent(downloadFilename);

    const contentDisposition = isDownload
      ? `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
      : `inline; filename="${encodedFilename}"`;

    const thumbsDir = path.resolve(baseUploadPath, "thumbs", albumCode);
    const reportDir = path.resolve(baseUploadPath, "report", albumCode);
    const thumbPath = path.resolve(thumbsDir, `${media.id}.webp`);
    const reportPath = path.resolve(reportDir, `${media.id}.jpg`);

    // Helper: auto-heal thumbnail / report from original file or Google Drive
    const autoHealFromSources = async () => {
      await fs.mkdir(thumbsDir, { recursive: true });
      await fs.mkdir(reportDir, { recursive: true });

      // 1. Check if thumbnail exists at an older path (e.g. from previous album before move)
      if (media.thumbnailWebpUrl && media.thumbnailWebpUrl.startsWith("/uploads/")) {
        const oldRel = media.thumbnailWebpUrl.replace(/^\/uploads\//, "");
        const altThumbPath = path.resolve(baseUploadPath, oldRel);
        if (existsSync(altThumbPath) && !existsSync(thumbPath)) {
          try {
            await fs.copyFile(altThumbPath, thumbPath);
          } catch {}
        }
      }

      // 2. Check if report JPG exists at an older path
      if (media.reportReadyJpgUrl && media.reportReadyJpgUrl.startsWith("/uploads/")) {
        const oldReportRel = media.reportReadyJpgUrl.replace(/^\/uploads\//, "");
        const altReportPath = path.resolve(baseUploadPath, oldReportRel);
        if (existsSync(altReportPath) && !existsSync(reportPath)) {
          try {
            await fs.copyFile(altReportPath, reportPath);
          } catch {}
        }
      }

      // 3. Check if local original master is on disk
      const originalDir = path.resolve(baseUploadPath, "original", albumCode);
      const possibleExts = [path.extname(media.fileName || ""), ".jpg", ".jpeg", ".png", ".webp", ".heic"].filter(Boolean);
      for (const e of possibleExts) {
        const localOrig = path.join(originalDir, `${media.id}${e.startsWith(".") ? e : "." + e}`);
        if (existsSync(localOrig)) {
          try {
            const origBuf = await fs.readFile(localOrig);
            if (!existsSync(thumbPath)) {
              const tb = await sharp(origBuf).rotate().resize({ width: 600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
              await fs.writeFile(thumbPath, tb);
            }
            if (!existsSync(reportPath)) {
              const rb = await sharp(origBuf).rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, progressive: true }).toBuffer();
              await fs.writeFile(reportPath, rb);
            }
            return;
          } catch {}
        }
      }

      // 4. Check if Google Drive file is available to restore missing local files
      if (media.driveFileId && !media.driveFileId.startsWith("mock_") && !media.driveFileId.startsWith("err_") && !media.driveFileId.startsWith("drive_")) {
        try {
          const driveStream = await getOriginalFileStream(media.driveFileId);
          const driveBuf = await streamToBuffer(driveStream);
          if (driveBuf && driveBuf.length > 0) {
            if (!existsSync(thumbPath)) {
              const tb = await sharp(driveBuf).rotate().resize({ width: 600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
              await fs.writeFile(thumbPath, tb);
            }
            if (!existsSync(reportPath)) {
              const rb = await sharp(driveBuf).rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, progressive: true }).toBuffer();
              await fs.writeFile(reportPath, rb);
            }
            // Also restore original master locally
            const targetOrig = path.join(originalDir, `${media.id}${possibleExts[0] || ".jpg"}`);
            await fs.mkdir(originalDir, { recursive: true });
            if (!existsSync(targetOrig)) {
              await fs.writeFile(targetOrig, driveBuf);
            }
          }
        } catch (healErr) {
          console.warn(`[ImageProxy] Auto-heal from Google Drive skipped for ${media.id}:`, healErr);
        }
      }
    };

    if (type === "thumb") {
      if (!existsSync(thumbPath)) {
        await autoHealFromSources();
      }

      if (existsSync(thumbPath)) {
        const fileBuf = await fs.readFile(thumbPath);
        return new NextResponse(new Uint8Array(fileBuf), {
          headers: {
            ...corsHeaders,
            "Content-Type": "image/webp",
            "Content-Disposition": contentDisposition,
            "Cache-Control": isDownload ? "no-cache" : "public, max-age=604800, immutable",
          },
        });
      }
    } else if (type === "watermark") {
      if (!existsSync(reportPath)) {
        await autoHealFromSources();
      }

      if (existsSync(reportPath)) {
        const reportBuf = await fs.readFile(reportPath);
        const watermarkedBuf = await generateWatermarkedBuffer(reportBuf);
        return new NextResponse(new Uint8Array(watermarkedBuf), {
          headers: {
            ...corsHeaders,
            "Content-Type": "image/jpeg",
            "Content-Disposition": contentDisposition,
            "Cache-Control": isDownload ? "no-cache" : "public, max-age=86400",
          },
        });
      }
    } else if (type === "original") {
      // 1. Check if 100% untouched original file is available on local disk storage
      const originalDir = path.resolve(baseUploadPath, "original", albumCode);
      const fileExt = path.extname(media.fileName || "");
      const possibleExts = Array.from(new Set([fileExt, ".jpg", ".jpeg", ".png", ".webp", ".heic"].filter(Boolean)));
      for (const ext of possibleExts) {
        const localOriginalPath = path.join(originalDir, `${media.id}${ext.startsWith(".") ? ext : "." + ext}`);
        if (existsSync(localOriginalPath)) {
          const fileBuf = await fs.readFile(localOriginalPath);
          return new NextResponse(new Uint8Array(fileBuf), {
            headers: {
              ...corsHeaders,
              "Content-Type": media.mimeType || "image/jpeg",
              "Content-Disposition": contentDisposition,
              "Cache-Control": isDownload ? "no-cache" : "public, max-age=604800, immutable",
            },
          });
        }
      }

      // 2. Check if original is available from Google Shared Drive
      if (
        media.driveFileId &&
        !media.driveFileId.startsWith("mock_") &&
        !media.driveFileId.startsWith("err_") &&
        !media.driveFileId.startsWith("drive_")
      ) {
        try {
          const stream = await getOriginalFileStream(media.driveFileId);
          // Convert Node Readable to Web ReadableStream
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const webStream = new ReadableStream({
            start(controller) {
              stream.on("data", (chunk) => controller.enqueue(chunk));
              stream.on("end", () => controller.close());
              stream.on("error", (err) => controller.error(err));
            },
          });

          return new NextResponse(webStream as any, {
            headers: {
              ...corsHeaders,
              "Content-Type": media.mimeType || "image/jpeg",
              "Content-Disposition": contentDisposition,
            },
          });
        } catch (driveErr) {
          console.warn("Could not stream original from Google Drive, fallback to report HD:", driveErr);
        }
      }
    }

    // Default: Report-ready HD JPEG
    if (!existsSync(reportPath)) {
      await autoHealFromSources();
    }

    if (existsSync(reportPath)) {
      const fileBuf = await fs.readFile(reportPath);
      return new NextResponse(new Uint8Array(fileBuf), {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/jpeg",
          "Content-Disposition": contentDisposition,
          "Cache-Control": isDownload ? "no-cache" : "public, max-age=604800, immutable",
        },
      });
    }

    // If local cached file is missing (e.g. fresh clone / demo), generate dynamic SVG fallback
    const fallbackSvg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0F172A"/>
        <text x="50%" y="45%" font-family="sans-serif" font-weight="bold" font-size="28" fill="#06B6D4" text-anchor="middle">
          วิทยาลัยสารพัดช่างน่าน (NPC PhotoSync)
        </text>
        <text x="50%" y="55%" font-family="sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle">
          ${media.fileName} (${type.toUpperCase()})
        </text>
      </svg>
    `;

    const fallbackJpg = await sharp(Buffer.from(fallbackSvg)).jpeg().toBuffer();
    return new NextResponse(new Uint8Array(fallbackJpg), {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/jpeg",
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    console.error(`Error in image proxy for media ${mediaId}:`, error);
    return new NextResponse("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}
