"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Smile,
  Megaphone,
  Wind,
  Clock,
  ChevronDown,
  Info,
  Check,
  Volume2,
} from "lucide-react";

interface TtsEmotionToolbarProps {
  /** Văn bản hiện tại để tính live stats (nếu truyền) */
  text?: string;
  /** Tốc độ đọc hiện tại để tính thời lượng ước tính chuẩn xác (mặc định 1.0) */
  speed?: number;
  /** Callback khi người dùng chèn thẻ hoặc mẫu */
  onInsertTag?: (tagOrText: string) => void;
  /** Callback khi người dùng bấm nút xóa tag cảm xúc */
  onClearTags?: () => void;
  /** Tiêu đề phụ (nếu muốn ghi chú vị trí ô đang active) */
  activeTargetLabel?: string;
  /** ClassName bổ sung */
  className?: string;
  /** Cho phép thu gọn gọn gàng */
  compact?: boolean;
}

// Danh sách các thẻ cảm xúc chuẩn VieNeu-TTS / CIT Voice Studio
const EMOTION_TAGS = [
  {
    id: "cuoi",
    label: "Cười",
    tag: "[cười]",
    icon: Smile,
    desc: "Thêm tiếng cười nhẹ hoặc biểu cảm tươi vui tự nhiên",
    badgeBg: "bg-amber-500/15 hover:bg-amber-500/25",
    badgeBorder: "border-amber-500/50 hover:border-amber-400",
    textColor: "text-amber-300",
    tagColor: "text-amber-400/80",
    lightStyle: "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100",
  },
  {
    id: "hang-giong",
    label: "Hắng giọng",
    tag: "[hắng giọng]",
    icon: Megaphone,
    desc: "Động tác hắng giọng (e hèm) ngắt nhịp trịnh trọng",
    badgeBg: "bg-purple-500/15 hover:bg-purple-500/25",
    badgeBorder: "border-purple-500/50 hover:border-purple-400",
    textColor: "text-purple-300",
    tagColor: "text-purple-400/80",
    lightStyle: "bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100",
  },
  {
    id: "tho-dai",
    label: "Thở dài",
    tag: "[thở dài]",
    icon: Wind,
    desc: "Hơi thở dài, tạo độ sâu trầm ngâm hoặc thất vọng nhẹ",
    badgeBg: "bg-cyan-500/15 hover:bg-cyan-500/25",
    badgeBorder: "border-cyan-500/50 hover:border-cyan-400",
    textColor: "text-cyan-300",
    tagColor: "text-cyan-400/80",
    lightStyle: "bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100",
  },
  {
    id: "lay-hoi",
    label: "Lấy hơi",
    tag: "[lấy hơi]",
    icon: Wind,
    desc: "Tiếng lấy hơi sâu tự nhiên trước khi mở đầu hoặc chuyển ý",
    badgeBg: "bg-emerald-500/15 hover:bg-emerald-500/25",
    badgeBorder: "border-emerald-500/50 hover:border-emerald-400",
    textColor: "text-emerald-300",
    tagColor: "text-emerald-400/80",
    lightStyle: "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100",
  },
];

// Danh sách thời gian nghỉ nhanh
const PAUSE_OPTIONS = [
  { label: "0.5s", tag: "[nghỉ 0.5s]" },
  { label: "0.8s", tag: "[nghỉ 0.8s]" },
  { label: "1.0s (Chuẩn)", tag: "[nghỉ 1s]" },
  { label: "1.5s", tag: "[nghỉ 1.5s]" },
  { label: "2.0s", tag: "[nghỉ 2s]" },
  { label: "3.0s", tag: "[nghỉ 3s]" },
];

// Các mẫu câu mẫu (Preset Tones) với tag cảm xúc được lồng ghép tự nhiên
const SAMPLE_PRESETS: { [key: string]: { label: string; desc: string; samples: string[] } } = {
  intro: {
    label: "Giới thiệu",
    desc: "Lời chào mở đầu hào hứng, cuốn hút người xem",
    samples: [
      "Chào mừng bạn quay trở lại! [cười] Hôm nay chúng ta sẽ cùng khám phá một chủ đề vô cùng thú vị.",
      "Xin chào các bạn! [cười] Đã bao giờ bạn tự hỏi điều gì tạo nên sự khác biệt thực sự chưa?",
      "Bạn có tin vào điều này không? [nghỉ 0.8s] Hãy cùng mình bóc tách câu chuyện ngay sau đây nhé!",
    ],
  },
  emotion: {
    label: "Cảm xúc",
    desc: "Câu thoại giàu cảm xúc, chạm sâu vào tâm lý khán giả",
    samples: [
      "Thật không thể ngờ được [thở dài]... mọi nỗ lực bao năm qua lại có thể tan biến chỉ trong một khoảnh khắc.",
      "Cuộc sống đôi khi thật kỳ lạ, [nghỉ 1s] người bạn tin tưởng nhất lại là người khiến bạn thất vọng nhất [thở dài].",
      "Hạnh phúc không ở đâu xa xôi [cười], nó ở ngay trong chính cách bạn nhìn nhận cuộc đời này.",
    ],
  },
  narrative: {
    label: "Thuyết minh",
    desc: "Văn phong điềm đạm, triết lý, truyền cảm hứng",
    samples: [
      "Theo quy luật phản hồi của tự nhiên, [nghỉ 1s] mọi hành động gieo xuống hôm nay đều sẽ cho quả ngọt vào ngày mai.",
      "Đừng vội nản lòng khi chưa thấy kết quả, [nghỉ 0.8s] bởi hoa cần thời gian để nở và quả cần đủ nắng để chín.",
      "Vũ trụ này luôn công bằng và chuẩn xác [nghỉ 1s], chưa từng bỏ sót bất kỳ một hạt giống thiện lương nào.",
    ],
  },
  story: {
    label: "Kể chuyện",
    desc: "Kể chuyện ly kỳ, chậm rãi, dẫn dắt tình tiết",
    samples: [
      "Mọi chuyện bắt đầu vào một buổi chiều mưa gió, [nghỉ 1.2s] khi người đàn ông ấy đưa ra một quyết định làm thay đổi cả cuộc đời.",
      "Không một ai hay biết chuyện gì đã thực sự xảy ra [hắng giọng], cho đến khi bí mật ấy được hé lộ.",
      "Sau những năm tháng bôn ba khắp bốn phương trời [thở dài], cuối cùng anh nhận ra bình yên mới là điều quý giá nhất.",
    ],
  },
  promo: {
    label: "Quảng cáo",
    desc: "Kêu gọi hành động (CTA) dứt khoát, thuyết phục",
    samples: [
      "Bạn đã sẵn sàng nâng cấp bản thân ngay hôm nay chưa? [cười] Đừng quên bấm theo dõi kênh để không bỏ lỡ những video mới nhé!",
      "Hãy để lại bình luận góc nhìn của bạn ở bên dưới [nghỉ 0.8s] và cùng nhau bàn luận nhé!",
      "Nếu thấy video hữu ích, hãy thả một tim và chia sẻ cho người bạn thân nhất của bạn nhé! [cười]",
    ],
  },
};

export default function TtsEmotionToolbar({
  text = "",
  speed = 1.0,
  onInsertTag,
  onClearTags,
  activeTargetLabel,
  className = "",
  compact = false,
}: TtsEmotionToolbarProps) {
  // Theme phong cách: "emerald" (mặc định Dark theme của app) hoặc "light" (như ảnh chụp mẫu)
  const [themeMode, setThemeMode] = useState<"emerald" | "light">("emerald");

  // Dropdown chọn thời gian nghỉ
  const [isPauseDropdownOpen, setIsPauseDropdownOpen] = useState(false);
  const pauseDropdownRef = useRef<HTMLDivElement | null>(null);

  // Popover chọn mẫu câu chi tiết
  const [activePresetCategory, setActivePresetCategory] = useState<string | null>(null);
  const presetDropdownRef = useRef<HTMLDivElement | null>(null);

  // Feedback khi vừa bấm chèn
  const [insertedNotification, setInsertedNotification] = useState<string | null>(null);

  // Theo dõi input/textarea đang focus trên toàn trang
  const [activeElementText, setActiveElementText] = useState<string>("");
  const lastActiveElementRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Lắng nghe focusin trên window để bắt chính xác textarea/input người dùng đang thao tác
  useEffect(() => {
    function handleFocusIn(e: FocusEvent) {
      const target = e.target;
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type === "text")
      ) {
        lastActiveElementRef.current = target;
        setActiveElementText(target.value);
      }
    }

    function handleInput(e: Event) {
      if (e.target === lastActiveElementRef.current) {
        const target = e.target as HTMLTextAreaElement | HTMLInputElement;
        setActiveElementText(target.value);
      }
    }

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("input", handleInput);

    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("input", handleInput);
    };
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pauseDropdownRef.current &&
        !pauseDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPauseDropdownOpen(false);
      }
      if (
        presetDropdownRef.current &&
        !presetDropdownRef.current.contains(event.target as Node)
      ) {
        setActivePresetCategory(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tính toán Live Metrics (Ký tự, Từ, Câu, Ước tính thời lượng Audio)
  const effectiveText = text || activeElementText;

  // Lọc bỏ tag để đếm từ và câu thuần túy
  const plainText = effectiveText.replace(/\[[^\]]+\]/g, " ").trim();
  const charCount = effectiveText.length;
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const sentenceCount = plainText
    ? plainText.split(/[.?!;\n]+/).filter((s) => s.trim().length > 0).length
    : 0;

  // Tính thời lượng audio ước tính:
  // 1. Tốc độ đọc tiếng Việt thông thường: ~3.2 từ/giây tại speed 1.0
  const speechSec = (wordCount / 3.2) / (speed > 0 ? speed : 1.0);

  // 2. Cộng thời gian của các thẻ cảm xúc
  let tagSec = 0;
  // [cười]: ~0.8s
  const cuoiMatches = effectiveText.match(/\[cười\]/gi);
  if (cuoiMatches) tagSec += cuoiMatches.length * 0.8;

  // [hắng giọng]: ~0.7s
  const hangMatches = effectiveText.match(/\[hắng giọng\]/gi);
  if (hangMatches) tagSec += hangMatches.length * 0.7;

  // [thở dài]: ~0.9s
  const thoMatches = effectiveText.match(/\[thở dài\]/gi);
  if (thoMatches) tagSec += thoMatches.length * 0.9;

  // [nghỉ Xs] hoặc [nghỉ X.Ys]
  const nghiRegex = /\[nghỉ\s+([0-9.]+)(s|ms)?\]/gi;
  let match;
  while ((match = nghiRegex.exec(effectiveText)) !== null) {
    const val = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase() || "s";
    if (!isNaN(val)) {
      tagSec += unit === "ms" ? val / 1000 : val;
    }
  }

  const totalEstimatedSec = Math.max(0, Math.round(speechSec + tagSec));

  // Thực hiện chèn thẻ hoặc văn bản vào vị trí con trỏ của input đang active
  const handleInsert = (contentToInsert: string) => {
    // 1. Nếu component cha có truyền onInsertTag riêng
    if (onInsertTag) {
      onInsertTag(contentToInsert);
    }

    // 2. Chèn trực tiếp vào textarea / input đang active trên DOM
    const el = lastActiveElementRef.current;
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const original = el.value;

      // Khoảng cách tự nhiên
      let insert = contentToInsert;
      const charBefore = start > 0 ? original[start - 1] : "";
      const charAfter = end < original.length ? original[end] : "";

      if (charBefore && charBefore !== " " && charBefore !== "\n") {
        insert = " " + insert;
      }
      if (charAfter && charAfter !== " " && charAfter !== "\n" && !charAfter.match(/[,.?!;:]/)) {
        insert = insert + " ";
      }

      const newValue = original.substring(0, start) + insert + original.substring(end);

      // Kích hoạt setter native để React cập nhật state của input tương ứng
      const nativeSetter = Object.getOwnPropertyDescriptor(
        el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(el, newValue);
      } else {
        el.value = newValue;
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));

      const newCursorPos = start + insert.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
      el.focus();

      setActiveElementText(newValue);
    }

    // Hiển thị feedback nhanh
    setInsertedNotification(`Đã chèn ${contentToInsert}`);
    setTimeout(() => setInsertedNotification(null), 1800);
  };

  // Xóa toàn bộ thẻ cảm xúc
  const handleClearTags = () => {
    if (onClearTags) {
      onClearTags();
      setInsertedNotification("Đã xóa sạch thẻ cảm xúc");
      setTimeout(() => setInsertedNotification(null), 1800);
      return;
    }
    const el = lastActiveElementRef.current;
    if (el) {
      const original = el.value;
      const cleaned = original
        .replace(/\[(?:cười|hắng giọng|thở dài|lấy hơi|nghỉ|nghi|pause)[^\]]*\]\s*/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      el.value = cleaned;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      setActiveElementText(cleaned);
      setInsertedNotification("Đã xóa thẻ cảm xúc trong ô đang chọn");
      setTimeout(() => setInsertedNotification(null), 1800);
    }
  };

  const isLight = themeMode === "light";

  return (
    <div
      className={`rounded-2xl transition-all shadow-md select-none ${
        isLight
          ? "bg-white border-2 border-slate-200 text-slate-800"
          : "bg-[#0A2219]/90 border border-[#10B981]/35 text-[#EBF8F2] backdrop-blur-md"
      } ${compact ? "p-3 space-y-2.5" : "p-4 space-y-3.5"} ${className}`}
    >
      {/* ================= DÒNG 1: TAG CẢM XÚC ================= */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Label Header */}
          <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-[#FFD200] mr-1">
            <Sparkles className="w-4 h-4 text-[#FFD200]" />
            <span className={isLight ? "text-amber-600" : "text-[#FFD200]"}>
              Tag Cảm xúc:
            </span>
          </div>

          {/* 3 Tag Cảm xúc chính: Cười, Hắng giọng, Thở dài */}
          {EMOTION_TAGS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // Ngăn mất focus trên textarea
                onClick={() => handleInsert(item.tag)}
                title={`${item.desc} (Click để chèn vào vị trí con trỏ)`}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
                  isLight
                    ? item.lightStyle
                    : `${item.badgeBg} ${item.badgeBorder} ${item.textColor}`
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                <span className={`text-[10px] font-mono opacity-80 ${isLight ? "text-slate-600" : item.tagColor}`}>
                  {item.tag}
                </span>
              </button>
            );
          })}

          {/* Thẻ Nghỉ với dropdown chọn thời gian */}
          <div className="relative" ref={pauseDropdownRef}>
            <div className="inline-flex rounded-xl shadow-sm">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleInsert("[nghỉ 1s]")}
                title="Chèn thẻ ngắt nhịp nghỉ 1 giây"
                className={`px-3 py-1.5 rounded-l-xl border border-r-0 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                    : "bg-[#143D2E]/80 border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/25"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Nghỉ</span>
                <span className={`text-[10px] font-mono opacity-80 ${isLight ? "text-slate-500" : "text-[#10B981]/80"}`}>
                  [nghỉ 1s]
                </span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsPauseDropdownOpen(!isPauseDropdownOpen)}
                title="Chọn các mốc thời gian nghỉ khác (0.5s - 3s)"
                className={`px-2 py-1.5 rounded-r-xl border text-xs flex items-center transition-all cursor-pointer ${
                  isLight
                    ? "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
                    : "bg-[#143D2E] border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/30"
                }`}
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${isPauseDropdownOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Menu chọn mốc thời gian nghỉ */}
            {isPauseDropdownOpen && (
              <div
                className={`absolute left-0 mt-1.5 w-48 rounded-xl shadow-2xl p-1.5 z-50 border animate-in fade-in zoom-in-95 duration-150 ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-800"
                    : "bg-[#081C15]/95 border-[#10B981]/40 text-white backdrop-blur-xl"
                }`}
              >
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-500/20 mb-1">
                  Chọn mốc ngắt nghỉ:
                </div>
                {PAUSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.tag}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      handleInsert(opt.tag);
                      setIsPauseDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                      isLight
                        ? "hover:bg-slate-100 text-slate-700"
                        : "hover:bg-[#10B981]/20 text-[#EBF8F2]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="font-mono text-[10px] text-[#FFD200]">{opt.tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nút Clear Tag */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClearTags}
            title="Xóa tất cả các thẻ cảm xúc và khoảng nghỉ"
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer active:scale-95 ${
              isLight
                ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                : "bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-300"
            }`}
          >
            <span>🧹 Xóa tag</span>
          </button>
        </div>

        {/* Nút chuyển đổi Giao diện (Dark / Light y như hình chụp) */}
        <div className="flex items-center gap-1.5">
          {insertedNotification && (
            <span className="text-[11px] font-mono text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded-lg border border-[#10B981]/30 animate-pulse">
              ✓ {insertedNotification}
            </span>
          )}
          <button
            type="button"
            onClick={() => setThemeMode(isLight ? "emerald" : "light")}
            className={`text-[10px] px-2 py-1 rounded-lg border font-mono transition ${
              isLight
                ? "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
                : "bg-[#071912] border-[#10B981]/30 text-[#EBF8F2]/60 hover:text-white"
            }`}
            title="Đổi màu giao diện thanh công cụ (Dark Stadium / Light Theme)"
          >
            {isLight ? "🌙 Theme Tối" : "☀️ Theme Sáng"}
          </button>
        </div>
      </div>

      {/* ================= DÒNG 2: MẪU CÂU (PRESETS) ================= */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-[#10B981]/20" ref={presetDropdownRef}>
        <div className="flex items-center space-x-1.5 text-xs font-bold text-[#FFD200] mr-1">
          <Sparkles className="w-3.5 h-3.5 text-[#FFD200]" />
          <span className={isLight ? "text-amber-600" : "text-[#FFD200]"}>Mẫu:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(SAMPLE_PRESETS).map(([key, item]) => {
            const isActive = activePresetCategory === key;
            return (
              <div key={key} className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setActivePresetCategory(isActive ? null : key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#FFD200] text-[#081C15] border-[#FFD200] font-bold shadow-md"
                      : isLight
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                      : "bg-[#143D2E]/60 hover:bg-[#143D2E] border-[#10B981]/25 text-[#EBF8F2]/80 hover:text-white"
                  }`}
                  title={`${item.desc} (Bấm để xem các mẫu câu)`}
                >
                  <span>{item.label}</span>
                </button>

                {/* Popover danh sách câu mẫu khi bấm vào từng Mẫu */}
                {isActive && (
                  <div
                    className={`absolute left-0 mt-2 w-80 rounded-2xl shadow-2xl p-3 z-50 border animate-in fade-in zoom-in-95 duration-150 ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-800"
                        : "bg-[#081C15]/98 border-[#10B981]/50 text-white backdrop-blur-2xl"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-500/20 mb-2">
                      <span className="text-xs font-bold text-[#FFD200] uppercase">
                        Mẫu: {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400">Click để chèn</span>
                    </div>
                    <div className="space-y-1.5">
                      {item.samples.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            handleInsert(sample);
                            setActivePresetCategory(null);
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs leading-relaxed transition ${
                            isLight
                              ? "bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 text-slate-700"
                              : "bg-[#0E291E]/70 hover:bg-[#143D2E] hover:border-[#FFD200]/40 border border-[#10B981]/20 text-[#EBF8F2]/90"
                          }`}
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= DÒNG 3: FOOTER THỐNG KÊ LIVE & ƯỚC TÍNH AUDIO ================= */}
      <div
        className={`flex items-center justify-between text-xs pt-2.5 border-t font-mono ${
          isLight
            ? "border-slate-200 text-slate-500"
            : "border-[#10B981]/20 text-[#EBF8F2]/60"
        }`}
      >
        {/* Bên trái: Đếm Ký tự • Từ • Câu */}
        <div className="flex items-center space-x-2">
          <span>
            <strong className={isLight ? "text-slate-800" : "text-white"}>{charCount}</strong> ký tự
          </span>
          <span className="opacity-40">•</span>
          <span>
            <strong className={isLight ? "text-slate-800" : "text-white"}>{wordCount}</strong> từ
          </span>
          <span className="opacity-40">•</span>
          <span>
            <strong className={isLight ? "text-slate-800" : "text-white"}>{sentenceCount}</strong> câu
          </span>
        </div>

        {/* Bên phải: Ước tính thời lượng Audio */}
        <div className="flex items-center space-x-1.5 font-sans italic">
          <span>Ước tính:</span>
          <span
            className={`font-mono font-bold not-italic px-2 py-0.5 rounded-lg border ${
              isLight
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-[#FFD200]/15 text-[#FFD200] border-[#FFD200]/30"
            }`}
          >
            ~{totalEstimatedSec}s audio
          </span>
        </div>
      </div>
    </div>
  );
}

