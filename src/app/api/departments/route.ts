import { NextResponse } from "next/server";
import { getDepartmentsList } from "@/lib/services/departmentService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const departments = await getDepartmentsList();
    return NextResponse.json(
      {
        success: true,
        departments,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
