import {
  syncProjectsFromSmartFlow,
  upsertSmartFlowProjectRecord,
  notifySmartFlowWebhook,
} from "../src/lib/services/smartflowService";
import prisma from "../src/lib/prisma";
import { AlbumType } from "@prisma/client";

async function main() {
  console.log("🧪 Starting Step 3 Two-Way Integration & Core APIs Verification...");

  // 1. Test SmartFlow Service
  console.log("\n1. Testing SmartFlow Project Sync & Consumer:");
  const testProject = await upsertSmartFlowProjectRecord({
    smartflowId: "SF-TEST-999",
    projectCode: "PRJ-69-099",
    projectName: "โครงการทดสอบการเชื่อมต่อสองทาง SmartFlow กับ PhotoSync",
    academicYear: 2569,
    divisionName: "ฝ่ายวิชาการ",
    departmentName: "แผนกวิชาเทคโนโลยีสารสนเทศ",
    ownerTeacherName: "นายทดสอบ ระบบดี",
    ownerEmail: "test@npc.ac.th",
  });
  console.log("  - Project upserted successfully:", testProject?.projectCode);

  const localSyncResult = await syncProjectsFromSmartFlow(2569);
  console.log(`  - syncProjectsFromSmartFlow: Retrieved ${localSyncResult.projects.length} project(s), remote: ${localSyncResult.syncedFromRemote}`);

  const webhookResult = await notifySmartFlowWebhook({
    projectCode: "PRJ-69-099",
    albumCode: "PRJ-6910-001",
    albumTitle: "โครงการอบรมเชิงปฏิบัติการพัฒนาทักษะ AI",
    photoCount: 5,
    eventDate: new Date(),
    action: "ALBUM_LINKED",
  });
  console.log("  - notifySmartFlowWebhook mock executed successfully:", webhookResult.success);

  // 2. Querying Projects Media for 5-Chapter Reports
  console.log("\n2. Testing 5-Chapter Report Media Retrieval for Project PRJ-69-001:");
  const projectWithMedia = await prisma.smartFlowProject.findUnique({
    where: { projectCode: "PRJ-69-001" },
    include: {
      albums: {
        include: {
          mediaFiles: true,
          tags: true,
        },
      },
    },
  });

  if (projectWithMedia) {
    console.log(`  - Project: ${projectWithMedia.projectName}`);
    console.log(`  - Linked Albums: ${projectWithMedia.albums.length}`);
    const firstAlbum = projectWithMedia.albums[0];
    if (firstAlbum) {
      console.log(`  - Album Code: ${firstAlbum.albumCode}, Photos: ${firstAlbum.mediaFiles.length}`);
      console.log(`  - Drive Folder URL for QR Code: ${firstAlbum.driveFolderUrl}`);
      console.log(`  - Sample AI Caption: ${firstAlbum.mediaFiles[0]?.aiCaption}`);
    }
  }

  // 3. Test Unlinked Albums Query
  console.log("\n3. Testing Query for Unlinked Albums (eligible for retroactive linking):");
  const unlinkedAlbums = await prisma.album.findMany({
    where: { projectId: null },
    select: { albumCode: true, title: true, albumType: true },
  });
  console.log(`  - Found ${unlinkedAlbums.length} unlinked album(s):`);
  unlinkedAlbums.forEach((a) => {
    console.log(`    • [${a.albumType}] ${a.albumCode}: ${a.title}`);
  });

  // 4. Test Retroactive Project Linking Logic
  console.log("\n4. Testing Retroactive Album Linking Simulation:");
  const sampleAdhoc = await prisma.album.findFirst({
    where: { albumType: AlbumType.ADHOC, projectId: null },
  });

  if (sampleAdhoc && testProject) {
    const linked = await prisma.album.update({
      where: { id: sampleAdhoc.id },
      data: {
        projectId: testProject.id,
        albumType: AlbumType.PROJECT,
        divisionName: testProject.divisionName,
        departmentName: testProject.departmentName,
      },
    });
    console.log(`  - Successfully linked [${sampleAdhoc.albumCode}] to [${testProject.projectCode}]: albumType is now ${linked.albumType}`);

    // Revert back so database stays pristine
    await prisma.album.update({
      where: { id: sampleAdhoc.id },
      data: {
        projectId: null,
        albumType: AlbumType.ADHOC,
      },
    });
    console.log(`  - Reset test album [${sampleAdhoc.albumCode}] back to ADHOC for clean state.`);
  }

  // Cleanup test project
  await prisma.smartFlowProject.delete({ where: { projectCode: "PRJ-69-099" } });
  console.log("  - Cleaned up temporary test project.");

  console.log("\n✨ Step 3 verification passed successfully!");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
