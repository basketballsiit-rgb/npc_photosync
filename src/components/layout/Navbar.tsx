"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Zap,
  ShieldCheck,
  User,
  Lock,
  LogOut,
  Users,
  Camera,
  FileText,
} from "lucide-react";
import { AdminLoginModal } from "@/components/auth/AdminLoginModal";
import { apiUrl } from "@/lib/basepath";

interface NavbarProps {
  onQuickUploadClick?: () => void;
}

export function Navbar({ onQuickUploadClick }: NavbarProps) {
  const router = useRouter();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    name: string;
    role: "SUPER_ADMIN" | "PR_STAFF";
  } | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/me"));
      const data = await res.json();
      const authenticated = Boolean(data.isAuthenticated);
      setIsAdminLoggedIn(authenticated);
      if (authenticated && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setIsAdminLoggedIn(false);
      setCurrentUser(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
      setIsAdminLoggedIn(false);
      setCurrentUser(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.warn("Logout error:", err);
    }
  };

  const isPrStaff = currentUser?.role === "PR_STAFF";

  const roles = isPrStaff
    ? [
        { key: "PR_STAFF", label: "งานประชาสัมพันธ์", subLabel: "จัดการข่าวและภาพถ่าย", icon: FileText, color: "text-pink-400" },
        { key: "GUEST", label: "ผู้เยี่ยมชม", subLabel: "บุคคลทั่วไป / ผู้รับชม", icon: Users, color: "text-purple-300" },
      ]
    : [
        { key: "SUPER_ADMIN", label: "ผู้ดูแลระบบ", subLabel: "จัดการระบบและตั้งค่า", icon: ShieldCheck, color: "text-amber-400" },
        { key: "GUEST", label: "ผู้เยี่ยมชม", subLabel: "บุคคลทั่วไป / ผู้รับชม", icon: Users, color: "text-purple-300" },
      ];

  const currentRoleKey = isPrStaff ? "PR_STAFF" : isAdminLoggedIn ? "SUPER_ADMIN" : "GUEST";

  const getBasePath = () => {
    if (typeof window !== "undefined") {
      return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
    }
    return process.env.NODE_ENV === "production" ? "/npc_photosync" : "";
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-purple-900/30 bg-[#0F0728]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* College Logo & App Title */}
          <div className="flex items-center gap-3.5">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
                {/* Direct img tag avoids Next.js /_next/image proxy router issues */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${getBasePath()}/assets/npc-logo.png`}
                  alt="NPC PhotoSync Emblem"
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (!el.src.includes("/npc_photosync")) {
                      el.src = "/npc_photosync/assets/npc-logo.png";
                    } else if (el.src.includes("/assets/")) {
                      el.src = "/npc_photosync/npc-logo.png";
                    }
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-xl font-black tracking-tight text-white">
                    NPC<span className="bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-300 bg-clip-text text-transparent">_PhotoSync</span>
                  </span>
                  <span className="hidden sm:inline-block rounded-full bg-pink-500/10 px-2.5 py-0.5 text-[10px] font-bold text-pink-300 border border-pink-500/30">
                    ✦ PR Cloud
                  </span>
                </div>
                <p className="hidden text-xs text-purple-300/70 sm:block">
                  ระบบคลังภาพดิจิทัลและซิงโครไนซ์โครงการ • วิทยาลัยสารพัดช่างน่าน
                </p>
              </div>
            </Link>
          </div>

          {/* Action Controls & Role Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Quick Upload Button */}
            <button
              onClick={() => {
                if (onQuickUploadClick) {
                  onQuickUploadClick();
                } else {
                  router.push("/?upload=true");
                }
              }}
              className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all duration-300 hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white text-white animate-pulse" />
              <span>อัปโหลด<span className="hidden sm:inline">ภาพด่วน</span></span>
            </button>

            {/* Admin Settings Button (Login Protected) */}
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/15 px-2.5 sm:px-3.5 py-2 text-xs font-bold text-pink-300 transition-all hover:bg-pink-500 hover:text-white shadow-sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-400" />
                  <span className="hidden sm:inline">จัดการระบบ</span>
                  <span className="sm:hidden">จัดการ</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                </Link>
                <button
                  onClick={handleLogout}
                  title="ออกจากระบบผู้ดูแล"
                  className="p-1.5 sm:p-2 rounded-full border border-purple-800/40 bg-[#1C0E46]/80 text-purple-300 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-purple-800/60 bg-[#1C0E46]/80 px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-purple-200 transition-all hover:border-pink-500/60 hover:bg-[#281464] hover:text-white"
              >
                <Lock className="h-3.5 w-3.5 text-pink-400" />
                <span className="hidden sm:inline">เข้าสู่ระบบ (จัดการ)</span>
                <span className="sm:hidden">เข้าสู่ระบบ</span>
              </button>
            )}

            {/* User Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 rounded-full border border-purple-800/50 bg-[#180C3E]/90 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-purple-200 transition-colors hover:border-pink-500/50"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/30 text-pink-300 border border-pink-500/30">
                  {isPrStaff ? (
                    <FileText className="h-3.5 w-3.5 text-pink-400" />
                  ) : isAdminLoggedIn ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-purple-300" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1">
                    <span>
                      {isPrStaff
                        ? "งานประชาสัมพันธ์"
                        : isAdminLoggedIn
                        ? "ผู้ดูแลระบบ"
                        : "ผู้เยี่ยมชม"}
                    </span>
                    {isAdminLoggedIn && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[9px] text-pink-400 font-mono font-semibold">
                    {isPrStaff ? "PR Staff" : isAdminLoggedIn ? "Admin" : "Guest"}
                  </div>
                </div>
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-purple-800/50 bg-[#13072E]/95 p-1.5 shadow-2xl backdrop-blur-xl z-50">
                  <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-purple-400 uppercase">
                    สถานะผู้ใช้งาน
                  </div>

                  {roles.map((role) => {
                    const isCurrent = currentRoleKey === role.key;
                    const IconComponent = role.icon;

                    return (
                      <button
                        key={role.key}
                        onClick={() => {
                          setShowRoleMenu(false);
                          if (role.key === "SUPER_ADMIN" || role.key === "PR_STAFF") {
                            if (!isAdminLoggedIn) {
                              setIsLoginModalOpen(true);
                            } else {
                              router.push("/admin");
                            }
                          } else if (role.key === "GUEST") {
                            if (isAdminLoggedIn) {
                              handleLogout();
                            }
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-colors ${
                          isCurrent
                            ? "bg-purple-600/30 font-bold text-pink-300 border border-purple-500/30"
                            : "text-purple-200 hover:bg-purple-900/40 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-left">
                          <IconComponent className={`h-4 w-4 ${role.color}`} />
                          <div>
                            <div className="font-semibold">{role.label}</div>
                            <div className="text-[10px] text-purple-400 font-normal">
                              {role.subLabel}
                            </div>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {isAdminLoggedIn && (
                    <div className="border-t border-purple-900/40 pt-1.5 mt-1">
                      <button
                        onClick={() => {
                          setShowRoleMenu(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/40 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>ออกจากระบบผู้ดูแล</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Admin Login Modal (Rendered outside header into body portal) */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          checkAdminSession();
          router.push("/admin");
        }}
      />
    </>
  );
}
