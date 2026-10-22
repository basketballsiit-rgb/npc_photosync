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

let lastUpsertError = "";

/**
 * Upsert a project record from SmartFlow into local cache table safely
 */
export async function upsertSmartFlowProjectRecord(
  item: SmartFlowSyncPayload
): Promise<SmartFlowProject | null> {
  try {
    const existing = await prisma.smartFlowProject.findFirst({
      where: {
        OR: [
          { projectCode: item.projectCode },
          { smartflowId: String(item.smartflowId) },
        ],
      },
    });

    const safeData = {
      smartflowId: String(item.smartflowId),
      projectCode: item.projectCode,
      projectName: item.projectName,
      academicYear: Number(item.academicYear) || 2569,
      budgetYear: Number(item.budgetYear || item.academicYear) || 2569,
      divisionName: item.divisionName || "ฝ่ายบริหารทรัพยากร",
      departmentName: item.departmentName || null,
      ownerTeacherName: item.ownerTeacherName || "ครูผู้รับผิดชอบ",
      ownerEmail: item.ownerEmail || "academic@npc.ac.th",
      projectStatus: item.projectStatus || "APPROVED",
      lastSyncedAt: new Date(),
    };

    if (existing) {
      return await prisma.smartFlowProject.update({
        where: { id: existing.id },
        data: safeData,
      });
    }

    return await prisma.smartFlowProject.create({
      data: safeData,
    });
  } catch (err: any) {
    lastUpsertError = err?.message || String(err);
    console.warn(`Failed to upsert project ${item.projectCode}:`, lastUpsertError);
    return null;
  }
}

/**
 * Fetch projects from npc_smartflow API and upsert into local database.
 * If external SmartFlow API is offline or not configured, seamlessly falls back
 * to querying local cached SmartFlowProject records.
 */
export async function syncProjectsFromSmartFlow(
  academicYear?: number,
  keyword?: string
): Promise<{ projects: SmartFlowProject[]; syncedFromRemote: boolean; syncError?: string; savedCount?: number; debugLogs?: any[] }> {
  // Allow self-signed or internal SSL in Node fetch
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  let apiUrl = process.env.NPC_SMARTFLOW_API_URL || "https://service.npc.ac.th/npc_smartflow/api/v1";
  if (apiUrl.includes("smartflow.npc.ac.th") || apiUrl.includes("smartflow.pvc.ac.th") || apiUrl.includes("example.com") || !apiUrl) {
    apiUrl = "https://service.npc.ac.th/npc_smartflow/api/v1";
  }
  const secretKey = process.env.NPC_SMARTFLOW_SECRET_KEY || "npc-smartflow-secret-production-2026";

  let remoteSuccess = false;
  let syncError: string | undefined = undefined;
  let savedCount = 0;
  const debugLogs: any[] = [];

  if (apiUrl && secretKey) {
    const candidateUrls = [
      apiUrl,
      "https://service.npc.ac.th/npc_smartflow/api/v1",
      "http://127.0.0.1/npc_smartflow/api/v1",
      "https://127.0.0.1/npc_smartflow/api/v1",
      "http://localhost/npc_smartflow/api/v1",
    ];

    // Remove duplicates
    const uniqueCandidateUrls = Array.from(new Set(candidateUrls));

    for (const baseEndpoint of uniqueCandidateUrls) {
      if (remoteSuccess) break;
      try {
        const url = new URL(`${baseEndpoint}/projects`);
        if (academicYear) url.searchParams.set("academicYear", String(academicYear));
        if (keyword) url.searchParams.set("q", keyword);
        url.searchParams.set("secret", secretKey);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json",
            "X-SmartFlow-Secret": secretKey,
            "X-PhotoSync-Api-Key": secretKey,
            "Host": "service.npc.ac.th",
            "X-Forwarded-Proto": "https",
            "X-Forwarded-Port": "443",
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
              const saved = await upsertSmartFlowProjectRecord(item);
              if (saved) savedCount++;
            }
          }

          debugLogs.push({
            endpoint: baseEndpoint,
            status: response.status,
            receivedCount: projectList.length,
            savedCount,
            lastUpsertError,
          });

          if (savedCount > 0) {
            remoteSuccess = true;
            syncError = undefined;
            break;
          } else if (projectList.length > 0) {
            syncError = `SmartFlow ส่งมา ${projectList.length} โครงการ แต่บันทึกลงฐานข้อมูลไม่สำเร็จ: ${lastUpsertError}`;
          }
        } else {
          syncError = `SmartFlow API returned HTTP ${response.status}`;
          debugLogs.push({ endpoint: baseEndpoint, status: response.status });
        }
      } catch (err: any) {
        syncError = err?.message || String(err);
        debugLogs.push({ endpoint: baseEndpoint, error: syncError });
      }
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
    syncError,
    savedCount,
    debugLogs,
  };
}

/**
 * Send webhook notification to npc_smartflow when an album is created or linked to a project
 */
export async function notifySmartFlowWebhook(
  webhookData: SmartFlowWebhookData
): Promise<{ success: boolean; error?: string }> {
  let apiUrl = process.env.NPC_SMARTFLOW_API_URL || "https://service.npc.ac.th/npc_smartflow/api/v1";
  if (apiUrl.includes("smartflow.npc.ac.th") || apiUrl.includes("smartflow.pvc.ac.th") || apiUrl.includes("example.com") || !apiUrl) {
    apiUrl = "https://service.npc.ac.th/npc_smartflow/api/v1";
  }
  const secretKey = process.env.NPC_SMARTFLOW_SECRET_KEY || "npc-smartflow-secret-production-2026";

  if (!apiUrl || !secretKey) {
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
