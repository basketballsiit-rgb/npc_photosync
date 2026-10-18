"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { FilterBar, FilterState } from "@/components/gallery/FilterBar";
import { AlbumCard, AlbumCardData } from "@/components/gallery/AlbumCard";
import { RetroactiveLinkModal } from "@/components/gallery/RetroactiveLinkModal";
import { QuickUploadModal } from "@/components/upload/QuickUploadModal";
import {
  Sparkles,
  Layers,
  FolderSync,
  FileCheck2,
  HardDrive,
  Loader2,
  Camera,
  SearchX,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { getAcademicTermInfo } from "@/lib/academic-utils";

export default function HomePage() {
  const initialTerm = getAcademicTermInfo();

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    albumType: "ALL",
    academicYear: initialTerm.academicYear, // Year 2569 (Current Year by default)
    semester: "ALL", // Default to entire current academic year
    divisionName: "ALL",
    departmentName: "ALL",
  });

  const [albums, setAlbums] = useState<AlbumCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAlbumToLink, setSelectedAlbumToLink] = useState<AlbumCardData | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalAlbums: 0,
    totalPhotos: 0,
    linkedProjects: 0,
    totalSizeBytes: 0,
  });

  const fetchAlbums = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("q", filters.search);
      if (filters.albumType && filters.albumType !== "ALL") {
        params.set("albumType", filters.albumType);
      }
      if (filters.academicYear && filters.academicYear !== "ALL") {
        params.set("academicYear", String(filters.academicYear));
      }
      if (filters.semester && filters.semester !== "ALL") {
        params.set("semester", String(filters.semester));
      }
      if (filters.divisionName && filters.divisionName !== "ALL") {
        params.set("divisionName", filters.divisionName);
      }
      if (filters.departmentName && filters.departmentName !== "ALL") {
        params.set("departmentName", filters.departmentName);
      }
      params.set("sortBy", "latest");

      const res = await fetch(`/api/albums?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setAlbums(data.data);
        setTotalCount(data.pagination?.total || data.data.length);

        // Calculate overview stats
        const allPhotos = data.data.reduce(
          (sum: number, a: AlbumCardData) => sum + (a.photoCount || 0),
          0
        );
        const allSize = data.data.reduce(
          (sum: number, a: AlbumCardData) => sum + Number(a.totalSizeBytes || 0),
          0
        );
        const linkedCount = data.data.filter(
          (a: AlbumCardData) => a.albumType === "PROJECT" || a.projectId
        ).length;

        setStats({
          totalAlbums: data.pagination?.total || data.data.length,
          totalPhotos: allPhotos,
          linkedProjects: linkedCount,
          totalSizeBytes: allSize,
        });
      }
    } catch (err) {
      console.error("Failed to fetch albums:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlbums();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchAlbums]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upload") === "true") {
        setIsUploadModalOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    // Dynamically sync configured current term from database if available
    fetch("/api/admin/academic-terms")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.currentTerm) {
          const { academicYear } = data.currentTerm;
          setFilters((prev) => {
            if (prev.academicYear !== academicYear) {
              return {
                ...prev,
                academicYear,
                semester: "ALL",
              };
            }
            return prev;
          });
        }
      })
      .catch((err) => console.warn("Failed to sync current academic term:", err));
  }, []);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleLinkSuccess = () => {
    fetchAlbums();
  };

  const formatTotalSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Global Navigation */}
      <Navbar onQuickUploadClick={() => setIsUploadModalOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Banner with Cosmic Ambient Glow & Bento Stats */}
        <section className="relative overflow-hidden rounded-3xl border border-purple-800/40 bg-gradient-to-br from-[#160B3A]/90 via-[#1C0D4A]/80 to-[#0F0728]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Ambient Cosmic Orbs */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gradient-to-tr from-pink-500/25 to-purple-600/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-cyan-500/15 px-3.5 py-1 text-xs font-semibold text-pink-300 border border-pink-500/30 shadow-sm backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                <span>วิทยาลัยสารพัดช่างน่าน • Nan Polytechnic College</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                NPC_PhotoSync{" "}
                <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-300 bg-clip-text text-transparent">
                  PR Cloud
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed font-light">
                ระบบจัดการคลังภาพกิจกรรมดิจิทัลและซิงโครไนซ์อัตโนมัติ 2 ทาง เชื่อมโยงระบบรายงานสรุปโครงการ 5 บท{" "}
                <span className="font-semibold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                  npc_smartflow
                </span>{" "}
                และจัดเก็บต้นฉบับคมชัดสูงบน Google Shared Drive
              </p>
            </div>

            {/* Quick Metrics Bento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Card 1: Albums */}
              <div className="group rounded-2xl border border-purple-800/40 bg-[#140A32]/90 p-3.5 text-center transition-all duration-300 hover:border-pink-500/50 hover:shadow-lg hover:shadow-purple-500/20 backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-md shadow-pink-500/30 mb-2 transition-transform duration-300 group-hover:scale-110">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="text-[11px] text-purple-300/80 font-medium">อัลบั้มทั้งหมด</div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {stats.totalAlbums}
                </div>
              </div>

              {/* Card 2: Photos */}
              <div className="group rounded-2xl border border-purple-800/40 bg-[#140A32]/90 p-3.5 text-center transition-all duration-300 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30 mb-2 transition-transform duration-300 group-hover:scale-110">
                  <Camera className="h-4 w-4" />
                </div>
                <div className="text-[11px] text-purple-300/80 font-medium">รูปภาพในคลัง</div>
                <div className="text-xl sm:text-2xl font-black text-cyan-300 mt-0.5">
                  {stats.totalPhotos}
                </div>
              </div>

              {/* Card 3: 5-Chapter Projects */}
              <div className="group rounded-2xl border border-purple-800/40 bg-[#140A32]/90 p-3.5 text-center transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-500/30 mb-2 transition-transform duration-300 group-hover:scale-110">
                  <FolderSync className="h-4 w-4" />
                </div>
                <div className="text-[11px] text-purple-300/80 font-medium">ผูกโครงการ 5 บท</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
                  {stats.linkedProjects}
                </div>
              </div>

              {/* Card 4: Cloud Storage */}
              <div className="group rounded-2xl border border-purple-800/40 bg-[#140A32]/90 p-3.5 text-center transition-all duration-300 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/20 backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 mb-2 transition-transform duration-300 group-hover:scale-110">
                  <HardDrive className="h-4 w-4" />
                </div>
                <div className="text-[11px] text-purple-300/80 font-medium">พื้นที่จัดเก็บ</div>
                <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
                  {formatTotalSize(stats.totalSizeBytes)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Smart Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          totalCount={totalCount}
        />

        {/* Album Discovery Grid */}
        <section className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-purple-300">
              <Loader2 className="h-8 w-8 animate-spin text-pink-400 mb-3" />
              <p className="text-sm font-medium">กำลังโหลดคลังภาพกิจกรรม...</p>
            </div>
          ) : albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-purple-800/40 bg-[#12082B]/60 py-20 px-4 text-center backdrop-blur-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-900/60 to-pink-900/40 border border-purple-700/50 text-pink-400 mb-4 shadow-lg shadow-purple-900/40">
                <SearchX className="h-8 w-8 text-pink-400" />
              </div>
              <h3 className="text-lg font-bold text-white">ไม่พบอัลบั้มกิจกรรม</h3>
              <p className="text-xs sm:text-sm text-purple-300/80 max-w-md mt-1 mb-5">
                ไม่พบข้อมูลอัลบั้มที่ตรงกับเงื่อนไขการค้นหา คุณสามารถลองล้างตัวกรองหรือสร้างอัลบั้มใหม่ได้ทันที
              </p>
              <button
                onClick={() =>
                  setFilters({
                    search: "",
                    albumType: "ALL",
                    academicYear: initialTerm.academicYear,
                    semester: "ALL",
                    divisionName: "ALL",
                    departmentName: "ALL",
                  })
                }
                className="rounded-full border border-purple-700/60 bg-[#1E0F4B] px-5 py-2.5 text-xs font-semibold text-purple-200 hover:bg-[#281464] hover:text-white transition-all shadow-md"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onRetroactiveLinkClick={(target) =>
                    setSelectedAlbumToLink(target)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Retroactive Project Link Modal */}
      <RetroactiveLinkModal
        isOpen={!!selectedAlbumToLink}
        onClose={() => setSelectedAlbumToLink(null)}
        album={selectedAlbumToLink}
        onLinkSuccess={handleLinkSuccess}
      />

      {/* Quick Upload Modal */}
      <QuickUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => fetchAlbums()}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-purple-900/30 bg-[#0F0728]/80 py-6 text-center text-xs text-purple-300/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">NPC_PhotoSync</span>
            <span>• วิทยาลัยสารพัดช่างน่าน (Nan Polytechnic College)</span>
          </div>
          <div className="text-[11px] text-purple-400/60">
            งานประชาสัมพันธ์ • แผนกวิชาเทคโนโลยีสารสนเทศ • สำนักงานคณะกรรมการการอาชีวศึกษา (สอศ.)
          </div>
        </div>
      </footer>
    </div>
  );
}
