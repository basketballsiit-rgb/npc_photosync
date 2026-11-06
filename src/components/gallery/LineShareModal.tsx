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
  const [isSendingLine, setIsSendingLine] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [autoSentSuccess, setAutoSentSuccess] = useState(false);

  if (!isOpen) return null;

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
  const coverUrl =
    coverMedia?.thumbnailUrl ||
    coverMedia?.mediumUrl ||
    coverMedia?.originalUrl ||
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80";

  // Summary Text
  const summaryText = `📢 [คลังภาพกิจกรรม วช.น่าน]
📌 ${album.title}
📅 วันที่: ${thaiDateStr}
📸 จำนวน: ${album.photoCount} ภาพ (${sizeStr})
🏛️ หน่วยงาน: ${album.divisionName}${album.departmentName ? ` (${album.departmentName})` : ""}
${album.project ? `🔗 โครงการ: ${album.project.projectCode} ${album.project.projectName}\n` : ""}🌐 เปิดดูภาพและดาวน์โหลด:
${shareUrl}`;

  // 1. Direct Push to LINE Group (Without opening LINE app)
  const handleAutoPushToLine = async () => {
    setIsSendingLine(true);
    try {
      const res = await fetch(`/api/albums/${album.id}/share-line`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setAutoSentSuccess(true);
        showAlert.toast("🚀 ส่งการ์ดสรุปเข้ากลุ่ม LINE สำเร็จเรียบร้อยแล้ว!", "success");
      } else {
        showAlert.error(
          "ไม่สามารถส่งเข้ากลุ่ม LINE ได้โดยตรง",
          data.error || "กรุณาตรวจสอบการตั้งค่า LINE Bot หรือสิทธิ์ในกลุ่ม LINE"
        );
      }
    } catch (err: any) {
      showAlert.error("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSendingLine(false);
    }
  };

  // 2. Copy Card as Image to Clipboard (Instant Ctrl+V into LINE)
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

  // 3. Download PNG
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

  // 4. Open LINE App / Web Share
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
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
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

              {/* Footer Button (Image 1 style) */}
              <div className="p-3 bg-[#0F172A]">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all text-center"
                >
                  🌐 เปิดดูภาพและดาวน์โหลด
                </a>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 text-center">
              การ์ดดีไซน์มาตรฐาน LINE Flex Message วิทยาลัยสารพัดช่างน่าน
            </p>
          </div>

          {/* Right Column: Actions & Options */}
          <div className="md:col-span-6 flex flex-col gap-4">
            {/* Action 1: Push directly into LINE group without opening LINE */}
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 mt-0.5">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    ส่งเข้ากลุ่ม LINE ผ่านระบบ (ไม่ต้องสลับไป LINE)
                    {autoSentSuccess && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold">
                        ส่งแล้ว
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    ระบบจะส่งการ์ด Flex Message (ตามภาพพรีวิว) เข้ากลุ่ม LINE ทางการของวิทยาลัยทันทีด้วยบอท NPC_PhotoSync
                  </p>
                </div>
              </div>

              <button
                onClick={handleAutoPushToLine}
                disabled={isSendingLine}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSendingLine ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                    <span>กำลังส่งข้อความเข้ากลุ่ม LINE...</span>
                  </>
                ) : autoSentSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>ส่งเข้ากลุ่ม LINE อีกครั้ง</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>🚀 คลิกส่งการ์ดเข้ากลุ่ม LINE ทันที</span>
                  </>
                )}
              </button>
            </div>

            {/* Action 2: Copy Card as Image (For pasting into any chat) */}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 mt-0.5">
                  <Copy className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    คัดลอกรูปภาพการ์ด (นำไปวาง Ctrl+V ในแชทได้ทันที)
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    เหมาะสำหรับส่งเข้าห้องแชทส่วนตัว หรือกลุ่ม LINE อื่นๆ โดยได้รูปการ์ดสวยงามเหมือนภาพพรีวิว 100%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleCopyCardImage}
                  disabled={isExporting}
                  className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isCopiedImage ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>📸 คัดลอกรูปภาพการ์ด</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadImage}
                  disabled={isExporting}
                  className="py-2.5 px-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Download className="h-4 w-4 text-cyan-400" />
                  <span>บันทึกภาพ (PNG)</span>
                </button>
              </div>
            </div>

            {/* Action 3: Open LINE App / Web Share */}
            <div className="rounded-2xl border border-slate-800 bg-[#141C2E] p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                <span>ช่องทางแชร์เพิ่มเติม</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleOpenLineShare}
                  className="py-2.5 px-3 rounded-xl border border-emerald-500/40 bg-[#06C755]/15 hover:bg-[#06C755]/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <ExternalLink className="h-4 w-4 text-[#06C755]" />
                  <span>เปิดแชร์ผ่านแอป LINE</span>
                </button>

                <button
                  onClick={handleCopyText}
                  className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isCopiedText ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-300">คัดลอกข้อความแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-slate-400" />
                      <span>คัดลอกข้อความสรุป</span>
                    </>
                  )}
                </button>
              </div>

              {/* Text Preview collapse/box */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 font-mono leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap select-all">
                {summaryText}
              </div>
            </div>

            {/* Note */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
              <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                เมื่อนำลิงก์อัลบั้มไปวางใน LINE ลิงก์จะดึงรูปปกและข้อความสรุป (OpenGraph Preview) แสดงเป็นการ์ดอัตโนมัติเช่นกัน
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
