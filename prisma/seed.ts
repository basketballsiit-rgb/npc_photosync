import { PrismaClient, UserRole, AlbumType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting NPC_PhotoSync database seed...");

  // 1. Create Core Users
  console.log("Creating administrative & faculty users...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@npc.ac.th" },
    update: {},
    create: {
      email: "admin@npc.ac.th",
      name: "นายอรรถกร สารพัดวิทย์",
      role: UserRole.SUPER_ADMIN,
      department: "งานประชาสัมพันธ์",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
    },
  });

  const prUser = await prisma.user.upsert({
    where: { email: "pr.staff@npc.ac.th" },
    update: {},
    create: {
      email: "pr.staff@npc.ac.th",
      name: "นางสาวพิมลพรรณ ช่างภาพ",
      role: UserRole.PR_STAFF,
      department: "งานประชาสัมพันธ์",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop",
    },
  });

  const teacherUser1 = await prisma.user.upsert({
    where: { email: "somchai.t@npc.ac.th" },
    update: {},
    create: {
      email: "somchai.t@npc.ac.th",
      name: "นายสมชาย วิชาการ",
      role: UserRole.TEACHER,
      department: "แผนกวิชาเทคโนโลยีสารสนเทศ",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    },
  });

  const teacherUser2 = await prisma.user.upsert({
    where: { email: "kanya.m@npc.ac.th" },
    update: {},
    create: {
      email: "kanya.m@npc.ac.th",
      name: "นางสาวกัญญา พัฒนกิจ",
      role: UserRole.TEACHER,
      department: "งานกิจกรรมนักเรียนนักศึกษา",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop",
    },
  });

  console.log(`✅ Users verified: 4 users active.`);

  // 2. Create Sample SmartFlow Projects (from npc_smartflow)
  console.log("Syncing sample npc_smartflow projects...");
  const project1 = await prisma.smartFlowProject.upsert({
    where: { projectCode: "PRJ-69-001" },
    update: {},
    create: {
      smartflowId: "SF-2569-00101",
      projectCode: "PRJ-69-001",
      projectName: "โครงการอบรมเชิงปฏิบัติการพัฒนาทักษะปัญญาประดิษฐ์ (AI) เพื่อวิชาชีพสู่อนาคต",
      academicYear: 2569,
      budgetYear: 2569,
      divisionName: "ฝ่ายวิชาการ",
      departmentName: "แผนกวิชาเทคโนโลยีสารสนเทศ",
      ownerTeacherName: "นายสมชาย วิชาการ",
      ownerEmail: "somchai.t@npc.ac.th",
      projectStatus: "APPROVED",
    },
  });

  const project2 = await prisma.smartFlowProject.upsert({
    where: { projectCode: "PRJ-69-002" },
    update: {},
    create: {
      smartflowId: "SF-2569-00102",
      projectCode: "PRJ-69-002",
      projectName: "โครงการสืบสานประเพณีแข่งเรือเมืองน่านและพัฒนาจิตอาสาชุมชน",
      academicYear: 2569,
      budgetYear: 2569,
      divisionName: "ฝ่ายพัฒนากิจการนักเรียนนักศึกษา",
      departmentName: "งานกิจกรรมนักเรียนนักศึกษา",
      ownerTeacherName: "นางสาวกัญญา พัฒนกิจ",
      ownerEmail: "kanya.m@npc.ac.th",
      projectStatus: "APPROVED",
    },
  });

  const project3 = await prisma.smartFlowProject.upsert({
    where: { projectCode: "PRJ-69-003" },
    update: {},
    create: {
      smartflowId: "SF-2569-00103",
      projectCode: "PRJ-69-003",
      projectName: "โครงการศูนย์ซ่อมสร้างเพื่อชุมชน (Fix It Center) ประจำปีงบประมาณ 2569",
      academicYear: 2569,
      budgetYear: 2569,
      divisionName: "ฝ่ายแผนงานและความร่วมมือ",
      departmentName: "งานโครงการพิเศษและบริการวิชาชีพ",
      ownerTeacherName: "นายเกรียงไกร ช่างยนต์",
      ownerEmail: "kriengkrai.c@npc.ac.th",
      projectStatus: "APPROVED",
    },
  });

  console.log(`✅ SmartFlow Projects synced: 3 projects available.`);

  // 3. Clean up any existing sample albums to maintain clean state
  await prisma.album.deleteMany({
    where: {
      OR: [
        {
          albumCode: {
            in: [
              "PRJ-6910-001",
              "PRJ-6910-002",
              "RTN-6910-001",
              "ACT-6910-001",
              "AST-6910-001",
              "AST-6909-001",
            ],
          },
        },
        { driveFolderId: { startsWith: "mock_drive_" } },
      ],
    },
  });

  console.log("🎉 Database initialization completed successfully (Clean state without sample albums)!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
