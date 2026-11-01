"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, ChevronDown, Sparkles, Mic, ArrowRight } from "lucide-react";

interface CreateVideoDropdownProps {
  className?: string;
  onSelectOption?: (type: "compare" | "podcast" | "broll") => void;
}

export default function CreateVideoDropdown({
  className = "",
  onSelectOption,
}: CreateVideoDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (type: "compare" | "podcast" | "broll") => {
    setIsOpen(false);
    if (onSelectOption) {
      onSelectOption(type);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#FFD200] text-[#081C15] font-black text-xs uppercase tracking-wide hover:shadow-lg hover:shadow-[#10B981]/25 hover:brightness-105 active:scale-95 transition-all cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>Tạo Video Mới</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Options */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-84 bg-[#071912]/95 backdrop-blur-xl border-2 border-[#10B981]/40 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#EBF8F2]/50 border-b border-[#EBF8F2]/10 mb-1.5 flex items-center justify-between">
            <span>Chọn Định Dạng Video</span>
            <span className="text-[#FFD200] font-mono">3 Formats + Studio Pro</span>
          </div>

          <div className="space-y-1.5">
            {/* Format 1: Video So Sánh (A vs B) */}
            <Link
              href="/create?new=1"
              onClick={() => handleItemClick("compare")}
              className="flex items-start space-x-3 p-2.5 rounded-xl bg-[#0E291E]/50 hover:bg-[#143D2E] border border-transparent hover:border-[#FFD200]/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#143D2E] to-[#10B981] border border-[#FFD200]/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-md">
                ⚔️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white group-hover:text-[#FFD200] transition-colors flex items-center gap-1.5">
                    <span>Video So Sánh</span>
                  </h4>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#FFD200]/20 text-[#FFD200] border border-[#FFD200]/30">
                    3-Zone
                  </span>
                </div>
                <p className="text-[11px] text-[#EBF8F2]/60 mt-0.5 leading-snug line-clamp-2">
                  Đối chiếu A vs B kịch tính 30-40s, 12 câu chuẩn nhịp Reels / TikTok
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#EBF8F2]/30 group-hover:text-[#FFD200] self-center shrink-0 -translate-x-1 group-hover:translate-x-0 transition-all" />
            </Link>

            {/* Format 2: Video Podcast Q&A (2 Người) */}
            <Link
              href="/podcast"
              onClick={() => handleItemClick("podcast")}
              className="flex items-start space-x-3 p-2.5 rounded-xl bg-[#071F2C]/50 hover:bg-[#0E3547] border border-transparent hover:border-[#00E5FF]/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0E3547] to-[#00E5FF] border border-[#00E5FF]/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-md">
                🎙️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white group-hover:text-[#00E5FF] transition-colors flex items-center gap-1.5">
                    <span>Video Podcast Talk</span>
                  </h4>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">
                    2 Người
                  </span>
                </div>
                <p className="text-[11px] text-[#EBF8F2]/60 mt-0.5 leading-snug line-clamp-2">
                  Hội thoại hỏi đáp Host & Khách mời dọc 9:16 chia nửa màn hình
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#EBF8F2]/30 group-hover:text-[#00E5FF] self-center shrink-0 -translate-x-1 group-hover:translate-x-0 transition-all" />
            </Link>

            {/* Format 3: Video B-Roll (Stock Video + Phụ đề Highlight từng từ) */}
            <Link
              href="/broll"
              onClick={() => handleItemClick("broll")}
              className="flex items-start space-x-3 p-2.5 rounded-xl bg-[#201505]/50 hover:bg-[#3D290A] border border-transparent hover:border-[#FFB703]/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3D290A] to-[#FB8500] border border-[#FFB703]/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-md">
                🎬
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white group-hover:text-[#FFB703] transition-colors flex items-center gap-1.5">
                    <span>Video B-Roll & Phụ Đề</span>
                  </h4>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#FB8500]/20 text-[#FFB703] border border-[#FB8500]/30">
                    Stock 9:16
                  </span>
                </div>
                <p className="text-[11px] text-[#EBF8F2]/60 mt-0.5 leading-snug line-clamp-2">
                  Thuyết minh stock video từ máy tính, phụ đề highlight từng từ (Word-by-word)
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#EBF8F2]/30 group-hover:text-[#FFB703] self-center shrink-0 -translate-x-1 group-hover:translate-x-0 transition-all" />
            </Link>

            <div className="border-t border-[#10B981]/20 my-1.5" />

            {/* Chức năng mới: Studio Timeline Pro (CapCut / Premiere Style) */}
            <Link
              href="/studio"
              onClick={() => setIsOpen(false)}
              className="flex items-start space-x-3 p-2.5 rounded-xl bg-gradient-to-r from-[#143D2E] to-[#0E291E] hover:from-[#10B981]/30 hover:to-[#FFD200]/10 border border-[#10B981]/40 hover:border-[#FFD200] transition-all group shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#FFD200] border border-[#FFD200]/50 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-md text-[#081C15]">
                ⚡
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white group-hover:text-[#FFD200] transition-colors flex items-center gap-1.5">
                    <span>Studio Timeline Pro</span>
                  </h4>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FFD200] text-[#081C15] shadow-xs">
                    CapCut Style ⭐
                  </span>
                </div>
                <p className="text-[11px] text-[#EBF8F2]/70 mt-0.5 leading-snug line-clamp-2">
                  Timeline đa track ngang, Word-by-word Subtitle, cắt khoảng lặng & kéo thả
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#FFD200] self-center shrink-0 -translate-x-1 group-hover:translate-x-0 transition-all" />
            </Link>

            {/* Chức năng: Chỉnh Sửa Video (Classic Editor) */}
            <Link
              href="/edit"
              onClick={() => setIsOpen(false)}
              className="flex items-start space-x-3 p-2 rounded-xl bg-[#0E291E]/30 hover:bg-[#143D2E]/60 border border-transparent hover:border-[#10B981]/30 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0E291E] border border-[#10B981]/30 flex items-center justify-center text-sm shrink-0 group-hover:scale-105 transition-transform">
                ✂️
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-[#EBF8F2]/70 group-hover:text-white transition-colors">
                    <span>Chỉnh sửa Video (Classic Form)</span>
                  </h4>
                  <span className="text-[9px] text-[#EBF8F2]/40 font-mono">v1</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
