import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const WATERMARK_PATH = path.resolve(process.cwd(), "public/assets/npc-watermark.png");
const WATERMARK_BACKUP_PATH = path.resolve(process.cwd(), "public/assets/npc-watermark.default.png");

/**
 * GET: Retrieve current watermark metadata
 */
export async function GET() {
  try {
    let stat;
    try {
      stat = await fs.stat(WATERMARK_PATH);
    } catch {
      return NextResponse.json({
        success: false,
        error: "Watermark file not found on server",
      }, { status: 404 });
    }

    const metadata = await sharp(WATERMARK_PATH).metadata();

    return NextResponse.json({
      success: true,
      watermark: {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || "png",
        size: stat.size,
        updatedAt: stat.mtimeMs,
        hasAlpha: metadata.hasAlpha ?? true,
      },
    });
  } catch (error: any) {
    console.error("Error retrieving watermark info:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to inspect watermark" },
      { status: 500 }
    );
  }
}

/**
 * POST: Upload new watermark image or reset to default
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Check if it's a JSON action (e.g. reset)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.action === "reset") {
        try {
          await fs.access(WATERMARK_BACKUP_PATH);
          await fs.copyFile(WATERMARK_BACKUP_PATH, WATERMARK_PATH);
          const stat = await fs.stat(WATERMARK_PATH);
          const meta = await sharp(WATERMARK_PATH).metadata();
          return NextResponse.json({
            success: true,
            message: "คืนค่าลายน้ำเริ่มต้นของวิทยาลัยเรียบร้อยแล้ว",
            watermark: {
              width: meta.width || 480,
              height: meta.height || 110,
              format: meta.format || "png",
              size: stat.size,
              updatedAt: Date.now(),
            },
          });
        } catch {
          return NextResponse.json(
            { success: false, error: "ไม่พบไฟล์ลายน้ำเริ่มต้นสำหรับคืนค่า" },
            { status: 400 }
          );
        }
      }
    }

    // Otherwise, handle multipart form data upload
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "ไม่พบไฟล์ที่อัปโหลด (กรุณาเลือกไฟล์ภาพ)" },
        { status: 400 }
      );
    }

    // Validate mime type
    const validMimes = ["image/png", "image/webp", "image/jpeg", "image/svg+xml"];
    if (!validMimes.includes(file.type) && !file.name.match(/\.(png|webp|jpe?g|svg)$/i)) {
      return NextResponse.json(
        { success: false, error: "รองรับเฉพาะไฟล์รูปภาพ (PNG, WebP, JPG หรือ SVG)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure assets directory exists
    const assetsDir = path.dirname(WATERMARK_PATH);
    await fs.mkdir(assetsDir, { recursive: true });

    // Backup current watermark if backup doesn't exist yet
    try {
      await fs.access(WATERMARK_BACKUP_PATH);
    } catch {
      try {
        await fs.copyFile(WATERMARK_PATH, WATERMARK_BACKUP_PATH);
      } catch {
        // ignore if source didn't exist
      }
    }

    // Process and optimize with Sharp:
    // Ensure clean transparent PNG output, max width 1200px (keeps crisp sharpness without ballooning file size)
    const processedBuffer = await sharp(buffer)
      .resize({
        width: 1200,
        height: 600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({
        quality: 95,
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toBuffer();

    await fs.writeFile(WATERMARK_PATH, processedBuffer);

    const meta = await sharp(processedBuffer).metadata();
    const stat = await fs.stat(WATERMARK_PATH);

    return NextResponse.json({
      success: true,
      message: "อัปโหลดและอัปเดตลายน้ำสำเร็จ พร้อมประทับในระบบดาวน์โหลดภาพแล้ว",
      watermark: {
        width: meta.width || 0,
        height: meta.height || 0,
        format: meta.format || "png",
        size: stat.size,
        updatedAt: Date.now(),
      },
    });
  } catch (error: any) {
    console.error("Error processing watermark upload:", error);
    return NextResponse.json(
      { success: false, error: error.message || "เกิดข้อผิดพลาดในการประมวลผลรูปภาพ" },
      { status: 500 }
    );
  }
}
