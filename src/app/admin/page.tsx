"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { LinkProjectModal } from "@/components/gallery/LinkProjectModal";
import { QuickUploadModal } from "@/components/upload/QuickUploadModal";
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
  Edit,
  Plus,
  Search,
  X,
  Lock,
  User,
  Key,
  LogOut,
  Send,
  HelpCircle,
  Info,
  Image as ImageIcon,
  Newspaper,
} from "lucide-react";
import { NPC_DIVISIONS } from "@/lib/academic-utils";
import { DepartmentItem } from "@/lib/services/departmentService";
import { showAlert } from "@/lib/sweetalert";
import { EditAlbumModal } from "@/components/admin/EditAlbumModal";
import { ManagePhotosModal } from "@/components/admin/ManagePhotosModal";
import { NewsletterStudio } from "@/components/admin/NewsletterStudio";
import { getClientBasePath } from "@/lib/basepath";

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
  const [activeTab, setActiveTab] = useState<
    "academic_terms" | "departments" | "albums" | "orphans" | "newsletter" | "smartflow" | "pr_report" | "google_drive" | "line_notify"
  >("academic_terms");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
  const [isTermsLoading, setIsTermsLoading] = useState(false);

  // Tab: Departments & Divisions Settings
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDivision, setNewDeptDivision] = useState<string>("ฝ่ายวิชาการ");
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);

  // Tab 1: Albums & Photos CRUD Manager
  const [adminAlbums, setAdminAlbums] = useState<any[]>([]);
  const [isAdminAlbumsLoading, setIsAdminAlbumsLoading] = useState(false);
  const [albumSearchQuery, setAlbumSearchQuery] = useState("");
  const [albumFilterType, setAlbumFilterType] = useState<"all" | "orphans" | "linked">("all");
  const [albumYearFilter, setAlbumYearFilter] = useState<string>("");
  const [albumTypeFilter, setAlbumTypeFilter] = useState<string>("");
  const [albumDeptFilter, setAlbumDeptFilter] = useState<string>("");
  const [editingAlbum, setEditingAlbum] = useState<any | null>(null);
  const [managingPhotosAlbumId, setManagingPhotosAlbumId] = useState<string | null>(null);

  // Orphan Albums (Unlinked)
  const [orphanAlbums, setOrphanAlbums] = useState<any[]>([]);
  const [selectedAlbumToLink, setSelectedAlbumToLink] = useState<any | null>(null);

  // Tab 2: SmartFlow
  const [projects, setProjects] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiTesterProjectCode, setApiTesterProjectCode] = useState("PRJ-69-001");
  const [apiTesterResult, setApiTesterResult] = useState<string>("");
  const [isTestingApi, setIsTestingApi] = useState(false);

  // Tab 3: PR Report & Watermark
  const [prReportRows, setPrReportRows] = useState<any[]>([]);
  const [copiedJson, setCopiedJson] = useState(false);
  const [watermarkInfo, setWatermarkInfo] = useState<{
    width: number;
    height: number;
    size: number;
    updatedAt: number;
    format: string;
  } | null>(null);
  const [watermarkVersion, setWatermarkVersion] = useState<number>(Date.now());
  const [isUploadingWatermark, setIsUploadingWatermark] = useState<boolean>(false);
  const [isResettingWatermark, setIsResettingWatermark] = useState<boolean>(false);
  const [watermarkMessage, setWatermarkMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab 4: Google Drive & Cloud Settings (OAuth 2.0)
  const [driveSettings, setDriveSettings] = useState<any | null>(null);
  const [driveStatus, setDriveStatus] = useState<any | null>(null);
  const [driveForm, setDriveForm] = useState({
    rootFolderId: "1hYayVdA3Bm7-HIWiutHcJ3j8PI808CwV",
    oauthClientId: "",
    oauthClientSecret: "",
  });
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [isDisconnectingOAuth, setIsDisconnectingOAuth] = useState(false);
  const [driveTestFeedback, setDriveTestFeedback] = useState<{
    success: boolean;
    message: string;
    folderName?: string;
    folderId?: string;
    clientEmail?: string;
    authType?: string;
  } | null>(null);

  // Tab 5: LINE Messaging API Settings
  const [lineSettings, setLineSettings] = useState<{
    hasChannelAccessToken: boolean;
    channelAccessTokenMasked: string;
    channelSecret: string;
    hasChannelSecret: boolean;
    targetGroupId: string;
    isEnabled: boolean;
    isConfigured: boolean;
    lastDetectedGroupId?: string;
    source: string;
  } | null>(null);
  const [lineForm, setLineForm] = useState({
    channelAccessToken: "",
    channelSecret: "",
    targetGroupId: "",
    isEnabled: true,
  });
  const [isSavingLine, setIsSavingLine] = useState(false);
  const [isTestingLine, setIsTestingLine] = useState(false);
  const [isLineLoading, setIsLineLoading] = useState(false);
  const [showLineToken, setShowLineToken] = useState(false);
  const [showLineSecret, setShowLineSecret] = useState(false);

  // User & Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    name: string;
    role: "SUPER_ADMIN" | "PR_STAFF";
  } | null>(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`/api/auth/me?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.isAuthenticated) {
        setIsAuthenticated(true);
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.role === "PR_STAFF") {
            setActiveTab((prev) =>
              ["smartflow", "google_drive", "line_notify"].includes(prev)
                ? "academic_terms"
                : prev
            );
          }
        }
        loadDashboardData();
        fetchAcademicTerms();
        fetchDepartments();
        if (data.user?.role !== "PR_STAFF") {
          fetchDriveSettings();
          fetchLineSettings();
        }
        fetchWatermarkInfo();
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.role === "PR_STAFF") {
            setActiveTab("academic_terms");
          }
        }
        loadDashboardData();
        fetchAcademicTerms();
        fetchDepartments();
        if (data.user?.role !== "PR_STAFF") {
          fetchDriveSettings();
          fetchLineSettings();
        }
        fetchWatermarkInfo();
      } else {
        setLoginError(data.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (err: any) {
      setLoginError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    const confirmed = await showAlert.confirm("ออกจากระบบ", "คุณต้องการออกจากระบบจัดการใช่หรือไม่?", "ออกจากระบบ", "ยกเลิก");
    if (!confirmed) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setCurrentUser(null);
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  // Independent, non-cached fetch for Academic Terms
  const fetchAcademicTerms = async () => {
    setIsTermsLoading(true);
    try {
      const res = await fetch(`/api/admin/academic-terms?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.terms)) {
        setAcademicTerms(data.terms);
        if (data.currentTerm) {
          setCurrentTerm(data.currentTerm);
        }
      } else {
        console.warn("Could not load academic terms:", data.error);
      }
    } catch (err) {
      console.error("Failed to load academic terms:", err);
    } finally {
      setIsTermsLoading(false);
    }
  };

  // Independent fetch for Departments & Works
  const fetchDepartments = async () => {
    setIsDepartmentsLoading(true);
    try {
      const res = await fetch(`/api/admin/departments?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.departments)) {
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error("Failed to load departments:", err);
    } finally {
      setIsDepartmentsLoading(false);
    }
  };

  // Add Department
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      showAlert.warning("ข้อมูลไม่ครบถ้วน", "กรุณาระบุชื่อแผนกวิชา/งาน");
      return;
    }
    setIsSubmittingDept(true);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDeptName.trim(),
          divisionName: newDeptDivision,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("เพิ่มข้อมูลสำเร็จ", data.message || `เพิ่มแผนกวิชา/งาน "${newDeptName.trim()}" สำเร็จเรียบร้อยแล้ว`);
        if (Array.isArray(data.departments)) {
          setDepartments(data.departments);
        } else {
          fetchDepartments();
        }
        setNewDeptName("");
      } else {
        showAlert.error("ไม่สามารถเพิ่มข้อมูลได้", data.error || "เกิดข้อผิดพลาดในการเพิ่มแผนกวิชา/งาน");
      }
    } catch (err) {
      showAlert.error("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเพื่อเพิ่มแผนกวิชาได้");
    } finally {
      setIsSubmittingDept(false);
    }
  };

  // Update Department
  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept || !editingDept.name.trim()) return;
    setIsSubmittingDept(true);
    try {
      const res = await fetch("/api/admin/departments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDept.id,
          name: editingDept.name.trim(),
          divisionName: editingDept.divisionName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("บันทึกการแก้ไขสำเร็จ", data.message);
        if (Array.isArray(data.departments)) {
          setDepartments(data.departments);
        } else {
          fetchDepartments();
        }
        setEditingDept(null);
      } else {
        showAlert.error("แก้ไขไม่สำเร็จ", data.error || "เกิดข้อผิดพลาดในการแก้ไข");
      }
    } catch (err) {
      showAlert.error("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเพื่อแก้ไขแผนกวิชาได้");
    } finally {
      setIsSubmittingDept(false);
    }
  };

  // Delete Department
  const handleDeleteDepartment = async (id: string, name: string) => {
    const confirmed = await showAlert.confirmDelete(
      "ยืนยันการลบ",
      `คุณแน่ใจหรือไม่ว่าต้องการลบแผนกวิชา/งาน "${name}" ออกจากระบบ?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/departments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("ลบข้อมูลสำเร็จ", data.message);
        if (Array.isArray(data.departments)) {
          setDepartments(data.departments);
        } else {
          fetchDepartments();
        }
      } else {
        showAlert.error("ลบไม่สำเร็จ", data.error || "เกิดข้อผิดพลาดในการลบ");
      }
    } catch (err) {
      showAlert.error("ข้อผิดพลาด", "ไม่สามารถลบแผนกวิชาได้");
    }
  };

  // Reset Departments to Default
  const handleResetDepartments = async () => {
    const confirmed = await showAlert.confirm(
      "คืนค่าเริ่มต้น",
      "คุณต้องการคืนค่ารายการแผนกวิชาและงานทั้งหมดเป็นค่าเริ่มต้นของระบบใช่หรือไม่?",
      "ยืนยันคืนค่า",
      "ยกเลิก"
    );
    if (!confirmed) {
      return;
    }
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("คืนค่าสำเร็จ", data.message);
        if (Array.isArray(data.departments)) {
          setDepartments(data.departments);
        } else {
          fetchDepartments();
        }
      }
    } catch (err) {
      showAlert.error("ข้อผิดพลาด", "ไม่สามารถคืนค่าเริ่มต้นได้");
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Load Stats (real-time, no cache)
      const statsRes = await fetch(`/api/admin/stats?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
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

      // 2.1 Load All Admin Albums for CRUD
      fetchAdminAlbums();

      // 3. Load Synced Projects
      try {
        const syncRes = await fetch("/api/v1/sync/projects?t=" + Date.now(), {
          headers: {
            "x-photosync-api-key": "photosync-api-key-live-nan-polytechnic-college",
          },
        });
        const syncData = await syncRes.json();
        if (syncData.success && Array.isArray(syncData.projects) && syncData.projects.length > 0) {
          setProjects(syncData.projects);
        } else {
          // Fallback seed projects only if DB has no projects
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
              divisionName: "ฝ่ายกิจการนักเรียนนักศึกษา",
              departmentName: "งานกิจกรรมนักเรียนนักศึกษา",
              ownerTeacherName: "นางสาวกัญญา พัฒนกิจ",
              projectStatus: "APPROVED",
            },
            {
              projectCode: "PRJ-69-003",
              projectName: "โครงการศูนย์ซ่อมสร้างเพื่อชุมชน (Fix It Center) ประจำปีงบประมาณ 2569",
              divisionName: "ฝ่ายยุทธศาสตร์และแผนงาน",
              departmentName: "งานโครงการพิเศษและบริการวิชาชีพ",
              ownerTeacherName: "นายเกรียงไกร ช่างยนต์",
              projectStatus: "APPROVED",
            },
          ]);
        }
      } catch (e) {
        console.warn("Sync projects check:", e);
      }

      // 4. Load PR Report data
      const prRes = await fetch("/api/admin/pr-report");
      const prData = await prRes.json();
      if (prData.success) {
        setPrReportRows(prData.rows);
      }
    } catch (err) {
      console.error("Failed to load admin dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Set Current Active Term
  const handleSetCurrentTerm = async (academicYear: number, semester: number, budgetYear?: number, note?: string) => {
    try {
      setIsTermsLoading(true);
      const res = await fetch("/api/admin/academic-terms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear, semester, budgetYear, note }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("ตั้งค่าสำเร็จ", data.message || `ตั้งค่าภาคเรียนที่ ${semester}/${academicYear} เป็นภาคเรียนปัจจุบันเรียบร้อยแล้ว`);
        if (data.terms && Array.isArray(data.terms)) {
          setAcademicTerms(data.terms);
          if (data.currentTerm) {
            setCurrentTerm(data.currentTerm);
          }
        } else {
          fetchAcademicTerms();
        }
      } else {
        showAlert.error("ตั้งค่าไม่สำเร็จ", data.error || "เกิดข้อผิดพลาดในการเปลี่ยนภาคเรียน");
      }
    } catch (err) {
      showAlert.error("ข้อผิดพลาด", "ไม่สามารถเปลี่ยนภาคเรียนปัจจุบันได้");
    } finally {
      setIsTermsLoading(false);
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
        showAlert.success("บันทึกสำเร็จ", data.message || `บันทึกภาคเรียนที่ ${newTermForm.semester}/${newTermForm.academicYear} สำเร็จ`);
        if (data.terms && Array.isArray(data.terms)) {
          setAcademicTerms(data.terms);
          if (data.currentTerm) {
            setCurrentTerm(data.currentTerm);
          }
        } else {
          fetchAcademicTerms();
        }
        setNewTermForm({
          academicYear: 2569,
          semester: 2,
          budgetYear: 2569,
          isCurrent: false,
          note: "",
        });
      } else {
        showAlert.error("บันทึกไม่สำเร็จ", data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err) {
      showAlert.error("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการบันทึกภาคเรียน");
    } finally {
      setIsSubmittingTerm(false);
    }
  };

  // Force Sync with SmartFlow
  const handleForceSyncSmartflow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/sync-smartflow`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
          setProjects(data.projects);
        }
        if (data.syncedFromRemote) {
          showAlert.success("ซิงค์ข้อมูลสำเร็จ", `ดึงข้อมูลสด ${data.projects?.length || 0} โครงการจาก npc_smartflow เรียบร้อยแล้ว (อัปเดตลงฐานข้อมูล ${data.savedCount || 0} โครงการ)`);
        } else {
          const detail = data.syncError ? `\n(รายละเอียด: ${data.syncError})` : "";
          showAlert.info("ใช้แคชข้อมูลโครงการ", `ยังไม่สามารถดึงข้อมูลสดจาก SmartFlow ได้ ระบบจึงใช้ข้อมูลโครงการที่มีอยู่ในแคช (${data.projects?.length || 0} โครงการ)${detail}`);
        }
        await loadDashboardData();
      } else {
        showAlert.error("ซิงค์ไม่สำเร็จ", data.error || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล");
      }
    } catch (err: any) {
      showAlert.error("ซิงค์ล้มเหลว", err.message || "การซิงค์ข้อมูลล้มเหลว กรุณาตรวจสอบการเชื่อมต่อ");
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch All Admin Albums with search and filters
  const fetchAdminAlbums = async (overrideParams?: any) => {
    setIsAdminAlbumsLoading(true);
    try {
      const getClientBasePath = () => {
        if (typeof window !== "undefined") {
          return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
        }
        return "";
      };

      const params = new URLSearchParams();
      const query = overrideParams?.q !== undefined ? overrideParams.q : albumSearchQuery;
      const filterType = overrideParams?.filterType !== undefined ? overrideParams.filterType : albumFilterType;
      const year = overrideParams?.academicYear !== undefined ? overrideParams.academicYear : albumYearFilter;
      const type = overrideParams?.albumType !== undefined ? overrideParams.albumType : albumTypeFilter;
      const dept = overrideParams?.departmentName !== undefined ? overrideParams.departmentName : albumDeptFilter;

      if (query && query.trim()) params.append("q", query.trim());
      if (filterType && filterType !== "all") params.append("filterType", filterType);
      if (year) params.append("academicYear", year);
      if (type) params.append("albumType", type);
      if (dept) params.append("departmentName", dept);
      params.append("limit", "150");

      const res = await fetch(`${getClientBasePath()}/api/admin/albums?${params.toString()}&t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      });
      const data = await res.json();
      if (data.success && data.albums) {
        setAdminAlbums(data.albums);
      }
    } catch (err) {
      console.error("Failed to fetch admin albums:", err);
    } finally {
      setIsAdminAlbumsLoading(false);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = async (albumId: string, currentPublic: boolean) => {
    try {
      const getClientBasePath = () => {
        if (typeof window !== "undefined") {
          return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
        }
        return "";
      };

      const res = await fetch(`${getClientBasePath()}/api/admin/albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !currentPublic }),
      });
      if (res.ok) {
        setAdminAlbums((prev) =>
          prev.map((a) => (a.id === albumId ? { ...a, isPublic: !currentPublic } : a))
        );
        setOrphanAlbums((prev) =>
          prev.map((a) => (a.id === albumId ? { ...a, isPublic: !currentPublic } : a))
        );
        showAlert.toast(`ปรับการแสดงผล: ${!currentPublic ? "🌐 สาธารณะ" : "🔒 ซ่อนไว้เฉพาะภายใน"}`, "success");
      }
    } catch (err) {
      console.error("Failed to toggle visibility:", err);
    }
  };

  // Delete Album
  const handleDeleteAlbum = async (albumId: string, albumCode: string) => {
    const confirmed = await showAlert.confirmDelete(
      "ยืนยันการลบอัลบั้ม",
      `คุณแน่ใจหรือไม่ว่าต้องการลบอัลบั้ม [${albumCode}] พร้อมรูปภาพทั้งหมดอย่างถาวร? (ระบบจะลบไฟล์ทั้งในเครื่องและ Google Drive)`
    );
    if (!confirmed) {
      return;
    }
    try {
      const getClientBasePath = () => {
        if (typeof window !== "undefined") {
          return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
        }
        return "";
      };

      const res = await fetch(`${getClientBasePath()}/api/admin/albums/${albumId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminAlbums((prev) => prev.filter((a) => a.id !== albumId));
        setOrphanAlbums((prev) => prev.filter((a) => a.id !== albumId));
        showAlert.success("ลบอัลบั้มสำเร็จ", data.message || `ลบอัลบั้ม ${albumCode} เรียบร้อยแล้ว`);
        loadDashboardData();
      } else {
        showAlert.error("ลบไม่สำเร็จ", data.error || "เกิดข้อผิดพลาดในการลบอัลบั้ม");
      }
    } catch (err) {
      showAlert.error("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการลบอัลบั้ม");
    }
  };

  // Run API Tester for SmartFlow
  const handleRunApiTest = async () => {
    if (!apiTesterProjectCode.trim()) return;
    setIsTestingApi(true);
    try {
      const res = await fetch(
        `${getClientBasePath()}/api/v1/media/by-project/${encodeURIComponent(apiTesterProjectCode.trim())}`,
        {
          headers: {
            "x-photosync-api-key": "photosync-secure-rest-api-key-for-smartflow-reports",
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

  const getClientBasePath = () => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/npc_photosync")) {
      return "/npc_photosync";
    }
    return process.env.NEXT_PUBLIC_BASE_PATH || "";
  };

  const getLineWebhookUrl = () => {
    const base = getClientBasePath();
    if (typeof window !== "undefined") {
      return `${window.location.origin}${base}/api/line/webhook`;
    }
    return "https://service.npc.ac.th/npc_photosync/api/line/webhook";
  };

  // Watermark Handlers
  const fetchWatermarkInfo = async () => {
    try {
      const res = await fetch("/api/admin/watermark");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.watermark) {
          setWatermarkInfo(data.watermark);
          setWatermarkVersion(data.watermark.updatedAt || Date.now());
        }
      }
    } catch (err) {
      console.warn("Could not load watermark info:", err);
    }
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingWatermark(true);
    setWatermarkMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/watermark", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setWatermarkInfo(data.watermark);
        setWatermarkVersion(Date.now());
        setWatermarkMessage({
          type: "success",
          text: data.message || "อัปโหลดและอัปเดตลายน้ำของวิทยาลัยสำเร็จแล้ว!",
        });
      } else {
        setWatermarkMessage({
          type: "error",
          text: data.error || "เกิดข้อผิดพลาดในการอัปโหลดลายน้ำ",
        });
      }
    } catch (err: any) {
      setWatermarkMessage({
        type: "error",
        text: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      });
    } finally {
      setIsUploadingWatermark(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleResetWatermark = async () => {
    const confirmed = await showAlert.confirm(
      "คืนค่าลายน้ำเริ่มต้น",
      "ต้องการคืนค่าลายน้ำเป็นตราสัญลักษณ์มาตรฐานเริ่มต้นของวิทยาลัยหรือไม่?",
      "ยืนยันคืนค่า",
      "ยกเลิก"
    );
    if (!confirmed) return;

    setIsResettingWatermark(true);
    setWatermarkMessage(null);

    try {
      const res = await fetch("/api/admin/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();

      if (data.success) {
        setWatermarkInfo(data.watermark);
        setWatermarkVersion(Date.now());
        setWatermarkMessage({
          type: "success",
          text: data.message || "คืนค่าลายน้ำเป็นค่าเริ่มต้นเรียบร้อยแล้ว",
        });
      } else {
        setWatermarkMessage({
          type: "error",
          text: data.error || "ไม่สามารถคืนค่าได้",
        });
      }
    } catch (err: any) {
      setWatermarkMessage({
        type: "error",
        text: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      });
    } finally {
      setIsResettingWatermark(false);
    }
  };

  // Google Drive Settings Handlers (OAuth 2.0)
  const fetchDriveSettings = async () => {
    try {
      const base = getClientBasePath();
      const res = await fetch(`${base}/api/admin/settings/google-drive`);
      if (res.ok) {
        const data = await res.json();
        setDriveSettings(data.settings);
        setDriveStatus(data.status);
        if (data.settings) {
          setDriveForm((prev) => ({
            ...prev,
            rootFolderId: data.settings.rootFolderId || "1hYayVdA3Bm7-HIWiutHcJ3j8PI808CwV",
            oauthClientId: data.settings.oauthClientId || prev.oauthClientId,
          }));
        }
      }
    } catch (err) {
      console.warn("Could not load Google Drive settings:", err);
    }
  };

  const handleConnectOAuth = async () => {
    if (!driveForm.oauthClientId) {
      showAlert.error("ข้อมูลไม่ครบถ้วน", "กรุณาระบุ Google Client ID ให้เรียบร้อยก่อนกดเชื่อมต่อ");
      return;
    }
    setIsConnectingOAuth(true);
    try {
      const base = getClientBasePath();
      // First save current Client ID & Secret
      await fetch(`${base}/api/admin/settings/google-drive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driveForm),
      });

      // Get OAuth Consent URL
      const res = await fetch(`${base}/api/admin/settings/google-drive/oauth-url`);
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        showAlert.error("ไม่สามารถเริ่มการเชื่อมต่อได้", data.error || "กรุณากรอก Client ID และ Client Secret ให้ครบถ้วน");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsConnectingOAuth(false);
    }
  };

  const handleDisconnectOAuth = async () => {
    const confirmed = await showAlert.confirm(
      "ยืนยันการตัดการเชื่อมต่อ?",
      "ระบบจะยกเลิกการผูกบัญชี Google Drive นี้ออกจากระบบ",
      "ตัดการเชื่อมต่อ",
      "ยกเลิก"
    );
    if (!confirmed) return;

    setIsDisconnectingOAuth(true);
    try {
      const base = getClientBasePath();
      const res = await fetch(`${base}/api/admin/settings/google-drive/oauth-disconnect`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("ตัดการเชื่อมต่อสำเร็จ", "ยกเลิกการผูกบัญชี Google Drive เรียบร้อยแล้ว");
        await fetchDriveSettings();
        setDriveTestFeedback(null);
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsDisconnectingOAuth(false);
    }
  };

  const handleSaveDriveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDrive(true);
    setDriveTestFeedback(null);
    try {
      const base = getClientBasePath();
      const res = await fetch(`${base}/api/admin/settings/google-drive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driveForm),
      });
      const data = await res.json();
      if (data.success) {
        setDriveTestFeedback(data.status);
        await fetchDriveSettings();
        showAlert.success(
          "บันทึกสำเร็จ",
          "บันทึกข้อมูลการตั้งค่า Google Drive เรียบร้อยแล้ว"
        );
      } else {
        showAlert.error("บันทึกไม่สำเร็จ", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleTestDriveConnection = async () => {
    setIsTestingDrive(true);
    setDriveTestFeedback(null);
    try {
      const base = getClientBasePath();
      const res = await fetch(`${base}/api/admin/settings/google-drive`);
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

  // LINE Settings Handlers
  const fetchLineSettings = async () => {
    setIsLineLoading(true);
    try {
      const res = await fetch(`/api/admin/settings/line?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setLineSettings(data.settings);
        setLineForm((prev) => ({
          ...prev,
          targetGroupId: data.settings.targetGroupId || "",
          isEnabled: data.settings.isEnabled !== false,
        }));
      }
    } catch (err) {
      console.warn("Could not load LINE settings:", err);
    } finally {
      setIsLineLoading(false);
    }
  };

  const handleSaveLineSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLine(true);
    try {
      const res = await fetch("/api/admin/settings/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          channelAccessToken: lineForm.channelAccessToken,
          channelSecret: lineForm.channelSecret,
          targetGroupId: lineForm.targetGroupId,
          isEnabled: lineForm.isEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("บันทึกสำเร็จ", data.message || "บันทึกการตั้งค่า LINE Messaging API สำเร็จแล้ว");
        setLineForm((prev) => ({ ...prev, channelAccessToken: "", channelSecret: "" }));
        await fetchLineSettings();
        await loadDashboardData();
      } else {
        showAlert.error("บันทึกไม่สำเร็จ", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSavingLine(false);
    }
  };

  const handleTestLinePush = async () => {
    setIsTestingLine(true);
    try {
      const res = await fetch("/api/admin/settings/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          channelAccessToken: lineForm.channelAccessToken || undefined,
          targetGroupId: lineForm.targetGroupId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success(
          "ส่งข้อความสำเร็จ",
          data.message || "ส่งข้อความ Flex Message ทดสอบเข้ากลุ่ม LINE สำเร็จเรียบร้อยแล้ว!"
        );
      } else {
        showAlert.error("ทดสอบไม่สำเร็จ", data.error || "ไม่สามารถส่งข้อความเข้ากลุ่ม LINE ได้");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "ไม่สามารถเชื่อมต่อเพื่อส่งข้อความทดสอบได้");
    } finally {
      setIsTestingLine(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col">
        <Navbar onQuickUploadClick={() => setIsUploadModalOpen(true)} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-purple-300">
            <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
            <p className="text-sm font-medium">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col pb-16">
        <Navbar onQuickUploadClick={() => setIsUploadModalOpen(true)} />

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-md">
            <div className="relative overflow-hidden rounded-3xl border border-purple-800/50 bg-[#12082b]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-tr from-purple-700/20 to-indigo-600/20 blur-3xl pointer-events-none" />

              {/* Header Icon & Title */}
              <div className="text-center relative z-10 mb-6">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  เข้าสู่ระบบจัดการระบบ
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-purple-300/80">
                  Admin & PR Console • วิทยาลัยสารพัดช่างน่าน
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-900/50 border border-purple-700/40 text-[11px] text-purple-300">
                  <Lock className="h-3 w-3 text-pink-400" />
                  <span>สำหรับผู้ดูแลระบบและเจ้าหน้าที่งานประชาสัมพันธ์</span>
                </div>
              </div>

              {loginError && (
                <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-200 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-200 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-pink-400" />
                    <span>ชื่อผู้ใช้ (admin หรือ pr)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="admin หรือ pr"
                    className="w-full rounded-2xl border border-purple-700/40 bg-[#1c0d3a]/80 px-4 py-2.5 text-sm text-white placeholder-purple-400/50 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-purple-200 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-pink-400" />
                    <span>รหัสผ่าน</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPass ? "text" : "password"}
                      required
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="ระบุรหัสผ่านของคุณ"
                      className="w-full rounded-2xl border border-purple-700/40 bg-[#1c0d3a]/80 px-4 py-2.5 pr-10 text-sm text-white placeholder-purple-400/50 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-pink-300"
                    >
                      {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังตรวจสอบสิทธิ์...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>เข้าสู่ระบบ (Sign In)</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-pink-300 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>กลับสู่หน้าหลัก</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col pb-20">
      <Navbar onQuickUploadClick={() => setIsUploadModalOpen(true)} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <span>
                {currentUser?.role === "PR_STAFF"
                  ? "ศูนย์บริหารงานประชาสัมพันธ์ (PR Console)"
                  : "ศูนย์ควบคุมและบริหารระบบ (Admin Console)"}
              </span>
            </h1>
            <p className="text-xs text-purple-300/80">
              {currentUser?.role === "PR_STAFF"
                ? "วิทยาลัยสารพัดช่างน่าน • กำหนดปีการศึกษา, จัดการแผนกวิชา, อัลบั้มภาพถ่าย และสรุปผลงานประชาสัมพันธ์"
                : "วิทยาลัยสารพัดช่างน่าน • จัดการอัลบั้มตกค้าง, ตรวจสอบการเชื่อมโยง SmartFlow และสรุปผลงาน PR"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                currentUser?.role === "PR_STAFF"
                  ? "bg-pink-950/50 border-pink-700/50 text-pink-300"
                  : "bg-purple-900/40 border-purple-700/40 text-purple-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full animate-pulse ${
                  currentUser?.role === "PR_STAFF" ? "bg-pink-400" : "bg-emerald-400"
                }`}
              />
              <span>
                {currentUser?.role === "PR_STAFF"
                  ? "เจ้าหน้าที่งานประชาสัมพันธ์ (PR)"
                  : "ผู้ดูแลระบบสูงสุด (Super Admin)"}
              </span>
            </div>
            <button
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-300 hover:bg-red-500/20 hover:border-red-500/50 transition-all shadow-sm"
              title="ออกจากระบบจัดการ"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>ออกจากระบบ</span>
            </button>
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

        {/* SECTION 2: System Health Status Grid (Super Admin Only) */}
        {currentUser?.role !== "PR_STAFF" && (
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
        )}

        {/* SECTION 3: Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-purple-900/40 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab("academic_terms");
              fetchAcademicTerms();
            }}
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
            onClick={() => {
              setActiveTab("departments");
              fetchDepartments();
            }}
            className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
              activeTab === "departments"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-purple-400 hover:text-white"
            }`}
          >
            <Building className="h-4 w-4" />
            <span>🏛️ จัดการแผนกวิชา & งาน</span>
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-pink-300 border border-purple-500/30">
              {departments.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("albums");
              fetchAdminAlbums();
            }}
            className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
              activeTab === "albums" || activeTab === "orphans"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-purple-400 hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>🖼️ จัดการอัลบั้ม & ภาพถ่าย ({stats?.totalAlbums || adminAlbums.length})</span>
            {orphanAlbums.length > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-500/30">
                ค้างผูก {orphanAlbums.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("newsletter")}
            className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
              activeTab === "newsletter"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-purple-400 hover:text-white"
            }`}
          >
            <Newspaper className="h-4 w-4" />
            <span>📰 จัดทำภาพข่าวแผ่นเดียว</span>
            <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[9px] font-mono text-pink-300 border border-pink-500/30">
              ใหม่
            </span>
          </button>

          {currentUser?.role !== "PR_STAFF" && (
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
          )}

          <button
            onClick={() => {
              setActiveTab("pr_report");
              fetchWatermarkInfo();
            }}
            className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
              activeTab === "pr_report"
                ? "border-pink-500 text-pink-300"
                : "border-transparent text-purple-400 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>รายงานผลงานประชาสัมพันธ์ & การตั้งค่า</span>
          </button>

          {currentUser?.role !== "PR_STAFF" && (
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
          )}

          {currentUser?.role !== "PR_STAFF" && (
            <button
              onClick={() => {
                setActiveTab("line_notify");
                fetchLineSettings();
              }}
              className={`flex items-center gap-2 pb-3 px-4 transition-all border-b-2 ${
                activeTab === "line_notify"
                  ? "border-emerald-500 text-emerald-300"
                  : "border-transparent text-purple-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span>💬 ตั้งค่าแจ้งเตือน LINE กลุ่ม</span>
              {lineSettings?.isConfigured && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-mono border ${
                    lineSettings.isEnabled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {lineSettings.isEnabled ? "เปิดใช้งาน" : "ปิดชั่วคราว"}
                </span>
              )}
            </button>
          )}
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
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      รายการภาคเรียนทั้งหมดในระบบ ({academicTerms.length} ภาคเรียน)
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchAcademicTerms()}
                      disabled={isTermsLoading}
                      title="รีเฟรชข้อมูลภาคเรียน"
                      className="p-1 rounded-lg text-purple-400 hover:text-white hover:bg-purple-900/40 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isTermsLoading ? "animate-spin text-pink-400" : ""}`} />
                    </button>
                  </div>
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
                      {isTermsLoading && academicTerms.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-purple-300">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-pink-400" />
                            <span>กำลังโหลดข้อมูลภาคเรียนในระบบ...</span>
                          </td>
                        </tr>
                      ) : academicTerms.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-purple-400">
                            <Calendar className="h-8 w-8 mx-auto text-purple-500/60 mb-2" />
                            <div className="text-purple-300 font-medium mb-3">ยังไม่พบรายการภาคเรียนในระบบ หรือกำลังเชื่อมต่อฐานข้อมูล</div>
                            <button
                              type="button"
                              onClick={() => fetchAcademicTerms()}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-pink-600/30 hover:bg-pink-600 border border-pink-500/50 text-white text-xs font-semibold transition-all shadow-md"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>โหลดข้อมูลภาคเรียนใหม่</span>
                            </button>
                          </td>
                        </tr>
                      ) : (
                        academicTerms.map((term) => (
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
                                      term.budgetYear,
                                      term.note
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB: DEPARTMENTS & DIVISIONS MANAGEMENT */}
        {activeTab === "departments" && (
          <section className="space-y-6">
            {/* Banner: Department Management Overview */}
            <div className="relative overflow-hidden rounded-3xl border border-purple-700/50 bg-gradient-to-r from-[#1E0E46]/90 via-[#160B3A]/90 to-[#0F0728]/95 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      โครงสร้างองค์กร (Organizational Structure)
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
                    <Building className="h-7 w-7 text-pink-400" />
                    <span>จัดการแผนกวิชา & งานภายในวิทยาลัย</span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    กำหนดและเพิ่มแผนกวิชา/งาน เพื่อใช้เป็นตัวเลือกในการอัปโหลดภาพกิจกรรม การคัดกรองอัลบั้ม และการออกรายงานประชาสัมพันธ์
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-700/50 bg-[#13072E]/90 p-4 text-center shrink-0 shadow-lg">
                  <div className="text-[11px] text-purple-300 font-medium">แผนกวิชา/งาน ทั้งหมด</div>
                  <div className="text-3xl font-black text-cyan-300 mt-0.5">
                    {departments.length}
                  </div>
                  <div className="text-[10px] text-purple-400/80 mt-0.5">
                    แผนก/งานในระบบ
                  </div>
                </div>
              </div>
            </div>

            {/* Form & Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form: Add or Edit Department */}
              <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 space-y-4 backdrop-blur-md shadow-xl h-fit">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {editingDept ? (
                      <>
                        <Edit className="h-4 w-4 text-amber-400" />
                        <span>แก้ไขแผนกวิชา / งาน</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 text-pink-400" />
                        <span>เพิ่มแผนกวิชา / งานใหม่</span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-purple-300/80">
                    {editingDept
                      ? "แก้ไขข้อมูลแผนกวิชาหรือเปลี่ยนฝ่ายที่สังกัด"
                      : "เพิ่มแผนกวิชาหรือสายงานใหม่เข้าสู่ตัวเลือกของระบบ"}
                  </p>
                </div>

                <form
                  onSubmit={editingDept ? handleUpdateDepartment : handleAddDepartment}
                  className="space-y-3.5 text-xs"
                >
                  <div className="space-y-1">
                    <label className="text-purple-200 font-semibold">ชื่อแผนกวิชา / งาน *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น แผนกวิชาเทคโนโลยีธุรกิจดิจิทัล, งานแนะแนว..."
                      value={editingDept ? editingDept.name : newDeptName}
                      onChange={(e) => {
                        if (editingDept) {
                          setEditingDept({ ...editingDept, name: e.target.value });
                        } else {
                          setNewDeptName(e.target.value);
                        }
                      }}
                      className="w-full rounded-2xl border border-purple-800/50 bg-[#1B0E44] px-3.5 py-2.5 text-white placeholder-purple-400/50 focus:border-pink-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-purple-200 font-semibold">ฝ่ายที่สังกัด *</label>
                    <select
                      value={editingDept ? editingDept.divisionName : newDeptDivision}
                      onChange={(e) => {
                        if (editingDept) {
                          setEditingDept({ ...editingDept, divisionName: e.target.value });
                        } else {
                          setNewDeptDivision(e.target.value);
                        }
                      }}
                      className="w-full rounded-2xl border border-purple-800/50 bg-[#1B0E44] px-3.5 py-2.5 text-white focus:border-pink-500 focus:outline-none"
                    >
                      {NPC_DIVISIONS.map((div) => (
                        <option key={div} value={div} className="bg-[#140A32]">
                          {div}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingDept}
                      className="flex-1 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 py-2.5 font-bold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isSubmittingDept ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : editingDept ? (
                        <>
                          <Save className="h-4 w-4" />
                          <span>บันทึกการแก้ไข</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span>เพิ่มแผนกวิชา/งาน</span>
                        </>
                      )}
                    </button>

                    {editingDept && (
                      <button
                        type="button"
                        onClick={() => setEditingDept(null)}
                        className="rounded-full border border-purple-700/50 bg-purple-900/30 px-3 py-2.5 font-bold text-purple-300 hover:text-white hover:bg-purple-900/50 transition-all"
                      >
                        ยกเลิก
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Table: All Departments & Works */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-300/80">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      รายการแผนกวิชาและงาน ({departments.length} รายการ)
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchDepartments()}
                      disabled={isDepartmentsLoading}
                      title="รีเฟรชข้อมูล"
                      className="p-1 rounded-lg text-purple-400 hover:text-white hover:bg-purple-900/40 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isDepartmentsLoading ? "animate-spin text-pink-400" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDepartments}
                      title="คืนค่าเริ่มต้น"
                      className="text-[10px] text-purple-400/70 hover:text-pink-300 transition-colors ml-2 underline underline-offset-2"
                    >
                      คืนค่าเริ่มต้น
                    </button>
                  </div>

                  {/* Search box */}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-purple-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาแผนกวิชา / งาน..."
                      value={deptSearchQuery}
                      onChange={(e) => setDeptSearchQuery(e.target.value)}
                      className="w-full sm:w-60 rounded-full border border-purple-800/50 bg-[#1B0E44] py-1.5 pl-8 pr-3 text-xs text-white placeholder-purple-400/50 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-purple-800/40 bg-[#140A32]/85 shadow-xl backdrop-blur-md">
                  <table className="w-full text-left text-xs text-purple-200">
                    <thead className="border-b border-purple-800/50 bg-[#180C3E] text-purple-300 uppercase text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">ลำดับ</th>
                        <th className="py-3.5 px-4">ชื่อแผนกวิชา / งาน</th>
                        <th className="py-3.5 px-4">ฝ่ายที่สังกัด</th>
                        <th className="py-3.5 px-4 text-center">อัลบั้ม</th>
                        <th className="py-3.5 px-4 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-900/30">
                      {isDepartmentsLoading && departments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-purple-300">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-pink-400" />
                            <span>กำลังโหลดข้อมูลแผนกวิชา/งาน...</span>
                          </td>
                        </tr>
                      ) : departments.filter((d) =>
                          !deptSearchQuery.trim() ||
                          d.name.toLowerCase().includes(deptSearchQuery.toLowerCase()) ||
                          d.divisionName.toLowerCase().includes(deptSearchQuery.toLowerCase())
                        ).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-purple-400">
                            <Building className="h-8 w-8 mx-auto text-purple-500/60 mb-2" />
                            <div className="text-purple-300 font-medium">ไม่พบแผนกวิชา/งานที่ค้นหา</div>
                          </td>
                        </tr>
                      ) : (
                        departments
                          .filter((d) =>
                            !deptSearchQuery.trim() ||
                            d.name.toLowerCase().includes(deptSearchQuery.toLowerCase()) ||
                            d.divisionName.toLowerCase().includes(deptSearchQuery.toLowerCase())
                          )
                          .map((dept, index) => {
                            const isDivAcademic = dept.divisionName === "ฝ่ายวิชาการ";
                            const isDivResource = dept.divisionName === "ฝ่ายบริหารทรัพยากร";
                            const isDivStudent = dept.divisionName === "ฝ่ายกิจการนักเรียนนักศึกษา";

                            const badgeColor = isDivAcademic
                              ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                              : isDivResource
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              : isDivStudent
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/30";

                            return (
                              <tr
                                key={dept.id || dept.name}
                                className={`transition-colors ${
                                  editingDept?.id === dept.id
                                    ? "bg-purple-900/40"
                                    : "hover:bg-[#1C0E46]/50"
                                }`}
                              >
                                <td className="py-3 px-4 text-center font-mono text-purple-400/80">
                                  {index + 1}
                                </td>
                                <td className="py-3 px-4 font-bold text-white">
                                  <span>{dept.name}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${badgeColor}`}
                                  >
                                    {dept.divisionName}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-bold text-pink-300">
                                  {dept.albumCount || 0}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingDept(dept);
                                        window.scrollTo({ top: 350, behavior: "smooth" });
                                      }}
                                      title="แก้ไข"
                                      className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-800/40 transition-colors"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                      title="ลบ"
                                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 1: ALBUMS & PHOTOS CRUD MANAGER */}
        {(activeTab === "albums" || activeTab === "orphans") && (
          <section className="space-y-5 animate-fadeIn">
            {/* Header & Filter Toolbar Card */}
            <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-pink-400" />
                    <span>ระบบจัดการคลังอัลบั้มและภาพถ่ายกิจกรรม (Album & Media CRUD Manager)</span>
                  </h3>
                  <p className="text-xs text-purple-300/80 mt-0.5">
                    บริหารจัดการ แก้ไขรายละเอียดอัลบั้ม ลบอัลบั้ม คัดเลือกภาพหน้าปก และจัดการภาพถ่ายรายรูป
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fetchAdminAlbums()}
                    disabled={isAdminAlbumsLoading}
                    className="flex items-center gap-1.5 rounded-2xl border border-purple-700/60 bg-[#1C0E46] px-3.5 py-2 text-xs font-semibold text-purple-200 hover:text-white hover:bg-purple-800/50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isAdminAlbumsLoading ? "animate-spin" : ""}`} />
                    <span>รีเฟรช</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ อัปโหลดอัลบั้มใหม่</span>
                  </button>
                </div>
              </div>

              {/* Filter Controls Row */}
              <div className="pt-3 border-t border-purple-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                  <input
                    type="text"
                    value={albumSearchQuery}
                    onChange={(e) => {
                      setAlbumSearchQuery(e.target.value);
                      fetchAdminAlbums({ q: e.target.value });
                    }}
                    placeholder="ค้นหาชื่อกิจกรรม, รหัสอัลบั้ม (PRJ/RTN), ชื่อครู..."
                    className="w-full rounded-2xl border border-purple-800/50 bg-[#0E0624] pl-10 pr-9 py-2.5 text-xs text-white placeholder-purple-400/50 focus:border-pink-500 focus:outline-none transition-all"
                  />
                  {albumSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlbumSearchQuery("");
                        fetchAdminAlbums({ q: "" });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Dropdowns & Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Pills */}
                  <div className="flex items-center rounded-2xl border border-purple-800/50 bg-[#0E0624] p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAlbumFilterType("all");
                        fetchAdminAlbums({ filterType: "all" });
                      }}
                      className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                        albumFilterType === "all"
                          ? "bg-pink-500 text-white shadow-sm"
                          : "text-purple-300 hover:text-white"
                      }`}
                    >
                      ทั้งหมด ({adminAlbums.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAlbumFilterType("orphans");
                        fetchAdminAlbums({ filterType: "orphans" });
                      }}
                      className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                        albumFilterType === "orphans"
                          ? "bg-amber-500 text-black font-bold shadow-sm"
                          : "text-purple-300 hover:text-white"
                      }`}
                    >
                      ค้างผูกโครงการ ({orphanAlbums.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAlbumFilterType("linked");
                        fetchAdminAlbums({ filterType: "linked" });
                      }}
                      className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                        albumFilterType === "linked"
                          ? "bg-cyan-500 text-black font-bold shadow-sm"
                          : "text-purple-300 hover:text-white"
                      }`}
                    >
                      ผูกโครงการแล้ว
                    </button>
                  </div>

                  {/* Album Type Filter */}
                  <select
                    value={albumTypeFilter}
                    onChange={(e) => {
                      setAlbumTypeFilter(e.target.value);
                      fetchAdminAlbums({ albumType: e.target.value });
                    }}
                    className="rounded-2xl border border-purple-800/50 bg-[#0E0624] px-3 py-2 text-white text-[11px] focus:border-pink-500 focus:outline-none"
                  >
                    <option value="" className="bg-[#140A32]">ทุกประเภท</option>
                    <option value="ROUTINE" className="bg-[#140A32]">ROUTINE (งานประจำ)</option>
                    <option value="PROJECT" className="bg-[#140A32]">PROJECT (โครงการ)</option>
                    <option value="ADHOC" className="bg-[#140A32]">ADHOC (เฉพาะกิจ)</option>
                    <option value="PORTFOLIO" className="bg-[#140A32]">PORTFOLIO (คลังภาพ)</option>
                  </select>

                  {/* Department Filter */}
                  <select
                    value={albumDeptFilter}
                    onChange={(e) => {
                      setAlbumDeptFilter(e.target.value);
                      fetchAdminAlbums({ departmentName: e.target.value });
                    }}
                    className="rounded-2xl border border-purple-800/50 bg-[#0E0624] px-3 py-2 text-white text-[11px] focus:border-pink-500 focus:outline-none max-w-[150px] truncate"
                  >
                    <option value="" className="bg-[#140A32]">ทุกแผนก/งาน</option>
                    {departments.map((d) => (
                      <option key={d.id || d.name} value={d.name} className="bg-[#140A32]">
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Albums Table */}
            <div className="overflow-x-auto rounded-3xl border border-purple-800/40 bg-[#140A32]/85 shadow-xl backdrop-blur-md">
              <table className="w-full text-left text-xs text-purple-200">
                <thead className="border-b border-purple-800/50 bg-[#180C3E] text-purple-300 uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">รหัส / ภาพหน้าปก</th>
                    <th className="py-3.5 px-4">ชื่อกิจกรรม</th>
                    <th className="py-3.5 px-4">ประเภท & โครงการ</th>
                    <th className="py-3.5 px-4">ฝ่าย / แผนก</th>
                    <th className="py-3.5 px-4">วันที่จัด & ภาคเรียน</th>
                    <th className="py-3.5 px-4 text-center">ภาพในอัลบั้ม</th>
                    <th className="py-3.5 px-4 text-center">สถานะ</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {isAdminAlbumsLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-purple-300">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-pink-400" />
                        <span>กำลังโหลดข้อมูลอัลบั้ม...</span>
                      </td>
                    </tr>
                  ) : adminAlbums.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-purple-400">
                        <Layers className="h-8 w-8 mx-auto text-purple-500/50 mb-2" />
                        <div className="text-purple-300 font-medium">ไม่พบอัลบั้มตามเงื่อนไขที่ค้นหา</div>
                      </td>
                    </tr>
                  ) : (
                    adminAlbums.map((album) => {
                      const isUnlinked =
                        !album.projectId &&
                        (album.albumType === "ROUTINE" ||
                          album.albumType === "ADHOC" ||
                          album.albumType === "PORTFOLIO");

                      return (
                        <tr
                          key={album.id}
                          className="hover:bg-[#1C0E46]/50 transition-colors group"
                        >
                          {/* Cover Thumbnail & Album Code */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                onClick={() => setManagingPhotosAlbumId(album.id)}
                                className="relative h-12 w-16 rounded-xl overflow-hidden bg-[#180C3E] border border-purple-700/50 shrink-0 cursor-pointer group-hover:border-pink-500/60 transition-all shadow-sm"
                                title="คลิกเพื่อจัดการภาพในอัลบั้มนี้"
                              >
                                <img
                                  src={
                                    album.coverThumbnailUrl
                                      ? album.coverThumbnailUrl.startsWith("http")
                                        ? album.coverThumbnailUrl
                                        : `${getClientBasePath()}${
                                            album.coverThumbnailUrl.startsWith("/")
                                              ? album.coverThumbnailUrl
                                              : `/${album.coverThumbnailUrl}`
                                          }`
                                      : "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200"
                                  }
                                  alt=""
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-pink-300 text-[11px] block">
                                  {album.albumCode}
                                </span>
                                <Link
                                  href={`/albums/${album.albumCode}`}
                                  target="_blank"
                                  className="text-[10px] text-purple-400 hover:text-cyan-300 flex items-center gap-0.5 transition-colors"
                                >
                                  <span>เปิดดู</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              </div>
                            </div>
                          </td>

                          {/* Title & Description */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-bold text-white text-xs line-clamp-1" title={album.title}>
                              {album.title}
                            </div>
                            {album.description && (
                              <p className="text-[11px] text-purple-300/70 line-clamp-1 mt-0.5">
                                {album.description}
                              </p>
                            )}
                          </td>

                          {/* Album Type & Project linkage */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                                  album.albumType === "PROJECT"
                                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                    : album.albumType === "ROUTINE"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : album.albumType === "ADHOC"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}
                              >
                                {album.albumType}
                              </span>

                              {album.project ? (
                                <div className="text-[10px] text-purple-300 truncate max-w-[140px]" title={album.project.projectName}>
                                  🔗 {album.project.projectCode}
                                </div>
                              ) : (
                                <div className="text-[10px] text-amber-300/80 italic">
                                  ยังไม่ผูกโครงการ
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Division & Department */}
                          <td className="py-3.5 px-4 text-purple-300/80">
                            <div className="font-medium text-white text-[11px]">{album.divisionName}</div>
                            {album.departmentName && (
                              <div className="text-[10px] text-purple-400 mt-0.5">{album.departmentName}</div>
                            )}
                          </td>

                          {/* Event Date & Term */}
                          <td className="py-3.5 px-4 text-purple-300">
                            <div>
                              {album.eventDate
                                ? new Date(album.eventDate).toLocaleDateString("th-TH", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </div>
                            <div className="font-mono text-[10px] text-cyan-400 mt-0.5">
                              ภาคเรียน {album.semester}/{album.academicYear}
                            </div>
                          </td>

                          {/* Photo Count & Manage Button */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setManagingPhotosAlbumId(album.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/25 px-2.5 py-1 text-xs font-mono font-bold text-pink-300 hover:text-white transition-all shadow-sm active:scale-95"
                              title="คลิกเพื่อเปิดหน้าจัดการรูปภาพในอัลบั้มนี้"
                            >
                              <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
                              <span>{album.photoCount || 0} รูป</span>
                            </button>
                          </td>

                          {/* Visibility Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(album.id, album.isPublic)}
                              title={album.isPublic !== false ? "คลิกเพื่อซ่อน" : "คลิกเพื่อเผยแพร่"}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all active:scale-95 ${
                                album.isPublic !== false
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25"
                                  : "bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25"
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
                                  <span>ซ่อนไว้</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Manage Photos Button */}
                              <button
                                type="button"
                                onClick={() => setManagingPhotosAlbumId(album.id)}
                                className="flex items-center gap-1 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-700/60 px-2.5 py-1.5 text-[11px] font-semibold text-purple-200 hover:text-white transition-all active:scale-95"
                                title="จัดการรูปภาพในอัลบั้มนี้ (ลบ/แก้ไข/ตั้งหน้าปก)"
                              >
                                <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                                <span>จัดการภาพ</span>
                              </button>

                              {/* Edit Album Button */}
                              <button
                                type="button"
                                onClick={() => setEditingAlbum(album)}
                                className="p-1.5 rounded-xl text-purple-300 hover:text-white hover:bg-purple-800/50 transition-colors"
                                title="แก้ไขข้อมูลอัลบั้ม"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              {/* Share to LINE Button (Free, Unlimited) */}
                              <button
                                type="button"
                                onClick={async () => {
                                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                                  const url = `${origin}/npc_photosync/albums/${album.albumCode}?openExternalBrowser=1`;
                                  const eventDateStr = album.eventDate ? album.eventDate.slice(0, 10) : "";
                                  const shareText = `📢 [คลังภาพกิจกรรม วช.น่าน]\n📌 ${album.title}\n📅 วันที่: ${eventDateStr}\n📸 จำนวน: ${album.photoCount} ภาพ\n🌐 เปิดดูภาพและดาวน์โหลด:\n${url}\nhttps://service.npc.ac.th/`;
                                  const textForWebShare = `📢 [คลังภาพกิจกรรม วช.น่าน]\n📌 ${album.title}\n📅 วันที่: ${eventDateStr}\n📸 จำนวน: ${album.photoCount} ภาพ\n🌐 เปิดดูภาพและดาวน์โหลด:`;
                                  try {
                                    await navigator.clipboard.writeText(shareText);
                                  } catch {}

                                  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                                  if (isMobile) {
                                    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, "_blank");
                                  } else {
                                    const webShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(textForWebShare)}`;
                                    window.open(webShareUrl, "_blank");
                                    showAlert.success("คัดลอกข้อความแล้ว", "ระบบเปิดหน้าต่างแชร์ LINE พร้อมข้อความสรุป และคัดลอกข้อความลงคลิปบอร์ดเรียบร้อยแล้ว");
                                  }
                                }}
                                className="p-1.5 rounded-xl text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/50 transition-colors"
                                title="แชร์ลงกลุ่ม LINE (ฟรี ไม่จำกัดโควตา)"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>

                              {/* Link Project Button (if unlinked) */}
                              {isUnlinked && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAlbumToLink(album)}
                                  className="p-1.5 rounded-xl text-pink-300 hover:text-white hover:bg-pink-600/30 transition-colors"
                                  title="ผูกกับโครงการ SmartFlow"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </button>
                              )}

                              {/* Delete Album Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteAlbum(album.id, album.albumCode)}
                                className="p-1.5 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 transition-colors"
                                title="ลบอัลบั้มนี้อย่างถาวร"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}


        {/* TAB 2: SMARTFLOW INTEGRATION & API TESTER */}
        {activeTab === "smartflow" && currentUser?.role !== "PR_STAFF" && (
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

        {/* TAB: NEWSLETTER STUDIO (One-Page News & Social Bulletin) */}
        {activeTab === "newsletter" && (
          <NewsletterStudio
            currentTermName={
              currentTerm
                ? `ภาคเรียนที่ ${currentTerm.semester} ปีการศึกษา ${currentTerm.academicYear}`
                : undefined
            }
          />
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
                href={`${getClientBasePath()}/api/admin/pr-report?format=csv`}
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
              {/* College Watermark Management */}
              <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 space-y-4 backdrop-blur-md shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-pink-400" />
                      <span>ตราสัญลักษณ์และลายน้ำวิทยาลัย (Watermark)</span>
                    </h4>
                    <span className="flex items-center gap-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-pink-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
                      Sharp Pipeline Active
                    </span>
                  </div>
                  <p className="text-xs text-purple-300/80 mt-1">
                    ประทับอัตโนมัติที่มุมขวาล่างเมื่อดาวน์โหลดแบบ "พร้อม PR โซเชียล" พร้อมแถบชื่อสถานศึกษา
                  </p>
                </div>

                {/* Watermark Image Preview with Dark Transparent Grid Background */}
                <div className="relative rounded-2xl border border-purple-800/50 bg-[#0B051B] p-4 flex flex-col items-center justify-center min-h-[130px] overflow-hidden group">
                  {/* Subtle grid pattern background */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #2A175B 25%, transparent 25%), linear-gradient(-45deg, #2A175B 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2A175B 75%), linear-gradient(-45deg, transparent 75%, #2A175B 75%)",
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                    }}
                  />

                  {isUploadingWatermark ? (
                    <div className="flex flex-col items-center gap-2 py-4 text-cyan-300 z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
                      <span className="text-xs font-semibold">กำลังประมวลผลและอัปเดตลายน้ำ...</span>
                    </div>
                  ) : (
                    <div className="z-10 flex flex-col items-center justify-center">
                      <img
                        key={watermarkVersion}
                        src={`${getClientBasePath()}/assets/npc-watermark.png?v=${watermarkVersion}`}
                        alt="NPC College Watermark"
                        className="max-h-24 max-w-full object-contain filter drop-shadow-md transition-transform group-hover:scale-105 duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes(".svg")) {
                            target.src = `${getClientBasePath()}/assets/npc-watermark.svg?v=${watermarkVersion}`;
                          }
                        }}
                      />
                    </div>
                  )}

                  {watermarkInfo && (
                    <div className="absolute bottom-2 right-2 rounded-lg bg-purple-950/80 border border-purple-700/50 px-2 py-0.5 text-[9px] font-mono text-purple-300 backdrop-blur-md">
                      {watermarkInfo.width}×{watermarkInfo.height} px • {(watermarkInfo.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                </div>

                {/* Upload & Reset Action Buttons */}
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Upload File Button */}
                    <label
                      className={`flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer ${
                        isUploadingWatermark ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      <span>{isUploadingWatermark ? "กำลังอัปโหลด..." : "อัปโหลดภาพลายน้ำใหม่"}</span>
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg,image/svg+xml"
                        onChange={handleWatermarkUpload}
                        disabled={isUploadingWatermark}
                        className="hidden"
                      />
                    </label>

                    {/* Reset Button */}
                    <button
                      type="button"
                      onClick={handleResetWatermark}
                      disabled={isResettingWatermark || isUploadingWatermark}
                      title="คืนค่าลายน้ำเป็นตราสัญลักษณ์มาตรฐานเริ่มต้น"
                      className="flex items-center gap-1.5 rounded-2xl border border-purple-700/60 bg-[#1A0D3E] px-3.5 py-2.5 text-xs font-semibold text-purple-200 hover:text-white hover:bg-purple-800/40 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isResettingWatermark ? "animate-spin" : ""}`} />
                      <span>คืนค่าเริ่มต้น</span>
                    </button>
                  </div>

                  {/* Feedback Message */}
                  {watermarkMessage && (
                    <div
                      className={`flex items-center gap-2 rounded-xl p-2.5 text-xs border ${
                        watermarkMessage.type === "success"
                          ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                          : "bg-red-950/40 border-red-800/50 text-red-300"
                      }`}
                    >
                      {watermarkMessage.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      )}
                      <span>{watermarkMessage.text}</span>
                    </div>
                  )}

                  {/* Tip guide */}
                  <p className="text-[11px] text-purple-300/70 leading-relaxed">
                    💡 <strong>คำแนะนำ:</strong> รองรับไฟล์ <strong>PNG, WebP หรือ SVG</strong> แนะนำภาพพื้นหลังโปร่งใส (Transparent) ขนาดประมาณ 480 × 110 px ระบบจะปรับขนาดและประทับมุมขวาล่างของภาพให้อัตโนมัติ
                  </p>
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

        {/* TAB 4: GOOGLE DRIVE & CLOUD STORAGE SETTINGS (OAUTH 2.0) */}
        {activeTab === "google_drive" && currentUser?.role !== "PR_STAFF" && (
          <section className="space-y-6">
            {/* Status & Connection Overview Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-cyan-700/50 bg-gradient-to-r from-[#0C1A3E]/90 via-[#101235]/90 to-[#0A0620]/95 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-2.5 w-2.5 rounded-full ${
                        driveSettings?.isOAuthConnected
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      สถานะการเชื่อมต่อ Google Drive (โควตา 2 TB)
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                    <HardDrive className="h-7 w-7 text-cyan-400" />
                    <span>
                      {driveSettings?.isOAuthConnected
                        ? `เชื่อมต่อบัญชี Google แล้ว: ${driveSettings.oauthUserEmail || "Google Account"}`
                        : "ยังไม่ได้เชื่อมต่อ Google Drive"}
                    </span>
                  </h2>
                  <p className="text-xs text-purple-300/80 max-w-2xl leading-relaxed">
                    บันทึกภาพถ่ายกิจกรรมต้นฉบับ 100% ไม่บีบอัด เข้าสู่ Google Drive โฟลเดอร์ &ldquo;คลังภาพกิจกรรม วช.น่าน (NPC_PhotoSync)&rdquo; โดยตรงผ่าน Google OAuth 2.0 ไม่จำกัดโควตา Service Account
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

                  {driveSettings?.isOAuthConnected && (
                    <button
                      onClick={handleDisconnectOAuth}
                      disabled={isDisconnectingOAuth}
                      className="flex items-center gap-2 rounded-2xl bg-rose-500/20 border border-rose-500/40 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{isDisconnectingOAuth ? "กำลังตัด..." : "ตัดการเชื่อมต่อบัญชีนี้"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status details pills */}
              <div className="mt-6 pt-5 border-t border-purple-800/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-2xl bg-[#09051E]/70 border border-purple-800/40 p-3">
                  <div className="text-[10px] text-purple-400 uppercase font-semibold">บัญชี Google ที่ผูกไว้</div>
                  <div className="font-mono text-cyan-300 truncate mt-0.5" title={driveSettings?.oauthUserEmail}>
                    {driveSettings?.oauthUserEmail || "ยังไม่ได้ผูกบัญชี"}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#09051E]/70 border border-purple-800/40 p-3">
                  <div className="text-[10px] text-purple-400 uppercase font-semibold">โฟลเดอร์หลักเป้าหมาย (Root ID)</div>
                  <div className="font-mono text-pink-300 truncate mt-0.5" title={driveSettings?.rootFolderId}>
                    {driveSettings?.rootFolderId || "1hYayVdA3Bm7-HIWiutHcJ3j8PI808CwV"}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#09051E]/70 border border-purple-800/40 p-3">
                  <div className="text-[10px] text-purple-400 uppercase font-semibold">สถานะโควตาพื้นที่</div>
                  <div className="font-medium text-emerald-300 mt-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {driveSettings?.isOAuthConnected ? "ใช้งานโควตา 2 TB ของบัญชีผู้ใช้" : "รอการเชื่อมต่อ"}
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

            {/* Google OAuth Quick Guide */}
            <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-6 shadow-xl backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>คำแนะนำ: ขั้นตอนการเชื่อมต่อ Google Drive ผ่าน OAuth 2.0 (ทำเพียงครั้งเดียว)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40 text-[11px]">
                      1
                    </span>
                    <span className="font-bold text-white">สร้าง OAuth Client ID</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    เปิด <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">Google Cloud Console</a> เลือกโปรเจกต์ <code>npc-photosync</code> ไปที่ <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong> (เลือกประเภท <strong>Web application</strong>)
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/20 text-pink-400 font-bold border border-pink-500/40 text-[11px]">
                      2
                    </span>
                    <span className="font-bold text-white">ใส่ Redirect URI</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    คัดลอก <strong>Authorized Redirect URI</strong> ในกล่องสีม่วงด้านล่างนี้ ไปวางในช่อง Authorized redirect URIs ของ Google Cloud Console แล้วกด Create
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-800/40 bg-[#180C3E]/70 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 text-[11px]">
                      3
                    </span>
                    <span className="font-bold text-white">เชื่อมต่อในคลิกเดียว</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    นำ Client ID และ Client Secret มาวางในฟอร์มด้านล่าง แล้วกดปุ่ม <strong>&ldquo;เชื่อมต่อกับบัญชี Google Drive&rdquo;</strong> และกด Allow ให้สิทธิ์
                  </p>
                </div>
              </div>
            </div>

            {/* Google Drive Configuration Form */}
            <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-6 shadow-xl backdrop-blur-md">
              <form onSubmit={handleSaveDriveSettings} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Key className="h-5 w-5 text-pink-400" />
                    <span>ตั้งค่าและเชื่อมต่อบัญชี Google Drive (OAuth 2.0)</span>
                  </h3>
                  <p className="text-xs text-purple-300/80 mt-1">
                    เชื่อมต่อสิทธิ์เข้าถึง Google Drive ของคุณครูโดยตรงเพื่อรับส่งไฟล์ความละเอียดสูงเข้าสู่พื้นที่ 2 TB
                  </p>
                </div>

                {/* Authorized Redirect URI Box */}
                <div className="rounded-2xl border border-purple-700/50 bg-[#0E0628] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-pink-300 flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Authorized Redirect URI (นำไปวางใน Google Cloud Console):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const uri = `${getClientBasePath() ? "https://service.npc.ac.th/npc_photosync" : window.location.origin}/api/admin/settings/google-drive/oauth-callback`;
                        navigator.clipboard.writeText(uri);
                        showAlert.success("คัดลอกแล้ว", "คัดลอก Authorized Redirect URI เรียบร้อยแล้ว!");
                      }}
                      className="flex items-center gap-1 rounded-xl bg-purple-900/50 hover:bg-purple-800/60 border border-purple-700/60 px-3 py-1 text-[11px] font-semibold text-purple-200 transition-all active:scale-95"
                    >
                      <Copy className="h-3 w-3" />
                      <span>คัดลอกลิงก์</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-cyan-300 break-all select-all bg-[#080318] p-2.5 rounded-xl border border-purple-900/50">
                    https://service.npc.ac.th/npc_photosync/api/admin/settings/google-drive/oauth-callback
                  </div>
                </div>

                {/* Target Google Drive Root Folder ID or URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span>1. โฟลเดอร์หลัก Google Drive (Folder ID หรือ ลิงก์โฟลเดอร์) *</span>
                    <span className="text-[11px] font-normal text-cyan-300">
                      รองรับการวาง URL เต็ม เช่น https://drive.google.com/drive/folders/...
                    </span>
                  </label>
                  <input
                    type="text"
                    value={driveForm.rootFolderId}
                    onChange={(e) => setDriveForm({ ...driveForm, rootFolderId: e.target.value })}
                    placeholder="1hYayVdA3Bm7-HIWiutHcJ3j8PI808CwV หรือ วางลิงก์โฟลเดอร์"
                    className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] px-4 py-3 text-xs text-white placeholder-purple-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                    required
                  />
                  <p className="text-[11px] text-purple-400">
                    โฟลเดอร์ปัจจุบัน: <code>1hYayVdA3Bm7-HIWiutHcJ3j8PI808CwV</code> (คลังภาพกิจกรรม วช.น่าน) ภาพจะถูกแยกโฟลเดอร์ย่อยตามปีการศึกษาและหมวดหมู่ให้อัตโนมัติ
                  </p>
                </div>

                {/* OAuth Client ID */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white">
                    2. Google OAuth 2.0 Client ID *
                  </label>
                  <input
                    type="text"
                    value={driveForm.oauthClientId}
                    onChange={(e) => setDriveForm({ ...driveForm, oauthClientId: e.target.value })}
                    placeholder="เช่น 1234567890-abcdefg.apps.googleusercontent.com"
                    className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] px-4 py-3 text-xs text-white placeholder-purple-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                    required
                  />
                </div>

                {/* OAuth Client Secret */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span>3. Google OAuth 2.0 Client Secret *</span>
                    {driveSettings?.oauthClientSecretMasked && (
                      <span className="text-[11px] text-emerald-400 font-mono">
                        {driveSettings.oauthClientSecretMasked} (มีคีย์เดิมบันทึกอยู่แล้ว)
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={driveForm.oauthClientSecret}
                    onChange={(e) => setDriveForm({ ...driveForm, oauthClientSecret: e.target.value })}
                    placeholder={driveSettings?.oauthClientSecretMasked ? "ปล่อยว่างหากไม่ต้องการเปลี่ยน Client Secret" : "เช่น GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"}
                    className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] px-4 py-3 text-xs text-white placeholder-purple-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                </div>

                {/* Submit and Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-purple-900/40">
                  <button
                    type="button"
                    onClick={handleConnectOAuth}
                    disabled={isConnectingOAuth || isSavingDrive}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-3.5 text-xs font-bold text-white shadow-xl hover:shadow-pink-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isConnectingOAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                    <span>
                      {driveSettings?.isOAuthConnected
                        ? "🔄 เปลี่ยนบัญชี Google หรือเชื่อมต่อใหม่"
                        : "🔑 บันทึกและเชื่อมต่อกับบัญชี Google Drive"}
                    </span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingDrive}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-[#1C0F45] border border-purple-700/60 px-5 py-3.5 text-xs font-bold text-purple-200 hover:bg-[#281561] hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSavingDrive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>บันทึกการตั้งค่า</span>
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Tab 5: LINE Messaging API Settings */}
        {activeTab === "line_notify" && currentUser?.role !== "PR_STAFF" && (
          <section className="space-y-6 animate-fadeIn">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-[#0c2419] via-[#0b172a] to-[#140b2e] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                    <span>ระบบส่งข้อความแจ้งเตือนอัตโนมัติ (LINE Messaging API)</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    ตั้งค่าการแจ้งเตือน LINE Group Notify
                  </h2>
                  <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl leading-relaxed">
                    ส่งข้อความการ์ด Flex Message พร้อมรูปภาพหน้าปก รายละเอียดกิจกรรม และปุ่มดาวน์โหลดต้นฉบับ เข้ากลุ่ม LINE ของวิทยาลัยอัตโนมัติทันทีที่มีการอัปโหลดอัลบั้มภาพกิจกรรมใหม่
                  </p>
                </div>

                {/* Connection Status Badge */}
                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        lineSettings?.isConfigured && lineSettings?.isEnabled
                          ? "bg-emerald-400 shadow-[0_0_12px_#34d399]"
                          : lineSettings?.isConfigured && !lineSettings?.isEnabled
                          ? "bg-amber-400 shadow-[0_0_12px_#fbbf24]"
                          : "bg-rose-500 shadow-[0_0_12px_#f43f5e]"
                      }`}
                    />
                    <span className="text-xs font-bold text-white">
                      {lineSettings?.isConfigured && lineSettings?.isEnabled
                        ? "🟢 เปิดใช้งานพร้อมส่งเข้ากลุ่ม"
                        : lineSettings?.isConfigured && !lineSettings?.isEnabled
                        ? "🟡 ปิดพักการแจ้งเตือนชั่วคราว"
                        : "🔴 ยังไม่พร้อมใช้งาน (กรุณาตั้งค่า)"}
                    </span>
                  </div>
                  <span className="text-[11px] text-purple-400">
                    {lineSettings?.source === "database"
                      ? "บันทึกในฐานข้อมูลระบบ (System Settings)"
                      : lineSettings?.source === "environment"
                      ? "ดึงค่าจาก Environment Variables (.env)"
                      : "รอการบันทึก Token และ Group ID"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Helper / Step-by-Step Guide Accordion */}
            <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-6 shadow-xl backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>คำแนะนำ: 5 ขั้นตอนการตั้งค่าแจ้งเตือน LINE Messaging API เข้ากลุ่มวิทยาลัย</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                {/* Step 1 */}
                <div className="rounded-2xl border border-emerald-800/30 bg-[#0d1f1f]/60 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 text-[11px]">
                        1
                      </span>
                      <span className="font-bold text-white">สร้าง Channel</span>
                    </div>
                    <p className="text-purple-300/80 leading-relaxed text-[11px]">
                      เข้า <strong>LINE Developers</strong> สร้าง Provider แล้วเลือกสร้าง <strong>Messaging API Channel</strong>
                    </p>
                  </div>
                  <a
                    href="https://developers.line.biz/console/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    <span>ไปที่ LINE Developers</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Step 2 */}
                <div className="rounded-2xl border border-emerald-800/30 bg-[#0d1f1f]/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 font-bold border border-teal-500/40 text-[11px]">
                      2
                    </span>
                    <span className="font-bold text-white">ออก Access Token</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    ไปที่แท็บ <strong>Messaging API</strong> เลื่อนลงล่างสุดตรง <strong>Channel access token (long-lived)</strong> กด <strong>Issue</strong> เพื่อคัดลอก Token
                  </p>
                </div>

                {/* Step 3 */}
                <div className="rounded-2xl border border-emerald-800/30 bg-[#0d1f1f]/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40 text-[11px]">
                      3
                    </span>
                    <span className="font-bold text-white">เปิดรับเข้ากลุ่ม</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    ในหัวข้อ <strong>LINE Official Account features</strong> กด Edit ตรง <strong>Allow bot to join group chats</strong> แล้วเลือกเป็น <strong>Enabled</strong>
                  </p>
                </div>

                {/* Step 4 */}
                <div className="rounded-2xl border border-emerald-800/30 bg-[#0d1f1f]/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 text-[11px]">
                      4
                    </span>
                    <span className="font-bold text-white">เชิญบอทเข้ากลุ่ม</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    ค้นหาชื่อ LINE Official Account ของบอท แล้วกด <strong>เชิญเข้าร่วมกลุ่ม LINE</strong> ของวิทยาลัยที่ต้องการรับการแจ้งเตือน
                  </p>
                </div>

                {/* Step 5 */}
                <div className="rounded-2xl border border-emerald-800/30 bg-[#0d1f1f]/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/20 text-pink-400 font-bold border border-pink-500/40 text-[11px]">
                      5
                    </span>
                    <span className="font-bold text-white">หา Group ID & เทส</span>
                  </div>
                  <p className="text-purple-300/80 leading-relaxed text-[11px]">
                    ตั้งค่า Webhook URL ตามกล่องด้านล่าง แล้วพิมพ์ <code className="text-cyan-300">!id</code> ในกลุ่ม LINE บอทจะส่งเลข Group ID ให้ทันที นำมากรอกแล้วกดทดสอบ
                  </p>
                </div>
              </div>
            </div>

            {/* Webhook Assistant Card */}
            <div className="rounded-3xl border border-cyan-800/40 bg-gradient-to-r from-[#0d1e2e]/90 via-[#0d2235]/80 to-[#140b2e]/90 p-6 shadow-xl backdrop-blur-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-cyan-900/40">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bot className="h-4 w-4 text-cyan-400" />
                    <span>ผู้ช่วยตรวจจับ Group ID อัตโนมัติ (LINE Webhook URL)</span>
                  </h3>
                  <p className="text-xs text-cyan-200/80">
                    นำ Webhook URL นี้ไปใส่ใน LINE Developers Console (แท็บ Messaging API &rarr; Webhook settings &rarr; Use webhook = ON)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const url = getLineWebhookUrl();
                      navigator.clipboard.writeText(url);
                      showAlert.success("คัดลอกสำเร็จ", `คัดลอก Webhook URL:\n${url}`);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-all active:scale-95"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>คัดลอก Webhook URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchLineSettings}
                    disabled={isLineLoading}
                    className="flex items-center gap-1 rounded-xl bg-purple-900/40 border border-purple-700/50 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-800/50 transition-all"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLineLoading ? "animate-spin" : ""}`} />
                    <span>รีเฟรชสถานะ</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-cyan-300">🔗 Webhook Endpoint ของระบบนี้:</label>
                  <div className="p-3 rounded-2xl bg-[#07131e] border border-cyan-800/50 font-mono text-xs text-cyan-200 break-all select-all flex items-center justify-between">
                    <span>{getLineWebhookUrl()}</span>
                  </div>
                  <p className="text-[11px] text-purple-400">
                    💡 เมื่อตั้งค่า Webhook เสร็จ ให้พิมพ์คำว่า <code className="text-cyan-300 font-bold bg-purple-950/60 px-1 py-0.5 rounded">!id</code> หรือ <code className="text-cyan-300 font-bold bg-purple-950/60 px-1 py-0.5 rounded">id</code> ในกลุ่ม LINE บอทจะตอบกลับเลข Group ID ในกลุ่มให้ทันที
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-purple-300">🎯 Group ID ที่ตรวจพบล่าสุดจากบอท:</label>
                  <div className="p-3 rounded-2xl bg-[#09051E] border border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-mono text-xs text-white">
                      {lineSettings?.lastDetectedGroupId ? (
                        <span className="text-emerald-400 font-bold">{lineSettings.lastDetectedGroupId}</span>
                      ) : (
                        <span className="text-purple-400/60 italic">(ยังไม่มีการตรวจพบ - รอพิมพ์ !id ในกลุ่ม)</span>
                      )}
                    </span>
                    {lineSettings?.lastDetectedGroupId && (
                      <button
                        type="button"
                        onClick={() => {
                          setLineForm((prev) => ({
                            ...prev,
                            targetGroupId: lineSettings.lastDetectedGroupId || "",
                          }));
                          showAlert.success(
                            "นำ Group ID ไปใช้แล้ว",
                            `กรอก ${lineSettings.lastDetectedGroupId} ลงในแบบฟอร์มด้านล่างเรียบร้อยแล้ว`
                          );
                        }}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/30 transition-all shrink-0"
                      >
                        ⚡ นำไปใช้ในฟอร์มทันที
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-purple-400">
                    บอทจะบันทึก Group ID ให้อัตโนมัติเมื่อบอทถูกเชิญเข้ากลุ่ม หรือเมื่อมีสมาชิกในกลุ่มพิมพ์ข้อความ <code className="text-cyan-300">!id</code>
                  </p>
                </div>
              </div>
            </div>

            {/* LINE Configuration Form */}
            <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-6 sm:p-8 shadow-xl backdrop-blur-md">
              <form onSubmit={handleSaveLineSettings} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/40">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Send className="h-5 w-5 text-emerald-400" />
                      <span>แบบฟอร์มบันทึกการตั้งค่า LINE Messaging API</span>
                    </h3>
                    <p className="text-xs text-purple-300/80 mt-1">
                      สามารถบันทึกและแก้ไขข้อมูลได้ตลอดเวลา ข้อมูลจะถูกจัดเก็บลงฐานข้อมูลระบบอย่างปลอดภัย
                    </p>
                  </div>

                  {/* Enable / Disable Switch */}
                  <div className="flex items-center gap-3 bg-[#09051E] px-4 py-2 rounded-2xl border border-purple-800/40">
                    <span className="text-xs font-bold text-white">สถานะการแจ้งเตือน:</span>
                    <button
                      type="button"
                      onClick={() => setLineForm((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        lineForm.isEnabled ? "bg-emerald-500" : "bg-purple-900/60"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          lineForm.isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span
                      className={`text-xs font-bold ${
                        lineForm.isEnabled ? "text-emerald-400" : "text-purple-400"
                      }`}
                    >
                      {lineForm.isEnabled ? "เปิดใช้งาน (ON)" : "ปิดใช้งาน (OFF)"}
                    </span>
                  </div>
                </div>

                {/* Field 1: Channel Access Token */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-cyan-400" />
                      <span>1. Channel Access Token (Long-lived) *</span>
                    </label>
                    {lineSettings?.hasChannelAccessToken && (
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        ✓ มีค่าเดิมบันทึกอยู่แล้ว: {lineSettings.channelAccessTokenMasked}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showLineToken ? "text" : "password"}
                      value={lineForm.channelAccessToken}
                      onChange={(e) => setLineForm({ ...lineForm, channelAccessToken: e.target.value })}
                      placeholder={
                        lineSettings?.hasChannelAccessToken
                          ? "เว้นว่างไว้หากไม่ต้องการเปลี่ยน Token เดิม หรือวาง Token ใหม่เพื่อแทนที่..."
                          : "วาง Channel Access Token (Long-lived) ที่ได้จาก LINE Developers Console..."
                      }
                      className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] px-4 py-3 text-xs text-white placeholder-purple-500/50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLineToken(!showLineToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white p-1"
                    >
                      {showLineToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-purple-400">
                    ออกได้จากแท็บ <strong>Messaging API</strong> &rarr; เลื่อนลงไปหัวข้อ <strong>Channel access token (long-lived)</strong> &rarr; กด <strong>Issue</strong>
                  </p>
                </div>

                {/* Field 2: Target Group ID */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-pink-400" />
                      <span>2. Target Group ID (รหัสกลุ่ม LINE ที่ต้องการให้แจ้งเตือน) *</span>
                    </label>
                    {lineSettings?.targetGroupId && (
                      <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                        ค่าปัจจุบัน: {lineSettings.targetGroupId}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={lineForm.targetGroupId}
                    onChange={(e) => setLineForm({ ...lineForm, targetGroupId: e.target.value })}
                    placeholder="ตัวอย่างเช่น C1234567890abcdef1234567890abcdef..."
                    className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] px-4 py-3 text-xs text-white placeholder-purple-500/50 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all font-mono"
                    required
                  />
                  <p className="text-[11px] text-purple-400">
                    รหัสกลุ่ม LINE จะขึ้นต้นด้วยตัวอักษร <strong>C</strong> ตามด้วยตัวอักษรและตัวเลข 32 หลัก (สามารถหาได้โดยใช้คำสั่ง <code className="text-cyan-300">!id</code> ในกลุ่มหลังจากเปิด Webhook)
                  </p>
                </div>

                {/* Field 3: Channel Secret (Optional) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-purple-400" />
                      <span>3. Channel Secret (ไม่บังคับ - ใช้สำหรับการตรวจสอบความปลอดภัยของ Webhook)</span>
                    </label>
                    {lineSettings?.hasChannelSecret && (
                      <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                        ✓ มีค่าเดิมบันทึกอยู่แล้ว
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showLineSecret ? "text" : "password"}
                      value={lineForm.channelSecret}
                      onChange={(e) => setLineForm({ ...lineForm, channelSecret: e.target.value })}
                      placeholder="ดูได้จากแท็บ Basic settings ใน LINE Developers Console..."
                      className="w-full rounded-2xl border border-purple-800/40 bg-[#0A051E] px-4 py-3 text-xs text-white placeholder-purple-500/50 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-mono pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLineSecret(!showLineSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white p-1"
                    >
                      {showLineSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-purple-900/40">
                  <button
                    type="submit"
                    disabled={isSavingLine}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-7 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSavingLine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{isSavingLine ? "กำลังบันทึกการตั้งค่า..." : "💾 บันทึกการตั้งค่า LINE"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestLinePush}
                    disabled={isTestingLine || (!lineSettings?.hasChannelAccessToken && !lineForm.channelAccessToken)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-700 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-pink-500/20 hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isTestingLine ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>{isTestingLine ? "กำลังส่งข้อความ..." : "🚀 ส่งข้อความทดสอบเข้ากลุ่ม LINE (Test Push)"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Notification Preview Card */}
            <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/60 p-6 shadow-xl backdrop-blur-md">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Info className="h-4 w-4 text-cyan-400" />
                <span>ตัวอย่างรูปแบบข้อความ Flex Message ที่ระบบจะแจ้งเตือนเข้ากลุ่ม LINE</span>
              </h3>

              <div className="max-w-sm mx-auto rounded-3xl overflow-hidden border border-emerald-500/30 bg-[#0d141e] shadow-2xl">
                {/* Header Mock */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-emerald-200">
                    NPC PHOTOSYNC • วิทยาลัยสารพัดช่างน่าน
                  </div>
                  <div className="text-sm font-black mt-1">📸 มีอัลบั้มภาพกิจกรรมใหม่!</div>
                </div>

                {/* Body Mock */}
                <div className="p-4 space-y-3 bg-[#111927] text-white">
                  <div className="text-xs font-bold text-cyan-300">
                    โครงการอบรมเชิงปฏิบัติการพัฒนาทักษะปัญญาประดิษฐ์ (AI)
                  </div>
                  <div className="space-y-1 text-[11px] text-gray-300 border-l-2 border-emerald-500 pl-3">
                    <div>🏢 <strong>หน่วยงาน:</strong> แผนกวิชาเทคโนโลยีสารสนเทศ</div>
                    <div>📂 <strong>ประเภท:</strong> 01_โครงการตามแผน</div>
                    <div>📅 <strong>วันที่:</strong> 18 ตุลาคม 2569</div>
                    <div>🖼️ <strong>จำนวนรูปภาพ:</strong> 45 ภาพ</div>
                  </div>
                  <div className="h-32 w-full rounded-xl bg-purple-900/30 border border-purple-700/40 flex items-center justify-center text-xs text-purple-300">
                    [รูปภาพหน้าปกกิจกรรม]
                  </div>
                </div>

                {/* Footer Mock */}
                <div className="p-3 bg-[#0c121d] border-t border-gray-800 flex gap-2">
                  <div className="flex-1 py-2 text-center text-[11px] font-bold rounded-xl bg-emerald-600 text-white">
                    ดูรูปภาพทั้งหมด
                  </div>
                  <div className="flex-1 py-2 text-center text-[11px] font-bold rounded-xl bg-purple-700 text-white">
                    ดาวน์โหลดต้นฉบับ
                  </div>
                </div>
              </div>
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

      {/* Quick Upload Modal */}
      <QuickUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchAdminAlbums();
          loadDashboardData();
        }}
      />

      {/* Edit Album Modal */}
      <EditAlbumModal
        isOpen={!!editingAlbum}
        onClose={() => setEditingAlbum(null)}
        album={editingAlbum}
        departments={departments}
        onSuccess={() => {
          fetchAdminAlbums();
          loadDashboardData();
        }}
      />

      {/* Manage Photos Modal */}
      <ManagePhotosModal
        isOpen={!!managingPhotosAlbumId}
        onClose={() => setManagingPhotosAlbumId(null)}
        albumId={managingPhotosAlbumId || ""}
        onAlbumUpdated={() => {
          fetchAdminAlbums();
          loadDashboardData();
        }}
      />
    </div>
  );
}
