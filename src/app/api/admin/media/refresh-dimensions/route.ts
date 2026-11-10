import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import sharp from "sharp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { albumCode } = await req.json().catch(() => ({ albumCode: undefined }));

    const baseUploadPath =
      process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";

    const mediaFiles = await prisma.mediaFile.findMany({
      where: albumCode
        ? { album: { albumCode } }
        : undefined,
      include: {
        album: {
          select: { albumCode: true },
        },
      },
    });

    let updatedCount = 0;
    const details: Array<{ id: string; fileName: string; oldSize: string; newSize: string }> = [];

    for (const media of mediaFiles) {
      const currentAlbumCode = media.album.albumCode;
      const originalDir = path.resolve(baseUploadPath, "original", currentAlbumCode);
      const fileExt = path.extname(media.fileName || "");
      const possibleExts = Array.from(new Set([fileExt, ".jpg", ".jpeg", ".png", ".webp", ".heic"].filter(Boolean)));

      for (const ext of possibleExts) {
        const localOriginalPath = path.join(originalDir, `${media.id}${ext.startsWith(".") ? ext : "." + ext}`);
        if (existsSync(localOriginalPath)) {
          try {
            const buf = await fs.readFile(localOriginalPath);
            const meta = await sharp(buf).metadata();

            let origWidth = meta.width || 1920;
            let origHeight = meta.height || 1080;
            if (meta.orientation && meta.orientation >= 5 && meta.orientation <= 8) {
              origWidth = meta.height || 1080;
              origHeight = meta.width || 1920;
            }

            if (origWidth !== media.width || origHeight !== media.height) {
              await prisma.mediaFile.update({
                where: { id: media.id },
                data: { width: origWidth, height: origHeight },
              });
              updatedCount++;
              details.push({
                id: media.id,
                fileName: media.fileName,
                oldSize: `${media.width}x${media.height}`,
                newSize: `${origWidth}x${origHeight}`,
              });
            }
          } catch (sharpErr) {
            console.warn(`Could not read metadata for ${media.id}:`, sharpErr);
          }
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `อัปเดตขนาดพิกเซลต้นฉบับสำเร็จ ${updatedCount} รูป`,
      updatedCount,
      details: details.slice(0, 50),
    });
  } catch (error: any) {
    console.error("refresh-dimensions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to refresh dimensions" },
      { status: 500 }
    );
  }
}
