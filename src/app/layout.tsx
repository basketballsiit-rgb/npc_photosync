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
  const basePath =
    process.env.NEXT_PUBLIC_BASE_PATH ??
    (process.env.NODE_ENV === "production" ? "/npc_photosync" : "");

  return (
    <html lang="th" className={`${kanit.variable} font-sans`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var basePath = "${basePath}";
                if (!basePath) return;
                var origFetch = window.fetch;
                window.fetch = function(input, init) {
                  if (typeof input === "string" && input.startsWith("/api/")) {
                    input = basePath + input;
                  }
                  return origFetch(input, init);
                };
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#090514] text-slate-100 antialiased selection:bg-pink-500 selection:text-white">
        <div className="flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
