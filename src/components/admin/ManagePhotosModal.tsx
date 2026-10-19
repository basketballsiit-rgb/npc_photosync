"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Trash2,
  CheckCircle2,
  Star,
  Upload,
  Loader2,
  ExternalLink,
  Edit2,
  Save,
  Check,
  ImageIcon,
  Maximize2,
  RefreshCw,
  HardDrive,
} from "lucide-react";
import { showAlert } from "@/lib/sweetalert";

interface MediaFileItem {
  id: string;
  albumId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  thumbnailWebpUrl: string;
  reportReadyJpgUrl: string;
  aiCaption?: string | null;
  isFeatured: boolean;
  driveFileId?: string | null;
  createdAt: string;
}

interface ManagePhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  albumId: string;
  onAlbumUpdated?: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function ManagePhotosModal({
  isOpen,
  onClose,
  albumId,
  onAlbumUpdated,
}: ManagePhotosModalProps) {
  const [album, setAlbum] = useState<any>(null);
  const [mediaList, setMediaList] = useState<MediaFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Editing caption states
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [captionInput, setCaptionInput] = useState<string>("");
  const [isSavingCaption, setIsSavingCaption] = useState(false);

  // Lightbox preview state
  const [previewMedia, setPreviewMedia] = useState<MediaFileItem | null>(null);

  const getClientBasePath = () => {
    if (typeof window !== "undefined") {
      return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
    }
    return "";
  };

  const formatUrl = (url: string, mediaId?: string) => {
    if (!url) {
      return mediaId ? `${getClientBasePath()}/api/v1/image-proxy/${mediaId}` : "";
    }
    if (url.startsWith("http")) return url;
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${getClientBasePath()}${cleanUrl}`;
  };

  const loadAlbumData = async () => {
    if (!albumId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/albums/${albumId}`);
      const data = await res.json();
      if (data.success && data.album) {
        setAlbum(data.album);
        setMediaList(data.album.mediaFiles || []);
      } else {
        showAlert.error("โหลดข้อมูลล้มเหลว", data.error || "ไม่พบข้อมูลอัลบั้มนี้");
      }
    } catch (err: any) {
      console.error("Failed to load album photos:", err);
      showAlert.error("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลรูปภาพของอัลบั้มได้");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && albumId) {
      loadAlbumData();
    } else {
      setAlbum(null);
      setMediaList([]);
      setEditingMediaId(null);
      setPreviewMedia(null);
    }
  }, [isOpen, albumId]);

  // Handle Upload More Photos
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(`กำลังเตรียมอัปโหลด ${files.length} รูปภาพ...`);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      formData.append("runAiTagging", "false");
      formData.append("sendLineNotify", "false");

      setUploadProgress(`กำลังประมวลผลและสร้างภาพความละเอียดสูง...`);

      const res = await fetch(`${getClientBasePath()}/api/albums/${albumId}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showAlert.success(
          "อัปโหลดสำเร็จ",
          `เพิ่มรูปภาพใหม่จำนวน ${data.mediaList?.length || files.length} รูปเรียบร้อยแล้ว`
        );
        await loadAlbumData();
        if (onAlbumUpdated) onAlbumUpdated();
      } else {
        showAlert.error("อัปโหลดไม่สำเร็จ", data.error || "เกิดข้อผิดพลาดในการอัปโหลด");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "เกิดข้อผิดพลาดในการอัปโหลด");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      // Reset input
      e.target.value = "";
    }
  };

  // Set as Cover Photo
  const handleSetCover = async (media: MediaFileItem) => {
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: true }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("ตั้งเป็นภาพหน้าปกแล้ว", `ตั้งภาพ ${media.fileName} เป็นหน้าปกเรียบร้อย`);
        setAlbum((prev: any) => ({
          ...prev,
          coverThumbnailUrl: media.thumbnailWebpUrl,
        }));
        setMediaList((prev) =>
          prev.map((m) => ({
            ...m,
            isFeatured: m.id === media.id,
          }))
        );
        if (onAlbumUpdated) onAlbumUpdated();
      } else {
        showAlert.error("เกิดข้อผิดพลาด", data.error || "ไม่สามารถเปลี่ยนภาพหน้าปกได้");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "เกิดข้อผิดพลาด");
    }
  };

  // Save Edited Caption
  const handleSaveCaption = async (mediaId: string) => {
    setIsSavingCaption(true);
    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/media/${mediaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiCaption: captionInput }),
      });
      const data = await res.json();
      if (data.success) {
        setMediaList((prev) =>
          prev.map((m) => (m.id === mediaId ? { ...m, aiCaption: captionInput } : m))
        );
        setEditingMediaId(null);
        showAlert.toast("บันทึกคำอธิบายภาพสำเร็จ", "success");
      } else {
        showAlert.error("บันทึกไม่สำเร็จ", data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsSavingCaption(false);
    }
  };

  // Delete Individual Photo
  const handleDeleteMedia = async (media: MediaFileItem) => {
    const confirmed = await showAlert.confirmDelete(
      "ยืนยันการลบรูปภาพนี้?",
      `คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพ "${media.fileName}" อย่างถาวร? (ระบบจะลบทั้งในเครื่องและ Google Drive)`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${getClientBasePath()}/api/admin/media/${media.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success("ลบสำเร็จ", data.message || "ลบรูปภาพเรียบร้อยแล้ว");
        setMediaList((prev) => prev.filter((m) => m.id !== media.id));
        setAlbum((prev: any) => ({
          ...prev,
          photoCount: Math.max(0, (prev?.photoCount || 1) - 1),
          coverThumbnailUrl: data.album?.coverThumbnailUrl || prev?.coverThumbnailUrl,
        }));
        if (onAlbumUpdated) onAlbumUpdated();
      } else {
        showAlert.error("ลบไม่สำเร็จ", data.error || "เกิดข้อผิดพลาดในการลบรูปภาพ");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "เกิดข้อผิดพลาดในการลบรูปภาพ");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-3xl border border-purple-700/60 bg-[#100726] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-800/40 px-6 py-4 bg-[#160B37] gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shrink-0">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate max-w-md sm:max-w-xl">
                  {album?.title || "กำลังโหลดข้อมูลอัลบั้ม..."}
                </h3>
                {album?.albumCode && (
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 shrink-0">
                    {album.albumCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-300/80 mt-0.5">
                จัดการรูปภาพทั้งหมดในอัลบั้ม: ลบภาพที่ไม่ต้องการ, ตั้งค่าภาพหน้าปก, แก้ไขคำอธิบายภาพ หรืออัปโหลดเพิ่ม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Quick Upload Button */}
            <label
              className={`flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer ${
                isUploading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{isUploading ? "กำลังอัปโหลด..." : "+ อัปโหลดภาพเพิ่ม"}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleUploadFiles}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-purple-300 hover:bg-purple-800/40 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="flex flex-wrap items-center justify-between border-b border-purple-900/40 px-6 py-2.5 bg-[#0C0420] text-xs text-purple-300">
          <div className="flex items-center gap-4">
            <span>
              จำนวนรูปภาพ: <strong className="text-pink-300 font-mono">{mediaList.length}</strong> รูป
            </span>
            <span>
              วันที่จัด:{" "}
              <strong className="text-cyan-300">
                {album?.eventDate ? new Date(album.eventDate).toLocaleDateString("th-TH") : "-"}
              </strong>
            </span>
            <span>
              สถานะ:{" "}
              <strong className={album?.isPublic ? "text-emerald-300" : "text-amber-300"}>
                {album?.isPublic ? "🌐 สาธารณะ" : "🔒 ซ่อนไว้"}
              </strong>
            </span>
          </div>

          {uploadProgress && (
            <div className="flex items-center gap-2 text-pink-300 animate-pulse font-semibold">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{uploadProgress}</span>
            </div>
          )}
        </div>

        {/* Photos Grid Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0E0624]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-purple-300">
              <Loader2 className="h-8 w-8 animate-spin text-pink-400 mb-3" />
              <p className="text-sm font-semibold">กำลังโหลดรูปภาพทั้งหมดในอัลบั้ม...</p>
            </div>
          ) : mediaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-purple-400 text-center">
              <ImageIcon className="h-12 w-12 text-purple-500/40 mb-3" />
              <p className="text-base font-bold text-purple-300">ยังไม่มีรูปภาพในอัลบั้มนี้</p>
              <p className="text-xs text-purple-400 mt-1 max-w-sm">
                กดปุ่ม &ldquo;+ อัปโหลดภาพเพิ่ม&rdquo; ด้านบนเพื่อเพิ่มรูปภาพกิจกรรมเข้าสู่อัลบั้มนี้ได้ทันที
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaList.map((media, index) => {
                const isCover =
                  media.isFeatured ||
                  album?.coverThumbnailUrl === media.thumbnailWebpUrl ||
                  album?.coverThumbnailUrl === media.reportReadyJpgUrl;

                const isEditingThisCaption = editingMediaId === media.id;

                return (
                  <div
                    key={media.id}
                    className={`group relative rounded-2xl border transition-all overflow-hidden flex flex-col ${
                      isCover
                        ? "border-pink-500 bg-gradient-to-b from-pink-950/20 to-[#190C3E] shadow-lg shadow-pink-500/20 ring-1 ring-pink-500/50"
                        : "border-purple-800/40 bg-[#160B35]/70 hover:border-purple-600/70 hover:bg-[#1C0E44]"
                    }`}
                  >
                    {/* Image Container with aspect ratio */}
                    <div className="relative aspect-[4/3] w-full bg-[#080315] overflow-hidden">
                      <img
                        src={formatUrl(media.thumbnailWebpUrl, media.id)}
                        alt={media.aiCaption || media.fileName}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const fallback = formatUrl(media.reportReadyJpgUrl, media.id);
                          if (!target.src.includes(fallback)) {
                            target.src = fallback;
                          }
                        }}
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                        {isCover && (
                          <span className="flex items-center gap-1 rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                            <Star className="h-3 w-3 fill-white" />
                            <span>หน้าปก</span>
                          </span>
                        )}
                        <span className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-mono text-purple-200 backdrop-blur-md border border-purple-800/40">
                          #{index + 1}
                        </span>
                      </div>

                      {/* Quick Hover Action Bar */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {/* Lightbox Preview */}
                        <button
                          type="button"
                          onClick={() => setPreviewMedia(media)}
                          title="ดูภาพขยายเต็มจอ"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-900/80 text-white hover:bg-pink-600 transition-all shadow-lg active:scale-95"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>

                        {/* Set Cover */}
                        {!isCover && (
                          <button
                            type="button"
                            onClick={() => handleSetCover(media)}
                            title="ตั้งเป็นภาพหน้าปกอัลบั้ม"
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-900/80 text-yellow-300 hover:bg-yellow-500 hover:text-black transition-all shadow-lg active:scale-95"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}

                        {/* Delete Photo */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(media)}
                          title="ลบรูปภาพนี้"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-950/80 text-rose-300 hover:bg-rose-600 hover:text-white transition-all shadow-lg active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Dimensions & Size Bar at bottom of image */}
                      <div className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-purple-300 backdrop-blur-md">
                        {formatFileSize(media.fileSizeBytes)}
                        {media.width && media.height ? ` • ${media.width}×${media.height}` : ""}
                      </div>
                    </div>

                    {/* Metadata & Caption Area */}
                    <div className="p-3 flex-1 flex flex-col justify-between text-xs space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-purple-400">
                          <span className="truncate max-w-[150px] font-mono" title={media.fileName}>
                            {media.fileName}
                          </span>
                          {!isEditingThisCaption && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMediaId(media.id);
                                setCaptionInput(media.aiCaption || "");
                              }}
                              className="text-purple-400 hover:text-pink-300 p-0.5"
                              title="แก้ไขคำอธิบายภาพ"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Caption Editor or Display */}
                        {isEditingThisCaption ? (
                          <div className="space-y-1.5 pt-1">
                            <textarea
                              rows={2}
                              value={captionInput}
                              onChange={(e) => setCaptionInput(e.target.value)}
                              placeholder="พิมพ์คำอธิบายภาพนี้..."
                              className="w-full rounded-xl border border-pink-500/50 bg-[#0E0620] p-2 text-xs text-white placeholder-purple-500 focus:outline-none"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingMediaId(null)}
                                className="px-2 py-1 text-[10px] text-purple-400 hover:text-white"
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                disabled={isSavingCaption}
                                onClick={() => handleSaveCaption(media.id)}
                                className="flex items-center gap-1 rounded-lg bg-pink-500 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-pink-600 disabled:opacity-50"
                              >
                                {isSavingCaption ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                <span>บันทึก</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className="text-[11px] text-purple-200/90 line-clamp-2 italic leading-relaxed"
                            title={media.aiCaption || "ไม่มีคำอธิบาย"}
                          >
                            {media.aiCaption || "ไม่มีคำอธิบายภาพ"}
                          </p>
                        )}
                      </div>

                      {/* Bottom action pill buttons for mobile/direct click */}
                      <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between text-[11px]">
                        {!isCover ? (
                          <button
                            type="button"
                            onClick={() => handleSetCover(media)}
                            className="text-purple-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
                          >
                            <Star className="h-3 w-3" />
                            <span>ตั้งเป็นปก</span>
                          </button>
                        ) : (
                          <span className="text-pink-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>หน้าปกปัจจุบัน</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(media)}
                          className="text-rose-400 hover:text-rose-200 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>ลบ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-purple-800/40 px-6 py-3 bg-[#160B37] text-xs">
          <div className="text-purple-300/80">
            💡 <strong>เคล็ดลับ:</strong> คลิกปุ่ม <strong>&ldquo;ตั้งเป็นปก&rdquo;</strong> เพื่อเปลี่ยนภาพหน้าปกอัลบั้ม หรือกดปุ่มถังขยะเพื่อลบภาพที่ไม่ต้องการ
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-purple-700/60 bg-purple-900/40 px-5 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-800/60 hover:text-white transition-all"
          >
            ปิดหน้าต่าง
          </button>
        </div>

        {/* Fullscreen Lightbox Preview Modal */}
        {previewMedia && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fadeIn"
            onClick={() => setPreviewMedia(null)}
          >
            <div
              className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewMedia(null)}
                className="absolute -top-12 right-0 rounded-full p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={formatUrl(previewMedia.reportReadyJpgUrl, previewMedia.id)}
                alt={previewMedia.aiCaption || previewMedia.fileName}
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-purple-700/40"
              />
              <div className="mt-3 text-center text-xs text-purple-200 space-y-1">
                <div className="font-semibold text-sm text-white">{previewMedia.fileName}</div>
                {previewMedia.aiCaption && (
                  <p className="text-purple-300 max-w-xl">{previewMedia.aiCaption}</p>
                )}
                <div className="text-[11px] font-mono text-purple-400">
                  {formatFileSize(previewMedia.fileSizeBytes)}
                  {previewMedia.width ? ` • ${previewMedia.width}×${previewMedia.height} px` : ""}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
