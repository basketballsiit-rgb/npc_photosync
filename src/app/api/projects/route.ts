import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncProjectsFromSmartFlow } from "@/lib/services/smartflowService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/projects
 * Public API endpoint for PhotoSync client components to retrieve synced SmartFlow projects.
 * Supports optional keyword search (?q=), academicYear (?academicYear=), and force refresh (?sync=1).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("q")?.trim() || "";
    const academicYearParam = searchParams.get("academicYear");
    const academicYear = academicYearParam ? parseInt(academicYearParam, 10) : undefined;
    const forceSync = searchParams.get("sync") === "1" || searchParams.get("sync") === "true";

    // 1. If force sync is requested, sync with SmartFlow upstream immediately
    if (forceSync) {
      try {
        await syncProjectsFromSmartFlow(academicYear, keyword);
      } catch (syncErr) {
        console.warn("Manual force sync error in GET /api/projects:", syncErr);
      }
    } else {
      // 2. Self-heal: If local database has no SmartFlow projects at all, trigger auto-sync
      const totalInDb = await prisma.smartFlowProject.count();
      if (totalInDb === 0) {
        try {
          await syncProjectsFromSmartFlow();
        } catch (syncErr) {
          console.warn("Initial auto-sync error in GET /api/projects:", syncErr);
        }
      }
    }

    // 3. Query projects from local database cache
    const where: any = {};
    if (academicYear && !isNaN(academicYear)) {
      where.academicYear = academicYear;
    }
    if (keyword) {
      where.OR = [
        { projectCode: { contains: keyword } },
        { projectName: { contains: keyword } },
        { ownerTeacherName: { contains: keyword } },
        { divisionName: { contains: keyword } },
        { departmentName: { contains: keyword } },
      ];
    }

    const projects = await prisma.smartFlowProject.findMany({
      where,
      orderBy: [
        { academicYear: "desc" },
        { projectCode: "asc" },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        count: projects.length,
        projects,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error in GET /api/projects:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
