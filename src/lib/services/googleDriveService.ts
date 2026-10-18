import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { AlbumType } from "@prisma/client";

/**
 * Drive folder category naming convention
 */
export const ALBUM_TYPE_DRIVE_CATEGORY: Record<AlbumType, string> = {
  [AlbumType.PROJECT]: "01_โครงการตามแผน",
  [AlbumType.ROUTINE]: "02_งานประจำและทั่วไป",
  [AlbumType.ADHOC]: "03_กิจกรรมเฉพาะกิจ",
  [AlbumType.PORTFOLIO]: "04_คลังภาพประชาสัมพันธ์",
};

export interface DriveFolderResult {
  driveFolderId: string;
  driveFolderUrl: string;
  drivePathDisplay: string;
}

export interface DriveUploadResult {
  driveFileId: string;
  webViewLink: string;
}

/**
 * Initialize Google Drive Client with Service Account credentials
 */
import { getGoogleDriveConfig } from "./systemSettingService";

function isMockKey(key?: string): boolean {
  if (!key) return true;
  return (
    key.length < 500 ||
    key.includes("MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...") ||
    key.includes("MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC\\n")
  );
}

export async function getDriveClient(): Promise<{ drive: drive_v3.Drive; rootId: string } | null> {
  const config = await getGoogleDriveConfig();

  // 1. Prioritize OAuth 2.0 (User Google Account / 2TB Storage)
  if (config.authType === "oauth") {
    try {
      const oauth2Client = new google.auth.OAuth2(
        config.oauthClientId,
        config.oauthClientSecret
      );
      oauth2Client.setCredentials({
        refresh_token: config.oauthRefreshToken,
      });
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      return { drive, rootId: config.rootFolderId };
    } catch (error) {
      console.warn("Google Drive OAuth client init failed:", error);
      return null;
    }
  }

  // 2. Service Account Fallback (if configured and valid)
  if (
    config.authType === "service_account" &&
    config.clientEmail &&
    !isMockKey(config.privateKey)
  ) {
    let privateKey = config.privateKey;
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    try {
      const auth = new google.auth.JWT({
        email: config.clientEmail,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });

      const drive = google.drive({ version: "v3", auth });
      return { drive, rootId: config.rootFolderId };
    } catch (error) {
      console.warn("Google Drive service account auth failed:", error);
      return null;
    }
  }

  return null;
}

/**
 * Test connection to Google Drive
 */
export async function testDriveConnection(): Promise<{
  success: boolean;
  message: string;
  folderName?: string;
  folderId?: string;
  clientEmail?: string;
  isMock: boolean;
  authType: "oauth" | "service_account" | "none";
}> {
  const config = await getGoogleDriveConfig();
  if (config.isMock || !config.isConfigured) {
    return {
      success: false,
      message: "ยังไม่ได้เชื่อมต่อ Google Drive กรุณากำหนดค่าหรือกดเชื่อมต่อผ่าน Google OAuth 2.0",
      isMock: true,
      authType: config.authType,
    };
  }

  const client = await getDriveClient();
  if (!client) {
    return {
      success: false,
      message: "ไม่สามารถสร้างการเชื่อมต่อ Google Drive ได้ กรุณาตรวจสอบ Client ID / Secret หรือ Refresh Token",
      isMock: false,
      authType: config.authType,
    };
  }

  try {
    const rootFolderId = client.rootId;
    if (!rootFolderId) {
      return {
        success: false,
        message: "ยังไม่ได้ระบุ Google Drive Root Folder ID",
        isMock: false,
        authType: config.authType,
      };
    }

    const res = await client.drive.files.get({
      fileId: rootFolderId,
      fields: "id, name, mimeType, capabilities",
      supportsAllDrives: true,
    });

    const accountLabel = config.authType === "oauth"
      ? (config.oauthUserEmail || "บัญชี Google ที่เชื่อมต่อ")
      : config.clientEmail;

    return {
      success: true,
      message: `เชื่อมต่อสำเร็จ! ตรวจพบโฟลเดอร์: "${res.data.name}" (${accountLabel})`,
      folderName: res.data.name || undefined,
      folderId: res.data.id || undefined,
      clientEmail: accountLabel,
      isMock: false,
      authType: config.authType,
    };
  } catch (error: any) {
    console.error("Google Drive test connection failed:", error);
    let msg = error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ Google Drive";
    if (msg.includes("unregistered callers") || msg.includes("API key not valid")) {
      msg = "Google Drive API ยังไม่ได้เปิดใช้งานใน Google Cloud Console หรือ Key ไม่ถูกต้อง";
    } else if (msg.includes("File not found") || msg.includes("404")) {
      msg = "ไม่พบโฟลเดอร์นี้ หรือบัญชีที่เชื่อมต่อยังไม่มีสิทธิ์เข้าถึงโฟลเดอร์";
    }
    return {
      success: false,
      message: msg,
      clientEmail: config.oauthUserEmail || config.clientEmail,
      isMock: false,
      authType: config.authType,
    };
  }
}

/**
 * Find or create a subfolder inside a parent Google Drive folder
 */
async function findOrCreateFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentId: string
): Promise<string> {
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const response = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existingFolder = response.data.files?.[0];
  if (existingFolder?.id) {
    return existingFolder.id;
  }

  // Create folder
  const createResponse = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!createResponse.data.id) {
    throw new Error(`Failed to create Google Drive folder: ${folderName}`);
  }

  return createResponse.data.id;
}

/**
 * Ensure the full hierarchical folder exists for an album:
 * Root -> [academicYear] -> [01_โครงการตามแผน | ...] -> [folderName]
 */
export async function ensureAlbumDriveFolder(
  academicYear: number,
  albumType: AlbumType,
  folderName: string
): Promise<DriveFolderResult> {
  const client = await getDriveClient();
  const drive = client?.drive;
  const rootSharedDriveId = client?.rootId;
  const categoryName = ALBUM_TYPE_DRIVE_CATEGORY[albumType];
  const pathDisplay = `/${academicYear}/${categoryName}/${folderName}`;

  // Dev / Mock fallback if credentials are not configured or in test mode
  if (!drive || !rootSharedDriveId || rootSharedDriveId.includes("0AFqXXXX")) {
    const mockFolderId = `mock_folder_${Date.now()}`;
    return {
      driveFolderId: mockFolderId,
      driveFolderUrl: `https://drive.google.com/drive/folders/${mockFolderId}`,
      drivePathDisplay: pathDisplay,
    };
  }

  try {
    // 1. Ensure Year folder (e.g., /2569)
    const yearFolderId = await findOrCreateFolder(drive, String(academicYear), rootSharedDriveId);

    // 2. Ensure Category folder (e.g., /2569/01_โครงการตามแผน)
    const categoryFolderId = await findOrCreateFolder(drive, categoryName, yearFolderId);

    // 3. Ensure Album folder (e.g., /2569/01_โครงการตามแผน/PRJ-6910-001)
    const albumFolderId = await findOrCreateFolder(drive, folderName, categoryFolderId);

    return {
      driveFolderId: albumFolderId,
      driveFolderUrl: `https://drive.google.com/drive/folders/${albumFolderId}`,
      drivePathDisplay: pathDisplay,
    };
  } catch (error: any) {
    console.error("Error in ensureAlbumDriveFolder:", error?.response?.data || error?.message || error);
    const fallbackFolderId = `err_folder_${Date.now()}`;
    return {
      driveFolderId: fallbackFolderId,
      driveFolderUrl: `https://drive.google.com/drive/folders/${fallbackFolderId}`,
      drivePathDisplay: pathDisplay,
    };
  }
}

/**
 * Upload an uncompressed original image stream to Google Shared Drive
 */
export async function uploadOriginalToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<DriveUploadResult> {
  const client = await getDriveClient();
  const drive = client?.drive;

  if (!drive || folderId.startsWith("mock_") || folderId.startsWith("err_")) {
    const mockFileId = `mock_file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      driveFileId: mockFileId,
      webViewLink: `https://drive.google.com/file/d/${mockFileId}/view`,
    };
  }

  try {
    const stream = Readable.from(fileBuffer);

    const safeMimeType =
      mimeType && mimeType.trim() !== "" ? mimeType : "image/jpeg";

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: safeMimeType,
        body: stream,
      },
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });

    return {
      driveFileId: response.data.id || `file_${Date.now()}`,
      webViewLink:
        response.data.webViewLink ||
        `https://drive.google.com/file/d/${response.data.id}/view`,
    };
  } catch (error: any) {
    console.error(`Error uploading "${fileName}" to Google Drive (folderId: ${folderId}):`, error?.response?.data || error?.message || error);
    throw error;
  }
}

/**
 * Move an existing folder from Routine/Adhoc to `01_โครงการตามแผน` when retroactively linking to a project
 */
export async function moveAlbumFolderOnProjectLink(
  driveFolderId: string,
  academicYear: number,
  newFolderName?: string
): Promise<DriveFolderResult> {
  const client = await getDriveClient();
  const drive = client?.drive;
  const rootSharedDriveId = client?.rootId;
  const projectCategory = ALBUM_TYPE_DRIVE_CATEGORY[AlbumType.PROJECT];
  const finalFolderName = newFolderName || driveFolderId;
  const pathDisplay = `/${academicYear}/${projectCategory}/${finalFolderName}`;

  if (!drive || !rootSharedDriveId || driveFolderId.startsWith("mock_") || driveFolderId.startsWith("err_")) {
    return {
      driveFolderId,
      driveFolderUrl: `https://drive.google.com/drive/folders/${driveFolderId}`,
      drivePathDisplay: pathDisplay,
    };
  }

  try {
    // 1. Ensure Year and Project Category folder exists
    const yearFolderId = await findOrCreateFolder(drive, String(academicYear), rootSharedDriveId);
    const targetProjectCategoryId = await findOrCreateFolder(drive, projectCategory, yearFolderId);

    // 2. Fetch current parents of the album folder
    const currentFile = await drive.files.get({
      fileId: driveFolderId,
      fields: "parents, name",
      supportsAllDrives: true,
    });

    const previousParents = currentFile.data.parents?.join(",") || "";

    // 3. Move folder by updating parents
    const updateBody: drive_v3.Schema$File = {};
    if (newFolderName) {
      updateBody.name = newFolderName;
    }

    const updateResponse = await drive.files.update({
      fileId: driveFolderId,
      addParents: targetProjectCategoryId,
      removeParents: previousParents,
      requestBody: updateBody,
      fields: "id, name",
      supportsAllDrives: true,
    });

    const updatedId = updateResponse.data.id || driveFolderId;

    return {
      driveFolderId: updatedId,
      driveFolderUrl: `https://drive.google.com/drive/folders/${updatedId}`,
      drivePathDisplay: pathDisplay,
    };
  } catch (error) {
    console.error("Error moving album folder on project link:", error);
    return {
      driveFolderId,
      driveFolderUrl: `https://drive.google.com/drive/folders/${driveFolderId}`,
      drivePathDisplay: pathDisplay,
    };
  }
}

/**
 * Stream an original file from Google Drive for direct downloading or proxying
 */
export async function getOriginalFileStream(driveFileId: string): Promise<Readable> {
  const client = await getDriveClient();
  const drive = client?.drive;

  if (!drive || driveFileId.startsWith("mock_")) {
    // Fallback stream for mock/dev environment
    const mockContent = Buffer.from("NPC_PhotoSync Mock Stream Content");
    return Readable.from(mockContent);
  }

  const response = await drive.files.get(
    {
      fileId: driveFileId,
      alt: "media",
      supportsAllDrives: true,
    },
    {
      responseType: "stream",
    }
  );

  return response.data as Readable;
}
