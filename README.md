# NPC_PhotoSync (วิทยาลัยสารพัดช่างน่าน)

**Digital Asset Management (DAM) & Smart PR Cloud Synchronization Web Application**  
ระบบคลังภาพดิจิทัลอัจฉริยะสำหรับ **วิทยาลัยสารพัดช่างน่าน (Nan Polytechnic College)** ออกแบบตามแนวคิด **"Upload Once, Sync Everywhere"** จัดเก็บต้นฉบับคมชัดสูง 100% บน Google Shared Drive และซิงโครไนซ์ภาพถ่ายพร้อมคำบรรยาย AI เข้าสู่ระบบรายงานสรุปโครงการ 5 บท **`npc_smartflow`** แบบสองทางอัตโนมัติ

---

## 🌟 จุดเด่นของระบบ (Key Highlights)

1. **4 การจำแนกกิจกรรมวิทยาลัย (Activity Classification):**
   - `PROJECT`: กิจกรรมโครงการตามแผนปฏิบัติการ (เชื่อมรหัสโครงการ SmartFlow สำหรับออกรายงาน 5 บท)
   - `ROUTINE`: กิจกรรมประจำวัน/เข้าแถวหน้าเสาธง/การจัดการเรียนการสอน (ไม่ต้องใช้รหัสโครงการ)
   - `ADHOC`: กิจกรรมเฉพาะกิจ/เร่งด่วน (รองรับการ **ผูกโครงการย้อนหลัง** ได้ในคลิกเดียว)
   - `PORTFOLIO`: คลังภาพประชาสัมพันธ์, ภาพมุมสูงโดรน, อาคารสถานที่ และบุคลากร
2. **รหัสอัลบั้มและโฟลเดอร์อัตโนมัติ (Intelligent Auto-Naming):**
   - รหัสอัลบั้มเรียงลำดับอัตโนมัติ: `PRJ-6910-001`, `RTN-6910-001`, `ACT-6910-001`, `AST-6910-001`
   - คำนวณปีการศึกษาไทย (พ.ศ. 2569) และภาคเรียน (1, 2, 3) จากวันที่จัดกิจกรรมอัตโนมัติ
   - จัดระเบียบโฟลเดอร์ Google Shared Drive อัตโนมัติ:
     `/[academicYear]/01_โครงการตามแผน/[albumCode]` หรือ `/[academicYear]/02_งานประจำและทั่วไป/[albumCode]`
3. **ระบบจัดเก็บสองระดับ (Dual-Layer Storage Architecture):**
   - **Google Shared Drive (Service Account)**: เก็บไฟล์ต้นฉบับคมชัดสูง 100% ไม่บีบอัด
   - **Sharp Image Pipeline**: แปลงภาพย่อ Thumbnail WebP (~600px, ~50KB) และภาพสำหรับรายงาน 5 บท Report-Ready HD JPG (~1920px, ~300KB) สำหรับฝังในเอกสาร Word/PDF
4. **AI Vision Auto-Tagging (Gemini 1.5 Flash):**
   - วิเคราะห์ภาพถ่ายสร้างคำบรรยายภาษาไทยทางการสำหรับใส่ใต้ภาพในภาคผนวกรายงาน 5 บท และแท็กกิจกรรม 3-5 คำอัตโนมัติ
5. **LINE Flex Message Notification:**
   - ส่งการ์ดแจ้งเตือนกิจกรรมใหม่เข้ากลุ่ม LINE วิทยาลัยทันทีที่อัปโหลดเสร็จสิ้น
6. **Smart Download (3 Resolution Options):**
   - 💎 **ต้นฉบับ (Original)**: สำหรับงานไวนิล ป้าย พิมพ์ขนาดใหญ่
   - 📄 **รายงาน 5 บท (Full HD 1920px ~300KB)**: เหมาะสำหรับ Word/Docs/SmartFlow
   - 🏷️ **พร้อมโพสต์ประชาสัมพันธ์ (Watermarked)**: ประทับตราสัญลักษณ์วิทยาลัยสารพัดช่างน่านอัตโนมัติ

---

## 🛠️ สถาปัตยกรรมเทคโนโลยี (Tech Stack)

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database & ORM**: MySQL (ผ่าน Prisma ORM v6 with BigInt Serialization Patch)
- **Styling**: Tailwind CSS (Modern Deep Navy `#0F172A` & Electric Cyan `#06B6D4`)
- **Cloud Storage**: Google Drive API v3 (Shared Drives with Service Account)
- **Image Processing**: `sharp`, `exif-reader`, `archiver`
- **AI Vision**: `@google/generative-ai` (Gemini 1.5 Flash)
- **Messaging**: LINE Messaging API (Flex Message)

---

## 🚀 ขั้นตอนการติดตั้งและเริ่มใช้งาน (Quick Start)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าไฟล์สภาพแวดล้อม (`.env`)
คัดลอกไฟล์ต้นแบบและกำหนดค่า:
```bash
copy .env.example .env
```
ตรวจสอบค่าคอนฟิกสำคัญ:
- `DATABASE_URL`: `mysql://root:@localhost:3306/npc_photosync` (รองรับ XAMPP MySQL ทันที)
- `PHOTOSYNC_API_KEY`: คีย์สำหรับยืนยันตัวตนในการเชื่อมต่อกับ `npc_smartflow`

### 3. สร้างและซิงค์ฐานข้อมูล (Prisma)
สร้างโครงสร้างตารางบน MySQL:
```bash
npx prisma db push
```

### 4. นำเข้าข้อมูลเริ่มต้น (Seed Data)
นำเข้าข้อมูลฝ่าย แผนกวิชา ผู้ใช้งาน โครงการ SmartFlow และอัลบั้มตัวอย่าง:
```bash
npx prisma db seed
```

### 5. รันเซิร์ฟเวอร์สำหรับพัฒนา (Development Server)
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: [http://localhost:3000](http://localhost:3000)

---

## 🔗 การเชื่อมต่อระบบสองทางกับ `npc_smartflow` (Two-Way Integration Guide)

ระบบรองรับการเชื่อมต่อกับระบบรายงานโครงการ **`npc_smartflow`** ผ่าน Secured REST APIs โดยส่ง Header:
```http
X-PhotoSync-Api-Key: photosync-api-key-live-nan-polytechnic-college
```

### 1. ดึงภาพถ่ายและคำบรรยาย AI สำหรับใส่ในรายงาน 5 บท
```http
GET /api/v1/media/by-project/{projectCode}
```
**ตัวอย่างการเรียก:**
`GET /api/v1/media/by-project/PRJ-69-001`

**ผลลัพธ์ JSON:**
```json
{
  "success": true,
  "data": {
    "project": {
      "projectCode": "PRJ-69-001",
      "projectName": "โครงการอบรมเชิงปฏิบัติการพัฒนาทักษะปัญญาประดิษฐ์ (AI)",
      "divisionName": "ฝ่ายวิชาการ"
    },
    "albums": [
      {
        "albumCode": "PRJ-6910-001",
        "title": "พิธีเปิดและกิจกรรมอบรมเชิงปฏิบัติการ Generative AI",
        "driveFolderUrl": "https://drive.google.com/drive/folders/...",
        "photos": [
          {
            "id": "media_01",
            "fileName": "NPC_AI_Workshop_01.jpg",
            "aiCaption": "นักศึกษากำลังฝึกปฏิบัติการเขียน Prompt ร่วมกับวิทยากร...",
            "reportReadyJpgUrl": "http://localhost:3000/api/v1/image-proxy/media_01?type=report",
            "thumbnailWebpUrl": "http://localhost:3000/api/v1/image-proxy/media_01?type=thumb",
            "watermarkJpgUrl": "http://localhost:3000/api/v1/image-proxy/media_01?type=watermark",
            "originalDownloadUrl": "http://localhost:3000/api/v1/image-proxy/media_01?type=original"
          }
        ]
      }
    ]
  }
}
```

### 2. Image Streaming Proxy (ป้องกันปัญหา CORS ในการสร้าง Word/PDF)
ระบบ `npc_smartflow` สามารถดึงภาพไปแทรกใน PDF หรือ Word ได้โดยตรงผ่าน:
- ภาพรายงาน Full HD (~300KB): `/api/v1/image-proxy/{mediaId}?type=report`
- ภาพย่อ Thumbnail WebP: `/api/v1/image-proxy/{mediaId}?type=thumb`
- ภาพประทับลายน้ำ PR: `/api/v1/image-proxy/{mediaId}?type=watermark`
- ภาพต้นฉบับ 100%: `/api/v1/image-proxy/{mediaId}?type=original`

### 3. ค้นหาอัลบั้มที่ยังไม่ได้ผูกโครงการ (Unlinked Albums)
```http
GET /api/v1/albums/unlinked?q=แข่งเรือ&academicYear=2569
```

### 4. ผูกโครงการย้อนหลัง (Retroactive Project Linking)
เมื่อครูต้องการนำอัลบั้มงานทั่วไปหรือกิจกรรมเร่งด่วนมาผูกกับโครงการ:
```http
PATCH /api/v1/albums/{albumCode}/link-project
Content-Type: application/json

{
  "projectCode": "PRJ-69-001"
}
```
*ระบบจะเปลี่ยนประเภทเป็น `PROJECT` อัตโนมัติ และย้ายโฟลเดอร์ใน Google Drive ไปยัง `/01_โครงการตามแผน` พร้อมส่ง Webhook แจ้งเตือนกลับไปยัง `npc_smartflow` ทันที*

### 5. SmartFlow Push โครงการที่อนุมัติใหม่เข้ามายัง PhotoSync
```http
POST /api/v1/sync/projects
Content-Type: application/json

{
  "smartflowId": "SF-2569-00104",
  "projectCode": "PRJ-69-004",
  "projectName": "โครงการส่งเสริมคุณธรรมจริยธรรมนักศึกษาอาชีวศึกษา",
  "academicYear": 2569,
  "divisionName": "ฝ่ายพัฒนากิจการนักเรียนนักศึกษา",
  "ownerTeacherName": "นางสาวกัญญา พัฒนกิจ",
  "ownerEmail": "kanya.m@npc.ac.th"
}
```

---

## 🏛️ โครงสร้างไฟล์ในระบบ (Directory Structure)

```
npc_photosync/
├── prisma/
│   ├── schema.prisma             # โครงสร้างฐานข้อมูล MySQL พร้อม BigInt
│   └── seed.ts                   # สคริปต์จำลองข้อมูลวิทยาลัยสารพัดช่างน่าน
├── public/
│   ├── assets/
│   │   └── npc-watermark.png     # ตราสัญลักษณ์ลายน้ำวิทยาลัย
│   └── uploads/                  # แคชไฟล์ภาพ WebP และ HD Report
├── src/
│   ├── app/
│   │   ├── page.tsx              # หน้าค้นหาและแสดงคลังภาพหลัก (Discovery Grid)
│   │   ├── layout.tsx            # โครงสร้างหลักและฟอนต์ภาษาไทย Kanit
│   │   ├── globals.css           # โทนสี Deep Navy & Electric Cyan
│   │   ├── albums/[albumCode]/   # หน้ารายละเอียดอัลบั้ม & Smart Multi-Download
│   │   ├── admin/                # ศูนย์ควบคุมระบบ & จัดการอัลบั้มตกค้าง
│   │   └── api/
│   │       ├── albums/           # APIs ภายในสำหรับสร้างและอัปโหลดภาพ
│   │       ├── admin/            # APIs สถิติและส่งออกรายงาน PR
│   │       └── v1/               # Two-Way Integration APIs สำหรับ SmartFlow
│   ├── components/
│   │   ├── layout/Navbar.tsx     # เมนูนำทางและสถานะ Drive/SmartFlow
│   │   ├── gallery/              # FilterBar, AlbumCard, LinkProjectModal
│   │   └── upload/QuickUploadModal.tsx # โมดอลอัปโหลดภาพด่วนแบบ Progressive
│   └── lib/
│       ├── prisma.ts             # Prisma Singleton พร้อมแก้ไขปัญหา BigInt JSON
│       ├── academic-utils.ts     # คำนวณปีการศึกษาไทย พ.ศ. และรหัสอัลบั้ม
│       ├── api-security.ts       # ตรวจสอบ X-PhotoSync-Api-Key
│       └── services/
│           ├── googleDriveService.ts  # จัดการ Google Shared Drive อัตโนมัติ
│           ├── imageProcessor.ts      # ประมวลผลภาพด้วย Sharp และสร้างลายน้ำ
│           ├── geminiVisionService.ts # วิเคราะห์ภาพและแท็กด้วย Gemini 1.5 Flash
│           ├── lineNotifyService.ts   # ส่งการ์ดแจ้งเตือน LINE Flex Message
│           └── smartflowService.ts    # ซิงค์และส่ง Webhook กับ SmartFlow
```

---

## 👨‍💻 พัฒนาและดูแลระบบ

**วิทยาลัยสารพัดช่างน่าน (Nan Polytechnic College)**  
งานประชาสัมพันธ์ ร่วมกับ แผนกวิชาเทคโนโลยีสารสนเทศ  
สำนักงานคณะกรรมการการอาชีวศึกษา (สอศ.) กระทรวงศึกษาธิการ
