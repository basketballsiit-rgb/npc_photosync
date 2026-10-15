import sharp from "sharp";
import exifReader from "exif-reader";
import path from "path";
import fs from "fs/promises";

export interface ProcessedImageMetadata {
  width: number;
  height: number;
  capturedAt?: Date;
  cameraModel?: string;
  thumbnailBuffer: Buffer;
  thumbnailUrl: string;
  reportBuffer: Buffer;
  reportReadyUrl: string;
}

export interface ImageProcessingOptions {
  albumCode: string;
  mediaId: string;
  baseStoragePath?: string; // Default: ./public/uploads
}

/**
 * Process uploaded photo buffer:
 * 1. Extract EXIF data (orientation, camera, date, dimensions)
 * 2. Auto-rotate based on EXIF orientation
 * 3. Generate Thumbnail WebP (width: 600px, quality: 80)
 * 4. Generate Report-Ready HD JPG (max 1920px, quality: 85, optimized for 5-chapter reports)
 * 5. Persist to local / NAS storage
 */
export async function processAndSaveImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions
): Promise<ProcessedImageMetadata> {
  const { albumCode, mediaId } = options;
  const baseStorage =
    options.baseStoragePath ||
    process.env.LOCAL_MEDIA_STORAGE_PATH ||
    "./public/uploads";

  // Initialize sharp instance with auto-rotation
  const image = sharp(inputBuffer).rotate();
  const rawMetadata = await sharp(inputBuffer).metadata();

  // 1. Extract EXIF Data
  let cameraModel: string | undefined;
  let capturedAt: Date | undefined;

  if (rawMetadata.exif) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = exifReader(rawMetadata.exif) as any;

      const model = parsed?.image?.Model || parsed?.Image?.Model;
      const make = parsed?.image?.Make || parsed?.Image?.Make;
      if (model) {
        cameraModel = make && !model.toLowerCase().includes(make.toLowerCase())
          ? `${make} ${model}`
          : model;
      }

      const rawDate =
        parsed?.exif?.DateTimeOriginal ||
        parsed?.Photo?.DateTimeOriginal ||
        parsed?.image?.ModifyDate;

      if (rawDate instanceof Date) {
        capturedAt = rawDate;
      } else if (typeof rawDate === "string") {
        const standardDateStr = rawDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
        const parsedDate = new Date(standardDateStr);
        if (!isNaN(parsedDate.getTime())) {
          capturedAt = parsedDate;
        }
      }
    } catch (exifErr) {
      // Non-fatal if EXIF is missing or malformed
      console.warn(`Could not parse EXIF for media ${mediaId}:`, exifErr);
    }
  }

  // 2. Generate Thumbnail (WebP, max width 600px, quality 80)
  const thumbnailBuffer = await image
    .clone()
    .resize({
      width: 600,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  // 3. Generate Report-Ready HD Image (JPG, max 1920x1920, quality 85, progressive)
  const reportBuffer = await image
    .clone()
    .resize({
      width: 1920,
      height: 1920,
      withoutEnlargement: true,
      fit: "inside",
    })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();

  // Inspect final report dimensions
  const finalMeta = await sharp(reportBuffer).metadata();
  const width = finalMeta.width || rawMetadata.width || 1920;
  const height = finalMeta.height || rawMetadata.height || 1080;

  // 4. Ensure directories exist on disk
  const thumbsDir = path.resolve(baseStorage, "thumbs", albumCode);
  const reportDir = path.resolve(baseStorage, "report", albumCode);

  await fs.mkdir(thumbsDir, { recursive: true });
  await fs.mkdir(reportDir, { recursive: true });

  const thumbFilePath = path.join(thumbsDir, `${mediaId}.webp`);
  const reportFilePath = path.join(reportDir, `${mediaId}.jpg`);

  await fs.writeFile(thumbFilePath, thumbnailBuffer);
  await fs.writeFile(reportFilePath, reportBuffer);

  const thumbnailUrl = `/uploads/thumbs/${albumCode}/${mediaId}.webp`;
  const reportReadyUrl = `/uploads/report/${albumCode}/${mediaId}.jpg`;

  return {
    width,
    height,
    capturedAt,
    cameraModel,
    thumbnailBuffer,
    thumbnailUrl,
    reportBuffer,
    reportReadyUrl,
  };
}

/**
 * Generate Watermarked Buffer for PR Social Ready downloads
 * Overlays college logo badge at the bottom-right and college branding banner
 */
export async function generateWatermarkedBuffer(
  inputBuffer: Buffer
): Promise<Buffer> {
  const baseImage = sharp(inputBuffer).rotate();
  const metadata = await baseImage.metadata();

  const imgWidth = metadata.width || 1920;
  const imgHeight = metadata.height || 1080;

  // Watermark badge path
  const watermarkPath = path.resolve(process.cwd(), "public/assets/npc-watermark.png");

  // Determine scaling: watermark is ~22% of image width (min 200px, max 450px)
  const watermarkWidth = Math.max(200, Math.min(450, Math.round(imgWidth * 0.22)));

  const composites: sharp.OverlayOptions[] = [];

  try {
    const resizedWatermark = await sharp(watermarkPath)
      .resize({ width: watermarkWidth })
      .png()
      .toBuffer();

    const margin = Math.round(imgWidth * 0.02); // 2% margin

    // Place college watermark at bottom-right
    composites.push({
      input: resizedWatermark,
      gravity: "southeast",
      top: undefined,
      left: undefined,
    });
  } catch (err) {
    console.warn("Watermark image not found, falling back to SVG banner overlay:", err);
  }

  // Add subtle dark gradient bar at the bottom with college typography
  const bannerHeight = Math.max(36, Math.round(imgHeight * 0.045));
  const fontSize = Math.max(14, Math.round(bannerHeight * 0.42));

  const bannerSvg = `
    <svg width="${imgWidth}" height="${bannerHeight}" viewBox="0 0 ${imgWidth} ${bannerHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0F172A" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#1E293B" stop-opacity="0.65" />
        </linearGradient>
      </defs>
      <rect width="${imgWidth}" height="${bannerHeight}" fill="url(#barGrad)"/>
      <line x1="0" y1="0" x2="${imgWidth}" y2="0" stroke="#06B6D4" stroke-width="2"/>
      <text x="${imgWidth * 0.02}" y="${bannerHeight * 0.65}" font-family="sans-serif" font-weight="bold" font-size="${fontSize}" fill="#F8FAFC">
        วิทยาลัยสารพัดช่างน่าน • Nan Polytechnic College
      </text>
      <text x="${imgWidth * 0.98}" y="${bannerHeight * 0.65}" text-anchor="end" font-family="sans-serif" font-size="${Math.round(fontSize * 0.85)}" fill="#38BDF8">
        NPC_PhotoSync PR Cloud
      </text>
    </svg>
  `;

  composites.push({
    input: Buffer.from(bannerSvg),
    gravity: "south",
  });

  return await baseImage
    .composite(composites)
    .jpeg({ quality: 90, progressive: true })
    .toBuffer();
}
