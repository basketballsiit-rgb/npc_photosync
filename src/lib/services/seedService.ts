import prisma from "@/lib/prisma";
import { UserRole, AlbumType } from "@prisma/client";

/**
 * Ensures baseline seed data exists (Users, SmartFlow Projects, Academic Terms, and Initial Albums)
 * Called automatically when album count is 0 to prevent an empty blank system on first deploy.
 */
export async function ensureSeedData() {
  try {
    const existingCount = await prisma.album.count();
    if (existingCount > 0) return;

    console.log("🌱 Auto-seeding initial NPC_PhotoSync albums and projects...");

    // 1. Users
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

    // 2. SmartFlow Projects
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

    // 3. Realistic Sample Albums for Year 2569
    // Album 1: PROJECT (Semester 2/2569 - Recent)
    await prisma.album.upsert({
      where: { albumCode: "PRJ-6910-002" },
      update: {},
      create: {
        albumCode: "PRJ-6910-002",
        title: "กิจกรรม Fix It Center จิตอาสาช่วยผู้ประสบภัยและพัฒนาชุมชน จ.น่าน",
        description: "ศูนย์ซ่อมสร้างเพื่อชุมชน ออกให้บริการซ่อมแซมเครื่องใช้ไฟฟ้าและยานพาหนะให้แก่ประชาชนในพื้นที่ประสบอุทกภัย ณ เทศบาลเมืองน่าน",
        eventDate: new Date("2026-10-18T09:00:00Z"),
        academicYear: 2569,
        semester: 2,
        albumType: AlbumType.PROJECT,
        projectId: project3.id,
        divisionName: "ฝ่ายแผนงานและความร่วมมือ",
        departmentName: "งานโครงการพิเศษและบริการวิชาชีพ",
        driveFolderId: "mock_drive_folder_prj_002",
        driveFolderUrl: "https://drive.google.com/drive/folders/mock_drive_folder_prj_002",
        drivePathDisplay: "/2569/Semester_2/PROJECT/PRJ-6910-002",
        coverThumbnailUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop",
        photoCount: 3,
        totalSizeBytes: BigInt(9850000),
        viewCount: 38,
        isPublic: true,
        isLineNotified: true,
        uploadedById: prUser.id,
        tags: {
          create: [
            { tagName: "Fix It Center" },
            { tagName: "บริการชุมชน" },
            { tagName: "จิตอาสา" },
            { tagName: "ซ่อมบำรุง" },
          ],
        },
        mediaFiles: {
          create: [
            {
              fileName: "NPC_FixIt_01.jpg",
              mimeType: "image/jpeg",
              fileSizeBytes: BigInt(3450000),
              width: 4000,
              height: 2667,
              thumbnailWebpUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop",
              reportReadyJpgUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1920&auto=format&fit=crop",
              capturedAt: new Date("2026-10-18T09:15:00Z"),
              cameraModel: "Sony Alpha A7 IV",
              aiCaption: "นักศึกษาแผนกวิชาช่างไฟฟ้าและช่างยนต์กำลังให้บริการซ่อมแซมเครื่องใช้ไฟฟ้าแก่ชาวบ้าน",
              aiTagsJson: JSON.stringify(["นักศึกษา", "การซ่อม", "เครื่องมือช่าง", "บริการชุมชน"]),
              isFeatured: true,
              downloadCount: 14,
            },
            {
              fileName: "NPC_FixIt_02.jpg",
              mimeType: "image/jpeg",
              fileSizeBytes: BigInt(3200000),
              width: 4000,
              height: 2667,
              thumbnailWebpUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop",
              reportReadyJpgUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1920&auto=format&fit=crop",
              capturedAt: new Date("2026-10-18T10:30:00Z"),
              cameraModel: "Sony Alpha A7 IV",
              aiCaption: "อาจารย์ผู้ควบคุมกำลังสาธิตการตรวจเช็ควงจรไฟฟ้าให้นักศึกษาฝึกงาน",
              aiTagsJson: JSON.stringify(["ครูผู้สอน", "การฝึกทักษะ", "ความปลอดภัย"]),
              isFeatured: false,
              downloadCount: 6,
            },
          ],
        },
      },
    });

    // Album 2: PROJECT (Semester 1/2569)
    await prisma.album.upsert({
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
        totalSizeBytes: BigInt(8450000),
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
              thumbnailWebpUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop",
              reportReadyJpgUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1920&auto=format&fit=crop",
              capturedAt: new Date("2026-10-10T09:15:20Z"),
              cameraModel: "Sony Alpha A7 IV",
              aiCaption: "นักศึกษากำลังฝึกปฏิบัติการเขียน Prompt ร่วมกับวิทยากรในห้องปฏิบัติการคอมพิวเตอร์",
              aiTagsJson: JSON.stringify(["นักศึกษา", "คอมพิวเตอร์", "การอบรม", "วิทยาลัย"]),
              isFeatured: true,
              downloadCount: 15,
            },
          ],
        },
      },
    });

    // Album 3: ROUTINE (Semester 1/2569)
    await prisma.album.upsert({
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
        projectId: null,
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
              thumbnailWebpUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop",
              reportReadyJpgUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1920&auto=format&fit=crop",
              capturedAt: new Date("2026-10-12T08:15:00Z"),
              cameraModel: "Canon EOS R6",
              aiCaption: "นักศึกษาร่วมร้องเพลงชาติและรับฟังโอวาทจากผู้อำนวยการวิทยาลัยสารพัดช่างน่าน",
              aiTagsJson: JSON.stringify(["หน้าเสาธง", "ระเบียบวินัย"]),
              isFeatured: true,
              downloadCount: 5,
            },
          ],
        },
      },
    });

    // Album 4: ADHOC (Semester 1/2569)
    await prisma.album.upsert({
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
        projectId: null,
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
              thumbnailWebpUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop",
              reportReadyJpgUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1920&auto=format&fit=crop",
              capturedAt: new Date("2026-10-14T10:30:00Z"),
              cameraModel: "Sony Alpha A7 IV",
              aiCaption: "คณะผู้บริหารร่วมถ่ายภาพเป็นที่ระลึกกับคณะกรรมการตรวจราชการ ณ ห้องเกียรติยศ",
              aiTagsJson: JSON.stringify(["ผู้บริหาร", "การประชุม"]),
              isFeatured: true,
              downloadCount: 12,
            },
          ],
        },
      },
    });

    console.log("✅ Auto-seeded initial NPC_PhotoSync albums successfully!");
  } catch (error) {
    console.warn("Auto-seed error (non-fatal):", error);
  }
}
