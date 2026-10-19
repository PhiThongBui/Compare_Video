"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Download,
  RefreshCw,
  Sparkles,
  Film,
  CheckCircle2,
  AlertCircle,
  FileText,
  Terminal,
  Plus,
  Trash2,
  Zap,
  Check,
  Code,
  Volume2,
  Pause,
  Wand2,
  Loader2,
  Copy,
  ChevronDown,
  ChevronUp,
  Mic,
  Users,
  MessageSquare,
  Play,
  RotateCcw,
} from "lucide-react";
import CreateVideoDropdown from "@/components/CreateVideoDropdown";

interface ScriptTurn {
  speaker: "host" | "guest";
  tts: string;
  caption: string;
}

interface VoiceOption {
  id: string;
  provider: "vieneu" | "edge";
  voice: string;
  name: string;
  badge: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  { id: "vieneu:Hải Đăng", provider: "vieneu", voice: "Hải Đăng", name: "VieNeu — Hải Đăng (Nam, Bắc, Tự nhiên, 48kHz)", badge: "Host khuyên dùng ⭐" },
  { id: "vieneu:Thiện Minh", provider: "vieneu", voice: "Thiện Minh", name: "VieNeu — Thiện Minh (Nam, Bắc, Kể chuyện / Phân tích)", badge: "Guest khuyên dùng ⭐" },
  { id: "vieneu:Trúc Ly", provider: "vieneu", voice: "Trúc Ly", name: "VieNeu — Trúc Ly (Nữ, Bắc, Tự nhiên, Truyền cảm)", badge: "Nữ Bắc ⭐" },
  { id: "vieneu:Adam bựa", provider: "vieneu", voice: "Adam bựa", name: "VieNeu — Adam bựa (Nam, Bắc, Hài hước)", badge: "Hài hước ⭐" },
  { id: "vieneu:Thùy Dung", provider: "vieneu", voice: "Thùy Dung", name: "VieNeu — Thùy Dung (Nữ, Nam, Tin tức)", badge: "Miền Nam ⭐" },
  { id: "vieneu:Mai Anh", provider: "vieneu", voice: "Mai Anh", name: "VieNeu — Mai Anh (Nữ, Bắc, Tin tức)", badge: "Tin tức" },
  { id: "vieneu:Quang Sơn", provider: "vieneu", voice: "Quang Sơn", name: "VieNeu — Quang Sơn (Nam, Trung, Tự nhiên)", badge: "Miền Trung" },
  { id: "vieneu:Thái Sơn", provider: "vieneu", voice: "Thái Sơn", name: "VieNeu — Thái Sơn (Nam, Nam, Kể chuyện)", badge: "Miền Nam" },
  { id: "vieneu:Minh Đức", provider: "vieneu", voice: "Minh Đức", name: "VieNeu — Minh Đức (Nam, Bắc, Tin tức)", badge: "Tin tức" },
  { id: "edge:vi-VN-NamMinhNeural", provider: "edge", voice: "vi-VN-NamMinhNeural", name: "Edge TTS — Nam Minh (Dự phòng qua mạng)", badge: "Cloud Edge" },
  { id: "edge:vi-VN-HoaiMyNeural", provider: "edge", voice: "vi-VN-HoaiMyNeural", name: "Edge TTS — Hoài My (Dự phòng qua mạng)", badge: "Cloud Edge" },
];

const DEFAULT_INITIAL_TURNS: ScriptTurn[] = [
  { speaker: "host", tts: "", caption: "" },
  { speaker: "guest", tts: "", caption: "" },
];

const STORAGE_KEY = "podcast_video_studio_draft_v1";

export default function PodcastStudioPage() {
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("Phía sau sân cỏ • Podcast Talk");
  const [provider, setProvider] = useState<"vieneu" | "edge">("vieneu");
  const [slug, setSlug] = useState("");

  const [hostName, setHostName] = useState("Hải Đăng");
  const [hostRole, setHostRole] = useState("Host / Dẫn chương trình");
  const [hostVoice, setHostVoice] = useState("Hải Đăng");
  const [hostAvatar, setHostAvatar] = useState("🎙️");

  const [guestName, setGuestName] = useState("Thiện Minh");
  const [guestRole, setGuestRole] = useState("Chuyên gia phân tích");
  const [guestVoice, setGuestVoice] = useState("Thiện Minh");
  const [guestAvatar, setGuestAvatar] = useState("⭐");

  const [scriptTurns, setScriptTurns] = useState<ScriptTurn[]>(DEFAULT_INITIAL_TURNS);

  // AI Assistant states
  const [aiTopic, setAiTopic] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showExportBox, setShowExportBox] = useState(false);

  // Audio preview states
  const [previewingTurnIndex, setPreviewingTurnIndex] = useState<number | null>(null);
  const [previewingSpeaker, setPreviewingSpeaker] = useState<"host" | "guest" | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Video render states
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState<string>("");
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [completedVideoUrl, setCompletedVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const logsBottomRef = useRef<HTMLDivElement | null>(null);

  // Draft auto-save
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.title) setTitle(d.title);
        if (d.channel) setChannel(d.channel);
        if (d.slug) setSlug(d.slug);
        if (d.provider) setProvider(d.provider);
        if (d.host) {
          setHostName(d.host.name || "Hải Đăng");
          setHostRole(d.host.role || "Host / BLV");
          setHostVoice(d.host.voice || "Hải Đăng");
          setHostAvatar(d.host.avatar || "🎙️");
        }
        if (d.guest) {
          setGuestName(d.guest.name || "Thiện Minh");
          setGuestRole(d.guest.role || "Chuyên gia");
          setGuestVoice(d.guest.voice || "Thiện Minh");
          setGuestAvatar(d.guest.avatar || "⭐");
        }
        if (Array.isArray(d.scriptTurns) && d.scriptTurns.length > 0) {
          setScriptTurns(d.scriptTurns);
        }
        setLastAutoSavedTime("Đã khôi phục từ bản nháp");
      }
    } catch {}
  }, []);

  // Save draft on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const draft = {
          title,
          channel,
          slug,
          provider,
          host: { name: hostName, role: hostRole, voice: hostVoice, avatar: hostAvatar },
          guest: { name: guestName, role: guestRole, voice: guestVoice, avatar: guestAvatar },
          scriptTurns,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setLastAutoSavedTime(new Date().toLocaleTimeString("vi-VN"));
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [title, channel, slug, provider, hostName, hostRole, hostVoice, hostAvatar, guestName, guestRole, guestVoice, guestAvatar, scriptTurns]);

  // Scroll logs to bottom
  useEffect(() => {
    if (logsBottomRef.current) {
      logsBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [renderLogs]);

  // Clear / Reset Form
  const handleClearForm = () => {
    setTitle("");
    setSlug("");
    setAiTopic("");
    setRefinePrompt("");
    setScriptTurns([
      { speaker: "host", tts: "", caption: "" },
      { speaker: "guest", tts: "", caption: "" },
    ]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setLastAutoSavedTime("Đã làm mới form");
  };

  // Delete generated video
  const [isDeletingVideo, setIsDeletingVideo] = useState(false);
  const handleDeleteCompletedVideo = async () => {
    if (!completedVideoUrl) return;
    const filename = completedVideoUrl.split("/").pop();
    if (!filename) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa video ${filename}?`)) {
      return;
    }

    setIsDeletingVideo(true);
    try {
      if (typeof document !== "undefined") {
        document.querySelectorAll("video").forEach((v) => {
          try {
            v.pause();
            v.removeAttribute("src");
            v.load();
          } catch {}
        });
      }

      const res = await fetch(`/api/videos/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể xóa video");
      }
      setCompletedVideoUrl(null);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Lỗi khi xóa video: ${error.message}`);
    } finally {
      setIsDeletingVideo(false);
    }
  };

  // Turn management
  const handleAddTurn = () => {
    const lastTurn = scriptTurns[scriptTurns.length - 1];
    const nextSpeaker = lastTurn?.speaker === "host" ? "guest" : "host";
    setScriptTurns([
      ...scriptTurns,
      {
        speaker: nextSpeaker,
        tts: "",
        caption: "",
      },
    ]);
  };

  const handleUpdateTurn = (index: number, field: keyof ScriptTurn, val: string) => {
    const next = [...scriptTurns];
    next[index] = { ...next[index], [field]: val };
    setScriptTurns(next);
  };

  const handleToggleSpeaker = (index: number) => {
    const next = [...scriptTurns];
    next[index] = {
      ...next[index],
      speaker: next[index].speaker === "host" ? "guest" : "host",
    };
    setScriptTurns(next);
  };

  const handleDeleteTurn = (index: number) => {
    if (scriptTurns.length <= 1) return;
    const next = scriptTurns.filter((_, idx) => idx !== index);
    setScriptTurns(next);
  };

  // Preview Voice for Single Turn or Speaker Profile
  const handlePreviewTurnAudio = async (index: number) => {
    const turn = scriptTurns[index];
    if (!turn || !turn.tts.trim()) return;

    if (previewingTurnIndex === index) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPreviewingTurnIndex(null);
      return;
    }

    setPreviewingTurnIndex(index);
    try {
      const voiceToUse = turn.speaker === "host" ? hostVoice : guestVoice;
      const res = await fetch("/api/preview-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: turn.tts,
          provider,
          voice: voiceToUse,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Lỗi nghe thử giọng");
      }
      const audioUrl = data.url || data.audioUrl;
      if (audioUrl) {
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio();
        }
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.onended = () => setPreviewingTurnIndex(null);
        await audioPlayerRef.current.play();
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Không thể phát âm thanh nghe thử");
      setPreviewingTurnIndex(null);
    }
  };

  const handlePreviewSpeaker = async (speakerType: "host" | "guest") => {
    const testText =
      speakerType === "host"
        ? `Xin chào mọi người, tôi là ${hostName}, chào mừng các bạn đến với Podcast Phía sau sân cỏ!`
        : `Rất vui được có mặt tại đây cùng ${hostName} để phân tích trận cầu tâm điểm hôm nay!`;
    const voiceToUse = speakerType === "host" ? hostVoice : guestVoice;

    setPreviewingSpeaker(speakerType);
    try {
      const res = await fetch("/api/preview-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: testText,
          provider,
          voice: voiceToUse,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const audioUrl = data.url || data.audioUrl;
        if (audioUrl) {
          if (!audioPlayerRef.current) {
            audioPlayerRef.current = new Audio();
          }
          audioPlayerRef.current.src = audioUrl;
          audioPlayerRef.current.onended = () => setPreviewingSpeaker(null);
          await audioPlayerRef.current.play();
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || "Lỗi khi nghe thử giọng nhân vật");
        setPreviewingSpeaker(null);
      }
    } catch (e: any) {
      alert(e.message || "Lỗi khi kết nối audio");
      setPreviewingSpeaker(null);
    }
  };

  // AI Script Generation
  const handleGenerateAiScript = async (isRefiningMode: boolean = false) => {
    setAiError(null);
    if (isRefiningMode) {
      setIsRefining(true);
    } else {
      setIsAiGenerating(true);
    }

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "podcast",
          idea: aiTopic || title,
          refinePrompt: isRefiningMode ? refinePrompt : undefined,
          currentScript: {
            title,
            host: { name: hostName, role: hostRole, voice: hostVoice, avatar: hostAvatar },
            guest: { name: guestName, role: guestRole, voice: guestVoice, avatar: guestAvatar },
            script: scriptTurns,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Không thể sinh kịch bản từ AI");
      }

      const d = result.data;
      if (d.title) setTitle(d.title);
      if (d.host?.name) setHostName(d.host.name);
      if (d.host?.role) setHostRole(d.host.role);
      if (d.guest?.name) setGuestName(d.guest.name);
      if (d.guest?.role) setGuestRole(d.guest.role);

      if (Array.isArray(d.script) && d.script.length > 0) {
        setScriptTurns(
          d.script.map((s: any) => ({
            speaker: s.speaker === "guest" ? "guest" : "host",
            tts: s.tts || s.caption || "",
            caption: s.caption || s.tts || "",
          }))
        );
      }

      if (isRefiningMode) {
        setRefinePrompt("");
      }
    } catch (err: any) {
      setAiError(err.message || "Lỗi tạo kịch bản từ AI");
    } finally {
      setIsAiGenerating(false);
      setIsRefining(false);
    }
  };

  // Full Script Export for Copying
  const getFullScriptExportText = (): string => {
    let out = `=== KỊCH BẢN PODCAST: ${title.toUpperCase()} ===\n`;
    out += `Host: ${hostName} (${hostRole})\n`;
    out += `Guest: ${guestName} (${guestRole})\n\n`;
    out += `--- CÁC LƯỢT ĐỐI THOẠI ---\n`;
    scriptTurns.forEach((turn, idx) => {
      const spk = turn.speaker === "host" ? `[HOST - ${hostName}]` : `[GUEST - ${guestName}]`;
      out += `\nLượt ${idx + 1} ${spk}:\n`;
      out += `Đọc (TTS): ${turn.tts}\n`;
      out += `Phụ đề: ${turn.caption}\n`;
    });
    return out;
  };

  const handleCopyExport = (mode: "text" | "json") => {
    const payload =
      mode === "json"
        ? JSON.stringify(
            {
              title,
              channel,
              host: { name: hostName, role: hostRole, voice: hostVoice, avatar: hostAvatar },
              guest: { name: guestName, role: guestRole, voice: guestVoice, avatar: guestAvatar },
              script: scriptTurns,
            },
            null,
            2
          )
        : getFullScriptExportText();

    navigator.clipboard.writeText(payload);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Start Video Render via SSE
  const handleStartRender = async () => {
    setIsRendering(true);
    setRenderError(null);
    setRenderProgress(5);
    setRenderStatus("Đang khởi động tiến trình làm video Podcast...");
    setRenderLogs([]);
    setCompletedVideoUrl(null);

    try {
      const res = await fetch("/api/generate-podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          channel,
          provider,
          host: { name: hostName, role: hostRole, voice: hostVoice, avatar: hostAvatar },
          guest: { name: guestName, role: guestRole, voice: guestVoice, avatar: guestAvatar },
          script: scriptTurns,
          customSlug: slug,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Lỗi khi gọi API tạo video");
      }

      if (!res.body) {
        throw new Error("Không nhận được luồng sự kiện (Stream body) từ server");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawData = line.slice(6).trim();
            if (!rawData) continue;

            try {
              const event = JSON.parse(rawData);

              if (event.step === "log") {
                setRenderLogs((prev) => [...prev, event.message]);
              } else if (event.step === "start") {
                setRenderProgress(10);
                setRenderStatus("Đang tổng hợp dữ liệu kịch bản...");
                setRenderLogs((prev) => [...prev, `[START] ${event.message}`]);
              } else if (event.step === "audio") {
                setRenderProgress(35);
                setRenderStatus("Đang sinh giọng nói Host & Guest (TTS)...");
                setRenderLogs((prev) => [...prev, `[AUDIO] ${event.message}`]);
              } else if (event.step === "build") {
                setRenderProgress(65);
                setRenderStatus("Đang nạp timeline và hoạt cảnh HyperFrames...");
                setRenderLogs((prev) => [...prev, `[BUILD] ${event.message}`]);
              } else if (event.step === "render") {
                setRenderProgress(85);
                setRenderStatus("Đang render video MP4 qua HyperFrames...");
                setRenderLogs((prev) => [...prev, `[RENDER] ${event.message}`]);
              } else if (event.step === "complete") {
                setRenderProgress(100);
                setRenderStatus("Hoàn tất video xuất sắc!");
                setCompletedVideoUrl(event.url);
                setRenderLogs((prev) => [...prev, `🎉 [DONE] ${event.message}`]);
                setIsRendering(false);
              } else if (event.step === "error") {
                setRenderError(event.message);
                setRenderLogs((prev) => [...prev, `❌ [ERROR] ${event.message}`]);
                setIsRendering(false);
              }
            } catch (parseErr) {
              console.warn("Parse SSE event error:", parseErr);
            }
          }
        }
      }
    } catch (err: any) {
      setRenderError(err.message || "Lỗi tiến trình render video");
      setIsRendering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070D12] text-[#E8F1F5] font-sans selection:bg-[#00E5FF]/30">
      {/* ================= HEADER NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-[#0B151E]/95 backdrop-blur-md border-b border-[#00E5FF]/20 px-6 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0E3547] to-[#00E5FF] flex items-center justify-center border border-[#00E5FF]/40 shadow-lg shadow-[#00E5FF]/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🎙️</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-wider text-[#00E5FF] uppercase font-sans">
                  Podcast Talk Studio
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white rounded-full">
                  Template Mới
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Vertical Q&A Split-Screen Engine • Đối Thoại 2 Người
              </p>
            </div>
          </Link>

          {/* View Switcher Tabs */}
          <nav className="hidden md:flex items-center bg-[#070D12] p-1 rounded-xl border border-white/10 space-x-1">
            <Link
              href="/"
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Thư viện</span>
            </Link>

            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0E3547] text-[#00E5FF] shadow border border-[#00E5FF]/40">
              <Mic className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>🎙️ Studio Podcast Q&A</span>
            </div>
          </nav>
        </div>

        {/* Right Action Icons & Auto-save badge */}
        <div className="flex items-center space-x-3">
          {lastAutoSavedTime && (
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#0E3547]/80 border border-[#00E5FF]/30 text-[11px] text-[#00E5FF]">
              <Check className="w-3.5 h-3.5" />
              <span>Đã lưu: {lastAutoSavedTime}</span>
            </div>
          )}

          <CreateVideoDropdown
            onSelectOption={(type) => {
              if (type === "podcast") {
                handleClearForm();
              }
            }}
          />

          <button
            onClick={handleClearForm}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Xóa toàn bộ kịch bản hiện tại để làm mới"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm mới form</span>
          </button>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* AI PODCAST ASSISTANT BOX */}
        <div className="bg-gradient-to-r from-[#0B1924] via-[#0E2230] to-[#121B2A] rounded-2xl border border-[#00E5FF]/30 p-5 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00E5FF] to-[#8B5CF6] flex items-center justify-center text-black font-black text-lg shadow-lg">
                ✨
              </div>
              <div>
                <h2 className="text-sm md:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  AI Biên Kịch Podcast Q&A 2 Người
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">
                    Dual Speaker
                  </span>
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  Nhập chủ đề để AI tự động tạo các lượt đối thoại kịch tính luân phiên giữa Host và Guest
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExportBox(!showExportBox)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-all"
              >
                <Code className="w-3.5 h-3.5" />
                <span>Xuất kịch bản</span>
                {showExportBox ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* AI Idea Prompt */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="Nhập chủ đề podcast (Ví dụ: So sánh chiến thuật giữa Real Madrid và Man City, Ai là GOAT...)"
              className="flex-1 bg-[#070D12] border border-white/15 focus:border-[#00E5FF] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isAiGenerating) {
                  handleGenerateAiScript(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleGenerateAiScript(false)}
              disabled={isAiGenerating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#3B82F6] hover:from-[#33EAFF] hover:to-[#60A5FA] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00E5FF]/20 transition-all disabled:opacity-50"
            >
              {isAiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>{isAiGenerating ? "Đang viết..." : "AI Viết Kịch Bản"}</span>
            </button>
          </div>

          {/* Refine Box */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              placeholder="Yêu cầu AI tinh chỉnh thêm (Ví dụ: Cho câu chốt của Guest đanh thép hơn, tăng số liệu Cúp C1...)"
              className="flex-1 bg-[#070D12]/60 border border-white/10 focus:border-[#FFD200] rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isRefining && refinePrompt.trim()) {
                  handleGenerateAiScript(true);
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleGenerateAiScript(true)}
              disabled={isRefining || !refinePrompt.trim()}
              className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-white/10 text-xs font-bold text-[#FFD200] flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Tinh chỉnh</span>
            </button>
          </div>

          {aiError && (
            <div className="mt-3 p-3 rounded-xl bg-[#FF334B]/15 border border-[#FF334B]/30 text-xs text-[#FF8595] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* Export Script Box */}
          {showExportBox && (
            <div className="mt-4 p-4 rounded-xl bg-[#070D12] border border-[#00E5FF]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#00E5FF]" />
                  Toàn bộ nội dung kịch bản (Copy để tinh chỉnh thêm qua ChatGPT / Gemini):
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyExport("text")}
                    className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white flex items-center gap-1 transition-all"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Dạng Chữ</span>
                  </button>
                  <button
                    onClick={() => handleCopyExport("json")}
                    className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-[#00E5FF] flex items-center gap-1 transition-all"
                  >
                    <Code className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={getFullScriptExportText()}
                rows={6}
                className="w-full bg-[#05090C] border border-white/10 rounded-lg p-3 text-xs font-mono text-[#94A3B8] focus:outline-none"
              />
              {copySuccess && (
                <p className="text-[11px] text-[#10B981] font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Đã sao chép vào bộ nhớ đệm!
                </p>
              )}
            </div>
          )}
        </div>

        {/* ================= GENERAL SETTINGS ================= */}
        <div className="bg-[#0B151E] rounded-2xl border border-white/10 p-5 space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span>⚙️ Thông Tin Video Podcast</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-[#94A3B8]">Tiêu đề Podcast (Hiện trên thanh Header)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề cuộc trò chuyện..."
                className="w-full bg-[#070D12] border border-white/15 focus:border-[#00E5FF] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8]">Tên Kênh / Thương hiệu</label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="Phía sau sân cỏ • Podcast Talk"
                className="w-full bg-[#070D12] border border-white/15 focus:border-[#00E5FF] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8]">Slug nhận diện (Tên file output)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="podcast-chu-de"
                className="w-full bg-[#070D12] border border-white/15 focus:border-[#00E5FF] rounded-xl px-4 py-2.5 text-xs font-mono text-[#00E5FF] placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8]">Audio Engine</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProvider("vieneu")}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    provider === "vieneu"
                      ? "bg-[#0E3547] border-[#00E5FF] text-[#00E5FF]"
                      : "bg-[#070D12] border-white/10 text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>VieNeu TTS (Local 48kHz ⭐)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("edge")}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    provider === "edge"
                      ? "bg-[#0E3547] border-[#00E5FF] text-[#00E5FF]"
                      : "bg-[#070D12] border-white/10 text-[#94A3B8] hover:text-white"
                  }`}
                >
                  <span>Edge TTS (Cloud Dự phòng)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= DUAL SPEAKER PROFILES ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* HOST CARD (ZONE TRÊN) */}
          <div className="bg-[#0B151E] rounded-2xl border-2 border-[#00E5FF]/40 p-5 space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-[#00E5FF] to-transparent px-4 py-1 text-black font-black text-[10px] uppercase tracking-wider">
              Zone Trên
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0E3547] to-[#00E5FF] flex items-center justify-center text-2xl border border-[#00E5FF]/60 shadow-lg shadow-[#00E5FF]/20">
                {hostAvatar || "🎙️"}
              </div>
              <div>
                <h3 className="text-base font-black text-[#00E5FF] flex items-center gap-2">
                  <span>🎙️ HOST (Người Dẫn)</span>
                </h3>
                <p className="text-xs text-[#94A3B8]">Đặt câu hỏi mở, phản biện và điều phối nhịp điệu</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Tên hiển thị Host</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="w-full bg-[#070D12] border border-white/15 focus:border-[#00E5FF] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Vai trò / Chức danh</label>
                <input
                  type="text"
                  value={hostRole}
                  onChange={(e) => setHostRole(e.target.value)}
                  className="w-full bg-[#070D12] border border-white/15 focus:border-[#00E5FF] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-bold text-[#94A3B8]">Giọng đọc Host</label>
                <select
                  value={hostVoice}
                  onChange={(e) => setHostVoice(e.target.value)}
                  className="w-full bg-[#070D12] border border-white/15 focus:border-[#00E5FF] rounded-xl px-3 py-2 text-xs text-white"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.voice}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Avatar (Emoji)</label>
                <input
                  type="text"
                  value={hostAvatar}
                  onChange={(e) => setHostAvatar(e.target.value)}
                  placeholder="🎙️"
                  className="w-full bg-[#070D12] border border-white/15 focus:border-[#00E5FF] rounded-xl px-3 py-2 text-xs text-center text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handlePreviewSpeaker("host")}
              disabled={previewingSpeaker === "host"}
              className="w-full py-2 rounded-xl bg-[#0E3547] hover:bg-[#134963] border border-[#00E5FF]/40 text-xs font-bold text-[#00E5FF] flex items-center justify-center gap-2 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{previewingSpeaker === "host" ? "Đang phát thử..." : "🔊 Nghe thử giọng Host"}</span>
            </button>
          </div>

          {/* GUEST CARD (ZONE DƯỚI) */}
          <div className="bg-[#0B151E] rounded-2xl border-2 border-[#FFD200]/40 p-5 space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-[#FFD200] to-transparent px-4 py-1 text-black font-black text-[10px] uppercase tracking-wider">
              Zone Dưới
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3D2E0E] to-[#FFD200] flex items-center justify-center text-2xl border border-[#FFD200]/60 shadow-lg shadow-[#FFD200]/20">
                {guestAvatar || "⭐"}
              </div>
              <div>
                <h3 className="text-base font-black text-[#FFD200] flex items-center gap-2">
                  <span>⭐ GUEST (Khách Mời)</span>
                </h3>
                <p className="text-xs text-[#94A3B8]">Chuyên gia phân tích sâu, đưa số liệu và góc nhìn độc đáo</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Tên hiển thị Guest</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-[#070D12] border border-white/15 focus:border-[#FFD200] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Vai trò / Chức danh</label>
                <input
                  type="text"
                  value={guestRole}
                  onChange={(e) => setGuestRole(e.target.value)}
                  className="w-full bg-[#070D12] border border-white/15 focus:border-[#FFD200] rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-bold text-[#94A3B8]">Giọng đọc Guest</label>
                <select
                  value={guestVoice}
                  onChange={(e) => setGuestVoice(e.target.value)}
                  className="w-full bg-[#070D12] border border-white/15 focus:border-[#FFD200] rounded-xl px-3 py-2 text-xs text-white"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.voice}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#94A3B8]">Avatar (Emoji)</label>
                <input
                  type="text"
                  value={guestAvatar}
                  onChange={(e) => setGuestAvatar(e.target.value)}
                  placeholder="⭐"
                  className="w-full bg-[#070D12] border border-white/15 focus:border-[#FFD200] rounded-xl px-3 py-2 text-xs text-center text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handlePreviewSpeaker("guest")}
              disabled={previewingSpeaker === "guest"}
              className="w-full py-2 rounded-xl bg-[#2A230D] hover:bg-[#3D3313] border border-[#FFD200]/40 text-xs font-bold text-[#FFD200] flex items-center justify-center gap-2 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{previewingSpeaker === "guest" ? "Đang phát thử..." : "🔊 Nghe thử giọng Guest"}</span>
            </button>
          </div>
        </div>

        {/* ================= DIALOGUE TURNS EDITOR ================= */}
        <div className="bg-[#0B151E] rounded-2xl border border-white/10 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>💬 Kịch Bản Lượt Đối Thoại ({scriptTurns.length} lượt)</span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Bấm nút [🎙️ HOST] hoặc [⭐ GUEST] để chuyển người nói cho từng câu
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddTurn}
              className="px-4 py-2 rounded-xl bg-[#0E3547] hover:bg-[#134963] border border-[#00E5FF]/40 text-xs font-bold text-[#00E5FF] flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm lượt đối thoại</span>
            </button>
          </div>

          <div className="space-y-4">
            {scriptTurns.map((turn, index) => {
              const isHost = turn.speaker === "host";
              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-all ${
                    isHost
                      ? "bg-[#07131B] border-[#00E5FF]/30 hover:border-[#00E5FF]/60"
                      : "bg-[#141208] border-[#FFD200]/30 hover:border-[#FFD200]/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#94A3B8]">#{index + 1}</span>

                      {/* SPEAKER TOGGLE PILL */}
                      <button
                        type="button"
                        onClick={() => handleToggleSpeaker(index)}
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all ${
                          isHost
                            ? "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50 shadow-sm shadow-[#00E5FF]/20"
                            : "bg-[#FFD200]/20 text-[#FFD200] border-[#FFD200]/50 shadow-sm shadow-[#FFD200]/20"
                        }`}
                      >
                        {isHost ? (
                          <>
                            <span>🎙️ HOST</span>
                            <span className="text-[10px] font-normal text-white/70">({hostName})</span>
                          </>
                        ) : (
                          <>
                            <span>⭐ GUEST</span>
                            <span className="text-[10px] font-normal text-white/70">({guestName})</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handlePreviewTurnAudio(index)}
                        disabled={!turn.tts.trim()}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#94A3B8] hover:text-white flex items-center gap-1 transition-all disabled:opacity-30"
                        title="Nghe thử câu này"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {previewingTurnIndex === index ? "Đang phát..." : "Nghe"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTurn(index)}
                        disabled={scriptTurns.length <= 1}
                        className="p-1 rounded-lg text-white/40 hover:text-[#FF334B] hover:bg-[#FF334B]/10 transition-all disabled:opacity-20"
                        title="Xoá câu này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* TTS Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        Lời thoại đọc (TTS Voiceover)
                      </label>
                      <textarea
                        value={turn.tts}
                        onChange={(e) => handleUpdateTurn(index, "tts", e.target.value)}
                        rows={2}
                        placeholder={
                          isHost
                            ? "Nhập câu nói của Host (hoặc bấm 'AI Viết Kịch Bản' ở trên)..."
                            : "Nhập câu nói phản biện / phân tích của Khách mời..."
                        }
                        className="w-full bg-[#05090C] border border-white/10 focus:border-white/30 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none"
                      />
                    </div>

                    {/* Caption Input */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                          Phụ đề hiển thị (Dùng &lt;span class=&quot;kw&quot;&gt;từ khóa&lt;/span&gt;)
                        </label>
                      </div>
                      <textarea
                        value={turn.caption}
                        onChange={(e) => handleUpdateTurn(index, "caption", e.target.value)}
                        rows={2}
                        placeholder={
                          isHost
                            ? 'Phụ đề Host, ví dụ: Này anh, giữa <span class="kw">A</span> và <span class="kw">B</span> ai đỉnh hơn?'
                            : 'Phụ đề Khách mời, ví dụ: Tôi đánh giá <span class="kw">quan điểm này</span> rất thuyết phục!'
                        }
                        className="w-full bg-[#05090C] border border-white/10 focus:border-white/30 rounded-lg p-2.5 text-xs font-mono text-[#00E5FF] placeholder-white/20 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= RENDER ACTION & STREAMING CONSOLE ================= */}
        <div className="bg-[#0B151E] rounded-2xl border-2 border-[#00E5FF]/40 p-6 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>🚀 Xuất Bản Video Podcast MP4</span>
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Hệ thống sẽ tổng hợp audio 2 giọng, sinh timeline HyperFrames và render video độ phân giải cao
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartRender}
              disabled={isRendering}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] to-[#8B5CF6] hover:opacity-95 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#00E5FF]/25 transition-all disabled:opacity-50"
            >
              {isRendering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{isRendering ? "Đang sản xuất video..." : "TẠO VIDEO PODCAST NGAY"}</span>
            </button>
          </div>

          {/* Progress Bar */}
          {isRendering && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#00E5FF]">{renderStatus}</span>
                <span className="text-white">{renderProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#05090C] rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] to-[#8B5CF6] rounded-full transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
            </div>
          )}

          {renderError && (
            <div className="p-4 rounded-xl bg-[#FF334B]/15 border border-[#FF334B]/40 text-xs text-[#FF8595] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{renderError}</span>
            </div>
          )}

          {/* Completed Video Player */}
          {completedVideoUrl && (
            <div className="p-5 rounded-xl bg-[#05130E] border-2 border-[#10B981] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-black text-[#10B981]">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>XUẤT BẢN THÀNH CÔNG! VIDEO ĐÃ SẴN SÀNG</span>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={completedVideoUrl}
                    download
                    className="px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-black text-xs uppercase flex items-center gap-1.5 transition-all shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Video MP4</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleDeleteCompletedVideo}
                    disabled={isDeletingVideo}
                    className="px-3.5 py-2 rounded-lg bg-[#FF334B]/20 hover:bg-[#FF334B]/30 text-[#FF8595] font-bold text-xs flex items-center gap-1.5 transition-all border border-[#FF334B]/40 disabled:opacity-50"
                    title="Xóa file video MP4 này"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeletingVideo ? "Đang xóa..." : "Xóa"}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <video
                  src={completedVideoUrl}
                  controls
                  autoPlay
                  className="max-h-[460px] rounded-xl border border-white/20 shadow-2xl"
                />
              </div>
            </div>
          )}

          {/* Live Log Console */}
          {renderLogs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#00E5FF]" />
                  Terminal Real-time Logs:
                </span>
                <span>{renderLogs.length} dòng</span>
              </div>
              <div className="bg-[#05090C] border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[11px] text-[#94A3B8] space-y-1">
                {renderLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
                <div ref={logsBottomRef} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
