import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  try {
    const albums = await prisma.album.findMany({
      include: {
        project: { select: { projectCode: true, projectName: true } },
      },
      orderBy: { eventDate: "asc" },
    });

    const reportRows = albums.map((a, index) => {
      const d = new Date(a.eventDate);
      const thaiYear = d.getFullYear() + 543;
      const thaiMonth = d.toLocaleDateString("th-TH", { month: "long" });

      return {
        itemNo: index + 1,
        albumCode: a.albumCode,
        title: a.title,
        eventDate: `${d.getDate()} ${thaiMonth} ${thaiYear}`,
        academicYear: a.academicYear,
        semester: a.semester,
        albumType: a.albumType,
        projectCode: a.project?.projectCode || "-",
        divisionName: a.divisionName,
        departmentName: a.departmentName || "-",
        photoCount: a.photoCount,
        drivePathDisplay: a.drivePathDisplay || "-",
        isPublic: a.isPublic ? "เผยแพร่สาธารณะ" : "ภายในวิทยาลัย",
      };
    });

    if (format === "csv") {
      const headers = [
        "ลำดับ",
        "รหัสอัลบั้ม",
        "ชื่อกิจกรรม/งาน",
        "วันที่จัด",
        "ปีการศึกษา",
        "ภาคเรียน",
        "ประเภทกิจกรรม",
        "รหัสโครงการ SmartFlow",
        "ฝ่ายที่รับผิดชอบ",
        "แผนกวิชา/งาน",
        "จำนวนรูปภาพ",
        "เส้นทาง Google Drive",
        "สถานะเผยแพร่",
      ];

      const csvLines = [
        "\uFEFF" + headers.join(","), // UTF-8 BOM for Excel in Thai
        ...reportRows.map((r) =>
          [
            r.itemNo,
            `"${r.albumCode}"`,
            `"${r.title.replace(/"/g, '""')}"`,
            `"${r.eventDate}"`,
            r.academicYear,
            r.semester,
            `"${r.albumType}"`,
            `"${r.projectCode}"`,
            `"${r.divisionName}"`,
            `"${r.departmentName}"`,
            r.photoCount,
            `"${r.drivePathDisplay}"`,
            `"${r.isPublic}"`,
          ].join(",")
        ),
      ];

      return new NextResponse(csvLines.join("\r\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="NPC_PhotoSync_PR_Performance_Report_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      totalActivities: reportRows.length,
      totalPhotos: reportRows.reduce((sum, r) => sum + r.photoCount, 0),
      rows: reportRows,
    });
  } catch (error) {
    console.error("Error generating PR report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
