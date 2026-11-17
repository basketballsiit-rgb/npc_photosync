"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { TrashManager } from "@/components/admin/TrashManager";
import { ArrowLeft, Shield } from "lucide-react";

export default function AdminTrashPage() {
  const getClientBasePath = () => {
    if (typeof window !== "undefined") {
      return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-[#0A0518] text-white">
      <Navbar />

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs font-semibold text-purple-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>กลับสู่หน้าจัดการผู้ดูแลระบบ (Admin Dashboard)</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-full">
            <Shield className="h-3.5 w-3.5" />
            <span>โหมดจัดการถังขยะและกู้คืนข้อมูล</span>
          </div>
        </div>

        <TrashManager />
      </main>
    </div>
  );
}
