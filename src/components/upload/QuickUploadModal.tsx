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
  const [departmentName, setDepartmentName] = useState<string>("งานประชาสัมพันธ์");

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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load SmartFlow Projects when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    } else {
      resetForm();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setIsProjectsLoading(true);
    try {
      // Query local SmartFlow cache projects
      const res = await fetch("/api/albums");
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
          divisionName: "ฝ่ายพัฒนากิจการนักเรียนนักศึกษา",
          departmentName: "งานกิจกรรมนักเรียนนักศึกษา",
          ownerTeacherName: "นางสาวกัญญา พัฒนกิจ",
        },
        {
          id: "p3",
          projectCode: "PRJ-69-003",
          projectName: "โครงการศูนย์ซ่อมสร้างเพื่อชุมชน (Fix It Center) ประจำปีงบประมาณ 2569",
          divisionName: "ฝ่ายแผนงานและความร่วมมือ",
          departmentName: "งานโครงการพิเศษและบริการวิชาชีพ",
          ownerTeacherName: "นายเกรียงไกร ช่างยนต์",
        },
      ];
      setProjects(seedProjects);

      // Load active system academic term
      const termsRes = await fetch("/api/admin/academic-terms");
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
    setDepartmentName("งานประชาสัมพันธ์");
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
      setErrorMessage("กรุณาระบุชื่อกิจกรรม / อัลบั้ม");
      return;
    }
    if (selectedFiles.length === 0) {
      setErrorMessage("กรุณาเลือกรูปภาพอย่างน้อย 1 รูป");
      return;
    }
    if (albumType === AlbumType.PROJECT && !projectId) {
      setErrorMessage("กรุณาเลือกรหัสโครงการจาก npc_smartflow");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setUploadProgress(10);
    setUploadStatusText("กำลังสร้างอัลบั้มและเตรียมพื้นที่ Google Shared Drive...");

    try {
      // 1. Create Album
      const createRes = await fetch("/api/albums", {
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

      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || "Failed to create album");
      }

      const createdAlbum = createData.data;
      setUploadProgress(35);
      setUploadStatusText(
        `กำลังอัปโหลดและประมวลผลรูปภาพ (${selectedFiles.length} รูป)...`
      );

      // 2. Upload Batch Files
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      formData.append("runAiTagging", String(runAiTagging));
      formData.append("sendLineNotify", String(sendLineNotify));

      const uploadRes = await fetch(`/api/albums/${createdAlbum.id}/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload files");
      }

      setUploadProgress(100);
      setUploadStatusText("อัปโหลดและซิงค์ข้อมูลสำเร็จเรียบร้อย!");

      setTimeout(() => {
        if (onSuccess) onSuccess(createdAlbum);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการอัปโหลด");
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto rounded-3xl border border-purple-800/60 bg-[#13072E] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-900/40 bg-[#180C3E]/95 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 text-white shadow-lg shadow-pink-500/30">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                อัปโหลดภาพด่วน (Quick Upload • Zero Friction)
              </h2>
              <p className="text-xs text-purple-300/80">
                ระบบซิงค์อัตโนมัติไปยัง Google Shared Drive & รายงาน 5 บท npc_smartflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="rounded-full p-2 text-purple-400 hover:bg-[#25135A] hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white text-[10px] font-black">
                  1
                </span>
                ข้อมูลกิจกรรม
              </span>

              {/* Dynamic Academic Term Badge */}
              <div className="flex items-center gap-2">
                {configuredCurrentTerm && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ภาคเรียนปัจจุบัน: {configuredCurrentTerm.semester}/{configuredCurrentTerm.academicYear}
                  </span>
                )}
                <div className="flex items-center gap-1.5 rounded-full bg-[#1B0E44] border border-purple-700/50 px-3 py-1 text-[11px] font-medium text-pink-300">
                  <Calendar className="h-3.5 w-3.5 text-pink-400" />
                  <span>
                    ภาคเรียนที่ {termInfo.semester}/{termInfo.academicYear} (ปีงบฯ {termInfo.budgetYear})
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-purple-200">
                  ชื่อกิจกรรม / ชื่องาน <span className="text-pink-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น พิธีไหว้ครูช่าง, กิจกรรมเข้าแถวเคารพธงชาติ, อบรมหุ่นยนต์อัจฉริยะ..."
                  className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E42]/80 px-4 py-2.5 text-xs sm:text-sm text-purple-100 placeholder-purple-400/60 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
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
                  className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E42]/80 px-4 py-2.5 text-xs sm:text-sm text-purple-100 focus:border-pink-500 focus:outline-none"
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
                  {NPC_DEPARTMENTS.map((dept) => (
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
        <div className="flex items-center justify-between border-t border-purple-900/40 bg-[#160B3A]/95 px-6 py-4">
          <div className="text-xs text-purple-300/80">
            {selectedFiles.length > 0 && (
              <span>
                พร้อมอัปโหลด: <strong className="text-white">{selectedFiles.length}</strong> ไฟล์ ({totalSizeMb} MB)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="rounded-full border border-purple-700/60 bg-[#1F0F4C] px-4 py-2 text-xs font-semibold text-purple-200 hover:bg-[#2B1464] hover:text-white transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>

            <button
              onClick={handleUploadSubmit}
              disabled={isUploading || selectedFiles.length === 0}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
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
