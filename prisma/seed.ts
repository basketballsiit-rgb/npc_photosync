import { PrismaClient, UserRole, AlbumType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting NPC_PhotoSync database seed...");

  // 1. Create Core Users
  console.log("Creating administrative & faculty users...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@pvc.ac.th" },
    update: {},
    create: {
      email: "admin@pvc.ac.th",
      name: "นายอรรถกร สารพัดวิทย์",
      role: UserRole.SUPER_ADMIN,
      department: "งานประชาสัมพันธ์",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
    },
  });

  const prUser = await prisma.user.upsert({
    where: { email: "pr.staff@pvc.ac.th" },
    update: {},
    create: {
      email: "pr.staff@pvc.ac.th",
      name: "นางสาวพิมลพรรณ ช่างภาพ",
      role: UserRole.PR_STAFF,
      department: "งานประชาสัมพันธ์",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop",
    },
  });

  const teacherUser1 = await prisma.user.upsert({
    where: { email: "somchai.t@pvc.ac.th" },
    update: {},
    create: {
      email: "somchai.t@pvc.ac.th",
      name: "นายสมชาย วิชาการ",
      role: UserRole.TEACHER,
      department: "แผนกวิชาเทคโนโลยีสารสนเทศ",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    },
  });

  const teacherUser2 = await prisma.user.upsert({
    where: { email: "kanya.m@pvc.ac.th" },
    update: {},
    create: {
      email: "kanya.m@pvc.ac.th",
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
      ownerEmail: "somchai.t@pvc.ac.th",
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
      ownerEmail: "kanya.m@pvc.ac.th",
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
      ownerEmail: "kriengkrai.c@pvc.ac.th",
      projectStatus: "APPROVED",
    },
  });

  console.log(`✅ SmartFlow Projects synced: 3 projects available.`);

  // 3. Seed Realistic Sample Albums
  console.log("Seeding sample albums across classifications...");

  // Album 1: PROJECT - Linked to npc_smartflow PRJ-69-001
  const album1 = await prisma.album.upsert({
    where: { albumCode: "PRJ-6910-001" },
    update: {},
    create: {
      albumCode: "PRJ-6910-001",
      title: "พิธีเปิดและกิจกรรมอบรมเชิงปฏิบัติการ Generative AI สำหรับนักศึกษาสารพัดช่างน่าน",
      description: "ภาพบรรยากาศการอบรมการประยุกต์ใช้ปัญญาประดิษฐ์ในสายวิชาชีพช่างอุตสาหกรรมและพาณิชยกรรม ณ ห้องประชุมสารพัดช่างน่าน 1",
      eventDate: new Date("2026-10-10T09:00:00Z"),
      academicYear: 2569,
      semester: 1,
      albumType: AlbumType.PROJECT,
      projectId: project1.id,
      divisionName: "ฝ่ายวิชาการ",
      departmentName: "แผนกวิชาเทคโนโลยีสารสนเทศ",
      driveFolderId: "mock_drive_folder_prj_001",
      driveFolderUrl: "https://drive.google.com/drive/folders/mock_drive_folder_prj_001",
      drivePathDisplay: "/2569/Semester_1/PROJECT/PRJ-6910-001",
      coverThumbnailUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop",
      photoCount: 2,
      totalSizeBytes: BigInt(8450000), // ~8.45 MB
      viewCount: 42,
      isPublic: true,
      isLineNotified: true,
      uploadedById: prUser.id,
      tags: {
        create: [
          { tagName: "ปัญญาประดิษฐ์" },
          { tagName: "AI" },
          { tagName: "การเรียนการสอน" },
          { tagName: "วิชาการ" },
        ],
      },
      mediaFiles: {
        create: [
          {
            fileName: "NPC_AI_Workshop_01.jpg",
            mimeType: "image/jpeg",
            fileSizeBytes: BigInt(4250000),
            width: 4000,
            height: 2667,
            driveFileId: "mock_drive_file_001",
            thumbnailWebpUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop",
            reportReadyJpgUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1920&auto=format&fit=crop",
            capturedAt: new Date("2026-10-10T09:15:20Z"),
            cameraModel: "Sony Alpha A7 IV",
            aiCaption: "นักศึกษากำลังฝึกปฏิบัติการเขียน Prompt ร่วมกับวิทยากรในห้องปฏิบัติการคอมพิวเตอร์",
            aiTagsJson: JSON.stringify(["นักศึกษา", "คอมพิวเตอร์", "การอบรม", "วิทยาลัย"]),
            isFeatured: true,
            downloadCount: 15,
          },
          {
            fileName: "NPC_AI_Workshop_02.jpg",
            mimeType: "image/jpeg",
            fileSizeBytes: BigInt(4200000),
            width: 4000,
            height: 2667,
            driveFileId: "mock_drive_file_002",
            thumbnailWebpUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop",
            reportReadyJpgUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1920&auto=format&fit=crop",
            capturedAt: new Date("2026-10-10T10:45:10Z"),
            cameraModel: "Sony Alpha A7 IV",
            aiCaption: "ภาพรวมห้องประชุมระหว่างการบรรยายภาคทฤษฎีระบบคลาวด์และปัญญาประดิษฐ์",
            aiTagsJson: JSON.stringify(["ห้องประชุม", "การบรรยาย", "เทคโนโลยี"]),
            isFeatured: false,
            downloadCount: 8,
          },
        ],
      },
    },
  });

  // Album 2: ROUTINE - Daily activity (No project code required)
  const album2 = await prisma.album.upsert({
    where: { albumCode: "RTN-6910-001" },
    update: {},
    create: {
      albumCode: "RTN-6910-001",
      title: "กิจกรรมเคารพธงชาติและอบรมคุณธรรมจริยธรรมยามเช้าหน้าเสาธง",
      description: "คณะครู บุคลากร และนักเรียนนักศึกษา ร่วมกิจกรรมเข้าแถวเคารพธงชาติและสวดมนต์ยามเช้า ประจำสัปดาห์ที่ 2 เดือนตุลาคม 2569",
      eventDate: new Date("2026-10-12T08:00:00Z"),
      academicYear: 2569,
      semester: 1,
      albumType: AlbumType.ROUTINE,
      projectId: null, // Routine has no project linkage
      divisionName: "ฝ่ายพัฒนากิจการนักเรียนนักศึกษา",
      departmentName: "งานกิจกรรมนักเรียนนักศึกษา",
      driveFolderId: "mock_drive_folder_rtn_001",
      driveFolderUrl: "https://drive.google.com/drive/folders/mock_drive_folder_rtn_001",
      drivePathDisplay: "/2569/Semester_1/ROUTINE/RTN-6910-001",
      coverThumbnailUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop",
      photoCount: 1,
      totalSizeBytes: BigInt(3800000),
      viewCount: 29,
      isPublic: true,
      isLineNotified: true,
      uploadedById: prUser.id,
      tags: {
        create: [
          { tagName: "หน้าเสาธง" },
          { tagName: "เคารพธงชาติ" },
          { tagName: "กิจกรรมยามเช้า" },
          { tagName: "คุณธรรมจริยธรรม" },
        ],
      },
      mediaFiles: {
        create: [
          {
            fileName: "NPC_Flag_Ceremony_01.jpg",
            mimeType: "image/jpeg",
            fileSizeBytes: BigInt(3800000),
            width: 4000,
            height: 2667,
            driveFileId: "mock_drive_file_003",
            thumbnailWebpUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop",
            reportReadyJpgUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1920&auto=format&fit=crop",
            capturedAt: new Date("2026-10-12T08:15:00Z"),
            cameraModel: "Canon EOS R6",
            aiCaption: "นักศึกษาร่วมร้องเพลงชาติและรับฟังโอวาทจากผู้อำนวยการวิทยาลัยสารพัดช่างน่าน",
            aiTagsJson: JSON.stringify(["หน้าเสาธง", "ระเบียบวินัย", "เครื่องแบบนักศึกษา"]),
            isFeatured: true,
            downloadCount: 5,
          },
        ],
      },
    },
  });

  // Album 3: ADHOC - Urgent/special event (Can be retroactively linked later)
  const album3 = await prisma.album.upsert({
    where: { albumCode: "ACT-6910-001" },
    update: {},
    create: {
      albumCode: "ACT-6910-001",
      title: "การต้อนรับคณะกรรมการตรวจประเมินสถานศึกษาอาชีวศึกษามาตรฐานสากล",
      description: "คณะผู้บริหารวิทยาลัยสารพัดช่างน่าน ให้การต้อนรับคณะผู้ตรวจราชการกระทรวงศึกษาธิการและคณะกรรมการตรวจประเมิน",
      eventDate: new Date("2026-10-14T10:00:00Z"),
      academicYear: 2569,
      semester: 1,
      albumType: AlbumType.ADHOC,
      projectId: null, // Initially unlinked; supports retroactive linking in Phase 4
      divisionName: "ฝ่ายบริหารทรัพยากร",
      departmentName: "งานประชาสัมพันธ์",
      driveFolderId: "mock_drive_folder_act_001",
      driveFolderUrl: "https://drive.google.com/drive/folders/mock_drive_folder_act_001",
      drivePathDisplay: "/2569/Semester_1/ADHOC/ACT-6910-001",
      coverThumbnailUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop",
      photoCount: 1,
      totalSizeBytes: BigInt(5100000),
      viewCount: 65,
      isPublic: true,
      isLineNotified: false,
      uploadedById: adminUser.id,
      tags: {
        create: [
          { tagName: "ตรวจประเมิน" },
          { tagName: "ผู้บริหาร" },
          { tagName: "วาระเร่งด่วน" },
        ],
      },
      mediaFiles: {
        create: [
          {
            fileName: "NPC_Evaluation_2026_01.jpg",
            mimeType: "image/jpeg",
            fileSizeBytes: BigInt(5100000),
            width: 4000,
            height: 2667,
            driveFileId: "mock_drive_file_004",
            thumbnailWebpUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop",
            reportReadyJpgUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1920&auto=format&fit=crop",
            capturedAt: new Date("2026-10-14T10:30:00Z"),
            cameraModel: "Sony Alpha A7 IV",
            aiCaption: "คณะผู้บริหารร่วมถ่ายภาพเป็นที่ระลึกกับคณะกรรมการตรวจราชการ ณ ห้องเกียรติยศ",
            aiTagsJson: JSON.stringify(["ผู้บริหาร", "การประชุม", "ตรวจราชการ"]),
            isFeatured: true,
            downloadCount: 12,
          },
        ],
      },
    },
  });

  // Album 4: PORTFOLIO - College PR asset repository
  const album4 = await prisma.album.upsert({
    where: { albumCode: "AST-6910-001" },
    update: {},
    create: {
      albumCode: "AST-6910-001",
      title: "ชุดภาพถ่ายมุมสูงและภูมิทัศน์วิทยาลัยสารพัดช่างน่าน ฤดูฝน 2569",
      description: "ภาพมุมสูงทางอากาศ (Drone Aerial Photography) บริเวณอาคารอำนวยการ อาคารปฏิบัติการ และทัศนียภาพรอบวิทยาลัยสารพัดช่างน่าน",
      eventDate: new Date("2026-10-01T07:30:00Z"),
      academicYear: 2569,
      semester: 1,
      albumType: AlbumType.PORTFOLIO,
      projectId: null,
      divisionName: "ฝ่ายบริหารทรัพยากร",
      departmentName: "งานประชาสัมพันธ์",
      driveFolderId: "mock_drive_folder_ast_001",
      driveFolderUrl: "https://drive.google.com/drive/folders/mock_drive_folder_ast_001",
      drivePathDisplay: "/2569/Semester_1/PORTFOLIO/AST-6910-001",
      coverThumbnailUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop",
      photoCount: 1,
      totalSizeBytes: BigInt(7200000),
      viewCount: 110,
      isPublic: true,
      isLineNotified: true,
      uploadedById: adminUser.id,
      tags: {
        create: [
          { tagName: "ภาพมุมสูง" },
          { tagName: "อาคารสถานที่" },
          { tagName: "PRวิทยาลัย" },
          { tagName: "โดรน" },
        ],
      },
      mediaFiles: {
        create: [
          {
            fileName: "NPC_Campus_Drone_01.jpg",
            mimeType: "image/jpeg",
            fileSizeBytes: BigInt(7200000),
            width: 5464,
            height: 3640,
            driveFileId: "mock_drive_file_005",
            thumbnailWebpUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop",
            reportReadyJpgUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&auto=format&fit=crop",
            capturedAt: new Date("2026-10-01T07:45:00Z"),
            cameraModel: "DJI Mavic 3 Pro",
            aiCaption: "ทัศนียภาพมุมสูงอาคารอำนวยการและแปลงสาธิตการเกษตรท่ามกลางสายหมอกเมืองน่าน",
            aiTagsJson: JSON.stringify(["โดรน", "อาคาร", "ธรรมชาติ", "เมืองน่าน"]),
            isFeatured: true,
            downloadCount: 34,
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded 4 sample albums:`);
  console.log(`   - [${album1.albumType}] ${album1.albumCode}: ${album1.title}`);
  console.log(`   - [${album2.albumType}] ${album2.albumCode}: ${album2.title}`);
  console.log(`   - [${album3.albumType}] ${album3.albumCode}: ${album3.title}`);
  console.log(`   - [${album4.albumType}] ${album4.albumCode}: ${album4.title}`);

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
