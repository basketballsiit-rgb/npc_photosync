"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertCircle,
  KeyRound,
} from "lucide-react";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/admin");
        }
      } else {
        setErrorMessage(data.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-purple-800/50 bg-gradient-to-b from-[#180C3E] via-[#120730] to-[#0A041E] p-6 sm:p-8 shadow-2xl shadow-purple-950/80">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-purple-400 hover:text-white hover:bg-purple-900/50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 p-0.5 shadow-lg shadow-pink-500/30">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#140A32]">
              <ShieldCheck className="h-7 w-7 text-pink-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            เข้าสู่ระบบผู้ดูแลระบบ
          </h2>
          <p className="text-xs text-purple-300/70">
            ต้องเข้าสู่ระบบเพื่อเข้าใช้งานและตั้งค่าระบบ NPC_PhotoSync
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-purple-200 font-semibold flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-pink-400" />
              <span>ชื่อผู้ใช้ / อีเมล (Username)</span>
            </label>
            <input
              type="text"
              required
              placeholder="admin หรือ admin@npc.ac.th"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-purple-800/60 bg-[#1A0D42] px-4 py-2.5 text-sm text-white placeholder-purple-400/40 focus:border-pink-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-purple-200 font-semibold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-cyan-400" />
              <span>รหัสผ่าน (Password)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="ระบุรหัสผ่านผู้ดูแลระบบ"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-purple-800/60 bg-[#1A0D42] px-4 py-2.5 pr-10 text-sm text-white placeholder-purple-400/40 focus:border-pink-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-purple-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Credentials Info Badge */}
          <div className="rounded-2xl border border-purple-800/30 bg-purple-950/30 p-3 flex items-start gap-2.5 text-[11px] text-purple-300/80">
            <KeyRound className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold text-white">บัญชีผู้ดูแลระบบเริ่มต้น:</span>
              <div className="font-mono text-purple-300 mt-0.5">
                User: <span className="text-pink-300">admin</span> | รหัสผ่าน: <span className="text-pink-300">npcadmin2026</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 py-3 font-bold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 text-sm mt-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>เข้าสู่ระบบเพื่อจัดการระบบ</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
