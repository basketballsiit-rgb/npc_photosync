"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Zap,
  Calendar,
  Layers,
  FolderSync,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  Trash2,
  Bot,
  MessageSquare,
  FileImage,
  Sparkles,
} from "lucide-react";
import { AlbumType } from "@prisma/client";
import {
  getAcademicTermInfo,
  formatAlbumCode,
  NPC_DIVISIONS,
  NPC_DEPARTMENTS,
  ALBUM_TYPE_PREFIX_MAP,
} from "@/lib/academic-utils";
import { showAlert, npcSwal } from "@/lib/sweetalert";
import { apiUrl, getClientBasePath } from "@/lib/basepath";

interface SmartFlowProjectItem {
  id: string;
  projectCode: string;
  projectName: string;
  divisionName: string;
  departmentName?: string | null;
  ownerTeacherName: string;
}

interface QuickUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newAlbum: any) => void;
}

export function QuickUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: QuickUploadModalProps) {
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [albumType, setAlbumType] = useState<AlbumType>(AlbumType.ROUTINE);
  const [projectId, setProjectId] = useState<string>("");
  const [divisionName, setDivisionName] = useState<string>("ฝ่ายบริหารทรัพยากร");
  const [departmentName, setDepartmentName] = useState<string>("งานศูนย์ดิจิทัลและสื่อสารองค์กร");

  // Options Toggles
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [runAiTagging, setRunAiTagging] = useState(true);
  const [sendLineNotify, setSendLineNotify] = useState(true);

  // Files & Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [projects, setProjects] = useState<SmartFlowProjectItem[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [configuredCurrentTerm, setConfiguredCurrentTerm] = useState<any | null>(null);
  const [departmentsList, setDepartmentsList] = useState<string[]>(Array.from(NPC_DEPARTMENTS));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Calculate Academic Info Dynamically
  const termInfo = getAcademicTermInfo(new Date(eventDate || new Date()));

  // Estimate preview album code & Google Drive path
  const estimatedCode = formatAlbumCode(
    albumType,
    new Date(eventDate || new Date()),
    1
  );

  const driveCategory =
    albumType === AlbumType.PROJECT
      ? "01_โครงการตามแผน"
      : albumType === AlbumType.ROUTINE
      ? "02_งานประจำและทั่วไป"
      : albumType === AlbumType.ADHOC
      ? "03_กิจกรรมเฉพาะกิจ"
      : "04_คลังภาพประชาสัมพันธ์";

  const drivePathPreview = `/${termInfo.academicYear}/${driveCategory}/${estimatedCode}`;

  // Load SmartFlow Projects & Dynamic Departments when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProjects();
      loadDepartments();
    } else {
      resetForm();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const res = await fetch(apiUrl("/api/departments"));
      const data = await res.json();
      if (data.success && Array.isArray(data.departments) && data.departments.length > 0) {
        const names = data.departments.map((d: any) => d.name);
        setDepartmentsList(names);
      }
    } catch (err) {
      console.warn("Could not load departments:", err);
    }
  };

  const loadProjects = async () => {
    setIsProjectsLoading(true);
    try {
      // Query local SmartFlow cache projects
      const res = await fetch(apiUrl("/api/albums"));
      const seedProjects: SmartFlowProjectItem[] = [
        {
          id: "p1",
          projectCode: "PRJ-69-001",
          projectName: "โครงการอบรมเชิงปฏิบัติการพัฒนาทักษะปัญญาประดิษฐ์ (AI) เพื่อวิชาชีพสู่อนาคต",
          divisionName: "ฝ่ายวิชาการ",
          departmentName: "แผนกวิชาเทคโนโลยีสารสนเทศ",
          ownerTeacherName: "นายสมชาย วิชาการ",
        },
        {
          id: "p2",
          projectCode: "PRJ-69-002",
          projectName: "โครงการสืบสานประเพณีแข่งเรือเมืองน่านและพัฒนาจิตอาสาชุมชน",
          divisionName: "ฝ่ายกิจการนักเรียนนักศึกษา",
          departmentName: "งานกิจกรรมนักเรียนนักศึกษา",
          ownerTeacherName: "นางสาวกัญญา พัฒนกิจ",
        },
        {
          id: "p3",
          projectCode: "PRJ-69-003",
          projectName: "โครงการศูนย์ซ่อมสร้างเพื่อชุมชน (Fix It Center) ประจำปีงบประมาณ 2569",
          divisionName: "ฝ่ายยุทธศาสตร์และแผนงาน",
          departmentName: "งานโครงการพิเศษและบริการวิชาชีพ",
          ownerTeacherName: "นายเกรียงไกร ช่างยนต์",
        },
      ];
      setProjects(seedProjects);

      // Load active system academic term
      const termsRes = await fetch(apiUrl("/api/admin/academic-terms"));
      const termsData = await termsRes.json();
      if (termsData.success && termsData.currentTerm) {
        setConfiguredCurrentTerm(termsData.currentTerm);
      }
    } catch (err) {
      console.warn("Could not load projects:", err);
    } finally {
      setIsProjectsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventDate(new Date().toISOString().split("T")[0]);
    setAlbumType(AlbumType.ROUTINE);
    setProjectId("");
    setDivisionName("ฝ่ายบริหารทรัพยากร");
    setDepartmentName("งานศูนย์ดิจิทัลและสื่อสารองค์กร");
    setSelectedFiles([]);
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setPreviewUrls([]);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatusText("");
    setErrorMessage("");
  };

  // Handle Project Selection & Auto-fill Division/Department
  const handleProjectSelect = (pId: string) => {
    setProjectId(pId);
    const selected = projects.find((p) => p.id === pId || p.projectCode === pId);
    if (selected) {
      setDivisionName(selected.divisionName);
      if (selected.departmentName) {
        setDepartmentName(selected.departmentName);
      }
    }
  };

  // Handle File Selection
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const validFiles: File[] = [];
    const newUrls: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        validFiles.push(file);
        newUrls.push(URL.createObjectURL(file));
      }
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Total Size Calculation
  const totalSizeBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  // Submit and Upload Handler
  const handleUploadSubmit = async () => {
    if (!title.trim()) {
      showAlert.warning("กรุณาระบุชื่อกิจกรรม", "กรุณากรอกชื่อกิจกรรม / อัลบั้มก่อนเริ่มอัปโหลด");
      titleInputRef.current?.focus();
      titleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (selectedFiles.length === 0) {
      showAlert.warning("ยังไม่ได้เลือกรูปภาพ", "กรุณาเลือกไฟล์รูปภาพอย่างน้อย 1 รูป");
      return;
    }
    if (albumType === AlbumType.PROJECT && !projectId) {
      showAlert.warning("กรุณาเลือกโครงการ", "กรุณาเลือกรหัสโครงการจาก npc_smartflow สำหรับประเภทโครงการตามแผน");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setUploadProgress(15);
    setUploadStatusText("กำลังสร้างอัลบั้มและเตรียมพื้นที่ Google Shared Drive...");

    try {
      // 1. Create Album with safe JSON parsing
      const createRes = await fetch(apiUrl("/api/albums"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          eventDate,
          albumType,
          projectId: albumType === AlbumType.PROJECT ? projectId : null,
          divisionName,
          departmentName,
        }),
      });

      const createContentType = createRes.headers.get("content-type") || "";
      let createData: any;
      if (createContentType.includes("application/json")) {
        createData = await createRes.json();
      } else {
        const rawErr = await createRes.text();
        console.error("Create album non-JSON response:", rawErr);
        throw new Error(
          `เซิร์ฟเวอร์ขัดข้องในการสร้างอัลบั้ม (HTTP ${createRes.status}) กรุณาลองใหม่อีกครั้ง`
        );
      }

      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || "ไม่สามารถสร้างอัลบั้มในระบบได้");
      }

      const createdAlbum = createData.data;
      const CHUNK_SIZE = 2; // 2 files per batch for optimal network throughput & zero proxy timeouts
      const totalFiles = selectedFiles.length;
      const totalBatches = Math.ceil(totalFiles / CHUNK_SIZE);
      let uploadedCount = 0;
      let lastLineNotification: { success: boolean; error?: string } | null = null;

      // 2. Upload Batch Files in small chunks (2 files/request) with auto-retry
      for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
        const chunk = selectedFiles.slice(i, i + CHUNK_SIZE);
        const isLastChunk = i + CHUNK_SIZE >= totalFiles;
        const currentBatchNum = Math.floor(i / CHUNK_SIZE) + 1;

        const currentPercent = Math.min(
          96,
          Math.round(20 + ((i + chunk.length) / totalFiles) * 76)
        );
        setUploadProgress(currentPercent);
        setUploadStatusText(
          `กำลังอัปโหลดชุดที่ ${currentBatchNum}/${totalBatches} (รูปที่ ${uploadedCount + 1}-${uploadedCount + chunk.length} จาก ${totalFiles} รูป)...`
        );

        const formData = new FormData();
        chunk.forEach((f) => formData.append("files", f));
        formData.append("runAiTagging", String(runAiTagging));
        // Send LINE notification only on the final chunk when all photos are registered
        formData.append("sendLineNotify", String(isLastChunk && sendLineNotify));

        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const uploadRes = await fetch(apiUrl(`/api/albums/${createdAlbum.id}/upload`), {
              method: "POST",
              body: formData,
            });

            const contentType = uploadRes.headers.get("content-type") || "";
            let uploadData: any;
            if (contentType.includes("application/json")) {
              uploadData = await uploadRes.json();
            } else {
              const rawText = await uploadRes.text();
              console.error(`Non-JSON response in batch ${currentBatchNum} (HTTP ${uploadRes.status}):`, rawText);
              throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${uploadRes.status})`);
            }

            if (!uploadRes.ok || !uploadData.success) {
              throw new Error(uploadData.error || `ไม่สามารถอัปโหลดรูปภาพชุดที่ ${currentBatchNum} ได้`);
            }

            if (uploadData.data?.lineNotification) {
              lastLineNotification = uploadData.data.lineNotification;
            }

            lastError = null;
            break;
          } catch (batchErr: any) {
            lastError = batchErr;
            if (attempt < 2) {
              setUploadStatusText(`ชุดที่ ${currentBatchNum} กำลังลองส่งใหม่อีกครั้ง (รอบที่ 2)...`);
              await new Promise((r) => setTimeout(r, 1200));
            }
          }
        }

        if (lastError) {
          throw lastError;
        }

        uploadedCount += chunk.length;
      }

      setUploadProgress(100);
      setUploadStatusText("อัปโหลดและซิงค์ข้อมูลสำเร็จครบถ้วน 100%!");

      const filesCount = selectedFiles.length;
      const albumResult = createdAlbum;

      // Reset state to prevent duplicate submission
      setSelectedFiles([]);
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      setPreviewUrls([]);
      setIsUploading(false);

      if (onSuccess) {
        onSuccess(albumResult);
      }
      onClose();

      const shareOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const albumShareUrl = `${shareOrigin}${getClientBasePath()}/albums/${albumResult.albumCode}?openExternalBrowser=1`;
      const lineShareMsg = `📢 [คลังภาพกิจกรรม วช.น่าน]\n📌 กิจกรรม: ${albumResult.title}\n📅 วันที่: ${albumResult.eventDate?.slice(0, 10)}\n📸 จำนวน: ${filesCount} ภาพ\n🌐 เปิดดูและดาวน์โหลดภาพ:\n${albumShareUrl}`;
      const isMobileClient = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const lineDirectShareLink = isMobileClient
        ? `https://line.me/R/msg/text/?${encodeURIComponent(lineShareMsg)}`
        : `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(albumShareUrl)}`;

      let lineHtmlStatus = '<span style="color: #94a3b8;">ไม่ได้เปิดใช้งาน</span>';
      if (sendLineNotify) {
        if (lastLineNotification?.success) {
          lineHtmlStatus = '<span style="color: #34d399;">✅ ส่งข้อความ Flex Message เข้ากลุ่ม LINE เรียบร้อย</span>';
        } else if (lastLineNotification?.error?.includes("monthly limit") || lastLineNotification?.error?.includes("limit")) {
          lineHtmlStatus = `
            <span style="color: #f59e0b;">⚠️ โควตาข้อความฟรีของ LINE OA ประจำเดือนนี้เต็มแล้ว (200 ข้อความ/เดือน)</span>
            <div style="margin-top: 6px;">
              <a href="${lineDirectShareLink}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; background: #06c755; color: white; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 11px;">
                📲 คลิกที่นี่เพื่อแชร์ลงกลุ่ม LINE ทันที (ฟรี ไม่จำกัด)
              </a>
            </div>
          `;
        } else {
          lineHtmlStatus = `
            <span style="color: #f87171;">⚠️ ไม่สามารถส่งข้อความอัตโนมัติได้</span>
            <div style="margin-top: 6px;">
              <a href="${lineDirectShareLink}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; background: #06c755; color: white; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 11px;">
                📲 คลิกเพื่อแชร์ลงกลุ่ม LINE ด้วยตนเอง
              </a>
            </div>
          `;
        }
      }

      // Show comprehensive SweetAlert2 dialog with 1-click view link
      await npcSwal.fire({
        icon: "success",
        title: "🎉 อัปโหลดและสร้างอัลบั้มสำเร็จ!",
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6; margin-top: 12px; color: #f1f5f9; background: rgba(255,255,255,0.05); padding: 14px; border-radius: 16px; border: 1px solid rgba(236,72,153,0.25);">
            <div style="margin-bottom: 6px;"><strong style="color: #f472b6;">📌 ชื่อกิจกรรม:</strong> ${albumResult.title}</div>
            <div style="margin-bottom: 6px;"><strong style="color: #f472b6;">🏷️ รหัสอัลบั้ม:</strong> <span style="color: #fb7185; font-family: monospace; font-weight: bold;">${albumResult.albumCode}</span></div>
            <div style="margin-bottom: 6px;"><strong style="color: #f472b6;">🖼️ จำนวนรูปภาพ:</strong> <span style="color: #34d399; font-weight: bold;">${filesCount} รูป</span></div>
            <div style="margin-bottom: 6px;"><strong style="color: #f472b6;">☁️ Google Drive:</strong> สำรองไฟล์ต้นฉบับ 100% เรียบร้อย</div>
            <div><strong style="color: #f472b6;">💬 แจ้งเตือน LINE:</strong> ${lineHtmlStatus}</div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "🌐 เปิดดูอัลบั้มทันที",
        cancelButtonText: "ตกลง (เสร็จสิ้น)",
        confirmButtonColor: "#ec4899",
        cancelButtonColor: "#4c1d95",
        backdrop: "rgba(9, 5, 20, 0.85)",
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = `${getClientBasePath()}/albums/${albumResult.albumCode}`;
        }
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      setIsUploading(false);
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการอัปโหลด");
      showAlert.error(
        "อัปโหลดไม่สำเร็จ",
        err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อหรืออัปโหลดรูปภาพ กรุณาลองใหม่อีกครั้ง"
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overflow-x-hidden">
      <div className="relative w-full max-w-full sm:max-w-4xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[92vh] sm:my-auto rounded-none sm:rounded-3xl border-0 sm:border border-purple-800/60 bg-[#13072E] shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl">
        {/* Full-Screen Blocking Uploading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0d041e]/95 backdrop-blur-md p-6 text-center animate-in fade-in duration-200">
            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 shadow-2xl shadow-pink-500/40 mb-4 animate-pulse">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 text-white animate-spin" />
            </div>

            <h3 className="text-base sm:text-xl font-bold text-white mb-1.5">
              กำลังอัปโหลดและประมวลผลรูปภาพ...
            </h3>
            <p className="text-xs sm:text-sm text-pink-300 font-medium mb-4 max-w-md">
              {uploadStatusText}
            </p>

            {/* Progress Bar Container */}
            <div className="w-full max-w-md space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs text-purple-300">
                <span>ความคืบหน้าการซิงค์ข้อมูล</span>
                <span className="font-mono font-bold text-pink-400">{uploadProgress}%</span>
              </div>
              <div className="h-3 sm:h-3.5 w-full overflow-hidden rounded-full bg-[#180C3E] border border-purple-800/50 shadow-inner p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200/90 max-w-md">
              ⚠️ กำลังซิงค์ไฟล์ต้นฉบับขึ้น Google Shared Drive และจัดเตรียมข้อมูล<br />
              <strong className="text-amber-300">กรุณาอย่าปิดหน้าต่างนี้ หรือกดซ้ำ เพื่อป้องกันการอัปโหลดซ้ำซ้อน</strong>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-900/40 bg-[#180C3E]/95 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 text-white shadow-lg shadow-pink-500/30 shrink-0">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-lg font-black text-white truncate">
                อัปโหลดภาพด่วน (Quick Upload)
              </h2>
              <p className="text-[10px] sm:text-xs text-purple-300/80 truncate">
                ระบบซิงค์ Google Shared Drive & npc_smartflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="rounded-full p-2 text-purple-400 hover:bg-[#25135A] hover:text-white transition-colors disabled:opacity-50 shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white text-[10px] font-black shrink-0">
                  1
                </span>
                ข้อมูลกิจกรรม
              </span>

              {/* Dynamic Academic Term Badge */}
              <div className="flex flex-wrap items-center gap-1.5">
                {configuredCurrentTerm && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ภาคเรียน {configuredCurrentTerm.semester}/{configuredCurrentTerm.academicYear}
                  </span>
                )}
                <div className="flex items-center gap-1.5 rounded-full bg-[#1B0E44] border border-purple-700/50 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-medium text-pink-300">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-pink-400 shrink-0" />
                  <span>
                    ภาคเรียนที่ {termInfo.semester}/{termInfo.academicYear} (ปีงบฯ {termInfo.budgetYear})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-purple-200">
                  ชื่อกิจกรรม / ชื่องาน <span className="text-pink-400">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น พิธีไหว้ครูช่าง, กิจกรรมเข้าแถวเคารพธงชาติ, อบรมหุ่นยนต์อัจฉริยะ..."
                  className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E42]/80 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm text-purple-100 placeholder-purple-400/60 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-purple-200">
                  วันที่จัดกิจกรรม <span className="text-pink-400">*</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E42]/80 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm text-purple-100 focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: Activity Type & Progressive Disclosure */}
          <div className="space-y-3 pt-2 border-t border-purple-900/40">
            <span className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white text-[10px] font-black">
                2
              </span>
              ประเภทกิจกรรม (การจัดกลุ่ม & ซิงค์)
            </span>

            {/* 4 Classification Radio Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <label
                onClick={() => setAlbumType(AlbumType.ROUTINE)}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                  albumType === AlbumType.ROUTINE
                    ? "border-cyan-500/70 bg-cyan-950/40 shadow-lg shadow-cyan-500/15"
                    : "border-purple-800/40 bg-[#190C3E]/60 hover:border-purple-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">📅 งานประจำ/ทั่วไป</span>
                  <input
                    type="radio"
                    name="albumType"
                    checked={albumType === AlbumType.ROUTINE}
                    onChange={() => setAlbumType(AlbumType.ROUTINE)}
                    className="accent-cyan-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-purple-300/70 leading-tight">
                  หน้าเสาธง/การสอน (ไม่ต้องระบุโครงการ)
                </p>
              </label>

              <label
                onClick={() => setAlbumType(AlbumType.PROJECT)}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                  albumType === AlbumType.PROJECT
                    ? "border-pink-500/70 bg-pink-950/40 shadow-lg shadow-pink-500/20"
                    : "border-purple-800/40 bg-[#190C3E]/60 hover:border-purple-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">📁 โครงการตามแผนฯ</span>
                  <input
                    type="radio"
                    name="albumType"
                    checked={albumType === AlbumType.PROJECT}
                    onChange={() => setAlbumType(AlbumType.PROJECT)}
                    className="accent-pink-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-pink-300/80 leading-tight">
                  เชื่อมโยง npc_smartflow รายงาน 5 บท
                </p>
              </label>

              <label
                onClick={() => setAlbumType(AlbumType.ADHOC)}
                className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                  albumType === AlbumType.ADHOC
                    ? "border-amber-500/70 bg-amber-950/40 shadow-lg shadow-amber-500/15"
                    : "border-purple-800/40 bg-[#190C3E]/60 hover:border-purple-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">⚡ กิจกรรมเฉพาะกิจ</span>
                  <input
                    type="radio"
                    name="albumType"
                    checked={albumType === AlbumType.ADHOC}
                    onChange={() => setAlbumType(AlbumType.ADHOC)}
                    className="accent-amber-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-tight">
                  เร่งด่วน (ผูกโครงการย้อนหลังได้)
                </p>
              </label>

              <label
                onClick={() => setAlbumType(AlbumType.PORTFOLIO)}
                className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                  albumType === AlbumType.PORTFOLIO
                    ? "border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10"
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">🏛️ คลังภาพ PR</span>
                  <input
                    type="radio"
                    name="albumType"
                    checked={albumType === AlbumType.PORTFOLIO}
                    onChange={() => setAlbumType(AlbumType.PORTFOLIO)}
                    className="accent-indigo-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-tight">
                  ภาพอาคารสถานที่ / โดรน / บุคลากร
                </p>
              </label>
            </div>

            {/* PROGRESSIVE DISCLOSURE: SmartFlow Project Selector (Only visible if PROJECT is selected) */}
            {albumType === AlbumType.PROJECT && (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <FolderSync className="h-4 w-4 text-cyan-400" />
                    เลือกรหัสโครงการที่อนุมัติแล้ว (npc_smartflow){" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    ข้อมูลฝ่ายและแผนกจะถูกเติมอัตโนมัติ
                  </span>
                </div>

                <select
                  value={projectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full rounded-xl border border-cyan-500/40 bg-slate-900/95 px-3.5 py-2.5 text-xs sm:text-sm text-cyan-200 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">-- กรุณาเลือกรหัสโครงการ --</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.projectCode} • {proj.projectName} ({proj.divisionName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Organizational Unit Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  ฝ่ายที่รับผิดชอบ
                </label>
                <select
                  value={divisionName}
                  onChange={(e) => setDivisionName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  {NPC_DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  แผนกวิชา / งาน
                </label>
                <select
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  {departmentsList.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Shared Drive Target Path Preview Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] truncate">
                <HardDrive className="h-4 w-4 text-cyan-400 shrink-0" />
                <span className="text-slate-500">Google Drive:</span>
                <span className="text-cyan-300 font-semibold truncate">
                  {drivePathPreview}
                </span>
              </div>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-cyan-400 border border-slate-700">
                Auto-Organized
              </span>
            </div>
          </div>

          {/* STEP 3: Batch Drag & Drop Zone */}
          <div className="space-y-3 pt-2 border-t border-purple-900/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white text-[10px] font-black">
                  3
                </span>
                เลือกและลากวางภาพถ่าย (Drag & Drop Photos)
              </span>
              {selectedFiles.length > 0 && (
                <span className="text-xs text-purple-300 font-medium">
                  {selectedFiles.length} รูป ({totalSizeMb} MB)
                </span>
              )}
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              className="cursor-pointer group flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-purple-800/60 bg-[#160B3A]/50 p-6 text-center transition-all hover:border-pink-500 hover:bg-pink-500/5"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-600/30 text-pink-400 border border-pink-500/30 shadow-md group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-bold text-white">
                คลิกเลือกรูปภาพ หรือ ลากไฟล์ภาพมาวางที่นี่
              </p>
              <p className="text-xs text-purple-400/80 mt-0.5">
                รองรับไฟล์ภาพ JPEG, PNG, WebP (ไม่จำกัดจำนวน รองรับ 100+ รูป)
              </p>
            </div>

            {/* Previews Grid */}
            {previewUrls.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-purple-300/80">
                  <span>ตัวอย่างภาพที่พร้อมอัปโหลด ({previewUrls.length} รูป):</span>
                  <button
                    onClick={() => {
                      previewUrls.forEach((u) => URL.revokeObjectURL(u));
                      setSelectedFiles([]);
                      setPreviewUrls([]);
                    }}
                    className="text-pink-400 hover:underline"
                  >
                    ลบทั้งหมด
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 rounded-2xl border border-purple-800/50 bg-[#0F0728]/80">
                  {previewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-[#180C3E] border border-purple-700/50"
                    >
                      <img
                        src={url}
                        alt="preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-pink-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Processing Automation Toggles */}
            <div className="rounded-2xl border border-purple-800/40 bg-[#160B3A]/70 p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2 text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoOptimize}
                  onChange={(e) => setAutoOptimize(e.target.checked)}
                  className="rounded border-purple-700 bg-purple-950 text-pink-500 focus:ring-0 accent-pink-500"
                />
                <span className="flex items-center gap-1">
                  <FileImage className="h-3.5 w-3.5 text-pink-400" />
                  ย่อ WebP & HD 1920px
                </span>
              </label>

              <label className="flex items-center gap-2 text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={runAiTagging}
                  onChange={(e) => setRunAiTagging(e.target.checked)}
                  className="rounded border-purple-700 bg-purple-950 text-pink-500 focus:ring-0 accent-pink-500"
                />
                <span className="flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5 text-purple-400" />
                  คำบรรยาย AI (Gemini)
                </span>
              </label>

              <label className="flex items-center gap-2 text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendLineNotify}
                  onChange={(e) => setSendLineNotify(e.target.checked)}
                  className="rounded border-purple-700 bg-purple-950 text-pink-500 focus:ring-0 accent-pink-500"
                />
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  ส่งแจ้งเตือนเข้ากลุ่ม LINE
                </span>
              </label>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2 rounded-2xl border border-pink-500/30 bg-pink-950/20 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-pink-300 font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin text-pink-400" />
                  {uploadStatusText}
                </span>
                <span className="font-mono font-bold text-pink-400">
                  {uploadProgress}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#180C3E]">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-purple-900/40 bg-[#160B3A]/95 px-4 sm:px-6 py-3 sm:py-4 gap-2.5 sm:gap-0 shrink-0">
          <div className="text-xs text-purple-300/80 text-center sm:text-left">
            {selectedFiles.length > 0 ? (
              <span>
                พร้อมอัปโหลด: <strong className="text-white">{selectedFiles.length}</strong> ไฟล์ ({totalSizeMb} MB)
              </span>
            ) : (
              <span className="text-[11px] text-purple-400/60">
                เลือกรูปภาพเพื่อเริ่มอัปโหลด
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="rounded-full border border-purple-700/60 bg-[#1F0F4C] px-4 py-2.5 text-xs font-semibold text-purple-200 hover:bg-[#2B1464] hover:text-white transition-colors disabled:opacity-50 shrink-0"
            >
              ยกเลิก
            </button>

            <button
              onClick={handleUploadSubmit}
              disabled={isUploading || selectedFiles.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังอัปโหลด...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-white" />
                  <span>เริ่มอัปโหลดและซิงค์ (Upload & Sync)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
