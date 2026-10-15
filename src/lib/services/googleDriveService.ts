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
function isMockKey(key?: string): boolean {
  if (!key) return true;
  return (
    key.length < 500 ||
    key.includes("MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...") ||
    key.includes("MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC\\n")
  );
}

function getDriveClient(): drive_v3.Drive | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (
    !clientEmail ||
    clientEmail.includes("npc-photosync-sa@pvc-nan.iam") ||
    clientEmail.includes("your-gcp-project") ||
    isMockKey(privateKey)
  ) {
    return null;
  }

  // Handle newline escape characters in private key
  if (privateKey!.includes("\\n")) {
    privateKey = privateKey!.replace(/\\n/g, "\n");
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    return google.drive({ version: "v3", auth });
  } catch (error) {
    console.warn("Google Drive service account auth skipped (dev fallback active)");
    return null;
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
    corpora: "allDrives",
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
  const drive = getDriveClient();
  const rootSharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ROOT_ID;
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
  } catch (error) {
    console.error("Error in ensureAlbumDriveFolder:", error);
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
  const drive = getDriveClient();

  if (!drive || folderId.startsWith("mock_") || folderId.startsWith("err_")) {
    const mockFileId = `mock_file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      driveFileId: mockFileId,
      webViewLink: `https://drive.google.com/file/d/${mockFileId}/view`,
    };
  }

  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
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
}

/**
 * Move an existing folder from Routine/Adhoc to `01_โครงการตามแผน` when retroactively linking to a project
 */
export async function moveAlbumFolderOnProjectLink(
  driveFolderId: string,
  academicYear: number,
  newFolderName?: string
): Promise<DriveFolderResult> {
  const drive = getDriveClient();
  const rootSharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ROOT_ID;
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
  const drive = getDriveClient();

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
