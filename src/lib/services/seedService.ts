import prisma from "@/lib/prisma";

/**
 * Clears mock/sample demo albums from the database to ensure the production environment is completely clean.
 * Strictly checks for dummy/mock IDs only - never touches user-uploaded albums.
 */
export async function clearDemoData() {
  try {
    // Only clean explicitly marked mock albums (starts with mock_drive_ or mock_folder_)
    const deleted = await prisma.album.deleteMany({
      where: {
        driveFolderId: {
          startsWith: "mock_drive_",
        },
      },
    });
    if (deleted.count > 0) {
      console.log(`🧹 Cleaned ${deleted.count} legacy mock albums.`);
    }
  } catch (error) {
    console.warn("Could not clean demo data:", error);
  }
}
