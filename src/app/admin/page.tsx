"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { LinkProjectModal } from "@/components/gallery/LinkProjectModal";
import {
  ShieldCheck,
  HardDrive,
  FolderSync,
  Bot,
  MessageSquare,
  Layers,
  FileText,
  Trash2,
  Eye,
  EyeOff,
  Link as LinkIcon,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Code,
  Copy,
  ExternalLink,
  Calendar,
  Building,
  Sparkles,
  ArrowLeft,
  Loader2,
  Upload,
  Save,
} from "lucide-react";

interface AdminStats {
  totalAlbums: number;
  projectLinkedAlbums: number;
  unlinkedAlbums: number;
  totalPhotos: number;
  totalProjects: number;
  totalDownloads: number;
  reportFetches: number;
  totalDriveSizeBytes: number;
  approximateLocalCacheBytes: number;
}

interface SystemHealth {
  googleDrive: { status: string; label: string };
  smartflow: { status: string; label: string };
  geminiVision: { status: string; label: string };
  lineMessaging: { status: string; label: string };
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"orphans" | "smartflow" | "pr_report" | "academic_terms" | "google_drive">("academic_terms");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tab 0: Academic Terms Settings
  const [academicTerms, setAcademicTerms] = useState<any[]>([]);
  const [currentTerm, setCurrentTerm] = useState<any | null>(null);
  const [newTermForm, setNewTermForm] = useState({
    academicYear: 2569,
    semester: 2,
    budgetYear: 2569,
    isCurrent: false,
    note: "",
  });
  const [isSubmittingTerm, setIsSubmittingTerm] = useState(false);

  // Tab 1: Orphan Albums
  const [orphanAlbums, setOrphanAlbums] = useState<any[]>([]);
  const [selectedAlbumToLink, setSelectedAlbumToLink] = useState<any | null>(null);

  // Tab 2: SmartFlow
  const [projects, setProjects] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiTesterProjectCode, setApiTesterProjectCode] = useState("PRJ-69-001");
  const [apiTesterResult, setApiTesterResult] = useState<string>("");
  const [isTestingApi, setIsTestingApi] = useState(false);

  // Tab 3: PR Report
  const [prReportRows, setPrReportRows] = useState<any[]>([]);
  const [copiedJson, setCopiedJson] = useState(false);

  // Tab 4: Google Drive & Cloud Settings
  const [driveSettings, setDriveSettings] = useState<any | null>(null);
  const [driveStatus, setDriveStatus] = useState<any | null>(null);
  const [driveForm, setDriveForm] = useState({
    rootFolderId: "",
    clientEmail: "",
    privateKey: "",
    credentialsJson: "",
  });
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [driveTestFeedback, setDriveTestFeedback] = useState<{
    success: boolean;
    message: string;
    folderName?: string;
    folderId?: string;
    clientEmail?: string;
  } | null>(null);
  const [credentialsInputMode, setCredentialsInputMode] = useState<"json" | "manual">("json");

  useEffect(() => {
    loadDashboardData();
    fetchDriveSettings();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Load Stats
      const statsRes = await fetch("/api/admin/stats");
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
        setHealth(statsData.health);
      }

      // 2. Load Orphan Albums
      const orphansRes = await fetch("/api/v1/albums/unlinked", {
        headers: {
          "x-photosync-api-key": "photosync-api-key-live-nan-polytechnic-college",
        },
      });
      const orphansData = await orphansRes.json();
      if (orphansData.success) {
        setOrphanAlbums(orphansData.data);
      }

      // 3. Load Synced Projects
      const projectsRes = await fetch("/api/v1/sync/projects?t=" + Date.now(), {
        headers: {
          "x-photosync-api-key": "photosync-api-key-live-nan-polytechnic-college",
        },
      });
      // Fallback seed projects for list view
      setProjects([
        {
          projectCode: "PRJ-69-001",
          projectName: "โครงการอบรมเชิงปฏิบัติการพัฒนาทักษะปัญญาประดิษฐ์ (AI) เพื่อวิชาชีพสู่อนาคต",
          divisionName: "ฝ่ายวิชาการ",
          departmentName: "แผนกวิชาเทคโนโลยีสารสนเทศ",
          ownerTeacherName: "นายสมชาย วิชาการ",
          projectStatus: "APPROVED",
        },
        {
          projectCode: "PRJ-69-002",
          projectName: "โครงการสืบสานประเพณีแข่งเรือเมืองน่านและพัฒนาจิตอาสาชุมชน",
          divisionName: "ฝ่ายพัฒนากิจการนักเรียนนักศึกษา",
          departmentName: "งานกิจกรรมนักเรียนนักศึกษา",
          ownerTeacherName: "นางสาวกัญญา พัฒนกิจ",
          projectStatus: "APPROVED",
        },
        {
          projectCode: "PRJ-69-003",
          projectName: "โครงการศูนย์ซ่อมสร้างเพื่อชุมชน (Fix It Center) ประจำปีงบประมาณ 2569",
          divisionName: "ฝ่ายแผนงานและความร่วมมือ",
          departmentName: "งานโครงการพิเศษและบริการวิชาชีพ",
          ownerTeacherName: "นายเกรียงไกร ช่างยนต์",
          projectStatus: "APPROVED",
        },
      ]);

      // 4. Load PR Report data
      const prRes = await fetch("/api/admin/pr-report");
      const prData = await prRes.json();
      if (prData.success) {
        setPrReportRows(prData.rows);
      }

      // 5. Load Academic Terms
      const termsRes = await fetch("/api/admin/academic-terms");
      const termsData = await termsRes.json();
      if (termsData.success) {
        setAcademicTerms(termsData.terms);
        setCurrentTerm(termsData.currentTerm);
      }
    } catch (err) {
      console.error("Failed to load admin dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Set Current Active Term
  const handleSetCurrentTerm = async (academicYear: number, semester: number, budgetYear?: number) => {
    try {
      const res = await fetch("/api/admin/academic-terms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear, semester, budgetYear }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadDashboardData();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการเปลี่ยนภาคเรียน");
      }
    } catch (err) {
      alert("ไม่สามารถเปลี่ยนภาคเรียนปัจจุบันได้");
    }
  };

  // Create New Academic Term
  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTerm(true);
    try {
      const res = await fetch("/api/admin/academic-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTermForm),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setNewTermForm({
          academicYear: 2569,
          semester: 2,
          budgetYear: 2569,
          isCurrent: false,
          note: "",
        });
        loadDashboardData();
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกภาคเรียน");
    } finally {
      setIsSubmittingTerm(false);
    }
  };

  // Force Sync with SmartFlow
  const handleForceSyncSmartflow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-smartflow", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`ซิงค์ข้อมูลโครงการสำเร็จ! อัปเดต ${data.projects?.length || 3} โครงการ`);
        loadDashboardData();
      }
    } catch (err) {
      alert("การซิงค์ข้อมูลล้มเหลว กรุณาตรวจสอบการเชื่อมต่อ");
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = async (albumId: string, currentPublic: boolean) => {
    try {
      const res = await fetch(`/api/admin/albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !currentPublic }),
      });
      if (res.ok) {
        setOrphanAlbums((prev) =>
          prev.map((a) => (a.id === albumId ? { ...a, isPublic: !currentPublic } : a))
        );
      }
    } catch (err) {
      console.error("Failed to toggle visibility:", err);
    }
  };

  // Delete Album
  const handleDeleteAlbum = async (albumId: string, albumCode: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบอัลบั้ม [${albumCode}] อย่างถาวร?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/albums/${albumId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setOrphanAlbums((prev) => prev.filter((a) => a.id !== albumId));
        alert(`ลบอัลบั้ม ${albumCode} เรียบร้อยแล้ว`);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการลบอัลบั้ม");
    }
  };

  // Run API Tester for SmartFlow
  const handleRunApiTest = async () => {
    if (!apiTesterProjectCode.trim()) return;
    setIsTestingApi(true);
    try {
      const res = await fetch(
        `/api/v1/media/by-project/${encodeURIComponent(apiTesterProjectCode.trim())}`,
        {
          headers: {
            "x-photosync-api-key": "photosync-api-key-live-nan-polytechnic-college",
          },
        }
      );
      const data = await res.json();
      setApiTesterResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiTesterResult(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsTestingApi(false);
    }
  };

  const copyApiResult = () => {
    navigator.clipboard.writeText(apiTesterResult);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Google Drive Settings Handlers
  const fetchDriveSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings/google-drive");
      if (res.ok) {
        const data = await res.json();
        setDriveSettings(data.settings);
        setDriveStatus(data.status);
        if (data.settings) {
          setDriveForm((prev) => ({
            ...prev,
            rootFolderId: data.settings.rootFolderId || "",
            clientEmail: data.settings.clientEmail || "",
          }));
        }
      }
    } catch (err) {
      console.warn("Could not load Google Drive settings:", err);
    }
  };

  const handleSaveDriveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDrive(true);
    setDriveTestFeedback(null);
    try {
      const res = await fetch("/api/admin/settings/google-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driveForm),
      });
      const data = await res.json();
      if (data.success) {
        setDriveTestFeedback(data.status);
        await fetchDriveSettings();
        await loadDashboardData();
        alert(
          data.status?.success
            ? "✅ บันทึกการตั้งค่าและเชื่อมต่อ Google Drive ของวิทยาลัยสำเร็จเรียบร้อยแล้ว!"
            : "⚠️ บันทึกการตั้งค่าแล้ว แต่การทดสอบเชื่อมต่อแจ้งเตือน: " + (data.status?.message || "")
        );
      } else {
        alert("❌ บันทึกไม่สำเร็จ: " + (data.error || "เกิดข้อผิดพลาด"));
      }
    } catch (err: any) {
      alert("❌ เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleTestDriveConnection = async () => {
    setIsTestingDrive(true);
    setDriveTestFeedback(null);
    try {
      const res = await fetch("/api/admin/settings/google-drive");
      const data = await res.json();
      if (data.status) {
        setDriveTestFeedback(data.status);
      }
    } catch (err: any) {
      setDriveTestFeedback({
        success: false,
        message: "ไม่สามารถทดสอบการเชื่อมต่อได้: " + err.message,
      });
    } finally {
      setIsTestingDrive(false);
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (!parsed.client_email && !parsed.private_key) {
          alert("❌ ไฟล์ JSON ไม่ถูกต้อง ต้องเป็นไฟล์ Service Account Credentials จาก Google Cloud Console");
          return;
        }
        setDriveForm((prev) => ({
          ...prev,
          credentialsJson: content,
          clientEmail: parsed.client_email || prev.clientEmail,
          privateKey: parsed.private_key || prev.privateKey,
        }));
        alert(`✅ อ่านไฟล์ "${file.name}" สำเร็จ!\nตรวจพบอีเมล Service Account: ${parsed.client_email}`);
      } catch (jsonErr) {
        alert("❌ ไฟล์ที่เลือกไม่ใช่รูปแบบ JSON ที่ถูกต้อง");
      }
    };
    reader.readAsText(file);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col pb-20">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-pink-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>กลับสู่หน้าหลัก</span>
            </Link>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/25">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>ศูนย์ควบคุมและบริหารระบบ (Admin Console)</span>
            </h1>
            <p className="text-xs text-purple-300/80">
              วิทยาลัยสารพัดช่างน่าน • จัดการอัลบั้มตกค้าง, ตรวจสอบการเชื่อมโยง SmartFlow และสรุปผลงาน PR
            </p>
          </div>
        </div>

        {/* SECTION 1: Metrics Overview Cards */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-4 shadow-xl backdrop-blur-md hover:border-pink-500/40 transition-all">
            <div className="text-[11px] font-medium text-purple-300/70">อัลบั้มทั้งหมด</div>
            <div className="mt-1 text-2xl font-black text-white">
              {stats?.totalAlbums || 0}
            </div>
            <div className="mt-1 text-[10px] text-pink-400">
              ผูกโครงการแล้ว {stats?.projectLinkedAlbums || 0} / ยังไม่ผูก {stats?.unlinkedAlbums || 0}
            </div>
          </div>

          <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-4 shadow-xl backdrop-blur-md hover:border-pink-500/40 transition-all">
            <div className="text-[11px] font-medium text-purple-300/70">รูปภาพทั้งหมด</div>
            <div className="mt-1 text-2xl font-black text-pink-300">
              {stats?.totalPhotos || 0}
            </div>
            <div className="mt-1 text-[10px] text-purple-400/80">
              ประมวลผล WebP + HD แล้ว
            </div>
          </div>

          <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-4 shadow-xl backdrop-blur-md hover:border-cyan-500/40 transition-all">
            <div className="text-[11px] font-medium text-purple-300/70">Google Shared Drive</div>
            <div className="mt-1 text-2xl font-black text-cyan-300">
              {formatFileSize(stats?.totalDriveSizeBytes)}
            </div>
            <div className="mt-1 text-[10px] text-purple-400/80">
              ความจุต้นฉบับ 100%
            </div>
          </div>

          <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-4 shadow-xl backdrop-blur-md hover:border-purple-500/40 transition-all">
            <div className="text-[11px] font-medium text-purple-300/70">Local Cache (NAS)</div>
            <div className="mt-1 text-2xl font-black text-purple-300">
              {formatFileSize(stats?.approximateLocalCacheBytes)}
            </div>
            <div className="mt-1 text-[10px] text-purple-400/80">
              WebP 600px + HD 1920px
            </div>
          </div>

          <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-4 shadow-xl backdrop-blur-md col-span-2 md:col-span-1 hover:border-amber-500/40 transition-all">
            <div className="text-[11px] font-medium text-purple-300/70">ดึงไปทำรายงาน 5 บท</div>
            <div className="mt-1 text-2xl font-black text-amber-300">
              {stats?.reportFetches || 0} <span className="text-xs font-normal text-purple-400">ครั้ง</span>
            </div>
            <div className="mt-1 text-[10px] text-purple-400/80">
              ผ่าน SmartFlow Proxy API
            </div>
          </div>
        </section>

        {/* SECTION 2: System Health Status Grid */}
        <section className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 shadow-xl backdrop-blur-md">
          <div className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-3.5 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <span>สถานะการเชื่อมต่อบริการภายนอก (System Health Status)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Google Drive Health */}
            <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/90 p-3.5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 shrink-0 border border-cyan-500/30">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Google Shared Drive</div>
                <div className="text-[11px] text-emerald-300 flex items-center gap-1 mt-0.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {health?.googleDrive.label || "พร้อมใช้งาน"}
                </div>
              </div>
            </div>

            {/* SmartFlow Health */}
            <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/90 p-3.5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400 shrink-0 border border-pink-500/30">
                <FolderSync className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">npc_smartflow API</div>
                <div className="text-[11px] text-cyan-300 flex items-center gap-1 mt-0.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {health?.smartflow.label || "ซิงค์อัตโนมัติ 2 ทาง"}
                </div>
              </div>
            </div>

            {/* Gemini Vision Health */}
            <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/90 p-3.5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 shrink-0 border border-purple-500/30">
                <Bot className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Gemini 1.5 Flash Vision</div>
                <div className="text-[11px] text-purple-300 flex items-center gap-1 mt-0.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                  {health?.geminiVision.label || "วิเคราะห์ภาพอัตโนมัติ"}
                </div>
              </div>
            </div>

            {/* LINE Messaging Health */}
            <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/90 p-3.5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">LINE Messaging API</div>
                <div className="text-[11px] text-emerald-300 flex items-center gap-1 mt-0.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {health?.lineMessaging.label || "ส่ง Flex Message สำเร็จ"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-purple-900/40 text-xs font-bold">
          <button
            onClick={() => setActiveTab("academic_terms")}
            className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
              activeTab === "academic_terms"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-purple-400 hover:text-white"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>⚙️ ปีการศึกษา & ภาคเรียนปัจจุบัน</span>
            {currentTerm && (
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                {currentTerm.semester}/{currentTerm.academicYear}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("orphans")}
            className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
              activeTab === "orphans"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-purple-400 hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>จัดการอัลบั้มที่ยังไม่ผูกโครงการ ({orphanAlbums.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("smartflow")}
            className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
              activeTab === "smartflow"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-purple-400 hover:text-white"
            }`}
          >
            <FolderSync className="h-4 w-4" />
            <span>ศูนย์ซิงค์ & ทดสอบ API SmartFlow</span>
          </button>

          <button
            onClick={() => setActiveTab("pr_report")}
            className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
              activeTab === "pr_report"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-purple-400 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>รายงานผลงานประชาสัมพันธ์ & การตั้งค่า</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("google_drive");
              fetchDriveSettings();
            }}
            className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
              activeTab === "google_drive"
                ? "border-cyan-500 text-cyan-300"
                : "border-transparent text-purple-400 hover:text-white"
            }`}
          >
            <HardDrive className="h-4 w-4 text-cyan-400" />
            <span>☁️ ตั้งค่า Google Drive & พื้นที่จัดเก็บ</span>
            {driveSettings?.isConfigured && !driveSettings?.isMock && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
                เชื่อมต่อแล้ว
              </span>
            )}
          </button>
        </div>

        {/* TAB 0: ACADEMIC TERMS & CURRENT SEMESTER SETTINGS */}
        {activeTab === "academic_terms" && (
          <section className="space-y-6">
            {/* Banner: Current Active Term */}
            <div className="relative overflow-hidden rounded-3xl border border-purple-700/50 bg-gradient-to-r from-[#1E0E46]/90 via-[#160B3A]/90 to-[#0F0728]/95 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      ภาคเรียนปัจจุบันของระบบ (Active Semester)
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    ภาคเรียนที่ {currentTerm?.semester || 1} ปีการศึกษา {currentTerm?.academicYear || 2569}
                  </h2>
                  <p className="text-xs text-slate-300">
                    ปีงบประมาณ พ.ศ. {currentTerm?.budgetYear || currentTerm?.academicYear || 2569} • ทุกกิจกรรมที่อัปโหลดใหม่จะถูกจัดเก็บลงในโฟลเดอร์ Google Shared Drive ภายใต้ปีการศึกษาและภาคเรียนนี้โดยอัตโนมัติ
                  </p>
                  <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-cyan-300">
                    <HardDrive className="h-4 w-4 text-cyan-400" />
                    <span>เส้นทาง Google Drive โฟลเดอร์: /{currentTerm?.academicYear || 2569}/...</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-pink-500/30 bg-[#13072E]/90 p-4 text-center shrink-0 shadow-lg">
                  <div className="text-[11px] text-purple-300 font-medium">อัลบั้มในภาคเรียนนี้</div>
                  <div className="text-3xl font-black text-pink-300 mt-0.5">
                    {currentTerm?.albumCount || 0}
                  </div>
                  <div className="text-[10px] text-purple-400/80 mt-0.5">
                    อัลบั้มที่บันทึกแล้ว
                  </div>
                </div>
              </div>
            </div>

            {/* Form & Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form: Define New Term */}
              <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 space-y-4 backdrop-blur-md shadow-xl">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-pink-400" />
                    <span>กำหนดภาคเรียน / ปีการศึกษาใหม่</span>
                  </h3>
                  <p className="text-xs text-purple-300/80">
                    เพิ่มปีการศึกษาหรือภาคเรียนถัดไปล่วงหน้า
                  </p>
                </div>

                <form onSubmit={handleCreateTerm} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-purple-200 font-semibold">ปีการศึกษา (พ.ศ.) *</label>
                    <input
                      type="number"
                      required
                      min={2560}
                      max={2580}
                      value={newTermForm.academicYear}
                      onChange={(e) =>
                        setNewTermForm({
                          ...newTermForm,
                          academicYear: parseInt(e.target.value, 10),
                          budgetYear: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full rounded-2xl border border-purple-800/50 bg-[#1B0E44] px-3.5 py-2 text-white focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-purple-200 font-semibold">ภาคเรียนที่ *</label>
                    <select
                      value={newTermForm.semester}
                      onChange={(e) =>
                        setNewTermForm({
                          ...newTermForm,
                          semester: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full rounded-2xl border border-purple-800/50 bg-[#1B0E44] px-3.5 py-2 text-white focus:border-pink-500 focus:outline-none"
                    >
                      <option value={1} className="bg-[#140A32]">ภาคเรียนที่ 1 (16 พ.ค. - 15 ต.ค.)</option>
                      <option value={2} className="bg-[#140A32]">ภาคเรียนที่ 2 (16 ต.ค. - 31 มี.ค.)</option>
                      <option value={3} className="bg-[#140A32]">ภาคเรียนที่ 3 (ภาคฤดูร้อน Summer)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-purple-200 font-semibold">ปีงบประมาณ (พ.ศ.)</label>
                    <input
                      type="number"
                      value={newTermForm.budgetYear}
                      onChange={(e) =>
                        setNewTermForm({
                          ...newTermForm,
                          budgetYear: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full rounded-2xl border border-purple-800/50 bg-[#1B0E44] px-3.5 py-2 text-white focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-purple-200 font-semibold">หมายเหตุ / คำอธิบาย</label>
                    <input
                      type="text"
                      placeholder="เช่น ภาคเรียนเปิดใหม่, ภาคเรียนฤดูร้อน..."
                      value={newTermForm.note}
                      onChange={(e) =>
                        setNewTermForm({ ...newTermForm, note: e.target.value })
                      }
                      className="w-full rounded-2xl border border-purple-800/50 bg-[#1B0E44] px-3.5 py-2 text-white placeholder-purple-400/60 focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2 pt-1 text-purple-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTermForm.isCurrent}
                      onChange={(e) =>
                        setNewTermForm({ ...newTermForm, isCurrent: e.target.checked })
                      }
                      className="rounded border-purple-700 bg-purple-950 text-pink-500 focus:ring-0 accent-pink-500"
                    />
                    <span>ตั้งเป็นภาคเรียนปัจจุบันทันทีหลังบันทึก</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmittingTerm}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 py-2.5 font-bold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isSubmittingTerm ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>บันทึกภาคเรียน</span>
                    )}
                  </button>
                </form>
              </div>

              {/* Table: All Academic Terms */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between text-xs text-purple-300/80">
                  <span className="font-semibold text-white">
                    รายการภาคเรียนทั้งหมดในระบบ ({academicTerms.length} ภาคเรียน)
                  </span>
                  <span>คลิกปุ่ม "ตั้งเป็นภาคเรียนปัจจุบัน" เพื่อสลับการทำงานทันที</span>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-purple-800/40 bg-[#140A32]/85 shadow-xl backdrop-blur-md">
                  <table className="w-full text-left text-xs text-purple-200">
                    <thead className="border-b border-purple-800/50 bg-[#180C3E] text-purple-300 uppercase text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">ปีการศึกษา / ภาคเรียน</th>
                        <th className="py-3.5 px-4">ปีงบประมาณ</th>
                        <th className="py-3.5 px-4 text-center">อัลบั้ม</th>
                        <th className="py-3.5 px-4">สถานะ</th>
                        <th className="py-3.5 px-4 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/30">
                      {academicTerms.map((term) => (
                        <tr
                          key={`${term.academicYear}_${term.semester}`}
                          className={`transition-colors ${
                            term.isCurrent
                              ? "bg-purple-950/40 hover:bg-purple-950/60"
                              : "hover:bg-[#1C0E46]/50"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>
                                ภาคเรียนที่ {term.semester}/{term.academicYear}
                              </span>
                              {term.note && (
                                <span className="text-[10px] font-normal text-purple-400">
                                  ({term.note})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-purple-400">
                            {term.budgetYear}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-pink-300">
                            {term.albumCount || 0}
                          </td>
                          <td className="py-3.5 px-4">
                            {term.isCurrent ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                ภาคเรียนปัจจุบัน
                              </span>
                            ) : (
                              <span className="text-[10px] text-purple-500">
                                ทั่วไป
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {term.isCurrent ? (
                              <span className="text-[11px] font-semibold text-emerald-300">
                                กำลังใช้งานอยู่
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  handleSetCurrentTerm(
                                    term.academicYear,
                                    term.semester,
                                    term.budgetYear
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1 text-[11px] font-bold text-pink-300 hover:bg-pink-500 hover:text-white transition-all shadow-sm"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>ตั้งเป็นภาคเรียนปัจจุบัน</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 1: ORPHAN ALBUM MANAGER */}
        {activeTab === "orphans" && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-purple-300/80">
              <p>
                รายการอัลบั้มประเภท <span className="font-semibold text-cyan-300">ROUTINE</span> และ{" "}
                <span className="font-semibold text-amber-300">ADHOC</span> ที่ยังไม่มีรหัสโครงการ สามารถผูกเข้ากับโครงการได้ตลอดเวลา
              </p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-pink-400">{orphanAlbums.length}</span>
                <span>อัลบั้มตกค้าง</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-purple-800/40 bg-[#140A32]/85 shadow-xl backdrop-blur-md">
              <table className="w-full text-left text-xs text-purple-200">
                <thead className="border-b border-purple-800/50 bg-[#180C3E] text-purple-300 uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">รหัส / ภาพหน้าปก</th>
                    <th className="py-3.5 px-4">ชื่อกิจกรรม</th>
                    <th className="py-3.5 px-4">ประเภท</th>
                    <th className="py-3.5 px-4">ฝ่าย / แผนก</th>
                    <th className="py-3.5 px-4">จำนวนภาพ</th>
                    <th className="py-3.5 px-4 text-center">สถานะแสดงผล</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {orphanAlbums.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-purple-400">
                        ไม่มีอัลบั้มที่ค้างการผูกโครงการ ยอดเยี่ยมมาก!
                      </td>
                    </tr>
                  ) : (
                    orphanAlbums.map((album) => (
                      <tr key={album.id} className="hover:bg-[#1C0E46]/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="relative h-10 w-14 rounded-xl overflow-hidden bg-[#180C3E] border border-purple-700/50 shrink-0">
                              <img
                                src={album.coverThumbnailUrl || "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200"}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <span className="font-mono font-bold text-pink-300 text-[11px]">
                              {album.albumCode}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white max-w-xs truncate">
                          {album.title}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              album.albumType === "ROUTINE"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {album.albumType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-purple-300/80">
                          {album.divisionName}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {album.photoCount} รูป
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleVisibility(album.id, album.isPublic)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                              album.isPublic !== false
                                ? "bg-pink-500/10 text-pink-300 border border-pink-500/30"
                                : "bg-[#1B0E44] text-purple-400 border border-purple-700/50"
                            }`}
                          >
                            {album.isPublic !== false ? (
                              <>
                                <Eye className="h-3 w-3" />
                                <span>สาธารณะ</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" />
                                <span>ภายใน</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Link Project Button */}
                            <button
                              onClick={() => setSelectedAlbumToLink(album)}
                              className="flex items-center gap-1 rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1 text-[11px] font-bold text-pink-300 hover:bg-pink-500 hover:text-white transition-all shadow-sm"
                            >
                              <LinkIcon className="h-3 w-3" />
                              <span>ผูกโครงการ</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteAlbum(album.id, album.albumCode)}
                              className="rounded-full p-1.5 text-purple-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                              title="ลบอัลบั้ม"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: SMARTFLOW INTEGRATION & API TESTER */}
        {activeTab === "smartflow" && (
          <section className="space-y-6">
            {/* Header Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 shadow-xl backdrop-blur-md">
              <div>
                <h3 className="font-bold text-white text-sm">
                  รายการโครงการที่ซิงค์จาก npc_smartflow
                </h3>
                <p className="text-xs text-purple-300/80">
                  ระบบแคชฐานข้อมูลโครงการเพื่อความรวดเร็วและรองรับการทำงานแบบออฟไลน์
                </p>
              </div>

              <button
                onClick={handleForceSyncSmartflow}
                disabled={isSyncing}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>⚡ ดึงข้อมูลโครงการล่าสุดทันที (Force Sync Now)</span>
              </button>
            </div>

            {/* Synced Projects Table */}
            <div className="overflow-x-auto rounded-3xl border border-purple-800/40 bg-[#140A32]/85 shadow-xl backdrop-blur-md">
              <table className="w-full text-left text-xs text-purple-200">
                <thead className="border-b border-purple-800/50 bg-[#180C3E] text-purple-300 uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">รหัสโครงการ</th>
                    <th className="py-3.5 px-4">ชื่อโครงการ (ตามแผนปฏิบัติการ)</th>
                    <th className="py-3.5 px-4">ฝ่าย / แผนก</th>
                    <th className="py-3.5 px-4">ครูผู้รับผิดชอบ</th>
                    <th className="py-3.5 px-4 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {projects.map((proj) => (
                    <tr key={proj.projectCode} className="hover:bg-[#1C0E46]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-pink-300">
                        {proj.projectCode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white max-w-sm truncate">
                        {proj.projectName}
                      </td>
                      <td className="py-3.5 px-4 text-purple-300/80">
                        {proj.divisionName}
                        {proj.departmentName ? ` • ${proj.departmentName}` : ""}
                      </td>
                      <td className="py-3.5 px-4 text-purple-200">
                        {proj.ownerTeacherName}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          {proj.projectStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Interactive API Tester Panel */}
            <div className="rounded-3xl border border-purple-700/50 bg-[#160B3A]/90 p-6 space-y-4 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-pink-400" />
                    <h3 className="text-sm font-bold text-white">
                      เครื่องมือทดสอบ API 5 บท (Interactive API Tester)
                    </h3>
                  </div>
                  <p className="text-xs text-purple-300/80">
                    ทดสอบจำลอง Endpoint ที่ระบบ <code className="text-pink-300 font-mono">npc_smartflow</code> จะเรียกเข้ามาดึงภาพและคำบรรยาย AI
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-purple-300 bg-[#1D0E44] px-3 py-1 rounded-full border border-purple-700/50">
                    Header: X-PhotoSync-Api-Key
                  </span>
                </div>
              </div>

              {/* Endpoint Runner Row */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-2xl border border-purple-800/60 bg-[#11072B] px-3.5 py-2 text-xs font-mono text-purple-200 flex-1">
                  <span className="text-emerald-400 font-bold mr-2">GET</span>
                  <span className="text-purple-400">/api/v1/media/by-project/</span>
                  <input
                    type="text"
                    value={apiTesterProjectCode}
                    onChange={(e) => setApiTesterProjectCode(e.target.value)}
                    placeholder="PRJ-69-001"
                    className="bg-transparent text-pink-300 font-bold focus:outline-none ml-1 w-32"
                  />
                </div>

                <button
                  onClick={handleRunApiTest}
                  disabled={isTestingApi}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {isTestingApi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>ทดสอบเรียก API</span>
                  )}
                </button>
              </div>

              {/* Response Code Block */}
              {apiTesterResult && (
                <div className="relative rounded-2xl border border-purple-800/50 bg-[#0F0728] p-4 font-mono text-xs text-purple-200 overflow-x-auto max-h-80 shadow-inner">
                  <button
                    onClick={copyApiResult}
                    className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-[#1F0F4C] px-3 py-1 text-[10px] text-purple-200 hover:text-white border border-purple-700/50 transition-colors"
                  >
                    {copiedJson ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-300">คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>คัดลอก JSON</span>
                      </>
                    )}
                  </button>
                  <pre>{apiTesterResult}</pre>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: PR PERFORMANCE REPORT & WATERMARK CONFIG */}
        {activeTab === "pr_report" && (
          <section className="space-y-6">
            {/* PR Performance Report Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 shadow-xl backdrop-blur-md">
              <div>
                <h3 className="font-bold text-white text-sm">
                  รายงานผลการปฏิบัติงานโสตทัศนศึกษาและประชาสัมพันธ์
                </h3>
                <p className="text-xs text-purple-300/80">
                  สรุปสถิติการบันทึกภาพกิจกรรมวิทยาลัยเพื่อใช้ประกอบรายงานประจำปีและการประเมินสถานศึกษา
                </p>
              </div>

              <a
                href="/api/admin/pr-report?format=csv"
                download
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>ส่งออกรายงาน Excel (CSV UTF-8)</span>
              </a>
            </div>

            {/* Report Summary Table */}
            <div className="overflow-x-auto rounded-3xl border border-purple-800/40 bg-[#140A32]/85 shadow-xl backdrop-blur-md">
              <table className="w-full text-left text-xs text-purple-200">
                <thead className="border-b border-purple-800/50 bg-[#180C3E] text-purple-300 uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">ลำดับ</th>
                    <th className="py-3.5 px-4">รหัสอัลบั้ม</th>
                    <th className="py-3.5 px-4">ชื่อกิจกรรม/งาน</th>
                    <th className="py-3.5 px-4">วันที่จัด</th>
                    <th className="py-3.5 px-4">ฝ่ายที่รับผิดชอบ</th>
                    <th className="py-3.5 px-4 text-center">รูปภาพ</th>
                    <th className="py-3.5 px-4">รหัสโครงการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {prReportRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-purple-400">
                        ยังไม่มีข้อมูลกิจกรรมในระบบ
                      </td>
                    </tr>
                  ) : (
                    prReportRows.map((row) => (
                      <tr key={row.itemNo} className="hover:bg-[#1C0E46]/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-purple-500">{row.itemNo}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-pink-300">
                          {row.albumCode}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white max-w-sm truncate">
                          {row.title}
                        </td>
                        <td className="py-3.5 px-4 text-purple-300/80">{row.eventDate}</td>
                        <td className="py-3.5 px-4 text-purple-200">{row.divisionName}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-pink-300">
                          {row.photoCount}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-purple-400">{row.projectCode}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Watermark & LINE Notification Configuration Preview Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* College Watermark Preview */}
              <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 space-y-3 backdrop-blur-md shadow-xl">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-pink-400" />
                  <span>ตัวอย่างลายน้ำตราสัญลักษณ์วิทยาลัย (Watermark)</span>
                </h4>
                <p className="text-xs text-purple-300/80">
                  ประทับอัตโนมัติเมื่อดาวน์โหลดแบบ "พร้อม PR โซเชียล" พร้อมแถบชื่อภาษาไทย-อังกฤษ
                </p>
                <div className="rounded-2xl border border-purple-800/40 bg-[#0F0728] p-4 flex items-center justify-center">
                  <img
                    src="/assets/npc-watermark.png"
                    alt="NPC Watermark"
                    className="max-h-24 object-contain shadow-lg"
                  />
                </div>
                <div className="text-[11px] text-purple-300/80 flex items-center justify-between">
                  <span>ตำแหน่ง: มุมขวาล่าง + แถบชื่อสถาบัน</span>
                  <span className="text-pink-400 font-semibold">Active (Sharp Pipeline)</span>
                </div>
              </div>

              {/* LINE Flex Message Card Preview */}
              <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 space-y-3 backdrop-blur-md shadow-xl">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  <span>เทมเพลตการ์ด LINE Flex Message</span>
                </h4>
                <p className="text-xs text-purple-300/80">
                  ส่งแจ้งเตือนอัตโนมัติเข้ากลุ่ม LINE วิทยาลัยทันทีที่อัปโหลดเสร็จสิ้น
                </p>
                <div className="rounded-2xl border border-purple-800/40 bg-[#0F0728] p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] border-b border-purple-900/40 pb-2">
                    <span className="font-bold text-pink-300">วิทยาลัยสารพัดช่างน่าน</span>
                    <span className="text-purple-400">NPC_PhotoSync</span>
                  </div>
                  <div className="font-semibold text-white">📢 มีการเผยแพร่ภาพกิจกรรมใหม่</div>
                  <div className="text-[11px] text-purple-300/80">
                    แสดงชื่อกิจกรรม, ประเภท, จำนวนรูปภาพ, วันที่จัด และปุ่มเปิดดูทันที
                  </div>
                  <div className="rounded-full bg-gradient-to-r from-pink-500/20 to-purple-600/30 border border-pink-500/30 text-pink-300 text-center py-2 font-bold text-[11px] shadow-sm">
                    🌐 เปิดดูภาพและดาวน์โหลด
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: GOOGLE DRIVE & CLOUD STORAGE SETTINGS */}
        {activeTab === "google_drive" && (
          <section className="space-y-6">
            {/* Status & Connection Overview Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-cyan-700/50 bg-gradient-to-r from-[#0C1A3E]/90 via-[#101235]/90 to-[#0A0620]/95 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-2.5 w-2.5 rounded-full ${
                        driveStatus?.success
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      สถานะการเชื่อมต่อ Google Shared Drive วิทยาลัย
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                    <HardDrive className="h-7 w-7 text-cyan-400" />
                    <span>
                      {driveStatus?.success
                        ? `เชื่อมต่อคลาวด์วิทยาลัยแล้ว: ${driveStatus.folderName || "Shared Drive"}`
                        : driveSettings?.isMock
                        ? "โหมดพัฒนา (Mock Drive Active)"
                        : "ยังไม่ได้เชื่อมต่อ Google Drive"}
                    </span>
                  </h2>
                  <p className="text-xs text-purple-300/80 max-w-2xl leading-relaxed">
                    พื้นที่จัดเก็บภาพถ่ายต้นฉบับ 100% ไม่บีบอัด ผ่าน Google Drive / Shared Drive ของบัญชีสถานศึกษา (@pvc.ac.th หรือ @nanpoly.ac.th) เพื่อรองรับภาพกิจกรรมความละเอียดสูงไม่จำกัด
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={handleTestDriveConnection}
                    disabled={isTestingDrive}
                    className="flex items-center gap-2 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 px-4 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isTestingDrive ? "animate-spin" : ""}`} />
                    <span>{isTestingDrive ? "กำลังทดสอบ..." : "⚡ ทดสอบการเชื่อมต่อสด"}</span>
                  </button>
                </div>
              </div>

              {/* Status details pills */}
              <div className="mt-6 pt-5 border-t border-purple-800/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-2xl bg-[#09051E]/70 border border-purple-800/40 p-3">
                  <div className="text-[10px] text-purple-400 uppercase font-semibold">Service Account Email</div>
                  <div className="font-mono text-cyan-300 truncate mt-0.5" title={driveSettings?.clientEmail}>
                    {driveSettings?.clientEmail || "ยังไม่ได้กำหนด"}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#09051E]/70 border border-purple-800/40 p-3">
                  <div className="text-[10px] text-purple-400 uppercase font-semibold">Root Folder / Drive ID</div>
                  <div className="font-mono text-pink-300 truncate mt-0.5" title={driveSettings?.rootFolderId}>
                    {driveSettings?.rootFolderId || "ยังไม่ได้กำหนด"}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#09051E]/70 border border-purple-800/40 p-3">
                  <div className="text-[10px] text-purple-400 uppercase font-semibold">แหล่งที่มาข้อมูลคอนฟิก</div>
                  <div className="font-medium text-emerald-300 mt-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {driveSettings?.source === "database"
                      ? "ฐานข้อมูลระบบ (System Settings)"
                      : driveSettings?.source === "env"
                      ? "ไฟล์ .env เซิร์ฟเวอร์"
                      : "ค่าเริ่มต้น"}
                  </div>
                </div>
              </div>
            </div>

            {/* Test Connection Live Result Box */}
            {driveTestFeedback && (
              <div
                className={`rounded-3xl border p-5 transition-all shadow-xl backdrop-blur-md ${
                  driveTestFeedback.success
                    ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-200"
                    : "border-rose-500/50 bg-rose-950/40 text-rose-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl shrink-0 ${
                      driveTestFeedback.success
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    }`}
                  >
                    {driveTestFeedback.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-sm text-white">
                      {driveTestFeedback.success ? "การเชื่อมต่อ Google Drive ทำงานได้อย่างสมบูรณ์!" : "การเชื่อมต่อขัดข้อง"}
                    </div>
                    <div className="leading-relaxed opacity-90">{driveTestFeedback.message}</div>
                    {driveTestFeedback.folderName && (
                      <div className="font-mono text-[11px] text-cyan-300 pt-1">
                        โฟลเดอร์เป้าหมาย: <span className="font-bold underline">{driveTestFeedback.folderName}</span> (ID: {driveTestFeedback.folderId})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3-Step Setup Guide for College Staff */}
            <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-6 shadow-xl backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>คำแนะนำ: 3 ขั้นตอนการเชื่อมต่อ Google Drive ของสถานศึกษา (@pvc.ac.th หรือ @nanpoly.ac.th)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40 text-[11px]">
                      1
                    </span>
                    <span className="font-bold text-white">สร้าง Service Account</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    สร้าง Service Account ใน Google Cloud Console (เปิด Google Drive API) และดาวน์โหลดคีย์เป็นไฟล์ <strong>JSON</strong>
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/20 text-pink-400 font-bold border border-pink-500/40 text-[11px]">
                      2
                    </span>
                    <span className="font-bold text-white">แชร์โฟลเดอร์ให้สิทธิ์</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    เปิด Google Drive ของวิทยาลัย สร้าง Shared Drive หรือโฟลเดอร์ กด <strong>แชร์</strong> แล้วใส่อีเมล Service Account เป็น <strong>ผู้จัดการเนื้อหา (Content Manager)</strong>
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 text-[11px]">
                      3
                    </span>
                    <span className="font-bold text-white">กรอกข้อมูลและบันทึก</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    คัดลอก Folder ID หรือลิงก์โฟลเดอร์ และวางไฟล์ JSON ลงในฟอร์มด้านล่างนี้ ระบบจะเชื่อมต่อและสร้างโฟลเดอร์กิจกรรมให้อัตโนมัติ
                  </p>
                </div>
              </div>
            </div>

            {/* Google Drive Configuration Form */}
            <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-6 shadow-xl backdrop-blur-md">
              <form onSubmit={handleSaveDriveSettings} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/40">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FolderSync className="h-5 w-5 text-pink-400" />
                      <span>แบบฟอร์มกำหนดค่า Google Cloud & Drive Storage</span>
                    </h3>
                    <p className="text-xs text-purple-300/80 mt-1">
                      สามารถบันทึกการตั้งค่าได้โดยตรงจากหน้านี้ โดยไม่ต้องเข้าไปแก้ไขไฟล์บนเซิร์ฟเวอร์
                    </p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex rounded-2xl bg-[#09051E] p-1 border border-purple-800/40 text-xs font-semibold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setCredentialsInputMode("json")}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        credentialsInputMode === "json"
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                          : "text-purple-400 hover:text-white"
                      }`}
                    >
                      📄 วางไฟล์ JSON (แนะนำ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCredentialsInputMode("manual")}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        credentialsInputMode === "manual"
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                          : "text-purple-400 hover:text-white"
                      }`}
                    >
                      ✍️ กรอกแยกช่อง
                    </button>
                  </div>
                </div>

                {/* Target Google Drive Root Folder ID or URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span>1. โฟลเดอร์หลัก Google Drive (Shared Drive Root Folder ID หรือ ลิงก์โฟลเดอร์) *</span>
                    <span className="text-[11px] font-normal text-cyan-300">
                      รองรับการวาง URL เต็ม เช่น https://drive.google.com/drive/folders/...
                    </span>
                  </label>
                  <input
                    type="text"
                    value={driveForm.rootFolderId}
                    onChange={(e) => setDriveForm({ ...driveForm, rootFolderId: e.target.value })}
                    placeholder="วางลิงก์โฟลเดอร์ Google Drive หรือ Folder ID เช่น 1a2B3c4D5e6F7g..."
                    className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] px-4 py-3 text-xs text-white placeholder-purple-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                    required
                  />
                  <p className="text-[11px] text-purple-400">
                    รูปภาพทั้งหมดจะถูกจัดหมวดหมู่สร้างโฟลเดอร์ย่อยตามปีการศึกษาและประเภทกิจกรรม เช่น <code>/[2569]/01_โครงการตามแผน/[ชื่อกิจกรรม]</code> ให้อัตโนมัติภายในโฟลเดอร์นี้
                  </p>
                </div>

                {/* JSON Input Mode */}
                {credentialsInputMode === "json" ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-white">
                        2. ไฟล์คีย์ Service Account (Credentials JSON) *
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-xl bg-purple-900/40 hover:bg-purple-800/50 border border-purple-700/50 px-3 py-1.5 text-xs text-purple-200 transition-all">
                        <Upload className="h-3.5 w-3.5 text-pink-400" />
                        <span>📁 เลือกไฟล์ JSON จากเครื่อง</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleJsonFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <textarea
                      rows={7}
                      value={driveForm.credentialsJson}
                      onChange={(e) => setDriveForm({ ...driveForm, credentialsJson: e.target.value })}
                      placeholder='วางเนื้อหาไฟล์ JSON ที่นี่ (ขึ้นต้นด้วย { "type": "service_account", "client_email": "...", "private_key": "..." })'
                      className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] p-4 text-xs text-cyan-200 placeholder-purple-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono leading-relaxed"
                    />

                    {driveForm.clientEmail && (
                      <div className="rounded-xl bg-cyan-950/30 border border-cyan-800/40 px-3 py-2 text-[11px] text-cyan-300 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                        <span>ตรวจพบ Service Account: <strong>{driveForm.clientEmail}</strong></span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Manual Input Mode */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white">2.1 อีเมล Service Account (Client Email) *</label>
                      <input
                        type="email"
                        value={driveForm.clientEmail}
                        onChange={(e) => setDriveForm({ ...driveForm, clientEmail: e.target.value })}
                        placeholder="เช่น npc-photosync-sa@pvc-project.iam.gserviceaccount.com"
                        className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] px-4 py-3 text-xs text-white placeholder-purple-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white flex items-center justify-between">
                        <span>2.2 คีย์ส่วนตัว RSA (Private Key) *</span>
                        {driveSettings?.hasPrivateKey && (
                          <span className="text-[11px] text-emerald-400 font-mono">
                            {driveSettings.privateKeyMasked}
                          </span>
                        )}
                      </label>
                      <textarea
                        rows={6}
                        value={driveForm.privateKey}
                        onChange={(e) => setDriveForm({ ...driveForm, privateKey: e.target.value })}
                        placeholder="วาง -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----"
                        className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] p-4 text-xs text-cyan-200 placeholder-purple-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Submit and Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-purple-900/40">
                  <button
                    type="submit"
                    disabled={isSavingDrive}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSavingDrive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{isSavingDrive ? "กำลังบันทึกและตรวจสอบ..." : "💾 บันทึกการตั้งค่า Google Drive"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestDriveConnection}
                    disabled={isTestingDrive}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-purple-900/40 border border-purple-700/50 px-5 py-3 text-xs font-bold text-purple-200 hover:bg-purple-800/50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isTestingDrive ? "animate-spin" : ""}`} />
                    <span>ทดสอบการเชื่อมต่อ</span>
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* Retroactive Link Modal for Orphans */}
      <LinkProjectModal
        isOpen={!!selectedAlbumToLink}
        onClose={() => setSelectedAlbumToLink(null)}
        album={selectedAlbumToLink}
        onLinkSuccess={() => loadDashboardData()}
      />
    </div>
  );
}
