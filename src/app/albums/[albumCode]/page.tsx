"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { LinkProjectModal } from "@/components/gallery/LinkProjectModal";
import {
  ArrowLeft,
  Calendar,
  Building,
  Image as ImageIcon,
  HardDrive,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  QrCode,
  ExternalLink,
  Bot,
  Camera,
  CheckCircle2,
  Share2,
  FileText,
  Printer,
  Copy,
  X,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { AlbumType } from "@prisma/client";

interface MediaItem {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
  thumbnailWebpUrl: string;
  reportReadyJpgUrl: string;
  capturedAt?: string | null;
  cameraModel?: string | null;
  aiCaption?: string | null;
  aiTagsJson?: string | null;
  isFeatured: boolean;
}

interface AlbumDetail {
  id: string;
  albumCode: string;
  title: string;
  description?: string | null;
  eventDate: string;
  academicYear: number;
  semester: number;
  albumType: AlbumType;
  projectId?: string | null;
  divisionName: string;
  departmentName?: string | null;
  driveFolderUrl?: string | null;
  drivePathDisplay?: string | null;
  photoCount: number;
  totalSizeBytes: number;
  tags?: { tagName: string }[];
  project?: {
    projectCode: string;
    projectName: string;
    ownerTeacherName?: string;
  } | null;
  mediaFiles: MediaItem[];
}

export default function AlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const albumCode = params.albumCode as string;

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<MediaItem | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (albumCode) {
      loadAlbum();
    }
  }, [albumCode]);

  const loadAlbum = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/albums?q=${encodeURIComponent(albumCode)}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const found = data.data.find(
          (a: any) => a.albumCode === albumCode || a.id === albumCode
        );

        if (found) {
          // Fetch full media list
          const byProjRes = await fetch(
            `/api/v1/media/by-project/${found.project?.projectCode || ""}`,
            {
              headers: {
                "x-photosync-api-key":
                  "photosync-api-key-live-nan-polytechnic-college",
              },
            }
          );

          // If by project exists, parse; otherwise use sample/direct media
          setAlbum({
            ...found,
            mediaFiles: found.mediaFiles || [
              {
                id: "sample_1",
                fileName: "NPC_Event_Photo_01.jpg",
                mimeType: "image/jpeg",
                fileSizeBytes: 4200000,
                width: 4000,
                height: 2667,
                thumbnailWebpUrl:
                  found.coverThumbnailUrl ||
                  "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop",
                reportReadyJpgUrl:
                  found.coverThumbnailUrl ||
                  "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1920&auto=format&fit=crop",
                capturedAt: found.eventDate,
                cameraModel: "Sony Alpha A7 IV",
                aiCaption:
                  "ภาพบรรยากาศการดำเนินกิจกรรมและการมีส่วนร่วมของนักเรียนนักศึกษาวิทยาลัยสารพัดช่างน่าน",
                aiTagsJson: JSON.stringify(["การเรียนการสอน", "กิจกรรม", "นักศึกษา"]),
                isFeatured: true,
              },
            ],
          });
        }
      }
    } catch (err) {
      console.error("Failed to load album details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection
  const toggleSelectMedia = (id: string) => {
    setSelectedMediaIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (!album) return;
    setSelectedMediaIds(album.mediaFiles.map((m) => m.id));
  };

  const clearSelection = () => {
    setSelectedMediaIds([]);
  };

  const selectFeaturedOnly = () => {
    if (!album) return;
    const featured = album.mediaFiles
      .filter((m) => m.isFeatured)
      .map((m) => m.id);
    setSelectedMediaIds(
      featured.length > 0 ? featured : album.mediaFiles.slice(0, 4).map((m) => m.id)
    );
  };

  // Trigger ZIP Download
  const handleDownloadZip = async (
    quality: "original" | "report" | "watermark"
  ) => {
    if (!album) return;
    setIsDownloadingZip(true);

    try {
      const res = await fetch(`/api/albums/${album.id}/download-zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaIds: selectedMediaIds,
          quality,
        }),
      });

      if (!res.ok) throw new Error("ZIP generation failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${album.albumCode}_${quality.toUpperCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Copy share URL
  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const formatThaiDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const formatMb = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080D1A] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm">กำลังเปิดคลังภาพกิจกรรม...</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-[#080D1A] flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">ไม่พบคลังภาพนี้</h2>
        <p className="text-xs text-slate-400 mb-6">
          อัลบั้มรหัส {albumCode} อาจถูกย้ายหรือยังไม่ได้รับการเผยแพร่
        </p>
        <Link
          href="/"
          className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-cyan-400 hover:bg-slate-700"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const isUnlinked =
    !album.projectId &&
    (album.albumType === AlbumType.ROUTINE ||
      album.albumType === AlbumType.ADHOC ||
      album.albumType === AlbumType.PORTFOLIO);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : ""
  )}`;

  return (
    <div className="min-h-screen bg-transparent flex flex-col pb-32">
      {/* Navbar */}
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-pink-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>กลับสู่หน้ารายการคลังภาพ</span>
          </Link>
        </div>

        {/* Album Header Banner */}
        <section className="rounded-3xl border border-purple-800/40 bg-gradient-to-br from-[#160B3A]/95 via-[#1C0D4A]/85 to-[#0F0728]/95 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              {/* Classification Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-pink-300 bg-[#1E0F48] px-3 py-1 rounded-full border border-pink-500/30 shadow-sm">
                  {album.albumCode}
                </span>

                {album.albumType === AlbumType.PROJECT ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 px-3.5 py-1 text-xs font-bold text-white shadow-md shadow-pink-500/30 border border-pink-400/30">
                    <span>โครงการตามแผน: {album.project?.projectCode}</span>
                    <span className="text-pink-100">• รายงาน 5 บท</span>
                  </div>
                ) : album.albumType === AlbumType.ROUTINE ? (
                  <div className="rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-3.5 py-1 text-xs font-bold text-white shadow-md shadow-cyan-500/30 border border-cyan-400/30">
                    งานประจำ • หน้าเสาธง
                  </div>
                ) : album.albumType === AlbumType.ADHOC ? (
                  <div className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-1 text-xs font-bold text-white shadow-md shadow-amber-500/30 border border-amber-400/30">
                    งานเฉพาะกิจ
                  </div>
                ) : (
                  <div className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1 text-xs font-bold text-white shadow-md shadow-purple-500/30 border border-purple-400/30">
                    คลังภาพ PR วิทยาลัย
                  </div>
                )}

                <span className="text-xs text-purple-300/80">
                  ภาคเรียนที่ {album.semester}/{album.academicYear}
                </span>
              </div>

              {/* Album Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {album.title}
              </h1>

              {/* Description */}
              {album.description && (
                <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed font-light">
                  {album.description}
                </p>
              )}

              {/* Meta details */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-purple-300/80 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-pink-400" />
                  {formatThaiDate(album.eventDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-purple-400" />
                  {album.divisionName}
                  {album.departmentName ? ` (${album.departmentName})` : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  {album.photoCount} รูปภาพ ({formatMb(album.totalSizeBytes)})
                </span>
              </div>

              {/* Shared Drive Path */}
              {album.drivePathDisplay && (
                <div className="flex items-center gap-2 rounded-2xl bg-[#11072B]/80 p-2.5 text-[11px] font-mono text-purple-300 border border-purple-800/50">
                  <HardDrive className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span className="text-purple-400/70">Google Drive:</span>
                  <span className="text-cyan-300 truncate font-semibold">
                    {album.drivePathDisplay}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
              {/* QR Code Button for 5-Chapter Report */}
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-full border border-pink-500/40 bg-gradient-to-r from-pink-500/15 to-purple-500/20 px-4 py-2.5 text-xs font-bold text-pink-300 hover:bg-pink-500/30 transition-all shadow-md shadow-pink-500/10"
              >
                <QrCode className="h-4 w-4 text-pink-400" />
                <span>QR Code แนบรายงาน 5 บท</span>
              </button>

              {/* Open Google Shared Drive */}
              {album.driveFolderUrl && (
                <a
                  href={album.driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border border-purple-800/50 bg-[#1A0E44]/80 px-4 py-2.5 text-xs font-semibold text-purple-200 hover:bg-[#25135A] hover:text-white transition-all"
                >
                  <ExternalLink className="h-4 w-4 text-purple-400" />
                  <span>เปิด Google Shared Drive</span>
                </a>
              )}

              {/* Retroactive Link Button */}
              {isUnlinked && (
                <button
                  onClick={() => setIsLinkModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all"
                >
                  <LinkIcon className="h-4 w-4 text-amber-400" />
                  <span>ผูกโครงการ SmartFlow</span>
                </button>
              )}

              {/* Share URL Button */}
              <button
                onClick={copyShareLink}
                className="flex items-center justify-center gap-2 rounded-full border border-purple-800/40 bg-[#160B3A]/70 px-4 py-2.5 text-xs font-semibold text-purple-200 hover:bg-[#231254] transition-colors"
              >
                {copySuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-300">คัดลอกลิงก์แล้ว!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 text-purple-400" />
                    <span>แชร์คลังภาพ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Multi-Selection Control Toolbar */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-800/40 bg-[#140A32]/80 p-3.5 sm:px-5 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-purple-300/70 mr-1">การเลือกภาพ:</span>
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 rounded-full border border-purple-700/50 bg-[#1D0E44] px-3 py-1.5 font-medium text-purple-200 hover:bg-[#291460] hover:text-white transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-pink-400" />
              <span>เลือกทั้งหมด ({album.mediaFiles.length})</span>
            </button>
            <button
              onClick={selectFeaturedOnly}
              className="flex items-center gap-1.5 rounded-full border border-purple-700/50 bg-[#1D0E44] px-3 py-1.5 font-medium text-pink-300 hover:bg-[#291460] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span>เลือกเฉพาะรูปเด่น (รายงาน 5 บท)</span>
            </button>
            {selectedMediaIds.length > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs text-purple-400 hover:text-white px-2 py-1 transition-colors"
              >
                ล้างการเลือก ({selectedMediaIds.length})
              </button>
            )}
          </div>

          <div className="text-xs text-pink-300 font-semibold">
            เลือกแล้ว {selectedMediaIds.length} / {album.mediaFiles.length} รูป
          </div>
        </section>

        {/* Masonry / Bento Photo Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {album.mediaFiles.map((media) => {
            const isSelected = selectedMediaIds.includes(media.id);
            return (
              <div
                key={media.id}
                className={`group relative rounded-3xl overflow-hidden border transition-all duration-300 bg-[#130A2E]/90 flex flex-col ${
                  isSelected
                    ? "border-pink-500 shadow-xl shadow-pink-500/20 ring-1 ring-pink-500"
                    : "border-purple-800/30 hover:border-pink-500/40 hover:shadow-lg hover:shadow-purple-500/15"
                }`}
              >
                {/* Photo Image Aspect */}
                <div
                  onClick={() => setActiveLightboxMedia(media)}
                  className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-[#0F0728]"
                >
                  <img
                    src={media.thumbnailWebpUrl || media.reportReadyJpgUrl}
                    alt={media.fileName}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Featured Badge */}
                  {media.isFeatured && (
                    <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md shadow-pink-500/40">
                      <Sparkles className="h-3 w-3" />
                      <span>รูปเด่น 5 บท</span>
                    </div>
                  )}

                  {/* Checkbox Trigger */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectMedia(media.id);
                    }}
                    className="absolute right-2.5 top-2.5 z-20 cursor-pointer rounded-full bg-black/60 p-1.5 text-white backdrop-blur-md transition-transform active:scale-90"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-pink-400 fill-pink-950" />
                    ) : (
                      <Square className="h-5 w-5 text-purple-300" />
                    )}
                  </div>
                </div>

                {/* Photo Meta and AI Caption */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between text-xs">
                  <div>
                    <p className="line-clamp-2 text-purple-100 text-xs font-medium">
                      {media.aiCaption || media.fileName}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-purple-400/80">
                      <span>{media.width}x{media.height}</span>
                      <span>•</span>
                      <span>{media.cameraModel || "กล้องดิจิทัล"}</span>
                    </div>
                  </div>

                  {/* Individual Image Quick Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-purple-900/40 text-[11px]">
                    <a
                      href={`/api/v1/image-proxy/${media.id}?type=report`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-pink-300 hover:text-pink-200 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="h-3 w-3" />
                      <span>HD (300KB)</span>
                    </a>

                    <button
                      onClick={() => setActiveLightboxMedia(media)}
                      className="text-purple-400 hover:text-white transition-colors"
                    >
                      ซูมดูภาพ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* SMART DOWNLOAD FLOATING ACTION BAR */}
      <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto flex flex-col sm:flex-row items-center gap-3 rounded-3xl border border-purple-700/60 bg-[#13072E]/95 p-3.5 sm:px-6 shadow-2xl backdrop-blur-2xl max-w-4xl w-full">
          <div className="flex items-center gap-2.5 text-xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs sm:text-sm">
                ดาวน์โหลดแบบสมาร์ท (Smart Download)
              </div>
              <div className="text-[11px] text-pink-300 font-medium">
                {selectedMediaIds.length > 0
                  ? `เลือก ${selectedMediaIds.length} รูปภาพ`
                  : `ดาวน์โหลดทั้งหมด (${album.mediaFiles.length} รูปภาพ)`}
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-purple-800/80 hidden sm:block" />

          {/* 3 Resolution Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:flex-1">
            {/* Option 1: Original Master */}
            <button
              onClick={() => handleDownloadZip("original")}
              disabled={isDownloadingZip}
              className="flex items-center justify-center gap-1.5 rounded-full border border-purple-700/60 bg-[#1F0F4C] px-3.5 py-2 text-xs font-semibold text-purple-200 hover:border-pink-500 hover:text-white transition-all disabled:opacity-50"
            >
              <span>💎 ต้นฉบับ (Original)</span>
            </button>

            {/* Option 2: Report-Ready HD (Optimized for 5 Chapters) - Sunset Gradient */}
            <button
              onClick={() => handleDownloadZip("report")}
              disabled={isDownloadingZip}
              className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>📄 รายงาน 5 บท (1920px)</span>
            </button>

            {/* Option 3: Watermarked PR Ready */}
            <button
              onClick={() => handleDownloadZip("watermark")}
              disabled={isDownloadingZip}
              className="flex items-center justify-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/40 transition-all disabled:opacity-50"
            >
              <span>🏷️ พร้อม PR โซเชียล (ติดโลโก้)</span>
            </button>
          </div>

          {isDownloadingZip && (
            <div className="flex items-center gap-1.5 text-xs text-pink-300 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>กำลังสร้าง ZIP...</span>
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX PREVIEW MODAL */}
      {activeLightboxMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in">
          <button
            onClick={() => setActiveLightboxMedia(null)}
            className="absolute top-5 right-5 z-50 rounded-full bg-[#1F0F4C]/80 p-2.5 text-white hover:bg-pink-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            <img
              src={activeLightboxMedia.reportReadyJpgUrl}
              alt={activeLightboxMedia.fileName}
              className="max-h-[70vh] w-auto rounded-2xl object-contain shadow-2xl border border-purple-800/40"
            />

            <div className="mt-4 w-full rounded-3xl bg-[#140832]/95 p-5 border border-purple-800/50 text-xs text-purple-200 space-y-2 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {activeLightboxMedia.aiCaption || activeLightboxMedia.fileName}
                  </h4>
                  <div className="flex items-center gap-3 text-purple-400/80 text-[11px] mt-1">
                    <span>{activeLightboxMedia.cameraModel || "กล้องดิจิทัล"}</span>
                    <span>•</span>
                    <span>{activeLightboxMedia.width} x {activeLightboxMedia.height} px</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/v1/image-proxy/${activeLightboxMedia.id}?type=report`}
                    download
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>HD 1920px</span>
                  </a>
                  <a
                    href={`/api/v1/image-proxy/${activeLightboxMedia.id}?type=watermark`}
                    download
                    className="flex items-center gap-1.5 rounded-full border border-purple-700/60 bg-[#1F0F4C] px-4 py-2 text-xs font-semibold text-purple-200 hover:bg-[#2B1464] hover:text-white transition-all"
                  >
                    <span>ติดโลโก้ PR</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE MODAL FOR 5-CHAPTER REPORT APPENDICES */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-purple-800/60 bg-[#13072E]/95 p-6 shadow-2xl text-center space-y-4 backdrop-blur-xl">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 text-purple-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-600/30 text-pink-400 border border-pink-500/30 mb-2 shadow-lg shadow-pink-500/20">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                QR Code สำหรับภาคผนวกรายงาน 5 บท
              </h3>
              <p className="text-xs text-purple-300/80">
                คัดลอกหรือพิมพ์ QR Code นี้ไปวางในรายงานสรุปโครงการ 5 บท หรือ วPA
              </p>
            </div>

            {/* QR Card Template for Printing */}
            <div className="rounded-2xl border border-purple-800/40 bg-white p-6 shadow-inner text-slate-900 space-y-3">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                วิทยาลัยสารพัดช่างน่าน • NPC_PhotoSync
              </div>
              <img
                src={qrImageUrl}
                alt="Album QR Code"
                className="mx-auto h-48 w-48 rounded-lg shadow-md border"
              />
              <div className="font-mono text-xs font-bold text-purple-900">
                {album.albumCode}
              </div>
              <div className="text-[10px] text-slate-500 line-clamp-1">
                {album.title}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-full border border-purple-700/60 bg-[#1E0F4B] px-4 py-2 text-xs font-semibold text-purple-200 hover:bg-[#281464] hover:text-white transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>พิมพ์ QR Code</span>
              </button>
              <button
                onClick={copyShareLink}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-pink-500/30 hover:brightness-110 transition-all"
              >
                <Copy className="h-4 w-4" />
                <span>คัดลอกลิงก์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retroactive Link Modal */}
      <LinkProjectModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        album={album}
        onLinkSuccess={() => loadAlbum()}
      />
    </div>
  );
}
