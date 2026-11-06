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
  ArrowLeft,
  Calendar,
  Building,
  CheckCircle2,
  FileText,
  Eye,
  Sliders,
  CheckSquare,
  Square,
  Search,
} from "lucide-react";
import { toPng } from "html-to-image";
import { showAlert } from "@/lib/sweetalert";
import { getClientBasePath, apiUrl } from "@/lib/basepath";
import { formatNewsletterProse } from "@/lib/news-utils";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  images: string[];
  albumCode?: string;
  rawDescription?: string;
  albumMeta?: {
    title: string;
    eventDate?: string | Date;
    divisionName?: string;
    departmentName?: string;
  };
}

interface AlbumSummary {
  id: string;
  albumCode: string;
  title: string;
  description?: string | null;
  eventDate?: string;
  departmentName?: string;
  divisionName?: string;
  coverThumbnailUrl?: string | null;
  photoCount?: number;
}

interface MediaPhoto {
  id: string;
  fileName: string;
  thumbnailWebpUrl: string;
  reportReadyJpgUrl: string;
  isFeatured?: boolean;
}

interface DetailedAlbum extends AlbumSummary {
  mediaFiles: MediaPhoto[];
}

interface NewsletterStudioProps {
  currentTermName?: string;
}

function resolveImageUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const base = getClientBasePath();
  const clean = url.startsWith("/") ? url : `/${url}`;
  return `${base}${clean}`;
}

export function NewsletterStudio({ currentTermName }: NewsletterStudioProps) {
  // Layout mode: "4_grid" (2x2), "3_digest" (1 top + 2 bottom), "2_split" (2 rows), "1_hero" (1 big)
  const [layout, setLayout] = useState<"4_grid" | "3_digest" | "2_split" | "1_hero">("4_grid");

  // Subheader pills
  const [termText, setTermText] = useState(
    currentTermName ? `ประจำ${currentTermName}` : "ประจำภาคเรียนที่ 2 ปีการศึกษา 2569"
  );
  const [issueText, setIssueText] = useState("ฉบับที่ 24");
  const [monthText, setMonthText] = useState("เดือนกันยายน 2569");

  // News items
  const [news, setNews] = useState<NewsItem[]>([
    {
      id: "news_1",
      title: "โครงการรณรงค์ป้องกันและแก้ไขปัญหายาเสพติดในสถานศึกษา ประจำปีงบประมาณ 2569",
      content:
        "ในวันที่ 22 กันยายน 2569 ณ วิทยาลัยสารพัดช่างน่าน นายอรรณพ ทาการ และนางสาวชัญญา ภูมิปัญญา ได้เข้าร่วมรายงานผลการดำเนินงานโครงการรณรงค์ป้องกันและแก้ไขปัญหายาเสพติดในสถานศึกษา",
      images: [],
    },
    {
      id: "news_2",
      title: "ประชุมคณะกรรมการพิจารณาเพื่ออนุมัติผลการเรียน ภาคเรียนที่ 1 ปีการศึกษา 2569",
      content:
        "เมื่อวันที่ 22 กันยายน 2569 นายกชเชษฐ์ ก๋งชนะ ผู้ช่วยผู้อำนวยการฯ พร้อมด้วยคณะกรรมการฝ่ายวิชาการ ได้ร่วมประชุมพิจารณาอนุมัติผลการเรียน ณ ห้องประชุมเกียรติยศ อาคารวิทยบริการ",
      images: [],
    },
    {
      id: "news_3",
      title: "การใช้งานระบบบริหารจัดการองค์การนักวิชาชีพในอนาคตแห่งประเทศไทย (OVEC-AFT)",
      content:
        "ระหว่างวันที่ 23-25 กันยายน 2569 ครูผู้แทนวิทยาลัยสารพัดช่างน่าน เข้าร่วมโครงการอบรมเชิงปฏิบัติการ OVEC-AFT นำร่องสถานศึกษาในพื้นที่ภาคเหนือ ณ จังหวัดเชียงใหม่",
      images: [],
    },
    {
      id: "news_4",
      title: "งานประเพณีทำบุญถวายทานสลากภัต ประจำปีพุทธศักราช 2569",
      content:
        "เมื่อวันที่ 26 กันยายน 2569 ผู้บริหาร คณะครู และบุคลากรทางการศึกษา วิทยาลัยสารพัดช่างน่าน เข้าร่วมงานประเพณีทำบุญถวายทานสลากภัต ณ วัดพระธาตุช้างค้ำวรวิหาร",
      images: [],
    },
  ]);

  const [activeNewsIndex, setActiveNewsIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Photo Picker Modal state
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [targetNewsIndex, setTargetNewsIndex] = useState(0);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [isAlbumsLoading, setIsAlbumsLoading] = useState(false);
  const [albumSearch, setAlbumSearch] = useState("");

  // Modal Drilldown State (View photos inside an album)
  const [selectedDrilldownAlbum, setSelectedDrilldownAlbum] = useState<DetailedAlbum | null>(null);
  const [isDrilldownLoading, setIsDrilldownLoading] = useState(false);
  const [selectedPhotosInModal, setSelectedPhotosInModal] = useState<string[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [zoomMode, setZoomMode] = useState<"fit" | "100" | "75">("fit");
  const [fitScale, setFitScale] = useState<number>(0.68);

  useEffect(() => {
    const handleResize = () => {
      if (previewContainerRef.current) {
        const width = previewContainerRef.current.clientWidth;
        // 794px base A4 width. Deduct padding ~32px
        const availableWidth = Math.max(260, width - 32);
        const nextScale = Math.min(1, availableWidth / 794);
        setFitScale(nextScale);
      }
    };

    handleResize();
    const observer = new ResizeObserver(() => handleResize());
    if (previewContainerRef.current) {
      observer.observe(previewContainerRef.current);
    }
    window.addEventListener("resize", handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const activeScale = zoomMode === "fit" ? fitScale : zoomMode === "75" ? 0.75 : 1;

  useEffect(() => {
    if (currentTermName) {
      setTermText(`ประจำ${currentTermName}`);
    }
  }, [currentTermName]);

  // Load album summaries for picker
  const loadAlbums = async () => {
    setIsAlbumsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/albums?limit=100&t=${Date.now()}`));
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
    setSelectedDrilldownAlbum(null);
    setSelectedPhotosInModal([...(news[newsIndex]?.images || [])]);
    setIsPhotoPickerOpen(true);
    if (albums.length === 0) {
      loadAlbums();
    }
  };

  // Drilldown to view all photos inside an album
  const handleSelectAlbumToDrilldown = async (album: AlbumSummary) => {
    setIsDrilldownLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/albums/${album.albumCode}?t=${Date.now()}`));
      const data = await res.json();
      if (data.success && data.album) {
        setSelectedDrilldownAlbum(data.album);

        // Pre-select photos if current card already has images, otherwise pick up to 4
        const currentImgs = news[targetNewsIndex]?.images || [];
        if (currentImgs.length > 0) {
          setSelectedPhotosInModal(currentImgs);
        } else if (data.album.mediaFiles && data.album.mediaFiles.length > 0) {
          const defaultPics = data.album.mediaFiles
            .slice(0, 4)
            .map((m: MediaPhoto) => m.reportReadyJpgUrl || m.thumbnailWebpUrl);
          setSelectedPhotosInModal(defaultPics);
        } else if (data.album.coverThumbnailUrl) {
          setSelectedPhotosInModal([data.album.coverThumbnailUrl]);
        } else {
          setSelectedPhotosInModal([]);
        }
      } else {
        showAlert.error("ไม่สามารถโหลดภาพได้", data.error || "เกิดข้อผิดพลาดในการโหลดรูปภาพ");
      }
    } catch (err) {
      console.error("Failed to load album media files:", err);
      showAlert.error("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลรูปภาพของอัลบั้มได้");
    } finally {
      setIsDrilldownLoading(false);
    }
  };

  // Toggle photo select / deselect
  const togglePhotoSelection = (photoUrl: string) => {
    setSelectedPhotosInModal((prev) => {
      if (prev.includes(photoUrl)) {
        return prev.filter((u) => u !== photoUrl);
      }
      if (prev.length >= 4) {
        showAlert.info("จำกัดรูปภาพ", "สามารถเลือกรูปภาพประกอบได้สูงสุด 4 ภาพต่อ 1 ข่าว เพื่อให้สัดส่วนภาพคมชัดและสวยงาม");
        return prev;
      }
      return [...prev, photoUrl];
    });
  };

  // Apply selected photos and optionally synthesize AI news prose tailored to layout
  const handleApplyAlbumAndPhotos = (applyNewsText: boolean) => {
    if (!selectedDrilldownAlbum) return;

    let chosenPhotos = [...selectedPhotosInModal];
    if (chosenPhotos.length === 0 && selectedDrilldownAlbum.coverThumbnailUrl) {
      chosenPhotos = [selectedDrilldownAlbum.coverThumbnailUrl];
    }

    const isHero = (layout === "3_digest" && targetNewsIndex === 0) || layout === "1_hero";

    setNews((prev) => {
      const next = [...prev];
      const target = { ...next[targetNewsIndex] };
      target.images = chosenPhotos;

      if (applyNewsText) {
        target.title = selectedDrilldownAlbum.title;
        target.albumCode = selectedDrilldownAlbum.albumCode;
        target.rawDescription = selectedDrilldownAlbum.description || "";
        target.albumMeta = {
          title: selectedDrilldownAlbum.title,
          eventDate: selectedDrilldownAlbum.eventDate,
          divisionName: selectedDrilldownAlbum.divisionName,
          departmentName: selectedDrilldownAlbum.departmentName,
        };

        target.content = formatNewsletterProse(
          selectedDrilldownAlbum.description,
          target.albumMeta,
          layout,
          isHero
        );
      }

      next[targetNewsIndex] = target;
      return next;
    });

    showAlert.success(
      "บันทึกข้อมูลสำเร็จ",
      `นำภาพ ${chosenPhotos.length} ภาพ ${applyNewsText ? "พร้อมเนื้อหาข่าว AI" : ""} ใส่ในข่าวที่ ${targetNewsIndex + 1} เรียบร้อยแล้ว`
    );

    setIsPhotoPickerOpen(false);
    setSelectedDrilldownAlbum(null);
  };

  // Remove photo from active news
  const handleRemovePhoto = (newsIndex: number, imgIndex: number) => {
    setNews((prev) => {
      const next = [...prev];
      const target = { ...next[newsIndex] };
      target.images = target.images.filter((_, idx) => idx !== imgIndex);
      next[newsIndex] = target;
      return next;
    });
  };

  // AI Auto-Fit text specifically to layout card boundaries
  const handleAutoFitText = (newsIndex: number) => {
    const item = news[newsIndex];
    if (!item) return;

    const isHero = (layout === "3_digest" && newsIndex === 0) || layout === "1_hero";
    const meta = item.albumMeta || {
      title: item.title,
      eventDate: new Date(),
    };

    const fitted = formatNewsletterProse(
      item.rawDescription || item.content,
      meta,
      layout,
      isHero
    );

    setNews((prev) => {
      const next = [...prev];
      next[newsIndex] = { ...next[newsIndex], content: fitted };
      return next;
    });

    showAlert.success("จัดข้อความพอดีแล้ว", "ระบบสรุปและปรับความยาวข้อความข่าวให้เหมาะสมกับพื้นที่ของการ์ดแล้ว");
  };

  // Download high-res PNG image
  const handleDownloadImage = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        quality: 0.95,
        pixelRatio: 2.5, // 2.5x scale generates super-crisp HD image
        cacheBust: true,
        width: 794,
        height: 1123,
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
    showAlert.success("คัดลอกแคปชั่นสำเร็จ", "คัดลอกเนื้อหาข่าวพร้อมแฮชแท็กสำหรับโพสต์ Facebook แล้ว สามารถนำไปวางได้ทันที");
  };

  const getNewsLimit = () => {
    if (layout === "4_grid") return 4;
    if (layout === "3_digest") return 3;
    if (layout === "2_split") return 2;
    return 1;
  };

  const filteredAlbums = albums.filter((a) =>
    a.title.toLowerCase().includes(albumSearch.toLowerCase()) ||
    (a.albumCode && a.albumCode.toLowerCase().includes(albumSearch.toLowerCase())) ||
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
              onClick={() => window.print()}
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
              <div className="space-y-3.5 text-xs bg-[#1A0C42]/60 p-4 rounded-2xl border border-purple-800/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-800/30">
                  <span className="font-bold text-pink-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-pink-400" />
                    กำลังแก้ไข ข่าวที่ {activeNewsIndex + 1}
                  </span>

                  {/* Pick Photo & Autofill from Album Button */}
                  <button
                    type="button"
                    onClick={() => openPhotoPicker(activeNewsIndex)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-500/50 bg-gradient-to-r from-pink-500/25 to-purple-600/30 text-xs font-bold text-pink-200 hover:border-pink-400 hover:bg-pink-500 hover:text-white transition-all shadow-sm"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
                    <span>เลือกอัลบั้ม & คัดเลือกรูปภาพ</span>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-purple-200 font-semibold">เนื้อหาข่าวบรรยาย</label>
                    <button
                      type="button"
                      onClick={() => handleAutoFitText(activeNewsIndex)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-400 hover:text-pink-300 transition-colors"
                      title="ให้ AI ปรับความยาวข้อความให้พอดีกับพื้นที่การ์ดข่าวในแบบที่เลือก"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>AI สรุปพอดีการ์ด</span>
                    </button>
                  </div>
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
                  <div className="flex items-center justify-between text-[10px] text-purple-400/80 mt-1">
                    <span>
                      ความยาว: {news[activeNewsIndex].content.length} ตัวอักษร
                    </span>
                    <span>
                      {layout === "4_grid"
                        ? "แนะนํา ~140–190 ตัวอักษรสำหรับ Grid 2x2"
                        : layout === "2_split"
                        ? "แนะนํา ~280–350 ตัวอักษร"
                        : "แนะนํา ~200–350 ตัวอักษร"}
                    </span>
                  </div>
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
                          src={resolveImageUrl(imgUrl)}
                          alt={`รูปประกอบ ${imgIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 bg-pink-600/90 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                          #{imgIdx + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(activeNewsIndex, imgIdx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-purple-200">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-pink-400" />
              <span>ภาพตัวอย่างจดหมายข่าวจริง (Live A4 Preview)</span>
            </span>

            {/* Zoom Controls & Page indicator */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#1A0C42] p-1 rounded-2xl border border-purple-800/40">
                <button
                  type="button"
                  onClick={() => setZoomMode("fit")}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                    zoomMode === "fit"
                      ? "bg-pink-500 text-white shadow-sm"
                      : "text-purple-300 hover:text-white"
                  }`}
                  title="ย่อขนาดให้พอดีกับความกว้างหน้าจออัตโนมัติ เพื่อให้มองเห็นภาพรวมทั้งแผ่น A4"
                >
                  พอดีจอ ({Math.round(fitScale * 100)}%)
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMode("75")}
                  className={`px-2 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                    zoomMode === "75"
                      ? "bg-pink-500 text-white shadow-sm"
                      : "text-purple-300 hover:text-white"
                  }`}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMode("100")}
                  className={`px-2 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                    zoomMode === "100"
                      ? "bg-pink-500 text-white shadow-sm"
                      : "text-purple-300 hover:text-white"
                  }`}
                  title="แสดงขนาดจริง 100% ตามความละเอียดต้นฉบับ"
                >
                  100%
                </button>
              </div>

              <span className="hidden sm:inline-block text-[10px] text-pink-300 font-medium bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/25">
                📄 A4 แนวตั้ง
              </span>
            </div>
          </div>

          {/* Canvas Wrapper - Auto-scaling to fit right column perfectly */}
          <div
            ref={previewContainerRef}
            className="rounded-3xl border border-purple-800/50 bg-[#0A0418] p-3 sm:p-4 shadow-2xl overflow-x-auto flex justify-center items-start min-h-[500px]"
          >
            {/* Scaled viewport container matching exact scaled A4 aspect ratio */}
            <div
              style={{
                width: `${Math.round(794 * activeScale)}px`,
                height: `${Math.round(1123 * activeScale)}px`,
                transition: "width 0.2s ease, height 0.2s ease",
              }}
              className="relative shrink-0 shadow-2xl rounded-2xl overflow-hidden"
            >
              <div
                style={{
                  width: "794px",
                  height: "1123px",
                  transform: `scale(${activeScale})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                {/* THE PRINT/EXPORT CANVAS (Width: 794px, Height: 1123px = Exact A4 Portrait 96DPI) */}
                <div
                  ref={canvasRef}
                  id="newsletter-canvas-container"
                  style={{
                    width: "794px",
                    minWidth: "794px",
                    maxWidth: "794px",
                    height: "1123px",
                    minHeight: "1123px",
                    maxHeight: "1123px",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                  className="text-slate-900 shadow-2xl relative font-sans select-none flex flex-col justify-between"
                >
                  {/* TOP HEADER: Exact 198px height (Perfect 723:180 ratio, zero cropping of ประชาสัมพันธ์) */}
                  <div className="relative w-full overflow-hidden shrink-0" style={{ height: "198px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${basePath}/assets/newsletter/newsletter_header_banner.png`}
                      alt="วิทยาลัยสารพัดช่างน่าน จดหมายข่าว ประชาสัมพันธ์"
                      className="w-full h-full object-fill"
                    />
                  </div>

                  {/* SUBHEADER PILLS STRIP: Dynamic Term, Issue, Month (Exact 46px height) */}
                  <div
                    className="w-full flex items-center gap-3 px-6 py-2 relative shrink-0"
                    style={{
                      backgroundImage: `url(${basePath}/assets/newsletter/newsletter_substrip_clean.png)`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      height: "46px",
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

                  {/* NEWS CONTENT AREA: Exact 814px height (198 + 46 + 814 + 65 = 1123px ISO A4) */}
                  <div
                    className="bg-white overflow-hidden shrink-0"
                    style={{
                      height: "814px",
                      maxHeight: "814px",
                      padding: "12px",
                      boxSizing: "border-box",
                    }}
                  >
                    {/* Layout Mode 1: 4 Cards (Grid 2x2, exactly 402px per row) */}
                    {layout === "4_grid" && (
                      <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
                        {news.slice(0, 4).map((item, idx) => (
                          <NewsCardItem key={item.id} item={item} index={idx} layout={layout} />
                        ))}
                      </div>
                    )}

                    {/* Layout Mode 2: 3 Cards (1 Top Hero + 2 Bottom, exactly 402px per row) */}
                    {layout === "3_digest" && (
                      <div className="grid grid-rows-2 gap-3 h-full">
                        {news[0] && (
                          <NewsCardItem item={news[0]} index={0} layout={layout} isHero />
                        )}
                        <div className="grid grid-cols-2 gap-3 h-full">
                          {news.slice(1, 3).map((item, idx) => (
                            <NewsCardItem key={item.id} item={item} index={idx + 1} layout={layout} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Layout Mode 3: 2 Cards (Split 50:50, exactly 402px per row) */}
                    {layout === "2_split" && (
                      <div className="grid grid-rows-2 gap-3 h-full">
                        {news.slice(0, 2).map((item, idx) => (
                          <NewsCardItem key={item.id} item={item} index={idx} layout={layout} isWide />
                        ))}
                      </div>
                    )}

                    {/* Layout Mode 4: 1 Mega Hero Story (Full 816px) */}
                    {layout === "1_hero" && news[0] && (
                      <div className="h-full">
                        <NewsCardItem item={news[0]} index={0} layout={layout} isFullPage />
                      </div>
                    )}
                  </div>

                  {/* BOTTOM FOOTER: Exact 65px height */}
                  <div className="relative w-full overflow-hidden shrink-0" style={{ height: "65px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${basePath}/assets/newsletter/newsletter_footer_banner.png`}
                      alt="ติดต่อสอบถามเพิ่มเติมได้ที่ วิทยาลัยสารพัดช่างน่าน"
                      className="w-full h-full object-fill"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strict CSS for A4 Portrait Print Preview & Zero Overflow */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: 210mm 297mm;
                margin: 0mm;
              }
              html, body {
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                overflow: hidden !important;
              }
              body * {
                visibility: hidden !important;
              }
              #newsletter-canvas-container,
              #newsletter-canvas-container * {
                visibility: visible !important;
              }
              #newsletter-canvas-container {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                max-width: 210mm !important;
                max-height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                transform: none !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      {/* PHOTO PICKER MODAL (Album Selection + Photo Drilldown) */}
      {isPhotoPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-purple-700/60 bg-[#12082b] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-purple-800/40 flex items-center justify-between bg-[#170B38]">
              <div className="flex items-center gap-3">
                {selectedDrilldownAlbum && (
                  <button
                    type="button"
                    onClick={() => setSelectedDrilldownAlbum(null)}
                    className="p-1.5 rounded-xl border border-purple-700/50 bg-[#1F0F4B] text-purple-200 hover:text-white hover:bg-purple-700 transition-colors"
                    title="กลับไปเลือกอัลบั้มอื่น"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-pink-400" />
                    <span>
                      {selectedDrilldownAlbum
                        ? `เลือกรูปภาพจาก: ${selectedDrilldownAlbum.title}`
                        : `เลือกอัลบั้มกิจกรรมสำหรับ ข่าวที่ ${targetNewsIndex + 1}`}
                    </span>
                  </h3>
                  <p className="text-xs text-purple-300/80">
                    {selectedDrilldownAlbum
                      ? `คลิกเลือกภาพที่ต้องการ (เลือกแล้ว ${selectedPhotosInModal.length}/4 ภาพ) แล้วกดปุ่มนำไปใช้`
                      : "คลิกที่อัลบั้มเพื่อเปิดดูรูปภาพทั้งหมดและเลือกรูปประกอบข่าวตามจำนวนที่ต้องการ"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsPhotoPickerOpen(false);
                  setSelectedDrilldownAlbum(null);
                }}
                className="p-2 rounded-full text-purple-400 hover:text-white hover:bg-purple-800/40"
              >
                ✕
              </button>
            </div>

            {/* VIEW A: Album Selection List */}
            {!selectedDrilldownAlbum && (
              <>
                {/* Search Bar */}
                <div className="p-3.5 border-b border-purple-800/30 bg-[#160A38]/60 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-400" />
                    <input
                      type="text"
                      value={albumSearch}
                      onChange={(e) => setAlbumSearch(e.target.value)}
                      placeholder="ค้นหาชื่อกิจกรรม, รหัสอัลบั้ม หรือฝ่าย/แผนกวิชา..."
                      className="w-full rounded-2xl border border-purple-800/50 bg-[#1C0E46] pl-10 pr-4 py-2 text-xs text-white placeholder-purple-400/60 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={loadAlbums}
                    className="p-2 rounded-2xl border border-purple-700/40 bg-purple-900/30 text-purple-300 hover:text-white"
                    title="รีเฟรชรายการอัลบั้ม"
                  >
                    <RefreshCw className={`h-4 w-4 ${isAlbumsLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Modal Body: Album List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {isAlbumsLoading ? (
                    <div className="text-center py-16 text-purple-300 text-xs flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-pink-400" />
                      <span>กำลังโหลดรายการอัลบั้มจากระบบ...</span>
                    </div>
                  ) : filteredAlbums.length === 0 ? (
                    <div className="text-center py-16 text-purple-400 text-xs">
                      ไม่พบอัลบั้มภาพกิจกรรม กรุณาลองค้นหาคำอื่น
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {filteredAlbums.map((album) => {
                        const coverUrl = album.coverThumbnailUrl
                          ? resolveImageUrl(album.coverThumbnailUrl)
                          : "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&auto=format&fit=crop";

                        return (
                          <div
                            key={album.id}
                            onClick={() => handleSelectAlbumToDrilldown(album)}
                            className="group rounded-2xl border border-purple-800/40 bg-[#190C3E]/70 p-3.5 space-y-2.5 hover:border-pink-500/60 hover:bg-[#20104e] transition-all cursor-pointer flex flex-col justify-between shadow-md"
                          >
                            <div className="space-y-2">
                              {/* Album Thumbnail */}
                              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40 border border-purple-800/30">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={coverUrl}
                                  alt={album.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2 left-2 rounded-full bg-[#140A32]/85 px-2 py-0.5 text-[10px] font-mono font-bold text-pink-300 border border-pink-500/30">
                                  {album.albumCode}
                                </div>
                                <div className="absolute top-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-purple-200 border border-purple-700/40">
                                  {album.photoCount || 0} รูป
                                </div>
                              </div>

                              <h4 className="font-bold text-white text-xs line-clamp-2 leading-snug group-hover:text-pink-300 transition-colors">
                                {album.title}
                              </h4>

                              <div className="text-[10px] text-purple-300/80 space-y-0.5">
                                {album.departmentName && (
                                  <div className="truncate text-cyan-300">
                                    🏛️ {album.departmentName}
                                  </div>
                                )}
                                {album.eventDate && (
                                  <div>
                                    📅 {new Date(album.eventDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              className="w-full py-1.5 rounded-xl border border-pink-500/30 bg-pink-500/10 text-[11px] font-bold text-pink-300 group-hover:bg-pink-500 group-hover:text-white transition-all flex items-center justify-center gap-1.5"
                            >
                              <span>เลือกอัลบั้มนี้เพื่อคัดรูป</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* VIEW B: Album Photos Drilldown */}
            {selectedDrilldownAlbum && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Album Drilldown Header Strip */}
                <div className="px-5 py-3 border-b border-purple-800/30 bg-[#160A38]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-bold text-pink-300">
                      {selectedDrilldownAlbum.title}
                    </span>
                    <span className="text-purple-400 ml-2">
                      ({selectedDrilldownAlbum.mediaFiles?.length || 0} รูปภาพในอัลบั้ม)
                    </span>
                  </div>

                  {/* Quick Auto-Pick Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const picks = (selectedDrilldownAlbum.mediaFiles || [])
                          .slice(0, 2)
                          .map((m) => m.reportReadyJpgUrl || m.thumbnailWebpUrl);
                        setSelectedPhotosInModal(picks);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-pink-500/30 to-purple-600/30 border border-pink-500/50 text-[11px] font-bold text-pink-200 hover:text-white hover:bg-pink-500 transition-all shadow-sm"
                    >
                      ⭐ เลือก 2 ภาพเด่น (แนะนำ)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const picks = (selectedDrilldownAlbum.mediaFiles || [])
                          .slice(0, 4)
                          .map((m) => m.reportReadyJpgUrl || m.thumbnailWebpUrl);
                        setSelectedPhotosInModal(picks);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-purple-900/50 border border-purple-700/50 text-[11px] font-semibold text-purple-200 hover:text-white hover:bg-purple-800 transition-all"
                    >
                      เลือก 4 รูป
                    </button>
                    {selectedPhotosInModal.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedPhotosInModal([])}
                        className="px-2.5 py-1 rounded-xl bg-purple-900/30 text-[11px] text-purple-400 hover:text-red-300 transition-all"
                      >
                        ล้างที่เลือก
                      </button>
                    )}
                  </div>
                </div>

                {/* Photo Grid */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  {isDrilldownLoading ? (
                    <div className="text-center py-20 text-purple-300 text-xs flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-pink-400" />
                      <span>กำลังโหลดรูปภาพทั้งหมดในอัลบั้ม...</span>
                    </div>
                  ) : !selectedDrilldownAlbum.mediaFiles || selectedDrilldownAlbum.mediaFiles.length === 0 ? (
                    <div className="text-center py-20 text-purple-400 text-xs">
                      อัลบั้มนี้ยังไม่มีรูปภาพที่อัปโหลดไว้ในระบบ
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {selectedDrilldownAlbum.mediaFiles.map((photo) => {
                        const photoUrl = photo.reportReadyJpgUrl || photo.thumbnailWebpUrl;
                        const isSelected = selectedPhotosInModal.includes(photoUrl);
                        const selectionIndex = selectedPhotosInModal.indexOf(photoUrl) + 1;

                        return (
                          <div
                            key={photo.id}
                            onClick={() => togglePhotoSelection(photoUrl)}
                            className={`group relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-pink-500 shadow-lg shadow-pink-500/30 scale-[0.98]"
                                : "border-purple-800/40 hover:border-pink-400/60 bg-black/40"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveImageUrl(photo.thumbnailWebpUrl || photo.reportReadyJpgUrl)}
                              alt={photo.fileName}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />

                            {/* Selection Overlay & Badge */}
                            <div
                              className={`absolute inset-0 transition-opacity ${
                                isSelected ? "bg-pink-600/25 opacity-100" : "bg-black/20 opacity-0 group-hover:opacity-100"
                              }`}
                            />

                            {isSelected ? (
                              <div className="absolute top-2 right-2 flex items-center justify-center h-6 w-6 rounded-full bg-pink-500 text-white font-mono text-xs font-black shadow-md border-2 border-white">
                                {selectionIndex}
                              </div>
                            ) : (
                              <div className="absolute top-2 right-2 flex items-center justify-center h-6 w-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/40">
                                <Plus className="h-3.5 w-3.5" />
                              </div>
                            )}

                            {photo.isFeatured && (
                              <div className="absolute bottom-2 left-2 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                                รูปปก
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Drilldown Action Footer */}
                <div className="p-4 border-t border-purple-800/40 bg-[#140A34] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-purple-200">
                    <span>เลือกแล้ว: </span>
                    <strong className="text-pink-400 font-bold text-sm">
                      {selectedPhotosInModal.length} / 4
                    </strong>
                    <span> ภาพ (จะถูกนำไปจัดวางในการ์ดข่าวที่ {targetNewsIndex + 1})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyAlbumAndPhotos(false)}
                      disabled={selectedPhotosInModal.length === 0}
                      className="px-4 py-2 rounded-2xl border border-purple-700/60 bg-[#1D0E46] text-xs font-semibold text-purple-200 hover:text-white transition-all disabled:opacity-40"
                    >
                      นำเฉพาะรูปภาพที่เลือกไปใช้
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyAlbumAndPhotos(true)}
                      disabled={selectedPhotosInModal.length === 0}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:opacity-95 transition-all disabled:opacity-40"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>นำรูปที่เลือก + เนื้อหาข่าว AI ใส่ในการ์ด</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
      className="border-2 border-[#0088cc] rounded-2xl bg-white shadow-sm p-2.5 sm:p-3 flex flex-col justify-start h-full overflow-hidden"
      style={{
        boxShadow: "0 2px 6px rgba(0, 136, 204, 0.08)",
      }}
    >
      {/* 1. Header Capsule Title Badge (matching college template) */}
      <div className="w-full mb-1.5 shrink-0">
        <div className="w-full bg-gradient-to-r from-[#003380] via-[#004ca8] to-[#003380] text-white text-center font-bold py-1 px-2.5 rounded-full text-[10px] sm:text-[10.5px] shadow-sm leading-tight line-clamp-2">
          {item.title || `หัวข้อข่าวกิจกรรมที่ ${index + 1}`}
        </div>
      </div>

      {/* 2. Photo Gallery Grid (Dynamically adapted without awkward whitespace gaps) */}
      <div className="w-full shrink-0 overflow-hidden">
        {images.length === 0 ? (
          <div
            className={`w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] ${
              isFullPage ? "h-[320px]" : isWide || isHero ? "h-[180px]" : "h-[160px]"
            }`}
          >
            <span>(ยังไม่ได้ใส่รูปภาพประกอบข่าวนี้)</span>
          </div>
        ) : images.length === 1 ? (
          <div
            className={`w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 ${
              isFullPage
                ? "h-[400px]"
                : isWide || isHero
                ? "h-[215px]"
                : "h-[195px]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveImageUrl(images[0])}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : images.length === 2 ? (
          /* 2 Images: Side-by-side */
          <div
            className={`grid grid-cols-2 gap-2 sm:gap-2.5 w-full ${
              isFullPage
                ? "h-[380px]"
                : isWide || isHero
                ? "h-[210px]"
                : "h-[195px]"
            }`}
          >
            {images.slice(0, 2).map((img, i) => (
              <div key={i} className="h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImageUrl(img)}
                  alt={`ภาพ ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : images.length === 3 ? (
          /* 3 Images */
          isWide || isHero ? (
            <div className="grid grid-cols-3 gap-2 w-full h-[195px]">
              {images.slice(0, 3).map((img, i) => (
                <div key={i} className="h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(img)}
                    alt={`ภาพ ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : isFullPage ? (
            <div className="grid grid-cols-3 gap-2 w-full h-[380px]">
              {images.slice(0, 3).map((img, i) => (
                <div key={i} className="h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(img)}
                    alt={`ภาพ ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1 w-full h-[195px]">
              <div className="h-[58%] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImageUrl(images[0])}
                  alt="ภาพหลัก"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid grid-cols-2 gap-1 h-[40%]">
                {images.slice(1, 3).map((img, i) => (
                  <div key={i} className="h-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageUrl(img)}
                      alt={`ภาพ ${i + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          /* 4 Images: In wide layout (2_split/hero), display as 4 columns in a row. In narrow (4_grid), display 2x2 grid */
          isWide || isHero ? (
            <div className="grid grid-cols-4 gap-1.5 w-full h-[180px]">
              {images.slice(0, 4).map((img, i) => (
                <div key={i} className="h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(img)}
                    alt={`ภาพ ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : isFullPage ? (
            <div className="grid grid-cols-2 grid-rows-2 gap-2 w-full h-[390px]">
              {images.slice(0, 4).map((img, i) => (
                <div key={i} className="h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(img)}
                    alt={`ภาพ ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 grid-rows-2 gap-1.5 w-full h-[195px]">
              {images.slice(0, 4).map((img, i) => (
                <div key={i} className="h-full rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(img)}
                    alt={`ภาพ ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* 3. News Description Text (Strict line-clamp preventing page overflow, placed right below photos) */}
      <div
        className={`mt-2 text-slate-800 text-justify overflow-hidden leading-relaxed shrink-0 ${
          isFullPage
            ? "text-[11.5px] line-clamp-10"
            : isWide
            ? "text-[10.5px] line-clamp-6"
            : isHero
            ? "text-[10px] line-clamp-5"
            : "text-[9.5px] line-clamp-4"
        }`}
      >
        {item.content || "กรุณาระบุรายละเอียดข่าว วันที่จัดกิจกรรม สถานที่ และผู้เข้าร่วมโครงการ..."}
      </div>
    </div>
  );
}
