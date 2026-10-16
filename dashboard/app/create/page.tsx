"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Download,
  RefreshCw,
  Sparkles,
  Film,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  Terminal,
  ExternalLink,
  Plus,
  Trash2,
  Zap,
  ArrowLeft,
  Check,
  Code,
  RotateCcw,
  Volume2,
  Pause,
  X,
  Wand2,
  Loader2,
  History,
  BookmarkPlus,
  Layers,
  Sparkle,
  Copy,
  ChevronUp,
} from "lucide-react";

interface ScriptLine {
  tts: string;
  caption: string;
}

export interface ScriptVersion {
  id: string;
  versionNumber: number;
  timestamp: number;
  label: string;
  promptUsed: string;
  isRefined?: boolean;
  data: {
    title: string;
    category: string;
    conceptA: string;
    conceptB: string;
    iconA: string;
    iconB: string;
    scriptLines: ScriptLine[];
    keywordsToHighlight?: string[];
  };
}

const VERSIONS_STORAGE_KEY = "pssc_script_versions_history_v1";

function formatScriptForExternalAi(data: {
  title: string;
  category?: string;
  conceptA?: string;
  conceptB?: string;
  iconA?: string;
  iconB?: string;
  scriptLines: ScriptLine[];
  keywordsToHighlight?: string[];
}): string {
  const lines = data.scriptLines
    .map((l, idx) => `Câu ${idx + 1}: ${l.tts || l.caption.replace(/<[^>]+>/g, "").trim()}`)
    .filter((l) => !l.endsWith(": "))
    .join("\n");

  const keywords =
    Array.isArray(data.keywordsToHighlight) && data.keywordsToHighlight.length > 0
      ? `\nTừ khóa nổi bật: ${data.keywordsToHighlight.join(", ")}`
      : "";

  return `[KỊCH BẢN SO SÁNH BÓNG ĐÁ 12 CÂU - PHÍA SAU SÂN CỎ]
Tiêu đề: ${data.title || "Chưa đặt"}
Chuyên mục: ${data.category || "Kiến thức bóng đá"}
Concept A: ${data.conceptA || ""} (Icon: ${data.iconA || "default"})
Concept B: ${data.conceptB || ""} (Icon: ${data.iconB || "default"})

12 CÂU KỊCH BẢN:
${lines}${keywords}

---
GỢI Ý LỆNH TINH CHỈNH:
(Bạn có thể chỉnh sửa trực tiếp nội dung trên hoặc gửi lệnh cho ChatGPT/Gemini tinh chỉnh theo ý muốn, sau đó dán kết quả vào ô AI Tinh Chỉnh trên hệ thống.)`;
}

function formatScriptAsJson(data: {
  title: string;
  category?: string;
  conceptA?: string;
  conceptB?: string;
  iconA?: string;
  iconB?: string;
  scriptLines: ScriptLine[];
  keywordsToHighlight?: string[];
}): string {
  const plainScript = data.scriptLines
    .map((l) => l.tts || l.caption.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);

  return JSON.stringify(
    {
      title: data.title || "",
      category: data.category || "Kiến thức bóng đá",
      conceptA: data.conceptA || "",
      conceptB: data.conceptB || "",
      iconA: data.iconA || "default",
      iconB: data.iconB || "default",
      script: plainScript,
      keywordsToHighlight: data.keywordsToHighlight || [],
    },
    null,
    2
  );
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

interface VoiceOption {
  id: string;
  provider: "vieneu" | "edge";
  voice: string;
  name: string;
  badge: string;
}

const STORAGE_KEY = "pssc_video_form_draft_v2";

const ICON_PRESET_MAP: Record<string, string> = {
  "jersey-player": "🎽",
  "jersey-fan": "👕",
  "tactics": "📋",
  "trophy": "🏆",
  "money": "💰",
  "card-penalty": "🟨",
  "default": "⚽",
};

const POPULAR_ICONS = [
  { value: "🐐", label: "The GOAT (Messi/Pele...)" },
  { value: "⚡", label: "Tốc độ / Sức mạnh (CR7/Mbappe)" },
  { value: "🤖", label: "Cỗ máy ghi bàn (Haaland)" },
  { value: "👑", label: "Nhà vua / Hoàng gia (Real Madrid)" },
  { value: "⚽", label: "Bóng đá cổ điển" },
  { value: "🏆", label: "Cúp vô địch / Quả bóng vàng" },
  { value: "💰", label: "Tiền lương / Chuyển nhượng" },
  { value: "📺", label: "Công nghệ VAR" },
  { value: "🟨", label: "Thẻ phạt Trọng tài" },
  { value: "🧤", label: "Găng tay Thủ môn" },
  { value: "📋", label: "Sa bàn chiến thuật" },
  { value: "jersey-player", label: "Áo thi đấu Player 🎽" },
  { value: "jersey-fan", label: "Áo người hâm mộ 👕" },
  { value: "🔥", label: "Nhiệt huyết / Derby" },
];

function getDisplayEmoji(iconKey: string): string {
  if (!iconKey) return "⚽";
  return ICON_PRESET_MAP[iconKey] || iconKey;
}

function suggestIconForConcept(conceptName: string): string {
  const lower = (conceptName || "").toLowerCase();
  if (lower.includes("messi") || lower.includes("goat")) return "🐐";
  if (lower.includes("ronaldo") || lower.includes("cr7") || lower.includes("tốc độ") || lower.includes("siêu sao")) return "⚡";
  if (lower.includes("haaland") || lower.includes("cỗ máy")) return "🤖";
  if (lower.includes("mbappe") || lower.includes("rùa")) return "🐢";
  if (lower.includes("real") || lower.includes("vua") || lower.includes("madrid") || lower.includes("hoàng gia")) return "👑";
  if (lower.includes("var") || lower.includes("màn hình") || lower.includes("video")) return "📺";
  if (lower.includes("thẻ") || lower.includes("trọng tài") || lower.includes("phạt")) return "🟨";
  if (lower.includes("tiền") || lower.includes("lương") || lower.includes("chuyển nhượng") || lower.includes("tài chính")) return "💰";
  if (lower.includes("cúp") || lower.includes("vô địch") || lower.includes("bóng vàng") || lower.includes("danh hiệu")) return "🏆";
  if (lower.includes("thủ môn") || lower.includes("găng")) return "🧤";
  if (lower.includes("player") || lower.includes("cầu thủ")) return "jersey-player";
  if (lower.includes("fan") || lower.includes("stadium") || lower.includes("cổ động")) return "jersey-fan";
  if (lower.includes("chiến thuật") || lower.includes("sa bàn") || lower.includes("hlv") || lower.includes("pep") || lower.includes("klopp")) return "📋";
  if (lower.includes("lửa") || lower.includes("derby") || lower.includes("nóng")) return "🔥";
  if (lower.includes("thủ") || lower.includes("bê tông") || lower.includes("hậu vệ")) return "🛡️";
  return "⚽";
}

const CATEGORIES = [
  "Công nghệ & Trang bị",
  "Chiến thuật & Huấn luyện",
  "Tài chính & Chuyển nhượng",
  "Hậu trường & Bí mật sân cỏ",
  "Luật chơi & Tranh cãi",
];

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
  { id: "Mỹ Duyên", provider: "vieneu", voice: "Mỹ Duyên", name: "VieNeu — Mỹ Duyên (Nữ, Nam, Đọc truyện)", badge: "Đọc truyện" },
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
    tts: "Chất vải dày, thấm hút mồ hôi cơ bản nhưng giữ form cực tốt.",
    caption: 'Chất vải dày, thấm hút cơ bản nhưng <span class="kw">GIỮ FORM CỰC TỐT.</span>',
  },
  {
    tts: "Còn bản Player chính là vũ khí chiến đấu đỉnh cao của cầu thủ.",
    caption: 'Còn bản Player chính là <span class="kw" style="color: var(--accent-yellow)">VŨ KHÍ CHIẾN ĐẤU ĐỈNH CAO.</span>',
  },
  {
    tts: "Form áo ôm sát body, tối ưu khí động học cho từng bước chạy.",
    caption: 'Form ôm sát body, tối ưu <span class="kw">KHÍ ĐỘNG HỌC.</span>',
  },
  {
    tts: "Logo ép nhiệt siêu nhẹ, phẳng lì để không gây cọ xát khi bứt tốc.",
    caption: 'Logo ép nhiệt <span class="kw">SIÊU NHẸ,</span> không gây cọ xát.',
  },
  {
    tts: "Vải dệt lỗ thoáng khí tổ ong, tản nhiệt cực nhanh trong 90 phút.",
    caption: 'Vải lỗ thoáng khí tổ ong, <span class="kw">TẢN NHIỆT CỰC NHANH.</span>',
  },
  {
    tts: "Mặc đi cafe chọn bản Fan, thi đấu đỉnh cao chọn bản Player. Bạn chọn áo nào?",
    caption: 'Đi cafe chọn bản Fan, thi đấu chọn bản Player. <span class="kw" style="color: var(--accent-red)">BẠN CHỌN ÁO NÀO?</span>',
  },
];

function rawToVisualHtml(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/<span class="kw" style="color:\s*var\(--accent-yellow\)">/gi, '<span class="kw-visual-yellow">')
    .replace(/<span class="kw" style="color:\s*var\(--accent-red\)">/gi, '<span class="kw-visual-red">')
    .replace(/<span class="kw">/gi, '<span class="kw-visual-white">');
}

function visualToRawHtml(visual: string): string {
  if (!visual) return "";
  return visual
    .replace(/<span class="kw-visual-yellow"[^>]*>/gi, '<span class="kw" style="color: var(--accent-yellow)">')
    .replace(/<span class="kw-visual-red"[^>]*>/gi, '<span class="kw" style="color: var(--accent-red)">')
    .replace(/<span class="kw-visual-white"[^>]*>/gi, '<span class="kw">')
    .replace(/<font[^>]*>/gi, "")
    .replace(/<\/font>/gi, "");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function autoHighlightKeywords(sentence: string, keywords: string[]): { tts: string; caption: string } {
  const plainText = sentence.replace(/<[^>]+>/g, "").trim();
  if (!keywords || keywords.length === 0) {
    return { tts: plainText, caption: plainText };
  }

  // Sắp xếp các từ khóa theo độ dài giảm dần để từ dài được bọc thẻ trước
  const validKeywords = keywords
    .map((k) => k.trim())
    .filter((k) => k.length >= 2)
    .sort((a, b) => b.length - a.length);

  if (validKeywords.length === 0) {
    return { tts: plainText, caption: plainText };
  }

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${validKeywords.map(escapeRegex).join("|")})`, "gi");

  // Tự động bọc thẻ màu vàng chuẩn cho các keyword
  const highlightedCaption = plainText.replace(
    pattern,
    '<span class="kw" style="color: var(--accent-yellow)">$1</span>'
  );

  return {
    tts: plainText,
    caption: highlightedCaption,
  };
}

function CreateStudioInner() {
  const searchParams = useSearchParams();
  const templateSlug = searchParams.get("template");

  const [isMounted, setIsMounted] = useState(false);

  // Form states - Mặc định form trống, sạch sẽ để người dùng bắt đầu tạo video mới
  const BLANK_SCRIPT: ScriptLine[] = Array.from({ length: 12 }).map(() => ({ tts: "", caption: "" }));
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Kiến thức bóng đá");
  const [channel, setChannel] = useState("Phía sau sân cỏ");
  const [provider, setProvider] = useState<"vieneu" | "edge">("vieneu");
  const [voice, setVoice] = useState("Hải Đăng");
  const [slug, setSlug] = useState("");
  const [conceptA, setConceptA] = useState("");
  const [iconA, setIconA] = useState("jersey-player");
  const [conceptB, setConceptB] = useState("");
  const [iconB, setIconB] = useState("jersey-fan");
  const [scriptLines, setScriptLines] = useState<ScriptLine[]>(BLANK_SCRIPT);

  // Draft banner notification state (không tự động ép đè form, hiển thị thanh thông báo để người dùng chủ động chọn)
  const [savedDraft, setSavedDraft] = useState<{
    title?: string;
    category?: string;
    channel?: string;
    provider?: "vieneu" | "edge";
    voice?: string;
    slug?: string;
    conceptA?: string;
    iconA?: string;
    conceptB?: string;
    iconB?: string;
    scriptLines?: ScriptLine[];
    lastSaved?: number;
    isCompleted?: boolean;
  } | null>(null);

  // Audio preview state
  const [isPreviewingAudio, setIsPreviewingAudio] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-save feedback state
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);

  // Visual vs Raw Mode toggle for script lines
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

  // Video preview states
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [modalVideo, setModalVideo] = useState<VideoItem | null>(null);

  // AI Script Assistant states
  const [aiIdea, setAiIdea] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Script Version History & Refinement states
  const [scriptVersions, setScriptVersions] = useState<ScriptVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<"text" | "json" | null>(null);
  const [showAiResponseBox, setShowAiResponseBox] = useState<boolean>(true);

  // Load script version history from localStorage on mount
  useEffect(() => {
    try {
      const savedVersions = localStorage.getItem(VERSIONS_STORAGE_KEY);
      if (savedVersions) {
        const parsed = JSON.parse(savedVersions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScriptVersions(parsed);
          setActiveVersionId(parsed[0].id);
        }
      }
    } catch (e) {
      console.warn("Lỗi nạp lịch sử phiên bản:", e);
    }
  }, []);

  const saveVersions = (versions: ScriptVersion[]) => {
    setScriptVersions(versions);
    try {
      localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(versions));
    } catch (e) {
      console.warn("Lỗi lưu lịch sử phiên bản:", e);
    }
  };

  // CIT Voice Studio dynamic voices
  const [voiceList, setVoiceList] = useState<VoiceOption[]>(VOICE_OPTIONS);
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [serverEngine, setServerEngine] = useState<string>("VieNeu-TTS-v3-Turbo");

  // Load dynamic voices from API on mount
  useEffect(() => {
    fetch("/api/voices")
      .then((r) => r.json())
      .then((data) => {
        if (data.online && Array.isArray(data.voices) && data.voices.length > 0) {
          setServerOnline(true);
          if (data.engine) setServerEngine(data.engine);
          const dynamicVieneu: VoiceOption[] = data.voices.map((v: { id: string; name: string; isCloned?: boolean; description?: string }) => ({
            id: `vieneu:${v.id}`,
            provider: "vieneu",
            voice: v.id,
            name: `VieNeu — ${v.name} ${v.isCloned ? "(Giọng clone ⭐)" : `(${v.description || "48kHz"})`}`,
            badge: v.isCloned ? "Clone ⭐" : (v.id === "Hải Đăng" ? "Mặc định ⭐" : "Studio"),
          }));
          const edgeVoices = VOICE_OPTIONS.filter((v) => v.provider === "edge");
          setVoiceList([...dynamicVieneu, ...edgeVoices]);
        }
      })
      .catch(() => {});
  }, []);

  // Bắt đầu một video mới sạch sẽ hoàn toàn (không lưu vết video trước)
  const handleCreateNewVideo = () => {
    setTitle("");
    setSlug("");
    setConceptA("");
    setIconA("jersey-player");
    setConceptB("");
    setIconB("jersey-fan");
    setCategory("Kiến thức bóng đá");
    setAiIdea("");
    setAiError(null);
    setAiSuccessMessage(null);
    setScriptLines(Array.from({ length: 12 }).map(() => ({ tts: "", caption: "" })));
    setSelectedVideo(null);
    setGenerationSuccess(false);
    setGenerationError(null);
    setGenerationLogs("");
    setProgressPercent(0);
    setProgressMessage("");
    setProgressPhase("idle");
    setShowLogs(false);
    setSavedDraft(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setLastAutoSavedTime(null);
  };

  // Khôi phục bản nháp dở dang từ thanh thông báo
  const handleRestoreDraft = () => {
    if (!savedDraft) return;
    if (savedDraft.title) setTitle(savedDraft.title);
    if (savedDraft.category) setCategory(savedDraft.category);
    if (savedDraft.channel) setChannel(savedDraft.channel);
    if (savedDraft.provider) setProvider(savedDraft.provider);
    if (savedDraft.voice) setVoice(savedDraft.voice);
    if (savedDraft.slug) setSlug(savedDraft.slug);
    if (savedDraft.conceptA) setConceptA(savedDraft.conceptA);
    if (savedDraft.iconA) setIconA(savedDraft.iconA);
    if (savedDraft.conceptB) setConceptB(savedDraft.conceptB);
    if (savedDraft.iconB) setIconB(savedDraft.iconB);
    if (Array.isArray(savedDraft.scriptLines) && savedDraft.scriptLines.length > 0) {
      setScriptLines(savedDraft.scriptLines);
    }
    if (savedDraft.lastSaved) {
      setLastAutoSavedTime("Đã nạp nháp lúc " + new Date(savedDraft.lastSaved).toLocaleTimeString("vi-VN"));
    }
    setSavedDraft(null);
  };

  // Bỏ qua và xóa vĩnh viễn nháp cũ
  const handleDismissDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSavedDraft(null);
  };

  // 1. AUTO-SAVE: Load template hoặc tìm kiếm nháp chưa hoàn thành
  useEffect(() => {
    setIsMounted(true);

    // Nếu có template query param, ưu tiên nạp từ API template
    if (templateSlug) {
      fetch("/api/data-templates")
        .then((r) => r.json())
        .then((res) => {
          if (res.templates) {
            const found = res.templates.find((t: TemplateItem) => t.slug === templateSlug);
            if (found && found.data) {
              const d = found.data;
              setTitle(d.title || found.title);
              setSlug(d.slug || found.slug);
              if (d.category) setCategory(d.category);
              if (d.channel) setChannel(d.channel);
              if (d.left?.name) setConceptA(d.left.name);
              if (d.left?.icon) setIconA(d.left.icon);
              if (d.right?.name) setConceptB(d.right.name);
              if (d.right?.icon) setIconB(d.right.icon);
              if (d.provider === "vieneu" || d.provider === "edge") {
                setProvider(d.provider);
              }
              if (d.voice) setVoice(d.voice);
              if (Array.isArray(d.script)) {
                const formatted = d.script.map((item: { tts?: string; caption?: string } | string) => {
                  if (typeof item === "string") {
                    return { tts: item.replace(/<[^>]+>/g, ""), caption: item };
                  }
                  return {
                    tts: item.tts || item.caption?.replace(/<[^>]+>/g, "") || "",
                    caption: item.caption || item.tts || "",
                  };
                });
                setScriptLines(formatted);
              }
              setLastAutoSavedTime("Đã nạp mẫu: " + (d.title || found.title));
            }
          }
        })
        .catch(() => {});
      return;
    }

    // Nếu không có template, kiểm tra xem localStorage có bản nháp chưa hoàn tất không
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasContent =
          Boolean(parsed.title?.trim()) ||
          Boolean(parsed.conceptA?.trim()) ||
          Boolean(parsed.conceptB?.trim()) ||
          (Array.isArray(parsed.scriptLines) &&
            parsed.scriptLines.some((l: { tts?: string; caption?: string }) => l?.tts?.trim() || l?.caption?.trim()));

        // Chỉ hiển thị thông báo khôi phục nếu draft có nội dung và chưa từng hoàn tất render
        if (hasContent && !parsed.isCompleted) {
          setSavedDraft(parsed);
        }
      }
    } catch (e) {
      console.warn("Lỗi kiểm tra bản nháp localStorage:", e);
    }
  }, [templateSlug]);

  // 1. AUTO-SAVE: Chỉ lưu nháp khi form có nội dung thực tế (debounced 400ms)
  useEffect(() => {
    if (!isMounted) return;

    const hasContent =
      Boolean(title.trim()) ||
      Boolean(conceptA.trim()) ||
      Boolean(conceptB.trim()) ||
      scriptLines.some((l) => l.tts.trim() || l.caption.trim());

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
          isCompleted: false,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setLastAutoSavedTime(new Date(now).toLocaleTimeString("vi-VN"));
      } catch (e) {
        console.warn("Lỗi khi lưu nháp localStorage:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [title, category, channel, provider, voice, slug, conceptA, iconA, conceptB, iconB, scriptLines, isMounted]);

  // Reset to default sample
  const handleResetDraft = () => {
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
    setSavedDraft(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setLastAutoSavedTime("Đã nạp kịch bản mẫu");
  };

  // Preview Audio only (Instant in 2-3 seconds via VieNeu TTS Local)
  const handlePreviewAudio = async () => {
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

      audio.onended = () => setIsPlayingPreview(false);
      audio.onerror = () => setIsPlayingPreview(false);
    } catch (err: unknown) {
      const error = err as Error;
      alert("Lỗi nghe thử audio: " + error.message);
    } finally {
      setIsPreviewingAudio(false);
    }
  };

  // AI Script Assistant: Tự động gọi LLM sinh kịch bản & auto-fill vào form
  const handleAiGenerateScript = async () => {
    if (!aiIdea.trim()) {
      setAiError("Vui lòng nhập ý tưởng kịch bản (ví dụ: So sánh mức lương của Messi và Ronaldo)");
      return;
    }

    setIsAiGenerating(true);
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: aiIdea.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Không thể tạo kịch bản từ AI");
      }

      const { data } = json;
      if (!data) throw new Error("Không nhận được dữ liệu kịch bản");

      // 1. Tự động map Concept A và Concept B
      if (data.conceptA) setConceptA(data.conceptA);
      if (data.conceptB) setConceptB(data.conceptB);

      // 2. Tự động map Icon đại diện nếu AI đề xuất phù hợp
      if (data.iconA) setIconA(data.iconA);
      if (data.iconB) setIconB(data.iconB);

      // 3. Tự động map Tiêu đề, danh mục và slug
      if (data.title) {
        setTitle(data.title);
        setSlug(toSlug(data.title));
      }
      if (data.category) setCategory(data.category);

      // 4. Map mảng 12 câu kịch bản & tự động quét bọc thẻ keyword màu vàng
      const keywords = Array.isArray(data.keywordsToHighlight) ? data.keywordsToHighlight : [];
      let formattedLines: ScriptLine[] = BLANK_SCRIPT;
      if (Array.isArray(data.script) && data.script.length > 0) {
        formattedLines = data.script.map((lineText: string) => {
          return autoHighlightKeywords(lineText, keywords);
        });
        setScriptLines(formattedLines);
      }

      // 5. Lưu phiên bản mới vào lịch sử
      const nextVerNum = (scriptVersions[0]?.versionNumber || scriptVersions.length) + 1;
      const newVersion: ScriptVersion = {
        id: "ver-" + Date.now(),
        versionNumber: nextVerNum,
        timestamp: Date.now(),
        label: `Bản ${nextVerNum} (Gốc)`,
        promptUsed: aiIdea.trim(),
        isRefined: false,
        data: {
          title: data.title || aiIdea.slice(0, 40),
          category: data.category || "Kiến thức bóng đá",
          conceptA: data.conceptA || "",
          conceptB: data.conceptB || "",
          iconA: data.iconA || "jersey-player",
          iconB: data.iconB || "jersey-fan",
          scriptLines: formattedLines,
          keywordsToHighlight: keywords,
        },
      };

      const updatedVersions = [newVersion, ...scriptVersions];
      saveVersions(updatedVersions);
      setActiveVersionId(newVersion.id);

      setAiSuccessMessage(
        `✨ AI đã hoàn thành kịch bản 12 câu cho chủ đề "${data.title || data.conceptA + " vs " + data.conceptB}" (Bản ${nextVerNum})!`
      );
      setLastAutoSavedTime("Đã nạp kịch bản AI: " + new Date().toLocaleTimeString("vi-VN"));
    } catch (err: unknown) {
      const error = err as Error;
      setAiError(error.message || "Lỗi tạo kịch bản AI");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // AI Script Refinement: Tinh chỉnh dựa trên kịch bản hiện tại và yêu cầu mới
  const handleAiRefineScript = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || refinePrompt).trim();
    if (!promptToUse) {
      setAiError("Vui lòng nhập yêu cầu tinh chỉnh hoặc bấm vào 1 gợi ý nhanh!");
      return;
    }

    const currentPlainTextLines = scriptLines.map((l) => l.tts.trim() || l.caption.replace(/<[^>]+>/g, "").trim());
    const hasExistingScript = currentPlainTextLines.some((l) => Boolean(l));

    if (!hasExistingScript) {
      setAiError("Chưa có kịch bản nào để tinh chỉnh. Vui lòng bấm 'Tạo kịch bản' trước!");
      return;
    }

    setIsAiRefining(true);
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: aiIdea.trim() || title,
          refinePrompt: promptToUse,
          currentScript: {
            title,
            category,
            conceptA,
            conceptB,
            iconA,
            iconB,
            script: currentPlainTextLines,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Không thể tinh chỉnh kịch bản");
      }

      const { data } = json;
      if (!data) throw new Error("Không nhận được dữ liệu kịch bản tinh chỉnh");

      if (data.conceptA) setConceptA(data.conceptA);
      if (data.conceptB) setConceptB(data.conceptB);
      if (data.iconA) setIconA(data.iconA);
      if (data.iconB) setIconB(data.iconB);
      if (data.title) {
        setTitle(data.title);
        setSlug(toSlug(data.title));
      }
      if (data.category) setCategory(data.category);

      const keywords = Array.isArray(data.keywordsToHighlight) ? data.keywordsToHighlight : [];
      let formattedLines: ScriptLine[] = BLANK_SCRIPT;
      if (Array.isArray(data.script) && data.script.length > 0) {
        formattedLines = data.script.map((lineText: string) => {
          return autoHighlightKeywords(lineText, keywords);
        });
        setScriptLines(formattedLines);
      }

      const nextVerNum = (scriptVersions[0]?.versionNumber || scriptVersions.length) + 1;
      const snippet = promptToUse.length > 22 ? promptToUse.slice(0, 20) + "..." : promptToUse;
      const newVersion: ScriptVersion = {
        id: "ver-" + Date.now(),
        versionNumber: nextVerNum,
        timestamp: Date.now(),
        label: `Bản ${nextVerNum} (${snippet})`,
        promptUsed: promptToUse,
        isRefined: true,
        data: {
          title: data.title || title,
          category: data.category || category,
          conceptA: data.conceptA || conceptA,
          conceptB: data.conceptB || conceptB,
          iconA: data.iconA || iconA,
          iconB: data.iconB || iconB,
          scriptLines: formattedLines,
          keywordsToHighlight: keywords,
        },
      };

      const updatedVersions = [newVersion, ...scriptVersions];
      saveVersions(updatedVersions);
      setActiveVersionId(newVersion.id);
      setRefinePrompt("");

      setAiSuccessMessage(
        `✨ Đã tinh chỉnh thành công Bản ${nextVerNum} theo yêu cầu: "${snippet}"!`
      );
      setLastAutoSavedTime("Đã tinh chỉnh Bản " + nextVerNum + ": " + new Date().toLocaleTimeString("vi-VN"));
    } catch (err: unknown) {
      const error = err as Error;
      setAiError(error.message || "Lỗi tinh chỉnh kịch bản");
    } finally {
      setIsAiRefining(false);
    }
  };

  // Áp dụng phiên bản được chọn từ lịch sử
  const handleApplyVersion = (ver: ScriptVersion) => {
    setActiveVersionId(ver.id);
    if (ver.data.title) {
      setTitle(ver.data.title);
      setSlug(toSlug(ver.data.title));
    }
    if (ver.data.category) setCategory(ver.data.category);
    if (ver.data.conceptA) setConceptA(ver.data.conceptA);
    if (ver.data.conceptB) setConceptB(ver.data.conceptB);
    if (ver.data.iconA) setIconA(ver.data.iconA);
    if (ver.data.iconB) setIconB(ver.data.iconB);
    if (Array.isArray(ver.data.scriptLines)) {
      setScriptLines(ver.data.scriptLines);
    }
    setAiSuccessMessage(`Đã chuyển sang ${ver.label}`);
  };

  // Chụp snapshot phiên bản hiện tại từ form thủ công
  const handleManualSaveVersion = () => {
    const nextVerNum = (scriptVersions[0]?.versionNumber || scriptVersions.length) + 1;
    const manualVer: ScriptVersion = {
      id: "ver-" + Date.now(),
      versionNumber: nextVerNum,
      timestamp: Date.now(),
      label: `Bản ${nextVerNum} (Lưu tay)`,
      promptUsed: "Chỉnh sửa thủ công trực tiếp trên form",
      isRefined: false,
      data: {
        title,
        category,
        conceptA,
        conceptB,
        iconA,
        iconB,
        scriptLines: [...scriptLines],
      },
    };
    const updated = [manualVer, ...scriptVersions];
    saveVersions(updated);
    setActiveVersionId(manualVer.id);
    setAiSuccessMessage(`Đã chụp snapshot lưu thành Bản ${nextVerNum}!`);
  };

  // Xóa 1 phiên bản
  const handleDeleteVersion = (e: React.MouseEvent, verId: string) => {
    e.stopPropagation();
    const updated = scriptVersions.filter((v) => v.id !== verId);
    saveVersions(updated);
    if (activeVersionId === verId) {
      setActiveVersionId(updated[0]?.id || null);
    }
  };

  // Xóa toàn bộ lịch sử phiên bản
  const handleClearAllVersions = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử các phiên bản kịch bản?")) {
      saveVersions([]);
      setActiveVersionId(null);
    }
  };

  // Sao chép toàn bộ kịch bản AI phiên hiện tại để mang sang ChatGPT / Gemini
  const handleCopyScript = (format: "text" | "json") => {
    const activeVer = scriptVersions.find((v) => v.id === activeVersionId);
    const dataToExport = activeVer
      ? activeVer.data
      : {
          title,
          category,
          conceptA,
          conceptB,
          iconA,
          iconB,
          scriptLines,
        };

    const textToCopy =
      format === "text"
        ? formatScriptForExternalAi(dataToExport)
        : formatScriptAsJson(dataToExport);

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2500);
      })
      .catch(() => {
        alert("Không thể tự động copy, vui lòng chọn và bôi đen nội dung để copy thủ công.");
      });
  };

  // 2. WYSIWYG: Apply visual keyword tag to selection
  const applyVisualTag = (colorType: "yellow" | "red" | "white" | "clean") => {
    if (activeLineIdx === null) return;
    const editor = visualEditorRefs.current[activeLineIdx];
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    if (colorType === "clean") {
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

    const updatedRaw = visualToRawHtml(editor.innerHTML);
    updateLine(activeLineIdx, "caption", updatedRaw);
    updateLine(activeLineIdx, "tts", stripHtml(updatedRaw));
  };

  const insertEmotionTag = (tag: string) => {
    const targetIdx = activeLineIdx !== null ? activeLineIdx : scriptLines.length - 1;
    if (targetIdx < 0 || targetIdx >= scriptLines.length) return;

    const line = scriptLines[targetIdx];
    const editor = visualEditorRefs.current[targetIdx];

    if (editor) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(` ${tag} `);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        const updatedRaw = visualToRawHtml(editor.innerHTML);
        updateLine(targetIdx, "caption", updatedRaw);
        updateLine(targetIdx, "tts", stripHtml(updatedRaw));
        return;
      }
    }

    const currentCaption = line.caption || "";
    const updatedCaption = currentCaption ? `${currentCaption} ${tag}` : tag;
    updateLine(targetIdx, "caption", updatedCaption);
    updateLine(targetIdx, "tts", stripHtml(updatedCaption));
  };

  const updateLine = (index: number, field: "tts" | "caption", value: string) => {
    const updated = [...scriptLines];
    updated[index] = { ...updated[index], [field]: value };
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

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    }

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
                try {
                  localStorage.removeItem(STORAGE_KEY);
                } catch {}
                setSavedDraft(null);

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

  return (
    <div className="min-h-screen flex flex-col pitch-stripes">
      {/* ================= HEADER NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-[#081C15]/90 backdrop-blur-md border-b border-[#EBF8F2]/15 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#143D2E] to-[#10B981] flex items-center justify-center border border-[#FFD200]/40 shadow-lg shadow-[#10B981]/15 group-hover:scale-105 transition-transform">
              <span className="text-xl">⚽</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-wider text-[#FFD200] uppercase font-sans">
                  Phía Sau Sân Cỏ
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FF334B] text-white rounded-full">
                  Xưởng Sản Xuất
                </span>
              </div>
              <p className="text-xs text-[#EBF8F2]/60">
                Data-Driven Video Engine • Facebook Reels & TikTok Shorts
              </p>
            </div>
          </Link>

          {/* View Switcher Tabs */}
          <nav className="hidden md:flex items-center bg-[#05130E] p-1 rounded-xl border border-[#EBF8F2]/15 space-x-1">
            <Link
              href="/"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all text-[#EBF8F2]/70 hover:text-white hover:bg-white/5"
            >
              <Film className="w-4 h-4" />
              <span>Thư viện Video</span>
            </Link>

            <div className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all bg-[#143D2E] text-[#FFD200] shadow border border-[#FFD200]/30">
              <Sparkles className="w-4 h-4 text-[#FFD200]" />
              <span>Xưởng Sản Xuất (Studio)</span>
            </div>
          </nav>
        </div>

        {/* Right Action Icons & Auto-save badge */}
        <div className="flex items-center space-x-3">
          {lastAutoSavedTime && (
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#143D2E]/80 border border-[#10B981]/30 text-[11px] text-[#10B981]">
              <Check className="w-3.5 h-3.5" />
              <span>Đã lưu nháp: {lastAutoSavedTime}</span>
            </div>
          )}

          <button
            onClick={handleCreateNewVideo}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] hover:brightness-110 text-[#081C15] font-black text-xs uppercase tracking-wider shadow-md shadow-[#10B981]/20 transition cursor-pointer"
            title="Làm sạch toàn bộ form để tạo video mới"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Tạo Video Mới</span>
          </button>

          <button
            onClick={handleResetDraft}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0E291E] hover:bg-red-950/60 text-[#EBF8F2]/70 hover:text-red-300 border border-[#EBF8F2]/20 hover:border-red-500/40 text-xs font-semibold transition cursor-pointer"
            title="Khôi phục lại form mẫu ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Khôi phục mẫu</span>
          </button>

          <Link
            href="/"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#143D2E] hover:bg-[#10B981]/30 text-xs font-bold text-[#EBF8F2] border border-[#EBF8F2]/20 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Thư Viện</span>
          </Link>
        </div>
      </header>

      {/* ================= MAIN STUDIO CONTENT ================= */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: FORM BUILDER (7 Cols) ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Thanh thông báo bản nháp cũ chưa hoàn thành (nếu có) */}
          {savedDraft && (
            <div className="bg-gradient-to-r from-[#143D2E] via-[#0E291E] to-[#081C15] border border-[#FFD200]/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center space-x-3 text-xs text-[#EBF8F2]">
                <div className="w-8 h-8 rounded-lg bg-[#FFD200]/20 flex items-center justify-center text-[#FFD200] shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#FFD200]">
                    Tìm thấy bản nháp đang soạn dở: &quot;{savedDraft.title || "Video chưa đặt tên"}&quot;
                  </p>
                  <p className="text-[#EBF8F2]/60 text-[11px]">
                    Lưu lúc {savedDraft.lastSaved ? new Date(savedDraft.lastSaved).toLocaleTimeString("vi-VN") : "trước đó"}. Bạn có muốn tiếp tục làm việc với bản nháp này không?
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase tracking-wider hover:brightness-110 shadow transition cursor-pointer"
                >
                  Khôi phục nháp
                </button>
                <button
                  type="button"
                  onClick={handleDismissDraft}
                  className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-red-950/60 text-[#EBF8F2]/60 hover:text-red-300 border border-[#EBF8F2]/10 hover:border-red-500/30 text-xs font-semibold transition cursor-pointer"
                >
                  Bỏ qua & Xóa
                </button>
              </div>
            </div>
          )}

          {/* Card 1: Channel & Topic Settings */}
          <div className="bg-[#0E291E]/80 backdrop-blur-md border border-[#EBF8F2]/15 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#EBF8F2]/10 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#FFD200]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#FFD200]">
                  1. Cấu hình chủ đề & Kênh
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#EBF8F2]/50 bg-[#081C15] px-2 py-0.5 rounded border border-[#EBF8F2]/10">
                slug: {slug || "auto"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#EBF8F2]/70 mb-1">
                  Tên Video / Tiêu đề so sánh
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Messi vs Ronaldo hoặc Áo Player vs Fan..."
                  className="w-full bg-[#081C15] border border-[#EBF8F2]/20 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#EBF8F2] focus:border-[#FFD200] outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#EBF8F2]/70 mb-1">
                  Tên Kênh hiển thị (#eyebrow)
                </label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="Phía sau sân cỏ"
                  className="w-full bg-[#081C15] border border-[#EBF8F2]/20 rounded-xl px-4 py-2.5 text-sm text-[#EBF8F2] focus:border-[#FFD200] outline-none font-bold"
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
                  {category && !CATEGORIES.includes(category) && (
                    <option value={category}>✨ {category} (AI đề xuất)</option>
                  )}
                  {CATEGORIES.map((cat) => (
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
                  placeholder="Ví dụ: messi-vs-ronaldo..."
                  className="w-full bg-[#081C15] border border-[#EBF8F2]/20 rounded-xl px-4 py-2.5 text-sm text-[#EBF8F2] focus:border-[#FFD200] outline-none font-mono"
                />
              </div>

              {/* AI Voice Selector */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#EBF8F2]/70 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <span>Giọng đọc AI (Voice)</span>
                    {provider === "vieneu" ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${serverOnline ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}>
                        {serverOnline ? `⚡ CIT Voice Studio Online (48kHz - ${serverEngine})` : "⚡ CIT Voice Studio (Local 127.0.0.1:8001)"}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-500/30">
                        ☁️ Edge TTS Cloud
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-[#FFD200] font-bold">
                    {provider === "vieneu" ? (serverOnline ? "Đã kết nối Server" : "Chưa bật ứng dụng") : "Microsoft Edge Online"}
                  </span>
                </label>
                <select
                  value={`${provider}:${voice}`}
                  onChange={(e) => {
                    const selected = voiceList.find((v) => v.id === e.target.value);
                    if (selected) {
                      setProvider(selected.provider);
                      setVoice(selected.voice);
                    }
                  }}
                  className="w-full bg-[#081C15] border border-[#EBF8F2]/20 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#EBF8F2] focus:border-[#FFD200] outline-none"
                >
                  <optgroup label="⚡ VieNeu TTS (CIT Voice Studio - Giọng Đọc Chính)">
                    {voiceList.filter((v) => v.provider === "vieneu").map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="☁️ Edge TTS (Dự Phòng Qua Mạng)">
                    {voiceList.filter((v) => v.provider === "edge").map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          {/* ── AI Auto-Fill & Refinement Assistant Card ── */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#103E2E]/90 via-[#0B2A1F]/90 to-[#081C15]/95 backdrop-blur-md border-2 border-[#10B981]/50 rounded-2xl p-5 shadow-2xl transition-all space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EBF8F2]/10 gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#FFD200] flex items-center justify-center text-[#081C15] shadow-md shadow-[#10B981]/25 shrink-0">
                  <Sparkles className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-[#FFD200] flex items-center gap-2">
                    <span>Trợ lý AI — Viết & Tinh chỉnh kịch bản 12 câu</span>
                    <span className="text-[10px] font-bold uppercase bg-[#FFD200]/20 text-[#FFD200] px-2 py-0.5 rounded-full border border-[#FFD200]/30">
                      Auto-Fill & Refine ⚡
                    </span>
                  </h2>
                  <p className="text-[11px] text-[#EBF8F2]/70 font-medium">
                    Tạo kịch bản mới, tinh chỉnh kịch bản cũ theo ý muốn, và quản lý lịch sử các phiên bản mà không lo mất nội dung.
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center space-x-2 shrink-0">
                {scriptVersions.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleManualSaveVersion}
                      title="Lưu kịch bản đang hiển thị thành một phiên bản snapshot mới"
                      className="px-2.5 py-1.5 rounded-lg bg-[#143D2E] hover:bg-[#1A4D3B] text-[#FFD200] border border-[#FFD200]/30 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>📸 Lưu bản này</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllVersions}
                      title="Xóa toàn bộ lịch sử các phiên bản"
                      className="px-2 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Xóa lịch sử</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Error & Success Feedback */}
            {aiError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {aiSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{aiSuccessMessage}</span>
              </div>
            )}

            {/* ── Version History Switcher Bar (Khi đã có ít nhất 1 phiên bản) ── */}
            {scriptVersions.length > 0 && (
              <div className="p-3 rounded-xl bg-[#081C15]/85 border border-[#10B981]/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#FFD200] px-1">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>LỊCH SỬ CÁC PHIÊN BẢN ({scriptVersions.length}):</span>
                    <span className="text-[10px] text-[#EBF8F2]/60 font-normal">
                      (Bấm vào bản bất kỳ để khôi phục hoặc tinh chỉnh tiếp)
                    </span>
                  </span>
                  <span className="text-[10px] text-[#10B981] font-mono">
                    Đang chọn: {scriptVersions.find((v) => v.id === activeVersionId)?.label || "Bản hiện tại"}
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                  {scriptVersions.map((ver) => {
                    const isActive = ver.id === activeVersionId;
                    return (
                      <div
                        key={ver.id}
                        onClick={() => handleApplyVersion(ver)}
                        title={`Yêu cầu: "${ver.promptUsed}"\nTạo lúc: ${new Date(ver.timestamp).toLocaleTimeString("vi-VN")}`}
                        className={`group relative flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer shrink-0 select-none ${
                          isActive
                            ? "bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] border-[#FFD200] shadow-md shadow-[#10B981]/25 ring-2 ring-[#FFD200]/30"
                            : "bg-[#0E291E]/90 hover:bg-[#143D2E] text-[#EBF8F2]/90 border-[#EBF8F2]/15 hover:border-[#10B981]/50"
                        }`}
                      >
                        {isActive ? (
                          <Check className="w-3.5 h-3.5 text-[#081C15] stroke-[3]" />
                        ) : (
                          <Layers className="w-3.5 h-3.5 text-[#10B981]" />
                        )}
                        <span className="truncate max-w-[170px]">{ver.label}</span>
                        <span className={`text-[9px] font-mono px-1 rounded ${isActive ? "bg-[#081C15]/20 text-[#081C15]" : "text-[#EBF8F2]/50"}`}>
                          {new Date(ver.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>

                        {/* Nút xóa phiên bản */}
                        {scriptVersions.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteVersion(e, ver.id)}
                            title="Xóa phiên bản này"
                            className={`p-0.5 rounded opacity-40 hover:opacity-100 transition ${
                              isActive ? "hover:bg-red-500/20 text-[#081C15]" : "hover:bg-red-500/30 text-red-400"
                            }`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Bảng hiển thị toàn bộ kịch bản AI phiên trước (Dễ dàng Copy sang ChatGPT / Gemini) ── */}
            {(scriptVersions.length > 0 || scriptLines.some((l) => l.tts.trim() || l.caption.trim())) && (
              <div className="p-3.5 rounded-xl bg-[#061811]/90 border border-[#10B981]/30 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#FFD200]" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#FFD200]">
                      Toàn bộ kịch bản AI ({scriptVersions.find((v) => v.id === activeVersionId)?.label || "Bản hiện tại"})
                    </span>
                    <span className="text-[10px] text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded font-bold border border-[#10B981]/30">
                      Sẵn sàng Copy 📋
                    </span>
                  </div>

                  {/* Copy Action Buttons */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyScript("text")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        copiedFormat === "text"
                          ? "bg-emerald-500 text-[#081C15] shadow-md shadow-emerald-500/30"
                          : "bg-[#143D2E] hover:bg-[#1A4D3B] text-[#FFD200] border border-[#FFD200]/30"
                      }`}
                    >
                      {copiedFormat === "text" ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Đã Copy Văn Bản!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>📋 Copy toàn bộ kịch bản</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyScript("json")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                        copiedFormat === "json"
                          ? "bg-emerald-500 text-[#081C15]"
                          : "bg-[#081C15] hover:bg-[#103E2E] text-[#EBF8F2]/80 border border-[#EBF8F2]/15"
                      }`}
                      title="Copy dưới dạng mã JSON cấu trúc chuẩn"
                    >
                      {copiedFormat === "json" ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Đã Copy JSON!</span>
                        </>
                      ) : (
                        <>
                          <Code className="w-3 h-3" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAiResponseBox((prev) => !prev)}
                      className="p-1 rounded text-[#EBF8F2]/60 hover:text-[#FFD200] transition"
                      title={showAiResponseBox ? "Thu gọn bảng kịch bản" : "Mở rộng bảng kịch bản"}
                    >
                      {showAiResponseBox ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Preformatted Script Preview Box */}
                {showAiResponseBox && (
                  <div className="space-y-2">
                    <div className="p-3 bg-[#030D09]/95 border border-[#10B981]/20 rounded-xl max-h-52 overflow-y-auto font-mono text-[11px] text-[#EBF8F2]/90 space-y-1.5 scrollbar-thin">
                      <div className="text-[#FFD200] font-bold border-b border-[#EBF8F2]/10 pb-1 flex justify-between items-center">
                        <span>
                          [{category}] {title || "Chưa có tiêu đề"}
                        </span>
                        <span className="text-[10px] text-[#10B981] font-mono">
                          {conceptA || "VẾ A"} ({getDisplayEmoji(iconA)}) vs {conceptB || "VẾ B"} ({getDisplayEmoji(iconB)})
                        </span>
                      </div>
                      <div className="space-y-1 pt-1">
                        {scriptLines.map((line, idx) => {
                          const plain = line.tts || line.caption.replace(/<[^>]+>/g, "").trim();
                          if (!plain) return null;
                          return (
                            <div key={idx} className="flex gap-2 leading-relaxed">
                              <span className="text-[#10B981] font-bold shrink-0 select-none w-14">
                                Câu {idx + 1}:
                              </span>
                              <span className="text-[#EBF8F2]/90">{plain}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#EBF8F2]/60 px-1">
                      <span>
                        💡 <strong className="text-[#10B981]">Mẹo:</strong> Bấm nút <strong>&quot;Copy toàn bộ kịch bản&quot;</strong>, dán sang ChatGPT hoặc Gemini trên web để thoải mái thảo luận hoặc tinh chỉnh, rồi copy kết quả dán vào ô bên dưới!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Refinement Area: Tinh chỉnh dựa trên kịch bản đang chọn ── */}
            {(scriptVersions.length > 0 || scriptLines.some((l) => l.tts.trim() || l.caption.trim())) && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#0B2A1F]/90 to-[#081C15]/95 border border-[#10B981]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wand2 className="w-4 h-4 text-[#FFD200]" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#FFD200]">
                      🪄 AI Tinh chỉnh kịch bản theo yêu cầu
                    </span>
                    <span className="text-[10px] text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded font-bold border border-[#10B981]/30">
                      Dựa trên {scriptVersions.find((v) => v.id === activeVersionId)?.label || "Kịch bản hiện tại"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#EBF8F2]/60 hidden sm:inline">
                    Phím tắt: Ctrl + Enter để tinh chỉnh nhanh
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleAiRefineScript();
                      }
                    }}
                    placeholder="Nhập yêu cầu bạn muốn AI sửa đổi hoặc dán nội dung/kịch bản đã tinh chỉnh từ ChatGPT / Gemini vào đây (Ví dụ: Thay câu kết kích thích tranh luận hơn, bổ sung số bàn thắng C1 cho Ronaldo, hoặc viết theo phong cách kịch tính gay gắt hơn...)"
                    className="w-full bg-[#081C15]/90 border border-[#10B981]/30 rounded-xl px-4 py-2.5 text-sm text-[#EBF8F2] placeholder-[#EBF8F2]/40 focus:border-[#FFD200] focus:ring-1 focus:ring-[#FFD200] outline-none transition resize-none font-medium"
                  />
                </div>

                {/* Nút gửi tinh chỉnh */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={isAiRefining || isAiGenerating || !refinePrompt.trim()}
                    onClick={() => handleAiRefineScript()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] hover:brightness-110 text-[#081C15] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#10B981]/20 flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed transition transform active:scale-95 cursor-pointer"
                  >
                    {isAiRefining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#081C15]" />
                        <span>Đang tinh chỉnh & tạo bản mới...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 text-[#081C15]" />
                        <span>✨ Tinh chỉnh & Lưu thành Bản mới</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Initial Script Generation Area ── */}
            <div className="p-4 rounded-xl bg-[#081C15]/70 border border-[#EBF8F2]/15 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#FFD200] flex items-center gap-1.5">
                  <Sparkle className="w-3.5 h-3.5 text-[#FFD200]" />
                  <span>
                    {scriptVersions.length > 0 ? "Hoặc nhập ý tưởng đề tài mới hoàn toàn:" : "1. Nhập ý tưởng đề tài so sánh:"}
                  </span>
                </label>
                <span className="text-[10px] text-[#EBF8F2]/50">
                  Phím tắt: Ctrl + Enter
                </span>
              </div>

              <div>
                <textarea
                  rows={2}
                  value={aiIdea}
                  onChange={(e) => setAiIdea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleAiGenerateScript();
                    }
                  }}
                  placeholder="Ví dụ: So sánh mức lương và thu nhập giữa Messi và Ronaldo... Hoặc: Haaland vs Mbappe ai toàn diện hơn?"
                  className="w-full bg-[#0E291E]/80 border border-[#EBF8F2]/20 rounded-xl px-4 py-2.5 text-sm text-[#EBF8F2] placeholder-[#EBF8F2]/40 focus:border-[#FFD200] focus:ring-1 focus:ring-[#FFD200] outline-none transition resize-none font-medium"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isAiGenerating || isAiRefining || !aiIdea.trim()}
                  onClick={handleAiGenerateScript}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] hover:brightness-110 text-[#081C15] font-black text-xs uppercase tracking-wider shadow-lg shadow-[#10B981]/20 flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed transition transform active:scale-95 cursor-pointer"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#081C15]" />
                      <span>Đang biên kịch 12 câu...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 text-[#081C15]" />
                      <span>
                        {scriptVersions.length > 0 ? "✨ AI Viết Kịch Bản Cho Đề Tài Mới" : "✨ AI Tự Động Viết Kịch Bản"}
                      </span>
                    </>
                  )}
                </button>
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

            {isAiGenerating ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                <div className="p-4 rounded-xl bg-[#081C15]/90 border-2 border-[#FFD200]/40 space-y-3">
                  <div className="h-4 bg-[#FFD200]/30 rounded w-24" />
                  <div className="h-9 bg-[#143D2E] rounded w-full" />
                  <div className="h-8 bg-[#143D2E]/60 rounded w-full" />
                </div>
                <div className="p-4 rounded-xl bg-[#081C15]/90 border-2 border-[#EBF8F2]/40 space-y-3">
                  <div className="h-4 bg-[#EBF8F2]/30 rounded w-24" />
                  <div className="h-9 bg-[#143D2E] rounded w-full" />
                  <div className="h-8 bg-[#143D2E]/60 rounded w-full" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Concept A Left */}
                <div className="p-4 rounded-xl bg-[#081C15]/80 border-2 border-[#FFD200]/40 relative overflow-hidden flex flex-col justify-between">
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
                        placeholder="Ví dụ: LIONEL MESSI..."
                        className="w-full bg-[#143D2E] border border-[#EBF8F2]/20 rounded-lg px-3 py-2 text-sm font-black text-[#FFD200] focus:border-[#FFD200] outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-[#EBF8F2]/70">
                          Icon / Emoji đại diện
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const suggested = suggestIconForConcept(conceptA);
                            setIconA(suggested);
                          }}
                          className="text-[10px] text-[#FFD200] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                          title="Tự động gợi ý Icon theo tên Concept A"
                        >
                          <Sparkles className="w-3 h-3 text-[#FFD200]" />
                          <span>⚡ AI gợi ý icon</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div
                          className="w-10 h-10 rounded-lg bg-[#143D2E] border border-[#FFD200]/40 flex items-center justify-center text-xl shrink-0 shadow-inner select-none"
                          title={`Xem trước Icon A: ${iconA}`}
                        >
                          {getDisplayEmoji(iconA)}
                        </div>
                        <input
                          type="text"
                          value={iconA}
                          onChange={(e) => setIconA(e.target.value)}
                          placeholder="Emoji (🐐, ⚡, ⚽) hoặc URL..."
                          className="flex-1 bg-[#143D2E] border border-[#EBF8F2]/20 rounded-lg px-3 py-2 text-xs font-semibold text-[#EBF8F2] focus:border-[#FFD200] outline-none"
                        />
                      </div>

                      {/* Quick Emoji Pills */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {POPULAR_ICONS.slice(0, 7).map((ico) => (
                          <button
                            key={ico.value}
                            type="button"
                            onClick={() => setIconA(ico.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] transition cursor-pointer ${
                              iconA === ico.value
                                ? "bg-[#FFD200] text-[#081C15] font-bold"
                                : "bg-[#143D2E]/60 text-[#EBF8F2]/70 hover:bg-[#143D2E] hover:text-[#FFD200]"
                            }`}
                            title={ico.label}
                          >
                            {getDisplayEmoji(ico.value)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Concept B Right */}
                <div className="p-4 rounded-xl bg-[#081C15]/80 border-2 border-[#EBF8F2]/40 relative overflow-hidden flex flex-col justify-between">
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
                        placeholder="Ví dụ: CRISTIANO RONALDO..."
                        className="w-full bg-[#143D2E] border border-[#EBF8F2]/20 rounded-lg px-3 py-2 text-sm font-black text-[#EBF8F2] focus:border-[#EBF8F2] outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-[#EBF8F2]/70">
                          Icon / Emoji đại diện
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const suggested = suggestIconForConcept(conceptB);
                            setIconB(suggested);
                          }}
                          className="text-[10px] text-[#FFD200] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                          title="Tự động gợi ý Icon theo tên Concept B"
                        >
                          <Sparkles className="w-3 h-3 text-[#FFD200]" />
                          <span>⚡ AI gợi ý icon</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div
                          className="w-10 h-10 rounded-lg bg-[#143D2E] border border-[#EBF8F2]/40 flex items-center justify-center text-xl shrink-0 shadow-inner select-none"
                          title={`Xem trước Icon B: ${iconB}`}
                        >
                          {getDisplayEmoji(iconB)}
                        </div>
                        <input
                          type="text"
                          value={iconB}
                          onChange={(e) => setIconB(e.target.value)}
                          placeholder="Emoji (⚡, 🤖, 🏆) hoặc URL..."
                          className="flex-1 bg-[#143D2E] border border-[#EBF8F2]/20 rounded-lg px-3 py-2 text-xs font-semibold text-[#EBF8F2] focus:border-[#EBF8F2] outline-none"
                        />
                      </div>

                      {/* Quick Emoji Pills */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {POPULAR_ICONS.slice(0, 7).map((ico) => (
                          <button
                            key={ico.value}
                            type="button"
                            onClick={() => setIconB(ico.value)}
                            className={`px-1.5 py-0.5 rounded text-[11px] transition cursor-pointer ${
                              iconB === ico.value
                                ? "bg-[#FFD200] text-[#081C15] font-bold"
                                : "bg-[#143D2E]/60 text-[#EBF8F2]/70 hover:bg-[#143D2E] hover:text-[#FFD200]"
                            }`}
                            title={ico.label}
                          >
                            {getDisplayEmoji(ico.value)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1.5 bg-[#081C15] p-1.5 rounded-xl border border-[#EBF8F2]/20">
                  <span className="text-[10px] font-bold uppercase text-[#EBF8F2]/60 px-1.5">
                    Tô màu:
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyVisualTag("yellow");
                    }}
                    className="px-2.5 py-1 rounded bg-[#FFD200]/20 hover:bg-[#FFD200]/30 text-[#FFD200] text-xs font-bold border border-[#FFD200]/40 transition"
                    title="Tô màu Vàng"
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
                    title="Tô màu Đỏ"
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
                    title="Tô màu Trắng"
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

                {/* CIT Voice Studio Emotion Tags & Pause Toolbar */}
                <div className="flex items-center space-x-1 bg-[#081C15] p-1.5 rounded-xl border border-[#10B981]/30">
                  <span className="text-[10px] font-bold uppercase text-[#10B981] px-1.5 hidden sm:inline">
                    🎙️ AI Voice:
                  </span>
                  <button
                    type="button"
                    onClick={() => insertEmotionTag("[cười]")}
                    className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition"
                    title="Chèn âm cười tự nhiên (VieNeu Turbo)"
                  >
                    😄 [cười]
                  </button>
                  <button
                    type="button"
                    onClick={() => insertEmotionTag("[thở dài]")}
                    className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition"
                    title="Chèn thở dài truyền cảm (VieNeu Turbo)"
                  >
                    😮‍💨 [thở dài]
                  </button>
                  <button
                    type="button"
                    onClick={() => insertEmotionTag("[hắng giọng]")}
                    className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition"
                    title="Chèn hắng giọng ngắt nhịp (VieNeu Turbo)"
                  >
                    🗣️ [hắng giọng]
                  </button>
                  <button
                    type="button"
                    onClick={() => insertEmotionTag("[nghỉ 1s]")}
                    className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 text-xs font-semibold border border-amber-500/30 transition"
                    title="Chèn khoảng lặng đúng 1 giây"
                  >
                    ⏸️ [nghỉ 1s]
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#EBF8F2]/60 mb-4">
              ✨ <b>Soạn thảo trực quan:</b> Bôi đen từ khóa để tô màu chữ trên video. Bấm nút <b>[cười]</b>, <b>[thở dài]</b> hoặc <b>[nghỉ 1s]</b> để chèn biểu cảm và khoảng lặng cho giọng đọc CIT Voice Studio.
            </p>

            {/* List of lines */}
            <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-2">
              {isAiGenerating ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#081C15]/70 border border-[#EBF8F2]/10 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded-full bg-[#10B981]/30" />
                          <div className="h-4 bg-[#EBF8F2]/20 rounded w-28" />
                        </div>
                        <div className="h-3 bg-[#EBF8F2]/10 rounded w-16" />
                      </div>
                      <div className="h-8 bg-[#143D2E]/80 rounded-lg w-full" />
                      <div className="h-4 bg-[#05130E] rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                scriptLines.map((line, idx) => {
                  const isRaw = !!showRawCodeMap[idx];
                  return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all ${
                      activeLineIdx === idx
                        ? "bg-[#143D2E]/90 border-[#FFD200] shadow-md shadow-[#FFD200]/10"
                        : "bg-[#081C15]/70 border-[#EBF8F2]/10 hover:border-[#EBF8F2]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center font-bold text-xs font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#EBF8F2]/80 uppercase">
                          {idx === 0
                            ? "Hook mở đầu (Gây tò mò)"
                            : idx === scriptLines.length - 1
                            ? "CTA chốt hạ (Kêu gọi bình luận)"
                            : `Luận điểm so sánh #${idx}`}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() =>
                            setShowRawCodeMap((prev) => ({ ...prev, [idx]: !prev[idx] }))
                          }
                          className="text-[11px] text-[#FFD200]/70 hover:text-[#FFD200] flex items-center space-x-1"
                        >
                          <Code className="w-3 h-3" />
                          <span>{isRaw ? "Giao diện trực quan" : "Mã HTML gốc"}</span>
                        </button>

                        {scriptLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-[#FF334B]/60 hover:text-[#FF334B] p-1"
                            title="Xóa câu này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {isRaw ? (
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

                      {/* Screen preview */}
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
              })
            )}
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

          {/* Action Buttons: Preview Audio + Generate Video */}
          <div className="space-y-4">
            {isGenerating ? (
              <div className="relative w-full overflow-hidden rounded-2xl bg-[#081C15] border-2 border-[#10B981] shadow-2xl p-4">
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

                  <div className="w-full bg-[#05130E] h-2.5 rounded-full overflow-hidden border border-[#EBF8F2]/10 mt-1">
                    <div
                      className="bg-gradient-to-r from-[#10B981] to-[#FFD200] h-full rounded-full transition-all duration-300 shadow-md"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
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
              <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                  <div>
                    <div className="font-bold">Đã render thành công 100%!</div>
                    <div className="text-xs opacity-80">Video đã sẵn sàng bên cột phải hoặc trong Thư viện.</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCreateNewVideo}
                    className="px-3.5 py-1.5 rounded-lg bg-[#143D2E] hover:bg-[#10B981]/30 text-[#FFD200] font-black text-xs uppercase border border-[#FFD200]/30 transition cursor-pointer"
                  >
                    + Tạo video tiếp theo
                  </button>
                  <Link
                    href="/"
                    className="px-3.5 py-1.5 rounded-lg bg-[#FFD200] text-[#081C15] font-black text-xs uppercase hover:brightness-110 transition"
                  >
                    Xem Thư viện
                  </Link>
                </div>
              </div>
            )}

            {/* Collapsible Console Log */}
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
                  Bấm &quot;BẮT ĐẦU SẢN XUẤT VIDEO&quot; ở bên trái để xem kết quả tại đây.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cinema Modal Video Player */}
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

export default function CreateVideoPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold text-[#FFD200]">Đang nạp Studio Tạo Video...</div>}>
      <CreateStudioInner />
    </Suspense>
  );
}
