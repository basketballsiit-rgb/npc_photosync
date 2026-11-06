"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  FolderInput,
  Search,
  Loader2,
  Calendar,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Building,
} from "lucide-react";
import { showAlert } from "@/lib/sweetalert";
import { AlbumType } from "@prisma/client";

interface MovePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAlbum: {
    id: string;
    albumCode: string;
    title: string;
  };
  photosToMove: Array<{
    id: string;
    fileName: string;
    thumbnailUrl: string;
    caption?: string | null;
  }>;
  onMoveSuccess: () => void;
}

interface TargetAlbumOption {
  id: string;
  albumCode: string;
  title: string;
  eventDate?: string;
  photoCount: number;
  albumType: AlbumType;
  divisionName?: string;
  departmentName?: string;
}

const ALBUM_TYPE_BADGES: Record<
  AlbumType,
  { label: string; bgColor: string }
> = {
  [AlbumType.PROJECT]: {
    label: "โครงการตามแผน",
    bgColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  [AlbumType.ROUTINE]: {
    label: "งานประจำ / หน้าเสาธง",
    bgColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  [AlbumType.ADHOC]: {
    label: "เร่งด่วน / เฉพาะกิจ",
    bgColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  [AlbumType.PORTFOLIO]: {
    label: "คลังภาพ PR",
    bgColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  },
};

export function MovePhotoModal({
  isOpen,
  onClose,
  sourceAlbum,
  photosToMove,
  onMoveSuccess,
}: MovePhotoModalProps) {
  const [albums, setAlbums] = useState<TargetAlbumOption[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getClientBasePath = () => {
    if (typeof window !== "undefined") {
      return window.location.pathname.startsWith("/npc_photosync")
        ? "/npc_photosync"
        : "";
    }
    return "";
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedTargetId(null);
      setSearchQuery("");
      loadAlbums();
    }
  }, [isOpen, sourceAlbum.id]);

  const loadAlbums = async () => {
    setIsLoadingAlbums(true);
    try {
      const base = getClientBasePath();
      const res = await fetch(`${base}/api/admin/albums?limit=200`);
      const data = await res.json();
      if (data.success && Array.isArray(data.albums)) {
        // Exclude current source album
        const filtered = data.albums.filter(
          (a: TargetAlbumOption) => a.id !== sourceAlbum.id
        );
        setAlbums(filtered);
      }
    } catch (err) {
      console.error("Error loading target albums:", err);
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albums;
    const q = searchQuery.toLowerCase();
    return albums.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.albumCode.toLowerCase().includes(q) ||
        (a.divisionName && a.divisionName.toLowerCase().includes(q)) ||
        (a.departmentName && a.departmentName.toLowerCase().includes(q))
    );
  }, [albums, searchQuery]);

  const selectedAlbum = useMemo(
    () => albums.find((a) => a.id === selectedTargetId),
    [albums, selectedTargetId]
  );

  const handleConfirmMove = async () => {
    if (!selectedTargetId) {
      showAlert.error("กรุณาเลือกอัลบั้ม", "โปรดเลือกอัลบั้มปลายทางที่ต้องการย้ายรูปภาพไป");
      return;
    }

    if (photosToMove.length === 0) return;

    setIsSubmitting(true);
    try {
      const base = getClientBasePath();
      const res = await fetch(`${base}/api/admin/media/bulk-move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaIds: photosToMove.map((p) => p.id),
          targetAlbumId: selectedTargetId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        showAlert.toast(data.message || "ย้ายรูปภาพสำเร็จเรียบร้อยแล้ว", "success");
        onMoveSuccess();
        onClose();
      } else {
        showAlert.error("ไม่สามารถย้ายรูปภาพได้", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      showAlert.error("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-cyan-500/40 bg-[#0F0826] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-800/40 px-6 py-4 bg-[#160B37]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shrink-0">
              <FolderInput className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ย้ายรูปภาพไปอัลบั้มอื่น
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {photosToMove.length} รูป
                </span>
              </h3>
              <p className="text-xs text-purple-300/80">
                ย้ายจาก: <span className="text-pink-300 font-semibold">{sourceAlbum.title}</span> ({sourceAlbum.albumCode})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-purple-300 hover:bg-purple-800/40 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Photos to Move Preview Strip */}
          <div className="rounded-2xl border border-purple-800/50 bg-[#140A30] p-3 space-y-2">
            <div className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
              <span>รูปภาพที่เลือกจะถูกย้าย ({photosToMove.length} รูป):</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {photosToMove.map((p) => (
                <div
                  key={p.id}
                  className="relative h-16 w-16 rounded-xl overflow-hidden border border-purple-700/60 bg-[#080315] shrink-0 group"
                  title={p.caption || p.fileName}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumbnailUrl}
                    alt={p.fileName}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                    <span className="text-[9px] text-white truncate font-mono">
                      {p.fileName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search Target Album */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white">
              เลือกอัลบั้มปลายทางที่ต้องการย้ายภาพไป *
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-purple-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ค้นหาชื่ออัลบั้ม, รหัสอัลบั้ม (เช่น ACT-69, PRJ-), หรือชื่อฝ่าย..."
                className="w-full rounded-2xl border border-purple-700/60 bg-[#150A33] py-2.5 pl-10 pr-4 text-xs text-white placeholder-purple-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </div>

          {/* Album Selection List */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {isLoadingAlbums ? (
              <div className="flex flex-col items-center justify-center py-10 text-purple-300">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mb-2" />
                <span className="text-xs">กำลังโหลดรายชื่ออัลบั้มทั้งหมด...</span>
              </div>
            ) : filteredAlbums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-purple-400 text-center">
                <AlertCircle className="h-8 w-8 text-purple-500/50 mb-2" />
                <span className="text-xs font-semibold">
                  {searchQuery ? "ไม่พบอัลบั้มที่ตรงกับคำค้นหา" : "ไม่มีอัลบั้มอื่นในระบบ"}
                </span>
              </div>
            ) : (
              filteredAlbums.map((a) => {
                const isSelected = selectedTargetId === a.id;
                const badge = ALBUM_TYPE_BADGES[a.albumType];

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedTargetId(a.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400 shadow-md shadow-cyan-500/10"
                        : "border-purple-800/40 bg-[#160B37]/60 hover:border-purple-600/70 hover:bg-[#1B0D44]"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">
                          {a.title}
                        </span>
                        {badge && (
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-md font-bold border shrink-0 ${badge.bgColor}`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-purple-300/80 mt-1">
                        <span className="font-mono text-cyan-300 font-semibold">
                          {a.albumCode}
                        </span>
                        {a.eventDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-purple-400" />
                            {new Date(a.eventDate).toLocaleDateString("th-TH")}
                          </span>
                        )}
                        <span>
                          📸 <strong className="text-pink-300">{a.photoCount}</strong> รูป
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="h-6 w-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md shadow-cyan-400/30">
                          <Check className="h-4 w-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full border border-purple-700 bg-purple-950/40" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Selected Target Album Confirmation Summary */}
          {selectedAlbum && (
            <div className="p-3.5 rounded-2xl border border-cyan-500/40 bg-cyan-950/20 text-xs text-cyan-200 flex items-start gap-2.5">
              <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">เป้าหมาย: </span>
                <span>{selectedAlbum.title} ({selectedAlbum.albumCode})</span>
                <p className="text-[11px] text-cyan-300/80 mt-0.5">
                  เมื่อยืนยัน รูปภาพจะถูกย้ายไปยังอัลบั้มนี้ทันที และจำนวนรูปภาพของทั้งสองอัลบั้มจะถูกคำนวณใหม่โดยอัตโนมัติ
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-purple-800/40 px-6 py-4 bg-[#140A30]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl border border-purple-800/60 bg-[#1A0C40] px-4 py-2 text-xs font-semibold text-purple-300 hover:text-white transition-colors"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleConfirmMove}
            disabled={!selectedTargetId || isSubmitting}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังย้ายรูปภาพ...</span>
              </>
            ) : (
              <>
                <FolderInput className="h-4 w-4" />
                <span>ยืนยันย้าย {photosToMove.length} รูปภาพ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
