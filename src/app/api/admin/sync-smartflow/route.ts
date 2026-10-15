import { NextResponse } from "next/server";
import { syncProjectsFromSmartFlow } from "@/lib/services/smartflowService";

export async function POST() {
  try {
    const result = await syncProjectsFromSmartFlow();

    return NextResponse.json({
      success: true,
      message: `Synchronized ${result.projects.length} project(s) from SmartFlow.`,
      syncedFromRemote: result.syncedFromRemote,
      projects: result.projects,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing projects from admin:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
