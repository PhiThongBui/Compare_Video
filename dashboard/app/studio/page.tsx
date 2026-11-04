"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Play,
  Pause,
  Download,
  Scissors,
  Sliders,
  Volume2,
  VolumeX,
  Music,
  Type,
  Sparkles,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Check,
  RotateCcw,
  FastForward,
  Rewind,
  Layers,
  Upload,
  FolderOpen,
  HardDrive,
  X,
  Search,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Globe,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Film,
  Mic,
  Split,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Minimize2,
  Wand2,
  CheckCircle2,
  Clock,
  Sparkle,
  Copy,
  Headphones,
  Settings2,
  Smile,
  Volume1,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  GripVertical,
  GripHorizontal,
} from "lucide-react";

// --- CẤU TRÚC DỮ LIỆU DỰ ÁN TIMELINE MULTI-TRACK ---

export type TrackType = "subtitle" | "overlay" | "main-video" | "background" | "voiceover" | "bgm";

export interface SubtitleWord {
  word: string;
  start: number;
  end: number;
}

export interface TimelineClip {
  id: string;
  type: "video" | "audio" | "subtitle" | "overlay";
  trackId: string;
  name: string;
  src?: string;
  start: number; // Điểm bắt đầu trên timeline (giây)
  duration: number; // Độ dài trên timeline (giây)
  sourceDuration?: number; // Độ dài file gốc
  inPoint: number; // Cắt từ giây thứ mấy trong file gốc
  outPoint: number; // Cắt đến giây thứ mấy trong file gốc
  speed: number;
  volume: number;
  colorFilter?: string; // none, warm, vivid, vintage, bw, cool
  text?: string;
  words?: SubtitleWord[];
  transitionIn?: "none" | "fade" | "zoomin" | "zoomout" | "slideleft" | "slideright" | "glitch";
  transitionDuration?: number;
}

export interface TimelineTrack {
  id: string;
  type: TrackType;
  name: string;
  icon: string;
  color: string;
  isMuted: boolean;
  isHidden: boolean;
  isLocked: boolean;
  clips: TimelineClip[];
}

export interface StudioProject {
  id: string;
  name: string;
  duration: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  fps: number;
  tracks: TimelineTrack[];
  subtitleStyle: {
    fontFamily: string;
    fontSize: number;
    baseColor: string;
    highlightColor: string;
    outlineColor: string;
    outlineWidth: number;
    animation: "smooth" | "bounce" | "glow" | "karaoke" | "classic";
    position: "center" | "middle-bottom" | "bottom";
  };
  watermark: {
    enabled: boolean;
    text: string;
    position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
    size: number;
    opacity: number;
  };
  backgroundSetting: {
    enabled: boolean;
    mode: "replace" | "blur" | "pip" | "overlay";
    dim: number;
    src: string;
  };
}

const COLOR_FILTERS = [
  { id: "none", name: "Gốc", desc: "Không áp dụng bộ lọc", css: "none" },
  { id: "warm", name: "Ấm Áp (Warm)", desc: "Ánh vàng cam hoài niệm", css: "sepia(0.32) saturate(1.4) contrast(1.1) brightness(1.03)" },
  { id: "vivid", name: "Rực Rỡ (Vivid)", desc: "Tươi tắn, tăng tương phản", css: "saturate(1.65) contrast(1.22) brightness(1.03)" },
  { id: "vintage", name: "Cổ Điển (Retro)", desc: "Tông màu phim thập niên 90", css: "sepia(0.5) contrast(1.18) brightness(0.92) hue-rotate(-12deg)" },
  { id: "bw", name: "Đen Trắng (B&W)", desc: "Tương phản nghệ thuật", css: "grayscale(1) contrast(1.35) brightness(1.05)" },
  { id: "cool", name: "Lạnh Lùng (Cool)", desc: "Xanh teal điện ảnh", css: "hue-rotate(185deg) saturate(1.25) contrast(1.1)" },
];

const SPEED_PRESETS = [0.8, 0.9, 1.0, 1.1, 1.25, 1.5];

const SUBTITLE_PRESETS = [
  { id: "smooth", name: "Smooth Bloom", desc: "Mượt mà, không rung lắc ngang", tag: "Hot ⭐" },
  { id: "bounce", name: "Bounce 3D", desc: "Nảy trục dọc đàn hồi sinh động", tag: "CapCut" },
  { id: "glow", name: "Glow Neon", desc: "Tỏa viền sáng khi phát âm", tag: "Highlight" },
  { id: "karaoke", name: "Karaoke Scan", desc: "Quét dải màu từ trái qua phải", tag: "Lyric" },
  { id: "classic", name: "Classic Pop", desc: "Đổi màu tức thì liền mạch", tag: "Standard" },
];

const INITIAL_PROJECT: StudioProject = {
  id: "proj_default",
  name: "Dự Án Video Mới",
  duration: 25.0,
  aspectRatio: "9:16",
  fps: 30,
  tracks: [
    {
      id: "track_sub",
      type: "subtitle",
      name: "Phụ Đề (Subtitles)",
      icon: "✨",
      color: "from-amber-500/30 to-amber-600/30 border-amber-500/50",
      isMuted: false,
      isHidden: false,
      isLocked: false,
      clips: [],
    },
    {
      id: "track_overlay",
      type: "overlay",
      name: "Watermark / Text",
      icon: "🏷️",
      color: "from-blue-500/30 to-blue-600/30 border-blue-500/50",
      isMuted: false,
      isHidden: false,
      isLocked: false,
      clips: [],
    },
    {
      id: "track_video",
      type: "main-video",
      name: "Video Chính (Main)",
      icon: "🎬",
      color: "from-emerald-500/30 to-emerald-600/30 border-emerald-500/50",
      isMuted: false,
      isHidden: false,
      isLocked: false,
      clips: [],
    },
    {
      id: "track_bg",
      type: "background",
      name: "Video Nền (Background)",
      icon: "🖼️",
      color: "from-teal-500/30 to-teal-600/30 border-teal-500/50",
      isMuted: false,
      isHidden: false,
      isLocked: false,
      clips: [],
    },
    {
      id: "track_voice",
      type: "voiceover",
      name: "Giọng Đọc (Voiceover)",
      icon: "🎙️",
      color: "from-lime-500/30 to-lime-600/30 border-lime-500/50",
      isMuted: false,
      isHidden: false,
      isLocked: false,
      clips: [],
    },
    {
      id: "track_bgm",
      type: "bgm",
      name: "Nhạc Nền (BGM)",
      icon: "🎵",
      color: "from-purple-500/30 to-purple-600/30 border-purple-500/50",
      isMuted: false,
      isHidden: false,
      isLocked: false,
      clips: [],
    },
  ],
  subtitleStyle: {
    fontFamily: "Montserrat",
    fontSize: 54,
    baseColor: "#FFF8E7",
    highlightColor: "#FFD200",
    outlineColor: "#000000",
    outlineWidth: 5,
    animation: "smooth",
    position: "middle-bottom",
  },
  watermark: {
    enabled: false,
    text: "",
    position: "bottom-center",
    size: 28,
    opacity: 0.85,
  },
  backgroundSetting: {
    enabled: false,
    mode: "replace",
    dim: 0.35,
    src: "",
  },
};

function StudioProContent() {
  const searchParams = useSearchParams();
  const videoParam = searchParams?.get("video") || "";

  // --- STATE DỰ ÁN & QUẢN LÝ ---
  const [project, setProject] = useState<StudioProject>(INITIAL_PROJECT);
  const [savedProjectsList, setSavedProjectsList] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("Đã lưu tự động");

  // --- TRẠNG THÁI TIMELINE & PHÁT ---
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(40); // 40px mỗi giây
  const [selectedClipId, setSelectedClipId] = useState<string | null>("sub_1");
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>("track_sub");
  const [isLoop, setIsLoop] = useState<boolean>(false);

  // --- SIDEBAR TABS ---
  const [activeTab, setActiveTab] = useState<"media" | "subtitle" | "silence" | "voiceover" | "effects" | "stock" | "projects">("media");

  // --- KÍCH THƯỚC & ẨN/HIỆN CÁC PANEL (SIDEBAR, INSPECTOR, TIMELINE) ---
  const [sidebarWidth, setSidebarWidth] = useState<number>(320); // min: 220, max: 600
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const [inspectorWidth, setInspectorWidth] = useState<number>(310); // min: 220, max: 550
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState<boolean>(false);

  const [timelineHeight, setTimelineHeight] = useState<number>(260); // min: 110, max: 550
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState<boolean>(false);

  // Trạng thái đang kéo resize panel
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Kéo thay đổi độ rộng Sidebar (Trái)
  const handleStartResizeSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextW = Math.max(220, Math.min(600, startW + deltaX));
      setSidebarWidth(nextW);
      if (isSidebarCollapsed) setIsSidebarCollapsed(false);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Kéo thay đổi độ rộng Inspector (Phải)
  const handleStartResizeInspector = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = inspectorWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX; // Kéo sang trái là tăng độ rộng
      const nextW = Math.max(220, Math.min(550, startW + deltaX));
      setInspectorWidth(nextW);
      if (isInspectorCollapsed) setIsInspectorCollapsed(false);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Kéo thay đổi độ cao Timeline (Dưới)
  const handleStartResizeTimeline = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startH = timelineHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY; // Kéo lên trên là tăng chiều cao
      const nextH = Math.max(120, Math.min(550, startH + deltaY));
      setTimelineHeight(nextH);
      if (isTimelineCollapsed) setIsTimelineCollapsed(false);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // --- MEDIA SOURCES TỪ HỆ THỐNG ---
  const [availableVideos, setAvailableVideos] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // --- THÔNG BÁO TIẾN TRÌNH RENDER ---
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // --- REFS ---
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const anchorTimeRef = useRef<{ perf: number; video: number } | null>(null);

  // Lấy clip đang chọn
  const selectedClip = React.useMemo(() => {
    if (!selectedClipId) return null;
    for (const t of project.tracks) {
      const c = t.clips.find((item) => item.id === selectedClipId);
      if (c) return c;
    }
    return null;
  }, [project, selectedClipId]);

  // Lấy track đang chọn
  const selectedTrack = React.useMemo(() => {
    if (selectedClip) {
      return project.tracks.find((t) => t.id === selectedClip.trackId) || null;
    }
    if (selectedTrackId) {
      return project.tracks.find((t) => t.id === selectedTrackId) || null;
    }
    return null;
  }, [project, selectedClip, selectedTrackId]);

  // Load danh sách video và uploads từ API (CHỈ LẤY FILE VIDEO, TUYỆT ĐỐI KHÔNG LẤY JSON, MP3)
  const fetchAvailableMedia = async () => {
    try {
      setIsLoadingMedia(true);
      const [vidsRes, stocksRes] = await Promise.all([
        fetch("/api/videos").catch(() => null),
        fetch("/api/upload-stock?type=video").catch(() => null),
      ]);

      const vidsData = vidsRes && vidsRes.ok ? await vidsRes.json() : { videos: [] };
      const stocksData = stocksRes && stocksRes.ok ? await stocksRes.json() : { files: [] };

      // Bộ lọc nhận diện file video thực thụ (.mp4, .webm, .mov, .mkv)
      const isVideoFile = (f: any) => {
        const name = (f?.filename || f?.name || f?.title || f?.url || "").toLowerCase();
        if (
          name.endsWith(".json") ||
          name.endsWith(".mp3") ||
          name.endsWith(".wav") ||
          name.endsWith(".ogg") ||
          name.endsWith(".m4a") ||
          name.endsWith(".aac")
        ) {
          return false;
        }
        return name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov") || name.endsWith(".mkv");
      };

      const all = [
        ...(vidsData.videos || []).map((v: any) => ({ ...v, source: "output" })),
        ...(stocksData.files || []).map((s: any) => ({
          filename: s.name,
          title: s.displayName || s.name,
          url: s.previewUrl || `/api/upload-stock?stream=1&filename=${encodeURIComponent(s.name)}`,
          sizeFormatted: s.sizeFormatted,
          duration: s.duration || 0,
          source: "stock-uploads",
        })),
      ].filter(isVideoFile);

      // Kho Video & Stock CHỈ lưu các file video thực thụ
      setAvailableVideos(all);

      // Tự động đồng bộ thời lượng các clip trên timeline với thời lượng file thực tế nếu có
      setProject((prev) => {
        let changed = false;
        const updatedTracks = prev.tracks.map((t) => {
          if (t.type === "main-video") {
            const updatedClips = t.clips.map((c) => {
              const matchMedia = all.find(
                (m) => m.url === c.src || m.filename === c.name || c.name.includes(m.title)
              );
              if (matchMedia && matchMedia.duration && matchMedia.duration > 0) {
                if (c.duration === 25.0 || c.duration === 8.0 || Math.abs(c.duration - matchMedia.duration) > 0.5) {
                  changed = true;
                  return {
                    ...c,
                    duration: matchMedia.duration,
                    outPoint: c.inPoint + matchMedia.duration,
                  };
                }
              }
              return c;
            });
            return { ...t, clips: updatedClips };
          }
          return t;
        });

        if (changed) {
          const maxEnd = Math.max(
            ...updatedTracks.flatMap((tr) => tr.clips.map((cl) => cl.start + cl.duration)),
            25.0
          );
          return {
            ...prev,
            duration: Number(maxEnd.toFixed(2)),
            tracks: updatedTracks,
          };
        }
        return prev;
      });

      const actualVideos = all;

      // Chỉ khi người dùng truyền tham số videoParam trên URL (?video=...) thì mới tự động gán video
      if (videoParam && actualVideos.length > 0) {
        const cleanParam = decodeURIComponent(videoParam).trim();
        const matched =
          actualVideos.find(
            (v) =>
              v.filename === cleanParam ||
              v.filename === `${cleanParam}.mp4` ||
              v.title.toLowerCase() === cleanParam.toLowerCase()
          ) || actualVideos[0];

        const matchedDuration = matched.duration > 0 ? matched.duration : 25.0;

        setProject((prev) => {
          const videoTrack = prev.tracks.find((t) => t.type === "main-video");
          if (!videoTrack || videoTrack.clips.length > 0) return prev;

          const updated = prev.tracks.map((t) =>
            t.id === videoTrack.id
              ? {
                  ...t,
                  clips: [
                    {
                      id: `clip_${Date.now()}`,
                      trackId: t.id,
                      type: "video" as const,
                      name: matched.title,
                      src: matched.url,
                      start: 0,
                      duration: matchedDuration,
                      inPoint: 0,
                      outPoint: matchedDuration,
                      speed: 1.0,
                      volume: 1.0,
                      colorFilter: "none",
                    },
                  ],
                }
              : t
          );
          return {
            ...prev,
            duration: Math.max(matchedDuration, prev.duration),
            name: `Biên Tập: ${matched.title}`,
            tracks: updated,
          };
        });
      }
    } catch (err) {
      console.error("Lỗi fetch media:", err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Tạo dự án mới (xóa trắng các track trên timeline để bắt đầu từ đầu)
  const handleNewProject = () => {
    if (confirm("Bạn có muốn tạo dự án mới (xóa trắng toàn bộ timeline) không?")) {
      try {
        localStorage.removeItem("studio_pro_draft_v1");
      } catch {}
      setProject({
        ...INITIAL_PROJECT,
        id: `proj_${Date.now()}`,
        name: "Dự Án Video Mới",
      });
      setSelectedClipId(null);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  // Tải danh sách project
  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/studio/projects");
      if (res.ok) {
        const data = await res.json();
        setSavedProjectsList(data.projects || []);
      }
    } catch {}
  };

  // Lưu dự án hiện tại
  const handleSaveProject = async () => {
    try {
      setIsSaving(true);
      setSaveStatus("Đang lưu...");
      const res = await fetch("/api/studio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      if (res.ok) {
        setSaveStatus("Đã lưu vào máy");
        await fetchProjects();
      } else {
        setSaveStatus("Lỗi lưu dự án");
      }
    } catch {
      setSaveStatus("Lỗi lưu");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus("Đã lưu tự động"), 3000);
    }
  };

  // --- TÍNH NĂNG GIAI ĐOẠN 3: 1. AUTO SUBTITLE (WHISPER STT) ---
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [subtitleLanguage, setSubtitleLanguage] = useState("vi");
  const [wordsPerChunk, setWordsPerChunk] = useState(4);
  const [sttStatusMessage, setSttStatusMessage] = useState<string | null>(null);

  const handleAutoSubtitle = async () => {
    const activeVideoTrack = project.tracks.find((t) => t.type === "main-video");
    const activeVoiceTrack = project.tracks.find((t) => t.type === "voiceover");
    const targetSource =
      (activeVoiceTrack && activeVoiceTrack.clips[0]?.src) ||
      (activeVideoTrack && activeVideoTrack.clips[0]?.src) ||
      (availableVideos[0]?.url) ||
      "";

    if (!targetSource) {
      alert("Chưa có video hoặc âm thanh nào trong timeline để nhận diện phụ đề. Vui lòng thêm video trước!");
      return;
    }

    try {
      setIsTranscribing(true);
      setSttStatusMessage("Đang trích xuất audio & nhận diện phụ đề từng từ...");

      const res = await fetch("/api/studio/auto-subtitle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: targetSource,
          language: subtitleLanguage,
          wordsPerChunk: wordsPerChunk,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể nhận diện phụ đề");

      if (Array.isArray(data.chunks) && data.chunks.length > 0) {
        const newSubtitleClips: TimelineClip[] = data.chunks.map((chk: any) => ({
          id: `sub_${Date.now()}_${chk.id}`,
          trackId: "track_sub",
          type: "subtitle" as const,
          name: chk.text,
          start: chk.start,
          duration: chk.duration,
          inPoint: 0,
          outPoint: chk.duration,
          speed: 1.0,
          volume: 1.0,
          text: chk.text,
          words: chk.words,
        }));

        setProject((prev) => {
          const maxEnd = data.chunks[data.chunks.length - 1].end;
          const updatedDuration = Math.max(prev.duration, maxEnd + 1.0);

          return {
            ...prev,
            duration: updatedDuration,
            tracks: prev.tracks.map((t) =>
              t.id === "track_sub"
                ? { ...t, clips: newSubtitleClips }
                : t
            ),
          };
        });

        setSelectedClipId(newSubtitleClips[0].id);
        setSelectedTrackId("track_sub");
        setSttStatusMessage(
          `✓ Tạo thành công ${data.chunksCount} câu phụ đề (${data.totalWords} từ) qua ${data.provider}!`
        );
      } else {
        setSttStatusMessage("Không tìm thấy lời nói trong đoạn video này.");
      }
    } catch (err: any) {
      alert(`Lỗi STT: ${err.message}`);
      setSttStatusMessage(null);
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- TÍNH NĂNG GIAI ĐOẠN 3: 2. XÓA KHOẢNG LẶNG (SMART SILENCE REMOVAL) ---
  const [isScanningSilence, setIsScanningSilence] = useState(false);
  const [silenceThreshold, setSilenceThreshold] = useState(-32); // dB
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.35); // Giây
  const [silenceResult, setSilenceResult] = useState<any | null>(null);
  const [silenceCutApplied, setSilenceCutApplied] = useState(false);

  const handleScanSilence = async () => {
    const activeVideoTrack = project.tracks.find((t) => t.type === "main-video");
    const activeVoiceTrack = project.tracks.find((t) => t.type === "voiceover");
    const targetSource =
      (activeVoiceTrack && activeVoiceTrack.clips[0]?.src) ||
      (activeVideoTrack && activeVideoTrack.clips[0]?.src) ||
      (availableVideos[0]?.url) ||
      "";

    if (!targetSource) {
      alert("Chưa có video hoặc âm thanh nào trong timeline để phân tích khoảng lặng!");
      return;
    }

    try {
      setIsScanningSilence(true);
      setSilenceCutApplied(false);

      const res = await fetch("/api/studio/detect-silence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: targetSource,
          noiseThreshold: silenceThreshold,
          minDuration: minSilenceDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể phân tích khoảng lặng");

      setSilenceResult(data);
    } catch (err: any) {
      alert(`Lỗi phân tích: ${err.message}`);
    } finally {
      setIsScanningSilence(false);
    }
  };

  // Áp dụng Cắt Khoảng Lặng & Dồn Nhịp (Smart Jump-Cut)
  const handleApplySilenceCut = () => {
    if (!silenceResult || !Array.isArray(silenceResult.audibleSegments) || silenceResult.audibleSegments.length === 0) {
      alert("Không có phân đoạn âm thanh hợp lệ để cắt!");
      return;
    }

    const videoTrack = project.tracks.find((t) => t.type === "main-video");
    if (!videoTrack || videoTrack.clips.length === 0) {
      alert("Cần có ít nhất 1 clip trên Track Video Chính để áp dụng Smart Cut!");
      return;
    }

    const baseClip = videoTrack.clips[0];
    let curTimelineStart = 0;

    const newClips: TimelineClip[] = silenceResult.audibleSegments.map((seg: any, idx: number) => {
      const clip: TimelineClip = {
        ...baseClip,
        id: `clip_cut_${idx}_${Date.now()}`,
        name: `Đoạn ${idx + 1} (${seg.duration}s)`,
        start: Number(curTimelineStart.toFixed(2)),
        duration: Number(seg.duration),
        inPoint: Number(seg.start),
        outPoint: Number(seg.end),
      };
      curTimelineStart += seg.duration;
      return clip;
    });

    setProject((prev) => ({
      ...prev,
      duration: Number(silenceResult.totalAudibleDuration.toFixed(2)),
      tracks: prev.tracks.map((t) => (t.id === videoTrack.id ? { ...t, clips: newClips } : t)),
    }));

    setSilenceCutApplied(true);
    handleSeek(0);
  };

  // --- TÍNH NĂNG GIAI ĐOẠN 4: 1. AI VOICEOVER TRỰC TIẾP (CIT VOICE STUDIO CLONE) ---
  const [voiceoverText, setVoiceoverText] = useState("");
  const [voiceoverVoice, setVoiceoverVoice] = useState("Hải Đăng");
  const [voiceoverProvider, setVoiceoverProvider] = useState<"vieneu" | "supertonic" | "edge">("vieneu");
  const [voiceoverSpeed, setVoiceoverSpeed] = useState(1.0);
  const [voiceoverTemperature, setVoiceoverTemperature] = useState(0.7);
  const [voiceoverSeed, setVoiceoverSeed] = useState<string>("");
  const [voiceoverUseDict, setVoiceoverUseDict] = useState(true);
  const [voiceoverFormat, setVoiceoverFormat] = useState<"mp3" | "wav">("mp3");
  const [voiceoverLanguage, setVoiceoverLanguage] = useState<string>("vi");
  const [showAdvancedVoiceSettings, setShowAdvancedVoiceSettings] = useState(false);

  // Danh sách giọng đọc & thông tin CIT Voice Studio
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [isFetchingVoices, setIsFetchingVoices] = useState(false);
  const [citServerInfo, setCitServerInfo] = useState<{
    online: boolean;
    engine: string;
    sample_rate: number;
    device: string;
    backend: string;
    supports_cloning: boolean;
    languages: Array<{ code: string; name: string }>;
  } | null>(null);

  // Bộ lọc danh sách giọng đọc
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("");
  const [voiceEngineFilter, setVoiceEngineFilter] = useState<"all" | "vieneu" | "supertonic" | "edge">("all");
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<"all" | "male" | "female">("all");
  const [voiceRegionFilter, setVoiceRegionFilter] = useState<"all" | "North" | "Central" | "South" | "International">("all");
  const [voiceStyleFilter, setVoiceStyleFilter] = useState<"all" | "natural" | "news" | "story" | "reading">("all");
  const [voiceOnlyCloned, setVoiceOnlyCloned] = useState(false);

  // Audio Preview Player
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);

  // Tải danh sách giọng đọc từ server CIT Voice Studio
  const fetchVoices = async () => {
    try {
      setIsFetchingVoices(true);
      const res = await fetch("/api/voices");
      if (res.ok) {
        const data = await res.json();
        setAvailableVoices(data.voices || []);
        setCitServerInfo({
          online: data.online,
          engine: data.engine,
          sample_rate: data.sample_rate,
          device: data.device,
          backend: data.backend,
          supports_cloning: data.supports_cloning,
          languages: data.languages || [],
        });
      }
    } catch (err) {
      console.warn("Không thể tải danh sách voices:", err);
    } finally {
      setIsFetchingVoices(false);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  // Thêm thẻ cảm xúc hoặc thẻ khoảng nghỉ vào nội dung kịch bản
  const handleInsertEmotionTag = (tag: string) => {
    setVoiceoverText((prev) => `${prev.trim()} ${tag} `);
  };

  // Nghe thử giọng đọc (Preview không chèn vào timeline)
  const handlePreviewVoice = async () => {
    if (!voiceoverText.trim()) {
      alert("Vui lòng nhập nội dung câu thoại để nghe thử!");
      return;
    }

    try {
      setIsPreviewingVoice(true);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
      }

      const res = await fetch("/api/studio/ai-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceoverText,
          voice: voiceoverVoice,
          provider: voiceoverProvider,
          speed: voiceoverSpeed,
          temperature: voiceoverTemperature,
          seed: voiceoverSeed ? parseInt(voiceoverSeed, 10) : undefined,
          use_pronunciation_dict: voiceoverUseDict,
          format: voiceoverFormat,
          language: voiceoverLanguage,
          previewOnly: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi nghe thử giọng AI");

      setPreviewAudioUrl(data.audioUrl);
      setPreviewDuration(data.duration);
      setPreviewCurrentTime(0);

      // Tự động phát âm thanh vừa sinh
      setTimeout(() => {
        if (previewAudioRef.current) {
          previewAudioRef.current.src = data.audioUrl;
          previewAudioRef.current.play().then(() => setIsPreviewPlaying(true)).catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      alert(`Lỗi nghe thử: ${err.message}`);
    } finally {
      setIsPreviewingVoice(false);
    }
  };

  // Điều khiển phát / tạm dừng bản nghe thử
  const handleTogglePreviewPlay = () => {
    if (!previewAudioRef.current || !previewAudioUrl) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => setIsPreviewPlaying(true)).catch(() => {});
    }
  };

  // Tạo và chèn thẳng vào Timeline (cả Track Voiceover & Track Subtitle)
  const handleGenerateAndInsertVoice = async () => {
    if (!voiceoverText.trim()) {
      alert("Vui lòng nhập nội dung câu thoại!");
      return;
    }

    try {
      setIsGeneratingVoice(true);
      const res = await fetch("/api/studio/ai-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceoverText,
          voice: voiceoverVoice,
          provider: voiceoverProvider,
          speed: voiceoverSpeed,
          temperature: voiceoverTemperature,
          seed: voiceoverSeed ? parseInt(voiceoverSeed, 10) : undefined,
          use_pronunciation_dict: voiceoverUseDict,
          format: voiceoverFormat,
          language: voiceoverLanguage,
          previewOnly: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tạo giọng đọc AI");

      const voiceClip: TimelineClip = {
        id: `voice_${Date.now()}`,
        trackId: "track_voice",
        type: "audio",
        name: `Voice: ${data.text.slice(0, 24)}...`,
        src: data.audioUrl,
        start: Number(currentTime.toFixed(2)),
        duration: data.duration,
        inPoint: 0,
        outPoint: data.duration,
        speed: voiceoverSpeed,
        volume: 1.0,
      };

      const subClip: TimelineClip = {
        id: `sub_${Date.now()}`,
        trackId: "track_sub",
        type: "subtitle",
        name: data.text,
        start: Number(currentTime.toFixed(2)),
        duration: data.duration,
        inPoint: 0,
        outPoint: data.duration,
        speed: 1.0,
        volume: 1.0,
        text: data.text,
        words: Array.isArray(data.words)
          ? data.words.map((w: any) => ({
              ...w,
              start: Number((currentTime + w.start).toFixed(2)),
              end: Number((currentTime + w.end).toFixed(2)),
            }))
          : [],
      };

      setProject((prev) => {
        const nextDur = Math.max(prev.duration, currentTime + data.duration + 1.0);
        const updatedTracks = prev.tracks.map((t) => {
          if (t.id === "track_voice") {
            return { ...t, clips: [...t.clips, voiceClip] };
          }
          if (t.id === "track_sub") {
            return { ...t, clips: [...t.clips, subClip] };
          }
          return t;
        });

        return {
          ...prev,
          duration: Number(nextDur.toFixed(2)),
          tracks: updatedTracks,
        };
      });

      setSelectedClipId(voiceClip.id);
      setSelectedTrackId("track_voice");

      handleSeek(currentTime + data.duration + 0.3);
      alert(`Đã chèn giọng đọc AI (${data.duration}s) & phụ đề tương ứng vào Timeline!`);
    } catch (err: any) {
      alert(`Lỗi tạo Voiceover: ${err.message}`);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  // --- TÍNH NĂNG GIAI ĐOẠN 4: 2. STOCK VIDEO TRỰC TUYẾN (PEXELS / CURATED) ---
  const [stockQuery, setStockQuery] = useState("");
  const [stockCategory, setStockCategory] = useState("all");
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isImportingStockId, setIsImportingStockId] = useState<string | null>(null);

  const fetchStockMedia = async (q = stockQuery, cat = stockCategory) => {
    try {
      setIsLoadingStock(true);
      const res = await fetch(`/api/studio/stock-search?query=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}`);
      if (res.ok) {
        const data = await res.json();
        setStockItems(data.items || []);
      }
    } catch (err) {
      console.error("Lỗi tìm kiếm stock:", err);
    } finally {
      setIsLoadingStock(false);
    }
  };

  // Chọn video stock làm Background
  const handleUseStockAsBackground = (item: any) => {
    setProject((prev) => ({
      ...prev,
      backgroundSetting: {
        enabled: true,
        mode: "replace",
        dim: 0.35,
        src: item.previewUrl,
      },
    }));
    alert(`Đã đặt "${item.title}" làm Video Nền dự án!`);
  };

  // Tải stock về máy và chèn vào Timeline
  const handleDownloadAndInsertStock = async (item: any, targetTrackType: TrackType = "main-video") => {
    try {
      setIsImportingStockId(item.id);
      const res = await fetch("/api/studio/stock-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: item.previewUrl, title: item.title }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải video stock");

      const targetTrack = project.tracks.find((t) => t.type === targetTrackType);
      if (!targetTrack) return;

      const newClip: TimelineClip = {
        id: `stock_${Date.now()}`,
        trackId: targetTrack.id,
        type: "video",
        name: data.name || item.title,
        src: data.localUrl,
        start: currentTime,
        duration: item.duration || 10,
        inPoint: 0,
        outPoint: item.duration || 10,
        speed: 1.0,
        volume: 1.0,
        colorFilter: "none",
      };

      setProject((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) => (t.id === targetTrack.id ? { ...t, clips: [...t.clips, newClip] } : t)),
      }));

      await fetchAvailableMedia();
      alert(`Đã tải & chèn "${item.title}" vào Timeline thành công!`);
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsImportingStockId(null);
    }
  };

  // Auto-save local draft
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("studio_pro_draft_v1", JSON.stringify(project));
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [project]);

  useEffect(() => {
    // Khôi phục từ localStorage nếu có
    try {
      const draft = localStorage.getItem("studio_pro_draft_v1");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed && Array.isArray(parsed.tracks)) {
          // Tự động dọn dẹp các clip audio bị gán nhầm vào track video (ví dụ: voice-*.mp3)
          const isAudioExt = (urlOrName: string) => /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(urlOrName || "");
          parsed.tracks = parsed.tracks.map((t: any) => {
            if (t.type === "subtitle" || t.id === "track_sub") {
              // Tự động loại bỏ các clip phụ đề mẫu Ronaldo/Messi trước đây
              const cleanClips = (t.clips || []).filter(
                (c: any) =>
                  c.id !== "sub_1" &&
                  c.id !== "sub_2" &&
                  !c.text?.includes("Cristiano Ronaldo") &&
                  !c.text?.includes("Lionel Messi")
              );
              return { ...t, clips: cleanClips };
            }
            if (t.type === "overlay" || t.id === "track_overlay") {
              // Tự động loại bỏ watermark mẫu @PhiaSauSanCo
              const cleanClips = (t.clips || []).filter((c: any) => c.id !== "ov_1" && c.text !== "@PhiaSauSanCo");
              return { ...t, clips: cleanClips };
            }
            if (t.type === "main-video" || t.id === "track_video") {
              const validClips = (t.clips || []).filter((c: any) => !isAudioExt(c.src || c.name)).map((c: any) => {
                if (
                  (c.name?.includes("yeu-lay-ngay-bat-luc") || c.src?.includes("yeu-lay-ngay-bat-luc")) &&
                  (c.duration === 25.0 || c.duration === 8.0)
                ) {
                  return { ...c, duration: 50.54, outPoint: 50.54 };
                }
                return c;
              });
              return { ...t, clips: validClips };
            }
            return t;
          });
          if (parsed.watermark?.text === "@PhiaSauSanCo") {
            parsed.watermark.text = "";
            parsed.watermark.enabled = false;
          }
          const hasYeuLayVideo = parsed.tracks?.some((t: any) =>
            t.clips?.some((c: any) => c.name?.includes("yeu-lay-ngay-bat-luc") || c.src?.includes("yeu-lay-ngay-bat-luc"))
          );
          if (hasYeuLayVideo && (parsed.duration === 25.0 || parsed.duration === 51.0)) {
            parsed.duration = 50.54;
          }
          setProject(parsed);
        }
      }
    } catch {}

    fetchAvailableMedia();
    fetchProjects();
    fetchStockMedia();
  }, []);

  // --- MASTER CLOCK: ĐIỀU KHIỂN PHÁT & TICKER ---
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Tự động nhận diện thời lượng video thực tế từ file và cập nhật timeline
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoEl = e.currentTarget;
    const realDur = videoEl.duration;
    if (!realDur || isNaN(realDur) || !isFinite(realDur)) return;

    const roundedDur = Number(realDur.toFixed(2));

    setProject((prev) => {
      const updatedTracks = prev.tracks.map((t) => {
        if (t.type === "main-video") {
          const updatedClips = t.clips.map((c) => {
            // Cập nhật clip video chính khớp chính xác với video thực tế
            if (
              c.src === videoEl.src ||
              c.src === videoEl.currentSrc ||
              videoEl.src.includes(c.name) ||
              videoEl.currentSrc.includes(c.name) ||
              t.clips.length === 1 // Nếu chỉ có 1 clip duy nhất trên track
            ) {
              return {
                ...c,
                duration: roundedDur,
                outPoint: c.inPoint + roundedDur,
              };
            }
            return c;
          });
          return { ...t, clips: updatedClips };
        }
        return t;
      });

      // Duration của project phải khớp đúng với video thực tế (hoặc clip dài nhất trên timeline)
      const maxClipEnd = Math.max(
        roundedDur,
        ...updatedTracks.flatMap((tr) => tr.clips.map((cl) => cl.start + cl.duration))
      );
      const newDur = Number(maxClipEnd.toFixed(2));

      return {
        ...prev,
        duration: newDur,
        tracks: updatedTracks,
      };
    });
  };

  const togglePlay = () => {
    anchorTimeRef.current = null;
    if (!isPlaying) {
      // Nếu playhead đang ở cuối video, tự động tua về 0 trước khi phát
      let startTime = currentTime;
      if (startTime >= project.duration - 0.2) {
        startTime = 0;
        handleSeek(0);
      }

      if (mainVideoRef.current) {
        const videoTrack = project.tracks.find((t) => t.type === "main-video");
        const activeClip = videoTrack?.clips.find(
          (c) => startTime >= c.start && startTime <= c.start + c.duration
        ) || videoTrack?.clips[0];

        if (activeClip) {
          const targetOffset = activeClip.inPoint + (startTime - activeClip.start) * (activeClip.speed || 1.0);
          mainVideoRef.current.currentTime = Math.max(0, targetOffset);
        } else {
          mainVideoRef.current.currentTime = startTime;
        }

        // Bắt đầu phát trực tiếp trong sự kiện click người dùng (tránh autoplay block)
        mainVideoRef.current.play().catch((err) => {
          console.warn("Autoplay with audio blocked, trying muted:", err);
          if (mainVideoRef.current) {
            mainVideoRef.current.muted = true;
            mainVideoRef.current.play().catch(() => {});
          }
        });
      }

      if (bgVideoRef.current) bgVideoRef.current.play().catch(() => {});
      if (bgmAudioRef.current) bgmAudioRef.current.play().catch(() => {});

      setIsPlaying(true);
    } else {
      if (mainVideoRef.current) mainVideoRef.current.pause();
      if (bgVideoRef.current) bgVideoRef.current.pause();
      if (bgmAudioRef.current) bgmAudioRef.current.pause();
      if (voiceAudioRef.current) voiceAudioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (newTime: number) => {
    anchorTimeRef.current = null;
    const clamped = Math.max(0, Math.min(project.duration, newTime));
    setCurrentTime(clamped);

    // Đồng bộ phần cứng video chính
    if (mainVideoRef.current) {
      const videoTrack = project.tracks.find((t) => t.type === "main-video");
      const activeClip = videoTrack?.clips.find(
        (c) => clamped >= c.start && clamped <= c.start + c.duration
      ) || videoTrack?.clips[0];

      if (activeClip) {
        const offset = activeClip.inPoint + (clamped - activeClip.start) * (activeClip.speed || 1.0);
        mainVideoRef.current.currentTime = Math.max(0, offset);
      } else {
        mainVideoRef.current.currentTime = clamped;
      }
    }

    if (bgVideoRef.current) {
      bgVideoRef.current.currentTime = clamped;
    }
    if (bgmAudioRef.current) {
      bgmAudioRef.current.currentTime = clamped;
    }

    if (voiceAudioRef.current) {
      const trackVoice = project.tracks.find((t) => t.type === "voiceover");
      const activeVoiceClip = trackVoice?.clips.find(
        (c) => clamped >= c.start && clamped <= c.start + c.duration
      );
      if (activeVoiceClip && activeVoiceClip.src) {
        if (voiceAudioRef.current.src !== activeVoiceClip.src) {
          voiceAudioRef.current.src = activeVoiceClip.src;
        }
        voiceAudioRef.current.currentTime = Math.max(0, clamped - activeVoiceClip.start);
      } else {
        voiceAudioRef.current.currentTime = 0;
        voiceAudioRef.current.pause();
      }
    }
  };

  // Vòng lặp phát mượt mà qua requestAnimationFrame & khóa cứng với clock phần cứng video
  useEffect(() => {
    const trackVoice = project.tracks.find((t) => t.type === "voiceover");
    const activeVoiceClip = trackVoice?.clips.find(
      (c) => currentTimeRef.current >= c.start && currentTimeRef.current <= c.start + c.duration
    );

    if (!isPlaying) {
      anchorTimeRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mainVideoRef.current) mainVideoRef.current.pause();
      if (bgVideoRef.current) bgVideoRef.current.pause();
      if (bgmAudioRef.current) bgmAudioRef.current.pause();
      if (voiceAudioRef.current) voiceAudioRef.current.pause();
      return;
    }

    // Bắt đầu phát các media từ đúng vị trí currentTime
    if (mainVideoRef.current) {
      const videoTrack = project.tracks.find((t) => t.type === "main-video");
      const activeClip = videoTrack?.clips.find(
        (c) => currentTimeRef.current >= c.start && currentTimeRef.current <= c.start + c.duration
      ) || videoTrack?.clips[0];

      if (activeClip) {
        const targetTime = activeClip.inPoint + (currentTimeRef.current - activeClip.start) * (activeClip.speed || 1.0);
        if (Math.abs(mainVideoRef.current.currentTime - targetTime) > 0.1) {
          mainVideoRef.current.currentTime = Math.max(0, targetTime);
        }
      }
      mainVideoRef.current.play().catch(() => {});
    }

    if (bgVideoRef.current) bgVideoRef.current.play().catch(() => {});
    if (bgmAudioRef.current) bgmAudioRef.current.play().catch(() => {});

    // Đồng bộ âm thanh Voiceover AI
    if (voiceAudioRef.current) {
      if (activeVoiceClip && activeVoiceClip.src && !trackVoice?.isHidden && !trackVoice?.isMuted) {
        if (voiceAudioRef.current.src !== activeVoiceClip.src) {
          voiceAudioRef.current.src = activeVoiceClip.src;
        }
        const offset = Math.max(0, currentTimeRef.current - activeVoiceClip.start);
        if (Math.abs(voiceAudioRef.current.currentTime - offset) > 0.2) {
          voiceAudioRef.current.currentTime = offset;
        }
        voiceAudioRef.current.play().catch(() => {});
      } else {
        voiceAudioRef.current.pause();
      }
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const videoTrack = project.tracks.find((t) => t.type === "main-video");
      const hasMainVideo = videoTrack && videoTrack.clips.length > 0;

      // 1. Nếu có video chính trên timeline, khóa chặt theo video phần cứng
      if (hasMainVideo && mainVideoRef.current) {
        // Nếu video đã kết thúc, DỪNG LẠI NGAY LẬP TỨC (không cho chạy quá ra khỏi video!)
        if (mainVideoRef.current.ended) {
          if (isLoop) {
            handleSeek(0);
            if (mainVideoRef.current) mainVideoRef.current.play().catch(() => {});
          } else {
            setIsPlaying(false);
            setCurrentTime(project.duration);
          }
          return;
        }

        if (!mainVideoRef.current.paused) {
          const videoTime = mainVideoRef.current.currentTime;
          const activeClip = videoTrack.clips.find(
            (c) => currentTimeRef.current >= c.start && currentTimeRef.current <= c.start + c.duration
          ) || videoTrack.clips[0];

          const actualCalculated = activeClip
            ? activeClip.start + (videoTime - activeClip.inPoint) / (activeClip.speed || 1.0)
            : videoTime;

          if (!anchorTimeRef.current) {
            anchorTimeRef.current = { perf: now, video: actualCalculated };
          }

          // Nội suy mượt mà 60fps từng mili-giây qua hardware monotonic clock
          const elapsedSec = (now - anchorTimeRef.current.perf) / 1000;
          let calculatedTime = anchorTimeRef.current.video + elapsedSec * (activeClip?.speed || 1.0);

          // Nếu video thật bị lệch quá 50ms (do buffer, seek hoặc drop frame), nhẹ nhàng kéo anchor về lại
          if (Math.abs(calculatedTime - actualCalculated) > 0.05) {
            anchorTimeRef.current = { perf: now, video: actualCalculated };
            calculatedTime = actualCalculated;
          }

          // TUYỆT ĐỐI DỪNG LẠI KHI HẾT CLIP VIDEO (Không bao giờ chạy quá ra khỏi video!)
          if (calculatedTime >= project.duration) {
            if (isLoop) {
              handleSeek(0);
              if (mainVideoRef.current) mainVideoRef.current.play().catch(() => {});
            } else {
              setIsPlaying(false);
              setCurrentTime(project.duration);
              if (mainVideoRef.current) mainVideoRef.current.pause();
            }
            return;
          }

          setCurrentTime(calculatedTime);
          lastTimeRef.current = now;

          // Tự động cuộn timeline theo Playhead (Auto-scroll) để kim không bị chạy mất tích
          if (timelineScrollRef.current) {
            const needleX = calculatedTime * zoomLevel;
            const container = timelineScrollRef.current;
            const visibleRight = container.scrollLeft + container.clientWidth;
            if (needleX > visibleRight - 80 || needleX < container.scrollLeft) {
              container.scrollLeft = Math.max(0, needleX - 120);
            }
          }
        }
      } else {
        // 2. Timeline không có video (hoặc video đang tạm dừng):
        const deltaSec = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setCurrentTime((prev) => {
          const next = prev + deltaSec;
          if (next >= project.duration) {
            if (isLoop) {
              handleSeek(0);
              return 0;
            } else {
              setIsPlaying(false);
              return project.duration;
            }
          }
          return next;
        });

        // Tự động cuộn timeline theo Playhead
        if (timelineScrollRef.current) {
          const needleX = currentTimeRef.current * zoomLevel;
          const container = timelineScrollRef.current;
          const visibleRight = container.scrollLeft + container.clientWidth;
          if (needleX > visibleRight - 80 || needleX < container.scrollLeft) {
            container.scrollLeft = Math.max(0, needleX - 120);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isLoop, project.duration]);

  // Phím tắt bàn phím chuẩn NLE (Space: Play/Pause, S: Split, Delete: Xóa)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu đang gõ trong input / textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyS") {
        e.preventDefault();
        handleSplitClipAtPlayhead();
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleSeek(currentTime - (e.shiftKey ? 1.0 : 0.1));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleSeek(currentTime + (e.shiftKey ? 1.0 : 0.1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, selectedClipId, project]);

  // --- CÁC THAO TÁC BIÊN TẬP TIMELINE ---

  // 1. Cắt đôi clip tại vị trí con trỏ Playhead (Split / Razor Tool - Phím tắt S)
  const handleSplitClipAtPlayhead = () => {
    let clipToSplit = selectedClip;

    // Nếu clip đang chọn không chứa con trỏ Playhead, tìm clip nằm dưới con trỏ Playhead
    if (!clipToSplit || currentTime <= clipToSplit.start || currentTime >= clipToSplit.start + clipToSplit.duration) {
      const priorityTracks = [
        selectedTrackId,
        "track_video",
        "track_voice",
        "track_sub",
        "track_overlay",
        "track_bg",
        "track_bgm",
      ].filter(Boolean) as string[];

      for (const tId of priorityTracks) {
        const tr = project.tracks.find((t) => t.id === tId);
        if (!tr) continue;
        const found = tr.clips.find((c) => currentTime > c.start && currentTime < c.start + c.duration);
        if (found) {
          clipToSplit = found;
          break;
        }
      }
    }

    if (!clipToSplit) {
      alert("Vui lòng đặt con trỏ Playhead lên đoạn clip muốn cắt (hoặc bấm chọn clip trước)!");
      return;
    }

    const clip = clipToSplit;
    const firstHalfDuration = Number((currentTime - clip.start).toFixed(2));
    const secondHalfDuration = Number((clip.duration - firstHalfDuration).toFixed(2));

    if (firstHalfDuration < 0.1 || secondHalfDuration < 0.1) {
      alert("Vị trí cắt quá sát mép clip!");
      return;
    }

    const clipA: TimelineClip = {
      ...clip,
      id: `${clip.id}_p1_${Date.now()}`,
      duration: firstHalfDuration,
      outPoint: clip.inPoint + firstHalfDuration,
    };

    const clipB: TimelineClip = {
      ...clip,
      id: `${clip.id}_p2_${Date.now()}`,
      start: Number(currentTime.toFixed(2)),
      duration: secondHalfDuration,
      inPoint: clip.inPoint + firstHalfDuration,
      name: `${clip.name} (Đoạn 2)`,
    };

    setProject((prev) => {
      const updatedTracks = prev.tracks.map((t) => {
        if (t.id === clip.trackId) {
          const newClips = t.clips.flatMap((c) => (c.id === clip.id ? [clipA, clipB] : [c]));
          return { ...t, clips: newClips };
        }
        return t;
      });
      return { ...prev, tracks: updatedTracks };
    });

    setSelectedClipId(clipB.id);
    setSelectedTrackId(clip.trackId);
  };

  // 2. Xóa clip khỏi timeline
  const handleDeleteClip = (clipId: string) => {
    setProject((prev) => {
      const updated = prev.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      }));
      return { ...prev, tracks: updated };
    });
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  };

  // 3. Kéo thả file trực tiếp vào trình duyệt (Drag & Drop)
  const handleDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload-stock", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const uploadedName = data.file?.displayName || data.name || file.name;
          const uploadedUrl = data.path || `/api/upload-stock?stream=1&filename=${encodeURIComponent(file.name)}`;

          // Tự động thêm vào timeline theo loại file
          const isAudio = file.type.startsWith("audio") || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name);
          const targetTrackType: TrackType = isAudio ? "bgm" : "main-video";

          setProject((prev) => {
            const targetTrack = prev.tracks.find((t) => t.type === targetTrackType);
            if (!targetTrack) return prev;

            const fileDuration = data.file?.duration || data.duration || 10.0;
            const newClip: TimelineClip = {
              id: `clip_${Date.now()}`,
              trackId: targetTrack.id,
              type: isAudio ? "audio" : "video",
              name: uploadedName,
              src: uploadedUrl,
              start: currentTime,
              duration: fileDuration,
              inPoint: 0,
              outPoint: fileDuration,
              speed: 1.0,
              volume: 1.0,
            };

            const updatedTracks = prev.tracks.map((t) =>
              t.id === targetTrack.id ? { ...t, clips: [...t.clips, newClip] } : t
            );
            const nextProjDur = Math.max(prev.duration, currentTime + fileDuration);
            return {
              ...prev,
              duration: Number(nextProjDur.toFixed(2)),
              tracks: updatedTracks,
            };
          });
        }
      } catch (err) {
        console.error("Lỗi tải file kéo thả:", err);
      }
    }

    await fetchAvailableMedia();
  };

  // Format giây thành mốc thời gian chuẩn MM:SS.cs
  const formatTimecode = (sec: number) => {
    const s = Math.max(0, sec || 0);
    const m = Math.floor(s / 60);
    const remainder = s % 60;
    const ss = Math.floor(remainder);
    const cs = Math.floor((remainder - ss) * 100);
    return `${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
  };

  // Xác định câu phụ đề đang active tại mốc thời gian hiện tại
  const activeSubtitle = React.useMemo(() => {
    const subTrack = project.tracks.find((t) => t.type === "subtitle" && !t.isHidden);
    if (!subTrack) return null;

    const clip = subTrack.clips.find((c) => currentTime >= c.start && currentTime <= c.start + c.duration);
    if (!clip) return null;

    return clip;
  }, [project, currentTime]);

  // Video chính đang active tại thời điểm currentTime (vẫn nhận diện clip khi track ẩn để đồng bộ clock video)
  const activeMainVideo = React.useMemo(() => {
    const videoTrack = project.tracks.find((t) => t.type === "main-video");
    if (!videoTrack) return null;
    return videoTrack.clips.find((c) => currentTime >= c.start && currentTime <= c.start + c.duration) || null;
  }, [project, currentTime]);

  // Clip video chính đại diện để mount thẻ <video> (luôn giữ thẻ video trong DOM để tải metadata và điều khiển clock)
  const primaryMainVideo = React.useMemo(() => {
    if (activeMainVideo) return activeMainVideo;
    const videoTrack = project.tracks.find((t) => t.type === "main-video");
    if (!videoTrack || videoTrack.clips.length === 0) return null;
    return videoTrack.clips[0];
  }, [activeMainVideo, project]);

  // Filter CSS của clip video đang active
  const activeFilterCss = React.useMemo(() => {
    if (!activeMainVideo || !activeMainVideo.colorFilter) return "none";
    const found = COLOR_FILTERS.find((f) => f.id === activeMainVideo.colorFilter);
    return found ? found.css : "none";
  }, [activeMainVideo]);

  // Lọc danh sách giọng đọc theo các tiêu chí tìm kiếm và filter
  const filteredVoices = React.useMemo(() => {
    return availableVoices.filter((v) => {
      // Search query
      if (voiceSearchQuery.trim()) {
        const q = voiceSearchQuery.toLowerCase();
        const matchName = (v.name || "").toLowerCase().includes(q) || (v.id || "").toLowerCase().includes(q);
        const matchDesc = (v.description || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      // Provider / Engine filter
      if (voiceEngineFilter !== "all" && v.provider !== voiceEngineFilter) {
        return false;
      }
      // Gender filter
      if (voiceGenderFilter !== "all" && v.gender !== voiceGenderFilter) {
        return false;
      }
      // Region filter
      if (voiceRegionFilter !== "all" && v.region !== voiceRegionFilter) {
        return false;
      }
      // Style filter
      if (voiceStyleFilter !== "all" && v.style !== voiceStyleFilter) {
        return false;
      }
      // Only cloned
      if (voiceOnlyCloned && !v.isCloned) {
        return false;
      }
      return true;
    });
  }, [availableVoices, voiceSearchQuery, voiceEngineFilter, voiceGenderFilter, voiceRegionFilter, voiceStyleFilter, voiceOnlyCloned]);

  // Thông tin chi tiết giọng đang được chọn
  const currentVoiceObj = React.useMemo(() => {
    return availableVoices.find((v) => v.id === voiceoverVoice) || null;
  }, [availableVoices, voiceoverVoice]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDropFiles}
      className="h-screen w-screen bg-[#05130E] text-[#EBF8F2] flex flex-col font-sans select-none overflow-hidden relative"
    >
      {/* OVERLAY HIỆU ỨNG KÉO THẢ TOÀN MÀN HÌNH */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#10B981]/20 backdrop-blur-md border-4 border-dashed border-[#FFD200] flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <Upload className="w-16 h-16 text-[#FFD200] animate-bounce mb-3" />
          <h2 className="text-xl font-black text-white uppercase tracking-wider drop-shadow">
            Thả file video hoặc âm thanh vào đây
          </h2>
          <p className="text-xs text-[#EBF8F2]/80 mt-1">
            Hỗ trợ MP4, MOV, WebM, MP3, WAV — tự động đưa vào timeline ngay lập tức
          </p>
        </div>
      )}

      {/* ================= 1. HEADER BAR NLE ================= */}
      <header className="h-12 bg-[#071912] border-b border-[#10B981]/25 px-4 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0E291E] hover:bg-[#143D2E] text-xs font-bold text-[#EBF8F2]/80 hover:text-white border border-[#10B981]/25 transition"
            title="Quay lại Thư viện video"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-white/10" />

          {/* Tên Dự Án Inline Editable */}
          <div className="flex items-center gap-2">
            <span className="text-sm">✂️</span>
            <input
              type="text"
              value={project.name}
              onChange={(e) => setProject({ ...project, name: e.target.value })}
              className="bg-transparent hover:bg-white/5 focus:bg-[#0E291E] px-2 py-0.5 rounded text-xs font-black text-white uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-[#FFD200] max-w-[220px]"
            />
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] font-mono font-bold">
              Timeline Pro
            </span>
          </div>

          <span className="text-[11px] text-[#EBF8F2]/40 font-mono hidden md:inline">
            • {saveStatus}
          </span>
        </div>

        {/* Thanh công cụ giữa: Tỉ lệ khung hình (Aspect Ratio) & Đổi timecode */}
        <div className="hidden lg:flex items-center space-x-2 bg-[#05130E] border border-[#10B981]/30 rounded-xl px-2 py-1">
          <button
            type="button"
            onClick={() => setProject({ ...project, aspectRatio: "9:16" })}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
              project.aspectRatio === "9:16"
                ? "bg-[#FFD200] text-[#081C15]"
                : "text-[#EBF8F2]/60 hover:text-white"
            }`}
          >
            9:16 (Reels/TikTok)
          </button>
          <button
            type="button"
            onClick={() => setProject({ ...project, aspectRatio: "16:9" })}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
              project.aspectRatio === "16:9"
                ? "bg-[#FFD200] text-[#081C15]"
                : "text-[#EBF8F2]/60 hover:text-white"
            }`}
          >
            16:9 (Ngang)
          </button>
          <button
            type="button"
            onClick={() => setProject({ ...project, aspectRatio: "1:1" })}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
              project.aspectRatio === "1:1"
                ? "bg-[#FFD200] text-[#081C15]"
                : "text-[#EBF8F2]/60 hover:text-white"
            }`}
          >
            1:1 (Vuông)
          </button>
        </div>

        {/* Action Buttons: Dự án mới, Lưu dự án & Render Xuất MP4 */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleNewProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E291E] hover:bg-[#143D2E] text-xs font-bold text-[#EBF8F2]/80 hover:text-[#FFD200] border border-[#10B981]/25 transition cursor-pointer"
            title="Tạo dự án mới (xóa trắng các track trên timeline)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dự Án Mới</span>
          </button>

          <button
            type="button"
            onClick={handleSaveProject}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E291E] hover:bg-[#143D2E] text-xs font-bold text-[#EBF8F2]/80 hover:text-white border border-[#10B981]/25 transition cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFD200]" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Lưu Dự Án</span>
          </button>

          <button
            type="button"
            onClick={() => {
              alert("Bắt đầu render timeline thành video MP4 hoàn chỉnh!");
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase tracking-wider hover:brightness-105 active:scale-95 shadow-md shadow-[#10B981]/25 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Xuất MP4</span>
          </button>
        </div>
      </header>

      {/* ================= 2. KHU VỰC TRUNG TÂM (WORKSPACE 3 CỘT) ================= */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ---------------- CỘT TRÁI: SIDEBAR CÔNG CỤ & ASSETS ---------------- */}
        {isSidebarCollapsed ? (
          <aside className="w-12 border-r border-[#10B981]/25 bg-[#071912] flex flex-col items-center py-2 shrink-0 space-y-2 z-20 select-none">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="p-2 rounded-xl bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] transition shadow"
              title="Mở rộng Sidebar (Click)"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <div className="w-6 h-px bg-[#10B981]/20 my-1" />
            {[
              { id: "media", label: "Media", icon: Film },
              { id: "stock", label: "Stock", icon: Globe },
              { id: "subtitle", label: "Phụ đề", icon: Sparkles },
              { id: "silence", label: "Cắt lọc", icon: Scissors },
              { id: "voiceover", label: "Voice", icon: Mic },
              { id: "effects", label: "Hiệu ứng", icon: Wand2 },
              { id: "projects", label: "Dự án", icon: FolderOpen },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsSidebarCollapsed(false);
                  }}
                  className={`p-2 rounded-xl transition flex flex-col items-center group relative ${
                    isActive
                      ? "bg-[#FFD200] text-[#081C15] shadow"
                      : "text-[#EBF8F2]/60 hover:text-white hover:bg-[#143D2E]"
                  }`}
                  title={`${item.label} (Click để mở panel)`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </aside>
        ) : (
          <aside
            style={{ width: `${sidebarWidth}px` }}
            className="border-r border-[#10B981]/25 bg-[#071912]/80 flex flex-col shrink-0 min-w-[220px] max-w-[600px] relative transition-none"
          >
            {/* Tab Bar Icons */}
            <div className="flex items-center justify-between border-b border-[#10B981]/20 bg-[#05130E]/60 text-xs">
              <div className="grid grid-cols-7 flex-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("media")}
                  className={`py-2 flex flex-col items-center justify-center transition border-b-2 ${
                    activeTab === "media"
                      ? "border-[#FFD200] text-[#FFD200] bg-[#143D2E]/40 font-bold"
                      : "border-transparent text-[#EBF8F2]/60 hover:text-white"
                  }`}
                  title="Thư viện Media & Tải lên"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span className="text-[8px] mt-0.5">Media</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("stock");
                    if (stockItems.length === 0) fetchStockMedia();
                  }}
                  className={`py-2 flex flex-col items-center justify-center transition border-b-2 ${
                    activeTab === "stock"
                      ? "border-[#FFD200] text-[#FFD200] bg-[#143D2E]/40 font-bold"
                      : "border-transparent text-[#EBF8F2]/60 hover:text-white"
                  }`}
                  title="Kho Stock Video 9:16 (Pexels / Curated)"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[8px] mt-0.5">Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("subtitle")}
                  className={`py-2 flex flex-col items-center justify-center transition border-b-2 ${
                    activeTab === "subtitle"
                      ? "border-[#FFD200] text-[#FFD200] bg-[#143D2E]/40 font-bold"
                      : "border-transparent text-[#EBF8F2]/60 hover:text-white"
                  }`}
                  title="Auto Subtitle (Word-by-word)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[8px] mt-0.5">Sub</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("silence")}
                  className={`py-2 flex flex-col items-center justify-center transition border-b-2 ${
                    activeTab === "silence"
                      ? "border-[#FFD200] text-[#FFD200] bg-[#143D2E]/40 font-bold"
                      : "border-transparent text-[#EBF8F2]/60 hover:text-white"
                  }`}
                  title="Xóa khoảng lặng thông minh"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span className="text-[8px] mt-0.5">Cut</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("voiceover")}
                  className={`py-2 flex flex-col items-center justify-center transition border-b-2 ${
                    activeTab === "voiceover"
                      ? "border-[#FFD200] text-[#FFD200] bg-[#143D2E]/40 font-bold"
                      : "border-transparent text-[#EBF8F2]/60 hover:text-white"
                  }`}
                  title="AI Voiceover trực tiếp"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="text-[8px] mt-0.5">Voice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("effects")}
                  className={`py-2 flex flex-col items-center justify-center transition border-b-2 ${
                    activeTab === "effects"
                      ? "border-[#FFD200] text-[#FFD200] bg-[#143D2E]/40 font-bold"
                      : "border-transparent text-[#EBF8F2]/60 hover:text-white"
                  }`}
                  title="Bộ lọc màu & Transitions"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="text-[8px] mt-0.5">Hiệu ứng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("projects")}
                  className={`py-2 flex flex-col items-center justify-center transition border-b-2 ${
                    activeTab === "projects"
                      ? "border-[#FFD200] text-[#FFD200] bg-[#143D2E]/40 font-bold"
                      : "border-transparent text-[#EBF8F2]/60 hover:text-white"
                  }`}
                  title="Quản lý dự án đã làm"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="text-[8px] mt-0.5">Dự án</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="px-2 py-2 text-[#EBF8F2]/40 hover:text-white hover:bg-[#143D2E] transition border-l border-[#10B981]/15"
                title="Thu gọn Sidebar"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* TAB 1: MEDIA UPLOADS & LIST */}
            {activeTab === "media" && (
              <div className="space-y-3 animate-in fade-in">
                {/* Khu vực Dropzone nhỏ */}
                <div className="p-3 border-2 border-dashed border-[#10B981]/40 rounded-xl bg-[#0E291E]/40 text-center hover:border-[#FFD200] transition cursor-pointer">
                  <Upload className="w-6 h-6 text-[#10B981] mx-auto mb-1" />
                  <div className="text-xs font-bold text-white">Kéo thả video/âm thanh vào đây</div>
                  <div className="text-[10px] text-[#EBF8F2]/50 mt-0.5">Hoặc bấm để chọn file từ máy tính</div>
                </div>

                {/* Danh sách clip có sẵn */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#FFD200] uppercase">
                    <span>Kho Video & Stock ({availableVideos.length})</span>
                    <button
                      type="button"
                      onClick={fetchAvailableMedia}
                      className="hover:text-white"
                      title="Làm mới"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingMedia ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                    {availableVideos.length === 0 ? (
                      <div className="text-center py-6 text-xs text-[#EBF8F2]/40">
                        Chưa có video nào. Kéo thả file vào để bắt đầu!
                      </div>
                    ) : (
                      availableVideos.map((v) => (
                        <div
                          key={v.filename}
                          className="p-2 rounded-xl bg-[#0E291E]/60 border border-[#10B981]/25 hover:border-[#FFD200]/50 transition group flex items-center justify-between"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="text-xs font-bold text-white truncate">{v.title}</div>
                            <div className="text-[10px] text-[#EBF8F2]/50 font-mono">
                              {v.sizeFormatted} • {v.duration && v.duration > 0 ? `${v.duration}s • ` : ""}{v.source === "stock-uploads" ? "Stock PC" : "Output"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              // Thêm vào track video chính
                              const targetTrack = project.tracks.find((t) => t.type === "main-video");
                              if (!targetTrack) return;
                              const clipDuration = v.duration && v.duration > 0 ? v.duration : 10.0;
                              const newClip: TimelineClip = {
                                id: `clip_${Date.now()}`,
                                trackId: targetTrack.id,
                                type: "video",
                                name: v.title,
                                src: v.url,
                                start: currentTime,
                                duration: clipDuration,
                                inPoint: 0,
                                outPoint: clipDuration,
                                speed: 1.0,
                                volume: 1.0,
                                colorFilter: "none",
                              };
                              const nextProjDur = Math.max(project.duration, currentTime + clipDuration);
                              setProject((prev) => ({
                                ...prev,
                                duration: Number(nextProjDur.toFixed(2)),
                                tracks: prev.tracks.map((t) =>
                                  t.id === targetTrack.id ? { ...t, clips: [...t.clips, newClip] } : t
                                ),
                              }));
                            }}
                            className="px-2 py-1 rounded bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#081C15] text-[10px] font-bold transition flex items-center gap-1"
                            title="Chèn vào timeline tại vị trí hiện tại"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Chèn</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: STOCK MEDIA (PEXELS & CURATED 9:16) */}
            {activeTab === "stock" && (
              <div className="space-y-3 animate-in fade-in text-xs">
                {/* Search Bar & Quick Categories */}
                <div className="p-3 rounded-xl bg-[#0E291E]/60 border border-[#10B981]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-[#FFD200]">
                      <Globe className="w-4 h-4" />
                      <span>Kho Stock Video 9:16</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] font-mono">
                      Pexels Free
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={stockQuery}
                      onChange={(e) => setStockQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchStockMedia()}
                      placeholder="Tìm kiếm: football, stadium, crowd..."
                      className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl pl-8 pr-16 py-1.5 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200]"
                    />
                    <Search className="w-3.5 h-3.5 text-[#EBF8F2]/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => fetchStockMedia()}
                      disabled={isLoadingStock}
                      className="absolute right-1 top-1 bottom-1 px-2.5 rounded-lg bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] font-bold text-[10px] transition cursor-pointer"
                    >
                      {isLoadingStock ? <Loader2 className="w-3 h-3 animate-spin" /> : "Tìm"}
                    </button>
                  </div>

                  {/* Pills Filter */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[
                      { id: "all", label: "Tất cả" },
                      { id: "football", label: "Sân cỏ ⚽" },
                      { id: "crowd", label: "Cổ động 🔥" },
                      { id: "fitness", label: "Thể lực 🏋️" },
                      { id: "luxury", label: "Tiền tài 💰" },
                      { id: "cinematic", label: "Điện ảnh 🎬" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setStockCategory(cat.id);
                          fetchStockMedia(stockQuery, cat.id);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                          stockCategory === cat.id
                            ? "bg-[#FFD200] text-[#081C15] border-[#FFD200]"
                            : "bg-[#071912] text-[#EBF8F2]/70 border-[#10B981]/25 hover:text-white"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid List of Stock Videos */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {isLoadingStock ? (
                    <div className="text-center py-8 text-xs text-[#EBF8F2]/50 flex flex-col items-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#FFD200] mb-2" />
                      <span>Đang tìm kiếm kho video stock...</span>
                    </div>
                  ) : stockItems.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#EBF8F2]/40">
                      Không tìm thấy video nào. Thử gõ từ khóa khác!
                    </div>
                  ) : (
                    stockItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-xl bg-[#0E291E]/60 border border-[#10B981]/25 hover:border-[#FFD200]/50 transition group space-y-1.5"
                      >
                        <div className="flex gap-2">
                          {/* Poster thumbnail */}
                          <div className="w-16 h-20 rounded-lg overflow-hidden bg-black shrink-0 relative border border-[#10B981]/30">
                            <img
                              src={item.posterUrl}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                            />
                            <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 font-mono text-[8px] text-white">
                              {item.duration}s
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="text-xs font-bold text-white line-clamp-2 leading-tight">
                                {item.title}
                              </div>
                              <div className="text-[9px] text-[#EBF8F2]/50 font-mono mt-0.5">
                                Khổ dọc 9:16 HD
                              </div>
                            </div>

                            {/* 2 Nút hành động */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleUseStockAsBackground(item)}
                                className="flex-1 py-1 rounded-lg bg-[#0E291E] hover:bg-[#10B981]/20 border border-[#10B981]/30 hover:border-[#10B981] text-[#10B981] text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Đặt làm Video Nền dự án"
                              >
                                <span>Làm Nền</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadAndInsertStock(item, "main-video")}
                                disabled={isImportingStockId === item.id}
                                className="flex-1 py-1 rounded-lg bg-[#143D2E] hover:bg-[#FFD200] text-[#FFD200] hover:text-[#081C15] text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Tải & Chèn vào Video Chính"
                              >
                                {isImportingStockId === item.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Plus className="w-3 h-3" />
                                )}
                                <span>Chèn</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: AUTO SUBTITLE */}
            {activeTab === "subtitle" && (
              <div className="space-y-3 animate-in fade-in text-xs">
                <div className="p-3 rounded-xl bg-[#143D2E]/40 border border-[#10B981]/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-[#FFD200]">
                      <Sparkles className="w-4 h-4" />
                      <span>Auto Subtitle (Whisper STT)</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFD200]/20 text-[#FFD200] font-mono">
                      Word-by-word
                    </span>
                  </div>

                  <p className="text-[11px] text-[#EBF8F2]/70 leading-relaxed">
                    Tự động nhận diện giọng nói từ video, sinh phụ đề chạy chữ từng từ khớp 100% từng mili-giây.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#EBF8F2]/60">Ngôn ngữ:</label>
                      <select
                        value={subtitleLanguage}
                        onChange={(e) => setSubtitleLanguage(e.target.value)}
                        className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-2 py-1 text-xs text-white"
                      >
                        <option value="vi">Tiếng Việt (vi)</option>
                        <option value="en">English (en)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#EBF8F2]/60">Từ mỗi câu:</label>
                      <select
                        value={wordsPerChunk}
                        onChange={(e) => setWordsPerChunk(parseInt(e.target.value, 10))}
                        className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-2 py-1 text-xs text-white"
                      >
                        <option value={3}>3 từ (Cực nhanh)</option>
                        <option value={4}>4 từ (Chuẩn TikTok ⭐)</option>
                        <option value={5}>5 từ (Dài)</option>
                      </select>
                    </div>
                  </div>

                  {sttStatusMessage && (
                    <div className="p-2 rounded-lg bg-[#071912] border border-[#10B981]/40 text-[10px] text-[#10B981] font-mono leading-tight">
                      {sttStatusMessage}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAutoSubtitle}
                    disabled={isTranscribing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow hover:brightness-105 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang Nhận Diện Âm Thanh...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Quét & Tạo Phụ Đề Từng Từ</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Chọn Style Animation Phụ Đề */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#EBF8F2]/70">
                    Hiệu ứng hiện chữ (Animation Style):
                  </label>
                  <div className="space-y-1.5">
                    {SUBTITLE_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setProject({
                            ...project,
                            subtitleStyle: {
                              ...project.subtitleStyle,
                              animation: p.id as any,
                            },
                          })
                        }
                        className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          project.subtitleStyle.animation === p.id
                            ? "bg-[#143D2E] border-[#FFD200] ring-1 ring-[#FFD200]"
                            : "bg-[#0E291E]/50 border-[#10B981]/25 hover:border-[#10B981]/60"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{p.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFD200]/20 text-[#FFD200] font-mono">
                              {p.tag}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#EBF8F2]/60 mt-0.5">{p.desc}</div>
                        </div>
                        {project.subtitleStyle.animation === p.id && (
                          <Check className="w-4 h-4 text-[#FFD200]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SMART CUT SILENCE REMOVAL */}
            {activeTab === "silence" && (
              <div className="space-y-3 animate-in fade-in text-xs">
                <div className="p-3 rounded-xl bg-[#0E291E]/60 border border-[#10B981]/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-[#FFD200]">
                      <Scissors className="w-4 h-4" />
                      <span>Xóa Khoảng Lặng Thông Minh</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 font-mono">
                      Jump-Cut
                    </span>
                  </div>

                  <p className="text-[11px] text-[#EBF8F2]/70 leading-relaxed">
                    Tự động tìm kiếm các khoảng ngập ngừng, hít thở hoặc im lặng (&gt; 0.35s) và cắt bỏ
                    để video dồn dập, dứt khoát hơn.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-[#EBF8F2]/60">
                        <span>Ngưỡng âm:</span>
                        <span className="text-[#FFD200] font-mono">{silenceThreshold} dB</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={-20}
                        value={silenceThreshold}
                        onChange={(e) => setSilenceThreshold(parseInt(e.target.value, 10))}
                        className="w-full accent-[#FFD200]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-[#EBF8F2]/60">
                        <span>Độ dài tối thiểu:</span>
                        <span className="text-[#FFD200] font-mono">{minSilenceDuration}s</span>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={1.0}
                        step={0.05}
                        value={minSilenceDuration}
                        onChange={(e) => setMinSilenceDuration(parseFloat(e.target.value))}
                        className="w-full accent-[#FFD200]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleScanSilence}
                    disabled={isScanningSilence}
                    className="w-full py-2 rounded-xl bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] font-black text-xs uppercase flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {isScanningSilence ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang Quét Dải Tần Âm Thanh...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Quét Tìm Khoảng Lặng</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Kết quả phát hiện khoảng lặng & Nút Áp dụng Cắt */}
                {silenceResult && (
                  <div className="p-3 rounded-xl bg-[#071912] border border-[#10B981]/40 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Kết Quả Phân Tích:</span>
                      <span className="text-[10px] font-mono text-[#FFD200]">
                        Tiết kiệm: ~{silenceResult.totalSilenceDuration}s ({silenceResult.savedPercent}%)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-[#EBF8F2]/70 font-mono">
                      <div className="p-1.5 rounded bg-[#0E291E] border border-white/5">
                        Khoảng lặng: <b className="text-red-400">{silenceResult.silenceCount}</b> chỗ
                      </div>
                      <div className="p-1.5 rounded bg-[#0E291E] border border-white/5">
                        Đoạn tiếng: <b className="text-[#10B981]">{silenceResult.audibleSegments.length}</b> đoạn
                      </div>
                    </div>

                    {silenceCutApplied ? (
                      <div className="p-2 rounded-xl bg-[#10B981]/20 border border-[#10B981] text-center text-[#10B981] font-bold text-xs flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đã Cắt Sạch & Dồn Nhịp Thành Công!</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplySilenceCut}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-[#FFD200] text-[#081C15] font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow hover:brightness-105 active:scale-95 transition cursor-pointer"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Cắt Sạch Khoảng Lặng & Dồn Nhịp (Smart Jump-Cut)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: AI VOICEOVER (CIT VOICE STUDIO 48KHZ CLONE) */}
            {activeTab === "voiceover" && (
              <div className="space-y-3 animate-in fade-in text-xs">
                {/* Audio ngầm cho Preview Player */}
                <audio
                  ref={previewAudioRef}
                  onTimeUpdate={() => {
                    if (previewAudioRef.current) {
                      setPreviewCurrentTime(previewAudioRef.current.currentTime);
                    }
                  }}
                  onEnded={() => setIsPreviewPlaying(false)}
                  onPause={() => setIsPreviewPlaying(false)}
                  onPlay={() => setIsPreviewPlaying(true)}
                />

                {/* 1. Header & Server Health Status */}
                <div className="p-3 rounded-xl bg-[#0E291E]/60 border border-[#10B981]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-[#FFD200]">
                      <Mic className="w-4 h-4" />
                      <span>CIT Voice Studio Pro</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 border ${
                          citServerInfo?.online
                            ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${citServerInfo?.online ? "bg-[#10B981] animate-pulse" : "bg-amber-400"}`} />
                        {citServerInfo?.online
                          ? `${citServerInfo.engine?.split(" ")[0]} • ${(citServerInfo.sample_rate || 48000) / 1000}kHz`
                          : "Offline • Fallback"}
                      </span>
                      <button
                        type="button"
                        onClick={fetchVoices}
                        disabled={isFetchingVoices}
                        title="Tải lại danh sách giọng từ CIT Voice Studio"
                        className="p-1 rounded-lg bg-[#143D2E] hover:bg-[#10B981] text-[#EBF8F2] hover:text-[#081C15] transition cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isFetchingVoices ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#EBF8F2]/70 leading-relaxed">
                    Tổng hợp giọng nói chuẩn phòng thu 48 kHz (VieNeu v3 Turbo, Supertonic 3, Edge-TTS). Hỗ trợ nhân bản, thẻ cảm xúc & khoảng nghỉ chính xác.
                  </p>

                  {/* 2. Ô tìm kiếm & Bộ lọc nâng cao */}
                  <div className="space-y-1.5 pt-1">
                    <div className="relative">
                      <input
                        type="text"
                        value={voiceSearchQuery}
                        onChange={(e) => setVoiceSearchQuery(e.target.value)}
                        placeholder="Tìm theo tên giọng (Hải Đăng, Trúc Ly, Mai Anh...)"
                        className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl pl-7 pr-2 py-1.5 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200]"
                      />
                      <Search className="w-3.5 h-3.5 text-[#EBF8F2]/40 absolute left-2 top-1/2 -translate-y-1/2" />
                      {voiceSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setVoiceSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#EBF8F2]/50 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Bộ lọc Engine / Model */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: "all", label: `Tất cả (${availableVoices.length})` },
                        { id: "vieneu", label: "VieNeu-TTS 48kHz" },
                        { id: "supertonic", label: "Supertonic 3" },
                        { id: "edge", label: "Edge-TTS" },
                      ].map((eng) => (
                        <button
                          key={eng.id}
                          type="button"
                          onClick={() => setVoiceEngineFilter(eng.id as any)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                            voiceEngineFilter === eng.id
                              ? "bg-[#FFD200] text-[#081C15] border-[#FFD200]"
                              : "bg-[#071912] text-[#EBF8F2]/70 border-[#10B981]/25 hover:text-white"
                          }`}
                        >
                          {eng.label}
                        </button>
                      ))}
                    </div>

                    {/* Bộ lọc Giới tính, Vùng miền, Phong cách */}
                    <div className="grid grid-cols-3 gap-1">
                      {/* Giới tính */}
                      <select
                        value={voiceGenderFilter}
                        onChange={(e) => setVoiceGenderFilter(e.target.value as any)}
                        className="bg-[#071912] border border-[#10B981]/30 rounded-lg px-1.5 py-1 text-[10px] text-white"
                      >
                        <option value="all">Giới tính: Tất cả</option>
                        <option value="male">Nam (♂)</option>
                        <option value="female">Nữ (♀)</option>
                      </select>

                      {/* Vùng miền */}
                      <select
                        value={voiceRegionFilter}
                        onChange={(e) => setVoiceRegionFilter(e.target.value as any)}
                        className="bg-[#071912] border border-[#10B981]/30 rounded-lg px-1.5 py-1 text-[10px] text-white"
                      >
                        <option value="all">Vùng miền: Tất cả</option>
                        <option value="North">Miền Bắc</option>
                        <option value="Central">Miền Trung</option>
                        <option value="South">Miền Nam</option>
                        <option value="International">Quốc tế</option>
                      </select>

                      {/* Phong cách */}
                      <select
                        value={voiceStyleFilter}
                        onChange={(e) => setVoiceStyleFilter(e.target.value as any)}
                        className="bg-[#071912] border border-[#10B981]/30 rounded-lg px-1.5 py-1 text-[10px] text-white"
                      >
                        <option value="all">Phong cách: Tất cả</option>
                        <option value="natural">Tự nhiên</option>
                        <option value="news">Tin tức</option>
                        <option value="story">Kể chuyện</option>
                        <option value="reading">Đọc truyện</option>
                      </select>
                    </div>

                    {/* Checkbox lọc giọng Cloned */}
                    {citServerInfo?.supports_cloning && (
                      <label className="flex items-center gap-1.5 pt-0.5 text-[10px] text-[#EBF8F2]/80 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={voiceOnlyCloned}
                          onChange={(e) => setVoiceOnlyCloned(e.target.checked)}
                          className="rounded border-[#10B981]/40 accent-[#FFD200]"
                        />
                        <span className="font-medium">Chỉ hiển thị giọng đã nhân bản (Cloned) ⭐</span>
                      </label>
                    )}
                  </div>

                  {/* 3. Danh sách Giọng đọc (Scrollable Voice Cards) */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-[#10B981]/20 rounded-xl p-1.5 bg-[#05130E]/70">
                    {filteredVoices.length === 0 ? (
                      <div className="text-center py-5 text-[11px] text-[#EBF8F2]/40">
                        Không tìm thấy giọng đọc phù hợp.
                        <button
                          type="button"
                          onClick={() => {
                            setVoiceSearchQuery("");
                            setVoiceEngineFilter("all");
                            setVoiceGenderFilter("all");
                            setVoiceRegionFilter("all");
                            setVoiceStyleFilter("all");
                            setVoiceOnlyCloned(false);
                          }}
                          className="block mx-auto mt-1 text-[#FFD200] underline text-[10px]"
                        >
                          Đặt lại tất cả bộ lọc
                        </button>
                      </div>
                    ) : (
                      filteredVoices.map((v) => {
                        const isSelected = voiceoverVoice === v.id;
                        return (
                          <div
                            key={v.id}
                            onClick={() => {
                              setVoiceoverVoice(v.id);
                              setVoiceoverProvider(v.provider);
                            }}
                            className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                              isSelected
                                ? "bg-[#143D2E] border-[#FFD200] ring-1 ring-[#FFD200] shadow-sm"
                                : "bg-[#071912]/80 border-[#10B981]/25 hover:border-[#10B981]/60 hover:bg-[#0E291E]"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs truncate">{v.name}</span>
                                {v.isCloned && (
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                    ⭐ Cloned
                                  </span>
                                )}
                                {v.featured && (
                                  <span className="text-[8px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 font-bold">
                                    🔥 Hot
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[#EBF8F2]/60 font-mono">
                                <span>{v.gender === "female" ? "Nữ ♀" : "Nam ♂"}</span>
                                <span>•</span>
                                <span>{v.region === "North" ? "Bắc" : v.region === "Central" ? "Trung" : v.region === "South" ? "Nam" : "Quốc tế"}</span>
                                <span>•</span>
                                <span>
                                  {v.style === "news" ? "Tin tức" : v.style === "story" ? "Kể chuyện" : v.style === "reading" ? "Đọc truyện" : "Tự nhiên"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                  v.sampleRate >= 48000
                                    ? "bg-[#FFD200]/20 text-[#FFD200]"
                                    : v.sampleRate >= 44100
                                    ? "bg-[#10B981]/20 text-[#10B981]"
                                    : "bg-blue-400/20 text-blue-300"
                                }`}
                              >
                                {v.sampleRate ? `${v.sampleRate / 1000}kHz` : "48kHz"}
                              </span>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-[#FFD200] text-[#081C15] flex items-center justify-center font-bold text-[9px]">
                                  ✓
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Thông tin giọng đang chọn */}
                  {currentVoiceObj && (
                    <div className="p-2 rounded-xl bg-[#143D2E]/60 border border-[#10B981]/30 flex items-center justify-between text-[10px]">
                      <div>
                        <span className="text-[#EBF8F2]/60">Đang chọn: </span>
                        <b className="text-[#FFD200]">{currentVoiceObj.name}</b>
                        <span className="text-[#EBF8F2]/60 font-mono"> ({currentVoiceObj.provider} • {currentVoiceObj.sampleRate / 1000}kHz)</span>
                      </div>
                    </div>
                  )}

                  {/* 4. Thẻ cảm xúc & Khoảng nghỉ chính xác theo cit-voice-studio.md */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#EBF8F2]/60">
                      <span>Thẻ cảm xúc (Emotion Tags):</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: "+ [cười] 😊", tag: "[cười]", title: "Tiếng cười tự nhiên, vui tươi" },
                        { label: "+ [thở dài] 😮‍💨", tag: "[thở dài]", title: "Tiếng thở dài, trầm ngâm" },
                        { label: "+ [hắng giọng] 🗣️", tag: "[hắng giọng]", title: "Hắng giọng chuẩn bị nói / ngắt nhịp trang trọng" },
                        { label: "+ [lấy hơi] 🫁", tag: "[lấy hơi]", title: "Lấy hơi, hít thở nhẹ trước câu" },
                      ].map((em) => (
                        <button
                          key={em.tag}
                          type="button"
                          onClick={() => handleInsertEmotionTag(em.tag)}
                          title={em.title}
                          className="px-2 py-0.5 rounded-lg bg-[#143D2E] hover:bg-[#10B981] text-[#10B981] hover:text-[#081C15] font-mono text-[9px] font-bold transition cursor-pointer"
                        >
                          {em.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-[#EBF8F2]/60 pt-1">
                      <span>Thẻ khoảng nghỉ chính xác ([nghỉ Ns]):</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: "+ 0.5s", tag: "[nghỉ 0.5s]" },
                        { label: "+ 1.0s", tag: "[nghỉ 1s]" },
                        { label: "+ 1.5s", tag: "[nghỉ 1.5s]" },
                        { label: "+ 2.0s", tag: "[nghỉ 2s]" },
                        { label: "+ 3.0s", tag: "[nghỉ 3s]" },
                      ].map((p) => (
                        <button
                          key={p.tag}
                          type="button"
                          onClick={() => handleInsertEmotionTag(p.tag)}
                          title={`Chèn chính xác khoảng im lặng ${p.label.replace("+", "")}`}
                          className="px-2 py-0.5 rounded-lg bg-[#071912] hover:bg-[#FFD200] text-[#FFD200] hover:text-[#081C15] font-mono text-[9px] font-bold border border-[#10B981]/30 transition cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. TextArea kịch bản */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#EBF8F2]/60">
                      <span>Nội dung câu nói:</span>
                      <span className="font-mono text-[9px]">{voiceoverText.length} ký tự</span>
                    </div>
                    <textarea
                      rows={3}
                      value={voiceoverText}
                      onChange={(e) => setVoiceoverText(e.target.value)}
                      placeholder="Nhập câu bạn muốn AI đọc chèn vào timeline..."
                      className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl p-2.5 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200] leading-relaxed"
                    />
                  </div>

                  {/* 6. Cài đặt âm học chuyên sâu (Collapsible Accordion) */}
                  <div className="border border-[#10B981]/25 rounded-xl overflow-hidden bg-[#071912]/50">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedVoiceSettings((prev) => !prev)}
                      className="w-full p-2 text-left flex items-center justify-between text-[10px] font-bold text-[#EBF8F2]/80 hover:text-white transition"
                    >
                      <div className="flex items-center gap-1.5 text-[#FFD200]">
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>Cài Đặt Âm Học Chuyên Sâu (Speed, Temperature, Seed...)</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          showAdvancedVoiceSettings ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showAdvancedVoiceSettings && (
                      <div className="p-2.5 pt-0 space-y-2 border-t border-[#10B981]/20 animate-in fade-in">
                        {/* Tốc độ đọc (speed) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#EBF8F2]/70 font-medium">Tốc độ đọc (Speed):</span>
                            <span className="font-mono text-[#FFD200] font-bold">{voiceoverSpeed.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min={0.5}
                            max={2.0}
                            step={0.05}
                            value={voiceoverSpeed}
                            onChange={(e) => setVoiceoverSpeed(parseFloat(e.target.value))}
                            className="w-full accent-[#FFD200]"
                          />
                        </div>

                        {/* Độ biểu cảm / ngẫu nhiên âm điệu (temperature) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#EBF8F2]/70 font-medium">Độ biểu cảm (Temperature):</span>
                            <span className="font-mono text-[#FFD200] font-bold">{voiceoverTemperature.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={1.2}
                            step={0.05}
                            value={voiceoverTemperature}
                            onChange={(e) => setVoiceoverTemperature(parseFloat(e.target.value))}
                            className="w-full accent-[#FFD200]"
                          />
                          <div className="flex justify-between text-[8px] text-[#EBF8F2]/40 font-mono">
                            <span>0.1 (Ổn định / phẳng)</span>
                            <span>0.7 (Mặc định)</span>
                            <span>1.2 (Biểu cảm mạnh)</span>
                          </div>
                        </div>

                        {/* Cố định âm điệu (seed) & Ngôn ngữ Supertonic */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-[#EBF8F2]/60">Seed âm điệu:</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={voiceoverSeed}
                                onChange={(e) => setVoiceoverSeed(e.target.value)}
                                placeholder="Tự do"
                                className="w-full bg-[#071912] border border-[#10B981]/30 rounded-lg px-2 py-1 text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={() => setVoiceoverSeed(String(Math.floor(Math.random() * 999999)))}
                                title="Sinh số ngẫu nhiên mới"
                                className="px-2 rounded-lg bg-[#143D2E] text-[#FFD200] text-xs font-bold hover:bg-[#10B981] hover:text-[#081C15]"
                              >
                                🎲
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-[#EBF8F2]/60">Định dạng file:</label>
                            <select
                              value={voiceoverFormat}
                              onChange={(e) => setVoiceoverFormat(e.target.value as any)}
                              className="w-full bg-[#071912] border border-[#10B981]/30 rounded-lg px-2 py-1 text-xs text-white"
                            >
                              <option value="mp3">MP3 (Nhẹ, tối ưu web)</option>
                              <option value="wav">WAV (Chuẩn 48kHz lossless)</option>
                            </select>
                          </div>
                        </div>

                        {/* Dropdown chọn ngôn ngữ (Khi dùng Supertonic) */}
                        {voiceoverProvider === "supertonic" && (
                          <div className="space-y-1 pt-1">
                            <label className="text-[9px] uppercase font-bold text-[#EBF8F2]/60">Ngôn ngữ Supertonic 3:</label>
                            <select
                              value={voiceoverLanguage}
                              onChange={(e) => setVoiceoverLanguage(e.target.value)}
                              className="w-full bg-[#071912] border border-[#10B981]/30 rounded-lg px-2 py-1 text-xs text-white"
                            >
                              <option value="vi">Tiếng Việt (vi)</option>
                              <option value="en">English (en)</option>
                              <option value="ja">Japanese (ja)</option>
                              <option value="ko">Korean (ko)</option>
                              <option value="zh">Chinese (zh)</option>
                              <option value="fr">French (fr)</option>
                              <option value="de">German (de)</option>
                              <option value="es">Spanish (es)</option>
                            </select>
                          </div>
                        )}

                        {/* Áp dụng từ điển phát âm */}
                        <label className="flex items-center gap-1.5 pt-1 text-[10px] text-[#EBF8F2]/80 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={voiceoverUseDict}
                            onChange={(e) => setVoiceoverUseDict(e.target.checked)}
                            className="rounded border-[#10B981]/40 accent-[#FFD200]"
                          />
                          <span>Áp dụng từ điển phát âm (KTX → ký túc xá, SGK → sách giáo khoa...)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* 7. Trình phát Nghe Thử Trực Tiếp (Inline Preview Player) */}
                  {previewAudioUrl && (
                    <div className="p-2.5 rounded-xl bg-[#071912] border border-[#FFD200]/40 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#FFD200] font-bold text-[11px]">
                          <Headphones className="w-3.5 h-3.5" />
                          <span>Nghe Thử Giọng: {voiceoverVoice}</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#10B981]">
                          {formatTimecode(previewCurrentTime)} / {formatTimecode(previewDuration || 0)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTogglePreviewPlay}
                          className="w-7 h-7 rounded-full bg-[#FFD200] hover:bg-amber-400 text-[#081C15] flex items-center justify-center shrink-0 transition"
                        >
                          {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={previewDuration || 1}
                          step={0.05}
                          value={previewCurrentTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setPreviewCurrentTime(val);
                            if (previewAudioRef.current) {
                              previewAudioRef.current.currentTime = val;
                            }
                          }}
                          className="flex-1 accent-[#FFD200] h-1.5 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* 8. Bộ đôi Nút Hành Động: "Nghe Thử" & "Tạo & Chèn Vào Timeline" */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handlePreviewVoice}
                      disabled={isPreviewingVoice || isGeneratingVoice}
                      className="py-2.5 rounded-xl bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] font-black text-xs uppercase flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 border border-[#10B981]/40"
                    >
                      {isPreviewingVoice ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang Sinh...</span>
                        </>
                      ) : (
                        <>
                          <Headphones className="w-3.5 h-3.5" />
                          <span>Nghe Thử</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateAndInsertVoice}
                      disabled={isGeneratingVoice || isPreviewingVoice}
                      className="py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow hover:brightness-105 active:scale-95 transition cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingVoice ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang Chèn...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          <span>Chèn Timeline (+Sub)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: EFFECTS & TRANSITIONS */}
            {activeTab === "effects" && (
              <div className="space-y-3 animate-in fade-in text-xs">
                {/* 6 Bộ lọc màu */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#EBF8F2]/70">6 Bộ lọc màu điện ảnh (LUTs):</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {COLOR_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (selectedClip && selectedClip.type === "video") {
                            setProject((prev) => ({
                              ...prev,
                              tracks: prev.tracks.map((t) => ({
                                ...t,
                                clips: t.clips.map((c) => (c.id === selectedClip.id ? { ...c, colorFilter: f.id } : c)),
                              })),
                            }));
                          }
                        }}
                        className={`p-2 rounded-xl border text-left transition ${
                          selectedClip?.colorFilter === f.id
                            ? "bg-[#143D2E] border-[#FFD200] ring-1 ring-[#FFD200]"
                            : "bg-[#0E291E]/60 border-[#10B981]/25 hover:border-[#10B981]/60"
                        }`}
                      >
                        <div className="font-bold text-white text-[11px]">{f.name}</div>
                        <div className="text-[9px] text-[#EBF8F2]/50 truncate">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kho chuyển cảnh (Transitions) */}
                <div className="space-y-1.5 pt-2 border-t border-[#10B981]/15">
                  <label className="text-[11px] font-bold text-[#EBF8F2]/70">Chuyển cảnh (Transitions):</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "fade", name: "Fade Mờ Dần" },
                      { id: "zoomin", name: "Zoom In Lao Vào" },
                      { id: "zoomout", name: "Zoom Out Kéo Ra" },
                      { id: "slideleft", name: "Slide Sang Trái" },
                      { id: "glitch", name: "Glitch Giật Nhiễu" },
                    ].map((tr) => (
                      <div
                        key={tr.id}
                        className="p-2 rounded-xl bg-[#0E291E]/60 border border-[#10B981]/25 text-[11px] font-bold text-white flex items-center justify-between"
                      >
                        <span>{tr.name}</span>
                        <span className="text-[9px] text-[#FFD200] font-mono">xfade</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: PROJECTS MANAGEMENT */}
            {activeTab === "projects" && (
              <div className="space-y-3 animate-in fade-in text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#FFD200]">
                  <span>Dự Án Đã Lưu ({savedProjectsList.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProject({
                        ...INITIAL_PROJECT,
                        id: `proj_${Date.now()}`,
                        name: "Dự Án Mới",
                      });
                    }}
                    className="flex items-center gap-1 text-[#10B981] hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Dự án mới</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {savedProjectsList.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#EBF8F2]/40">
                      Chưa có dự án nào lưu. Bấm "Lưu Dự Án" ở góc trên để lưu lại!
                    </div>
                  ) : (
                    savedProjectsList.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-[#0E291E]/60 border border-[#10B981]/25 hover:border-[#FFD200] transition flex items-center justify-between group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white truncate">{p.name}</div>
                          <div className="text-[10px] text-[#EBF8F2]/50 font-mono">
                            {p.aspectRatio} • {p.clipsCount} clips
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(`/api/studio/projects?id=${p.id}`);
                            if (res.ok) {
                              const d = await res.json();
                              if (d.project) setProject(d.project);
                            }
                          }}
                          className="px-2 py-1 rounded bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#081C15] text-[10px] font-bold transition"
                        >
                          Mở
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* THANH KÉO RESIZE SIDEBAR (TRÁI) */}
      {!isSidebarCollapsed && (
        <div
          onMouseDown={handleStartResizeSidebar}
          className="w-1.5 hover:w-2.5 -mr-1 hover:-mr-1.5 cursor-col-resize z-30 transition-all flex items-center justify-center group select-none shrink-0"
          title="Kéo sang phải/trái để điều chỉnh độ rộng Sidebar"
        >
          <div className="w-0.5 h-10 rounded-full bg-[#10B981]/40 group-hover:bg-[#FFD200] transition-colors" />
        </div>
      )}

      {/* ---------------- CỘT GIỮA: KHUNG CANVAS PREVIEW TRỰC QUAN (WYSIWYG) ---------------- */}
      <main className="flex-1 bg-[#030B08] flex flex-col items-center justify-center p-3 relative overflow-hidden">
        {/* Floating Button hiện Inspector khi Inspector đang thu gọn */}
        {isInspectorCollapsed && (
          <button
            type="button"
            onClick={() => setIsInspectorCollapsed(false)}
            className="absolute top-3 right-3 px-2.5 py-1.5 rounded-xl bg-[#0E291E]/90 hover:bg-[#143D2E] border border-[#10B981]/40 text-[#FFD200] text-xs font-bold flex items-center gap-1.5 z-30 shadow-lg transition active:scale-95 cursor-pointer backdrop-blur-md"
            title="Mở bảng Inspector thuộc tính"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Inspector</span>
          </button>
        )}

        {/* Audio ngầm để đồng bộ BGM và Voiceover AI */}
        <audio ref={bgmAudioRef} loop />
        <audio ref={voiceAudioRef} />

          {/* Canvas Wrapper theo tỷ lệ Aspect Ratio (9:16 / 16:9 / 1:1) */}
          <div
            className={`relative rounded-2xl overflow-hidden bg-black border-2 border-[#10B981]/40 shadow-2xl flex items-center justify-center transition-all duration-300 ${
              project.aspectRatio === "9:16"
                ? "h-full max-h-[440px] aspect-[9/16]"
                : project.aspectRatio === "16:9"
                ? "w-full max-w-[620px] aspect-[16/9]"
                : "h-full max-h-[440px] aspect-square"
            }`}
          >
            {/* LỚP 1: VIDEO NỀN (BACKGROUND LAYER) */}
            {project.backgroundSetting.enabled &&
              project.backgroundSetting.src &&
              !project.tracks.find((t) => t.type === "background")?.isHidden && (
                <video
                  ref={bgVideoRef}
                  src={project.backgroundSetting.src}
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}

            {/* LỚP 2: VIDEO CHÍNH (MAIN VIDEO) */}
            {primaryMainVideo && primaryMainVideo.src ? (
              <>
                <video
                  ref={mainVideoRef}
                  src={primaryMainVideo.src}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  style={{
                    filter: activeFilterCss,
                    opacity:
                      activeMainVideo && !project.tracks.find((t) => t.type === "main-video")?.isHidden ? 1 : 0,
                    pointerEvents: activeMainVideo ? "auto" : "none",
                  }}
                  muted={Boolean(project.tracks.find((t) => t.type === "main-video")?.isMuted)}
                  onClick={togglePlay}
                  playsInline
                  className="w-full h-full object-cover cursor-pointer transition-all duration-150"
                />

                {/* Thông báo khi video chính đang bị ẩn */}
                {activeMainVideo && project.tracks.find((t) => t.type === "main-video")?.isHidden && (
                  <div
                    onClick={togglePlay}
                    className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4 cursor-pointer text-[#EBF8F2]/60 z-10"
                  >
                    <EyeOff className="w-8 h-8 mb-2 text-red-400" />
                    <span className="text-xs font-bold text-white">Track Video Chính đang bị ẩn</span>
                    <span className="text-[10px] text-[#EBF8F2]/50 mt-1">Bấm biểu tượng mắt ở cột Track bên dưới để hiện lại</span>
                  </div>
                )}

                {/* Thông báo khi playhead nằm ngoài đoạn có clip */}
                {!activeMainVideo && (
                  <div
                    onClick={togglePlay}
                    className="absolute inset-0 bg-[#081C15] flex flex-col items-center justify-center text-center p-4 cursor-pointer text-[#EBF8F2]/40"
                  >
                    <Film className="w-10 h-10 mb-2 text-[#10B981]/50 animate-pulse" />
                    <span className="text-xs font-bold text-white">Chưa có video chính tại thời điểm này</span>
                    <span className="text-[10px] text-[#EBF8F2]/60 mt-0.5">Kéo kim Playhead về đoạn có video clip</span>
                  </div>
                )}
              </>
            ) : (
              <div
                onClick={togglePlay}
                className="w-full h-full bg-[#081C15] flex flex-col items-center justify-center text-center p-4 cursor-pointer text-[#EBF8F2]/40"
              >
                <Film className="w-10 h-10 mb-2 text-[#10B981]/50 animate-pulse" />
                <span className="text-xs font-bold text-white">Chưa có video chính nào trên timeline</span>
                <span className="text-[10px] text-[#EBF8F2]/60 mt-0.5">Kéo thả file vào hoặc chọn từ Kho Video & Stock</span>
              </div>
            )}

            {/* LỚP 3: WATERMARK / LOGO */}
            {project.watermark.enabled &&
              project.watermark.text &&
              !project.tracks.find((t) => t.type === "overlay")?.isHidden && (
              <div
                className={`absolute pointer-events-none z-20 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs font-black text-white shadow border border-white/20 text-xs ${
                  project.watermark.position === "top-left"
                    ? "top-3 left-3"
                    : project.watermark.position === "top-center"
                    ? "top-3 left-1/2 -translate-x-1/2"
                    : project.watermark.position === "top-right"
                    ? "top-3 right-3"
                    : project.watermark.position === "bottom-left"
                    ? "bottom-3 left-3"
                    : project.watermark.position === "bottom-right"
                    ? "bottom-3 right-3"
                    : "bottom-4 left-1/2 -translate-x-1/2"
                }`}
                style={{ opacity: project.watermark.opacity }}
              >
                {project.watermark.text}
              </div>
            )}

            {/* LỚP 4: AUTO SUBTITLE REALTIME (WORD-BY-WORD HIGHLIGHT CAPCUT STYLE) */}
            {activeSubtitle && (
              <div
                className={`absolute left-3 right-3 z-30 flex flex-wrap justify-center items-center gap-1.5 pointer-events-none text-center ${
                  project.subtitleStyle.position === "center"
                    ? "top-1/2 -translate-y-1/2"
                    : project.subtitleStyle.position === "bottom"
                    ? "bottom-8"
                    : "bottom-16"
                }`}
              >
                {activeSubtitle.words && activeSubtitle.words.length > 0 ? (
                  activeSubtitle.words.map((w, idx) => {
                    const isActive = currentTime >= w.start && currentTime < w.end;
                    const isPassed = currentTime >= w.end;

                    return (
                      <span
                        key={idx}
                        className={`transition-all duration-75 font-black uppercase tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                          isActive
                            ? project.subtitleStyle.animation === "bounce"
                              ? "scale-115 -translate-y-1"
                              : project.subtitleStyle.animation === "glow"
                              ? "scale-105 drop-shadow-[0_0_12px_#FFD200]"
                              : "scale-108"
                            : ""
                        }`}
                        style={{
                          fontFamily: project.subtitleStyle.fontFamily,
                          fontSize: `${Math.round(project.subtitleStyle.fontSize * 0.32)}px`,
                          color: isActive
                            ? project.subtitleStyle.highlightColor
                            : isPassed
                            ? project.subtitleStyle.baseColor
                            : project.subtitleStyle.baseColor,
                          WebkitTextStroke: `${project.subtitleStyle.outlineWidth * 0.25}px ${project.subtitleStyle.outlineColor}`,
                        }}
                      >
                        {w.word}
                      </span>
                    );
                  })
                ) : (
                  <span
                    className="font-black text-sm uppercase text-[#FFD200] drop-shadow"
                    style={{
                      WebkitTextStroke: "1px black",
                    }}
                  >
                    {activeSubtitle.text}
                  </span>
                )}
              </div>
            )}

            {/* Playhead Hover Overlay Button */}
            {!isPlaying && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 bg-black/20 flex items-center justify-center cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-[#FFD200] text-[#081C15] flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
            )}
          </div>

          {/* TRANSPORT CONTROLS BAR NGAY DƯỚI CANVAS */}
          <div className="mt-2 flex items-center justify-between w-full max-w-[620px] px-3 py-1.5 rounded-xl bg-[#071912] border border-[#10B981]/25 text-xs">
            {/* Timecode */}
            <div className="font-mono text-xs font-black text-white flex items-center gap-1.5">
              <span className="text-[#FFD200]">{formatTimecode(currentTime)}</span>
              <span className="text-[#EBF8F2]/40">/</span>
              <span className="text-[#EBF8F2]/70">{formatTimecode(project.duration)}</span>
            </div>

            {/* Play/Pause & Tua nhanh */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => handleSeek(Math.max(0, currentTime - 2))}
                className="p-1 rounded-lg hover:bg-white/10 text-[#EBF8F2]/70 hover:text-white"
                title="Lùi 2 giây"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="px-3 py-1 rounded-lg bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] font-black text-xs flex items-center gap-1 transition shadow"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? "Dừng" : "Phát"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSeek(Math.min(project.duration, currentTime + 2))}
                className="p-1 rounded-lg hover:bg-white/10 text-[#EBF8F2]/70 hover:text-white"
                title="Tiến 2 giây"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
              <div className="h-3 w-px bg-white/10 mx-1" />
              <button
                type="button"
                onClick={handleSplitClipAtPlayhead}
                className="px-2 py-1 rounded-lg bg-[#0E291E] hover:bg-[#FFD200]/20 text-[#FFD200] border border-[#FFD200]/30 font-bold text-[10px] flex items-center gap-1"
                title="Cắt clip tại playhead (Phím tắt: S)"
              >
                <Split className="w-3 h-3" />
                <span>Cắt (S)</span>
              </button>
            </div>

            {/* Loop Toggle */}
            <label className="flex items-center gap-1.5 text-[10px] text-[#EBF8F2]/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLoop}
                onChange={(e) => setIsLoop(e.target.checked)}
                className="w-3 h-3 accent-[#FFD200] rounded"
              />
              <span>Lặp lại</span>
            </label>
          </div>
        </main>

        {/* THANH KÉO RESIZE INSPECTOR (PHẢI) */}
        {!isInspectorCollapsed && (
          <div
            onMouseDown={handleStartResizeInspector}
            className="w-1.5 hover:w-2.5 -ml-1 hover:-ml-1.5 cursor-col-resize z-30 transition-all flex items-center justify-center group select-none shrink-0"
            title="Kéo sang trái/phải để điều chỉnh độ rộng Inspector"
          >
            <div className="w-0.5 h-10 rounded-full bg-[#10B981]/40 group-hover:bg-[#FFD200] transition-colors" />
          </div>
        )}

        {/* ---------------- CỘT PHẢI: CONTEXTUAL INSPECTOR (BUNG THEO ĐỐI TƯỢNG ĐƯỢC CHỌN) ---------------- */}
        {!isInspectorCollapsed && (
          <aside
            style={{ width: `${inspectorWidth}px` }}
            className="border-l border-[#10B981]/25 bg-[#071912]/80 flex flex-col shrink-0 overflow-y-auto p-3 space-y-3 min-w-[220px] max-w-[550px]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#10B981]/20">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#FFD200] tracking-wide">
                <Sliders className="w-3.5 h-3.5" />
                <span>Inspector Thuộc Tính</span>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedClip && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] font-mono">
                    {selectedClip.type}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsInspectorCollapsed(true)}
                  className="p-1 rounded-lg hover:bg-white/10 text-[#EBF8F2]/50 hover:text-white transition cursor-pointer"
                  title="Thu gọn Inspector"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          {/* TRƯỜNG HỢP 1: ĐANG CHỌN CLIP SUBTITLE */}
          {selectedClip && selectedClip.type === "subtitle" ? (
            <div className="space-y-3 animate-in fade-in text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#EBF8F2]/60">Nội dung phụ đề:</label>
                <textarea
                  rows={2}
                  value={selectedClip.text || ""}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setProject((prev) => ({
                      ...prev,
                      tracks: prev.tracks.map((t) => ({
                        ...t,
                        clips: t.clips.map((c) => (c.id === selectedClip.id ? { ...c, text: newText } : c)),
                      })),
                    }));
                  }}
                  className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl p-2 text-xs text-white"
                />
              </div>

              {/* Tùy chỉnh Font chữ & Cỡ chữ */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[#EBF8F2]/60">Font chữ:</label>
                  <select
                    value={project.subtitleStyle.fontFamily}
                    onChange={(e) =>
                      setProject({
                        ...project,
                        subtitleStyle: { ...project.subtitleStyle, fontFamily: e.target.value },
                      })
                    }
                    className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-2 py-1.5 text-xs text-white"
                  >
                    <option value="Montserrat">Montserrat (Đậm nét)</option>
                    <option value="Be Vietnam Pro">Be Vietnam Pro</option>
                    <option value="Impact">Impact (TikTok Viral)</option>
                    <option value="Arial">Arial Bold</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-[#EBF8F2]/60">
                    <span>Cỡ chữ:</span>
                    <span className="text-[#FFD200] font-mono">{project.subtitleStyle.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={32}
                    max={84}
                    value={project.subtitleStyle.fontSize}
                    onChange={(e) =>
                      setProject({
                        ...project,
                        subtitleStyle: { ...project.subtitleStyle, fontSize: parseInt(e.target.value, 10) },
                      })
                    }
                    className="w-full accent-[#FFD200] mt-1"
                  />
                </div>
              </div>

              {/* Màu sắc & Highlight */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[#EBF8F2]/60">Màu chữ thường:</label>
                  <input
                    type="color"
                    value={project.subtitleStyle.baseColor}
                    onChange={(e) =>
                      setProject({
                        ...project,
                        subtitleStyle: { ...project.subtitleStyle, baseColor: e.target.value },
                      })
                    }
                    className="w-full h-8 bg-[#071912] border border-[#10B981]/40 rounded-xl cursor-pointer p-0.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-[#EBF8F2]/60">Màu Highlight (Từ nói):</label>
                  <input
                    type="color"
                    value={project.subtitleStyle.highlightColor}
                    onChange={(e) =>
                      setProject({
                        ...project,
                        subtitleStyle: { ...project.subtitleStyle, highlightColor: e.target.value },
                      })
                    }
                    className="w-full h-8 bg-[#071912] border border-[#10B981]/40 rounded-xl cursor-pointer p-0.5"
                  />
                </div>
              </div>
            </div>
          ) : selectedClip && selectedClip.type === "video" ? (
            /* TRƯỜNG HỢP 2: ĐANG CHỌN CLIP VIDEO CHÍNH */
            <div className="space-y-3 animate-in fade-in text-xs">
              <div className="font-bold text-white truncate text-xs">{selectedClip.name}</div>

              {/* Tốc độ phát (Speed Ramp) */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#EBF8F2]/60">Tốc độ phát:</label>
                <div className="grid grid-cols-3 gap-1">
                  {SPEED_PRESETS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => {
                        setProject((prev) => ({
                          ...prev,
                          tracks: prev.tracks.map((t) => ({
                            ...t,
                            clips: t.clips.map((c) => (c.id === selectedClip.id ? { ...c, speed: sp } : c)),
                          })),
                        }));
                      }}
                      className={`py-1 rounded-lg text-xs font-bold border transition ${
                        selectedClip.speed === sp
                          ? "bg-[#FFD200] text-[#081C15] border-[#FFD200]"
                          : "bg-[#071912] text-[#EBF8F2]/70 border-[#10B981]/25 hover:text-white"
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Âm lượng clip */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-[#EBF8F2]/60">
                  <span>Âm lượng video:</span>
                  <span className="text-[#FFD200] font-mono">{Math.round((selectedClip.volume || 1.0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2.0}
                  step={0.05}
                  value={selectedClip.volume ?? 1.0}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    setProject((prev) => ({
                      ...prev,
                      tracks: prev.tracks.map((t) => ({
                        ...t,
                        clips: t.clips.map((c) => (c.id === selectedClip.id ? { ...c, volume: vol } : c)),
                      })),
                    }));
                  }}
                  className="w-full accent-[#FFD200]"
                />
              </div>

              {/* Xóa Clip Button */}
              <div className="pt-2 border-t border-[#10B981]/15">
                <button
                  type="button"
                  onClick={() => handleDeleteClip(selectedClip.id)}
                  className="w-full py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Đoạn Clip Này (Delete)</span>
                </button>
              </div>
            </div>
          ) : (
            /* TRƯỜNG HỢP 3: KHÔNG CHỌN CLIP (HIỂN THỊ THUỘC TÍNH DỰ ÁN TỔNG THỂ) */
            <div className="space-y-3 animate-in fade-in text-xs">
              <div className="p-3 rounded-xl bg-[#0E291E]/60 border border-[#10B981]/30 space-y-2">
                <div className="font-bold text-[#FFD200]">Tổng Quan Dự Án</div>
                <div className="space-y-1 text-[11px] text-[#EBF8F2]/70">
                  <div className="flex justify-between">
                    <span>Tổng thời lượng:</span>
                    <span className="font-mono text-white">{project.duration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tỉ lệ khung hình:</span>
                    <span className="font-mono text-[#FFD200]">{project.aspectRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Số layer tracks:</span>
                    <span className="font-mono text-white">{project.tracks.length}</span>
                  </div>
                </div>
              </div>

              {/* Cài đặt Watermark toàn dự án */}
              <div className="p-3 rounded-xl bg-[#0E291E]/60 border border-[#10B981]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Watermark Thương Hiệu</span>
                  <input
                    type="checkbox"
                    checked={project.watermark.enabled}
                    onChange={(e) =>
                      setProject({
                        ...project,
                        watermark: { ...project.watermark, enabled: e.target.checked },
                      })
                    }
                    className="w-3.5 h-3.5 accent-[#FFD200]"
                  />
                </div>
                {project.watermark.enabled && (
                  <input
                    type="text"
                    value={project.watermark.text}
                    onChange={(e) =>
                      setProject({
                        ...project,
                        watermark: { ...project.watermark, text: e.target.value },
                      })
                    }
                    placeholder="@PhiaSauSanCo"
                    className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  />
                )}
              </div>
            </div>
          )}
        </aside>
      )}
      </div>

      {/* THANH KÉO RESIZE TIMELINE (DƯỚI) */}
      <div
        onMouseDown={handleStartResizeTimeline}
        className="h-1.5 hover:h-2.5 -mt-1 hover:-mt-1.5 cursor-row-resize z-40 transition-all flex items-center justify-center group select-none shrink-0 bg-[#071912] border-t border-[#10B981]/30"
        title="Kéo lên/xuống để điều chỉnh độ cao Timeline"
      >
        <div className="h-0.5 w-16 rounded-full bg-[#10B981]/40 group-hover:bg-[#FFD200] transition-colors" />
      </div>

      {/* ================= 3. KHU VỰC DƯỚI: MULTI-TRACK NLE TIMELINE ================= */}
      <footer
        style={{ height: isTimelineCollapsed ? "36px" : `${timelineHeight}px` }}
        className="border-t border-[#10B981]/30 bg-[#071912] flex flex-col shrink-0 z-30 select-none transition-none overflow-hidden"
      >
        {/* Timeline Header Toolbar */}
        <div className="h-9 px-4 border-b border-[#10B981]/20 bg-[#05130E] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-black text-[11px] text-[#FFD200] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Track Timeline</span>
            </span>
            {isTimelineCollapsed && (
              <span className="text-[10px] text-[#EBF8F2]/40 font-mono italic">
                (Đang thu gọn — Click ▲ để mở rộng)
              </span>
            )}
            <div className="h-3 w-px bg-white/10" />

            {/* Nút Cắt đôi Clip (S) */}
            <button
              type="button"
              onClick={handleSplitClipAtPlayhead}
              className="px-2 py-1 rounded bg-[#0E291E] hover:bg-[#143D2E] text-[#EBF8F2] hover:text-[#FFD200] border border-[#10B981]/30 flex items-center gap-1.5 text-[11px] font-bold transition active:scale-95 cursor-pointer shadow-xs"
              title="Cắt đôi clip tại vị trí con trỏ Playhead (Phím tắt: S)"
            >
              <Scissors className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Cắt (S)</span>
            </button>

            {/* Nút Xóa Clip (Del) */}
            <button
              type="button"
              onClick={() => selectedClipId && handleDeleteClip(selectedClipId)}
              disabled={!selectedClipId}
              className="px-2 py-1 rounded bg-[#0E291E] hover:bg-red-950/60 text-[#EBF8F2] hover:text-red-400 border border-[#10B981]/30 hover:border-red-500/40 flex items-center gap-1.5 text-[11px] font-bold transition active:scale-95 disabled:opacity-35 disabled:pointer-events-none cursor-pointer shadow-xs"
              title={selectedClipId ? "Xóa clip đang chọn trên Timeline (Phím tắt: Delete)" : "Chọn một clip trên Timeline để xóa (Delete)"}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Xóa (Del)</span>
            </button>
          </div>

          {/* Zoom In / Zoom Out Controls + Maximize / Collapse */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(15, z - 10))}
              className="p-1 rounded hover:bg-white/10 text-[#EBF8F2]/70 hover:text-white"
              title="Thu nhỏ timeline"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-[#EBF8F2]/50 w-8 text-center">{zoomLevel}px</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(120, z + 10))}
              className="p-1 rounded hover:bg-white/10 text-[#EBF8F2]/70 hover:text-white"
              title="Phóng to timeline"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="h-3 w-px bg-white/10 mx-0.5" />

            {/* Nút phóng to tối đa / thu chuẩn chiều cao */}
            <button
              type="button"
              onClick={() => {
                if (isTimelineCollapsed) {
                  setIsTimelineCollapsed(false);
                  setTimelineHeight(260);
                } else if (timelineHeight < 380) {
                  setTimelineHeight(440);
                } else {
                  setTimelineHeight(260);
                }
              }}
              className="p-1 rounded hover:bg-white/10 text-[#EBF8F2]/70 hover:text-[#FFD200] transition cursor-pointer"
              title={timelineHeight >= 380 ? "Thu chuẩn chiều cao (260px)" : "Phóng to tối đa Timeline (440px)"}
            >
              {timelineHeight >= 380 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Nút thu gọn / mở rộng Timeline */}
            <button
              type="button"
              onClick={() => setIsTimelineCollapsed((prev) => !prev)}
              className="p-1 rounded hover:bg-white/10 text-[#EBF8F2]/70 hover:text-[#FFD200] transition cursor-pointer"
              title={isTimelineCollapsed ? "Mở rộng Multi-Track Timeline" : "Thu gọn Timeline"}
            >
              {isTimelineCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-[#FFD200]" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Timeline Tracks Area */}
        {!isTimelineCollapsed && (
          <div className="flex-1 flex overflow-hidden min-h-0">
          {/* CỘT CỐ ĐỊNH: TRACK HEADERS (LEFT 200px) */}
          <div className="w-[200px] border-r border-[#10B981]/25 bg-[#05130E] flex flex-col shrink-0 divide-y divide-[#10B981]/15 overflow-hidden">
            {/* Top corner box aligning with ruler */}
            <div className="h-6 bg-[#071912] border-b border-[#10B981]/20 flex items-center justify-between px-2 text-[9px] font-mono text-[#EBF8F2]/50">
              <span>TRACK / LAYER</span>
              <span className="text-[8px] text-[#10B981]">Ẩn / Tắt tiếng</span>
            </div>

            {/* List of Track Control Headers */}
            <div className="flex-1 overflow-y-hidden divide-y divide-[#10B981]/15">
              {project.tracks.map((track) => {
                const getTrackDisplayTitle = (t: typeof track) => {
                  switch (t.id) {
                    case "track_sub":
                      return "Phụ Đề (Sub)";
                    case "track_overlay":
                      return "Watermark / Text";
                    case "track_video":
                      return "Video Chính";
                    case "track_bg":
                      return "Video Nền";
                    case "track_voice":
                      return "Giọng Đọc AI";
                    case "track_bgm":
                      return "Nhạc Nền (BGM)";
                    default:
                      return t.name;
                  }
                };

                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrackId(track.id)}
                    className={`h-8 px-2 flex items-center justify-between text-xs cursor-pointer transition select-none ${
                      selectedTrackId === track.id ? "bg-[#143D2E]/90 text-[#FFD200] border-l-2 border-[#FFD200]" : "hover:bg-white/5 text-[#EBF8F2]/80"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="text-sm shrink-0">{track.icon}</span>
                      <span className="text-[11px] font-bold truncate max-w-[95px]" title={track.name}>
                        {getTrackDisplayTitle(track)}
                      </span>
                      {track.isHidden && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-red-950/80 text-red-400 font-mono border border-red-500/30 shrink-0">
                          Ẩn
                        </span>
                      )}
                      {track.isMuted && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-amber-950/80 text-amber-400 font-mono border border-amber-500/30 shrink-0">
                          Mute
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProject((prev) => ({
                            ...prev,
                            tracks: prev.tracks.map((t) => (t.id === track.id ? { ...t, isHidden: !t.isHidden } : t)),
                          }));
                        }}
                        className={`p-1 rounded transition cursor-pointer ${
                          track.isHidden
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/40"
                            : "hover:bg-white/10 text-[#EBF8F2]/60 hover:text-white"
                        }`}
                        title={track.isHidden ? "Đang ẩn layer - Click để hiện lại" : "Click để ẩn layer trên khung Canvas"}
                      >
                        {track.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProject((prev) => ({
                            ...prev,
                            tracks: prev.tracks.map((t) => (t.id === track.id ? { ...t, isMuted: !t.isMuted } : t)),
                          }));
                        }}
                        className={`p-1 rounded transition cursor-pointer ${
                          track.isMuted
                            ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 ring-1 ring-amber-500/40"
                            : "hover:bg-white/10 text-[#EBF8F2]/60 hover:text-white"
                        }`}
                        title={track.isMuted ? "Đang tắt tiếng track - Click để bật âm thanh" : "Click để tắt tiếng (Mute) track này"}
                      >
                        {track.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT CUỘN: TIMELINE RULER & LANES & PLAYHEAD */}
          <div
            ref={timelineScrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#061711] min-w-0"
            style={{ width: "calc(100% - 200px)" }}
          >
            <div
              className="relative h-full"
              style={{
                width: `${Math.max(1200, project.duration * zoomLevel + 200)}px`,
              }}
            >
              {/* TIMELINE RULER (THƯỚC ĐO THỜI GIAN) */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  handleSeek(clickX / zoomLevel);
                }}
                className="h-6 bg-[#071912] border-b border-[#10B981]/25 relative cursor-pointer"
              >
                {Array.from({ length: Math.ceil(project.duration) + 5 }).map((_, sec) => (
                  <div
                    key={sec}
                    className="absolute top-0 bottom-0 border-l border-white/10 flex items-end pb-0.5 pl-1 text-[9px] font-mono text-[#EBF8F2]/40"
                    style={{ left: `${sec * zoomLevel}px` }}
                  >
                    {sec % 2 === 0 ? `${sec}s` : ""}
                  </div>
                ))}
              </div>

              {/* KIM CHỈ THỜI GIAN PLAYHEAD (NEEDLE & DRAG HANDLE) */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#FFD200] z-40 pointer-events-none shadow-[0_0_8px_#FFD200] will-change-transform"
                style={{
                  left: 0,
                  transform: `translate3d(${currentTime * zoomLevel}px, 0, 0)`,
                }}
              >
                <div className="w-3 h-3 bg-[#FFD200] text-[#081C15] rotate-45 -translate-x-[5px] -translate-y-1 shadow flex items-center justify-center font-mono text-[7px] font-black" />
              </div>

              {/* TIMELINE TRACK LANES (DANH SÁCH LÀN CLIP) */}
              <div className="divide-y divide-[#10B981]/15">
                {project.tracks.map((track) => (
                  <div
                    key={track.id}
                    className={`h-8 relative transition-colors ${
                      track.isHidden ? "opacity-30 bg-black/40" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* Hiển thị các vạch đỏ khoảng lặng đã quét được */}
                    {track.type === "main-video" &&
                      silenceResult &&
                      !silenceCutApplied &&
                      Array.isArray(silenceResult.silenceIntervals) &&
                      silenceResult.silenceIntervals.map((s: any, sIdx: number) => (
                        <div
                          key={`silence_${sIdx}`}
                          className="absolute top-0 bottom-0 bg-red-600/35 border-x border-red-500/70 z-15 pointer-events-none flex items-center justify-center overflow-hidden"
                          style={{
                            left: `${s.start * zoomLevel}px`,
                            width: `${Math.max(2, s.duration * zoomLevel)}px`,
                          }}
                          title={`Khoảng lặng: ${s.duration}s`}
                        >
                          {s.duration * zoomLevel > 24 && (
                            <span className="text-[7px] text-red-200 font-mono font-bold uppercase truncate px-0.5">
                              Lặng {s.duration}s
                            </span>
                          )}
                        </div>
                      ))}

                    {/* Render các clip nằm trên track */}
                    {track.clips.map((clip) => {
                      const isSelected = selectedClipId === clip.id;
                      const clipLeft = clip.start * zoomLevel;
                      const clipWidth = Math.max(12, clip.duration * zoomLevel);

                      return (
                        <div
                          key={clip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            setSelectedTrackId(clip.trackId);
                          }}
                          className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between text-[10px] font-bold cursor-pointer transition shadow-md border ${
                            track.color
                          } ${
                            isSelected
                              ? "ring-2 ring-[#FFD200] z-20 brightness-110"
                              : "hover:brightness-105 z-10"
                          }`}
                          style={{
                            left: `${clipLeft}px`,
                            width: `${clipWidth}px`,
                          }}
                        >
                          <span className="truncate text-white drop-shadow">{clip.name}</span>
                          <span className="text-[8px] font-mono text-white/70 ml-1 shrink-0">
                            {clip.duration.toFixed(1)}s
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}
      </footer>
    </div>
  );
}

export default function StudioProPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-screen w-screen bg-[#05130E] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFD200] mb-2" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#EBF8F2]/70">
            Đang khởi động Studio Pro...
          </span>
        </div>
      }
    >
      <StudioProContent />
    </React.Suspense>
  );
}
