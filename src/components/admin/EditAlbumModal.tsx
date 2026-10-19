"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Loader2,
  Calendar,
  Layers,
  Building,
  Eye,
  EyeOff,
  Edit,
} from "lucide-react";
import { AlbumType } from "@prisma/client";
import { NPC_DIVISIONS } from "@/lib/academic-utils";
import { showAlert } from "@/lib/sweetalert";

interface EditAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: any;
  departments: Array<{ id?: string; name: string; divisionName: string }>;
  onSuccess: (updatedAlbum: any) => void;
}

interface EditAlbumFormData {
  title: string;
  description: string;
  eventDate: string;
  albumType: AlbumType;
  divisionName: string;
  departmentName: string;
  academicYear: number;
  semester: number;
  isPublic: boolean;
}

export function EditAlbumModal({
  isOpen,
  onClose,
  album,
  departments,
  onSuccess,
}: EditAlbumModalProps) {
  const [formData, setFormData] = useState<EditAlbumFormData>({
    title: "",
    description: "",
    eventDate: "",
    albumType: AlbumType.ROUTINE,
    divisionName: "ฝ่ายบริหารทรัพยากร",
    departmentName: "",
    academicYear: 2569,
    semester: 1,
    isPublic: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (album) {
      let formattedDate = "";
      if (album.eventDate) {
        const d = new Date(album.eventDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().split("T")[0];
        }
      }

      setFormData({
        title: album.title || "",
        description: album.description || "",
        eventDate: formattedDate || new Date().toISOString().split("T")[0],
        albumType: album.albumType || AlbumType.ROUTINE,
        divisionName: album.divisionName || "ฝ่ายบริหารทรัพยากร",
        departmentName: album.departmentName || "",
        academicYear: album.academicYear || 2569,
        semester: album.semester || 1,
        isPublic: typeof album.isPublic === "boolean" ? album.isPublic : true,
      });
    }
  }, [album]);

  if (!isOpen || !album) return null;

  const filteredDepartments = departments.filter(
    (d) => d.divisionName === formData.divisionName
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showAlert.warning("กรุณากรอกชื่ออัลบั้ม", "ชื่อกิจกรรม/อัลบั้มไม่สามารถเว้นว่างได้");
      return;
    }

    setIsSubmitting(true);
    try {
      const getClientBasePath = () => {
        if (typeof window !== "undefined") {
          return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
        }
        return "";
      };

      const res = await fetch(`${getClientBasePath()}/api/admin/albums/${album.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        showAlert.success("บันทึกสำเร็จ", data.message || "แก้ไขข้อมูลอัลบั้มเรียบร้อยแล้ว");
        onSuccess(data.data);
        onClose();
      } else {
        showAlert.error("เกิดข้อผิดพลาด", data.error || "ไม่สามารถบันทึกการแก้ไขได้");
      }
    } catch (err: any) {
      showAlert.error("ข้อผิดพลาด", err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-purple-700/60 bg-[#12082E] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-800/40 px-6 py-4 bg-[#180C3E]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/40">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>แก้ไขข้อมูลอัลบั้ม</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {album.albumCode}
                </span>
              </h3>
              <p className="text-xs text-purple-300/80">
                ปรับปรุงข้อมูลชื่อ วันที่จัดกิจกรรม ฝ่าย/แผนก และสถานะการเผยแพร่
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-purple-200 font-semibold flex items-center justify-between">
              <span>ชื่อกิจกรรม / อัลบั้ม *</span>
              <span className="text-[11px] font-normal text-purple-400">
                {formData.title.length}/300 ตัวอักษร
              </span>
            </label>
            <input
              type="text"
              required
              maxLength={300}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E44] px-4 py-3 text-white placeholder-purple-400/50 focus:border-pink-500 focus:outline-none transition-all"
              placeholder="เช่น กิจกรรมพิธีไหว้ครู ประจำปีการศึกษา 2569"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-purple-200 font-semibold">รายละเอียดกิจกรรมเพิ่มเติม</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E44] px-4 py-3 text-white placeholder-purple-400/50 focus:border-pink-500 focus:outline-none transition-all leading-relaxed"
              placeholder="ระบุวัตถุประสงค์ หรือสถานที่จัดกิจกรรม..."
            />
          </div>

          {/* Date, Academic Year, Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-purple-200 font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-pink-400" />
                <span>วันที่จัดกิจกรรม *</span>
              </label>
              <input
                type="date"
                required
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E44] px-3.5 py-2.5 text-white focus:border-pink-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-purple-200 font-semibold">ปีการศึกษา (พ.ศ.) *</label>
              <input
                type="number"
                min={2560}
                max={2599}
                value={formData.academicYear}
                onChange={(e) =>
                  setFormData({ ...formData, academicYear: parseInt(e.target.value, 10) || 2569 })
                }
                className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E44] px-3.5 py-2.5 text-white focus:border-pink-500 focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-purple-200 font-semibold">ภาคเรียน *</label>
              <select
                value={formData.semester}
                onChange={(e) =>
                  setFormData({ ...formData, semester: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E44] px-3.5 py-2.5 text-white focus:border-pink-500 focus:outline-none"
              >
                <option value={1} className="bg-[#140A32]">ภาคเรียนที่ 1</option>
                <option value={2} className="bg-[#140A32]">ภาคเรียนที่ 2</option>
                <option value={3} className="bg-[#140A32]">ภาคเรียนฤดูร้อน (3)</option>
              </select>
            </div>
          </div>

          {/* Album Type & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-purple-200 font-semibold flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                <span>ประเภทอัลบั้ม</span>
              </label>
              <select
                value={formData.albumType}
                onChange={(e) => setFormData({ ...formData, albumType: e.target.value as AlbumType })}
                className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E44] px-3.5 py-2.5 text-white focus:border-pink-500 focus:outline-none"
              >
                <option value={AlbumType.ROUTINE} className="bg-[#140A32]">
                  งานประจำ / ทั่วไป (ROUTINE)
                </option>
                <option value={AlbumType.PROJECT} className="bg-[#140A32]">
                  โครงการตามแผนงาน (PROJECT)
                </option>
                <option value={AlbumType.ADHOC} className="bg-[#140A32]">
                  กิจกรรมเฉพาะกิจ / เร่งด่วน (ADHOC)
                </option>
                <option value={AlbumType.PORTFOLIO} className="bg-[#140A32]">
                  คลังภาพประชาสัมพันธ์ (PORTFOLIO)
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-purple-200 font-semibold flex items-center gap-1.5">
                {formData.isPublic ? (
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span>สถานะการแสดงผลบนหน้าเว็บไซต์</span>
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                className={`w-full flex items-center justify-between rounded-2xl border px-4 py-2.5 text-left transition-all ${
                  formData.isPublic
                    ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                    : "border-amber-500/40 bg-amber-950/30 text-amber-300"
                }`}
              >
                <span className="font-semibold">
                  {formData.isPublic ? "🌐 เผยแพร่สู่สาธารณะ (Public)" : "🔒 ซ่อนไว้เฉพาะภายใน (Internal)"}
                </span>
                <span className="text-[10px] underline">คลิกเพื่อสลับ</span>
              </button>
            </div>
          </div>

          {/* Division & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-purple-200 font-semibold flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-pink-400" />
                <span>ฝ่ายที่สังกัด *</span>
              </label>
              <select
                value={formData.divisionName}
                onChange={(e) => {
                  const newDiv = e.target.value;
                  const firstDept = departments.find((d) => d.divisionName === newDiv)?.name || "";
                  setFormData({
                    ...formData,
                    divisionName: newDiv,
                    departmentName: firstDept,
                  });
                }}
                className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E44] px-3.5 py-2.5 text-white focus:border-pink-500 focus:outline-none"
              >
                {NPC_DIVISIONS.map((div) => (
                  <option key={div} value={div} className="bg-[#140A32]">
                    {div}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-purple-200 font-semibold">แผนกวิชา / งาน</label>
              <select
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                className="w-full rounded-2xl border border-purple-800/50 bg-[#1A0E44] px-3.5 py-2.5 text-white focus:border-pink-500 focus:outline-none"
              >
                <option value="" className="bg-[#140A32]">
                  -- ไม่ระบุแผนกวิชา --
                </option>
                {filteredDepartments.map((dept) => (
                  <option key={dept.id || dept.name} value={dept.name} className="bg-[#140A32]">
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-800/40">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-2xl border border-purple-700/50 bg-purple-900/30 px-5 py-2.5 text-xs font-semibold text-purple-300 hover:text-white hover:bg-purple-800/40 transition-all"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>บันทึกการแก้ไข</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
