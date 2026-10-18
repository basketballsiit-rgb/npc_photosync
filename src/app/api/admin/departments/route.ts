import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getDepartmentsList,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  resetDepartmentsToDefault,
} from "@/lib/services/departmentService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Enriches department items with actual album counts from MySQL database
 */
async function getEnrichedDepartments() {
  const departments = await getDepartmentsList();

  const countMap = new Map<string, number>();
  try {
    const albumCounts = await prisma.album.groupBy({
      by: ["departmentName"],
      where: { departmentName: { not: null } },
      _count: { id: true },
    });

    albumCounts.forEach((ac) => {
      if (ac.departmentName) {
        countMap.set(ac.departmentName, ac._count.id);
      }
    });
  } catch (err) {
    console.warn("Could not aggregate department album counts:", err);
  }

  return departments.map((d) => ({
    ...d,
    albumCount: countMap.get(d.name) || 0,
  }));
}

export async function GET() {
  try {
    const list = await getEnrichedDepartments();
    return NextResponse.json(
      {
        success: true,
        departments: list,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error fetching admin departments:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, name, divisionName, id } = body;

    if (action === "reset") {
      await resetDepartmentsToDefault();
      const list = await getEnrichedDepartments();
      return NextResponse.json(
        {
          success: true,
          message: "คืนค่ารายการแผนกวิชาและงานเป็นค่าเริ่มต้นเรียบร้อยแล้ว",
          departments: list,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุชื่อแผนกวิชา/งาน" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    await addDepartment(name, divisionName || "ฝ่ายวิชาการ");
    const list = await getEnrichedDepartments();

    return NextResponse.json(
      {
        success: true,
        message: `เพิ่มแผนกวิชา/งาน "${name.trim()}" สำเร็จเรียบร้อยแล้ว`,
        departments: list,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, divisionName } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ครบถ้วน กรุณาระบุ id และชื่อแผนกวิชา/งาน" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    await updateDepartment(id, name, divisionName);
    const list = await getEnrichedDepartments();

    return NextResponse.json(
      {
        success: true,
        message: `อัปเดตข้อมูลแผนกวิชา/งาน "${name.trim()}" สำเร็จแล้ว`,
        departments: list,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุ id แผนกวิชาที่ต้องการลบ" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    await deleteDepartment(id);
    const list = await getEnrichedDepartments();

    return NextResponse.json(
      {
        success: true,
        message: "ลบแผนกวิชา/งานออกจากระบบเรียบร้อยแล้ว",
        departments: list,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }
}
