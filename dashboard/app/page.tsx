"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
  HardDrive,
  X,
  ArrowLeft,
  Eye,
  Check,
  Code,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";

interface ScriptLine {
  tts: string;
  caption: string; // Internal standard format with <span class="kw"...>
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
    provider?: string;
    voice?: string;
    title: string;
    left: { name: string; icon: string };
    right: { name: string; icon: string };
    script: Array<{ tts?: string; caption?: string } | string>;
  };
}

const STORAGE_KEY = "pssc_video_form_draft_v2";

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

interface VoiceOption {
  id: string;
  provider: "vieneu" | "edge";
  voice: string;
  name: string;
  badge: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  { id: "vieneu:Hải Đăng", provider: "vieneu", voice: "Hải Đăng", name: "VieNeu — Hải Đăng (Nam, Bắc, Tự nhiên, 48kHz)", badge: "Mặc định ⭐" },
  { id: "vieneu:Adam bựa", provider: "vieneu", voice: "Adam bựa", name: "VieNeu — Adam bựa (Nam, Bắc, Tự nhiên, Hài hước)", badge: "Hot ⭐" },
  { id: "vieneu:Trúc Ly", provider: "vieneu", voice: "Trúc Ly", name: "VieNeu — Trúc Ly (Nữ, Bắc, Tự nhiên, Truyền cảm)", badge: "Hot ⭐" },
  { id: "vieneu:Thiện Minh", provider: "vieneu", voice: "Thiện Minh", name: "VieNeu — Thiện Minh (Nam, Bắc, Kể chuyện)", badge: "Kể chuyện ⭐" },
  { id: "vieneu:Mai Anh", provider: "vieneu", voice: "Mai Anh", name: "VieNeu — Mai Anh (Nữ, Bắc, Tin tức)", badge: "Tin tức ⭐" },
  { id: "vieneu:Thùy Dung", provider: "vieneu", voice: "Thùy Dung", name: "VieNeu — Thùy Dung (Nữ, Nam, Tin tức)", badge: "Miền Nam ⭐" },
  { id: "vieneu:Thiền Tâm Đức", provider: "vieneu", voice: "Thiền Tâm Đức", name: "VieNeu — Thiền Tâm Đức (Nam, Bắc, Kể chuyện)", badge: "Kể chuyện" },
  { id: "vieneu:Ngọc Huyền", provider: "vieneu", voice: "Ngọc Huyền", name: "VieNeu — Ngọc Huyền (Nữ, Bắc, Tự nhiên)", badge: "Tự nhiên" },
  { id: "vieneu:Quang Sơn", provider: "vieneu", voice: "Quang Sơn", name: "VieNeu — Quang Sơn (Nam, Trung, Tự nhiên)", badge: "Miền Trung" },
  { id: "vieneu:Ngọc Trân", provider: "vieneu", voice: "Ngọc Trân", name: "VieNeu — Ngọc Trân (Nữ, Trung, Tự nhiên)", badge: "Miền Trung" },
  { id: "vieneu:Minh Đức", provider: "vieneu", voice: "Minh Đức", name: "VieNeu — Minh Đức (Nam, Bắc, Tin tức)", badge: "Tin tức" },
  { id: "vieneu:Phạm Tuyên", provider: "vieneu", voice: "Phạm Tuyên", name: "VieNeu — Phạm Tuyên (Nam, Bắc, Tự nhiên)", badge: "Tự nhiên" },
  { id: "vieneu:Thái Sơn", provider: "vieneu", voice: "Thái Sơn", name: "VieNeu — Thái Sơn (Nam, Nam, Kể chuyện)", badge: "Miền Nam" },
  { id: "vieneu:Xuân Vĩnh", provider: "vieneu", voice: "Xuân Vĩnh", name: "VieNeu — Xuân Vĩnh (Nam, Bắc, Tự nhiên)", badge: "Tự nhiên" },
  { id: "vieneu:Thanh Bình", provider: "vieneu", voice: "Thanh Bình", name: "VieNeu — Thanh Bình (Nam, Bắc, Kể chuyện)", badge: "Kể chuyện" },
  { id: "vieneu:Ngọc Linh", provider: "vieneu", voice: "Ngọc Linh", name: "VieNeu — Ngọc Linh (Nữ, Bắc, Kể chuyện)", badge: "Kể chuyện" },
  { id: "vieneu:Đoan Trang", provider: "vieneu", voice: "Đoan Trang", name: "VieNeu — Đoan Trang (Nữ, Bắc, Tự nhiên)", badge: "Tự nhiên" },
  { id: "vieneu:Thục Đoan", provider: "vieneu", voice: "Thục Đoan", name: "VieNeu — Thục Đoan (Nữ, Nam, Kể chuyện)", badge: "Miền Nam" },
  { id: "vieneu:Minh Triết", provider: "vieneu", voice: "Minh Triết", name: "VieNeu — Minh Triết (Nam, Nam, Tin tức)", badge: "Miền Nam" },
  { id: "vieneu:Mỹ Duyên", provider: "vieneu", voice: "Mỹ Duyên", name: "VieNeu — Mỹ Duyên (Nữ, Nam, Đọc truyện)", badge: "Đọc truyện" },
  { id: "vieneu:Quỳnh Anh", provider: "vieneu", voice: "Quỳnh Anh", name: "VieNeu — Quỳnh Anh (Nữ, Bắc, Đọc truyện)", badge: "Đọc truyện" },
  { id: "vieneu:Đức Trí", provider: "vieneu", voice: "Đức Trí", name: "VieNeu — Đức Trí (Nam, Nam, Đọc truyện)", badge: "Đọc truyện" },
  { id: "vieneu:Kim Thanh", provider: "vieneu", voice: "Kim Thanh", name: "VieNeu — Kim Thanh (Nữ, Nam, Đọc truyện)", badge: "Đọc truyện" },
  { id: "vieneu:Adam", provider: "vieneu", voice: "Adam", name: "VieNeu — Adam (Nam, Nam, Tự nhiên)", badge: "Tự nhiên" },
  { id: "vieneu:Quốc Tuấn", provider: "vieneu", voice: "Quốc Tuấn", name: "VieNeu — Quốc Tuấn (Nam, Bắc, Tự nhiên)", badge: "Tự nhiên" },
  { id: "edge:vi-VN-NamMinhNeural", provider: "edge", voice: "vi-VN-NamMinhNeural", name: "Edge TTS — Nam Minh (Dự phòng qua mạng)", badge: "Cloud Edge" },
  { id: "edge:vi-VN-HoaiMyNeural", provider: "edge", voice: "vi-VN-HoaiMyNeural", name: "Edge TTS — Hoài My (Dự phòng qua mạng)", badge: "Cloud Edge" },
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

// Helper: Convert stored raw HTML to visual WYSIWYG HTML
function rawToVisualHtml(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/<span class="kw" style="color:\s*var\(--accent-yellow\)">/gi, '<span class="kw-visual-yellow">')
    .replace(/<span class="kw" style="color:\s*var\(--accent-red\)">/gi, '<span class="kw-visual-red">')
    .replace(/<span class="kw">/gi, '<span class="kw-visual-white">');
}

// Helper: Convert visual WYSIWYG HTML back to raw HyperFrames HTML
function visualToRawHtml(visual: string): string {
  if (!visual) return "";
  return visual
    .replace(/<span class="kw-visual-yellow"[^>]*>/gi, '<span class="kw" style="color: var(--accent-yellow)">')
    .replace(/<span class="kw-visual-red"[^>]*>/gi, '<span class="kw" style="color: var(--accent-red)">')
    .replace(/<span class="kw-visual-white"[^>]*>/gi, '<span class="kw">')
    // Remove unexpected nested spans or extraneous styles
    .replace(/<font[^>]*>/gi, "")
    .replace(/<\/font>/gi, "");
}

// Extract plain text for TTS
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

export default function DashboardPage() {
  const [currentView, setCurrentView] = useState<"gallery" | "studio">("gallery");
  const [isMounted, setIsMounted] = useState(false);

  // Form states
  const [title, setTitle] = useState("Áo bản Player vs Áo bản Fan");
  const [category, setCategory] = useState("Công nghệ & Trang bị");
  const [channel, setChannel] = useState("Phía sau sân cỏ");
  const [provider, setProvider] = useState<"vieneu" | "edge">("vieneu");
  const [voice, setVoice] = useState("Hải Đăng");
  const [slug, setSlug] = useState("ao-player-vs-ao-fan");
  const [conceptA, setConceptA] = useState("BẢN PLAYER");
  const [iconA, setIconA] = useState("jersey-player");
  const [conceptB, setConceptB] = useState("BẢN FAN");
  const [iconB, setIconB] = useState("jersey-fan");
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>(DEFAULT_SCRIPT);

  // Audio preview state
  const [isPreviewingAudio, setIsPreviewingAudio] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-save feedback state
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);

  // Visual vs Raw Mode toggle for script lines (index: boolean)
  const [showRawCodeMap, setShowRawCodeMap] = useState<{ [key: number]: boolean }>({});
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const visualEditorRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // SSE Live Progress states
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [progressPhase, setProgressPhase] = useState<string>("idle");
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
  const [templates, setTemplates] = useState<TemplateItem[]>([]);

  // 1. AUTO-SAVE: Load draft from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.channel) setChannel(parsed.channel);
        if (parsed.provider) {
          setProvider(parsed.provider);
        } else if (parsed.voice && parsed.voice.includes("Neural")) {
          setProvider("edge");
        } else {
          setProvider("vieneu");
        }
        if (parsed.voice) setVoice(parsed.voice);
        if (parsed.slug) setSlug(parsed.slug);
        if (parsed.conceptA) setConceptA(parsed.conceptA);
        if (parsed.iconA) setIconA(parsed.iconA);
        if (parsed.conceptB) setConceptB(parsed.conceptB);
        if (parsed.iconB) setIconB(parsed.iconB);
        if (Array.isArray(parsed.scriptLines) && parsed.scriptLines.length > 0) {
          setScriptLines(parsed.scriptLines);
        }
        if (parsed.lastSaved) {
          setLastAutoSavedTime(new Date(parsed.lastSaved).toLocaleTimeString("vi-VN"));
        }
      }
    } catch (e) {
      console.warn("Không thể tải bản nháp từ localStorage:", e);
    }
  }, []);

  // 1. AUTO-SAVE: Chỉ lưu khi người dùng thực sự đang ở tab studio và có nội dung (debounced 400ms)
  useEffect(() => {
    if (!isMounted || currentView !== "studio") return;
    const hasContent = Boolean(title.trim()) || scriptLines.some((l) => l.tts.trim());
    if (!hasContent) return;

    const timer = setTimeout(() => {
      try {
        const now = Date.now();
        const draft = {
          title,
          category,
          channel,
          provider,
          voice,
          slug,
          conceptA,
          iconA,
          conceptB,
          iconB,
          scriptLines,
          lastSaved: now,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setLastAutoSavedTime(new Date(now).toLocaleTimeString("vi-VN"));
      } catch (e) {
        console.warn("Lỗi khi lưu nháp localStorage:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [title, category, channel, provider, voice, slug, conceptA, iconA, conceptB, iconB, scriptLines, isMounted, currentView]);

  // Reset to default draft
  const handleResetDraft = () => {
    if (confirm("Bạn có chắc muốn khôi phục form về kịch bản mẫu ban đầu?")) {
      setTitle("Áo bản Player vs Áo bản Fan");
      setCategory("Công nghệ & Trang bị");
      setChannel("Phía sau sân cỏ");
      setProvider("vieneu");
      setVoice("Hải Đăng");
      setSlug("ao-player-vs-ao-fan");
      setConceptA("BẢN PLAYER");
      setIconA("jersey-player");
      setConceptB("BẢN FAN");
      setIconB("jersey-fan");
      setScriptLines(DEFAULT_SCRIPT);
      localStorage.removeItem(STORAGE_KEY);
      setLastAutoSavedTime("Đã khôi phục mặc định");
    }
  };

  // Fetch videos
  const fetchVideos = useCallback(async () => {
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
  }, [selectedVideo]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/data-templates");
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error("Lỗi khi tải templates:", err);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchTemplates();
  }, [fetchVideos, fetchTemplates]);

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
    if (d.provider === "vieneu" || d.provider === "edge") {
      setProvider(d.provider);
    } else if (d.voice && d.voice.includes("Neural")) {
      setProvider("edge");
    } else {
      setProvider("vieneu");
    }
    if (d.voice) setVoice(d.voice);

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

  // Preview Audio only (Instant in seconds via Edge TTS)
  const handlePreviewAudio = async () => {
    // If playing, toggle pause
    if (isPlayingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    setIsPreviewingAudio(true);
    try {
      const res = await fetch("/api/preview-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: scriptLines,
          provider,
          voice,
          customSlug: slug,
          title,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể tạo audio preview");
      }

      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }

      const audio = new Audio(data.audioUrl);
      previewAudioRef.current = audio;
      audio.play();
      setIsPlayingPreview(true);

      audio.onended = () => {
        setIsPlayingPreview(false);
      };
      audio.onerror = () => {
        setIsPlayingPreview(false);
      };
    } catch (err: unknown) {
      const error = err as Error;
      alert("Lỗi nghe thử audio: " + error.message);
    } finally {
      setIsPreviewingAudio(false);
    }
  };

  // 2. WYSIWYG: Apply visual keyword tag to selection
  const applyVisualTag = (colorType: "yellow" | "red" | "white" | "clean") => {
    if (activeLineIdx === null) return;
    const editor = visualEditorRefs.current[activeLineIdx];
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Ensure selection is inside the active editor
    if (!editor.contains(range.commonAncestorContainer)) return;

    if (colorType === "clean") {
      // Remove tags, unwrap selection
      const selectedHtml = range.extractContents();
      const textContent = selectedHtml.textContent || "";
      range.insertNode(document.createTextNode(textContent));
    } else {
      const selectedText = range.toString();
      if (!selectedText.trim()) return;

      const span = document.createElement("span");
      if (colorType === "yellow") {
        span.className = "kw-visual-yellow";
      } else if (colorType === "red") {
        span.className = "kw-visual-red";
      } else {
        span.className = "kw-visual-white";
      }
      span.textContent = selectedText;

      range.deleteContents();
      range.insertNode(span);
    }

    // Sync to state
    const visualContent = editor.innerHTML;
    const rawContent = visualToRawHtml(visualContent);
    const plainTts = stripHtml(rawContent);

    updateLine(activeLineIdx, "caption", rawContent);
    updateLine(activeLineIdx, "tts", plainTts);
  };

  const updateLine = (index: number, field: "tts" | "caption", value: string) => {
    const updated = [...scriptLines];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "caption" && !updated[index].tts) {
      updated[index].tts = stripHtml(value);
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

  // 3. SSE LIVE PROGRESS: Generate Video with streaming status
  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgressPercent(5);
    setProgressPhase("start");
    setProgressMessage("Đang khởi động engine sản xuất...");
    setGenerationLogs("");
    setGenerationError(null);
    setGenerationSuccess(false);
    setShowLogs(true);

    // Dừng preview audio nếu đang phát
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    }

    // Giải phóng thẻ video trong DOM để Windows lập tức nhả file lock
    setSelectedVideo(null);
    if (typeof document !== "undefined") {
      document.querySelectorAll("video").forEach((v) => {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch {}
      });
    }

    try {
      const payload = {
        title,
        category,
        channel,
        provider,
        voice,
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Lỗi kết nối API");
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Trình duyệt không hỗ trợ đọc stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            try {
              const data = JSON.parse(trimmed.replace(/^data:\s*/, ""));

              if (data.type === "log") {
                setGenerationLogs((prev) => prev + data.text);
              } else if (data.type === "progress") {
                setProgressPercent(data.percent || 10);
                setProgressPhase(data.phase || "render");
                if (data.message) setProgressMessage(data.message);
              } else if (data.type === "done") {
                setProgressPercent(100);
                setProgressPhase("done");
                setProgressMessage("🎉 Xuất video MP4 thành công 100%!");
                setGenerationSuccess(true);

                // Auto-refresh library
                await fetchVideos();
                await fetchTemplates();

                const newVid = {
                  filename: data.filename || `${data.slug}.mp4`,
                  title: data.slug || title,
                  sizeBytes: 0,
                  sizeFormatted: "Mới render",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  url: data.videoUrl || `/api/videos/${data.filename}`,
                };
                setSelectedVideo(newVid);
              } else if (data.type === "error") {
                throw new Error(data.message || "Quá trình render thất bại");
              }
            } catch (err: unknown) {
              const parseErr = err as Error;
              console.warn("Parse SSE event error:", parseErr);
            }
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setGenerationError(error.message);
      setProgressPhase("error");
      setProgressMessage(`❌ Lỗi: ${error.message}`);
      setGenerationLogs((prev) => prev + `\n❌ LỖI: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered videos for Gallery View
  const filteredVideos = videos.filter((vid) => {
    return (
      vid.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vid.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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

            <Link
              href="/create"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all text-[#EBF8F2]/70 hover:text-[#FFD200] hover:bg-white/5"
            >
              <Sparkles className="w-4 h-4 text-[#FFD200]" />
              <span>Xưởng Tạo Video (/create)</span>
            </Link>
          </nav>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center space-x-3">
          <Link
            href="/create?new=1"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase tracking-wide hover:shadow-lg hover:shadow-[#10B981]/25 hover:scale-105 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Video Mới</span>
          </Link>

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

          {/* Search Bar */}
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
              <h3 className="text-base font-bold text-[#EBF8F2]">Chưa có video nào</h3>
              <p className="text-xs text-[#EBF8F2]/60 max-w-md mt-1 mb-5">
                {searchQuery
                  ? "Không tìm thấy video khớp với từ khóa tìm kiếm."
                  : "Thư mục output/ hiện đang trống. Hãy bắt đầu sản xuất video so sánh đầu tiên!"}
              </p>
              <Link
                href="/create?new=1"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase tracking-wider hover:scale-105 transition"
              >
                + Bắt đầu tạo video ngay (/create)
              </Link>
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

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#FFD200]/90 text-[#081C15] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-[#081C15]/80 backdrop-blur text-[10px] font-bold text-[#FFD200] border border-[#FFD200]/30">
                          9:16 Reel
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] font-mono text-[#EBF8F2]">
                          {vid.sizeFormatted}
                        </span>
                      </div>

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

                      <div className="pt-2 border-t border-[#EBF8F2]/10 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => setModalVideo(vid)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-[#143D2E] hover:bg-[#10B981]/30 text-xs font-semibold text-[#EBF8F2] flex items-center justify-center space-x-1 border border-[#EBF8F2]/20 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#FFD200]" />
                          <span>Xem</span>
                        </button>

                        {correspondingTpl && (
                          <Link
                            href={`/create?template=${correspondingTpl.slug}`}
                            className="py-1.5 px-2 rounded-lg bg-[#0E291E] hover:bg-[#FFD200]/20 text-xs font-semibold text-[#FFD200] border border-[#FFD200]/30 transition"
                            title="Nạp vào Studio để sửa / clone"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </Link>
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
            {/* General Metadata Card with Auto-save indicator */}
            <div className="bg-[#0E291E]/80 backdrop-blur-md border border-[#EBF8F2]/15 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EBF8F2]/10 mb-4 gap-2">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#FFD200]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#FFD200]">
                    1. Cấu hình chủ đề & Kênh
                  </h2>
                </div>

                {/* Auto-save & Reset Bar */}
                <div className="flex items-center space-x-3 text-xs">
                  {lastAutoSavedTime && (
                    <span className="flex items-center space-x-1 text-[#10B981] font-mono text-[11px] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/20">
                      <Check className="w-3 h-3" />
                      <span>Đã lưu nháp: {lastAutoSavedTime}</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleResetDraft}
                    className="flex items-center space-x-1 text-[#EBF8F2]/50 hover:text-[#FF334B] text-[11px] transition"
                    title="Xóa nháp và khôi phục form mặc định"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Khôi phục</span>
                  </button>
                </div>
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

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#EBF8F2]/70 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <span>Giọng đọc AI (Voice)</span>
                      {provider === "vieneu" ? (
                        <span className="text-[10px] bg-[#10B981]/20 text-[#10B981] font-bold px-2 py-0.5 rounded border border-[#10B981]/30">
                          ⚡ VieNeu TTS Local (127.0.0.1:8001)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-500/30">
                          ☁️ Edge TTS Cloud
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-[#FFD200] font-bold">
                      {provider === "vieneu" ? "CIT Voice Studio (Local Engine)" : "Microsoft Edge Online"}
                    </span>
                  </label>
                  <select
                    value={`${provider}:${voice}`}
                    onChange={(e) => {
                      const selected = VOICE_OPTIONS.find((v) => v.id === e.target.value);
                      if (selected) {
                        setProvider(selected.provider);
                        setVoice(selected.voice);
                      }
                    }}
                    className="w-full bg-[#081C15] border border-[#EBF8F2]/20 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#EBF8F2] focus:border-[#FFD200] outline-none"
                  >
                    <optgroup label="⚡ VieNeu TTS (Chạy Local - Giọng Đọc Chính)">
                      {VOICE_OPTIONS.filter((v) => v.provider === "vieneu").map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="☁️ Edge TTS (Dự Phòng Qua Mạng)">
                      {VOICE_OPTIONS.filter((v) => v.provider === "edge").map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
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

            {/* Script Builder with Visual WYSIWYG Editor */}
            <div className="bg-[#0E291E]/80 backdrop-blur-md border border-[#EBF8F2]/15 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EBF8F2]/10 mb-4 gap-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#FFD200]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#FFD200]">
                    3. Kịch bản & Soạn thảo Trực quan (WYSIWYG)
                  </h2>
                  <span className="text-xs bg-[#10B981]/20 text-[#10B981] font-bold px-2 py-0.5 rounded-full border border-[#10B981]/30">
                    {scriptLines.length} câu
                  </span>
                </div>

                {/* Floating Visual Keyword Highlight Toolbar */}
                <div className="flex items-center space-x-1.5 bg-[#081C15] p-1.5 rounded-xl border border-[#EBF8F2]/20">
                  <span className="text-[10px] font-bold uppercase text-[#EBF8F2]/60 px-1.5">
                    Tô màu từ chọn:
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Don't steal selection focus
                      applyVisualTag("yellow");
                    }}
                    className="px-2.5 py-1 rounded bg-[#FFD200]/20 hover:bg-[#FFD200]/30 text-[#FFD200] text-xs font-bold border border-[#FFD200]/40 transition"
                    title="Tô màu Vàng (Thẻ phạt vàng / Concept)"
                  >
                    ⭐ Vàng
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyVisualTag("red");
                    }}
                    className="px-2.5 py-1 rounded bg-[#FF334B]/20 hover:bg-[#FF334B]/30 text-[#FF334B] text-xs font-bold border border-[#FF334B]/40 transition"
                    title="Tô màu Đỏ (Thẻ phạt đỏ / Mâu thuẫn)"
                  >
                    🟥 Đỏ
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyVisualTag("white");
                    }}
                    className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/30 transition"
                    title="Tô màu Trắng viền sáng"
                  >
                    ⚪ Trắng
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyVisualTag("clean");
                    }}
                    className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs font-semibold border border-red-500/20 transition"
                    title="Xóa bỏ định dạng màu"
                  >
                    🧹 Bỏ màu
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#EBF8F2]/60 mb-4">
                ✨ <b>Soạn thảo trực quan:</b> Gõ nội dung bình thường, sau đó bôi đen từ khóa và bấm các nút màu ở trên để tô màu nổi bật. Không còn những đoạn code <code>&lt;span class=...&gt;</code> gây rối mắt!
              </p>

              {/* List of lines */}
              <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-2">
                {scriptLines.map((line, idx) => {
                  const isRaw = !!showRawCodeMap[idx];
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        activeLineIdx === idx
                          ? "bg-[#143D2E]/90 border-[#FFD200] shadow-md shadow-[#FFD200]/10"
                          : "bg-[#081C15]/70 border-[#EBF8F2]/10 hover:border-[#EBF8F2]/30"
                      }`}
                      onClick={() => setActiveLineIdx(idx)}
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

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowRawCodeMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
                            }}
                            className={`p-1 rounded text-xs transition ${
                              isRaw
                                ? "bg-[#FFD200] text-[#081C15] font-bold"
                                : "text-[#EBF8F2]/40 hover:text-[#EBF8F2]"
                            }`}
                            title={isRaw ? "Chuyển sang chế độ WYSIWYG" : "Xem/Sửa mã HTML gốc"}
                          >
                            <Code className="w-3.5 h-3.5" />
                          </button>

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
                      </div>

                      {/* Line Editor Box */}
                      <div className="space-y-2">
                        {isRaw ? (
                          /* Raw HTML Mode */
                          <input
                            type="text"
                            value={line.caption}
                            onFocus={() => setActiveLineIdx(idx)}
                            onChange={(e) => {
                              updateLine(idx, "caption", e.target.value);
                              updateLine(idx, "tts", stripHtml(e.target.value));
                            }}
                            placeholder="Nhập câu kịch bản tại đây (mã HTML gốc)..."
                            className="w-full bg-[#0E291E] border border-[#FFD200]/50 rounded-lg px-3 py-2 text-xs font-mono text-[#EBF8F2] outline-none"
                          />
                        ) : (
                          /* Visual WYSIWYG Editable Box */
                          <div
                            ref={(el) => {
                              visualEditorRefs.current[idx] = el;
                            }}
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder="Nhập câu kịch bản tại đây..."
                            onFocus={() => setActiveLineIdx(idx)}
                            onBlur={(e) => {
                              const visualHtml = e.currentTarget.innerHTML;
                              const raw = visualToRawHtml(visualHtml);
                              const plain = stripHtml(raw);
                              if (!plain) {
                                e.currentTarget.innerHTML = "";
                                updateLine(idx, "caption", "");
                                updateLine(idx, "tts", "");
                              } else {
                                updateLine(idx, "caption", raw);
                                updateLine(idx, "tts", plain);
                              }
                            }}
                            onKeyUp={(e) => {
                              const visualHtml = e.currentTarget.innerHTML;
                              const raw = visualToRawHtml(visualHtml);
                              const plain = stripHtml(raw);
                              if (!plain) {
                                updateLine(idx, "caption", "");
                                updateLine(idx, "tts", "");
                              } else {
                                updateLine(idx, "caption", raw);
                                updateLine(idx, "tts", plain);
                              }
                            }}
                            dangerouslySetInnerHTML={{
                              __html: rawToVisualHtml(line.caption),
                            }}
                            className="w-full min-h-[38px] bg-[#0E291E] border border-[#EBF8F2]/20 focus:border-[#FFD200] rounded-lg px-3 py-2 text-xs text-[#EBF8F2] outline-none leading-relaxed transition font-sans cursor-text"
                          />
                        )}

                        {/* Live Video Screen Preview Bar */}
                        <div className="bg-[#05130E] px-3 py-1.5 rounded-lg border border-[#EBF8F2]/10 flex items-center justify-between text-xs">
                          <div className="text-[#EBF8F2]/80">
                            <span className="text-[10px] text-[#FFD200]/80 font-bold uppercase mr-2">
                              Xem trước màn hình:
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
                  );
                })}
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
              </div>
            </div>

            {/* 3. Action Button: GENERATE VIDEO WITH LIVE SSE PROGRESS BAR */}
            <div className="space-y-4">
              {isGenerating ? (
                /* LIVE PROGRESS BAR DISPLAY */
                <div className="relative w-full overflow-hidden rounded-2xl bg-[#081C15] border-2 border-[#10B981] shadow-2xl p-4">
                  {/* Glowing progress fill bar */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#143D2E] via-[#10B981] to-[#FFD200] opacity-40 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />

                  <div className="relative z-10 flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-[#FFD200]" />
                        <span className="font-black text-sm uppercase tracking-wider text-[#FFD200]">
                          Đang sản xuất video...
                        </span>
                      </div>
                      <span className="font-mono text-base font-black text-[#FFD200]">
                        {progressPercent}%
                      </span>
                    </div>

                    <p className="text-xs text-[#EBF8F2] font-semibold truncate">
                      {progressMessage || "Đang xử lý..."}
                    </p>

                    {/* Progress track */}
                    <div className="w-full bg-[#05130E] h-2.5 rounded-full overflow-hidden border border-[#EBF8F2]/10 mt-1">
                      <div
                        className="bg-gradient-to-r from-[#10B981] to-[#FFD200] h-full rounded-full transition-all duration-300 shadow-md"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Dual Action Buttons: Preview Audio + Generate Video */
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <button
                    type="button"
                    disabled={isGenerating || isPreviewingAudio}
                    onClick={handlePreviewAudio}
                    className={`sm:col-span-4 py-4 rounded-2xl font-bold text-xs uppercase tracking-wider border-2 transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer ${
                      isPlayingPreview
                        ? "bg-[#FF334B]/20 border-[#FF334B] text-[#FF334B] hover:bg-[#FF334B]/30 animate-pulse"
                        : "bg-[#0E291E] border-[#EBF8F2]/25 text-[#EBF8F2] hover:border-[#FFD200] hover:text-[#FFD200] active:scale-95"
                    }`}
                    title="Nghe thử giọng đọc AI cho toàn bộ kịch bản trong vài giây"
                  >
                    {isPreviewingAudio ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#FFD200]" />
                        <span>Đang tạo audio...</span>
                      </>
                    ) : isPlayingPreview ? (
                      <>
                        <Pause className="w-4 h-4 fill-current text-[#FF334B]" />
                        <span>Dừng nghe thử</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-[#FFD200]" />
                        <span>🔊 Nghe thử Audio</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="sm:col-span-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#10B981] via-[#22C55E] to-[#FFD200] text-[#081C15] hover:shadow-2xl hover:shadow-[#10B981]/30 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span className="text-xl">⚽</span>
                    <span>BẮT ĐẦU SẢN XUẤT VIDEO (GENERATE MP4)</span>
                  </button>
                </div>
              )}

              {/* Status Alerts */}
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
                      <div className="font-bold">Đã render thành công 100%!</div>
                      <div className="text-xs opacity-80">Video đã sẵn sàng bên cột phải hoặc trong Thư viện.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView("gallery")}
                    className="px-3.5 py-1.5 rounded-lg bg-[#FFD200] text-[#081C15] font-black text-xs uppercase"
                  >
                    Xem trong Thư viện
                  </button>
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

            <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-[#EBF8F2]/30 shadow-2xl">
              <video
                src={modalVideo.url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

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
