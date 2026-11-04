"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Scissors,
  Play,
  Pause,
  Download,
  Film,
  CheckCircle2,
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
} from "lucide-react";
import CreateVideoDropdown from "@/components/CreateVideoDropdown";

interface VideoFileItem {
  filename: string;
  title: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  url: string;
}

const COLOR_FILTERS = [
  { id: "none", name: "Gốc", desc: "Không áp dụng bộ lọc", bg: "from-gray-700 to-gray-800", css: "none" },
  { id: "warm", name: "Ấm Áp (Warm)", desc: "Điện ảnh ánh vàng cam hoài niệm", bg: "from-amber-600 to-orange-700", css: "sepia(0.32) saturate(1.4) contrast(1.1) brightness(1.03)" },
  { id: "vivid", name: "Rực Rỡ (Vivid)", desc: "Tươi tắn, tăng độ tương phản", bg: "from-emerald-500 to-teal-700", css: "saturate(1.65) contrast(1.22) brightness(1.03)" },
  { id: "vintage", name: "Cổ Điển (Retro)", desc: "Tông màu phim thập niên 90", bg: "from-yellow-700 to-amber-900", css: "sepia(0.5) contrast(1.18) brightness(0.92) hue-rotate(-12deg)" },
  { id: "bw", name: "Đen Trắng (B&W)", desc: "Tương phản nghệ thuật cao cấp", bg: "from-neutral-900 to-neutral-700", css: "grayscale(1) contrast(1.35) brightness(1.05)" },
  { id: "cool", name: "Lạnh Lùng (Cool)", desc: "Xanh teal điện ảnh hiện đại", bg: "from-cyan-600 to-blue-800", css: "hue-rotate(185deg) saturate(1.25) contrast(1.1)" },
];

const SPEED_PRESETS = [
  { value: 0.8, label: "0.8x", desc: "Chậm rãi" },
  { value: 0.9, label: "0.9x", desc: "Trầm lắng" },
  { value: 1.0, label: "1.0x", desc: "Chuẩn gốc" },
  { value: 1.1, label: "1.1x", desc: "Reels / TikTok ⭐" },
  { value: 1.25, label: "1.25x", desc: "Nhanh" },
  { value: 1.5, label: "1.5x", desc: "Siêu tốc" },
];

function VideoEditorContent() {
  const searchParams = useSearchParams();
  const videoParam = searchParams?.get("video") || "";

  // Danh sách video có sẵn trong thư mục output
  const [videoList, setVideoList] = useState<VideoFileItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoFileItem | null>(null);

  // Trình phát video & timeline
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoopTrim, setIsLoopTrim] = useState(true);

  // --- CÔNG CỤ CHỈNH SỬA (ÁP DỤNG TRỰC TIẾP REAL-TIME) ---
  // 1. Cắt / Trim
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // 2. Tốc độ & Bộ lọc màu
  const [speed, setSpeed] = useState(1.0);
  const [colorFilter, setColorFilter] = useState("none");

  // 3. Âm thanh & Nhạc nền
  const [videoVolume, setVideoVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [enableBgm, setEnableBgm] = useState(false);
  const [bgmPath, setBgmPath] = useState("");
  const [bgmVolume, setBgmVolume] = useState(0.12);

  // 4. Watermark / Logo thương hiệu
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState<
    "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
  >("bottom-center");
  const [watermarkSize, setWatermarkSize] = useState(30);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.85);

  // 5. Đè / Thay Video Nền (Background Replacer & Overlay)
  const [enableBackground, setEnableBackground] = useState(false);
  const [bgMode, setBgMode] = useState<"replace" | "blur" | "pip" | "overlay">("replace");
  const [bgVideoPath, setBgVideoPath] = useState("");
  const [bgDim, setBgDim] = useState(0.35);
  const [stockUploadsList, setStockUploadsList] = useState<{ name: string; path: string; sizeFormatted: string }[]>([]);

  // Trạng thái chọn file & quét thư mục trên máy tính (Local)
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [localFolderInput, setLocalFolderInput] = useState("C:\\Users\\BUI TUAN DAT\\Videos");
  const [isScanningFolder, setIsScanningFolder] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<{ name: string; path: string; sizeFormatted: string; duration?: number }[]>([]);
  const [showFolderScanner, setShowFolderScanner] = useState(false);

  // 6. Xuất bản
  const [outputFilename, setOutputFilename] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [renderedStats, setRenderedStats] = useState<{ filename: string; sizeFormatted: string } | null>(null);

  // Tải danh sách video từ API
  const fetchVideos = async () => {
    try {
      setIsLoadingVideos(true);
      const res = await fetch("/api/videos");
      if (res.ok) {
        const data = await res.json();
        const vids: VideoFileItem[] = data.videos || [];
        setVideoList(vids);

        // Khớp video từ query param ?video=
        if (videoParam) {
          const cleanParam = decodeURIComponent(videoParam).trim();
          const found = vids.find(
            (v) =>
              v.filename === cleanParam ||
              v.filename === `${cleanParam}.mp4` ||
              v.title.toLowerCase() === cleanParam.toLowerCase()
          );
          if (found) {
            handleSelectVideo(found);
          } else if (vids.length > 0) {
            handleSelectVideo(vids[0]);
          }
        } else if (vids.length > 0 && !selectedVideo) {
          handleSelectVideo(vids[0]);
        }
      }
    } catch (err) {
      console.error("Lỗi tải danh sách video:", err);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Tải danh sách clip stock đã tải lên
  const fetchStockUploads = async () => {
    try {
      const res = await fetch("/api/upload-stock");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.files)) {
          setStockUploadsList(data.files);
          if (!bgVideoPath && data.files.length > 0) {
            setBgVideoPath(data.files[0].path);
          }
        }
      }
    } catch {}
  };

  // Chọn file video trực tiếp từ máy tính (Upload vào hệ thống để dùng làm nền)
  const handleSelectLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingBg(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-stock", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tải video từ máy tính");

      const uploadedPath = data.path || (data.file && data.file.path);
      if (uploadedPath) {
        setBgVideoPath(uploadedPath);
      }
      await fetchStockUploads();
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi tải video: ${error.message}`);
    } finally {
      setIsUploadingBg(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = "";
    }
  };

  // Quét thư mục hoặc thêm file video trên ổ cứng máy tính
  const handleScanLocalFolder = async () => {
    const targetFolder = localFolderInput.trim().replace(/^["']+|["']+$/g, "");
    if (!targetFolder) {
      alert("Vui lòng nhập đường dẫn thư mục hoặc file video trên máy tính");
      return;
    }

    try {
      setIsScanningFolder(true);
      const res = await fetch("/api/scan-local-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: targetFolder }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể quét đường dẫn");

      setScannedFiles(data.files || []);
      setShowFolderScanner(true);
      if ((data.files || []).length === 0) {
        alert("Không tìm thấy video nào (.mp4, .mov, .webm, .mkv) tại đường dẫn đã nhập");
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi: ${error.message}`);
    } finally {
      setIsScanningFolder(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchStockUploads();
  }, [videoParam]);

  // Chọn video để chỉnh sửa
  const handleSelectVideo = (video: VideoFileItem) => {
    setSelectedVideo(video);
    setCurrentTime(0);
    setIsPlaying(false);
    setRenderedUrl(null);
    setRenderedStats(null);
    setProgressPercent(0);
    setProgressMessage("");
    setTerminalLogs([]);

    const baseName = video.filename.replace(/\.mp4$/i, "");
    setOutputFilename(`${baseName}-edited`);

    if (videoRef.current) {
      videoRef.current.src = video.url;
      videoRef.current.load();
    }
  };

  // Cập nhật khi video metadata được nạp
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Number(videoRef.current.duration.toFixed(2));
      setDuration(dur);
      setTrimStart(0);
      setTrimEnd(dur);
      videoRef.current.playbackRate = speed;
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : Math.min(1.0, Math.max(0, videoVolume));
    }
  };

  // ==========================================
  // REAL-TIME SYNCHRONIZERS (ÁP DỤNG NGAY LẬP TỨC)
  // ==========================================

  // 1. Áp dụng tốc độ phát trực tiếp vào video chính & video nền
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    if (bgVideoRef.current) {
      bgVideoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // 2. Áp dụng âm lượng và mute trực tiếp vào thẻ video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : Math.min(1.0, Math.max(0, videoVolume));
    }
  }, [videoVolume, isMuted]);

  // 3. Áp dụng nhạc nền BGM thời gian thực
  useEffect(() => {
    if (!bgmAudioRef.current) return;
    if (enableBgm && bgmPath.trim()) {
      bgmAudioRef.current.src = `/api/stream-audio?path=${encodeURIComponent(bgmPath.trim())}`;
      bgmAudioRef.current.volume = Math.min(1.0, Math.max(0, bgmVolume));
      if (isPlaying) {
        bgmAudioRef.current.play().catch(() => {});
      }
    } else {
      bgmAudioRef.current.pause();
      bgmAudioRef.current.currentTime = 0;
    }
  }, [enableBgm, bgmPath]);

  useEffect(() => {
    if (bgmAudioRef.current && enableBgm) {
      bgmAudioRef.current.volume = Math.min(1.0, Math.max(0, bgmVolume));
    }
  }, [bgmVolume, enableBgm]);

  // 4. Đồng bộ video nền thời gian thực
  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.playbackRate = speed;
      if (isPlaying) {
        bgVideoRef.current.play().catch(() => {});
      } else {
        bgVideoRef.current.pause();
      }
    }
  }, [isPlaying, speed, bgMode, enableBackground, bgVideoPath]);

  // Quản lý Play / Pause đồng bộ với BGM và Video nền
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (bgmAudioRef.current && enableBgm) bgmAudioRef.current.pause();
      if (bgVideoRef.current && enableBackground) bgVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      // Nếu vị trí hiện tại đang nằm ngoài vùng trim, tự động nhảy về trimStart
      if (trimEnd > trimStart) {
        if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
          videoRef.current.currentTime = trimStart;
          setCurrentTime(trimStart);
        }
      }
      videoRef.current.playbackRate = speed;
      videoRef.current.play();
      if (bgmAudioRef.current && enableBgm && bgmPath.trim()) {
        bgmAudioRef.current.play().catch(() => {});
      }
      if (bgVideoRef.current && enableBackground) {
        bgVideoRef.current.playbackRate = speed;
        bgVideoRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  // Cập nhật currentTime khi phát và kiểm soát giới hạn Trim
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      // Nếu chạm hoặc vượt mốc trimEnd -> xử lý loop hoặc pause
      if (trimEnd > trimStart && cur >= trimEnd) {
        if (isLoopTrim) {
          videoRef.current.currentTime = trimStart;
          setCurrentTime(trimStart);
          if (bgmAudioRef.current && enableBgm) {
            bgmAudioRef.current.currentTime = 0;
          }
          if (bgVideoRef.current && enableBackground) {
            bgVideoRef.current.currentTime = 0;
          }
        } else {
          videoRef.current.pause();
          if (bgmAudioRef.current) bgmAudioRef.current.pause();
          if (bgVideoRef.current) bgVideoRef.current.pause();
          setIsPlaying(false);
          videoRef.current.currentTime = trimStart;
          setCurrentTime(trimStart);
        }
      }
    }
  };

  // Nhảy tới mốc thời gian trên timeline
  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(duration || 10, newTime));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    }
    if (bgmAudioRef.current && enableBgm && bgmAudioRef.current.duration) {
      bgmAudioRef.current.currentTime = clamped % bgmAudioRef.current.duration;
    }
    if (bgVideoRef.current && enableBackground && bgVideoRef.current.duration) {
      bgVideoRef.current.currentTime = clamped % bgVideoRef.current.duration;
    }
  };

  // Khi thay đổi mốc trimStart -> video nhảy ngay tới frame bắt đầu
  const handleTrimStartChange = (val: number) => {
    const clamped = Math.max(0, Math.min(duration, Number(val.toFixed(2)) || 0));
    setTrimStart(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    }
  };

  // Khi thay đổi mốc trimEnd -> nếu đang xem quá mốc thì nhảy về mốc kết thúc
  const handleTrimEndChange = (val: number) => {
    const clamped = Math.max(trimStart, Math.min(duration, Number(val.toFixed(2)) || 0));
    setTrimEnd(clamped);
    if (videoRef.current && videoRef.current.currentTime > clamped) {
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    }
  };

  // Lấy CSS filter trực quan cho preview
  const currentFilterObj = COLOR_FILTERS.find((f) => f.id === colorFilter) || COLOR_FILTERS[0];

  // URL stream cho video nền (tự động loại bỏ dấu ngoặc kép nếu có)
  const cleanBgPath = bgVideoPath ? bgVideoPath.trim().replace(/^["']+|["']+$/g, "") : "";
  const bgStreamUrl = cleanBgPath
    ? `/api/stream-audio?path=${encodeURIComponent(cleanBgPath)}`
    : "";

  // Tính toán thời lượng sau cắt
  const outputDuration = Math.max(0.5, (trimEnd > trimStart ? trimEnd - trimStart : duration) / speed);

  // Bắt đầu Render Chỉnh Sửa Video
  const handleStartRender = async () => {
    if (!selectedVideo) {
      alert("Vui lòng chọn một video để chỉnh sửa!");
      return;
    }

    if (trimEnd <= trimStart) {
      alert("Thời điểm kết thúc phải lớn hơn thời điểm bắt đầu!");
      return;
    }

    setIsRendering(true);
    setProgressPercent(10);
    setProgressMessage("Đang chuẩn bị lệnh FFmpeg...");
    setTerminalLogs([`[INFO] Bắt đầu kết xuất video: "${selectedVideo.filename}"`]);
    setRenderedUrl(null);
    setRenderedStats(null);

    try {
      const payload = {
        sourceFilename: selectedVideo.filename,
        outputFilename: outputFilename.trim(),
        trimStart,
        trimEnd,
        speed,
        videoVolume: isMuted ? 0 : videoVolume,
        bgmPath: enableBgm ? bgmPath.trim() : "",
        bgmVolume: enableBgm ? bgmVolume : 0,
        colorFilter,
        watermarkText: enableWatermark ? watermarkText.trim() : "",
        watermarkPosition,
        watermarkSize,
        watermarkOpacity,
        enableBackground,
        bgMode,
        bgVideoPath: bgVideoPath.trim().replace(/^["']+|["']+$/g, ""),
        bgDim,
        overwrite,
      };

      const response = await fetch("/api/edit-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error("Không thể kết nối máy chủ chỉnh sửa video");
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
              setProgressMessage(eventData.message || "Xuất bản video thành công!");
              if (eventData.url) setRenderedUrl(eventData.url);
              setRenderedStats({
                filename: eventData.filename || `${outputFilename}.mp4`,
                sizeFormatted: eventData.sizeBytes
                  ? `${(eventData.sizeBytes / 1024 / 1024).toFixed(2)} MB`
                  : "",
              });
              fetchVideos();
            } else if (eventData.type === "error") {
              throw new Error(eventData.message || "Lỗi xử lý render video");
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi chỉnh sửa video: ${error.message}`);
      setTerminalLogs((prev) => [...prev, `[ERROR] ${error.message}`]);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07130E] text-[#EBF8F2] flex flex-col font-sans selection:bg-[#FFD200] selection:text-[#081C15]">
      {/* Audio element ngầm để đồng bộ phát BGM thời gian thực */}
      <audio ref={bgmAudioRef} loop />

      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#071912]/90 backdrop-blur-md border-b border-[#10B981]/25 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E291E] hover:bg-[#143D2E] text-xs font-bold text-[#EBF8F2]/70 hover:text-white border border-[#10B981]/20 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Thư viện</span>
          </Link>

          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#FFD200] flex items-center justify-center text-lg shadow-md shadow-[#10B981]/20">
              ✂️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm tracking-wide text-white uppercase">
                  Studio Chỉnh Sửa Video
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFD200]/20 text-[#FFD200] border border-[#FFD200]/30 font-mono">
                  Live WYSIWYG
                </span>
              </div>
              <p className="text-[11px] text-[#EBF8F2]/50">
                Áp dụng trực tiếp 100%: Cắt ghép • Đè background • Tốc độ • Bộ lọc màu • Âm lượng & BGM • Watermark
              </p>
            </div>
          </div>
        </div>

        {/* Nút Tạo Video Dropdown & Refresh */}
        <div className="flex items-center space-x-3">
          <CreateVideoDropdown />
          <button
            type="button"
            onClick={fetchVideos}
            disabled={isLoadingVideos}
            className="p-2 rounded-xl bg-[#0E291E] hover:bg-[#143D2E] border border-[#10B981]/20 text-[#EBF8F2]/70 hover:text-white transition cursor-pointer"
            title="Làm mới danh sách video"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingVideos ? "animate-spin text-[#FFD200]" : ""}`} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= CỘT TRÁI: VIDEO PLAYER PREVIEW TRỰC QUAN (5 COLS) ================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Ô Chọn Video Đang Sửa */}
          <div className="p-4 rounded-2xl bg-[#0E291E]/70 border border-[#10B981]/30 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-[#FFD200] tracking-wider flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                <span>Chọn Video Cần Chỉnh Sửa</span>
              </label>
              <span className="text-[10px] text-[#EBF8F2]/50 font-mono">
                {videoList.length} video trong output/
              </span>
            </div>

            <select
              value={selectedVideo?.filename || ""}
              onChange={(e) => {
                const target = videoList.find((v) => v.filename === e.target.value);
                if (target) handleSelectVideo(target);
              }}
              className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-[#FFD200] cursor-pointer"
            >
              {videoList.length === 0 ? (
                <option value="">Không có video nào trong output/</option>
              ) : (
                videoList.map((v) => (
                  <option key={v.filename} value={v.filename}>
                    {v.title} ({v.sizeFormatted})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* KHUNG PHÁT VIDEO 9:16 TRỰC QUAN (WYSIWYG) */}
          <div className="p-4 rounded-2xl bg-[#0E291E]/70 border border-[#10B981]/30 shadow-xl flex flex-col items-center">
            {/* Thanh trạng thái Live Feedback */}
            <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#071912] border border-[#10B981]/30 text-[11px] mb-3">
              <div className="flex items-center gap-2 font-bold text-[#10B981]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                </span>
                <span>Xem Trước Trực Tiếp (Live Preview)</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[#EBF8F2]/80 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={isLoopTrim}
                  onChange={(e) => setIsLoopTrim(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#FFD200] rounded"
                />
                <span>Lặp đoạn cắt</span>
              </label>
            </div>

            {/* 9:16 Phone Canvas Preview */}
            <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border-2 border-[#10B981]/40 shadow-2xl group flex items-center justify-center">
              {selectedVideo ? (
                <>
                  {/* LOGIC HIỂN THỊ ĐÈ BACKGROUND TRỰC TIẾP */}
                  {enableBackground ? (
                    bgMode === "replace" ? (
                      // CHẾ ĐỘ 1: THAY VIDEO NỀN MỚI
                      <>
                        {bgStreamUrl ? (
                          <video
                            ref={bgVideoRef}
                            src={bgStreamUrl}
                            loop
                            muted
                            autoPlay
                            playsInline
                            style={{ filter: currentFilterObj.css }}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#0A1F17] flex items-center justify-center text-xs text-[#EBF8F2]/50 p-4 text-center">
                            Chưa chọn clip video nền
                          </div>
                        )}
                        {bgDim > 0 && (
                          <div
                            className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-200"
                            style={{ opacity: bgDim }}
                          />
                        )}
                        {/* Video gốc chạy ngầm để phát tiếng & đồng bộ mốc thời gian */}
                        <video
                          ref={videoRef}
                          src={selectedVideo.url}
                          onLoadedMetadata={handleLoadedMetadata}
                          onTimeUpdate={handleTimeUpdate}
                          onClick={togglePlay}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          playsInline
                        />
                      </>
                    ) : bgMode === "blur" ? (
                      // CHẾ ĐỘ 2: NỀN MỜ ĐIỆN ẢNH
                      <>
                        <video
                          src={selectedVideo.url}
                          loop
                          muted
                          autoPlay
                          playsInline
                          style={{ filter: currentFilterObj.css }}
                          className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-70 pointer-events-none"
                        />
                        {bgDim > 0 && (
                          <div
                            className="absolute inset-0 bg-black pointer-events-none"
                            style={{ opacity: bgDim }}
                          />
                        )}
                        <video
                          ref={videoRef}
                          src={selectedVideo.url}
                          onLoadedMetadata={handleLoadedMetadata}
                          onTimeUpdate={handleTimeUpdate}
                          onClick={togglePlay}
                          style={{ filter: currentFilterObj.css }}
                          className="relative z-10 w-full h-full object-contain cursor-pointer transition-all duration-300"
                          playsInline
                        />
                      </>
                    ) : bgMode === "pip" ? (
                      // CHẾ ĐỘ 3: LỒNG KHUNG PiP
                      <>
                        {bgStreamUrl ? (
                          <video
                            ref={bgVideoRef}
                            src={bgStreamUrl}
                            loop
                            muted
                            autoPlay
                            playsInline
                            style={{ filter: currentFilterObj.css }}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#0A1F17]" />
                        )}
                        {bgDim > 0 && (
                          <div
                            className="absolute inset-0 bg-black pointer-events-none"
                            style={{ opacity: bgDim }}
                          />
                        )}
                        <div
                          onClick={togglePlay}
                          className="relative z-10 w-[84%] h-[84%] rounded-xl overflow-hidden shadow-2xl border-2 border-[#10B981]/50 cursor-pointer"
                        >
                          <video
                            ref={videoRef}
                            src={selectedVideo.url}
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={handleTimeUpdate}
                            style={{ filter: currentFilterObj.css }}
                            className="w-full h-full object-cover"
                            playsInline
                          />
                        </div>
                      </>
                    ) : (
                      // CHẾ ĐỘ 4: LỚP PHỦ OVERLAY
                      <>
                        <video
                          ref={videoRef}
                          src={selectedVideo.url}
                          onLoadedMetadata={handleLoadedMetadata}
                          onTimeUpdate={handleTimeUpdate}
                          onClick={togglePlay}
                          style={{ filter: currentFilterObj.css }}
                          className="w-full h-full object-cover cursor-pointer transition-all duration-300"
                          playsInline
                        />
                        {bgStreamUrl && (
                          <video
                            ref={bgVideoRef}
                            src={bgStreamUrl}
                            loop
                            muted
                            autoPlay
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover mix-blend-screen pointer-events-none z-10 opacity-50"
                          />
                        )}
                      </>
                    )
                  ) : (
                    // CHẾ ĐỘ THÔNG THƯỜNG
                    <video
                      ref={videoRef}
                      src={selectedVideo.url}
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => {
                        if (isLoopTrim && videoRef.current) {
                          videoRef.current.currentTime = trimStart;
                          videoRef.current.play();
                        } else {
                          setIsPlaying(false);
                        }
                      }}
                      onClick={togglePlay}
                      style={{ filter: currentFilterObj.css }}
                      className="w-full h-full object-cover cursor-pointer transition-all duration-300"
                      playsInline
                    />
                  )}

                  {/* CÁC HUY HIỆU LIVE FEEDBACK TRỰC QUAN GÓC PHẢI TRÊN */}
                  <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1 pointer-events-none">
                    {enableBackground && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#00E5FF] text-[#081C15] font-black text-[9px] shadow animate-in fade-in">
                        🖼️ {bgMode === "replace" ? "Thay nền" : bgMode === "blur" ? "Nền mờ" : bgMode === "pip" ? "Khung PiP" : "Overlay"}
                      </span>
                    )}
                    {speed !== 1.0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#FFD200] text-[#081C15] font-black text-[9px] shadow font-mono animate-in fade-in">
                        ⚡ {speed}x
                      </span>
                    )}
                    {colorFilter !== "none" && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#10B981] text-[#081C15] font-black text-[9px] shadow animate-in fade-in">
                        🎨 {currentFilterObj.name.split(" ")[0]}
                      </span>
                    )}
                    {isMuted && (
                      <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-white font-bold text-[9px] shadow animate-in fade-in">
                        🔇 Tắt tiếng
                      </span>
                    )}
                    {enableBgm && bgmPath && (
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-500 text-white font-bold text-[9px] shadow animate-in fade-in">
                        🎵 BGM On
                      </span>
                    )}
                  </div>

                  {/* LIVE WATERMARK OVERLAY */}
                  {enableWatermark && watermarkText.trim() && (
                    <div
                      className={`absolute pointer-events-none transition-all duration-200 z-20 px-2 py-1 rounded bg-black/60 backdrop-blur-xs font-bold text-white shadow-md border border-white/20 ${
                        watermarkPosition === "top-left"
                          ? "top-3 left-3"
                          : watermarkPosition === "top-center"
                          ? "top-3 left-1/2 -translate-x-1/2"
                          : watermarkPosition === "top-right"
                          ? "top-3 right-3"
                          : watermarkPosition === "bottom-left"
                          ? "bottom-4 left-3"
                          : watermarkPosition === "bottom-right"
                          ? "bottom-4 right-3"
                          : "bottom-4 left-1/2 -translate-x-1/2"
                      }`}
                      style={{
                        fontSize: `${Math.round(watermarkSize * 0.42)}px`,
                        opacity: watermarkOpacity,
                      }}
                    >
                      {watermarkText.trim()}
                    </div>
                  )}

                  {/* Nút Play/Pause nổi trên màn hình khi hover hoặc pause */}
                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border-2 border-[#FFD200] text-[#FFD200] flex items-center justify-center transition-all hover:scale-110 shadow-2xl cursor-pointer z-30"
                    >
                      <Play className="w-6 h-6 fill-[#FFD200] ml-1" />
                    </button>
                  )}
                </>
              ) : (
                <div className="p-4 text-center text-xs text-[#EBF8F2]/40">
                  Chưa chọn video
                </div>
              )}
            </div>

            {/* VIDEO SCRUBBER & TIMELINE CONTROLS TRỰC QUAN */}
            {selectedVideo && (
              <div className="w-full max-w-[340px] mt-4 space-y-2.5">
                {/* THANH TIMELINE TRỰC QUAN (NLE MULTI-ZONE BAR) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#10B981] font-bold">
                      [ Cắt: {trimStart.toFixed(1)}s
                    </span>
                    <span className="text-[#FFD200] font-black">
                      ▶ {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                    </span>
                    <span className="text-[#FFB703] font-bold">
                      Đến: {trimEnd.toFixed(1)}s ]
                    </span>
                  </div>

                  {/* Track Bar mô phỏng vùng cắt */}
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                      handleSeek(ratio * (duration || 10));
                    }}
                    className="relative h-6 bg-[#071912] rounded-xl overflow-hidden border border-[#10B981]/40 cursor-pointer shadow-inner select-none"
                    title="Nhấp chuột bất kỳ đâu trên thanh để tua đến mốc thời gian đó"
                  >
                    {/* Vùng Bị Cắt Trước TrimStart */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-red-950/50 border-r-2 border-red-500/70 transition-all flex items-center justify-center overflow-hidden"
                      style={{ width: `${duration > 0 ? (trimStart / duration) * 100 : 0}%` }}
                    >
                      {trimStart > 1.5 && (
                        <span className="text-[8px] text-red-400 font-bold uppercase truncate px-1">
                          Cắt
                        </span>
                      )}
                    </div>

                    {/* VÙNG HOẠT ĐỘNG CHÍNH (Được giữ lại) */}
                    <div
                      className="absolute top-0 bottom-0 bg-gradient-to-r from-[#10B981]/90 via-[#FFD200]/90 to-[#10B981]/90 border-y border-[#FFD200] shadow transition-all flex items-center justify-center overflow-hidden"
                      style={{
                        left: `${duration > 0 ? (trimStart / duration) * 100 : 0}%`,
                        width: `${
                          duration > 0
                            ? Math.max(0, ((trimEnd - trimStart) / duration) * 100)
                            : 100
                        }%`,
                      }}
                    >
                      <span className="text-[9px] text-[#081C15] font-black uppercase tracking-wider drop-shadow-xs truncate px-1">
                        ✓ Đoạn Xuất ({((trimEnd - trimStart) / speed).toFixed(1)}s)
                      </span>
                    </div>

                    {/* Vùng Bị Cắt Sau TrimEnd */}
                    <div
                      className="absolute top-0 bottom-0 right-0 bg-red-950/50 border-l-2 border-red-500/70 transition-all flex items-center justify-center overflow-hidden"
                      style={{
                        width: `${
                          duration > 0
                            ? Math.max(0, ((duration - trimEnd) / duration) * 100)
                            : 0
                        }%`,
                      }}
                    >
                      {duration - trimEnd > 1.5 && (
                        <span className="text-[8px] text-red-400 font-bold uppercase truncate px-1">
                          Cắt
                        </span>
                      )}
                    </div>

                    {/* KIM CHỈ THỜI GIAN THỰC (Playhead Needle) */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#fff] z-10 -translate-x-1/2 pointer-events-none transition-all duration-75"
                      style={{
                        left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                      }}
                    >
                      <div className="w-2.5 h-2.5 bg-white rotate-45 -translate-x-[3px] -translate-y-1 shadow" />
                    </div>
                  </div>

                  {/* Slider Scrubber bổ trợ */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 10}
                    step={0.05}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full accent-[#FFD200] cursor-pointer h-1.5 bg-[#143D2E] rounded-lg mt-1"
                  />
                </div>

                {/* Các nút bấm Tua & Ghim mốc */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSeek(Math.max(0, currentTime - 2))}
                      className="p-1.5 rounded-lg bg-[#071912] hover:bg-[#143D2E] text-[#EBF8F2]/70 hover:text-white transition"
                      title="Lùi lại 2 giây"
                    >
                      <Rewind className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="px-3 py-1.5 rounded-xl bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] font-black text-xs flex items-center gap-1.5 transition-all shadow"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isPlaying ? "Dừng" : "Phát"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSeek(Math.min(duration, currentTime + 2))}
                      className="p-1.5 rounded-lg bg-[#071912] hover:bg-[#143D2E] text-[#EBF8F2]/70 hover:text-white transition"
                      title="Tiến tới 2 giây"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTrimStartChange(currentTime)}
                      className="px-2 py-1 rounded-lg bg-[#071912] hover:bg-[#10B981]/20 border border-[#10B981]/40 text-[10px] font-bold text-[#10B981] transition cursor-pointer"
                      title="Lấy mốc thời gian hiện tại làm điểm Bắt Đầu"
                    >
                      [ Ghim Bắt Đầu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTrimEndChange(currentTime)}
                      className="px-2 py-1 rounded-lg bg-[#071912] hover:bg-[#FFD200]/20 border border-[#FFD200]/40 text-[10px] font-bold text-[#FFD200] transition cursor-pointer"
                      title="Lấy mốc thời gian hiện tại làm điểm Kết Thúc"
                    >
                      Ghim Kết Thúc ]
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= CỘT PHẢI: BỘ CÔNG CỤ CHỈNH SỬA (7 COLS) ================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* TOOL 1: ✂️ CẮT GHÉP & TRIM THỜI LƯỢNG */}
          <div className="p-4 rounded-2xl bg-[#0E291E]/70 border border-[#10B981]/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#10B981]/20">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#FFD200]" />
                <h3 className="text-xs font-black uppercase text-white tracking-wide">
                  1. Cắt & Trim Thời Lượng Video
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] font-bold font-mono">
                Xuất: ~{outputDuration.toFixed(1)}s (Gốc: {duration.toFixed(1)}s)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#EBF8F2]/70">
                  Mốc bắt đầu (giây):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={trimEnd || duration}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => handleTrimStartChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#FFD200]"
                  />
                  <button
                    type="button"
                    onClick={() => handleTrimStartChange(0)}
                    className="px-2 py-1.5 rounded-lg bg-[#143D2E] text-[10px] text-[#EBF8F2]/70 hover:text-white"
                  >
                    0s
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#EBF8F2]/70">
                  Mốc kết thúc (giây):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={trimStart}
                    max={duration || 100}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => handleTrimEndChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#FFD200]"
                  />
                  <button
                    type="button"
                    onClick={() => handleTrimEndChange(duration)}
                    className="px-2 py-1.5 rounded-lg bg-[#143D2E] text-[10px] text-[#EBF8F2]/70 hover:text-white"
                  >
                    Hết
                  </button>
                </div>
              </div>
            </div>

            {/* Phím tắt nhanh */}
            <div className="flex items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-[#EBF8F2]/50 text-[10px]">Cắt nhanh:</span>
              <button
                type="button"
                onClick={() => { handleTrimStartChange(0); handleTrimEndChange(Math.min(15, duration)); }}
                className="px-2 py-0.5 rounded bg-[#071912] hover:bg-[#10B981]/20 border border-[#10B981]/30 text-[10px] text-[#10B981]"
              >
                15s đầu
              </button>
              <button
                type="button"
                onClick={() => { handleTrimStartChange(0); handleTrimEndChange(Math.min(30, duration)); }}
                className="px-2 py-0.5 rounded bg-[#071912] hover:bg-[#10B981]/20 border border-[#10B981]/30 text-[10px] text-[#10B981]"
              >
                30s đầu
              </button>
              <button
                type="button"
                onClick={() => { handleTrimStartChange(0); handleTrimEndChange(duration); }}
                className="px-2 py-0.5 rounded bg-[#071912] hover:bg-[#FFD200]/20 border border-[#FFD200]/30 text-[10px] text-[#FFD200]"
              >
                Toàn bộ video
              </button>
            </div>
          </div>

          {/* TOOL 2: ⚡ TỐC ĐỘ PHÁT & BỘ LỌC MÀU ĐIỆN ẢNH */}
          <div className="p-4 rounded-2xl bg-[#0E291E]/70 border border-[#10B981]/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#10B981]/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFD200]" />
                <h3 className="text-xs font-black uppercase text-white tracking-wide">
                  2. Tốc Độ Phát & Bộ Lọc Màu Điện Ảnh
                </h3>
              </div>
              <span className="text-[10px] text-[#FFD200] font-mono font-bold bg-[#FFD200]/10 px-2 py-0.5 rounded">
                Áp dụng tức thì
              </span>
            </div>

            {/* Tốc độ phát */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-[#EBF8F2]/70">
                  Tốc độ phát (Speed Ramp):
                </label>
                <span className="text-[10px] text-[#10B981] font-mono font-bold">
                  Hiện tại: {speed}x
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {SPEED_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setSpeed(p.value)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      speed === p.value
                        ? "bg-[#FFD200] text-[#081C15] border-[#FFD200] shadow-md shadow-[#FFD200]/20 scale-105"
                        : "bg-[#071912] text-[#EBF8F2]/70 hover:text-white border-[#10B981]/20"
                    }`}
                  >
                    <div>{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 6 Bộ lọc màu điện ảnh */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-[#EBF8F2]/70 block">
                Bộ lọc màu điện ảnh (Nhấp để xem đổi màu trực tiếp):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setColorFilter(f.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                      colorFilter === f.id
                        ? "bg-[#143D2E] border-[#FFD200] shadow-md shadow-[#FFD200]/15 ring-1 ring-[#FFD200]"
                        : "bg-[#071912] border-[#10B981]/25 hover:border-[#10B981]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-black text-xs text-white">{f.name}</div>
                      {colorFilter === f.id && <Check className="w-3.5 h-3.5 text-[#FFD200]" />}
                    </div>
                    <div className="text-[10px] text-[#EBF8F2]/60 leading-tight line-clamp-1">
                      {f.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TOOL 3: 🔊 ÂM THANH & NHẠC NỀN (BGM) */}
          <div className="p-4 rounded-2xl bg-[#0E291E]/70 border border-[#10B981]/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#10B981]/20">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#FFD200]" />
                <h3 className="text-xs font-black uppercase text-white tracking-wide">
                  3. Âm Lượng & Nhạc Nền (BGM)
                </h3>
              </div>
            </div>

            {/* Âm lượng video gốc */}
            <div className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-1.5 rounded-lg transition ${
                    isMuted ? "bg-red-500/20 text-red-400" : "bg-[#143D2E] text-[#10B981]"
                  }`}
                  title={isMuted ? "Bật tiếng lại" : "Tắt tiếng video gốc"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-bold text-white">Âm lượng video/giọng gốc:</span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                <input
                  type="range"
                  min={0}
                  max={2.0}
                  step={0.05}
                  value={isMuted ? 0 : videoVolume}
                  onChange={(e) => {
                    setVideoVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-full accent-[#FFD200] cursor-pointer"
                />
                <span className="font-mono text-[11px] text-[#FFD200] w-10 text-right">
                  {isMuted ? "0%" : `${Math.round(videoVolume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Bật / Tắt BGM */}
            <div className="pt-2 border-t border-[#10B981]/15 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={enableBgm}
                    onChange={(e) => setEnableBgm(e.target.checked)}
                    className="w-4 h-4 accent-[#FFD200] rounded cursor-pointer"
                  />
                  <span>Chèn thêm nhạc nền (BGM)</span>
                </label>
                {enableBgm && (
                  <span className="text-[10px] text-[#10B981] font-mono font-bold bg-[#10B981]/10 px-2 py-0.5 rounded">
                    Phát thử đồng bộ cùng video
                  </span>
                )}
              </div>

              {enableBgm && (
                <div className="p-3 rounded-xl bg-[#071912] border border-[#10B981]/30 space-y-2.5 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#EBF8F2]/60">
                      Đường dẫn file MP3 trên máy tính:
                    </label>
                    <input
                      type="text"
                      value={bgmPath}
                      onChange={(e) => setBgmPath(e.target.value)}
                      placeholder="vd: D:\Music\chill-piano.mp3 hoặc data\bgm.mp3"
                      className="w-full bg-[#0E291E] border border-[#10B981]/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-[#EBF8F2]/80">Âm lượng nhạc nền:</span>
                    <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                      <input
                        type="range"
                        min={0.02}
                        max={0.5}
                        step={0.01}
                        value={bgmVolume}
                        onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                        className="w-full accent-[#FFD200] cursor-pointer"
                      />
                      <span className="font-mono text-[11px] text-[#FFD200] w-10 text-right">
                        {Math.round(bgmVolume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TOOL 4: 🏷️ WATERMARK & LOGO THƯƠNG HIỆU */}
          <div className="p-4 rounded-2xl bg-[#0E291E]/70 border border-[#10B981]/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#10B981]/20">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-[#FFD200]" />
                <h3 className="text-xs font-black uppercase text-white tracking-wide">
                  4. Chèn Watermark / Chữ Thương Hiệu
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                <input
                  type="checkbox"
                  checked={enableWatermark}
                  onChange={(e) => setEnableWatermark(e.target.checked)}
                  className="w-4 h-4 accent-[#FFD200] rounded cursor-pointer"
                />
                <span className="text-[11px] text-[#FFD200]">Bật Watermark</span>
              </label>
            </div>

            {enableWatermark && (
              <div className="space-y-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#EBF8F2]/70">
                    Nội dung chữ watermark:
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="vd: @KienThucMoiNgay hoặc Kênh Thể Thao 247"
                    className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-3 py-2 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200]"
                  />
                </div>

                {/* Vị trí Watermark (6 ô) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#EBF8F2]/70">
                    Vị trí hiển thị (Xem đổi vị trí ngay trên khung video):
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                    {(
                      [
                        { id: "top-left", label: "Góc Trên Trái" },
                        { id: "top-center", label: "Giữa Trên" },
                        { id: "top-right", label: "Góc Trên Phải" },
                        { id: "bottom-left", label: "Góc Dưới Trái" },
                        { id: "bottom-center", label: "Giữa Dưới ⭐" },
                        { id: "bottom-right", label: "Góc Dưới Phải" },
                      ] as const
                    ).map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setWatermarkPosition(pos.id)}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                          watermarkPosition === pos.id
                            ? "bg-[#FFD200] text-[#081C15] border-[#FFD200]"
                            : "bg-[#071912] text-[#EBF8F2]/70 border-[#10B981]/25 hover:text-white"
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cỡ chữ & Độ mờ */}
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#EBF8F2]/70">Cỡ chữ:</span>
                      <span className="font-mono text-[#FFD200]">{watermarkSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={60}
                      value={watermarkSize}
                      onChange={(e) => setWatermarkSize(parseInt(e.target.value, 10))}
                      className="w-full accent-[#FFD200] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#EBF8F2]/70">Độ mờ (Opacity):</span>
                      <span className="font-mono text-[#FFD200]">{Math.round(watermarkOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={1.0}
                      step={0.05}
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      className="w-full accent-[#FFD200] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TOOL 5: 🖼️ ĐÈ / THAY VIDEO NỀN (BACKGROUND) */}
          <div className="p-4 rounded-2xl bg-[#0E291E]/70 border border-[#10B981]/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#10B981]/20">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FFD200]" />
                <h3 className="text-xs font-black uppercase text-white tracking-wide">
                  5. Đè / Thay Thế Video Nền (Background)
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                <input
                  type="checkbox"
                  checked={enableBackground}
                  onChange={(e) => setEnableBackground(e.target.checked)}
                  className="w-4 h-4 accent-[#FFD200] rounded cursor-pointer"
                />
                <span className="text-[11px] text-[#FFD200]">Bật Đè Nền</span>
              </label>
            </div>

            {enableBackground && (
              <div className="space-y-3 animate-in fade-in">
                {/* 4 Kiểu Đè Nền */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#EBF8F2]/70 block">
                    Chọn kiểu đè nền:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      {
                        id: "replace",
                        title: "Thay Video Nền Mới",
                        badge: "Đổi Stock ⭐",
                        desc: "Giữ 100% âm thanh & chữ, thay hình ảnh nền mới",
                      },
                      {
                        id: "blur",
                        title: "Nền Mờ Điện Ảnh",
                        badge: "Blur Padding",
                        desc: "Phóng to video làm nền mờ phía sau, video sắc nét ở giữa",
                      },
                      {
                        id: "pip",
                        title: "Lồng Khung PiP",
                        badge: "Nổi Trên Nền",
                        desc: "Video chính thu nhỏ lồng trên video nền mới",
                      },
                      {
                        id: "overlay",
                        title: "Lớp Phủ Điện Ảnh",
                        badge: "Light / Dust",
                        desc: "Đè lớp ánh sáng / vệt phim chuyển động lên trên",
                      },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setBgMode(mode.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          bgMode === mode.id
                            ? "bg-[#143D2E] border-[#FFD200] shadow-md shadow-[#FFD200]/15 ring-1 ring-[#FFD200]"
                            : "bg-[#071912] border-[#10B981]/25 hover:border-[#10B981]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white text-xs">{mode.title}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFD200]/20 text-[#FFD200] font-mono">
                            {mode.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#EBF8F2]/60 line-clamp-2 leading-tight">
                          {mode.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chọn File Video Nền (nếu không phải mode blur) */}
                {bgMode !== "blur" && (
                  <div className="space-y-3 pt-1">
                    {/* Input file ẩn để kích hoạt Native File Chooser từ máy tính */}
                    <input
                      type="file"
                      ref={bgFileInputRef}
                      onChange={handleSelectLocalFile}
                      accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                      className="hidden"
                    />

                    {/* Tiêu đề & 2 nút chọn từ máy tính */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#EBF8F2]/90 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-[#FFD200]" />
                        <span>Chọn video nền từ máy tính (Local PC):</span>
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Nút 1: Chọn file trực tiếp từ máy tính */}
                        <button
                          type="button"
                          onClick={() => bgFileInputRef.current?.click()}
                          disabled={isUploadingBg}
                          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#10B981]/25 to-[#143D2E] hover:from-[#10B981]/40 hover:to-[#1a4f3b] text-white border border-[#10B981]/50 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {isUploadingBg ? (
                            <>
                              <Loader2 className="w-4 h-4 text-[#FFD200] animate-spin" />
                              <span className="text-[#FFD200]">Đang nạp video...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-[#FFD200]" />
                              <span>📁 Chọn File Từ Máy Tính</span>
                            </>
                          )}
                        </button>

                        {/* Nút 2: Mở Quét Thư Mục Máy */}
                        <button
                          type="button"
                          onClick={() => setShowFolderScanner(!showFolderScanner)}
                          className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow hover:scale-[1.02] active:scale-[0.98] ${
                            showFolderScanner
                              ? "bg-[#FFD200] text-[#081C15] border-[#FFD200]"
                              : "bg-[#071912] text-[#EBF8F2]/90 border-[#10B981]/30 hover:border-[#10B981]/60"
                          }`}
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span>📂 Quét Thư Mục Máy</span>
                        </button>
                      </div>
                    </div>

                    {/* Khung Quét Thư Mục / Thêm File Máy Tính (hiển thị khi bấm Quét Thư Mục) */}
                    {showFolderScanner && (
                      <div className="p-3 rounded-xl bg-[#071912] border border-[#10B981]/40 space-y-2 animate-in fade-in">
                        <label className="text-[10px] text-[#EBF8F2]/70 font-bold uppercase tracking-wider block">
                          Nhập đường dẫn file video hoặc thư mục (vd: C:\Videos\clip.mp4 hoặc D:\Stock):
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={localFolderInput}
                            onChange={(e) => setLocalFolderInput(e.target.value.replace(/^["']+|["']+$/g, ""))}
                            placeholder="Dán file (Copy as path) hoặc đường dẫn thư mục..."
                            className="flex-1 bg-[#05130D] border border-[#10B981]/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200] font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleScanLocalFolder}
                            disabled={isScanningFolder}
                            className="px-3 py-1.5 bg-[#143D2E] hover:bg-[#10B981] text-[#FFD200] hover:text-[#081C15] font-bold text-xs rounded-xl border border-[#10B981]/40 flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow"
                          >
                            {isScanningFolder ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Search className="w-3.5 h-3.5" />
                            )}
                            <span>Thêm / Quét</span>
                          </button>
                        </div>

                        {/* Danh sách file quét được từ thư mục */}
                        {scannedFiles.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] text-[#FFD200] font-bold">
                              Tìm thấy {scannedFiles.length} video trong thư mục:
                            </span>
                            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                              {scannedFiles.map((file, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setBgVideoPath(file.path)}
                                  className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between border cursor-pointer ${
                                    bgVideoPath === file.path
                                      ? "bg-[#143D2E] border-[#FFD200] text-[#FFD200]"
                                      : "bg-[#071912] border-[#10B981]/20 hover:border-[#10B981]/60 text-white"
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <div className="font-bold text-[11px] truncate">{file.name}</div>
                                    <div className="text-[9px] text-[#EBF8F2]/40 truncate font-mono">{file.path}</div>
                                  </div>
                                  <div className="text-[10px] text-[#EBF8F2]/60 shrink-0 text-right">
                                    {file.duration ? `${file.duration}s • ` : ""}
                                    {file.sizeFormatted}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Thẻ hiển thị video nền ĐANG ĐƯỢC CHỌN */}
                    {bgVideoPath ? (
                      <div className="p-2.5 rounded-xl bg-[#143D2E]/90 border border-[#FFD200]/70 flex items-center justify-between text-xs shadow-md animate-in fade-in">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 text-[#FFD200] font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                              Đang dùng: {bgVideoPath.split(/[/\\]/).pop() || bgVideoPath}
                            </span>
                          </div>
                          <div className="text-[9px] text-[#EBF8F2]/60 font-mono truncate mt-0.5">
                            {bgVideoPath}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBgVideoPath("")}
                          className="p-1 text-[#EBF8F2]/60 hover:text-red-400 rounded transition-colors shrink-0 cursor-pointer"
                          title="Bỏ chọn video nền này"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null}

                    {/* Clip đã lưu trong data/stock-uploads/ */}
                    {stockUploadsList.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#EBF8F2]/50">
                          Hoặc chọn nhanh clip có sẵn trong data/stock-uploads/:
                        </span>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                          {stockUploadsList.map((clip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setBgVideoPath(clip.path)}
                              className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between border cursor-pointer ${
                                bgVideoPath === clip.path
                                  ? "bg-[#143D2E] border-[#FFD200] text-[#FFD200]"
                                  : "bg-[#071912] border-[#10B981]/20 hover:border-[#10B981]/60 text-white"
                              }`}
                            >
                              <span className="font-mono text-[11px] truncate flex-1 pr-2">
                                {clip.name}
                              </span>
                              <span className="text-[10px] text-[#EBF8F2]/50 shrink-0">
                                {clip.sizeFormatted}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ô nhập đường dẫn trực tiếp (Hỗ trợ tự động xóa ngoặc kép "") */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#EBF8F2]/50 uppercase font-bold flex items-center justify-between">
                        <span>Hoặc dán đường dẫn file video trên máy tính:</span>
                        <span className="text-[9px] text-[#FFD200]/70 font-normal lowercase">
                          (tự động loại bỏ dấu ngoặc kép khi dán)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={bgVideoPath}
                        onChange={(e) => setBgVideoPath(e.target.value.replace(/^["']+|["']+$/g, "").trim())}
                        placeholder="vd: C:\Users\BUI TUAN DAT\Videos\Youtube\240060.mp4"
                        className="w-full bg-[#071912] border border-[#10B981]/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#EBF8F2]/30 focus:outline-none focus:border-[#FFD200] font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Độ tối nền (Dim / Darkness) */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#EBF8F2]/70">Làm tối nền (để chữ & video chính nổi bật):</span>
                    <span className="font-mono text-[#FFD200]">{Math.round(bgDim * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.8}
                    step={0.05}
                    value={bgDim}
                    onChange={(e) => setBgDim(parseFloat(e.target.value))}
                    className="w-full accent-[#FFD200] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ================= KHU VỰC XUẤT BẢN VIDEO (EXPORT) ================= */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0E291E] to-[#071912] border-2 border-[#10B981]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#10B981]/20">
              <h3 className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-2">
                <Download className="w-4 h-4 text-[#FFD200]" />
                <span>Xuất Bản Video Đã Chỉnh Sửa</span>
              </h3>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#EBF8F2]/70">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#FFD200] rounded"
                />
                <span>Ghi đè file gốc</span>
              </label>
            </div>

            {!overwrite && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-[#EBF8F2]/70">Tên file xuất:</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={outputFilename}
                    onChange={(e) => setOutputFilename(e.target.value)}
                    className="flex-1 bg-[#071912] border border-[#10B981]/40 rounded-l-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#FFD200]"
                  />
                  <span className="bg-[#143D2E] text-[#EBF8F2]/60 px-3 py-2 rounded-r-xl border border-l-0 border-[#10B981]/40 font-mono text-xs">
                    .mp4
                  </span>
                </div>
              </div>
            )}

            {/* Nút Render Lớn */}
            <button
              type="button"
              onClick={handleStartRender}
              disabled={isRendering || !selectedVideo}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] via-[#FFD200] to-[#FB8500] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-[#081C15] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#10B981]/25 transition-all cursor-pointer"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kết xuất ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4 stroke-[2.5]" />
                  <span>⚡ XUẤT BẢN VIDEO ĐÃ CHỈNH SỬA (MP4)</span>
                </>
              )}
            </button>

            {/* Tiến trình render */}
            {isRendering && (
              <div className="p-3 rounded-xl bg-[#071912] border border-[#10B981]/30 space-y-1.5 animate-in fade-in">
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
            {renderedUrl && (
              <div className="p-3.5 rounded-2xl bg-[#0E291E] border-2 border-[#FFD200] space-y-2.5 animate-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span>Xuất Bản Hoàn Tất! ({renderedStats?.sizeFormatted})</span>
                  </div>
                  <a
                    href={renderedUrl}
                    download={renderedStats?.filename}
                    className="px-3 py-1.5 rounded-xl bg-[#FFD200] text-[#081C15] text-xs font-black flex items-center gap-1 shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải MP4 Ngay</span>
                  </a>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.src = renderedUrl;
                        videoRef.current.load();
                        videoRef.current.play();
                        setIsPlaying(true);
                      }
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#143D2E] text-xs font-bold text-white hover:bg-[#10B981]/30 transition"
                  >
                    ▶️ Xem Lại Trong Player
                  </button>
                  <Link
                    href="/"
                    className="px-3 py-1.5 rounded-lg bg-[#071912] text-xs font-bold text-[#FFD200] hover:underline"
                  >
                    Xem trong Thư Viện ➔
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function EditVideoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07130E] text-[#EBF8F2] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFD200]" />
        </div>
      }
    >
      <VideoEditorContent />
    </Suspense>
  );
}
