"use client";

import React from "react";
import { Search, X, Filter, Calendar, Building, Sparkles } from "lucide-react";
import { AlbumType } from "@prisma/client";
import { NPC_DIVISIONS, NPC_DEPARTMENTS } from "@/lib/academic-utils";

export interface FilterState {
  search: string;
  albumType?: AlbumType | "ALL";
  academicYear?: number | "ALL";
  semester?: number | "ALL";
  divisionName?: string | "ALL";
  departmentName?: string | "ALL";
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  totalCount: number;
}

export function FilterBar({
  filters,
  onFilterChange,
  totalCount,
}: FilterBarProps) {
  const [availableTerms, setAvailableTerms] = React.useState<any[]>([]);

  const [departmentsList, setDepartmentsList] = React.useState<string[]>(Array.from(NPC_DEPARTMENTS));

  React.useEffect(() => {
    fetch("/api/admin/academic-terms")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.terms) {
          setAvailableTerms(data.terms);
        }
      })
      .catch((err) => console.warn("Could not load terms for filter:", err));

    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.departments) && data.departments.length > 0) {
          setDepartmentsList(data.departments.map((d: any) => d.name));
        }
      })
      .catch((err) => console.warn("Could not load departments for filter:", err));
  }, []);
  const typePills = [
    { key: "ALL", label: "ทั้งหมด", icon: "🌐" },
    {
      key: AlbumType.PROJECT,
      label: "📁 โครงการตามแผนฯ (รายงาน 5 บท)",
      desc: "ผูกโครงการ smartflow",
    },
    {
      key: AlbumType.ROUTINE,
      label: "📅 งานประจำ/หน้าเสาธง",
      desc: "ไม่มีรหัสโครงการ",
    },
    {
      key: AlbumType.ADHOC,
      label: "⚡ กิจกรรมเฉพาะกิจ",
      desc: "ผูกย้อนหลังได้",
    },
    {
      key: AlbumType.PORTFOLIO,
      label: "🏛️ คลังภาพ PR/อาคารสถานที่",
      desc: "คลังภาพวิทยาลัย",
    },
  ];

  // Group available terms by academic year
  const termGroups = React.useMemo(() => {
    const map = new Map<number, any[]>();
    availableTerms.forEach((t) => {
      const year = t.academicYear;
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(t);
    });
    // Sort terms within each year descending
    map.forEach((terms) => terms.sort((a, b) => b.semester - a.semester));
    // Sort years descending
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [availableTerms]);

  return (
    <div className="space-y-4 rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-4 sm:p-5 shadow-xl backdrop-blur-xl">
      {/* Top Row: Omnibox Search + Quick Academic Term Filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Omnibox Search Input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-pink-400">
            <Search className="h-4 w-4 text-pink-400" />
          </div>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="ค้นหาชื่อกิจกรรม, รหัสโครงการ (เช่น PRJ-69-001), แผนกวิชา, หรือ AI แท็ก (เช่น มอบเกียรติบัตร, พิธีเปิด)..."
            className="w-full rounded-2xl border border-purple-800/50 bg-[#1B0E44]/80 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-purple-100 placeholder-purple-400/60 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all shadow-inner"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: "" })}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-purple-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdowns Group */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Academic Year & Semester Selector */}
          <div className="relative">
            <select
              value={`${filters.academicYear || "ALL"}_${filters.semester || "ALL"}`}
              onChange={(e) => {
                const [y, s] = e.target.value.split("_");
                onFilterChange({
                  academicYear: y === "ALL" ? "ALL" : parseInt(y, 10),
                  semester: s === "ALL" ? "ALL" : parseInt(s, 10),
                });
              }}
              className="w-full appearance-none rounded-2xl border border-purple-800/50 bg-[#1B0E44]/80 py-2.5 pl-3.5 pr-8 text-purple-200 focus:border-pink-500 focus:outline-none transition-colors"
            >
              <option value="ALL_ALL" className="bg-[#140A32] text-white">
                🌐 ทุกปีการศึกษา & ภาคเรียน (ทั้งหมดในระบบ)
              </option>

              {termGroups.length > 0 ? (
                termGroups.map(([year, terms]) => {
                  const hasCurrentTerm = terms.some((t) => t.isCurrent);
                  return (
                    <React.Fragment key={year}>
                      {/* Entire Academic Year Option */}
                      <option
                        value={`${year}_ALL`}
                        className="bg-[#180C3E] text-pink-300 font-bold"
                      >
                        📂 ปีการศึกษา {year} (ทั้งหมด) {hasCurrentTerm ? "★ (ปีการศึกษาปัจจุบัน)" : ""}
                      </option>
                      {/* Specific Semesters */}
                      {terms.map((t) => (
                        <option
                          key={`${t.academicYear}_${t.semester}`}
                          value={`${t.academicYear}_${t.semester}`}
                          className="bg-[#140A32] text-white pl-4"
                        >
                          &nbsp;&nbsp;&nbsp;↳ ภาคเรียนที่ {t.semester}/{t.academicYear} {t.isCurrent ? "★ (ภาคเรียนปัจจุบัน)" : ""}
                        </option>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <>
                  <option value="2569_ALL" className="bg-[#180C3E] text-pink-300 font-bold">
                    📂 ปีการศึกษา 2569 (ทั้งหมด) ★ (ปีการศึกษาปัจจุบัน)
                  </option>
                  <option value="2569_2" className="bg-[#140A32] text-white">
                    &nbsp;&nbsp;&nbsp;↳ ภาคเรียนที่ 2/2569 ★ (ภาคเรียนปัจจุบัน)
                  </option>
                  <option value="2569_1" className="bg-[#140A32] text-white">
                    &nbsp;&nbsp;&nbsp;↳ ภาคเรียนที่ 1/2569
                  </option>
                  <option value="2568_ALL" className="bg-[#180C3E] text-purple-200 font-bold">
                    📂 ปีการศึกษา 2568 (ทั้งหมด)
                  </option>
                  <option value="2568_2" className="bg-[#140A32] text-white">
                    &nbsp;&nbsp;&nbsp;↳ ภาคเรียนที่ 2/2568
                  </option>
                  <option value="2568_1" className="bg-[#140A32] text-white">
                    &nbsp;&nbsp;&nbsp;↳ ภาคเรียนที่ 1/2568
                  </option>
                </>
              )}
            </select>
            <Calendar className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-purple-400" />
          </div>

          {/* Division Filter */}
          <div className="relative">
            <select
              value={filters.divisionName || "ALL"}
              onChange={(e) =>
                onFilterChange({
                  divisionName: e.target.value === "ALL" ? "ALL" : e.target.value,
                })
              }
              className="w-full appearance-none rounded-2xl border border-purple-800/50 bg-[#1B0E44]/80 py-2.5 pl-3.5 pr-8 text-purple-200 focus:border-pink-500 focus:outline-none transition-colors"
            >
              <option value="ALL" className="bg-[#140A32] text-white">ทุกฝ่าย (4 ฝ่ายหลัก)</option>
              {NPC_DIVISIONS.map((div) => (
                <option key={div} value={div} className="bg-[#140A32] text-white">
                  {div}
                </option>
              ))}
            </select>
            <Building className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-purple-400" />
          </div>

          {/* Department Filter */}
          <div className="relative col-span-2 sm:col-span-1">
            <select
              value={filters.departmentName || "ALL"}
              onChange={(e) =>
                onFilterChange({
                  departmentName: e.target.value === "ALL" ? "ALL" : e.target.value,
                })
              }
              className="w-full appearance-none rounded-2xl border border-purple-800/50 bg-[#1B0E44]/80 py-2.5 pl-3.5 pr-8 text-purple-200 focus:border-pink-500 focus:outline-none transition-colors"
            >
              <option value="ALL" className="bg-[#140A32] text-white">ทุกแผนกวิชา / งาน</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept} className="bg-[#140A32] text-white">
                  {dept}
                </option>
              ))}
            </select>
            <Filter className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Bottom Row: Activity Classification Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-purple-900/40 pt-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {typePills.map((pill) => {
            const isSelected =
              (filters.albumType || "ALL") === pill.key;
            return (
              <button
                key={pill.key}
                onClick={() =>
                  onFilterChange({
                    albumType: pill.key as AlbumType | "ALL",
                  })
                }
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  isSelected
                    ? "bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-md shadow-pink-500/25 border border-pink-400/40 scale-[1.02]"
                    : "border border-purple-800/40 bg-[#1A0E42]/60 text-purple-300 hover:border-purple-600 hover:bg-[#25135A] hover:text-white"
                }`}
              >
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-1.5 text-xs text-purple-300/80">
          <Sparkles className="h-3.5 w-3.5 text-pink-400" />
          <span>พบ</span>
          <span className="font-extrabold text-pink-400">{totalCount}</span>
          <span>อัลบั้มกิจกรรม</span>
        </div>
      </div>
    </div>
  );
}
