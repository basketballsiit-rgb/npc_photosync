import sharp from "sharp";
import {
  ensureAlbumDriveFolder,
  uploadOriginalToDrive,
  moveAlbumFolderOnProjectLink,
  getOriginalFileStream,
} from "../src/lib/services/googleDriveService";
import {
  processAndSaveImage,
  generateWatermarkedBuffer,
} from "../src/lib/services/imageProcessor";
import { analyzeActivityPhoto } from "../src/lib/services/geminiVisionService";
import { sendNewAlbumFlexMessage } from "../src/lib/services/lineNotifyService";
import { AlbumType } from "@prisma/client";
import fs from "fs";

async function main() {
  console.log("🧪 Starting Step 2 Backend Services Verification...");

  // 1. Google Shared Drive Service
  console.log("\n1. Testing Google Shared Drive Service:");
  const folderResult = await ensureAlbumDriveFolder(
    2569,
    AlbumType.PROJECT,
    "PRJ-6910-001_AI_Workshop"
  );
  console.log("  - ensureAlbumDriveFolder:", folderResult);

  const sampleBuf = await sharp({
    create: {
      width: 2400,
      height: 1600,
      channels: 3,
      background: { r: 15, g: 23, b: 42 },
    },
  })
    .jpeg()
    .toBuffer();

  const uploadResult = await uploadOriginalToDrive(
    sampleBuf,
    "test_photo.jpg",
    "image/jpeg",
    folderResult.driveFolderId
  );
  console.log("  - uploadOriginalToDrive:", uploadResult);

  const moveResult = await moveAlbumFolderOnProjectLink(
    folderResult.driveFolderId,
    2569,
    "PRJ-6910-001_Linked"
  );
  console.log("  - moveAlbumFolderOnProjectLink:", moveResult);

  const stream = await getOriginalFileStream(uploadResult.driveFileId);
  console.log("  - getOriginalFileStream: readable =", stream.readable);

  // 2. Image Processing Pipeline
  console.log("\n2. Testing Image Processor:");
  const processed = await processAndSaveImage(sampleBuf, {
    albumCode: "TEST-6910-001",
    mediaId: "test_media_01",
  });
  console.log("  - Dimensions:", processed.width, "x", processed.height);
  console.log(
    "  - Thumbnail exists:",
    fs.existsSync("./public" + processed.thumbnailUrl),
    processed.thumbnailUrl
  );
  console.log(
    "  - Report HD exists:",
    fs.existsSync("./public" + processed.reportReadyUrl),
    processed.reportReadyUrl
  );

  const watermarked = await generateWatermarkedBuffer(processed.reportBuffer);
  console.log("  - Watermarked buffer size:", watermarked.length, "bytes");

  // 3. Gemini Vision AI Service
  console.log("\n3. Testing Gemini Vision AI Service:");
  const aiResult = await analyzeActivityPhoto(
    processed.thumbnailBuffer,
    "พิธีเปิดโครงการฝึกอบรม AI วิทยาลัยสารพัดช่างน่าน"
  );
  console.log("  - AI Caption:", aiResult.caption);
  console.log("  - AI Tags:", aiResult.tags);

  // 4. LINE Messaging API Service
  console.log("\n4. Testing LINE Notify Service:");
  const lineResult = await sendNewAlbumFlexMessage({
    albumCode: "PRJ-6910-001",
    title: "โครงการอบรมเชิงปฏิบัติการพัฒนาทักษะ AI เพื่อวิชาชีพ",
    albumType: AlbumType.PROJECT,
    photoCount: 24,
    totalSizeBytes: 125000000,
    eventDate: new Date(),
    divisionName: "ฝ่ายวิชาการ",
    departmentName: "แผนกวิชาเทคโนโลยีสารสนเทศ",
    projectCode: "PRJ-69-001",
    projectName: "โครงการอบรมเชิงปฏิบัติการ AI",
  });
  console.log("  - LINE notification result:", lineResult);

  console.log("\n✨ All 4 Step 2 services verified and operating without errors!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
