"use client";

import React, { useRef, useState } from "react";
import {
  X,
  Send,
  Copy,
  Download,
  Check,
  Share2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Info,
  Calendar,
  Camera,
  Building2,
} from "lucide-react";
import { toPng, toBlob } from "html-to-image";
import { showAlert } from "@/lib/sweetalert";
import { AlbumType } from "@prisma/client";

interface LineShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: {
    id: string;
    albumCode: string;
    title: string;
    description?: string | null;
    eventDate: string;
    albumType: AlbumType;
    divisionName: string;
    departmentName?: string | null;
    photoCount: number;
    totalSizeBytes: number | bigint;
    project?: {
      projectCode: string;
      projectName: string;
      ownerTeacherName?: string;
    } | null;
    mediaFiles?: Array<{
      id: string;
      thumbnailUrl?: string | null;
      mediumUrl?: string | null;
      originalUrl: string;
      isFeatured?: boolean;
    }>;
  };
}

const ALBUM_TYPE_BADGES: Record<
  AlbumType,
  { label: string; bgColor: string; textColor: string }
> = {
  [AlbumType.PROJECT]: {
    label: "โครงการตามแผน (SmartFlow)",
    bgColor: "#0891B2",
    textColor: "#FFFFFF",
  },
  [AlbumType.ROUTINE]: {
    label: "งานประจำ / หน้าเสาธง",
    bgColor: "#10B981",
    textColor: "#FFFFFF",
  },
  [AlbumType.ADHOC]: {
    label: "กิจกรรมเร่งด่วน / เฉพาะกิจ",
    bgColor: "#F59E0B",
    textColor: "#FFFFFF",
  },
  [AlbumType.PORTFOLIO]: {
    label: "คลังภาพ PR วิทยาลัย",
    bgColor: "#6366F1",
    textColor: "#FFFFFF",
  },
};

function formatThaiDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const thaiMonths = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
    ];
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const thaiYear = d.getFullYear() + 543;
    return `${day} ${month} ${thaiYear}`;
  } catch {
    return dateStr;
  }
}

function formatFileSize(bytes: number | bigint): string {
  const num = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (!num || num === 0) return "0 MB";
  const mb = num / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export default function LineShareModal({
  isOpen,
  onClose,
  album,
}: LineShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedLinkOnly, setIsCopiedLinkOnly] = useState(false);

  if (!isOpen) return null;

  const basePath =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/npc_photosync")
      ? "/npc_photosync"
      : "";

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareUrl = currentUrl.includes("openExternalBrowser=1")
    ? currentUrl
    : `${currentUrl}${currentUrl.includes("?") ? "&" : "?"}openExternalBrowser=1`;

  const badge = ALBUM_TYPE_BADGES[album.albumType] || {
    label: "กิจกรรมวิทยาลัย",
    bgColor: "#0891B2",
    textColor: "#FFFFFF",
  };

  const thaiDateStr = formatThaiDate(album.eventDate);
  const sizeStr = formatFileSize(album.totalSizeBytes);

  // Cover image URL
  const featuredMedia = album.mediaFiles?.find((m) => m.isFeatured);
  const coverMedia = featuredMedia || album.mediaFiles?.[0];
  let coverUrl = "";
  if (coverMedia?.id) {
    // Prefer image-proxy API which includes Access-Control-Allow-Origin: * for clean canvas capture & avoids CORS taint
    coverUrl = `${basePath}/api/v1/image-proxy/${coverMedia.id}?type=report`;
  } else if (coverMedia?.thumbnailUrl) {
    const raw = coverMedia.thumbnailUrl;
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      coverUrl = raw;
    } else if (raw.startsWith("/npc_photosync/")) {
      coverUrl = raw;
    } else {
      coverUrl = `${basePath}${raw.startsWith("/") ? raw : `/${raw}`}`;
    }
  } else {
    coverUrl =
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80";
  }

  // Summary Text
  const summaryText = `📢 [คลังภาพกิจกรรม วช.น่าน]
📌 ${album.title}
📅 วันที่: ${thaiDateStr}
📸 จำนวน: ${album.photoCount} ภาพ (${sizeStr})
🏛️ หน่วยงาน: ${album.divisionName}${album.departmentName ? ` (${album.departmentName})` : ""}
${album.project ? `🔗 โครงการ: ${album.project.projectCode} ${album.project.projectName}\n` : ""}🌐 เปิดดูภาพและดาวน์โหลด:
${shareUrl}`;

  // 1. Copy Card as Image to Clipboard (Instant Ctrl+V into LINE)
  const handleCopyCardImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      // Generate PNG blob
      const blob = await toBlob(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });

      if (!blob) throw new Error("Could not create image blob");

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setIsCopiedImage(true);
        showAlert.toast("📸 คัดลอกรูปการ์ดแล้ว! กด Ctrl + V วางในห้องแชท LINE ได้ทันที", "success");
        setTimeout(() => setIsCopiedImage(false), 3000);
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `LINE_Card_${album.albumCode}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showAlert.toast("ดาวน์โหลดรูปภาพการ์ดแล้ว นำไปส่งใน LINE ได้ทันที", "info");
      }
    } catch (err) {
      console.error("Copy card error:", err);
      // Fallback: download PNG via dataUrl
      try {
        const dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 2 });
        const link = document.createElement("a");
        link.download = `LINE_Card_${album.albumCode}.png`;
        link.href = dataUrl;
        link.click();
        showAlert.toast("ดาวน์โหลดรูปภาพการ์ดแล้ว นำไปส่งใน LINE ได้ทันที", "info");
      } catch {
        showAlert.error("ไม่สามารถสร้างรูปภาพการ์ดได้", "กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Download PNG
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `LINE_Card_${album.albumCode}.png`;
      link.href = dataUrl;
      link.click();
      showAlert.toast("บันทึกรูปภาพการ์ดเรียบร้อยแล้ว", "success");
    } catch (err) {
      console.error("Download card error:", err);
      showAlert.error("ไม่สามารถบันทึกรูปภาพได้", "กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Open LINE App / Web Share (100% Free, Clickable Album Link)
  const handleOpenLineShare = () => {
    const isMobile =
      typeof navigator !== "undefined" &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      window.location.href = `https://line.me/R/msg/text/?${encodeURIComponent(summaryText)}`;
    } else {
      const lineWebShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(summaryText)}`;
      window.open(lineWebShareUrl, "_blank");
    }
  };

  // 4. Copy Only Album URL
  const handleCopyLinkOnly = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopiedLinkOnly(true);
      showAlert.toast("คัดลอกลิงก์อัลบั้มแล้ว! นำไปวางใต้รูปภาพใน LINE ได้ทันที 📋", "success");
      setTimeout(() => setIsCopiedLinkOnly(false), 2500);
    } catch {
      showAlert.error("ไม่สามารถคัดลอกลิงก์ได้", "กรุณาลองใหม่อีกครั้ง");
    }
  };

  // 5. Copy Formatted Text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setIsCopiedText(true);
      showAlert.toast("คัดลอกข้อความสรุปเรียบร้อยแล้ว", "success");
      setTimeout(() => setIsCopiedText(false), 2500);
    } catch {
      showAlert.error("ไม่สามารถคัดลอกข้อความได้", "กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl my-auto rounded-3xl border border-emerald-500/30 bg-[#0B1120] shadow-2xl shadow-emerald-500/10 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                แชร์สรุปเข้ากลุ่ม LINE
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LINE Flex Card
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ตัวอย่างการ์ดสรุปกิจกรรมแบบรูปภาพสวยงาม พร้อมช่องทางการส่งและแชร์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Card Preview (Exact replica of Image 1) */}
          <div className="md:col-span-6 flex flex-col items-center">
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5 self-start">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>ภาพตัวอย่างการ์ดที่จะแสดงใน LINE (Live Preview)</span>
            </div>

            {/* THE CARD COMPONENT (Rendered for export / copy) */}
            <div
              ref={cardRef}
              className="w-full max-w-[340px] rounded-2xl overflow-hidden border border-slate-700/80 bg-[#0F172A] shadow-2xl transition-all"
              style={{ fontFamily: "'Prompt', 'Sarabun', sans-serif" }}
            >
              {/* Top Section */}
              <div className="p-4 pb-3 bg-[#0F172A]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#38BDF8]">
                    วิทยาลัยสารพัดช่างน่าน
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    NPC_PhotoSync
                  </span>
                </div>

                <div className="mt-2 text-sm sm:text-[15px] font-bold text-[#F8FAFC] leading-snug line-clamp-3">
                  {album.title}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold text-white shrink-0"
                    style={{ backgroundColor: badge.bgColor }}
                  >
                    {badge.label}
                  </span>
                  <span className="text-xs text-[#94A3B8] font-mono shrink-0">
                    รหัส: {album.albumCode}
                  </span>
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative w-full aspect-video bg-slate-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt={album.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (coverMedia?.thumbnailUrl && !target.src.includes("thumbs")) {
                      const thumb = coverMedia.thumbnailUrl;
                      target.src = thumb.startsWith("http")
                        ? thumb
                        : `${basePath}${thumb.startsWith("/") ? thumb : `/${thumb}`}`;
                    } else if (!target.src.includes("unsplash")) {
                      target.src =
                        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80";
                    }
                  }}
                />
              </div>

              {/* Info Body */}
              <div className="p-4 bg-[#1E293B] space-y-2 text-xs">
                <div className="flex items-start">
                  <span className="w-2/5 text-[#94A3B8] flex items-center gap-1 shrink-0">
                    <Calendar className="h-3 w-3 text-[#94A3B8]" /> วันที่จัดกิจกรรม
                  </span>
                  <span className="w-3/5 text-[#F1F5F9] font-medium">
                    {thaiDateStr}
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="w-2/5 text-[#94A3B8] flex items-center gap-1 shrink-0">
                    <Camera className="h-3 w-3 text-[#94A3B8]" /> จำนวนภาพ / ขนาด
                  </span>
                  <span className="w-3/5 text-[#F1F5F9] font-medium">
                    {album.photoCount} รูป ({sizeStr})
                  </span>
                </div>

                <div className="flex items-start">
                  <span className="w-2/5 text-[#94A3B8] flex items-center gap-1 shrink-0">
                    <Building2 className="h-3 w-3 text-[#94A3B8]" /> หน่วยงาน
                  </span>
                  <span className="w-3/5 text-[#F1F5F9] font-medium leading-relaxed">
                    {album.divisionName}
                    {album.departmentName ? (
                      <span className="block text-[#CBD5E1]">
                        ({album.departmentName})
                      </span>
                    ) : null}
                  </span>
                </div>

                {album.project && (
                  <div className="flex items-start pt-1 border-t border-slate-700/50">
                    <span className="w-2/5 text-[#06B6D4] font-medium shrink-0">
                      🔗 ผูกโครงการ
                    </span>
                    <span className="w-3/5 text-[#38BDF8] font-medium leading-snug">
                      {album.project.projectCode} {album.project.projectName}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer Button (Image 1 style) & QR Code for Image Scans */}
              <div className="p-3 bg-[#0F172A] space-y-2.5">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all text-center"
                >
                  🌐 เปิดดูภาพและดาวน์โหลด
                </a>

                {/* QR Code inside card so recipients in LINE can tap & hold image to open album */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-white shrink-0 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}`}
                        alt="QR Code"
                        className="w-9 h-9"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      <div className="font-bold text-cyan-300">📱 สแกน QR หรือแตะค้างที่รูปภาพ</div>
                      <div className="text-slate-400 text-[9px] mt-0.5">เพื่อเปิดดูอัลบั้มและดาวน์โหลดภาพ</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 text-center">
              การ์ดดีไซน์มาตรฐาน LINE Flex Message วิทยาลัยสารพัดช่างน่าน
            </p>
          </div>

          {/* Right Column: Actions & Options */}
          <div className="md:col-span-6 flex flex-col gap-4">
            {/* Primary Action: Open & Share via LINE App (100% FREE, Zero Message Cost, Clickable in LINE) */}
            <div className="rounded-2xl border border-emerald-500/50 bg-[#06C755]/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-[#06C755]/20 text-[#06C755] mt-0.5 shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    แชร์เข้าแชท / กลุ่ม LINE โดยตรง
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      ฟรี 100% ไม่มีค่าบริการ
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    ส่งเข้ากลุ่มหรือแชท LINE ผ่านแอปพลิเคชันโดยตรง <strong>ไม่มีการคิดค่าใช้จ่ายหรือหักโควตาใดๆ</strong> และเมื่อส่งแล้วคนในกลุ่มสามารถ <strong>แตะที่การ์ดเพื่อเปิดเข้าดูอัลบั้มได้ทันที</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenLineShare}
                className="w-full py-3 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#06C755]/25 transition-all active:scale-[0.98]"
              >
                <ExternalLink className="h-4 w-4" />
                <span>📲 คลิกส่งเข้าห้องแชท / กลุ่ม LINE (กดแล้วเปิดอัลบั้มได้ทันที)</span>
              </button>
            </div>

            {/* Action 2: Copy Card as Image (With QR Code and quick link) */}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 mt-0.5 shrink-0">
                  <Copy className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    คัดลอกรูปภาพการ์ด (นำไปวาง Ctrl+V ในแชท)
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    ได้ภาพการ์ดสวยงามคมชัด โดยในภาพมี <strong>QR Code</strong> ในตัว ทำให้เพื่อนใน LINE สามารถ <strong>แตะค้างที่ภาพแล้วกด &ldquo;สแกน QR ในภาพ&rdquo;</strong> เพื่อเข้าหน้าอัลบั้มได้ทันที!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleCopyCardImage}
                  disabled={isExporting}
                  className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isCopiedImage ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>คัดลอกรูปแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>📸 คัดลอกรูปภาพการ์ด</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyLinkOnly}
                  className="py-2.5 px-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isCopiedLinkOnly ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-300">คัดลอกลิงก์แล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-cyan-400" />
                      <span>🔗 คัดลอกเฉพาะลิงก์ (วางใต้ภาพ)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleDownloadImage}
                  disabled={isExporting}
                  className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors py-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>บันทึกเป็นไฟล์ภาพ PNG ลงเครื่อง</span>
                </button>
              </div>
            </div>

            {/* Action 3: Copy Full Text Summary */}
            <div className="rounded-2xl border border-slate-800 bg-[#141C2E] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>ข้อความสรุปสำหรับส่งในแชท</span>
                </h4>
                <button
                  onClick={handleCopyText}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  {isCopiedText ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>คัดลอกทั้งหมด</span>
                    </>
                  )}
                </button>
              </div>

              {/* Text Preview box */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 font-mono leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap select-all">
                {summaryText}
              </div>
            </div>

            {/* Educational Tip */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                💡 <strong>คำแนะนำ:</strong> หากต้องการให้คนในกลุ่มกดเปิดดูอัลบั้มได้ทันที แนะนำให้ใช้ปุ่มสีเขียว <strong>&ldquo;ส่งเข้าห้องแชท / กลุ่ม LINE โดยตรง&rdquo;</strong> หรือหากส่งรูปภาพ ให้กดปุ่ม <strong>&ldquo;คัดลอกเฉพาะลิงก์&rdquo;</strong> ไปวางใต้ภาพอีก 1 บรรทัดครับ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
