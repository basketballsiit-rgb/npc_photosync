import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NPC_PhotoSync • ระบบคลังภาพดิจิทัล วิทยาลัยสารพัดช่างน่าน",
  description:
    "Digital Asset Management (DAM) & Smart PR Cloud Synchronization สำหรับวิทยาลัยสารพัดช่างน่าน เชื่อมโยงระบบรายงานโครงการ 5 บท npc_smartflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${kanit.variable} font-sans`}>
      <body className="bg-[#090514] text-slate-100 antialiased selection:bg-pink-500 selection:text-white">
        <div className="flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
