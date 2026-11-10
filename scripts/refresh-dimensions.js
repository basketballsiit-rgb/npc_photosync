const { PrismaClient } = require("@prisma/client");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

async function main() {
  console.log("=== Refreshing Media Dimensions from Original Files ===");
  const baseUploadPath = process.env.LOCAL_MEDIA_STORAGE_PATH || "./public/uploads";

  const mediaFiles = await prisma.mediaFile.findMany({
    include: {
      album: { select: { albumCode: true } },
    },
  });

  let updated = 0;
  for (const media of mediaFiles) {
    const albumCode = media.album.albumCode;
    const originalDir = path.resolve(baseUploadPath, "original", albumCode);
    const fileExt = path.extname(media.fileName || "");
    const possibleExts = Array.from(
      new Set([fileExt, ".jpg", ".jpeg", ".png", ".webp", ".heic"].filter(Boolean))
    );

    for (const ext of possibleExts) {
      const localOriginalPath = path.join(
        originalDir,
        `${media.id}${ext.startsWith(".") ? ext : "." + ext}`
      );
      if (fs.existsSync(localOriginalPath)) {
        try {
          const buf = fs.readFileSync(localOriginalPath);
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
            updated++;
            console.log(
              `[Updated] ${media.fileName}: ${media.width}x${media.height} -> ${origWidth}x${origHeight}`
            );
          }
        } catch (e) {
          console.warn(`Error reading ${media.id}:`, e.message);
        }
        break;
      }
    }
  }
  console.log(`=== Done! Updated ${updated} media files to true original dimensions ===`);
}

main().finally(() => prisma.$disconnect());
