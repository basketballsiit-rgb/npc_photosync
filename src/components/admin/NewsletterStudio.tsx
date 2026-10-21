"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Copy,
  Printer,
  Sparkles,
  Image as ImageIcon,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  ChevronRight,
  Layers,
  Calendar,
  Building,
  CheckCircle2,
  FileText,
  Upload,
  AlertCircle,
  Eye,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { toPng } from "html-to-image";
import { showAlert } from "@/lib/sweetalert";
import { getClientBasePath, apiUrl } from "@/lib/basepath";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  images: string[];
}

interface AlbumOption {
  id: string;
  albumCode: string;
  title: string;
  eventDate?: string;
  departmentName?: string;
  coverImage?: string;
  photos?: { id: string; url: string; originalName?: string }[];
}

interface NewsletterStudioProps {
  currentTermName?: string;
}

export function NewsletterStudio({ currentTermName }: NewsletterStudioProps) {
  // Layout mode: "4_grid" (2x2), "3_digest" (1 top + 2 bottom), "2_split" (2 rows), "1_hero" (1 big)
  const [layout, setLayout] = useState<"4_grid" | "3_digest" | "2_split" | "1_hero">("4_grid");

  // Subheader pills
  const [termText, setTermText] = useState(currentTermName ? `ประจำ${currentTermName}` : "ประจำภาคเรียนที่ 2 ปีการศึกษา 2569");
  const [issueText, setIssueText] = useState("ฉบับที่ 24");
  const [monthText, setMonthText] = useState("เดือนกันยายน 2569");

  // News items
  const [news, setNews] = useState<NewsItem[]>([
    {
      id: "news_1",
      title: "โครงการรณรงค์ป้องกันและแก้ไขปัญหายาเสพติดในสถานศึกษา ประจำปีงบประมาณ 2569",
      content:
        "ในวันที่ 22 กันยายน 2569 นายอรรณพ ทาการ พร้อมด้วย นางสาวชัญญา ภูมิปัญญา ครูที่ปรึกษางาน TO BE NUMBER ONE วิทยาลัยสารพัดช่างน่าน ได้เข้าร่วม รายงานผลการดำเนินโครงการรณรงค์ป้องกันและแก้ไขปัญหายาเสพติดในสถานศึกษา ประจำปีงบประมาณ 2569 ในรูปแบบออนไลน์",
      images: [
        "/npc_photosync/assets/npc-watermark.png",
      ],
    },
    {
      id: "news_2",
      title: "ประชุมคณะกรรมการพิจารณาเพื่ออนุมัติผลการเรียน ภาคเรียนที่ 1 ปีการศึกษา 2569",
      content:
        "ในวันที่ 22 กันยายน 2569 นายกชเชษฐ์ ก๋งชนะ ผู้ช่วยผู้อำนวยการวิทยาลัยสารพัดช่างน่าน พร้อมด้วย นายนิพนธ์ ร่องพืช ฝ่ายวิชาการ และงานวัดผลประเมินผล ฝ่ายวิชาการ ประชุมคณะกรรมการพิจารณาเพื่ออนุมัติผลการเรียน ภาคเรียนที่ 1 ปีการศึกษา 2569 ณ ห้องประชุมเกียรติยศ อาคารวิทยบริการ วิทยาลัยสารพัดช่างน่าน",
      images: [],
    },
    {
      id: "news_3",
      title: "การใช้งานระบบบริหารจัดการองค์การนักวิชาชีพในอนาคตแห่งประเทศไทย (OVEC-AFT)",
      content:
        "ในระหว่างวันที่ 23-25 กันยายน 2569 นางสาวชัญญา ภูมิปัญญา ครูที่ปรึกษาองค์การนักวิชาชีพในอนาคตแห่งประเทศไทย วิทยาลัยสารพัดช่างน่าน เข้าร่วมโครงการอบรมเชิงปฏิบัติการ \"การใช้งานระบบบริหารจัดการองค์การนักวิชาชีพในอนาคตแห่งประเทศไทย (OVEC-AFT)\" นำร่องสถานศึกษาในพื้นที่ภาคเหนือ ณ โรงแรมเชียงใหม่ภูคำ อำเภอเมือง จังหวัดเชียงใหม่",
      images: [],
    },
    {
      id: "news_4",
      title: "งานประเพณีทำบุญถวายทานสลากภัต ประจำปีพุทธศักราช 2569",
      content:
        "ในวันที่ 26 กันยายน พ.ศ.2569 นายกชเชษฐ์ ก๋งชนะ ผู้ช่วยผู้อำนวยการวิทยาลัยสารพัดช่างน่าน พร้อมด้วยผู้บริหาร คณะครู และบุคลากรทางการศึกษาเข้าร่วมงานประเพณีทำบุญถวายทานสลากภัตประจำปีพุทธศักราช 2569 ณ บริเวณรอบวัดพระธาตุช้างค้ำวรวิหาร",
      images: [],
    },
  ]);

  const [activeNewsIndex, setActiveNewsIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Photo Picker Modal state
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [targetNewsIndex, setTargetNewsIndex] = useState(0);
  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumOption | null>(null);
  const [isAlbumsLoading, setIsAlbumsLoading] = useState(false);
  const [albumSearch, setAlbumSearch] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentTermName) {
      setTermText(`ประจำ${currentTermName}`);
    }
  }, [currentTermName]);

  // Load albums from system for photo picker
  const loadAlbums = async () => {
    setIsAlbumsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/albums?t=${Date.now()}`));
      const data = await res.json();
      if (data.success && Array.isArray(data.albums)) {
        setAlbums(data.albums);
      }
    } catch (err) {
      console.warn("Could not load albums for photo picker:", err);
    } finally {
      setIsAlbumsLoading(false);
    }
  };

  const openPhotoPicker = (newsIndex: number) => {
    setTargetNewsIndex(newsIndex);
    setIsPhotoPickerOpen(true);
    if (albums.length === 0) {
      loadAlbums();
    }
  };

  const handleSelectPhoto = (url: string) => {
    setNews((prev) => {
      const next = [...prev];
      const target = { ...next[targetNewsIndex] };
      if (!target.images) target.images = [];
      if (target.images.length >= 4) {
        showAlert.info("จำกัดรูปภาพ", "สามารถใส่ภาพประกอบได้สูงสุด 4 ภาพต่อ 1 ข่าว");
        return prev;
      }
      target.images = [...target.images, url];
      next[targetNewsIndex] = target;
      return next;
    });
  };

  const handleRemovePhoto = (newsIndex: number, imgIndex: number) => {
    setNews((prev) => {
      const next = [...prev];
      const target = { ...next[newsIndex] };
      target.images = target.images.filter((_, idx) => idx !== imgIndex);
      next[newsIndex] = target;
      return next;
    });
  };

  const handleAutofillFromAlbum = (album: AlbumOption, newsIndex: number) => {
    setNews((prev) => {
      const next = [...prev];
      const target = { ...next[newsIndex] };
      target.title = album.title;
      let dateStr = "";
      if (album.eventDate) {
        try {
          const d = new Date(album.eventDate);
          dateStr = `เมื่อวันที่ ${d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}`;
        } catch {}
      }
      target.content = `${dateStr} ${album.departmentName ? `ฝ่าย/แผนก ${album.departmentName}` : "วิทยาลัยสารพัดช่างน่าน"} ได้จัดกิจกรรม ${album.title} เพื่อส่งเสริมและพัฒนาศักยภาพผู้เรียนและการจัดการศึกษา ณ วิทยาลัยสารพัดช่างน่าน`;
      
      // Auto-attach up to 4 photos
      if (album.photos && album.photos.length > 0) {
        target.images = album.photos.slice(0, 4).map((p) => p.url);
      } else if (album.coverImage) {
        target.images = [album.coverImage];
      }
      next[newsIndex] = target;
      return next;
    });
    showAlert.success("ดึงข้อมูลสำเร็จ", `นำข้อมูลจากอัลบั้ม "${album.title}" ใส่ในข่าวที่ ${newsIndex + 1} แล้ว`);
    setIsPhotoPickerOpen(false);
  };

  // Download high-res PNG image
  const handleDownloadImage = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        quality: 0.95,
        pixelRatio: 2.5, // 2.5x scale generates super-crisp HD 1800x2560px image
        cacheBust: true,
      });

      const link = document.createElement("a");
      const safeIssue = issueText.replace(/[^a-zA-Z0-9ก-๙]/g, "_");
      link.download = `จดหมายข่าว_วิทยาลัยสารพัดช่างน่าน_${safeIssue}.png`;
      link.href = dataUrl;
      link.click();

      showAlert.success("ดาวน์โหลดภาพสำเร็จ", "ภาพจดหมายข่าวความละเอียดสูง (HD) ถูกบันทึกลงในเครื่องของคุณแล้ว พร้อมโพสต์ลง Facebook หรือแชร์ในกลุ่มไลน์");
    } catch (err) {
      console.error("Export error:", err);
      showAlert.error("ข้อผิดพลาด", "ไม่สามารถแปลงภาพข่าวได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Facebook caption to clipboard
  const handleCopyCaption = () => {
    const activeCount = layout === "4_grid" ? 4 : layout === "3_digest" ? 3 : layout === "2_split" ? 2 : 1;
    const currentNews = news.slice(0, activeCount);

    let caption = `📰 จดหมายข่าวประชาสัมพันธ์ วิทยาลัยสารพัดช่างน่าน\n`;
    caption += `${termText} • ${issueText} • ${monthText}\n\n`;

    currentNews.forEach((item, idx) => {
      caption += `📌 ข่าวที่ ${idx + 1}: ${item.title}\n`;
      caption += `${item.content}\n\n`;
    });

    caption += `-----------------------------------------\n`;
    caption += `🌐 ติดตามภาพกิจกรรมฉบับเต็มได้ที่คลังภาพดิจิทัล: https://service.npc.ac.th/npc_photosync\n`;
    caption += `📞 สอบถามข้อมูลเพิ่มเติม: 054-710367, 086-114-3607\n`;
    caption += `#วิทยาลัยสารพัดช่างน่าน #จดหมายข่าวประชาสัมพันธ์ #อาชีวศึกษาน่าน #เด็กอาชีวะ #NPCPhotoSync`;

    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 3000);
    showAlert.success("คัดลอกแคปชั่นสำเร็จ", "คัดลอกเนื้อหาข่าวพร้อมแฮชแท็กสำหรับโพสต์ Facebook แล้ว สามารถนำไปวาง (Paste) ได้ทันที");
  };

  // Print A4
  const handlePrint = () => {
    window.print();
  };

  const getNewsLimit = () => {
    if (layout === "4_grid") return 4;
    if (layout === "3_digest") return 3;
    if (layout === "2_split") return 2;
    return 1;
  };

  const filteredAlbums = albums.filter((a) =>
    a.title.toLowerCase().includes(albumSearch.toLowerCase()) ||
    (a.departmentName && a.departmentName.toLowerCase().includes(albumSearch.toLowerCase()))
  );

  const basePath = getClientBasePath();

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-700/50 bg-gradient-to-r from-[#170B38]/90 via-[#10072C]/90 to-[#0B041E]/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-xs font-semibold text-pink-300">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span>ระบบจัดทำจดหมายข่าวหน้าเดียว (One-Page News Creator)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>📰 สตูดิโอจดหมายข่าว & โพสต์โซเชียล</span>
            </h2>
            <p className="text-xs text-purple-300/80">
              สร้างภาพจดหมายข่าวตามอัตลักษณ์วิทยาลัยสารพัดช่างน่านแบบคงธีมมาตรฐาน 100% พร้อมหัว-ท้ายผู้บริหาร ปรับแก้เนื้อหาและเลือกรูปจากคลังภาพได้ทันที
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>กำลังเรนเดอร์ภาพ HD...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>บันทึกภาพ HD (PNG)</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyCaption}
              className="flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all shadow-sm"
              title="คัดลอกพาดหัวและเนื้อหาข่าวสำหรับโพสต์ลง Facebook"
            >
              {copiedCaption ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copiedCaption ? "คัดลอกแล้ว!" : "คัดลอกแคปชั่น FB"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-2xl border border-purple-700/40 bg-purple-900/30 px-3.5 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-800/40 transition-all shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์ A4</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Controls (Editor) + Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section 1: Layout Selection */}
          <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-pink-400" />
                <span>1. เลือกองค์ประกอบการจัดวางข่าว (Layout)</span>
              </label>
              <span className="text-[11px] text-pink-300 font-mono font-bold">
                {getNewsLimit()} ข่าวต่อแผ่น
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setLayout("4_grid")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  layout === "4_grid"
                    ? "border-pink-500 bg-pink-500/15 text-white font-bold shadow-md shadow-pink-500/15"
                    : "border-purple-800/40 bg-[#1A0C42]/70 text-purple-300 hover:border-purple-700 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">4 ข่าว (Grid 2x2)</span>
                  <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded-full font-mono">
                    ตามแบบ
                  </span>
                </div>
                <p className="text-[10px] text-purple-400/80 line-clamp-2">
                  เหมือนภาพตัวอย่างเป๊ะ เหมาะสำหรับสรุปข่าวกิจกรรมรอบสัปดาห์
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLayout("3_digest")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  layout === "3_digest"
                    ? "border-pink-500 bg-pink-500/15 text-white font-bold shadow-md shadow-pink-500/15"
                    : "border-purple-800/40 bg-[#1A0C42]/70 text-purple-300 hover:border-purple-700 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">3 ข่าว (1 เด่น + 2 ย่อย)</span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-mono">
                    ยอดนิยม
                  </span>
                </div>
                <p className="text-[10px] text-purple-400/80 line-clamp-2">
                  ข่าวเด่นภาพใหญ่ด้านบน + 2 ข่าวกิจกรรมย่อยด้านล่าง
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLayout("2_split")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  layout === "2_split"
                    ? "border-pink-500 bg-pink-500/15 text-white font-bold shadow-md shadow-pink-500/15"
                    : "border-purple-800/40 bg-[#1A0C42]/70 text-purple-300 hover:border-purple-700 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">2 ข่าว (แบ่งครึ่ง 50:50)</span>
                </div>
                <p className="text-[10px] text-purple-400/80 line-clamp-2">
                  สำหรับข่าวสำคัญ 2 เรื่อง มีพื้นที่บรรยายและรูปภาพขนาดใหญ่
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLayout("1_hero")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  layout === "1_hero"
                    ? "border-pink-500 bg-pink-500/15 text-white font-bold shadow-md shadow-pink-500/15"
                    : "border-purple-800/40 bg-[#1A0C42]/70 text-purple-300 hover:border-purple-700 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">1 ข่าวเด่นพิเศษ (Full)</span>
                </div>
                <p className="text-[10px] text-purple-400/80 line-clamp-2">
                  ข่าวรางวัลระดับชาติ โครงการใหญ่ หรือพิธีการสำคัญเต็มแผ่น
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Header Information Strip Settings */}
          <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 shadow-xl backdrop-blur-md space-y-3">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-400" />
              <span>2. ข้อมูลแถบหัวจดหมายข่าว (ฉบับที่ & วันที่)</span>
            </label>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-purple-300 font-semibold mb-1 block">ภาคเรียน / ปีการศึกษา</label>
                <input
                  type="text"
                  value={termText}
                  onChange={(e) => setTermText(e.target.value)}
                  placeholder="เช่น ประจำภาคเรียนที่ 2 ปีการศึกษา 2569"
                  className="w-full rounded-2xl border border-purple-800/50 bg-[#1C0E46] px-3.5 py-2 text-white focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-purple-300 font-semibold mb-1 block">ฉบับที่</label>
                  <input
                    type="text"
                    value={issueText}
                    onChange={(e) => setIssueText(e.target.value)}
                    placeholder="เช่น ฉบับที่ 24"
                    className="w-full rounded-2xl border border-purple-800/50 bg-[#1C0E46] px-3.5 py-2 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-purple-300 font-semibold mb-1 block">ประจำเดือน / ปี</label>
                  <input
                    type="text"
                    value={monthText}
                    onChange={(e) => setMonthText(e.target.value)}
                    placeholder="เช่น เดือนกันยายน 2569"
                    className="w-full rounded-2xl border border-purple-800/50 bg-[#1C0E46] px-3.5 py-2 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: News Content Editor */}
          <div className="rounded-3xl border border-purple-800/40 bg-[#140A32]/85 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                <span>3. ปรับแต่งเนื้อหาข่าว ({getNewsLimit()} ข่าว)</span>
              </label>

              {/* News Tab Switcher */}
              <div className="flex items-center gap-1 bg-[#1A0C42] p-1 rounded-2xl border border-purple-800/40">
                {Array.from({ length: getNewsLimit() }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveNewsIndex(idx)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      activeNewsIndex === idx
                        ? "bg-pink-500 text-white shadow-sm"
                        : "text-purple-300 hover:text-white"
                    }`}
                  >
                    ข่าว {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Active News Form */}
            {news[activeNewsIndex] && (
              <div className="space-y-3 text-xs bg-[#1A0C42]/60 p-4 rounded-2xl border border-purple-800/30">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-pink-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-pink-400" />
                    กำลังแก้ไข ข่าวที่ {activeNewsIndex + 1}
                  </span>

                  {/* Pick Photo & Autofill from Album Button */}
                  <button
                    type="button"
                    onClick={() => openPhotoPicker(activeNewsIndex)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-pink-500/40 bg-pink-500/20 text-xs font-bold text-pink-200 hover:bg-pink-500 hover:text-white transition-all shadow-sm"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>เลือกรูปจากคลังภาพ / ดึงข้อมูล</span>
                  </button>
                </div>

                <div>
                  <label className="text-purple-200 font-semibold mb-1 block">หัวข้อข่าว (พาดหัวบนการ์ด)</label>
                  <textarea
                    rows={2}
                    value={news[activeNewsIndex].title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNews((prev) => {
                        const next = [...prev];
                        next[activeNewsIndex] = { ...next[activeNewsIndex], title: val };
                        return next;
                      });
                    }}
                    placeholder="ระบุพาดหัวข่าวสั้นกระชับ..."
                    className="w-full rounded-xl border border-purple-800/50 bg-[#140A32] px-3.5 py-2 text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-purple-200 font-semibold mb-1 block">เนื้อหาข่าวบรรยาย</label>
                  <textarea
                    rows={4}
                    value={news[activeNewsIndex].content}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNews((prev) => {
                        const next = [...prev];
                        next[activeNewsIndex] = { ...next[activeNewsIndex], content: val };
                        return next;
                      });
                    }}
                    placeholder="เมื่อวันที่... นาย/นาง... ได้จัดกิจกรรม..."
                    className="w-full rounded-xl border border-purple-800/50 bg-[#140A32] px-3.5 py-2 text-white focus:border-pink-500 focus:outline-none text-[11px] leading-relaxed"
                  />
                </div>

                {/* Selected Images for this news */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-purple-200 font-semibold">
                      รูปภาพประกอบข่าว ({news[activeNewsIndex].images.length}/4 ภาพ)
                    </label>
                    <span className="text-[10px] text-purple-400">
                      ใส่ได้ 1 - 4 ภาพ
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {news[activeNewsIndex].images.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        className="group relative aspect-video rounded-xl overflow-hidden border border-purple-700/50 bg-black/40 shadow-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`รูปประกอบ ${imgIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(activeNewsIndex, imgIdx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="ลบรูปนี้"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {news[activeNewsIndex].images.length < 4 && (
                      <button
                        type="button"
                        onClick={() => openPhotoPicker(activeNewsIndex)}
                        className="aspect-video rounded-xl border-2 border-dashed border-purple-800/60 bg-[#140A32]/50 hover:border-pink-500/60 hover:bg-pink-500/10 flex flex-col items-center justify-center text-purple-400 hover:text-pink-300 transition-all text-[10px]"
                      >
                        <Plus className="h-4 w-4 mb-0.5" />
                        <span>เพิ่มภาพ</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Canvas Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-3 sticky top-24">
          <div className="flex items-center justify-between text-xs font-bold text-purple-200">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-pink-400" />
              <span>ภาพตัวอย่างจดหมายข่าวจริง (Live A4 Preview)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              สัดส่วนมาตรฐาน A4 / โพสต์เฟซบุ๊กคมชัด 100%
            </span>
          </div>

          {/* Canvas Wrapper - Fixed 723px width or scalable container */}
          <div className="rounded-3xl border border-purple-800/50 bg-[#0A0418] p-3 sm:p-5 shadow-2xl overflow-x-auto flex justify-center">
            {/* THE PRINT/EXPORT CANVAS (Width: 723px matching exact source) */}
            <div
              ref={canvasRef}
              id="newsletter-canvas-container"
              style={{ width: "723px", minWidth: "723px", backgroundColor: "#ffffff" }}
              className="text-slate-900 shadow-2xl relative font-sans select-none flex flex-col justify-between"
            >
              {/* TOP HEADER: 100% Exact from College Template */}
              <div className="relative w-full overflow-hidden" style={{ height: "180px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${basePath}/assets/newsletter/newsletter_header_banner.png`}
                  alt="วิทยาลัยสารพัดช่างน่าน จดหมายข่าว ประชาสัมพันธ์"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* SUBHEADER PILLS STRIP: Dynamic Term, Issue, Month */}
              <div
                className="w-full flex items-center gap-3 px-6 py-2 relative"
                style={{
                  backgroundImage: `url(${basePath}/assets/newsletter/newsletter_substrip_clean.png)`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  minHeight: "46px",
                }}
              >
                {/* Term Pill (White) */}
                <div className="rounded-full bg-white px-3.5 py-1 text-[11px] font-bold text-[#002f6c] shadow-sm border border-slate-200 shrink-0">
                  {termText}
                </div>

                {/* Issue Pill (Dark Blue) */}
                <div className="rounded-full bg-[#002868] px-3.5 py-1 text-[11px] font-bold text-white shadow-sm shrink-0 border border-blue-400/30">
                  {issueText}
                </div>

                {/* Month Pill (Cyan Blue) */}
                <div className="rounded-full bg-[#0098d8] px-3.5 py-1 text-[11px] font-bold text-white shadow-sm shrink-0 border border-cyan-300/40">
                  {monthText}
                </div>
              </div>

              {/* NEWS CONTENT AREA: White background with dynamic layout */}
              <div className="p-4 bg-white flex-1" style={{ minHeight: "680px" }}>
                {/* Layout Mode 1: 4 Cards (Grid 2x2) - Default like user sample */}
                {layout === "4_grid" && (
                  <div className="grid grid-cols-2 gap-3.5 h-full">
                    {news.slice(0, 4).map((item, idx) => (
                      <NewsCardItem key={item.id} item={item} index={idx} layout={layout} />
                    ))}
                  </div>
                )}

                {/* Layout Mode 2: 3 Cards (1 Top Hero + 2 Bottom) */}
                {layout === "3_digest" && (
                  <div className="space-y-3.5 h-full flex flex-col">
                    {/* Hero News (Top) */}
                    {news[0] && (
                      <div className="flex-1">
                        <NewsCardItem item={news[0]} index={0} layout={layout} isHero />
                      </div>
                    )}
                    {/* Bottom 2 News */}
                    <div className="grid grid-cols-2 gap-3.5 flex-1">
                      {news.slice(1, 3).map((item, idx) => (
                        <NewsCardItem key={item.id} item={item} index={idx + 1} layout={layout} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Layout Mode 3: 2 Cards (Split 50:50) */}
                {layout === "2_split" && (
                  <div className="space-y-3.5 h-full flex flex-col">
                    {news.slice(0, 2).map((item, idx) => (
                      <div key={item.id} className="flex-1">
                        <NewsCardItem item={item} index={idx} layout={layout} isWide />
                      </div>
                    ))}
                  </div>
                )}

                {/* Layout Mode 4: 1 Mega Hero Story */}
                {layout === "1_hero" && news[0] && (
                  <div className="h-full">
                    <NewsCardItem item={news[0]} index={0} layout={layout} isFullPage />
                  </div>
                )}
              </div>

              {/* BOTTOM FOOTER: 100% Exact from College Template */}
              <div className="relative w-full overflow-hidden" style={{ height: "64px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${basePath}/assets/newsletter/newsletter_footer_banner.png`}
                  alt="ติดต่อสอบถามเพิ่มเติมได้ที่ วิทยาลัยสารพัดช่างน่าน"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PHOTO PICKER MODAL */}
      {isPhotoPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-purple-700/50 bg-[#12082b] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-purple-800/40 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-pink-400" />
                  <span>เลือกรูปภาพจากคลังภาพสำหรับ ข่าวที่ {targetNewsIndex + 1}</span>
                </h3>
                <p className="text-xs text-purple-300/80">
                  เลือกรูปกิจกรรมที่อัปโหลดไว้ในระบบ หรือคลิกเพื่อดึงข้อมูลชื่อกิจกรรมและวันที่มาใส่ในข่าวทันที
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPhotoPickerOpen(false)}
                className="p-2 rounded-full text-purple-400 hover:text-white hover:bg-purple-800/40"
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-purple-800/30 bg-[#160A38]/50 flex items-center gap-3">
              <input
                type="text"
                value={albumSearch}
                onChange={(e) => setAlbumSearch(e.target.value)}
                placeholder="🔍 ค้นหาชื่อกิจกรรม หรือ แผนกวิชา..."
                className="flex-1 rounded-2xl border border-purple-800/50 bg-[#1C0E46] px-4 py-2 text-xs text-white placeholder-purple-400/60 focus:border-pink-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={loadAlbums}
                className="p-2 rounded-2xl border border-purple-700/40 bg-purple-900/30 text-purple-300 hover:text-white"
                title="รีเฟรชรายการอัลบั้ม"
              >
                <RefreshCw className={`h-4 w-4 ${isAlbumsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Modal Body: Album List & Photos */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isAlbumsLoading ? (
                <div className="text-center py-12 text-purple-300 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-pink-400" />
                  <span>กำลังโหลดรายการอัลบั้มจากระบบ...</span>
                </div>
              ) : filteredAlbums.length === 0 ? (
                <div className="text-center py-12 text-purple-400 text-xs">
                  ไม่พบอัลบั้มภาพกิจกรรม กรุณาลองค้นหาคำอื่น
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAlbums.map((album) => (
                    <div
                      key={album.id}
                      className="rounded-2xl border border-purple-800/40 bg-[#190C3E]/70 p-4 space-y-3 hover:border-pink-500/50 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-xs line-clamp-2">
                            {album.title}
                          </h4>
                          <span className="text-[10px] bg-purple-500/20 text-pink-300 px-2 py-0.5 rounded-full font-mono shrink-0">
                            {album.photos?.length || 0} ภาพ
                          </span>
                        </div>
                        {album.departmentName && (
                          <p className="text-[10px] text-cyan-300">
                            🏛️ {album.departmentName}
                          </p>
                        )}
                        {album.eventDate && (
                          <p className="text-[10px] text-purple-400">
                            📅 {new Date(album.eventDate).toLocaleDateString("th-TH")}
                          </p>
                        )}
                      </div>

                      {/* Photo Thumbnail previews */}
                      {album.photos && album.photos.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          {album.photos.slice(0, 4).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPhoto(p.url)}
                              className="group relative aspect-square rounded-lg overflow-hidden border border-purple-800/40 bg-black/40 hover:border-pink-500 transition-all"
                              title="คลิกเพื่อเลือกภาพนี้ใส่ในข่าว"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.url} alt="รูปกิจกรรม" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-pink-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold">
                                + ใส่
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action Button: Autofill everything from this album */}
                      <div className="pt-2 border-t border-purple-800/30 flex items-center justify-between">
                        <span className="text-[10px] text-purple-400">
                          {album.albumCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAutofillFromAlbum(album, targetNewsIndex)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-[10px] hover:opacity-95 shadow-sm"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>ดึงชื่อ & รูปทั้งหมดใส่อัตโนมัติ</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-purple-800/40 bg-[#12082b] flex items-center justify-between">
              <span className="text-[11px] text-purple-400">
                💡 สามารถคลิกเลือกภาพทีละภาพ หรือกดปุ่ม "ดึงชื่อ & รูปทั้งหมด" เพื่อความสะดวกรวดเร็ว
              </span>
              <button
                type="button"
                onClick={() => setIsPhotoPickerOpen(false)}
                className="px-4 py-2 rounded-2xl bg-purple-900/40 border border-purple-700/40 text-xs font-semibold text-purple-200 hover:text-white"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Single News Card inside the Canvas Preview
 */
function NewsCardItem({
  item,
  index,
  layout,
  isHero,
  isWide,
  isFullPage,
}: {
  item: NewsItem;
  index: number;
  layout: string;
  isHero?: boolean;
  isWide?: boolean;
  isFullPage?: boolean;
}) {
  const images = item.images || [];

  return (
    <div
      className="border-2 border-[#0088cc] rounded-2xl bg-white shadow-sm p-3 flex flex-col justify-between h-full"
      style={{
        boxShadow: "0 2px 8px rgba(0, 136, 204, 0.08)",
      }}
    >
      {/* 1. Header Capsule Title Badge (matching exact original sample!) */}
      <div className="w-full mb-2">
        <div className="w-full bg-gradient-to-r from-[#003380] via-[#004ca8] to-[#003380] text-white text-center font-bold py-1 px-3 rounded-full text-[11px] shadow-sm leading-tight line-clamp-2">
          {item.title || `หัวข้อข่าวกิจกรรมที่ ${index + 1}`}
        </div>
      </div>

      {/* 2. Photo Gallery Grid */}
      <div className="flex-1 flex flex-col justify-center my-1">
        {images.length === 0 ? (
          <div className="w-full aspect-[16/9] rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 text-[10px]">
            <span>(ยังไม่ได้ใส่รูปภาพประกอบข่าวนี้)</span>
          </div>
        ) : images.length === 1 ? (
          <div className={`w-full rounded-xl overflow-hidden border border-slate-200 ${isFullPage ? "aspect-[16/9]" : isWide ? "aspect-[21/9]" : "aspect-[16/10]"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[0]} alt={item.title} className="w-full h-full object-cover" />
          </div>
        ) : images.length === 2 ? (
          <div className="grid grid-cols-2 gap-1.5 w-full">
            {images.slice(0, 2).map((img, i) => (
              <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`ภาพ ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : images.length === 3 ? (
          <div className="space-y-1.5 w-full">
            <div className="aspect-[21/9] rounded-lg overflow-hidden border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt="ภาพหลัก" className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {images.slice(1, 3).map((img, i) => (
                <div key={i} className="aspect-[16/9] rounded-lg overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`ภาพ ${i + 2}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 4 images - exact 2x2 grid */
          <div className="grid grid-cols-2 gap-1.5 w-full">
            {images.slice(0, 4).map((img, i) => (
              <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`ภาพ ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. News Description Text */}
      <div className="mt-2 text-slate-800 text-[10.5px] leading-relaxed text-justify line-clamp-5">
        {item.content || "กรุณาระบุรายละเอียดข่าว วันที่จัดกิจกรรม สถานที่ และผู้เข้าร่วมโครงการ..."}
      </div>
    </div>
  );
}
