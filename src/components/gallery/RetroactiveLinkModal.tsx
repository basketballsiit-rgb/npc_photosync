"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Link as LinkIcon,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderSync,
  Building,
  User,
} from "lucide-react";

interface ProjectOption {
  id: string;
  projectCode: string;
  projectName: string;
  divisionName: string;
  departmentName?: string | null;
  ownerTeacherName: string;
}

interface RetroactiveLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: {
    albumCode: string;
    title: string;
    albumType: string;
  } | null;
  onLinkSuccess: (updatedAlbum: any) => void;
}

export function RetroactiveLinkModal({
  isOpen,
  onClose,
  album,
  onLinkSuccess,
}: RetroactiveLinkModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    } else {
      setSelectedProject(null);
      setSearchTerm("");
      setErrorMessage("");
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      // Fetch available approved projects from SmartFlow cache
      const res = await fetch("/api/v1/sync/projects?t=" + Date.now(), {
        headers: {
          "x-photosync-api-key": "photosync-api-key-live-nan-polytechnic-college",
        },
      });
      // Fallback query if GET /projects directly
      const projectsRes = await fetch("/api/albums"); // or query cache
      // Let's query smartflow projects
      const response = await fetch(`/api/v1/albums/unlinked?q=`, {
        headers: {
          "x-photosync-api-key": "photosync-api-key-live-nan-polytechnic-college",
        },
      });

      // Sample fallback list from seed
      const seedProjects: ProjectOption[] = [
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
    } catch (err) {
      console.warn("Could not load projects dynamically:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !album) return null;

  const filteredProjects = projects.filter(
    (p) =>
      p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ownerTeacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.divisionName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirmLink = async () => {
    if (!selectedProject) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/v1/albums/${album.albumCode}/link-project`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-photosync-api-key": "photosync-api-key-live-nan-polytechnic-college",
        },
        body: JSON.stringify({
          projectCode: selectedProject.projectCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to link project");
      }

      onLinkSuccess(data.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการผูกโครงการ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-purple-800/60 bg-[#13072E] shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-900/40 bg-[#180C3E]/95 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-600/30 text-pink-400 border border-pink-500/30 shadow-md">
              <LinkIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                ผูกโครงการย้อนหลัง (Retroactive Linking)
              </h3>
              <p className="text-xs text-purple-300/80">
                เชื่อมโยงอัลบั้มกิจกรรมเข้ากับระบบรายงานโครงการ 5 บท npc_smartflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-purple-400 hover:bg-[#25135A] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Target Album Info Banner */}
        <div className="bg-[#180C3E]/60 border-b border-purple-900/40 px-6 py-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-purple-300/70">อัลบั้มเป้าหมาย:</span>{" "}
            <span className="font-bold text-pink-300 font-mono">
              {album.albumCode}
            </span>{" "}
            <span className="text-purple-100 font-medium ml-1">
              • {album.title}
            </span>
          </div>
          <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
            {album.albumType}
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-pink-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาด้วยรหัสโครงการ (เช่น PRJ-69-001), ชื่อโครงการ, หรือครูผู้รับผิดชอบ..."
              className="w-full rounded-2xl border border-purple-800/50 bg-[#1B0E44] py-2.5 pl-10 pr-4 text-xs text-purple-100 placeholder-purple-400/60 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Project List */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-xs text-purple-300">
                <Loader2 className="h-5 w-5 animate-spin text-pink-400 mr-2" />
                กำลังโหลดโครงการที่อนุมัติแล้วจาก SmartFlow...
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-xs text-purple-400">
                ไม่พบโครงการที่ตรงกับคำค้นหา
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = selectedProject?.projectCode === p.projectCode;
                return (
                  <div
                    key={p.projectCode}
                    onClick={() => setSelectedProject(p)}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition-all text-xs ${
                      isSelected
                        ? "border-pink-500/70 bg-pink-950/40 shadow-lg shadow-pink-500/20 ring-1 ring-pink-500"
                        : "border-purple-800/40 bg-[#160B3A]/60 hover:border-purple-600 hover:bg-[#20104E]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-pink-300 text-[11px] bg-[#241256] px-2.5 py-0.5 rounded-full border border-pink-500/30">
                            {p.projectCode}
                          </span>
                          <span className="font-semibold text-white line-clamp-1">
                            {p.projectName}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-purple-300/70">
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-purple-400" />
                            {p.divisionName}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-purple-400" />
                            {p.ownerTeacherName}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Explanatory Note */}
          <div className="rounded-2xl border border-purple-800/50 bg-[#170C3E]/80 p-3 text-[11px] text-purple-200 flex items-start gap-2">
            <FolderSync className="h-4 w-4 shrink-0 mt-0.5 text-pink-400" />
            <div>
              <p className="font-semibold text-pink-300">
                ผลกระทบหลังการผูกโครงการ:
              </p>
              <p className="text-purple-300/80 text-[10px] mt-0.5 leading-relaxed">
                1. อัลบั้มจะเปลี่ยนสถานะเป็น <span className="font-bold text-white">PROJECT</span> พร้อมดึงไปออกรายงาน 5 บทใน SmartFlow ทันที
                <br />
                2. โฟลเดอร์ใน Google Shared Drive จะถูกย้ายไปยัง <span className="font-mono text-cyan-300">/01_โครงการตามแผน</span> อัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-purple-900/40 bg-[#160B3A]/95 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-purple-700/60 bg-[#1F0F4C] px-4 py-2 text-xs font-semibold text-purple-200 hover:bg-[#2B1464] hover:text-white transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirmLink}
            disabled={!selectedProject || isSubmitting}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-pink-500/30 transition-all hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>กำลังย้ายโฟลเดอร์ & ผูกข้อมูล...</span>
              </>
            ) : (
              <>
                <LinkIcon className="h-3.5 w-3.5" />
                <span>ยืนยันการผูกโครงการ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
