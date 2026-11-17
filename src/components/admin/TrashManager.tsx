"use client";

import React, { useState, useEffect } from "react";
import {
  Trash2,
  RefreshCw,
  FolderArchive,
  Image as ImageIcon,
  RotateCcw,
  AlertTriangle,
  Search,
  CheckSquare,
  Square,
  Loader2,
  Calendar,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { showAlert } from "@/lib/sweetalert";

interface DeletedAlbumItem {
  id: string;
  albumCode: string;
  title: string;
  divisionName?: string;
  departmentName?: string;
  photoCount: number;
  totalSizeBytes: number;
  deletedAt: string;
  project?: {
    projectCode: string;
    projectName: string;
  } | null;
}

interface DeletedPhotoItem {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  thumbnailWebpUrl: string;
  reportReadyJpgUrl: string;
  deletedAt: string;
  width?: number | null;
  height?: number | null;
  album: {
    id: string;
    albumCode: string;
    title: string;
  };
}

export function TrashManager() {
  const [subTab, setSubTab] = useState<"albums" | "photos">("albums");
  const [albums, setAlbums] = useState<DeletedAlbumItem[]>([]);
  const [photos, setPhotos] = useState<DeletedPhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const getClientBasePath = () => {
    if (typeof window !== "undefined") {
      return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
    }
    return "";
  };

  const loadTrashData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/trash?t=${Date.now()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAlbums(data.data.albums || []);
        setPhotos(data.data.photos || []);
      }
    } catch (err: any) {
      console.error("Failed to load trash data:", err);
      showAlert.error("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลในถังขยะได้");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrashData();
  }, []);

  const formatMb = (bytes: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatThaiDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  // Restore Album
  const handleRestoreAlbum = async (album: DeletedAlbumItem) => {
    const confirm = await showAlert.confirm(
      "ยืนยันกู้คืนอัลบั้ม",
      `ต้องการกู้คืนอัลบั้ม "${album.title}" (${album.albumCode}) และรูปภาพทั้งหมดในอัลบั้มกลับสู่ระบบใช่หรือไม่?`,
      "กู้คืนอัลบั้ม",
      "ยกเลิก"
    );
    if (!confirm) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          albumIds: [album.id],
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.toast(data.message || "กู้คืนอัลบั้มสำเร็จ", "success");
        loadTrashData();
      } else {
        showAlert.error("กู้คืนไม่สำเร็จ", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsProcessing(false);
    }
  };

  // Permanent Delete Album
  const handlePermanentDeleteAlbum = async (album: DeletedAlbumItem) => {
    const confirm = await showAlert.confirm(
      "⚠️ ลบอัลบั้มถาวร (ไม่สามารถกู้คืนได้)",
      `ต้องการลบอัลบั้ม "${album.title}" (${album.albumCode}) อย่างถาวรใช่หรือไม่?\n\nไฟล์รูปภาพทั้งหมดบนเซิร์ฟเวอร์และโฟลเดอร์ใน Google Drive จะถูกลบทันที`,
      "ลบถาวรทันที",
      "ยกเลิก"
    );
    if (!confirm) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "permanent_delete",
          albumIds: [album.id],
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.toast(data.message || "ลบอัลบั้มถาวรเรียบร้อยแล้ว", "success");
        loadTrashData();
      } else {
        showAlert.error("ลบไม่สำเร็จ", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsProcessing(false);
    }
  };

  // Restore Photo(s)
  const handleRestorePhotos = async (photoIds: string[]) => {
    if (photoIds.length === 0) return;
    const confirm = await showAlert.confirm(
      "ยืนยันกู้คืนรูปภาพ",
      `ต้องการกู้คืนรูปภาพจำนวน ${photoIds.length} รูป กลับสู่ระบบใช่หรือไม่?`,
      "กู้คืนรูปภาพ",
      "ยกเลิก"
    );
    if (!confirm) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          mediaIds: photoIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.toast(data.message || "กู้คืนรูปภาพสำเร็จ", "success");
        setSelectedPhotoIds([]);
        loadTrashData();
      } else {
        showAlert.error("กู้คืนไม่สำเร็จ", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsProcessing(false);
    }
  };

  // Permanent Delete Photo(s)
  const handlePermanentDeletePhotos = async (photoIds: string[]) => {
    if (photoIds.length === 0) return;
    const confirm = await showAlert.confirm(
      "⚠️ ยืนยันลบรูปภาพถาวร",
      `ต้องการลบรูปภาพจำนวน ${photoIds.length} รูป อย่างถาวรใช่หรือไม่?\n\nไฟล์ภาพบนเซิร์ฟเวอร์และใน Google Drive จะถูกลบออกจริง และไม่สามารถกู้คืนได้อีก`,
      "ลบถาวร",
      "ยกเลิก"
    );
    if (!confirm) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "permanent_delete",
          mediaIds: photoIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.toast(data.message || "ลบรูปภาพถาวรเรียบร้อยแล้ว", "success");
        setSelectedPhotoIds([]);
        loadTrashData();
      } else {
        showAlert.error("ลบไม่สำเร็จ", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsProcessing(false);
    }
  };

  // Empty Trash
  const handleEmptyTrash = async () => {
    if (albums.length === 0 && photos.length === 0) {
      showAlert.toast("ไม่มีข้อมูลในถังขยะ", "info");
      return;
    }

    const confirm = await showAlert.confirm(
      "⚠️ ล้างถังขยะระบบทั้งหมด (Empty Trash)",
      `คุณกำลังจะลบอัลบั้มจำนวน ${albums.length} รายการ และรูปภาพจำนวน ${photos.length} รูป อย่างถาวร!\n\nไฟล์ทั้งหมดในโฟลเดอร์เซิร์ฟเวอร์และ Google Drive จะถูกลบทิ้งทันที การกระทำนี้ไม่สามารถย้อนกลับได้`,
      "ล้างถังขยะทันที",
      "ยกเลิก"
    );
    if (!confirm) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "empty_trash",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("ล้างถังขยะสำเร็จ", data.message || "ล้างถังขยะระบบเรียบร้อยแล้ว");
        setSelectedPhotoIds([]);
        loadTrashData();
      } else {
        showAlert.error("ล้างถังขยะไม่สำเร็จ", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAlbums = albums.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.albumCode.toLowerCase().includes(q) ||
      (a.divisionName && a.divisionName.toLowerCase().includes(q))
    );
  });

  const filteredPhotos = photos.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.fileName.toLowerCase().includes(q) ||
      p.album.albumCode.toLowerCase().includes(q) ||
      p.album.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-r from-[#2B0E1E] via-[#1F0918] to-[#12040E] p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-inner">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                ถังขยะระบบ (Recycle Bin)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {albums.length} อัลบั้ม | {photos.length} รูปภาพ
                </span>
              </h2>
              <p className="text-xs text-rose-300/80 mt-1">
                รายการอัลบั้มและรูปภาพที่ถูกลบชั่วคราว สามารถกู้คืนกลับมาได้ หรือกดลบถาวรเพื่อเคลียร์พื้นที่เซิร์ฟเวอร์และ Google Drive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={loadTrashData}
              disabled={isLoading || isProcessing}
              className="flex items-center gap-1.5 rounded-2xl border border-purple-700/60 bg-purple-950/40 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-900/60 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>รีเฟรช</span>
            </button>

            {(albums.length > 0 || photos.length > 0) && (
              <button
                onClick={handleEmptyTrash}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-2xl border border-rose-500/50 bg-rose-600/30 hover:bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/25 transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>ล้างถังขยะทั้งหมด</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-rose-900/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSubTab("albums");
                setSelectedPhotoIds([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                subTab === "albums"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                  : "bg-purple-950/40 text-purple-300 hover:text-white border border-purple-800/40"
              }`}
            >
              <FolderArchive className="h-4 w-4" />
              <span>อัลบั้มที่ลบ ({albums.length})</span>
            </button>

            <button
              onClick={() => {
                setSubTab("photos");
                setSelectedPhotoIds([]);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                subTab === "photos"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                  : "bg-purple-950/40 text-purple-300 hover:text-white border border-purple-800/40"
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              <span>รูปภาพเดี่ยวที่ลบ ({photos.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสอัลบั้ม..."
              className="w-full rounded-2xl border border-purple-800/50 bg-[#160A30] py-2 pl-9 pr-4 text-xs text-white placeholder-purple-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 text-purple-300">
          <Loader2 className="h-8 w-8 animate-spin text-rose-400 mb-3" />
          <p className="text-sm font-semibold">กำลังโหลดข้อมูลในถังขยะ...</p>
        </div>
      ) : subTab === "albums" ? (
        /* Deleted Albums Tab */
        filteredAlbums.length === 0 ? (
          <div className="rounded-3xl border border-purple-800/40 bg-[#13072E]/60 p-12 text-center">
            <FolderArchive className="mx-auto h-12 w-12 text-purple-500/40 mb-3" />
            <h3 className="text-base font-bold text-purple-200">ไม่มีอัลบั้มในถังขยะ</h3>
            <p className="text-xs text-purple-400 mt-1">อัลบั้มทั้งหมดอยู่ในสถานะปกติและพร้อมใช้งาน</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAlbums.map((album) => (
              <div
                key={album.id}
                className="group relative rounded-3xl border border-rose-900/40 bg-[#170928] p-5 shadow-xl hover:border-rose-500/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                      {album.albumCode}
                    </span>
                    <span className="text-[11px] text-purple-400">
                      ลบเมื่อ: {formatThaiDate(album.deletedAt)}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm line-clamp-2" title={album.title}>
                      {album.title}
                    </h4>
                    {album.divisionName && (
                      <p className="text-xs text-purple-300/80 mt-1">
                        ฝ่าย: {album.divisionName} {album.departmentName ? `• ${album.departmentName}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-purple-300 pt-2 border-t border-purple-900/40">
                    <span>
                      จำนวนภาพ: <strong className="text-pink-300">{album.photoCount}</strong> รูป
                    </span>
                    <span>
                      ขนาด: <strong className="text-cyan-300">{formatMb(album.totalSizeBytes)}</strong>
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-purple-900/50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleRestoreAlbum(album)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/60 px-3 py-2 text-xs font-bold text-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
                    <span>กู้คืนอัลบั้ม</span>
                  </button>

                  <button
                    onClick={() => handlePermanentDeleteAlbum(album)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 px-3 py-2 text-xs font-bold text-rose-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>ลบถาวร</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Deleted Individual Photos Tab */
        filteredPhotos.length === 0 ? (
          <div className="rounded-3xl border border-purple-800/40 bg-[#13072E]/60 p-12 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-purple-500/40 mb-3" />
            <h3 className="text-base font-bold text-purple-200">ไม่มีรูปภาพเดี่ยวในถังขยะ</h3>
            <p className="text-xs text-purple-400 mt-1">รูปภาพทั้งหมดอยู่ในสถานะปกติและพร้อมใช้งาน</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Batch Action Toolbar for Photos */}
            <div className="flex items-center justify-between rounded-2xl border border-purple-800/40 bg-[#160B35] px-4 py-2.5 text-xs text-purple-300">
              <button
                onClick={() => {
                  if (selectedPhotoIds.length === filteredPhotos.length) {
                    setSelectedPhotoIds([]);
                  } else {
                    setSelectedPhotoIds(filteredPhotos.map((p) => p.id));
                  }
                }}
                className="flex items-center gap-2 font-semibold hover:text-white transition-colors"
              >
                {selectedPhotoIds.length === filteredPhotos.length && filteredPhotos.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-rose-400" />
                ) : (
                  <Square className="h-4 w-4 text-purple-400" />
                )}
                <span>
                  {selectedPhotoIds.length > 0
                    ? `เลือกแล้ว ${selectedPhotoIds.length} จาก ${filteredPhotos.length} รูป`
                    : "เลือกรูปภาพทั้งหมด"}
                </span>
              </button>

              {selectedPhotoIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestorePhotos(selectedPhotoIds)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 font-bold transition-all active:scale-95"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>กู้คืนที่เลือก ({selectedPhotoIds.length})</span>
                  </button>

                  <button
                    onClick={() => handlePermanentDeletePhotos(selectedPhotoIds)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-bold transition-all active:scale-95"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>ลบถาวรที่เลือก ({selectedPhotoIds.length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Photos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredPhotos.map((photo) => {
                const isSelected = selectedPhotoIds.includes(photo.id);
                return (
                  <div
                    key={photo.id}
                    onClick={() => {
                      setSelectedPhotoIds((prev) =>
                        prev.includes(photo.id) ? prev.filter((i) => i !== photo.id) : [...prev, photo.id]
                      );
                    }}
                    className={`group relative rounded-2xl border transition-all overflow-hidden flex flex-col cursor-pointer ${
                      isSelected
                        ? "border-rose-500 bg-rose-950/20 ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/20"
                        : "border-purple-800/40 bg-[#160B35]/70 hover:border-purple-600/70"
                    }`}
                  >
                    <div className="relative aspect-square w-full bg-[#080315] overflow-hidden">
                      <img
                        src={`${getClientBasePath()}/api/v1/image-proxy/${photo.id}?type=thumb`}
                        alt={photo.fileName}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      <div className="absolute top-1.5 right-1.5 z-10">
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-rose-400 drop-shadow-md" />
                        ) : (
                          <Square className="h-5 w-5 text-white/70 drop-shadow-md" />
                        )}
                      </div>

                      <div className="absolute bottom-1 left-1.5 right-1.5 z-10 flex items-center justify-between text-[10px] text-white/90 bg-black/60 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                        <span className="truncate max-w-[90px]">{photo.album.albumCode}</span>
                        <span>{formatMb(photo.fileSizeBytes)}</span>
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      <p className="text-[11px] font-mono text-purple-200 truncate" title={photo.fileName}>
                        {photo.fileName}
                      </p>
                      <p className="text-[9px] text-purple-400">
                        ลบ: {formatThaiDate(photo.deletedAt)}
                      </p>

                      <div className="pt-1 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestorePhotos([photo.id]);
                          }}
                          className="flex-1 py-1 px-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 text-[10px] font-bold border border-emerald-600/40 text-center transition-all"
                        >
                          กู้คืน
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermanentDeletePhotos([photo.id]);
                          }}
                          className="flex-1 py-1 px-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-[10px] font-bold border border-rose-600/40 text-center transition-all"
                        >
                          ลบถาวร
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
