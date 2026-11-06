"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Image as ImageIcon,
} from "lucide-react";
import { AlbumType } from "@prisma/client";

export interface AlbumCardData {
  id: string;
  albumCode: string;
  title: string;
  description?: string | null;
  eventDate: Date | string;
  academicYear: number;
  semester: number;
  albumType: AlbumType;
  projectId?: string | null;
  divisionName: string;
  departmentName?: string | null;
  coverThumbnailUrl?: string | null;
  photoCount: number;
  totalSizeBytes?: number | bigint;
  viewCount?: number;
  drivePathDisplay?: string | null;
  driveFolderUrl?: string | null;
  tags?: string[];
  project?: {
    projectCode: string;
    projectName: string;
    ownerTeacherName?: string;
  } | null;
}

interface AlbumCardProps {
  album: AlbumCardData;
  onRetroactiveLinkClick?: (album: AlbumCardData) => void;
}

function formatFileSize(bytes?: bigint | number): string {
  if (!bytes) return "0 MB";
  const num = typeof bytes === "bigint" ? Number(bytes) : bytes;
  const mb = num / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function formatThaiDate(dateInput: Date | string): string {
  const d = new Date(dateInput);
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;
  return `${day} ${month} ${thaiYear}`;
}

export function AlbumCard({ album, onRetroactiveLinkClick }: AlbumCardProps) {
  const isUnlinked =
    !album.projectId &&
    (album.albumType === AlbumType.ROUTINE ||
      album.albumType === AlbumType.ADHOC ||
      album.albumType === AlbumType.PORTFOLIO);

  const getClientBasePath = () => {
    if (typeof window !== "undefined") {
      return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
    }
    return process.env.NODE_ENV === "production" ? "/npc_photosync" : "";
  };

  // Fallback image with basePath prefix
  const rawCover =
    album.coverThumbnailUrl && album.coverThumbnailUrl.trim() !== ""
      ? album.coverThumbnailUrl
      : null;

  const coverUrl = rawCover
    ? rawCover.startsWith("http")
      ? rawCover
      : `${getClientBasePath()}${rawCover.startsWith("/") ? rawCover : `/${rawCover}`}`
    : "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop";

  return (
    <Link
      href={`/albums/${album.albumCode}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-purple-800/30 bg-[#130A2E]/85 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-pink-500/50 hover:shadow-2xl hover:shadow-purple-500/20 backdrop-blur-md cursor-pointer"
    >
      {/* 16:9 Thumbnail Cover */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0F0728]">
        <Image
          src={coverUrl}
          alt={album.title}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#130A2E] via-transparent to-black/30" />

        {/* Top-Left: Color-Coded Activity Type Badge */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
          {album.albumType === AlbumType.PROJECT ? (
            <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-pink-500/30 backdrop-blur-md border border-pink-400/30">
              <span className="font-mono">{album.project?.projectCode || "PROJECT"}</span>
              <span className="text-pink-100">• รายงาน 5 บท</span>
            </div>
          ) : album.albumType === AlbumType.ROUTINE ? (
            <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-cyan-500/30 backdrop-blur-md border border-cyan-400/30">
              <span>งานประจำ • หน้าเสาธง</span>
            </div>
          ) : album.albumType === AlbumType.ADHOC ? (
            <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-amber-500/30 backdrop-blur-md border border-amber-400/30">
              <span>งานเฉพาะกิจ</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-purple-500/30 backdrop-blur-md border border-purple-400/30">
              <span>คลังภาพ PR วิทยาลัย</span>
            </div>
          )}
        </div>

        {/* Top-Right: Photo Count & Storage Size */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-[#0F0728]/85 px-3 py-1 text-[11px] font-medium text-purple-200 backdrop-blur-md border border-purple-700/50 shadow-sm">
          <ImageIcon className="h-3 w-3 text-pink-400" />
          <span>{album.photoCount} รูป</span>
          <span className="text-purple-600">|</span>
          <span className="text-purple-300">{formatFileSize(album.totalSizeBytes)}</span>
        </div>

        {/* Bottom-Left: Album Code Badge */}
        <div className="absolute bottom-2 left-3 z-10">
          <span className="rounded-full bg-[#1A0E44]/90 px-2.5 py-0.5 text-[10px] font-mono font-bold text-pink-300 border border-pink-500/30 shadow-sm">
            {album.albumCode}
          </span>
        </div>
      </div>

      {/* Album Card Body: Title, Date & Academic Term */}
      <div className="flex flex-1 flex-col p-4 sm:p-5 justify-between gap-3">
        {/* Title */}
        <h3 className="line-clamp-2 text-sm sm:text-base font-bold text-white leading-snug group-hover:text-pink-300 transition-colors">
          {album.title}
        </h3>

        {/* Event Meta Information: Date & Academic Term */}
        <div className="flex items-center gap-2 text-xs text-purple-300/85 font-medium">
          <Calendar className="h-3.5 w-3.5 text-pink-400 shrink-0" />
          <span>
            {formatThaiDate(album.eventDate)} • ภาคเรียนที่ {album.semester}/{album.academicYear}
          </span>
        </div>
      </div>
    </Link>
  );
}
