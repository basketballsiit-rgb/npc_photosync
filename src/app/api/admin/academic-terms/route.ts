import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setActiveAcademicTerm } from "@/lib/academic-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Fetch all academic terms, auto-seed defaults if table is empty, and aggregate album counts
 */
async function getEnrichedTerms() {
  let terms = await prisma.academicTerm.findMany({
    orderBy: [{ academicYear: "desc" }, { semester: "desc" }],
  });

  // Auto-seed initial terms if none exist yet
  if (terms.length === 0) {
    await prisma.academicTerm.createMany({
      data: [
        {
          academicYear: 2570,
          semester: 1,
          budgetYear: 2570,
          isCurrent: false,
          note: "ปีการศึกษาล่วงหน้า",
        },
        {
          academicYear: 2569,
          semester: 2,
          budgetYear: 2569,
          isCurrent: true,
          note: "ภาคเรียนที่ 2 (16 ต.ค. 2569 - 31 มี.ค. 2570)",
        },
        {
          academicYear: 2569,
          semester: 1,
          budgetYear: 2569,
          isCurrent: false,
          note: "ภาคเรียนปัจจุบัน (16 พ.ค. - 15 ต.ค. 2569)",
        },
        {
          academicYear: 2568,
          semester: 2,
          budgetYear: 2568,
          isCurrent: false,
          note: "ปีการศึกษาที่ผ่านมา",
        },
        {
          academicYear: 2568,
          semester: 1,
          budgetYear: 2568,
          isCurrent: false,
          note: "ปีการศึกษาที่ผ่านมา",
        },
      ],
    });

    terms = await prisma.academicTerm.findMany({
      orderBy: [{ academicYear: "desc" }, { semester: "desc" }],
    });
  }

  // Aggregate album counts per term
  const albumCountMap = new Map<string, number>();
  try {
    const albumCounts = await prisma.album.groupBy({
      by: ["academicYear", "semester"],
      _count: { id: true },
    });
    albumCounts.forEach((ac) => {
      albumCountMap.set(`${ac.academicYear}_${ac.semester}`, ac._count.id);
    });
  } catch (err) {
    console.warn("Could not aggregate album counts for academic terms:", err);
  }

  const enrichedTerms = terms.map((t) => ({
    ...t,
    albumCount: albumCountMap.get(`${t.academicYear}_${t.semester}`) || 0,
  }));

  const currentTerm = enrichedTerms.find((t) => t.isCurrent) || enrichedTerms[0] || null;

  return { currentTerm, terms: enrichedTerms };
}

export async function GET() {
  try {
    const { currentTerm, terms } = await getEnrichedTerms();

    return NextResponse.json(
      {
        success: true,
        currentTerm,
        terms,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error fetching academic terms:", error);
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
    const {
      academicYear,
      semester,
      budgetYear,
      isCurrent,
      startDate,
      endDate,
      note,
    } = body;

    if (!academicYear || !semester) {
      return NextResponse.json(
        { success: false, error: "Academic year and semester are required" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const yearNum = parseInt(academicYear, 10);
    const semesterNum = parseInt(semester, 10);
    const budgetNum = budgetYear ? parseInt(budgetYear, 10) : yearNum;

    if (isCurrent) {
      const updated = await setActiveAcademicTerm(yearNum, semesterNum, budgetNum, note);
      const { currentTerm, terms } = await getEnrichedTerms();
      return NextResponse.json(
        {
          success: true,
          message: `ตั้งค่าปีการศึกษา ${yearNum} ภาคเรียนที่ ${semesterNum} เป็นภาคเรียนปัจจุบันเรียบร้อยแล้ว`,
          data: updated,
          currentTerm,
          terms,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const term = await prisma.academicTerm.upsert({
      where: {
        academicYear_semester: {
          academicYear: yearNum,
          semester: semesterNum,
        },
      },
      update: {
        budgetYear: budgetNum,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        note: note || undefined,
      },
      create: {
        academicYear: yearNum,
        semester: semesterNum,
        budgetYear: budgetNum,
        isCurrent: false,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        note: note || undefined,
      },
    });

    const { currentTerm, terms } = await getEnrichedTerms();

    return NextResponse.json(
      {
        success: true,
        message: `บันทึกข้อมูลภาคเรียนที่ ${semesterNum}/${yearNum} เรียบร้อยแล้ว`,
        data: term,
        currentTerm,
        terms,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error creating/updating academic term:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { academicYear, semester, budgetYear, note } = body;

    if (!academicYear || !semester) {
      return NextResponse.json(
        { success: false, error: "Academic year and semester are required" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const yearNum = parseInt(academicYear, 10);
    const semesterNum = parseInt(semester, 10);

    const activeTerm = await setActiveAcademicTerm(
      yearNum,
      semesterNum,
      budgetYear ? parseInt(budgetYear, 10) : undefined,
      note
    );

    const { currentTerm, terms } = await getEnrichedTerms();

    return NextResponse.json(
      {
        success: true,
        message: `เปลี่ยนภาคเรียนปัจจุบันเป็น: ภาคเรียนที่ ${semesterNum}/${yearNum} สำเร็จ!`,
        currentTerm,
        terms,
        data: activeTerm,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error setting active academic term:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
