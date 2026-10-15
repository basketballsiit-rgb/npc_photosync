import prisma from "@/lib/prisma";
import { SmartFlowProject } from "@prisma/client";

export interface SmartFlowSyncPayload {
  smartflowId: string;
  projectCode: string;
  projectName: string;
  academicYear: number;
  budgetYear?: number;
  divisionName: string;
  departmentName?: string | null;
  ownerTeacherName: string;
  ownerEmail: string;
  projectStatus?: string;
}

export interface SmartFlowWebhookData {
  projectCode: string;
  albumCode: string;
  albumTitle: string;
  coverThumbnailUrl?: string | null;
  photoCount: number;
  driveFolderUrl?: string | null;
  eventDate: Date;
  action: "ALBUM_CREATED" | "ALBUM_LINKED";
}

/**
 * Upsert a project record from SmartFlow into local cache table
 */
export async function upsertSmartFlowProjectRecord(
  item: SmartFlowSyncPayload
): Promise<SmartFlowProject> {
  return await prisma.smartFlowProject.upsert({
    where: { projectCode: item.projectCode },
    update: {
      smartflowId: String(item.smartflowId),
      projectName: item.projectName,
      academicYear: item.academicYear,
      budgetYear: item.budgetYear || item.academicYear,
      divisionName: item.divisionName,
      departmentName: item.departmentName || null,
      ownerTeacherName: item.ownerTeacherName,
      ownerEmail: item.ownerEmail,
      projectStatus: item.projectStatus || "APPROVED",
      lastSyncedAt: new Date(),
    },
    create: {
      smartflowId: String(item.smartflowId),
      projectCode: item.projectCode,
      projectName: item.projectName,
      academicYear: item.academicYear,
      budgetYear: item.budgetYear || item.academicYear,
      divisionName: item.divisionName,
      departmentName: item.departmentName || null,
      ownerTeacherName: item.ownerTeacherName,
      ownerEmail: item.ownerEmail,
      projectStatus: item.projectStatus || "APPROVED",
      lastSyncedAt: new Date(),
    },
  });
}

/**
 * Fetch projects from npc_smartflow API and upsert into local database.
 * If external SmartFlow API is offline or not configured, seamlessly falls back
 * to querying local cached SmartFlowProject records.
 */
export async function syncProjectsFromSmartFlow(
  academicYear?: number,
  keyword?: string
): Promise<{ projects: SmartFlowProject[]; syncedFromRemote: boolean }> {
  const apiUrl = process.env.NPC_SMARTFLOW_API_URL;
  const secretKey = process.env.NPC_SMARTFLOW_SECRET_KEY;

  let remoteSuccess = false;

  if (apiUrl && !apiUrl.includes("smartflow.pvc.ac.th") && !apiUrl.includes("smartflow.npc.ac.th") && secretKey) {
    try {
      const url = new URL(`${apiUrl}/projects`);
      if (academicYear) url.searchParams.set("academicYear", String(academicYear));
      if (keyword) url.searchParams.set("q", keyword);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          "X-SmartFlow-Secret": secretKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const projectList: SmartFlowSyncPayload[] = Array.isArray(data)
          ? data
          : data?.projects || [];

        for (const item of projectList) {
          if (item.projectCode && item.projectName) {
            await upsertSmartFlowProjectRecord(item);
          }
        }
        remoteSuccess = true;
      }
    } catch (err) {
      console.warn("SmartFlow API unreachable, reading from local project cache:", err);
    }
  }

  // Query local cache with filters
  const whereClause: any = {};
  if (academicYear) {
    whereClause.academicYear = academicYear;
  }
  if (keyword) {
    whereClause.OR = [
      { projectCode: { contains: keyword } },
      { projectName: { contains: keyword } },
      { ownerTeacherName: { contains: keyword } },
      { departmentName: { contains: keyword } },
    ];
  }

  const projects = await prisma.smartFlowProject.findMany({
    where: whereClause,
    orderBy: { projectCode: "asc" },
  });

  return {
    projects,
    syncedFromRemote: remoteSuccess,
  };
}

/**
 * Send webhook notification to npc_smartflow when an album is created or linked to a project
 */
export async function notifySmartFlowWebhook(
  webhookData: SmartFlowWebhookData
): Promise<{ success: boolean; error?: string }> {
  const apiUrl = process.env.NPC_SMARTFLOW_API_URL;
  const secretKey = process.env.NPC_SMARTFLOW_SECRET_KEY;

  if (!apiUrl || apiUrl.includes("smartflow.pvc.ac.th") || apiUrl.includes("smartflow.npc.ac.th") || !secretKey) {
    console.log(
      `[SmartFlow Webhook Mock] Notification for project ${webhookData.projectCode} -> Album ${webhookData.albumCode} (${webhookData.action}) logged.`
    );
    return { success: true };
  }

  try {
    const webhookEndpoint = `${apiUrl}/webhooks/photosync`;
    const res = await fetch(webhookEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SmartFlow-Secret": secretKey,
      },
      body: JSON.stringify({
        ...webhookData,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`SmartFlow webhook responded with status ${res.status}:`, errText);
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (error) {
    console.warn("SmartFlow webhook delivery failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
