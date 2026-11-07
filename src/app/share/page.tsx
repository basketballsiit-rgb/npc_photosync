"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { apiUrl, getClientBasePath } from "@/lib/basepath";

declare global {
  interface Window {
    liff?: any;
  }
}

function ShareContent() {
  const searchParams = useSearchParams();
  const albumCode = searchParams.get("albumCode");
  const isTest = searchParams.get("test") === "1";

  const [status, setStatus] = useState<"loading" | "sharing" | "success" | "canceled" | "unsupported" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [albumData, setAlbumData] = useState<{
    title: string;
    albumCode: string;
    coverThumbnailUrl?: string;
    photoCount?: number;
  } | null>(null);
  const [flexPayload, setFlexPayload] = useState<any>(null);
  const [liffId, setLiffId] = useState<string>("2012443779-ygwuql9o");

  const liffInitializedRef = useRef(false);
  const shareTriggeredRef = useRef(false);

  // 1. Fetch Flex Message payload from API
  useEffect(() => {
    let active = true;
    async function loadFlex() {
      try {
        const query = isTest
          ? "test=1"
          : albumCode
          ? `albumCode=${encodeURIComponent(albumCode)}`
          : "test=1";

        const res = await fetch(apiUrl(`/api/line/flex?${query}`));
        const data = await res.json();
        if (!active) return;

        if (data.success) {
          setFlexPayload(data.flexMessage);
          setAlbumData(data.album);
          if (data.liffId) {
            setLiffId(data.liffId);
          }
        } else {
          setErrorMessage(data.error || "ไม่สามารถโหลดข้อมูลอัลบั้มสำหรับแชร์ได้");
          setStatus("error");
        }
      } catch (err: unknown) {
        if (!active) return;
        setErrorMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดึงข้อมูล");
        setStatus("error");
      }
    }
    loadFlex();
    return () => {
      active = false;
    };
  }, [albumCode, isTest]);

  // 2. Share trigger function
  const triggerShare = async (flexMsg?: any) => {
    const msgToSend = flexMsg || flexPayload;
    if (!msgToSend) return;

    if (!window.liff) {
      setErrorMessage("ระบบ LIFF กำลังเชื่อมต่อ กรุณากดปุ่มด้านล่างอีกครั้ง");
      setStatus("canceled");
      return;
    }

    try {
      setStatus("sharing");

      if (!window.liff.isLoggedIn()) {
        window.liff.login();
        return;
      }

      if (window.liff.isApiAvailable("shareTargetPicker")) {
        const pickerRes = await window.liff.shareTargetPicker([msgToSend]);
        if (pickerRes) {
          // Sent successfully into chosen chat(s)
          setStatus("success");
          setTimeout(() => {
            if (window.liff.isInClient()) {
              window.liff.closeWindow();
            }
          }, 1500);
        } else {
          // User canceled or dismissed picker modal
          setStatus("canceled");
        }
      } else {
        setStatus("unsupported");
      }
    } catch (err: unknown) {
      console.error("LIFF shareTargetPicker error:", err);
      setErrorMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่งข้อความ");
      setStatus("error");
    }
  };

  // 3. Initialize LIFF once SDK is loaded
  const initLiff = async () => {
    if (!window.liff || liffInitializedRef.current) return;
    liffInitializedRef.current = true;

    try {
      await window.liff.init({ liffId });
      // If flex payload was already fetched, launch picker immediately
      if (flexPayload && !shareTriggeredRef.current) {
        shareTriggeredRef.current = true;
        await triggerShare(flexPayload);
      }
    } catch (err: unknown) {
      console.error("LIFF Init error:", err);
      setErrorMessage(err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อระบบ LIFF ได้");
      setStatus("error");
    }
  };

  // 4. Auto-trigger once both LIFF and Flex payload are ready
  useEffect(() => {
    if (flexPayload && window.liff && liffInitializedRef.current && !shareTriggeredRef.current) {
      shareTriggeredRef.current = true;
      triggerShare(flexPayload);
    }
  }, [flexPayload]);

  const basePath = getClientBasePath();
  const albumUrl = albumData?.albumCode
    ? albumData.albumCode.startsWith("TEST-")
      ? `${basePath}/?openExternalBrowser=1`
      : `${basePath}/albums/${albumData.albumCode}?openExternalBrowser=1`
    : `${basePath}/?openExternalBrowser=1`;

  return (
    <>
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onLoad={initLiff}
      />

      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-white">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-5">
          {/* Header Branding */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              วิทยาลัยสารพัดช่างน่าน • NPC_PhotoSync
            </span>
            <h1 className="text-lg font-bold text-slate-100">
              ส่งต่อภาพกิจกรรมลงกลุ่ม LINE
            </h1>
            <p className="text-xs text-slate-400">
              ส่งการ์ด Flex Message ต้นฉบับสวยคมชัด เข้ากลุ่มไลน์ที่คุณเลือกได้ทันที
            </p>
          </div>

          {/* Album summary preview card */}
          {albumData && (
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 text-left flex items-center space-x-3">
              {albumData.coverThumbnailUrl && (
                <img
                  src={albumData.coverThumbnailUrl}
                  alt={albumData.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-slate-700"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white line-clamp-2">
                  {albumData.title}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  รหัส: <span className="font-mono text-cyan-400">{albumData.albumCode}</span> • {albumData.photoCount || 1} รูป
                </p>
              </div>
            </div>
          )}

          {/* Status Loading */}
          {status === "loading" && (
            <div className="py-6 space-y-3">
              <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-slate-300">กำลังเตรียมการ์ด Flex Message...</p>
            </div>
          )}

          {/* Status Sharing */}
          {status === "sharing" && (
            <div className="py-6 space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-slate-300">กำลังเปิดหน้าต่างเลือกห้องแชท LINE...</p>
            </div>
          )}

          {/* Status Success */}
          {status === "success" && (
            <div className="py-4 space-y-2">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <p className="text-base font-bold text-emerald-400">
                ส่งเข้ากลุ่ม LINE สำเร็จเรียบร้อย!
              </p>
              <p className="text-xs text-slate-400">
                หน้าต่างนี้จะปิดอัตโนมัติ...
              </p>
            </div>
          )}

          {/* Status Actions (Canceled / Unsupported / Error) */}
          {(status === "canceled" || status === "unsupported" || status === "error") && (
            <div className="space-y-4 pt-2">
              {status === "canceled" && (
                <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-lg">
                  ยังไม่ได้เลือกกลุ่มส่งต่อ สามารถกดปุ่มด้านล่างเพื่อเลือกกลุ่มอีกครั้งได้ครับ
                </p>
              )}

              {status === "unsupported" && (
                <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 p-3 rounded-lg text-left space-y-1">
                  <p className="font-semibold">💡 ข้อแนะนำสำหรับการเปิดบนเบราว์เซอร์ภายนอก:</p>
                  <p>
                    กรุณากดปุ่มด้านล่างเพื่อเข้าสู่ระบบ LINE และเลือกกลุ่มส่งต่อ หรือเปิดลิงก์นี้ในแอปพลิเคชัน LINE บนมือถือ
                  </p>
                </div>
              )}

              {status === "error" && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-3 rounded-lg text-left">
                  <p className="font-semibold">เกิดข้อผิดพลาด:</p>
                  <p>{errorMessage}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => triggerShare()}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2"
              >
                <span>↗️ กดเลือกกลุ่ม LINE เพื่อส่งต่อการ์ด</span>
              </button>
            </div>
          )}

          {/* Action buttons footer */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            <a
              href={albumUrl}
              className="text-xs text-sky-400 hover:text-sky-300 underline py-1 transition-colors"
            >
              🌐 เปิดดูภาพและดาวน์โหลดใน PhotoSync
            </a>
            <button
              type="button"
              onClick={() => {
                if (window.liff && window.liff.isInClient()) {
                  window.liff.closeWindow();
                } else {
                  window.close();
                }
              }}
              className="text-xs text-slate-500 hover:text-slate-400 py-1 transition-colors"
            >
              ปิดหน้านี้
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
