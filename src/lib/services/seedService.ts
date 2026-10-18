import prisma from "@/lib/prisma";

/**
 * Clears mock/sample demo albums from the database to ensure the production environment is completely clean.
 */
export async function clearDemoData() {
  try {
    await prisma.album.deleteMany({
      where: {
        OR: [
          {
            albumCode: {
              in: [
                "PRJ-6910-001",
                "PRJ-6910-002",
                "RTN-6910-001",
                "ACT-6910-001",
                "AST-6910-001",
                "AST-6909-001",
              ],
            },
          },
          {
            driveFolderId: {
              startsWith: "mock_drive_",
            },
          },
        ],
      },
    });
    console.log("🧹 Cleaned all sample/demo albums successfully.");
  } catch (error) {
    console.warn("Could not clean demo data:", error);
  }
}
