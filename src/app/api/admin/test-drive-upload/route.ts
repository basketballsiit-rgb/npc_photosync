import { NextRequest, NextResponse } from "next/server";
import { uploadOriginalToDrive, getDriveClient } from "@/lib/services/googleDriveService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId") || "1KJolsl2B5B6hxWVs6taWKfTOsFanwVME";

  try {
    const client = await getDriveClient();
    if (!client) {
      return NextResponse.json({ success: false, error: "No drive client" });
    }

    // Check folder metadata and permissions/capabilities
    const folderInfo = await client.drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType, capabilities, trashed, parents",
      supportsAllDrives: true,
    });

    // Attempt test upload
    const testBuffer = Buffer.from("NPC_PhotoSync Drive Test File Upload");
    const uploadResult = await uploadOriginalToDrive(
      testBuffer,
      `test_upload_${Date.now()}.txt`,
      "text/plain",
      folderId
    );

    return NextResponse.json({
      success: true,
      folderInfo: folderInfo.data,
      uploadResult,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      status: error.status,
      code: error.code,
      details: error.response?.data || error.errors || null,
    });
  }
}
