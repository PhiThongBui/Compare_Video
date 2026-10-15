"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Download,
  RefreshCw,
  Sparkles,
  Film,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  ChevronDown,
  Terminal,
  ExternalLink,
  Plus,
  Trash2,
  Zap,
  Search,
  SlidersHorizontal,
  Calendar,
  HardDrive,
  Maximize2,
  X,
  ArrowLeft,
  Share2,
  Eye,
} from "lucide-react";

interface ScriptLine {
  tts: string;
  caption: string;
}

interface VideoItem {
  filename: string;
  title: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

interface TemplateItem {
  filename: string;
  slug: string;
  title: string;
  data: {
    slug: string;
    category?: string;
    channel?: string;
    title: string;
    left: { name: string; icon: string };
    right: { name: string; icon: string };
    script: Array<{ tts?: string; caption?: string } | string>;
  };
}

const ICON_OPTIONS = [
  { id: "jersey-player", name: "Áo thi đấu Player (Cầu thủ)", emoji: "🎽" },
  { id: "jersey-fan", name: "Áo người hâm mộ (Fan/Stadium)", emoji: "👕" },
  { id: "tactics", name: "Sa bàn chiến thuật", emoji: "📋" },
  { id: "trophy", name: "Cúp vô địch / Danh hiệu", emoji: "🏆" },
  { id: "money", name: "Tài chính / Chuyển nhượng (€)", emoji: "💰" },
  { id: "card-penalty", name: "Thẻ phạt Vàng & Đỏ", emoji: "🟨" },
  { id: "default", name: "Quả bóng đá cổ điển", emoji: "⚽" },
];

const CATEGORIES = [
  "Tất cả chuyên mục",
  "Công nghệ & Trang bị",
  "Chiến thuật & Huấn luyện",
  "Tài chính & Chuyển nhượng",
  "Hậu trường & Bí mật sân cỏ",
  "Luật chơi & Tranh cãi",
];

const DEFAULT_SCRIPT: ScriptLine[] = [
  {
    tts: "Bỏ hơn hai triệu mua áo đấu chính hãng,",
    caption: 'Bỏ hơn hai triệu mua <span class="kw" style="color: var(--accent-yellow)">ÁO ĐẤU CHÍNH HÃNG,</span>',
  },
  {
    tts: "nhưng bạn có biết nó khác xa chiếc áo thần tượng đang mặc trên sân?",
    caption: 'nhưng bạn có biết nó khác xa <span class="kw" style="color: var(--accent-yellow)">ÁO CẦU THỦ</span> trên sân?',
  },
  {
    tts: "Đâu là sự khác biệt thật sự?",
    caption: 'Đâu là <span class="kw">SỰ KHÁC BIỆT</span> thật sự?',
  },
  {
    tts: "Bản Fan thiết kế để phục vụ bạn mặc hàng ngày.",
    caption: 'Bản Fan thiết kế để phục vụ bạn <span class="kw">MẶC HÀNG NGÀY.</span>',
  },
  {
    tts: "Form áo suông rộng rãi, che bụng bia cực kỳ thoải mái.",
    caption: 'Form suông rộng rãi, <span class="kw">CHE BỤNG BIA</span> cực kỳ thoải mái.',
  },
  {
    tts: "Logo đội bóng thêu chỉ nổi dày dặn, giặt máy bền bỉ nhiều năm.",
    caption: 'Logo thêu chỉ nổi <span class="kw">DÀY DẶN,</span> giặt máy bền bỉ nhiều năm.',
  },
  {
    tts: "Còn bản Player là một vũ khí thi đấu đỉnh cao của cầu thủ.",
    caption: 'Còn bản Player là <span class="kw">VŨ KHÍ THI ĐẤU</span> của cầu thủ.',
  },
  {
    tts: "Form bó chặt cơ bắp, chất vải siêu mỏng nhẹ như một tờ giấy.",
    caption: 'Form bó chặt cơ bắp, chất vải <span class="kw">SIÊU MỎNG NHẸ</span> như giấy.',
  },
  {
    tts: "Mọi logo đều in ép nhiệt siêu mỏng để giảm tối đa từng gram trọng lượng.",
    caption: 'Mọi logo đều in ép nhiệt <span class="kw">SIÊU MỎNG</span> để giảm trọng lượng.',
  },
  {
    tts: "Đổi lại, áo Player cực kỳ dễ rách, va chạm xước chỉ là vứt luôn.",
    caption: 'Đổi lại, áo Player <span class="kw">CỰC KỲ DỄ RÁCH,</span> xước chỉ là vứt luôn.',
  },
  {
    tts: "Trong khi áo Fan thì bền bỉ nồi đồng cối đá theo năm tháng.",
    caption: 'Trong khi áo Fan thì <span class="kw">BỀN BỈ NỒI ĐỒNG CỐI ĐÁ</span> theo năm tháng.',
  },
  {
    tts: "Bạn chọn bền bỉ tiết kiệm hay cảm giác nhẹ như bay của siêu sao?",
    caption: 'Bạn chọn <span class="kw">BỀN BỈ TIẾT KIỆM</span> hay <span class="kw" style="color: var(--accent-yellow)">ĐẲNG CẤP SIÊU SAO?</span>',
  },
];

export default function DashboardPage() {
  // Navigation View State: 'gallery' (Danh sách thư viện) | 'studio' (Tạo video mới)
  const [currentView, setCurrentView] = useState<"gallery" | "studio">("gallery");

  // Form states
  const [title, setTitle] = useState("Áo bản Player vs Áo bản Fan");
  const [category, setCategory] = useState("Công nghệ & Trang bị");
  const [channel, setChannel] = useState("Phía sau sân cỏ");
  const [slug, setSlug] = useState("ao-player-vs-ao-fan");
  const [conceptA, setConceptA] = useState("BẢN PLAYER");
  const [iconA, setIconA] = useState("jersey-player");
  const [conceptB, setConceptB] = useState("BẢN FAN");
  const [iconB, setIconB] = useState("jersey-fan");
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>(DEFAULT_SCRIPT);

  // Active line ref for keyword highlighting helper
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const captionInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Generation status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string>("");
  const [showLogs, setShowLogs] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<boolean>(false);

  // Video list & Player states
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [modalVideo, setModalVideo] = useState<VideoItem | null>(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  // Search & Filter in Gallery
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Tất cả chuyên mục");

  // Template items
  const [templates, setTemplates] = useState<TemplateItem[]>([]);

  // Fetch videos
  const fetchVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const res = await fetch("/api/videos");
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos);
        if (!selectedVideo && data.videos.length > 0) {
          setSelectedVideo(data.videos[0]);
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách video:", err);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/data-templates");
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error("Lỗi khi tải templates:", err);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchTemplates();
  }, []);

  // Handle Load Template into Studio
  const handleLoadTemplate = (tpl: TemplateItem, autoSwitch = true) => {
    const d = tpl.data;
    setTitle(d.title || tpl.title);
    setSlug(d.slug || tpl.slug);
    if (d.category) setCategory(d.category);
    if (d.channel) setChannel(d.channel);
    if (d.left?.name) setConceptA(d.left.name);
    if (d.left?.icon) setIconA(d.left.icon);
    if (d.right?.name) setConceptB(d.right.name);
    if (d.right?.icon) setIconB(d.right.icon);

    if (Array.isArray(d.script)) {
      const formatted = d.script
        .map((item) => {
          if (typeof item === "string") {
            return { tts: item.replace(/<[^>]+>/g, ""), caption: item };
          }
          return {
            tts: item.tts || item.caption?.replace(/<[^>]+>/g, "") || "",
            caption: item.caption || item.tts || "",
          };
        })
        .filter((l) => l.tts.trim() || l.caption.trim());
      setScriptLines(formatted.length > 0 ? formatted : DEFAULT_SCRIPT);
    }

    if (autoSwitch) {
      setCurrentView("studio");
    }
  };

  // Helper to wrap highlighted text in <span class="kw">
  const applyKeywordTag = (colorType: "yellow" | "red" | "white" | "clean") => {
    if (activeLineIndex === null) return;
    const input = captionInputRefs.current[activeLineIndex];
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = input.value;
    const selected = text.substring(start, end);

    if (!selected && colorType !== "clean") return;

    let newCaption = text;

    if (colorType === "clean") {
      newCaption = text.replace(/<[^>]+>/g, "");
    } else {
      let tag = `<span class="kw">${selected}</span>`;
      if (colorType === "yellow") {
        tag = `<span class="kw" style="color: var(--accent-yellow)">${selected}</span>`;
      } else if (colorType === "red") {
        tag = `<span class="kw" style="color: var(--accent-red)">${selected}</span>`;
      }
      newCaption = text.substring(0, start) + tag + text.substring(end);
    }

    updateLine(activeLineIndex, "caption", newCaption);
    const cleanTts = newCaption.replace(/<[^>]+>/g, "");
    updateLine(activeLineIndex, "tts", cleanTts);
  };

  const updateLine = (index: number, field: "tts" | "caption", value: string) => {
    const updated = [...scriptLines];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "caption" && !updated[index].tts) {
      updated[index].tts = value.replace(/<[^>]+>/g, "");
    }
    setScriptLines(updated);
  };

  const addLine = () => {
    setScriptLines([...scriptLines, { tts: "", caption: "" }]);
  };

  const removeLine = (index: number) => {
    if (scriptLines.length <= 1) return;
    setScriptLines(scriptLines.filter((_, i) => i !== index));
  };

  // Submit Generate Video
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationLogs("");
    setGenerationError(null);
    setGenerationSuccess(false);
    setShowLogs(true);

    try {
      const payload = {
        title,
        category,
        channel,
        customSlug: slug,
        left: { name: conceptA, icon: iconA },
        right: { name: conceptB, icon: iconB },
        script: scriptLines,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Quá trình render thất bại");
      }

      setGenerationLogs(result.log || "Render thành công!");
      setGenerationSuccess(true);

      // Refresh video list & templates
      await fetchVideos();
      await fetchTemplates();

      const newVid = {
        filename: result.filename || `${result.slug}.mp4`,
        title: result.slug || title,
        sizeBytes: 0,
        sizeFormatted: "Vừa xong",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        url: result.videoUrl || `/api/videos/${result.filename}`,
      };
      setSelectedVideo(newVid);
    } catch (err: unknown) {
      const error = err as Error;
      setGenerationError(error.message);
      setGenerationLogs((prev) => prev + `\n❌ LỖI: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered videos for Gallery View
  const filteredVideos = videos.filter((vid) => {
    const matchSearch =
      vid.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vid.filename.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  // Calculate total storage
  const totalSizeBytes = videos.reduce((acc, v) => acc + (v.sizeBytes || 0), 0);
  const totalSizeFormatted = (totalSizeBytes / (1024 * 1024)).toFixed(1) + " MB";

  return (
    <div className="min-h-screen flex flex-col pitch-stripes">
      {/* ================= HEADER NAVBAR WITH TABS ================= */}
      <header className="sticky top-0 z-40 bg-[#081C15]/90 backdrop-blur-md border-b border-[#EBF8F2]/15 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Logo Brand */}
          <div
            onClick={() => setCurrentView("gallery")}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#143D2E] to-[#10B981] flex items-center justify-center border border-[#FFD200]/40 shadow-lg shadow-[#10B981]/15 group-hover:scale-105 transition-transform">
              <span className="text-xl">⚽</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-wider text-[#FFD200] uppercase font-sans">
                  Phía Sau Sân Cỏ
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FF334B] text-white rounded-full">
                  Studio
                </span>
              </div>
              <p className="text-xs text-[#EBF8F2]/60">
                Data-Driven Video Engine • Facebook Reels & TikTok Shorts
              </p>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <nav className="hidden md:flex items-center bg-[#05130E] p-1 rounded-xl border border-[#EBF8F2]/15 space-x-1">
            <button
              onClick={() => setCurrentView("gallery")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                currentView === "gallery"
                  ? "bg-[#143D2E] text-[#FFD200] shadow border border-[#FFD200]/30"
                  : "text-[#EBF8F2]/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Thư viện Video</span>
              <span className="bg-[#10B981]/30 text-[#10B981] px-1.5 py-0.2 rounded-full text-[10px]">
                {videos.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentView("studio")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                currentView === "studio"
                  ? "bg-[#143D2E] text-[#FFD200] shadow border border-[#FFD200]/30"
                  : "text-[#EBF8F2]/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Video Mới</span>
            </button>
          </nav>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center space-x-3">
          {currentView === "gallery" ? (
            <button
              onClick={() => setCurrentView("studio")}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase tracking-wide hover:shadow-lg hover:shadow-[#10B981]/25 hover:scale-105 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Video Mới</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentView("gallery")}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0E291E] hover:bg-[#143D2E] border border-[#EBF8F2]/20 text-xs font-semibold text-[#EBF8F2] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FFD200]" />
              <span>Về Thư Viện</span>
            </button>
          )}

          <button
            onClick={fetchVideos}
            disabled={isLoadingVideos}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0E291E] hover:bg-[#143D2E] border border-[#EBF8F2]/20 text-xs font-semibold transition"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVideos ? "animate-spin text-[#FFD200]" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </header>

      {/* ================= VIEW 1: GALLERY / LIST TRANG CHỦ ================= */}
      {currentView === "gallery" && (
        <main className="flex-1 max-w-[1720px] w-full mx-auto p-6 space-y-6">
          {/* Top Banner Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0E291E] to-[#081C15] border border-[#EBF8F2]/15 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-[#EBF8F2]/60 tracking-wider">
                  Tổng Video Đã Render
                </p>
                <p className="text-3xl font-black text-[#FFD200] mt-1">{videos.length}</p>
                <p className="text-[11px] text-[#10B981] mt-0.5">Sẵn sàng đăng Reels / TikTok</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                <Film className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0E291E] to-[#081C15] border border-[#EBF8F2]/15 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-[#EBF8F2]/60 tracking-wider">
                  Tổng Dung Lượng MP4
                </p>
                <p className="text-3xl font-black text-[#EBF8F2] mt-1">{totalSizeFormatted}</p>
                <p className="text-[11px] text-[#EBF8F2]/50 mt-0.5">Lưu tại output/*.mp4</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#FFD200]/15 border border-[#FFD200]/30 flex items-center justify-center text-[#FFD200]">
                <HardDrive className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0E291E] to-[#081C15] border border-[#EBF8F2]/15 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-[#EBF8F2]/60 tracking-wider">
                  Kịch Bản Mẫu Có Sẵn
                </p>
                <p className="text-3xl font-black text-[#10B981] mt-1">{templates.length}</p>
                <p className="text-[11px] text-[#EBF8F2]/50 mt-0.5">Trong thư mục data/*.json</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Search, Filter & Action Bar */}
          <div className="p-4 rounded-2xl bg-[#0E291E]/80 backdrop-blur-md border border-[#EBF8F2]/15 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-[#EBF8F2]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm video theo tên, chủ đề hoặc slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#081C15] border border-[#EBF8F2]/20 rounded-xl pl-10 pr-4 py-2 text-xs text-[#EBF8F2] focus:border-[#FFD200] outline-none"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
              <span className="text-xs text-[#EBF8F2]/60">
                Hiển thị <b>{filteredVideos.length}</b> / {videos.length} video
              </span>
            </div>
          </div>

          {/* Video Grid Cards */}
          {filteredVideos.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-[#0E291E]/40 border-2 border-dashed border-[#EBF8F2]/20 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#143D2E] border border-[#FFD200]/30 flex items-center justify-center text-3xl mb-4">
                ⚽
              </div>
              <h3 className="text-base font-bold text-[#EBF8F2]">Chưa có video nào phù hợp</h3>
              <p className="text-xs text-[#EBF8F2]/60 max-w-md mt-1 mb-5">
                {searchQuery
                  ? "Không tìm thấy video khớp với từ khóa tìm kiếm của bạn."
                  : "Thư mục output/ hiện đang trống. Hãy bắt đầu sản xuất video so sánh đầu tiên!"}
              </p>
              <button
                onClick={() => setCurrentView("studio")}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase tracking-wider hover:scale-105 transition"
              >
                + Bắt đầu tạo video ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredVideos.map((vid) => {
                const correspondingTpl = templates.find(
                  (t) => t.slug === vid.title || `${t.slug}.mp4` === vid.filename
                );

                return (
                  <div
                    key={vid.filename}
                    className="group bg-[#0E291E]/80 backdrop-blur-md border border-[#EBF8F2]/15 hover:border-[#FFD200]/70 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-[#10B981]/15 transition-all flex flex-col"
                  >
                    {/* Video 9:16 Thumbnail Container with Hover Preview */}
                    <div
                      onClick={() => setModalVideo(vid)}
                      className="relative aspect-[9/16] bg-black cursor-pointer overflow-hidden flex items-center justify-center"
                    >
                      <video
                        src={vid.url}
                        muted
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onMouseEnter={(e) => {
                          const v = e.currentTarget;
                          v.currentTime = 3;
                          v.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          const v = e.currentTarget;
                          v.pause();
                          v.currentTime = 0;
                        }}
                      />

                      {/* Dark Overlay with Play Icon */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#FFD200]/90 text-[#081C15] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-[#081C15]/80 backdrop-blur text-[10px] font-bold text-[#FFD200] border border-[#FFD200]/30">
                          9:16 Reel
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] font-mono text-[#EBF8F2]">
                          {vid.sizeFormatted}
                        </span>
                      </div>

                      {/* Bottom Info on Poster */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <p className="text-[11px] font-mono text-[#EBF8F2]/80 truncate">
                          {new Date(vid.updatedAt).toLocaleDateString("vi-VN")} •{" "}
                          {new Date(vid.updatedAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Card Content & Action Bar */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4
                          onClick={() => setModalVideo(vid)}
                          className="font-bold text-sm text-[#EBF8F2] hover:text-[#FFD200] cursor-pointer line-clamp-2 transition-colors"
                          title={vid.title}
                        >
                          {correspondingTpl?.data?.title || vid.title}
                        </h4>
                        <p className="text-[11px] text-[#EBF8F2]/50 font-mono mt-1 truncate">
                          {vid.filename}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-[#EBF8F2]/10 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => setModalVideo(vid)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-[#143D2E] hover:bg-[#10B981]/30 text-xs font-semibold text-[#EBF8F2] flex items-center justify-center space-x-1 border border-[#EBF8F2]/20 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#FFD200]" />
                          <span>Xem</span>
                        </button>

                        {correspondingTpl && (
                          <button
                            onClick={() => handleLoadTemplate(correspondingTpl, true)}
                            className="py-1.5 px-2 rounded-lg bg-[#0E291E] hover:bg-[#FFD200]/20 text-xs font-semibold text-[#FFD200] border border-[#FFD200]/30 transition"
                            title="Nạp vào Studio để sửa / clone"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <a
                          href={vid.url}
                          download
                          className="py-1.5 px-2 rounded-lg bg-[#0E291E] hover:bg-[#FFD200] hover:text-[#081C15] text-xs font-semibold text-[#EBF8F2] border border-[#EBF8F2]/20 transition"
                          title="Tải MP4"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ================= VIEW 2: STUDIO TẠO VIDEO MỚI (FORM BUILDER) ================= */}
      {currentView === "studio" && (
        <main className="flex-1 max-w-[1720px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= LEFT COLUMN: FORM BUILDER (7 Cols) ================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* General Metadata Card */}
            <div className="bg-[#0E291E]/80 backdrop-blur-md border border-[#EBF8F2]/15 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#EBF8F2]/10 mb-4">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#FFD200]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#FFD200]">
                    1. Cấu hình chủ đề & Kênh
                  </h2>
                </div>

                {/* Quick Templates Dropdown */}
                {templates.length > 0 && (
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-[#EBF8F2]/60">Mẫu có sẵn:</span>
                    {templates.map((tpl) => (
                      <button
                        key={tpl.slug}
                        type="button"
                        onClick={() => handleLoadTemplate(tpl, false)}
                        className="px-2 py-0.5 rounded bg-[#143D2E] hover:bg-[#10B981]/30 hover:text-[#FFD200] border border-[#EBF8F2]/15 text-[11px] font-semibold text-[#EBF8F2] transition"
                      >
                        {tpl.slug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#EBF8F2]/70 mb-1">
                    Tiêu đề video
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Áo bản Player vs Áo bản Fan"
                    className="w-full bg-[#081C15] border border-[#EBF8F2]/20 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#EBF8F2] focus:border-[#FFD200] focus:ring-1 focus:ring-[#FFD200] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#EBF8F2]/70 mb-1">
                    Chuyên mục bóng đá
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#081C15] border border-[#EBF8F2]/20 rounded-xl px-4 py-2.5 text-sm text-[#EBF8F2] focus:border-[#FFD200] outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== "Tất cả chuyên mục").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#EBF8F2]/70 mb-1">
                    Slug file (Tên file xuất ra output/)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="ao-player-vs-ao-fan"
                    className="w-full bg-[#081C15] border border-[#EBF8F2]/20 rounded-xl px-4 py-2.5 text-sm text-[#EBF8F2] focus:border-[#FFD200] outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Concepts A vs B Card */}
            <div className="bg-[#0E291E]/80 backdrop-blur-md border border-[#EBF8F2]/15 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#EBF8F2]/10 mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-[#FFD200]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#FFD200]">
                    2. Khái niệm so sánh (Concept A vs Concept B)
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-[#FFD200] bg-[#FFD200]/10 px-2 py-0.5 rounded border border-[#FFD200]/30">
                  Layout 3-Zone Sân Cỏ
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Concept A Left */}
                <div className="p-4 rounded-xl bg-[#081C15]/80 border-2 border-[#FFD200]/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#FFD200] text-[#081C15] text-[10px] font-black uppercase px-2 py-0.5 rounded-bl">
                    VẾ TRÁI (A)
                  </div>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#FFD200] mb-1">
                        Tên Concept A
                      </label>
                      <input
                        type="text"
                        value={conceptA}
                        onChange={(e) => setConceptA(e.target.value)}
                        placeholder="BẢN PLAYER"
                        className="w-full bg-[#143D2E] border border-[#EBF8F2]/20 rounded-lg px-3 py-2 text-sm font-black text-[#FFD200] focus:border-[#FFD200] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#EBF8F2]/70 mb-1">
                        Icon đại diện
                      </label>
                      <select
                        value={iconA}
                        onChange={(e) => setIconA(e.target.value)}
                        className="w-full bg-[#143D2E] border border-[#EBF8F2]/20 rounded-lg px-3 py-2 text-xs text-[#EBF8F2] focus:border-[#FFD200] outline-none"
                      >
                        {ICON_OPTIONS.map((ico) => (
                          <option key={ico.id} value={ico.id}>
                            {ico.emoji} {ico.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Concept B Right */}
                <div className="p-4 rounded-xl bg-[#081C15]/80 border-2 border-[#EBF8F2]/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#EBF8F2] text-[#081C15] text-[10px] font-black uppercase px-2 py-0.5 rounded-bl">
                    VẾ PHẢI (B)
                  </div>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#EBF8F2] mb-1">
                        Tên Concept B
                      </label>
                      <input
                        type="text"
                        value={conceptB}
                        onChange={(e) => setConceptB(e.target.value)}
                        placeholder="BẢN FAN"
                        className="w-full bg-[#143D2E] border border-[#EBF8F2]/20 rounded-lg px-3 py-2 text-sm font-black text-[#EBF8F2] focus:border-[#EBF8F2] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#EBF8F2]/70 mb-1">
                        Icon đại diện
                      </label>
                      <select
                        value={iconB}
                        onChange={(e) => setIconB(e.target.value)}
                        className="w-full bg-[#143D2E] border border-[#EBF8F2]/20 rounded-lg px-3 py-2 text-xs text-[#EBF8F2] focus:border-[#EBF8F2] outline-none"
                      >
                        {ICON_OPTIONS.map((ico) => (
                          <option key={ico.id} value={ico.id}>
                            {ico.emoji} {ico.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Script Builder (12 Lines) Card */}
            <div className="bg-[#0E291E]/80 backdrop-blur-md border border-[#EBF8F2]/15 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EBF8F2]/10 mb-4 gap-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#FFD200]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#FFD200]">
                    3. Kịch bản & Trợ lý Highlight từ khóa
                  </h2>
                  <span className="text-xs bg-[#10B981]/20 text-[#10B981] font-bold px-2 py-0.5 rounded-full border border-[#10B981]/30">
                    {scriptLines.length} câu
                  </span>
                </div>

                {/* Floating Keyword Highlight Toolbar */}
                <div className="flex items-center space-x-1.5 bg-[#081C15] p-1.5 rounded-xl border border-[#EBF8F2]/20">
                  <span className="text-[10px] font-bold uppercase text-[#EBF8F2]/60 px-1.5">
                    Bọc thẻ:
                  </span>
                  <button
                    type="button"
                    onClick={() => applyKeywordTag("yellow")}
                    className="px-2 py-1 rounded bg-[#FFD200]/20 hover:bg-[#FFD200]/30 text-[#FFD200] text-xs font-bold border border-[#FFD200]/40 transition"
                    title="Highlight vàng (Thẻ phạt vàng / Concept)"
                  >
                    ⭐ Vàng
                  </button>
                  <button
                    type="button"
                    onClick={() => applyKeywordTag("red")}
                    className="px-2 py-1 rounded bg-[#FF334B]/20 hover:bg-[#FF334B]/30 text-[#FF334B] text-xs font-bold border border-[#FF334B]/40 transition"
                    title="Highlight đỏ (Thẻ phạt đỏ / Mâu thuẫn)"
                  >
                    🟥 Đỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => applyKeywordTag("white")}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/30 transition"
                    title="Highlight trắng viền sáng"
                  >
                    ⚪ Trắng
                  </button>
                  <button
                    type="button"
                    onClick={() => applyKeywordTag("clean")}
                    className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs font-semibold border border-red-500/20 transition"
                    title="Xóa bỏ thẻ HTML"
                  >
                    🧹 Xóa
                  </button>
                </div>
              </div>

              {/* List of lines */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {scriptLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      activeLineIndex === idx
                        ? "bg-[#143D2E]/90 border-[#FFD200] shadow-md shadow-[#FFD200]/10"
                        : "bg-[#081C15]/70 border-[#EBF8F2]/10 hover:border-[#EBF8F2]/30"
                    }`}
                    onClick={() => setActiveLineIndex(idx)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-[#10B981] text-[#081C15] text-[11px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-[11px] font-bold text-[#EBF8F2]/70 uppercase">
                          {idx === 0
                            ? "Hook mở đầu (Gây tò mò)"
                            : idx === 1
                            ? "Hook nối"
                            : idx === 2
                            ? "Giới thiệu VS"
                            : idx >= 3 && idx <= 5
                            ? `Đặc điểm ${conceptB || "B"}`
                            : idx >= 6 && idx <= 8
                            ? `Đặc điểm ${conceptA || "A"}`
                            : idx >= 9 && idx <= 10
                            ? "So sánh mâu thuẫn đối nghịch"
                            : "Call to Action kết video"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLine(idx);
                        }}
                        className="text-[#EBF8F2]/40 hover:text-[#FF334B] p-1 transition"
                        title="Xóa dòng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <input
                        ref={(el) => {
                          captionInputRefs.current[idx] = el;
                        }}
                        type="text"
                        value={line.caption}
                        onFocus={() => setActiveLineIndex(idx)}
                        onChange={(e) => updateLine(idx, "caption", e.target.value)}
                        placeholder="Nội dung phụ đề hiển thị (kèm thẻ highlight)..."
                        className="w-full bg-[#0E291E] border border-[#EBF8F2]/20 rounded-lg px-3 py-1.5 text-xs text-[#EBF8F2] focus:border-[#FFD200] outline-none font-sans"
                      />

                      <div className="bg-[#05130E] px-3 py-1.5 rounded-lg border border-[#EBF8F2]/10 flex items-center justify-between text-xs">
                        <div className="text-[#EBF8F2]/80">
                          <span className="text-[10px] text-[#FFD200]/80 font-bold uppercase mr-2">
                            Hiển thị:
                          </span>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: line.caption || '<span class="text-gray-500">Trống</span>',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#143D2E] hover:bg-[#10B981]/30 text-xs font-semibold text-[#EBF8F2] border border-[#EBF8F2]/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng thoại</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScriptLines(DEFAULT_SCRIPT)}
                  className="text-xs text-[#EBF8F2]/50 hover:text-[#FFD200] underline"
                >
                  Khôi phục 12 dòng mặc định
                </button>
              </div>
            </div>

            {/* Action Button: GENERATE VIDEO */}
            <div className="space-y-4">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className={`w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider transition-all shadow-xl flex items-center justify-center space-x-3 ${
                  isGenerating
                    ? "bg-gradient-to-r from-emerald-800 to-green-900 text-emerald-200 cursor-not-allowed opacity-80"
                    : "bg-gradient-to-r from-[#10B981] via-[#22C55E] to-[#FFD200] text-[#081C15] hover:shadow-2xl hover:shadow-[#10B981]/30 hover:scale-[1.01] active:scale-[0.99]"
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>ĐANG TỔNG HỢP GIỌNG ĐỌC & RENDER VIDEO MP4...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">⚽</span>
                    <span>BẮT ĐẦU SẢN XUẤT VIDEO (GENERATE MP4)</span>
                  </>
                )}
              </button>

              {/* Status Alert */}
              {generationError && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 flex items-start space-x-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Quá trình render gặp sự cố</div>
                    <div className="text-xs opacity-90 mt-1">{generationError}</div>
                  </div>
                </div>
              )}

              {generationSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                    <div>
                      <div className="font-bold">Đã render thành công!</div>
                      <div className="text-xs opacity-80">Video đã sẵn sàng bên cột phải hoặc trong Thư viện.</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentView("gallery")}
                      className="px-3 py-1.5 rounded-lg bg-[#FFD200] text-[#081C15] font-bold text-xs"
                    >
                      Xem trong Thư viện
                    </button>
                  </div>
                </div>
              )}

              {/* Collapsible Terminal Console Log */}
              <div className="bg-[#05130E] border border-[#EBF8F2]/15 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full px-4 py-2 bg-[#081C15] flex items-center justify-between text-xs text-[#EBF8F2]/70 hover:text-white transition"
                >
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-3.5 h-3.5 text-[#FFD200]" />
                    <span className="font-mono">Engine Console Output</span>
                    {isGenerating && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showLogs ? "rotate-180" : ""}`}
                  />
                </button>

                {showLogs && (
                  <div className="p-3 max-h-60 overflow-y-auto font-mono text-[11px] text-[#EBF8F2]/80 leading-relaxed whitespace-pre-wrap bg-black/50">
                    {generationLogs || "Đang chờ lệnh bắt đầu..."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: PREVIEW PLAYER (5 Cols) ================= */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0E291E]/80 backdrop-blur-md border border-[#EBF8F2]/15 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#EBF8F2]/10 mb-4">
                <div className="flex items-center space-x-2">
                  <Film className="w-4 h-4 text-[#FFD200]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#FFD200]">
                    Video Preview Trực Tiếp
                  </h2>
                </div>
                {selectedVideo && (
                  <span className="text-[11px] font-mono text-[#EBF8F2]/60 bg-[#081C15] px-2 py-0.5 rounded border border-[#EBF8F2]/10 truncate max-w-[180px]">
                    {selectedVideo.filename}
                  </span>
                )}
              </div>

              {selectedVideo ? (
                <div className="flex flex-col items-center">
                  <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-2xl overflow-hidden border-2 border-[#EBF8F2]/30 shadow-2xl">
                    <video
                      key={selectedVideo.url}
                      src={selectedVideo.url}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="w-full mt-4 flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <p className="font-bold text-[#EBF8F2] truncate max-w-[200px]">
                        {selectedVideo.title}
                      </p>
                      <p className="text-[#EBF8F2]/60 font-mono text-[10px]">
                        {selectedVideo.sizeFormatted} •{" "}
                        {new Date(selectedVideo.updatedAt).toLocaleTimeString("vi-VN")}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={selectedVideo.url}
                        download
                        className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#FFD200] text-[#081C15] font-bold text-xs hover:bg-yellow-400 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tải MP4</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-[9/16] max-w-[300px] mx-auto rounded-2xl border-2 border-dashed border-[#EBF8F2]/20 flex flex-col items-center justify-center p-6 text-center text-[#EBF8F2]/40">
                  <Film className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Chưa có video được chọn</p>
                  <p className="text-[11px] mt-1">
                    Bấm &quot;Generate Video&quot; ở bên trái để xem kết quả tại đây.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ================= CINEMA MODAL VIDEO PLAYER ================= */}
      {modalVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-[#0E291E] border-2 border-[#FFD200]/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col items-center">
            {/* Close Button */}
            <button
              onClick={() => setModalVideo(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#081C15] text-[#EBF8F2] hover:text-[#FF334B] border border-[#EBF8F2]/20 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full mb-3 pr-8">
              <h3 className="font-bold text-base text-[#FFD200] truncate">
                {modalVideo.title}
              </h3>
              <p className="text-xs text-[#EBF8F2]/60 font-mono">
                {modalVideo.filename} • {modalVideo.sizeFormatted}
              </p>
            </div>

            {/* Video 9:16 Cinema Player */}
            <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-[#EBF8F2]/30 shadow-2xl">
              <video
                src={modalVideo.url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            {/* Modal Bottom Actions */}
            <div className="w-full mt-4 flex items-center justify-between gap-3">
              <a
                href={modalVideo.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-[#143D2E] hover:bg-[#10B981]/30 text-xs font-semibold text-[#EBF8F2] border border-[#EBF8F2]/20 flex items-center space-x-1.5 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Mở tab mới</span>
              </a>

              <a
                href={modalVideo.url}
                download
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase flex items-center space-x-1.5 shadow-lg hover:scale-105 transition"
              >
                <Download className="w-4 h-4" />
                <span>Tải File MP4</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
