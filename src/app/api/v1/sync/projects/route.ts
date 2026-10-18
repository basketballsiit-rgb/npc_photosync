import { NextRequest, NextResponse } from "next/server";
import { validatePhotoSyncApiKey } from "@/lib/api-security";
import { upsertSmartFlowProjectRecord, SmartFlowSyncPayload } from "@/lib/services/smartflowService";

export async function POST(req: NextRequest) {
  const auth = validatePhotoSyncApiKey(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json();
    const items: SmartFlowSyncPayload[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.projects)
      ? body.projects
      : body?.projectCode
      ? [body]
      : [];

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid project payload provided. Expected single project or projects array.",
        },
        { status: 400 }
      );
    }

    const savedProjects = [];
    for (const item of items) {
      if (!item.projectCode || !item.projectName || !item.academicYear) {
        continue;
      }
      const saved = await upsertSmartFlowProjectRecord(item);
      savedProjects.push({
        id: saved.id,
        projectCode: saved.projectCode,
        projectName: saved.projectName,
        academicYear: saved.academicYear,
        status: saved.projectStatus,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${savedProjects.length} project(s) into PhotoSync cache.`,
      count: savedProjects.length,
      projects: savedProjects,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in POST /api/v1/sync/projects:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = validatePhotoSyncApiKey(req);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const projects = await prisma.smartFlowProject.findMany({
      orderBy: { academicYear: "desc" },
    });

    return NextResponse.json({
      success: true,
      count: projects.length,
      projects,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in GET /api/v1/sync/projects:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
