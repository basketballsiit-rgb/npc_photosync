import { AlbumType, PrismaClient } from "@prisma/client";

/**
 * Organizational structure of Nan Polytechnic College (วิทยาลัยสารพัดช่างน่าน)
 */
export const NPC_DIVISIONS = [
  "ฝ่ายบริหารทรัพยากร",
  "ฝ่ายยุทธศาสตร์และแผนงาน",
  "ฝ่ายกิจการนักเรียนนักศึกษา",
  "ฝ่ายวิชาการ",
] as const;

export type NpcDivision = (typeof NPC_DIVISIONS)[number];

export const NPC_DEPARTMENTS = [
  "แผนกวิชาช่างยนต์",
  "แผนกวิชาช่างไฟฟ้ากำลัง",
  "แผนกวิชาช่างอิเล็กทรอนิกส์",
  "แผนกวิชาเทคโนโลยีสารสนเทศ",
  "แผนกวิชาคอมพิวเตอร์ธุรกิจ",
  "แผนกวิชาการบัญชี",
  "แผนกวิชาการตลาด",
  "แผนกวิชาคหกรรมศาสตร์",
  "แผนกวิชาการโรงแรมและการท่องเที่ยว",
  "แผนกวิชาสามัญสัมพันธ์",
  "งานศูนย์ดิจิทัลและสื่อสารองค์กร",
  "งานประชาสัมพันธ์",
  "งานกิจกรรมนักเรียนนักศึกษา",
  "งานโครงการพิเศษและบริการวิชาชีพ",
] as const;

export type NpcDepartment = (typeof NPC_DEPARTMENTS)[number];

/**
 * Album type code prefix mapping
 * - PROJECT   -> PRJ (โครงการตามแผนปฏิบัติราชการ/smartflow)
 * - ROUTINE   -> RTN (กิจกรรมประจำวัน/เข้าแถว/จัดการเรียนการสอน)
 * - ADHOC     -> ACT (กิจกรรมเร่งด่วน/เฉพาะกิจ)
 * - PORTFOLIO -> AST (คลังภาพ PR วิทยาลัย/อาคาร/บุคลากร)
 */
export const ALBUM_TYPE_PREFIX_MAP: Record<AlbumType, string> = {
  [AlbumType.PROJECT]: "PRJ",
  [AlbumType.ROUTINE]: "RTN",
  [AlbumType.ADHOC]: "ACT",
  [AlbumType.PORTFOLIO]: "AST",
};

export interface AcademicTermInfo {
  academicYear: number; // Thai Buddhist Year (พ.ศ.), e.g., 2569
  semester: number;     // 1, 2, or 3 (Summer)
  budgetYear: number;   // Thai Fiscal Year (ต.ค. - ก.ย. พ.ศ.), e.g., 2569
}

/**
 * Calculates Thai Buddhist Academic Year, Semester, and Fiscal/Budget Year
 * based on the Vocational Education Commission standard:
 * - Semester 1: 16 May – 15 October (Academic Year = CE + 543)
 * - Semester 2: 16 October – 31 March (Jan-Mar still belongs to previous Academic Year)
 * - Semester 3 (Summer): 1 April – 15 May (Belongs to previous Academic Year)
 * - Budget Year (ปีงบประมาณ): 1 October – 30 September (starts in Oct of prior CE)
 *
 * @param date Event or target date
 */
export function getAcademicTermInfo(date: Date = new Date()): AcademicTermInfo {
  const d = new Date(date);
  const ceYear = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();

  let academicYear: number;
  let semester: number;

  if (month > 5 || (month === 5 && day >= 16)) {
    if (month < 10 || (month === 10 && day <= 15)) {
      // 16 May - 15 October -> Semester 1
      academicYear = ceYear + 543;
      semester = 1;
    } else {
      // 16 October - 31 December -> Semester 2
      academicYear = ceYear + 543;
      semester = 2;
    }
  } else if (month >= 1 && month <= 3) {
    // 1 January - 31 March -> Semester 2 of previous Academic Year
    academicYear = ceYear - 1 + 543;
    semester = 2;
  } else if (month === 4 || (month === 5 && day < 16)) {
    // 1 April - 15 May -> Semester 3 (Summer Term) of previous Academic Year
    academicYear = ceYear - 1 + 543;
    semester = 3;
  } else {
    // Fallback
    academicYear = ceYear + 543;
    semester = 1;
  }

  // Thai Budget Year: 1 October - 30 September
  // E.g., Oct 2025 - Sep 2026 is Budget Year 2569
  const budgetYear = month >= 10 ? ceYear + 1 + 543 : ceYear + 543;

  return {
    academicYear,
    semester,
    budgetYear,
  };
}

/**
 * Format Year-Month token based on Thai Buddhist Year last 2 digits + 2-digit month
 * e.g., Oct 2569 -> '6910'
 */
export function getYearMonthCode(date: Date = new Date()): string {
  const d = new Date(date);
  const { academicYear } = getAcademicTermInfo(d);
  const yy = String(academicYear).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

/**
 * Pure formatter for Album Code
 * @example formatAlbumCode(AlbumType.PROJECT, new Date('2026-10-15'), 1) => 'PRJ-6910-001'
 */
export function formatAlbumCode(
  albumType: AlbumType,
  date: Date,
  sequenceNumber: number
): string {
  const prefix = ALBUM_TYPE_PREFIX_MAP[albumType] || "ACT";
  const ym = getYearMonthCode(date);
  const seq = String(sequenceNumber).padStart(3, "0");
  return `${prefix}-${ym}-${seq}`;
}

/**
 * Computes the target Google Shared Drive hierarchical directory path
 * Pattern: `/{academicYear}/Semester_{semester}/{albumType}/{albumCode}`
 * @example `/2569/Semester_1/PROJECT/PRJ-6910-001`
 */
export function getGoogleDriveFolderPath(
  academicYear: number,
  semester: number,
  albumType: AlbumType,
  albumCode: string
): string {
  return `/${academicYear}/Semester_${semester}/${albumType}/${albumCode}`;
}

/**
 * Generates the next unique sequential Album Code from database
 * Checks existing album codes matching `${prefix}-${ym}-%` and increments sequence by 1.
 */
export async function generateNextAlbumCode(
  albumType: AlbumType,
  date: Date = new Date(),
  prismaClient?: PrismaClient
): Promise<string> {
  const prefix = ALBUM_TYPE_PREFIX_MAP[albumType];
  const ym = getYearMonthCode(date);
  const searchPattern = `${prefix}-${ym}-`;

  if (!prismaClient) {
    const { prisma } = await import("@/lib/prisma");
    prismaClient = prisma;
  }

  const latestAlbum = await prismaClient.album.findFirst({
    where: {
      albumCode: {
        startsWith: searchPattern,
      },
    },
    orderBy: {
      albumCode: "desc",
    },
    select: {
      albumCode: true,
    },
  });

  let nextSequence = 1;
  if (latestAlbum?.albumCode) {
    const parts = latestAlbum.albumCode.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSequence = lastNum + 1;
    }
  }

  return formatAlbumCode(albumType, date, nextSequence);
}

export interface AcademicTermRecord {
  id: string;
  academicYear: number;
  semester: number;
  budgetYear: number;
  isCurrent: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  note?: string | null;
}

/**
 * Get the currently active Academic Term configured by administrator
 * Falls back to automatic date calculation if no term is marked as current
 */
export async function getCurrentConfiguredTerm(
  prismaClient?: PrismaClient
): Promise<AcademicTermInfo & { id?: string; isConfigured: boolean }> {
  if (!prismaClient) {
    const { prisma } = await import("@/lib/prisma");
    prismaClient = prisma;
  }

  try {
    const currentTerm = await prismaClient.academicTerm.findFirst({
      where: { isCurrent: true },
    });

    if (currentTerm) {
      return {
        academicYear: currentTerm.academicYear,
        semester: currentTerm.semester,
        budgetYear: currentTerm.budgetYear,
        id: currentTerm.id,
        isConfigured: true,
      };
    }
  } catch (err) {
    console.warn("Could not query current AcademicTerm, falling back to calendar calculation:", err);
  }

  const fallback = getAcademicTermInfo(new Date());
  return {
    ...fallback,
    isConfigured: false,
  };
}

/**
 * Set an academic term as the current active semester
 */
export async function setActiveAcademicTerm(
  academicYear: number,
  semester: number,
  budgetYear?: number,
  note?: string,
  prismaClient?: PrismaClient
): Promise<AcademicTermRecord> {
  if (!prismaClient) {
    const { prisma } = await import("@/lib/prisma");
    prismaClient = prisma;
  }

  const finalBudgetYear = budgetYear || academicYear;

  // Transaction: mark all other terms isCurrent = false, then upsert target as isCurrent = true
  return await prismaClient.$transaction(async (tx) => {
    await tx.academicTerm.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    return await tx.academicTerm.upsert({
      where: {
        academicYear_semester: {
          academicYear,
          semester,
        },
      },
      update: {
        isCurrent: true,
        budgetYear: finalBudgetYear,
        ...(note !== undefined && note.trim() !== "" ? { note } : {}),
      },
      create: {
        academicYear,
        semester,
        budgetYear: finalBudgetYear,
        isCurrent: true,
        note: note || undefined,
      },
    });
  });
}

