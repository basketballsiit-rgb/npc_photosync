"use client";

import React, { useRef, useState } from "react";
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  QrCode,
  Share2,
  Calendar,
  Building,
  Sparkles,
  FileText,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toPng } from "html-to-image";
import { showAlert } from "@/lib/sweetalert";
import { getClientBasePath } from "@/lib/basepath";
import { News5W1H, formatSocialShareText } from "@/lib/news-utils";

interface MediaItem {
  id: string;
  fileName: string;
  reportReadyJpgUrl?: string;
  thumbnailWebpUrl?: string;
}

interface OnePageNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: {
    id: string;
    albumCode: string;
    title: string;
    description?: string | null;
    eventDate: string | Date;
    academicYear: number;
    semester: number;
    divisionName: string;
    departmentName?: string | null;
    mediaFiles?: MediaItem[];
  };
  news: News5W1H;
  fullNewsText: string;
}

export function OnePageNewsModal({
  isOpen,
  onClose,
  album,
  news,
  fullNewsText,
}: OnePageNewsModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const basePath = getClientBasePath();
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    currentUrl
  )}`;

  // Pick up to 4 featured photos from album
  const photos = (album.mediaFiles || []).slice(0, 4);

  // Format Thai Date
  const d = new Date(album.eventDate);
  const dateFormatted = !isNaN(d.getTime())
    ? d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  // Handle PNG Image Export
  const handleDownloadImage = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `ข่าวแผ่นเดียว_${album.albumCode}.png`;
      link.href = dataUrl;
      link.click();

      showAlert.toast("ดาวน์โหลดภาพข่าวแผ่นเดียวเรียบร้อยแล้ว", "success");
    } catch (err) {
      console.error("Export newsletter image error:", err);
      showAlert.error("ไม่สามารถสร้างรูปภาพได้", "กรุณาลองใหม่อีกครั้ง หรือใช้ปุ่มพิมพ์/บันทึกเป็น PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Print A4
  const handlePrint = () => {
    window.print();
  };

  // Handle Copy Formatted News Text for Facebook/LINE
  const handleCopyText = () => {
    const textToCopy = formatSocialShareText(
      { ...news, fullNews: fullNewsText },
      album.title,
      currentUrl,
      album.eventDate
    );
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    showAlert.toast("คัดลอกข้อความข่าวสำหรับ Facebook/LINE แล้ว", "success");
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl my-auto rounded-3xl border border-purple-700/60 bg-[#12072E] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="p-4 border-b border-purple-800/50 bg-[#17093B] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>ข่าวประชาสัมพันธ์แผ่นเดียว (One-Page PR Bulletin)</span>
                <span className="text-[10px] font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 px-2 py-0.5 rounded-full">
                  {album.albumCode}
                </span>
              </h3>
              <p className="text-[11px] text-purple-300/80">
                ฟอร์แมตจดหมายข่าวทางการ วช.น่าน พร้อมรูปภาพ สรุป 5W1H และ QR Code ต้นฉบับ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Text Button */}
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 rounded-full border border-purple-700 bg-purple-900/60 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-800 hover:text-white transition-all"
              title="คัดลอกข้อความข่าวพร้อมอีโมจิสำหรับโพสต์ Facebook / LINE"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-pink-400" />
              )}
              <span>{isCopied ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-950/60 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/80 hover:text-white transition-all shadow-sm"
              title="พิมพ์ข่าวแผ่นเดียวขนาด A4 หรือเลือกบันทึกเป็น PDF"
            >
              <Printer className="h-3.5 w-3.5 text-cyan-400" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            {/* Download PNG Button */}
            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              title="ดาวน์โหลดเป็นไฟล์รูปภาพ PNG สำหรับส่งแชร์ใน LINE หรือ Facebook"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isExporting ? "กำลังสร้างภาพ..." : "ดาวน์โหลดภาพ PNG"}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-purple-900/40 text-purple-300 hover:text-white hover:bg-purple-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-[#0C031E]">
          {/* THE 1-PAGE CANVAS (Exact 723px width for pristine ratio & clean A4 print) */}
          <div
            ref={canvasRef}
            id="onepage-pr-bulletin-canvas"
            style={{
              width: "723px",
              minWidth: "723px",
              backgroundColor: "#ffffff",
            }}
            className="text-slate-900 shadow-2xl relative font-sans flex flex-col justify-between overflow-hidden"
          >
            {/* 1. TOP HEADER BANNER (Official College Banner) */}
            <div className="relative w-full overflow-hidden" style={{ height: "180px" }}>
              <img
                src={`${basePath}/assets/newsletter/newsletter_header_banner.png`}
                alt="วิทยาลัยสารพัดช่างน่าน จดหมายข่าว ประชาสัมพันธ์"
                className="w-full h-full object-cover"
              />
            </div>

            {/* 2. SUBHEADER STRIP WITH DYNAMIC PILLS */}
            <div
              className="w-full flex items-center justify-between px-6 py-2 relative"
              style={{
                backgroundImage: `url(${basePath}/assets/newsletter/newsletter_substrip_clean.png)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                minHeight: "46px",
              }}
            >
              <div className="flex items-center gap-2.5">
                {/* Term Pill */}
                <div className="rounded-full bg-white px-3.5 py-1 text-[11px] font-bold text-[#002f6c] shadow-sm border border-slate-200 shrink-0">
                  ภาคเรียนที่ {album.semester} ปีการศึกษา {album.academicYear}
                </div>

                {/* Division Pill */}
                <div className="rounded-full bg-[#002868] px-3.5 py-1 text-[11px] font-bold text-white shadow-sm shrink-0 border border-blue-400/30">
                  {album.divisionName}
                </div>
              </div>

              {/* Date Pill */}
              <div className="rounded-full bg-[#0098d8] px-3.5 py-1 text-[11px] font-bold text-white shadow-sm shrink-0 border border-cyan-300/40">
                {dateFormatted || "ข่าวกิจกรรมวิทยาลัย"}
              </div>
            </div>

            {/* 3. MAIN CONTENT BODY */}
            <div className="p-6 bg-white flex-1 space-y-4">
              {/* Activity Headline Banner */}
              <div className="border-b-2 border-[#002f6c]/20 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold text-[#0098d8] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {album.albumCode}
                  </span>
                  {album.departmentName && (
                    <span className="text-[11px] font-medium text-slate-500">
                      • {album.departmentName}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-black text-[#002868] leading-snug">
                  {album.title}
                </h1>
              </div>

              {/* Photo Collage (Up to 4 photos) */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Hero Photo (Spans 2 columns) */}
                  <div className="col-span-2 relative h-56 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                    <img
                      src={`${basePath}/api/v1/image-proxy/${photos[0].id}?type=report`}
                      alt={photos[0].fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Supporting Photos Column */}
                  <div className="col-span-1 flex flex-col gap-2 h-56">
                    {photos.slice(1, 3).map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="relative flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100"
                      >
                        <img
                          src={`${basePath}/api/v1/image-proxy/${p.id}?type=report`}
                          alt={p.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {photos.length < 2 && (
                      <div className="flex-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                        NPC_PhotoSync
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5W1H Structured Summary Box */}
              <div className="rounded-xl border border-blue-100 bg-[#F5F9FD] p-3 text-xs space-y-2">
                <div className="font-bold text-[#002868] text-xs flex items-center gap-1.5 border-b border-blue-200/60 pb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0098d8]" />
                  <span>สรุปสาระสำคัญของกิจกรรม (5W1H Highlights)</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] leading-relaxed">
                  <div>
                    <span className="font-bold text-slate-700">👤 ใคร (Who): </span>
                    <span className="text-slate-600">{news.who || "-"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">🎯 ทำอะไร (What): </span>
                    <span className="text-slate-600">{news.what || "-"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">📍 ที่ไหน (Where): </span>
                    <span className="text-slate-600">{news.where || "-"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">📅 เมื่อไร (When): </span>
                    <span className="text-slate-600">{news.when || "-"}</span>
                  </div>
                  {news.why && (
                    <div className="col-span-2">
                      <span className="font-bold text-slate-700">💡 เพื่ออะไร (Why): </span>
                      <span className="text-slate-600">{news.why}</span>
                    </div>
                  )}
                  {news.how && (
                    <div className="col-span-2">
                      <span className="font-bold text-slate-700">🌟 อย่างไร (How): </span>
                      <span className="text-slate-600">{news.how}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Formal News Article Body */}
              <div className="text-xs text-slate-700 leading-relaxed space-y-2 font-normal text-justify">
                {fullNewsText ? (
                  fullNewsText
                    .split("\n\n")
                    .map((para, i) => <p key={i}>{para}</p>)
                ) : (
                  <p>
                    วิทยาลัยสารพัดช่างน่าน ได้ดำเนินกิจกรรม "{album.title}" สังกัด{album.divisionName} {album.departmentName ? `(${album.departmentName})` : ""} โดยมีวัตถุประสงค์เพื่อขับเคลื่อนการจัดการเรียนการสอนและเสริมสร้างสมรรถนะผู้เรียนอย่างมีประสิทธิภาพ
                  </p>
                )}
              </div>

              {/* QR Code & Digital Archive Banner */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-[#002868]">
                    📲 สแกนเพื่อชมภาพและดาวน์โหลดภาพต้นฉบับ 100%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    เข้าสู่ระบบคลังภาพอัจฉริยะ NPC_PhotoSync วิทยาลัยสารพัดช่างน่าน
                  </div>
                  <div className="text-[9px] font-mono text-[#0098d8]">
                    {currentUrl}
                  </div>
                </div>

                <div className="shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                  <img src={qrImageUrl} alt="QR Code" className="h-16 w-16" />
                </div>
              </div>
            </div>

            {/* 4. BOTTOM FOOTER BANNER (Official College Banner) */}
            <div className="relative w-full overflow-hidden" style={{ height: "64px" }}>
              <img
                src={`${basePath}/assets/newsletter/newsletter_footer_banner.png`}
                alt="ติดต่อสอบถามเพิ่มเติมได้ที่ วิทยาลัยสารพัดช่างน่าน"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
