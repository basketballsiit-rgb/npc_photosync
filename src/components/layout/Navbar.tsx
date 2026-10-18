"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  ShieldCheck,
  User,
  Lock,
  LogOut,
} from "lucide-react";
import { AdminLoginModal } from "@/components/auth/AdminLoginModal";

interface NavbarProps {
  onQuickUploadClick?: () => void;
}

export function Navbar({ onQuickUploadClick }: NavbarProps) {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<string>("PR_STAFF");
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setIsAdminLoggedIn(Boolean(data.isAuthenticated));
    } catch {
      setIsAdminLoggedIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAdminLoggedIn(false);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.warn("Logout error:", err);
    }
  };

  const roles = [
    { key: "SUPER_ADMIN", label: "ผู้ดูแลระบบ (Admin)", color: "text-amber-400" },
    { key: "PR_STAFF", label: "งานศูนย์ดิจิทัลและสื่อสารองค์กร (PR)", color: "text-cyan-400" },
    { key: "TEACHER", label: "ครูผู้สอน / เจ้าของโครงการ", color: "text-emerald-400" },
    { key: "PUBLIC", label: "ผู้เยี่ยมชมทั่วไป (Guest)", color: "text-slate-400" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-900/30 bg-[#0F0728]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* College Logo & App Title */}
        <div className="flex items-center gap-3.5">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/25 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-pink-500/40">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0F0728]">
                {/* NPC emblem symbol */}
                <div className="relative flex h-6 w-6 items-center justify-center">
                  <div className="absolute h-5 w-5 rounded-full border-2 border-pink-400/80 border-t-transparent animate-spin duration-1000" />
                  <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">
                  NPC<span className="bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-300 bg-clip-text text-transparent">_PhotoSync</span>
                </span>
                <span className="rounded-full bg-pink-500/10 px-2.5 py-0.5 text-[10px] font-bold text-pink-300 border border-pink-500/30">
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
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Upload Button */}
          <button
            onClick={() => {
              if (onQuickUploadClick) {
                onQuickUploadClick();
              } else {
                router.push("/?upload=true");
              }
            }}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all duration-300 hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="h-4 w-4 fill-white text-white animate-pulse" />
            <span>อัปโหลดภาพด่วน</span>
          </button>

          {/* Admin Settings Button (Login Protected) */}
          {isAdminLoggedIn ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/15 px-3.5 py-2 text-xs font-bold text-pink-300 transition-all hover:bg-pink-500 hover:text-white shadow-sm"
              >
                <ShieldCheck className="h-4 w-4 text-pink-400" />
                <span className="hidden sm:inline">จัดการระบบ</span>
                <span className="sm:hidden">จัดการ</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </Link>
              <button
                onClick={handleLogout}
                title="ออกจากระบบผู้ดูแล"
                className="p-2 rounded-full border border-purple-800/40 bg-[#1C0E46]/80 text-purple-300 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-purple-800/60 bg-[#1C0E46]/80 px-3.5 py-2 text-xs font-semibold text-purple-200 transition-all hover:border-pink-500/60 hover:bg-[#281464] hover:text-white"
            >
              <Lock className="h-3.5 w-3.5 text-pink-400" />
              <span>เข้าสู่ระบบ (จัดการ)</span>
            </button>
          )}

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 rounded-full border border-purple-800/50 bg-[#180C3E]/90 px-3 py-1.5 text-xs font-medium text-purple-200 transition-colors hover:border-pink-500/50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/30 text-pink-300 border border-pink-500/30">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-[11px] font-bold text-slate-100">
                  {isAdminLoggedIn
                    ? "ผู้ดูแลระบบ (Admin)"
                    : roles.find((r) => r.key === currentRole)?.label.split(" ")[0]}
                </div>
                <div className="text-[9px] text-pink-400 font-mono font-semibold">
                  npc.ac.th
                </div>
              </div>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-purple-800/50 bg-[#13072E]/95 p-1.5 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-purple-400 uppercase">
                  สลับบทบาทผู้ใช้งานจำลอง
                </div>
                {roles.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => {
                      setCurrentRole(role.key);
                      setShowRoleMenu(false);
                      if (role.key === "SUPER_ADMIN" && !isAdminLoggedIn) {
                        setIsLoginModalOpen(true);
                      }
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors ${
                      currentRole === role.key
                        ? "bg-purple-600/30 font-bold text-pink-300 border border-purple-500/30"
                        : "text-purple-200 hover:bg-purple-900/40 hover:text-white"
                    }`}
                  >
                    <span>{role.label}</span>
                    {currentRole === role.key && (
                      <span className="h-1.5 w-1.5 rounded-full bg-pink-400 shadow-sm shadow-pink-400" />
                    )}
                  </button>
                ))}

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

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          checkAdminSession();
          router.push("/admin");
        }}
      />
    </header>
  );
}
