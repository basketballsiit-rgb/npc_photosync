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

    if (type === "thumb") {
      const thumbPath = path.resolve(
        baseUploadPath,
        "thumbs",
        albumCode,
        `${media.id}.webp`
      );

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
      const reportPath = path.resolve(
        baseUploadPath,
        "report",
        albumCode,
        `${media.id}.jpg`
      );

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
      // 1. Check if original is available from Google Drive
      if (media.driveFileId) {
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
    const reportPath = path.resolve(
      baseUploadPath,
      "report",
      albumCode,
      `${media.id}.jpg`
    );

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
