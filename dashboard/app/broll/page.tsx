"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Sparkles,
  Film,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Volume2,
  Pause,
  Wand2,
  Loader2,
  FolderOpen,
  Upload,
  Type,
  Music,
  Video,
  Edit3,
  Check,
  HardDrive,
  Zap,
  Scissors,
} from "lucide-react";
import CreateVideoDropdown from "@/components/CreateVideoDropdown";
import TtsEmotionToolbar from "@/components/TtsEmotionToolbar";

/**
 * 25 Giọng chuẩn của Model VieNeu-TTS v3 Turbo (48 kHz)
 * Trích xuất từ cit-voice-studio.md
 */
const ALL_25_VIENEU_VOICES = [
  { id: "Hải Đăng", name: "Hải Đăng", gender: "male", region: "Bắc", style: "Tự nhiên", badge: "Mặc định ⭐", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Adam bựa", name: "Adam bựa", gender: "male", region: "Bắc", style: "Tự nhiên / Hài hước", badge: "Hài hước ⭐", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Trúc Ly", name: "Trúc Ly", gender: "female", region: "Bắc", style: "Tự nhiên / Truyền cảm", badge: "Nữ Bắc ⭐", description: "Nữ · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Thiện Minh", name: "Thiện Minh", gender: "male", region: "Bắc", style: "Kể chuyện / Phân tích", badge: "Kể chuyện ⭐", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz" },
  { id: "Mai Anh", name: "Mai Anh", gender: "female", region: "Bắc", style: "Tin tức", badge: "Tin tức", description: "Nữ · Bắc · Phong cách tin tức · 48 kHz" },
  { id: "Thùy Dung", name: "Thùy Dung", gender: "female", region: "Nam", style: "Tin tức", badge: "Nữ Nam ⭐", description: "Nữ · Nam · Phong cách tin tức · 48 kHz" },
  { id: "Thiền Tâm Đức", name: "Thiền Tâm Đức", gender: "male", region: "Bắc", style: "Kể chuyện", badge: "Trầm ấm", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz" },
  { id: "Ngọc Huyền", name: "Ngọc Huyền", gender: "female", region: "Bắc", style: "Tự nhiên", badge: "Tự nhiên", description: "Nữ · Bắc · Giọng đọc tự nhiên · 48 kHz" },
  { id: "Quang Sơn", name: "Quang Sơn", gender: "male", region: "Trung", style: "Tự nhiên", badge: "Miền Trung ⭐", description: "Nam · Trung · Phong cách tự nhiên · 48 kHz" },
  { id: "Ngọc Trân", name: "Ngọc Trân", gender: "female", region: "Trung", style: "Tự nhiên", badge: "Nữ Trung ⭐", description: "Nữ · Trung · Phong cách tự nhiên · 48 kHz" },
  { id: "Minh Đức", name: "Minh Đức", gender: "male", region: "Bắc", style: "Tin tức", badge: "Tin tức", description: "Nam · Bắc · Phong cách tin tức · 48 kHz" },
  { id: "Phạm Tuyên", name: "Phạm Tuyên", gender: "male", region: "Bắc", style: "Tự nhiên", badge: "Tự nhiên", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Thái Sơn", name: "Thái Sơn", gender: "male", region: "Nam", style: "Kể chuyện", badge: "Nam miền Nam ⭐", description: "Nam · Nam · Phong cách kể chuyện · 48 kHz" },
  { id: "Xuân Vĩnh", name: "Xuân Vĩnh", gender: "male", region: "Bắc", style: "Tự nhiên", badge: "Tự nhiên", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Thanh Bình", name: "Thanh Bình", gender: "male", region: "Bắc", style: "Kể chuyện", badge: "Kể chuyện", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz" },
  { id: "Ngọc Linh", name: "Ngọc Linh", gender: "female", region: "Bắc", style: "Kể chuyện", badge: "Kể chuyện", description: "Nữ · Bắc · Phong cách kể chuyện · 48 kHz" },
  { id: "Đoan Trang", name: "Đoan Trang", gender: "female", region: "Bắc", style: "Tự nhiên", badge: "Tự nhiên", description: "Nữ · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Thục Đoan", name: "Thục Đoan", gender: "female", region: "Nam", style: "Kể chuyện", badge: "Kể chuyện", description: "Nữ · Nam · Phong cách kể chuyện · 48 kHz" },
  { id: "Minh Triết", name: "Minh Triết", gender: "male", region: "Nam", style: "Tin tức", badge: "Tin tức", description: "Nam · Nam · Phong cách tin tức · 48 kHz" },
  { id: "Mỹ Duyên", name: "Mỹ Duyên", gender: "female", region: "Nam", style: "Đọc truyện", badge: "Đọc truyện", description: "Nữ · Nam · Phong cách đọc truyện · 48 kHz" },
  { id: "Quỳnh Anh", name: "Quỳnh Anh", gender: "female", region: "Bắc", style: "Đọc truyện", badge: "Đọc truyện", description: "Nữ · Bắc · Phong cách đọc truyện · 48 kHz" },
  { id: "Đức Trí", name: "Đức Trí", gender: "male", region: "Nam", style: "Đọc truyện", badge: "Đọc truyện", description: "Nam · Nam · Phong cách đọc truyện · 48 kHz" },
  { id: "Kim Thanh", name: "Kim Thanh", gender: "female", region: "Nam", style: "Đọc truyện", badge: "Đọc truyện", description: "Nữ · Nam · Phong cách đọc truyện · 48 kHz" },
  { id: "Adam", name: "Adam", gender: "male", region: "Nam", style: "Tự nhiên", badge: "Tự nhiên", description: "Nam · Nam · Giọng đọc tự nhiên · 48 kHz" },
  { id: "Quốc Tuấn", name: "Quốc Tuấn", gender: "male", region: "Bắc", style: "Tự nhiên", badge: "Tự nhiên", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz" },
];

const EDGE_VOICES = [
  { id: "vi-VN-NamMinhNeural", name: "Nam Minh (Edge Cloud)", gender: "male", region: "Bắc", style: "Cloud", badge: "Edge TTS", description: "Nam · Bắc · Cloud Edge TTS" },
  { id: "vi-VN-HoaiMyNeural", name: "Hoài My (Edge Cloud)", gender: "female", region: "Bắc", style: "Cloud", badge: "Edge TTS", description: "Nữ · Bắc · Cloud Edge TTS" },
];

export interface ScriptSection {
  section: string;      // e.g. "HOOK (0 - 4s)"
  tagline: string;      // e.g. "(Đòn bẩy tâm lý)"
  timing?: string;      // Tuỳ chọn
  textTo: string;       // Text to hiển thị trên màn hình
  visual: string;       // Gợi ý hình ảnh / cảnh quay b-roll
  voiceover: string;    // Giọng đọc AI chi tiết
  audioEffect: string;  // Âm thanh & Hiệu ứng SFX/BGM
}

interface StockFileItem {
  name: string;
  path: string;
  sizeFormatted: string;
  duration?: number;
}

function BrollStudioContent() {
  const searchParams = useSearchParams();
  const templateSlug = searchParams?.get("template") || searchParams?.get("slug");

  // --- Form State ---
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [voiceStyle, setVoiceStyle] = useState("Trầm ấm, chậm rãi, truyền cảm");
  const [sections, setSections] = useState<ScriptSection[]>([]);

  const [provider, setProvider] = useState<"vieneu" | "edge">("vieneu");
  const [selectedVoice, setSelectedVoice] = useState("Hải Đăng");
  const [speed, setSpeed] = useState(1.0);

  // Video Stock từ máy tính
  const [stockFiles, setStockFiles] = useState<StockFileItem[]>([]);
  const [folderPathInput, setFolderPathInput] = useState("");
  const [isScanningFolder, setIsScanningFolder] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadStorage, setUploadStorage] = useState<{ count: number; totalFormatted: string } | null>(null);
  const [uploadedStockList, setUploadedStockList] = useState<StockFileItem[]>([]);
  const [isCleaningUploads, setIsCleaningUploads] = useState(false);
  const [shotDuration, setShotDuration] = useState(3.8);

  // Nhạc nền (BGM)
  const [enableBgm, setEnableBgm] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(0.12);

  // Phụ đề (Subtitles) Style
  const [subFont, setSubFont] = useState("Montserrat");
  const [subSize, setSubSize] = useState(72);
  const [subBaseColor, setSubBaseColor] = useState("#FFF8E7");
  const [subHighlightColor, setSubHighlightColor] = useState("#FFD200");
  const [subOutlineWidth, setSubOutlineWidth] = useState(6);
  const [subPosition, setSubPosition] = useState<"center" | "middle-bottom">("center");
  const [subAnimation, setSubAnimation] = useState<"smooth" | "bounce" | "glow" | "karaoke" | "classic">("smooth");

  // Bộ lọc danh sách giọng đọc
  const [voiceRegionFilter, setVoiceRegionFilter] = useState<"all" | "Bắc" | "Trung" | "Nam">("all");
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<"all" | "male" | "female">("all");

  // Audio Preview State
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Section Preview Audio State
  const [previewingSectionIndex, setPreviewingSectionIndex] = useState<number | null>(null);
  const [isLoadingPreviewSection, setIsLoadingPreviewSection] = useState<number | null>(null);
  const sectionAudioRef = useRef<HTMLAudioElement | null>(null);

  // AI Script Generation State
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Render & Log State
  const [isRendering, setIsRendering] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderedVideoStats, setRenderedVideoStats] = useState<{ sizeFormatted: string; filename: string } | null>(null);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cache Voice State (Ghép nền siêu tốc)
  const [hasCachedVoice, setHasCachedVoice] = useState(false);
  const [cachedVoiceDuration, setCachedVoiceDuration] = useState<number | null>(null);
  const [reuseVoice, setReuseVoice] = useState(false);

  const checkCachedVoice = async (titleToCheck?: string) => {
    const t = (titleToCheck !== undefined ? titleToCheck : title).trim();
    if (!t) {
      setHasCachedVoice(false);
      setCachedVoiceDuration(null);
      setReuseVoice(false);
      return;
    }
    try {
      const res = await fetch(`/api/generate-broll?slug=${encodeURIComponent(t)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.hasCachedVoice) {
          setHasCachedVoice(true);
          setCachedVoiceDuration(data.duration ? Math.round(data.duration) : null);
          setReuseVoice(true);
        } else {
          setHasCachedVoice(false);
          setCachedVoiceDuration(null);
          setReuseVoice(false);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.trim()) {
        checkCachedVoice(title.trim());
      } else {
        setHasCachedVoice(false);
        setCachedVoiceDuration(null);
        setReuseVoice(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [title]);

  // Tự động nạp kịch bản mẫu từ query param ?template=slug
  useEffect(() => {
    if (!templateSlug) return;
    fetch("/api/data-templates")
      .then((r) => r.json())
      .then((res) => {
        if (res.templates) {
          const cleanSlug = decodeURIComponent(templateSlug).trim();
          const found = res.templates.find(
            (t: any) =>
              t.slug === cleanSlug ||
              t.slug === templateSlug ||
              t.filename === cleanSlug ||
              t.filename === `${cleanSlug}.json` ||
              t.title === cleanSlug
          );
          if (found && found.data) {
            const d = found.data;
            if (d.title || found.title) {
              const loadedTitle = d.title || found.title;
              setTitle(loadedTitle);
              setTopic(d.topic || loadedTitle);
              checkCachedVoice(loadedTitle);
            }
            if (d.voiceStyle) setVoiceStyle(d.voiceStyle);
            if (d.provider === "vieneu" || d.provider === "edge") {
              setProvider(d.provider);
            }
            if (d.voice) setSelectedVoice(d.voice);
            if (typeof d.speed === "number") setSpeed(d.speed);
            if (typeof d.bgmVolume === "number") setBgmVolume(d.bgmVolume);

            // Nạp các phân đoạn kịch bản (sections)
            if (Array.isArray(d.sections) && d.sections.length > 0) {
              setSections(d.sections);
            } else if (Array.isArray(d.script)) {
              const converted: ScriptSection[] = d.script.map((s: any, idx: number) => ({
                section: `PHÂN ĐOẠN ${idx + 1}`,
                tagline: `(Nội dung ${idx + 1})`,
                textTo: typeof s === "string" ? s.slice(0, 40) : (s.caption || s.tts || "").slice(0, 40),
                visual: "Cảnh quay điện ảnh chất lượng cao 4k dọc 9:16",
                voiceover: typeof s === "string" ? s : (s.tts || s.caption || ""),
                audioEffect: "Nhạc nền piano nhẹ nhàng",
              }));
              setSections(converted);
            }

            // Nạp cấu hình phụ đề
            if (d.subtitles) {
              if (d.subtitles.fontName) setSubFont(d.subtitles.fontName);
              if (d.subtitles.fontSize) setSubSize(d.subtitles.fontSize);
              if (d.subtitles.baseColor) setSubBaseColor(d.subtitles.baseColor);
              if (d.subtitles.highlightColor) setSubHighlightColor(d.subtitles.highlightColor);
              if (d.subtitles.outlineWidth) setSubOutlineWidth(d.subtitles.outlineWidth);
              if (d.subtitles.position) setSubPosition(d.subtitles.position);
              if (d.subtitles.animation) setSubAnimation(d.subtitles.animation);
            }

            // Nạp stock videos nếu có
            if (Array.isArray(d.stockVideos) && d.stockVideos.length > 0) {
              const files: StockFileItem[] = d.stockVideos.map((p: string) => ({
                name: p.split(/[/\\]/).pop() || p,
                path: p,
                sizeFormatted: "Đã lưu",
              }));
              setStockFiles(files);
            } else {
              setStockFiles([]);
            }
          }
        }
      })
      .catch((err) => console.error("Lỗi khi nạp template b-roll:", err));
  }, [templateSlug]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Lọc 25 giọng theo miền / giới tính
  const filteredVoices = ALL_25_VIENEU_VOICES.filter((v) => {
    if (voiceRegionFilter !== "all" && v.region !== voiceRegionFilter) return false;
    if (voiceGenderFilter !== "all" && v.gender !== voiceGenderFilter) return false;
    return true;
  });

  // Nghe thử giọng
  const handlePreviewVoice = async (voiceName: string) => {
    if (previewingVoice === voiceName) {
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
      setPreviewingVoice(null);
      return;
    }

    try {
      setPreviewingVoice(voiceName);
      const testSentence = `Xin chào! Tôi là ${voiceName}, giọng đọc chuẩn phòng thu của VieNeu TTS.`;

      const res = await fetch("/api/preview-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: testSentence,
          provider: "vieneu",
          voice: voiceName,
        }),
      });

      if (!res.ok) throw new Error("Không thể tạo audio nghe thử.");

      const data = await res.json();
      if (data.url && audioPreviewRef.current) {
        audioPreviewRef.current.src = data.url;
        audioPreviewRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi nghe thử: ${error.message}`);
      setPreviewingVoice(null);
    }
  };

  // Nghe thử âm thanh đoạn thoại (voiceover) riêng lẻ kèm emotion tag & nhịp nghỉ
  const handlePreviewSection = async (idx: number) => {
    if (previewingSectionIndex === idx) {
      if (sectionAudioRef.current) {
        sectionAudioRef.current.pause();
      }
      setPreviewingSectionIndex(null);
      return;
    }

    const sec = sections[idx];
    const text = sec?.voiceover?.trim();
    if (!text) {
      alert("Vui lòng nhập câu thoại (Voiceover) của phân đoạn này trước khi nghe thử!");
      return;
    }

    if (sectionAudioRef.current) {
      sectionAudioRef.current.pause();
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setPreviewingVoice(null);
    }

    setIsLoadingPreviewSection(idx);
    try {
      const res = await fetch("/api/preview-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: text,
          provider,
          voice: selectedVoice,
          speed,
          customSlug: `broll-sec-${idx}-${Date.now()}`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Không thể tạo audio nghe thử.");
      }

      const audioUrl = data.audioUrl || data.url;
      if (!audioUrl) throw new Error("Không nhận được link audio.");

      if (!sectionAudioRef.current) {
        sectionAudioRef.current = new Audio();
      }
      sectionAudioRef.current.src = audioUrl;
      sectionAudioRef.current.onended = () => setPreviewingSectionIndex(null);
      sectionAudioRef.current.onerror = () => {
        setPreviewingSectionIndex(null);
        alert("Lỗi phát audio!");
      };

      await sectionAudioRef.current.play();
      setPreviewingSectionIndex(idx);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi nghe thử phân đoạn ${idx + 1}: ${error.message}`);
      setPreviewingSectionIndex(null);
    } finally {
      setIsLoadingPreviewSection(null);
    }
  };

  // AI Tự động viết kịch bản theo bảng phân đoạn chi tiết
  const handleGenerateScriptWithAi = async () => {
    if (!topic.trim()) {
      alert("Vui lòng nhập chủ đề video!");
      return;
    }

    try {
      setIsGeneratingScript(true);
      setAiError(null);

      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: topic.trim(),
          mode: "broll",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lỗi tạo kịch bản từ AI");
      }

      if (data.data) {
        if (data.data.title) setTitle(data.data.title);
        if (data.data.voiceStyle) setVoiceStyle(data.data.voiceStyle);
        if (Array.isArray(data.data.sections) && data.data.sections.length > 0) {
          setSections(data.data.sections);
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setAiError(error.message);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Chỉnh sửa từng trường trong bảng kịch bản
  const handleUpdateSectionField = (index: number, field: keyof ScriptSection, value: string) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddSection = () => {
    setSections((prev) => [
      ...prev,
      {
        section: `THÂN BÀI ${prev.length + 1} (${prev.length * 10} - ${(prev.length + 1) * 10}s)`,
        tagline: "(Triết lý cốt lõi)",
        textTo: "",
        visual: "",
        voiceover: "",
        audioEffect: "",
      },
    ]);
  };

  const handleRemoveSection = (index: number) => {
    setSections((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Quét thư mục video trên PC
  const handleScanFolder = async () => {
    if (!folderPathInput.trim()) {
      alert("Vui lòng nhập đường dẫn thư mục chứa video trên máy tính!");
      return;
    }

    try {
      setIsScanningFolder(true);
      const res = await fetch("/api/scan-local-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: folderPathInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể quét thư mục");

      if (Array.isArray(data.files)) {
        const currentPaths = new Set(stockFiles.map((f) => f.path));
        const newItems: StockFileItem[] = [];

        for (const f of data.files) {
          if (!currentPaths.has(f.path)) {
            newItems.push({
              name: f.name,
              path: f.path,
              sizeFormatted: f.sizeFormatted,
              duration: f.duration,
            });
          }
        }

        setStockFiles((prev) => [...prev, ...newItems]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi quét thư mục: ${error.message}`);
    } finally {
      setIsScanningFolder(false);
    }
  };

  // Upload video từ máy tính
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingFiles(true);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res = await fetch("/api/upload-stock", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tải video");

      if (Array.isArray(data.files)) {
        const newItems: StockFileItem[] = data.files.map((f: any) => ({
          name: f.name,
          path: f.path,
          sizeFormatted: f.sizeFormatted,
        }));
        setStockFiles((prev) => [...prev, ...newItems]);
        fetchUploadStorage();
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi upload video: ${error.message}`);
    } finally {
      setIsUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Lấy dung lượng thư mục data/stock-uploads & danh sách các clip đã tải lên
  const fetchUploadStorage = async () => {
    try {
      const res = await fetch("/api/upload-stock");
      if (res.ok) {
        const data = await res.json();
        setUploadStorage({ count: data.count || 0, totalFormatted: data.totalFormatted || "0 MB" });
        if (data.files && Array.isArray(data.files)) {
          setUploadedStockList(
            data.files.map((f: any) => ({
              name: f.displayName || f.name,
              path: f.path,
              sizeFormatted: f.sizeFormatted,
            }))
          );
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchUploadStorage();
  }, []);

  // Nạp toàn bộ các clip đã lưu tạm trong stock-uploads vào danh sách video clip đã chọn
  const handleUseUploadedClips = () => {
    if (uploadedStockList.length === 0) return;
    setStockFiles((prev) => {
      const existingPaths = new Set(prev.map((p) => p.path));
      const toAdd = uploadedStockList.filter((item) => !existingPaths.has(item.path));
      if (toAdd.length === 0) {
        alert("Tất cả các video đã lưu tạm đều đã có trong danh sách chọn.");
        return prev;
      }
      return [...prev, ...toAdd];
    });
  };

  // Xóa sạch file trong data/stock-uploads để giải phóng ổ cứng
  const handleCleanUploads = async () => {
    if (!uploadStorage || uploadStorage.count === 0) return;
    if (
      !confirm(
        `Bạn có chắc muốn xóa sạch toàn bộ ${uploadStorage.count} file trong thư mục data/stock-uploads để giải phóng ${uploadStorage.totalFormatted} dung lượng ổ cứng không?`
      )
    ) {
      return;
    }

    try {
      setIsCleaningUploads(true);
      const res = await fetch("/api/upload-stock", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi dọn dẹp thư mục");

      // Bỏ các file đã bị xóa khỏi danh sách đang chọn nếu có
      setStockFiles((prev) => prev.filter((f) => !f.path.includes("stock-uploads")));
      await fetchUploadStorage();
      alert(data.message || "Đã dọn dẹp sạch sẽ bộ nhớ tạm!");
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi: ${error.message}`);
    } finally {
      setIsCleaningUploads(false);
    }
  };

  const handleRemoveStock = (index: number) => {
    setStockFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Bắt đầu Render Video
  const handleStartRender = async (options?: { reuseVoice?: boolean; skipConfirm?: boolean }) => {
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề video!");
      return;
    }

    const validVoiceovers = sections.map((s) => s.voiceover.trim()).filter(Boolean);
    if (validVoiceovers.length === 0) {
      alert("Bảng kịch bản phải có ít nhất 1 câu thoại trong cột 'Giọng đọc AI'!");
      return;
    }

    // Cảnh báo nếu chưa chọn stock video và chưa bấm bỏ qua xác nhận
    if (stockFiles.length === 0 && !options?.skipConfirm) {
      const proceed = confirm(
        "⚠️ Bạn chưa chọn video stock nào làm nền!\n\n" +
        "Hệ thống sẽ tạo video với nền gradient chuyển động thể thao.\n\n" +
        "• Nhấn OK: Tiếp tục xuất bản với nền gradient.\n" +
        "• Nhấn Cancel: Quay lại chọn stock video từ máy tính trước."
      );
      if (!proceed) return;
    }

    const shouldUseReuseVoice = options?.reuseVoice !== undefined
      ? options.reuseVoice
      : (reuseVoice && hasCachedVoice);

    setIsRendering(true);
    setProgressPercent(5);
    setProgressMessage(
      shouldUseReuseVoice
        ? "⚡ Đang ghép nền siêu tốc (dùng lại giọng đọc AI)..."
        : "Đang khởi động tiến trình..."
    );
    setTerminalLogs([
      `[INFO] Bắt đầu render video B-Roll: "${title}" ${shouldUseReuseVoice ? "(⚡ Ghép nền siêu tốc - bỏ qua gọi TTS)" : ""}`,
    ]);
    setRenderedVideoUrl(null);
    setRenderedVideoStats(null);

    try {
      const payload = {
        title: title.trim(),
        script: validVoiceovers,
        sections,
        provider,
        voice: selectedVoice,
        speed,
        stockVideos: stockFiles.map((f) => f.path),
        shotDuration,
        bgmVolume: enableBgm ? bgmVolume : 0,
        subtitles: {
          fontName: subFont,
          fontSize: subSize,
          baseColor: subBaseColor,
          highlightColor: subHighlightColor,
          outlineWidth: subOutlineWidth,
          position: subPosition,
          animation: subAnimation,
        },
        reuseVoice: shouldUseReuseVoice,
      };

      const response = await fetch("/api/generate-broll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error("Không thể kết nối máy chủ");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          if (!evt.startsWith("data:")) continue;
          const jsonStr = evt.replace(/^data:\s*/, "").trim();
          if (!jsonStr) continue;

          try {
            const eventData = JSON.parse(jsonStr);

            if (eventData.type === "log" && eventData.text) {
              setTerminalLogs((prev) => [...prev, eventData.text]);
            } else if (eventData.type === "progress") {
              if (typeof eventData.percent === "number") setProgressPercent(eventData.percent);
              if (eventData.message) setProgressMessage(eventData.message);
            } else if (eventData.type === "complete") {
              setProgressPercent(100);
              setProgressMessage(eventData.message || "Xuất bản hoàn tất!");
              if (eventData.url) setRenderedVideoUrl(eventData.url);
              setRenderedVideoStats({
                filename: eventData.filename || `${title}.mp4`,
                sizeFormatted: eventData.sizeBytes
                  ? `${(eventData.sizeBytes / 1024 / 1024).toFixed(2)} MB`
                  : "",
              });
              setHasCachedVoice(true);
              setReuseVoice(true);
              checkCachedVoice(title.trim());
            } else if (eventData.type === "error") {
              throw new Error(eventData.message || "Lỗi xử lý render video");
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi tạo video: ${error.message}`);
      setTerminalLogs((prev) => [...prev, `[ERROR] ${error.message}`]);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07130E] text-[#EBF8F2] flex flex-col font-sans selection:bg-[#FFD200] selection:text-[#081C15]">
      {/* Audio element ngầm để nghe thử */}
      <audio
        ref={audioPreviewRef}
        onEnded={() => setPreviewingVoice(null)}
        onError={() => setPreviewingVoice(null)}
        className="hidden"
      />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#071912]/95 backdrop-blur-md border-b border-[#10B981]/20 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-1.5 text-xs font-bold text-[#EBF8F2]/60 hover:text-[#FFD200] transition-colors"
            >
              <span>← Tổng quan</span>
            </Link>
            <div className="h-4 w-px bg-[#EBF8F2]/10" />
            <div className="flex items-center space-x-2">
              <span className="text-xl">🎬</span>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">
                Studio Video B-Roll{" "}
                <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded bg-gradient-to-r from-[#FFB703]/20 to-[#FB8500]/20 text-[#FFD200] border border-[#FFD200]/30 font-mono">
                  Bảng Kịch Bản Chi Tiết
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <CreateVideoDropdown />
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* TIER 1: Ô NHẬP CHỦ ĐỀ & NÚT AI VIẾT KỊCH BẢN */}
        <div className="bg-[#0E291E]/70 border border-[#10B981]/30 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#FFD200] uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFD200]" />
                <span>Nhập Chủ Đề Cho Video Ngắn (B-Roll):</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Nhập chủ đề video bạn muốn làm (vd: Triết lý bình yên trong tâm, Bí mật tập luyện của Ronaldo...)"
                  className="flex-1 bg-[#071912] border border-[#10B981]/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200] transition-colors"
                />
                <button
                  type="button"
                  onClick={handleGenerateScriptWithAi}
                  disabled={isGeneratingScript}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#10B981] to-[#FFD200] hover:brightness-110 active:scale-95 disabled:opacity-50 text-[#081C15] font-black text-xs uppercase tracking-wide rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shrink-0"
                >
                  {isGeneratingScript ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang viết bảng kịch bản...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 stroke-[2.5]" />
                      <span>AI Viết Kịch Bản Chi Tiết</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="md:w-80">
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
                Tiêu Đề Video (Tên file xuất):
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề video..."
                className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-3 py-2.5 text-xs font-bold text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200]"
              />
            </div>
          </div>

          {aiError && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}
        </div>

        {/* TIER 2: BẢNG KỊCH BẢN CHI TIẾT (THEO ĐÚNG MẪU 4 CỘT) */}
        <div className="bg-[#0E291E]/70 border border-[#10B981]/30 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#10B981]/20 gap-2">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>BẢNG KỊCH BẢN CHI TIẾT</span>
                {sections.length > 0 && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] font-mono border border-[#10B981]/30">
                    {sections.length} Phân đoạn
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#EBF8F2]/60 mt-0.5">
                Phân tích cảnh quay, text to màn hình, câu thoại AI và hiệu ứng âm thanh theo từng mốc thời gian
              </p>
            </div>

            <div className="flex items-center gap-2">
              {sections.some((s) => /\[(?:cười|hắng giọng|thở dài|lấy hơi|nghỉ|nghi|pause)[^\]]*\]/i.test(s.voiceover || "")) && (
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ thẻ cảm xúc ở TẤT CẢ các phân đoạn không?")) return;
                    setSections((prev) =>
                      prev.map((s) => ({
                        ...s,
                        voiceover: (s.voiceover || "")
                          .replace(/\[(?:cười|hắng giọng|thở dài|lấy hơi|nghỉ|nghi|pause)[^\]]*\]\s*/gi, "")
                          .replace(/\s{2,}/g, " ")
                          .trim(),
                      }))
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Xóa tất cả các thẻ cảm xúc trên toàn bộ kịch bản"
                >
                  <span>🧹 Xóa tag tất cả</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleAddSection}
                className="px-3 py-1.5 rounded-xl bg-[#143D2E] hover:bg-[#10B981]/30 text-[#FFD200] border border-[#FFD200]/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Thêm Phân Đoạn</span>
              </button>
            </div>
          </div>

          {/* THANH CÔNG CỤ CHÈN THẺ CẢM XÚC & ƯỚC TÍNH THỜI LƯỢNG AUDIO */}
          <TtsEmotionToolbar speed={speed} />

          {/* BẢNG 4 CỘT CHUẨN */}
          <div className="overflow-x-auto rounded-xl border border-[#10B981]/25 bg-[#061510]/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#12382A]/90 text-white font-extrabold border-b border-[#10B981]/30">
                  <th className="py-3.5 px-4 w-[18%] uppercase tracking-wider border-r border-[#10B981]/20">
                    Phần / Thời gian
                  </th>
                  <th className="py-3.5 px-4 w-[28%] uppercase tracking-wider border-r border-[#10B981]/20">
                    Nội dung Hiển thị trên màn hình (Text & Hình ảnh)
                  </th>
                  <th className="py-3.5 px-4 w-[34%] uppercase tracking-wider border-r border-[#10B981]/20">
                    Giọng đọc AI ({voiceStyle || "Trầm ấm, chậm rãi, truyền cảm"})
                  </th>
                  <th className="py-3.5 px-4 w-[16%] uppercase tracking-wider border-r border-[#10B981]/20">
                    Âm thanh & Hiệu ứng
                  </th>
                  <th className="py-3.5 px-2 w-[4%] text-center">
                    #
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#10B981]/15 text-[#EBF8F2]/90">
                {sections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#EBF8F2]/40 text-xs">
                      Chưa có kịch bản. Hãy nhập chủ đề ở trên và bấm{" "}
                      <span className="text-[#FFD200] font-bold">"AI Viết Kịch Bản Chi Tiết"</span>{" "}
                      hoặc bấm nút "Thêm Phân Đoạn" để tự soạn thảo.
                    </td>
                  </tr>
                ) : (
                  sections.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-[#10B981]/5 transition-colors align-top"
                    >
                      {/* CỘT 1: PHẦN / THỜI GIAN */}
                      <td className="py-4 px-4 border-r border-[#10B981]/15 align-top">
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={item.section}
                            onChange={(e) => handleUpdateSectionField(idx, "section", e.target.value)}
                            placeholder="HOOK (0 - 4s)"
                            className="bg-transparent font-black text-white text-xs tracking-wide focus:outline-none focus:bg-[#143D2E] rounded px-1.5 py-0.5 w-full border border-transparent focus:border-[#FFD200]/40 transition-colors"
                          />
                          <input
                            type="text"
                            value={item.tagline}
                            onChange={(e) => handleUpdateSectionField(idx, "tagline", e.target.value)}
                            placeholder="(Đòn bẩy tâm lý)"
                            className="bg-transparent italic text-[11px] text-[#EBF8F2]/70 focus:outline-none focus:bg-[#143D2E] rounded px-1.5 py-0.5 w-full border border-transparent focus:border-[#FFD200]/40 transition-colors"
                          />
                        </div>
                      </td>

                      {/* CỘT 2: NỘI DUNG HIỂN THỊ (TEXT TO & VISUAL) */}
                      <td className="py-4 px-4 border-r border-[#10B981]/15 space-y-3">
                        <div>
                          <span className="font-extrabold text-[#FFD200] mr-1 text-[11px] uppercase tracking-wide">
                            Text to:
                          </span>
                          <textarea
                            rows={2}
                            value={item.textTo}
                            onChange={(e) => handleUpdateSectionField(idx, "textTo", e.target.value)}
                            placeholder="Câu chữ to nổi bật trên màn hình..."
                            className="w-full bg-[#071912]/80 border border-[#10B981]/25 rounded-lg p-2 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200] resize-none mt-1"
                          />
                        </div>

                        <div>
                          <span className="font-extrabold text-[#10B981] mr-1 text-[11px] uppercase tracking-wide">
                            Visual:
                          </span>
                          <textarea
                            rows={3}
                            value={item.visual}
                            onChange={(e) => handleUpdateSectionField(idx, "visual", e.target.value)}
                            placeholder="Mô tả cảnh quay b-roll cần tìm từ máy tính..."
                            className="w-full bg-[#071912]/80 border border-[#10B981]/25 rounded-lg p-2 text-[11px] text-[#EBF8F2]/80 placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200] resize-none mt-1"
                          />
                        </div>
                      </td>

                      {/* CỘT 3: GIỌNG ĐỌC AI (TTS VOICEOVER) */}
                      <td className="py-4 px-4 border-r border-[#10B981]/15">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold uppercase text-[#EBF8F2]/60 tracking-wider">
                                Lời đọc (Voiceover):
                              </span>
                              {idx === sections.length - 1 && (
                                <span className="text-[#FFD200] font-semibold text-[9px] flex items-center gap-1">
                                  <span>✨ Lắng đọng Outro</span>
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handlePreviewSection(idx)}
                              disabled={isLoadingPreviewSection === idx || !item.voiceover?.trim()}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm ${
                                previewingSectionIndex === idx
                                  ? "bg-amber-400 text-[#081C15] font-extrabold hover:bg-amber-300 animate-pulse shadow-amber-400/30"
                                  : "bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] border border-[#10B981]/40"
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                              title={
                                previewingSectionIndex === idx
                                  ? "Dừng phát đoạn này"
                                  : "Nghe thử âm thanh đoạn thoại này (kèm tag cảm xúc & nhịp nghỉ)"
                              }
                            >
                              {isLoadingPreviewSection === idx ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-[#FFD200]" />
                                  <span>Đang tạo âm...</span>
                                </>
                              ) : previewingSectionIndex === idx ? (
                                <>
                                  <Pause className="w-3 h-3 fill-current" />
                                  <span>Dừng phát</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3" />
                                  <span>Nghe thử đoạn</span>
                                </>
                              )}
                            </button>
                          </div>
                          <textarea
                            rows={5}
                            value={item.voiceover}
                            onChange={(e) => handleUpdateSectionField(idx, "voiceover", e.target.value)}
                            placeholder="Nhập câu thoại chi tiết để AI lồng tiếng... (Dùng dấu ... hoặc [nghỉ 0.8s] để nhịp chậm rãi)"
                            className="w-full bg-[#0B2117] border border-[#FFD200]/40 rounded-xl p-3 text-xs leading-relaxed text-[#FFF8E7] font-medium placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200] resize-none shadow-inner"
                          />

                          {/* Phím tắt chèn nhanh thẻ cảm xúc ngay dưới ô thoại */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <span className="text-[9px] text-[#EBF8F2]/40 font-mono mr-0.5">Thêm nhanh:</span>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const cur = item.voiceover || "";
                                handleUpdateSectionField(idx, "voiceover", cur + (cur && !cur.endsWith(" ") ? " " : "") + "[cười] ");
                              }}
                              className="text-[9px] bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold cursor-pointer transition"
                              title="Chèn [cười]"
                            >
                              + [cười]
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const cur = item.voiceover || "";
                                handleUpdateSectionField(idx, "voiceover", cur + (cur && !cur.endsWith(" ") ? " " : "") + "[hắng giọng] ");
                              }}
                              className="text-[9px] bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-bold cursor-pointer transition"
                              title="Chèn [hắng giọng]"
                            >
                              + [hắng giọng]
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const cur = item.voiceover || "";
                                handleUpdateSectionField(idx, "voiceover", cur + (cur && !cur.endsWith(" ") ? " " : "") + "[thở dài] ");
                              }}
                              className="text-[9px] bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded font-bold cursor-pointer transition"
                              title="Chèn [thở dài]"
                            >
                              + [thở dài]
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const cur = item.voiceover || "";
                                handleUpdateSectionField(idx, "voiceover", cur + (cur && !cur.endsWith(" ") ? " " : "") + "[lấy hơi] ");
                              }}
                              className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-bold cursor-pointer transition"
                              title="Chèn [lấy hơi]"
                            >
                              + [lấy hơi]
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const cur = item.voiceover || "";
                                handleUpdateSectionField(idx, "voiceover", cur + (cur && !cur.endsWith(" ") ? " " : "") + "[nghỉ 1s] ");
                              }}
                              className="text-[9px] bg-[#10B981]/10 hover:bg-[#10B981]/25 border border-[#10B981]/30 text-[#10B981] px-1.5 py-0.5 rounded font-bold cursor-pointer transition"
                              title="Chèn [nghỉ 1s]"
                            >
                              + [nghỉ 1s]
                            </button>

                            {/* Nút xóa sạch tag cảm xúc của riêng đoạn này */}
                            {/\[(?:cười|hắng giọng|thở dài|lấy hơi|nghỉ|nghi|pause)[^\]]*\]/i.test(item.voiceover || "") && (
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = item.voiceover || "";
                                  const cleaned = cur
                                    .replace(/\[(?:cười|hắng giọng|thở dài|lấy hơi|nghỉ|nghi|pause)[^\]]*\]\s*/gi, "")
                                    .replace(/\s{2,}/g, " ")
                                    .trim();
                                  handleUpdateSectionField(idx, "voiceover", cleaned);
                                }}
                                className="text-[9px] bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-300 px-1.5 py-0.5 rounded font-bold cursor-pointer transition ml-auto flex items-center gap-0.5 active:scale-95 shadow-sm"
                                title="Xóa toàn bộ thẻ cảm xúc và khoảng nghỉ trong phân đoạn này"
                              >
                                <span>🧹 Xóa tag</span>
                              </button>
                            )}
                          </div>
                          {idx === sections.length - 1 && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[9px] text-[#EBF8F2]/40">Mẹo tạo dư âm:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = item.voiceover || "";
                                  handleUpdateSectionField(idx, "voiceover", current.trim() + " [nghỉ 0.8s] Hôm nay... tâm bạn... đang chọn điều gì?");
                                }}
                                className="text-[9px] bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer"
                              >
                                + Mẫu CTA đọng lại
                              </button>
                              <span className="text-[9px] text-[#EBF8F2]/40 italic">Chậm lại ở từ khóa cuối</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* CỘT 4: ÂM THANH & HIỆU ỨNG */}
                      <td className="py-4 px-4 border-r border-[#10B981]/15">
                        <textarea
                          rows={4}
                          value={item.audioEffect}
                          onChange={(e) => handleUpdateSectionField(idx, "audioEffect", e.target.value)}
                          placeholder="Tiếng chuông ngân nhẹ, nhạc nền piano..."
                          className="w-full bg-[#071912]/80 border border-[#10B981]/25 rounded-lg p-2 text-[11px] text-[#EBF8F2]/70 placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200] resize-none"
                        />
                      </td>

                      {/* HÀNH ĐỘNG */}
                      <td className="py-4 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(idx)}
                          className="p-1.5 text-[#EBF8F2]/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Xóa phân đoạn này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TIER 3: CHỌN STOCK VIDEO + CẤU HÌNH GIỌNG ĐỌC + SUBTITLES & RENDER (2 CỘT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI: VIDEO STOCK TỪ MÁY TÍNH (6 COLS) */}
          <div className="lg:col-span-6 bg-[#0E291E]/70 border border-[#10B981]/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#10B981]/20">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#FFD200]" />
                  <span>Chọn Video Stock Từ Máy Tính</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFD200]/20 text-[#FFD200] font-mono">
                    Dọc 9:16
                  </span>
                </h3>
                <p className="text-[11px] text-[#EBF8F2]/60 mt-0.5">
                  Tải file trực tiếp từ máy hoặc quét cả thư mục video
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFiles}
                className="p-3.5 rounded-xl bg-[#071912] hover:bg-[#143D2E] border border-dashed border-[#10B981]/40 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group"
              >
                <Upload className="w-5 h-5 text-[#FFD200] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-white">
                  {isUploadingFiles ? "Đang tải video..." : "Chọn file từ máy"}
                </span>
                <span className="text-[9px] text-[#EBF8F2]/40">MP4, MOV, WebM</span>
              </button>

              <div className="p-3.5 rounded-xl bg-[#071912] border border-[#10B981]/20 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-[#EBF8F2]/60 uppercase">
                  Nhịp cắt B-Roll:
                </span>
                <span className="text-sm font-black text-[#FFD200] font-mono">
                  {shotDuration}s / shot
                </span>
                <input
                  type="range"
                  min="2.5"
                  max="6.0"
                  step="0.2"
                  value={shotDuration}
                  onChange={(e) => setShotDuration(parseFloat(e.target.value))}
                  className="w-full accent-[#FFD200] cursor-pointer"
                />
              </div>
            </div>

            {/* Thông báo dung lượng tạm trong data/stock-uploads & Nút Dùng / Xóa sạch */}
            {uploadStorage && uploadStorage.count > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#143D2E]/90 border border-[#10B981]/40 rounded-xl px-3.5 py-2.5 text-xs shadow-md">
                <div className="flex items-center gap-2 text-[#EBF8F2]/90 min-w-0 pr-2">
                  <HardDrive className="w-4 h-4 text-[#FFD200] shrink-0" />
                  <div className="truncate">
                    <span className="text-[#EBF8F2]/70 text-[11px]">Đã lưu tạm: </span>
                    <strong className="text-white font-mono text-[11px]">{uploadStorage.count} clip</strong>
                    <span className="text-[#FFD200] font-mono text-[11px] ml-1">({uploadStorage.totalFormatted})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleUseUploadedClips}
                    className="px-2.5 py-1.5 bg-[#FFD200] hover:bg-[#ffe043] text-[#081C15] font-black text-[11px] rounded-lg border border-[#FFD200] flex items-center gap-1.5 transition-all cursor-pointer shadow hover:scale-105 active:scale-95"
                    title="Nạp tất cả video đã lưu tạm vào danh sách sử dụng bên dưới"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#081C15] fill-current" />
                    <span>Dùng tất cả {uploadStorage.count} clip</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCleanUploads}
                    disabled={isCleaningUploads}
                    className="px-2.5 py-1.5 bg-red-950/90 hover:bg-red-800 text-red-200 hover:text-white font-bold text-[11px] rounded-lg border border-red-500/40 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow"
                    title="Xóa toàn bộ video trong thư mục data/stock-uploads để giải phóng ổ cứng"
                  >
                    {isCleaningUploads ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Xóa sạch uploads</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quét thư mục trên PC */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#EBF8F2]/50 uppercase tracking-wider">
                Hoặc quét thư mục video trên ổ cứng:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={folderPathInput}
                  onChange={(e) => setFolderPathInput(e.target.value)}
                  placeholder="vd: D:\Videos\Stock hoặc data\stock-videos"
                  className="flex-1 bg-[#071912] border border-[#10B981]/30 rounded-xl px-3 py-2 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200]"
                />
                <button
                  type="button"
                  onClick={handleScanFolder}
                  disabled={isScanningFolder}
                  className="px-3.5 py-2 bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] font-bold text-xs rounded-xl border border-[#10B981]/40 flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                >
                  {isScanningFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                  <span>Quét</span>
                </button>
              </div>
            </div>

            {/* Danh sách clip đã chọn */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-white">
                  Đã chọn {stockFiles.length} video clip:
                </span>
                {stockFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStockFiles([])}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                {stockFiles.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#071912]/50 border border-dashed border-[#10B981]/20 text-center text-xs text-[#EBF8F2]/60 space-y-2.5">
                    <p className="text-[11px]">Chưa có video nào được chọn. Hệ thống sẽ tự động tạo nền motion gradient thể thao nếu để trống.</p>
                    {uploadedStockList.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={handleUseUploadedClips}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] font-bold text-xs border border-[#10B981]/40 transition-all cursor-pointer shadow hover:scale-105 active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>⚡ Sử dụng ngay {uploadedStockList.length} clip đã lưu tạm trên máy</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  stockFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-[#071912] border border-[#10B981]/20 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-white truncate text-[11px]">{item.name}</div>
                        <div className="text-[9px] text-[#EBF8F2]/50">
                          {item.duration ? `${item.duration}s • ` : ""}
                          {item.sizeFormatted}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStock(idx)}
                        className="p-1 text-[#EBF8F2]/40 hover:text-red-400 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* ACTION BAR: GHÉP NỀN SIÊU TỐC NẾU ĐÃ CÓ GIỌNG AI */}
              {hasCachedVoice && stockFiles.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-[#10B981]/15 via-[#FFD200]/10 to-[#10B981]/15 border border-[#10B981]/40 flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-[#FFD200]/20 text-[#FFD200] shrink-0">
                      <Zap className="w-4 h-4 fill-[#FFD200]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black text-white flex items-center gap-1.5">
                        <span>Đã có sẵn Voiceover AI {cachedVoiceDuration ? `(~${cachedVoiceDuration}s)` : ""}</span>
                        <span className="px-1.5 py-0.5 text-[8px] rounded bg-[#FFD200] text-[#081C15] font-black uppercase tracking-wider">
                          Tiết kiệm 40s
                        </span>
                      </div>
                      <p className="text-[10px] text-[#EBF8F2]/70 truncate">
                        Ghép {stockFiles.length} clip mới vào video chỉ mất ~3-5 giây!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartRender({ reuseVoice: true, skipConfirm: true })}
                    disabled={isRendering}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] hover:brightness-110 active:scale-95 text-[#081C15] font-black text-[11px] flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 fill-[#081C15]" />
                    <span>Ghép Ngay</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: GIỌNG ĐỌC (25 GIỌNG) + STYLE PHỤ ĐỀ + RENDER (6 COLS) */}
          <div className="lg:col-span-6 bg-[#0E291E]/70 border border-[#10B981]/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#10B981]/20">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <span>Giọng Đọc & Style Phụ Đề</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] font-mono">
                    25 Giọng VieNeu 48kHz
                  </span>
                </h3>
              </div>

              <div className="flex bg-[#071912] p-1 rounded-xl border border-[#10B981]/30 text-xs">
                <button
                  type="button"
                  onClick={() => setProvider("vieneu")}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                    provider === "vieneu"
                      ? "bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15]"
                      : "text-[#EBF8F2]/60"
                  }`}
                >
                  VieNeu (Local)
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("edge")}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                    provider === "edge"
                      ? "bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15]"
                      : "text-[#EBF8F2]/60"
                  }`}
                >
                  Edge TTS
                </button>
              </div>
            </div>

            {/* Chọn giọng VieNeu */}
            {provider === "vieneu" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 pb-1">
                  <span className="text-[10px] font-bold text-[#EBF8F2]/50 uppercase">Miền:</span>
                  {(["all", "Bắc", "Trung", "Nam"] as const).map((reg) => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setVoiceRegionFilter(reg)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        voiceRegionFilter === reg
                          ? "bg-[#FFD200] text-[#081C15]"
                          : "bg-[#071912] text-[#EBF8F2]/60"
                      }`}
                    >
                      {reg === "all" ? "Tất cả" : reg}
                    </button>
                  ))}
                  <div className="h-3 w-px bg-[#EBF8F2]/20 mx-1" />
                  {(["all", "male", "female"] as const).map((gen) => (
                    <button
                      key={gen}
                      type="button"
                      onClick={() => setVoiceGenderFilter(gen)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        voiceGenderFilter === gen
                          ? "bg-[#10B981] text-[#081C15]"
                          : "bg-[#071912] text-[#EBF8F2]/60"
                      }`}
                    >
                      {gen === "all" ? "Nam+Nữ" : gen === "male" ? "Nam" : "Nữ"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {filteredVoices.map((v) => {
                    const isSelected = selectedVoice === v.id;
                    const isPlaying = previewingVoice === v.id;

                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVoice(v.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#143D2E] border-[#FFD200]"
                            : "bg-[#071912] border-[#10B981]/20 hover:border-[#10B981]/50"
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <div className="text-xs font-bold text-white truncate">{v.name}</div>
                          <div className="text-[9px] text-[#EBF8F2]/50 truncate">{v.description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewVoice(v.id);
                          }}
                          className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                            isPlaying
                              ? "bg-red-500 text-white animate-pulse"
                              : "bg-[#143D2E] text-[#FFD200] hover:bg-[#FFD200] hover:text-[#081C15]"
                          }`}
                          title="Nghe thử"
                        >
                          {isPlaying ? <Pause className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tùy chỉnh phụ đề */}
            <div className="pt-2 border-t border-[#10B981]/20 grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#EBF8F2]/50 uppercase mb-1">
                  Màu Chữ Thường
                </label>
                <div className="flex items-center gap-2 bg-[#071912] p-1.5 rounded-xl border border-[#10B981]/30">
                  <input
                    type="color"
                    value={subBaseColor}
                    onChange={(e) => setSubBaseColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[11px] font-mono text-white">{subBaseColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#EBF8F2]/50 uppercase mb-1">
                  Màu Highlight (Từ đang đọc)
                </label>
                <div className="flex items-center gap-2 bg-[#071912] p-1.5 rounded-xl border border-[#10B981]/30">
                  <input
                    type="color"
                    value={subHighlightColor}
                    onChange={(e) => setSubHighlightColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-[11px] font-mono text-white">{subHighlightColor}</span>
                </div>
              </div>
            </div>

            {/* Hiệu ứng chạy chữ Highlight */}
            <div className="pt-2 border-t border-[#10B981]/20">
              <label className="block text-[10px] font-bold text-[#EBF8F2]/50 uppercase mb-1.5 flex items-center justify-between">
                <span>Hiệu ứng chạy chữ Subtitle</span>
                <span className="text-[#FFD200] font-normal normal-case">
                  {subAnimation === "smooth" && "✨ Mượt mà (Bloom êm, cố định chữ)"}
                  {subAnimation === "karaoke" && "🎤 Karaoke (Quét mượt chuẩn \\kf)"}
                  {subAnimation === "bounce" && "⚡ Nảy chữ (Nhún đàn hồi trục dọc)"}
                  {subAnimation === "glow" && "🌟 Tỏa sáng (Viền neon nổi bật)"}
                  {subAnimation === "classic" && "📝 Liền mạch (Không chớp đen)"}
                </span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
                {[
                  { id: "smooth", label: "✨ Mượt mà", desc: "Bloom êm ái" },
                  { id: "karaoke", label: "🎤 Karaoke", desc: "Quét từ trái sang" },
                  { id: "bounce", label: "⚡ Nảy chữ", desc: "Nhún đàn hồi" },
                  { id: "glow", label: "🌟 Tỏa sáng", desc: "Glow viền" },
                  { id: "classic", label: "📝 Liền mạch", desc: "Không chớp đen" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSubAnimation(item.id as any)}
                    className={`py-1.5 px-2 rounded-xl text-left border transition-all cursor-pointer ${
                      subAnimation === item.id
                        ? "bg-[#143D2E] border-[#FFD200] text-[#FFD200]"
                        : "bg-[#071912] border-[#10B981]/20 text-[#EBF8F2]/70 hover:border-[#10B981]/50"
                    }`}
                  >
                    <div className="text-[11px] font-bold leading-tight">{item.label}</div>
                    <div className="text-[9px] text-[#EBF8F2]/40 truncate">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* BGM Toggle */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-[#FFD200]" />
                <span className="font-bold text-white">Nhạc nền (BGM)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enableBgm}
                  onChange={(e) => setEnableBgm(e.target.checked)}
                  className="accent-[#FFD200] w-4 h-4 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-[#FFD200]">
                  {enableBgm ? `${Math.round(bgmVolume * 100)}%` : "Tắt"}
                </span>
              </div>
            </div>

            {/* NÚT RENDER & TIẾN TRÌNH */}
            <div className="pt-2">
              {/* Tùy chọn Tái sử dụng Voiceover nếu đã có cache */}
              {hasCachedVoice && (
                <div className="mb-2 p-2 rounded-xl bg-[#071912] border border-[#10B981]/30 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={reuseVoice}
                      onChange={(e) => setReuseVoice(e.target.checked)}
                      className="w-4 h-4 accent-[#FFD200] rounded cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#FFD200] fill-[#FFD200]" />
                      <span className="text-[#EBF8F2] font-semibold text-[11px]">
                        Tái sử dụng Voiceover AI đã tạo {cachedVoiceDuration ? `(${cachedVoiceDuration}s)` : ""}
                      </span>
                    </div>
                  </label>
                  <span className="text-[9px] text-[#10B981] font-mono font-bold bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/20">
                    ⚡ Ghép nền ~5s
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleStartRender()}
                disabled={isRendering}
                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 ${
                  reuseVoice && hasCachedVoice
                    ? "bg-gradient-to-r from-[#10B981] via-[#FFD200] to-[#10B981] text-[#081C15] shadow-[#10B981]/30 ring-2 ring-[#FFD200]/50 hover:brightness-110"
                    : "bg-gradient-to-r from-[#10B981] via-[#FFD200] to-[#FB8500] text-[#081C15] shadow-[#10B981]/25 hover:brightness-110"
                }`}
              >
                {isRendering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang render ({progressPercent}%)...</span>
                  </>
                ) : reuseVoice && hasCachedVoice ? (
                  <>
                    <Zap className="w-4 h-4 fill-[#081C15]" />
                    <span>⚡ GHÉP NỀN STOCK SIÊU TỐC (DÙNG LẠI GIỌNG AI)</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 stroke-[2.5]" />
                    <span>XUẤT BẢN VIDEO B-ROLL (MP4)</span>
                  </>
                )}
              </button>

              {isRendering && (
                <div className="mt-3 p-3 rounded-xl bg-[#071912] border border-[#10B981]/30 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#FFD200]">{progressMessage}</span>
                    <span className="font-mono text-white">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#143D2E] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#10B981] to-[#FFD200] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Video Player khi render xong */}
              {renderedVideoUrl && (
                <div className="mt-3 p-3.5 rounded-2xl bg-[#0E291E] border-2 border-[#FFD200] space-y-2 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                      <span>Video Hoàn Tất! ({renderedVideoStats?.sizeFormatted})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/edit?video=${encodeURIComponent(renderedVideoStats?.filename || `${title}.mp4`)}`}
                        className="px-2.5 py-1 rounded bg-[#143D2E] text-[#10B981] hover:bg-[#10B981]/30 text-[11px] font-bold flex items-center gap-1 border border-[#10B981]/40"
                        title="Mở video này trong Video Editor để cắt ghép, đổi tốc độ, lọc màu..."
                      >
                        <Scissors className="w-3 h-3 text-[#FFD200]" />
                        <span>Chỉnh Sửa</span>
                      </Link>
                      <a
                        href={renderedVideoUrl}
                        download={renderedVideoStats?.filename}
                        className="px-2.5 py-1 rounded bg-[#FFD200] text-[#081C15] text-[11px] font-black flex items-center gap-1 shadow"
                      >
                        <Download className="w-3 h-3" />
                        <span>Tải MP4</span>
                      </a>
                    </div>
                  </div>

                  <div className="aspect-[9/16] max-h-[360px] mx-auto rounded-xl overflow-hidden bg-black border border-[#10B981]/30 shadow-2xl">
                    <video
                      src={renderedVideoUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Logs */}
              <div className="mt-3 p-3 rounded-xl bg-[#050E0A] border border-[#10B981]/20 font-mono text-[10px] text-[#EBF8F2]/70 space-y-1 max-h-[120px] overflow-y-auto">
                <div className="flex items-center justify-between text-[9px] text-[#EBF8F2]/40 border-b border-[#EBF8F2]/10 pb-1 mb-1">
                  <span>TERMINAL LOGS</span>
                  <button type="button" onClick={() => setTerminalLogs([])} className="hover:text-white">
                    Xoá
                  </button>
                </div>
                {terminalLogs.map((log, i) => (
                  <div key={i} className="leading-tight">{log}</div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BrollStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#081C15] flex items-center justify-center text-[#FFD200] font-bold text-sm">
          Đang nạp Studio B-Roll...
        </div>
      }
    >
      <BrollStudioContent />
    </Suspense>
  );
}
