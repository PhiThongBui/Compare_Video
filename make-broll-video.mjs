#!/usr/bin/env node
/**
 * make-broll-video.mjs — Engine sản xuất video B-roll dọc (9:16)
 * Tự động cắt ghép stock video từ máy tính + Voiceover AI + Phụ đề Highlight từng từ (Word-by-word)
 *
 * Cách dùng:
 *   node make-broll-video.mjs data/sample-broll.json
 *   node make-broll-video.mjs data/sample-broll.json --no-render
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import getMp3Duration from "get-mp3-duration";
import { synthesizeVoiceover } from "./modules/tts.mjs";
import { generateAssSubtitles } from "./modules/subtitles.mjs";
import { stitchBackgroundVideo } from "./modules/videoStitcher.mjs";
import { composeFinalVideo } from "./modules/composer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname);
const OUTPUT_DIR = path.join(ROOT, "output");

// Đảm bảo ffmpeg / ffprobe trên Windows có trong PATH
if (process.platform === "win32") {
  const localAppData = process.env.LOCALAPPDATA || "";
  const wingetPkgDir = path.join(localAppData, "Microsoft", "WinGet", "Packages");
  if (fs.existsSync(wingetPkgDir)) {
    try {
      for (const entry of fs.readdirSync(wingetPkgDir)) {
        if (entry.includes("FFmpeg")) {
          const ffmpegDir = path.join(wingetPkgDir, entry);
          for (const sub of fs.readdirSync(ffmpegDir)) {
            const binPath = path.join(ffmpegDir, sub, "bin");
            if (fs.existsSync(binPath) && !process.env.PATH.includes(binPath)) {
              process.env.PATH = `${binPath};${process.env.PATH}`;
            }
          }
        }
      }
    } catch {}
  }
}

// Đọc file .env
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.trim().match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const ENV = loadEnv();
const VIENEU_API_URL = (ENV.VIENEU_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
const VIENEU_API_KEY = ENV.VIENEU_API_KEY || "";
const DEFAULT_PROVIDER = ENV.TTS_PROVIDER || "vieneu";
const DEFAULT_VOICE = ENV.VIENEU_VOICE || "Hải Đăng";

export async function processBrollVideo(jsonPathOrData, options = {}) {
  let data;
  let jsonFile = "";

  if (typeof jsonPathOrData === "string") {
    jsonFile = path.resolve(jsonPathOrData);
    if (!fs.existsSync(jsonFile)) {
      throw new Error(`Không tìm thấy file kịch bản: ${jsonFile}`);
    }
    data = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
  } else {
    data = jsonPathOrData;
  }

  const slug = data.slug || (data.title ? data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `broll-${Date.now()}`);
  const workDir = path.join(OUTPUT_DIR, ".build-" + slug);
  fs.mkdirSync(workDir, { recursive: true });

  console.log(`\n============================================================`);
  console.log(`🎬 BẮT ĐẦU SẢN XUẤT VIDEO B-ROLL (STOCK + WORD SUBTITLES)`);
  console.log(`   Tiêu đề: ${data.title || slug}`);
  console.log(`   Giọng đọc: ${data.voice || DEFAULT_VOICE} (${data.provider || DEFAULT_PROVIDER})`);
  console.log(`============================================================\n`);

  // BƯỚC 1: TẠO VOICEOVER & LẤY TIMESTAMP TỪNG TỪ
  console.log(`[1/4] 🎙️ Đang xử lý Voiceover và mốc thời gian phụ đề...`);
  const voiceOutputPath = path.join(workDir, "voice.mp3");
  const voiceMetaPath = path.join(workDir, "voice-meta.json");
  const assOutputPath = path.join(workDir, "subtitles.ass");

  let voiceResult = null;
  const isReuseRequested = Boolean(options.reuseVoice || data.reuseVoice);
  const hasExistingVoiceFile = fs.existsSync(voiceOutputPath);

  if (isReuseRequested && hasExistingVoiceFile) {
    try {
      if (fs.existsSync(voiceMetaPath)) {
        const cachedMeta = JSON.parse(fs.readFileSync(voiceMetaPath, "utf8"));
        voiceResult = {
          audioPath: voiceOutputPath,
          duration: cachedMeta.duration,
          words: cachedMeta.words || [],
          srt: cachedMeta.srt || "",
        };
        console.log(`⚡ [VOICE REUSED] Tái sử dụng file voice.mp3 (${voiceResult.duration}s) & mốc từ ngữ có sẵn!`);
      } else {
        const buf = fs.readFileSync(voiceOutputPath);
        const dur = Number((getMp3Duration(buf) / 1000).toFixed(2));
        voiceResult = {
          audioPath: voiceOutputPath,
          duration: dur,
          words: [],
          srt: "",
        };
        console.log(`⚡ [VOICE REUSED] Tái sử dụng file voice.mp3 có sẵn (${dur}s) - Bỏ qua gọi lại API TTS!`);
      }
    } catch (e) {
      console.warn(`   [VOICE] Lỗi đọc cache voice (${e.message}), gọi lại API...`);
      voiceResult = null;
    }
  }

  if (!voiceResult) {
    console.log(`   [VOICE] Đang gọi API tổng hợp giọng đọc mới...`);
    voiceResult = await synthesizeVoiceover({
      text: data.script,
      voice: data.voice || DEFAULT_VOICE,
      provider: data.provider || DEFAULT_PROVIDER,
      speed: data.speed || 1.0,
      apiUrl: VIENEU_API_URL,
      apiKey: VIENEU_API_KEY,
      outputPath: voiceOutputPath,
      onProgress: (p) => {
        console.log(`   [VOICE] ${p.message}`);
        if (options.onProgress) options.onProgress({ step: "voice", ...p });
      },
    });

    // Lưu metadata vào workDir để tái sử dụng siêu tốc cho các lần thay nền sau
    try {
      fs.writeFileSync(
        voiceMetaPath,
        JSON.stringify(
          {
            duration: voiceResult.duration,
            words: voiceResult.words,
            srt: voiceResult.srt,
            timestamp: Date.now(),
          },
          null,
          2
        ),
        "utf8"
      );
    } catch (err) {
      console.warn("Không thể lưu cache voice-meta.json:", err.message);
    }
  }

  const voiceDuration = voiceResult.duration;
  // Bù thêm 1.2s ở cuối để video và nhạc nền có dư âm ngân vang lắng đọng sau khi dứt câu
  const targetDuration = Number((voiceDuration + 1.2).toFixed(2));
  console.log(`[PROGRESS:VOICE] 100% — Thời lượng voice: ${voiceDuration}s, Video đích: ${targetDuration}s\n`);

  // BƯỚC 2: CẮT GHÉP & LOOP VIDEO STOCK 9:16 KHỚP HOÀN TOÀN THỜI LƯỢNG
  console.log(`[2/4] 🎞️ Đang xử lý các clip video stock từ máy tính...`);
  const bgOutputPath = path.join(workDir, "background.mp4");

  // Nguồn video stock có thể là mảng đường dẫn file hoặc thư mục
  let stockSources = data.stockVideos || data.stockDir || path.join(ROOT, "data", "stock-videos");
  if (Array.isArray(stockSources) && stockSources.length === 0) {
    stockSources = path.join(ROOT, "data", "stock-videos");
  }

  await stitchBackgroundVideo({
    videoSources: stockSources,
    targetDuration,
    outputPath: bgOutputPath,
    width: 1080,
    height: 1920,
    fps: 30,
    shotDuration: data.shotDuration || 3.8,
    onProgress: (p) => {
      console.log(`   [STOCK] ${p.message}`);
      if (options.onProgress) options.onProgress({ step: "stock", ...p });
    },
  });
  console.log(`[PROGRESS:STOCK] 100% — Video nền đã sẵn sàng: ${targetDuration}s\n`);

  // BƯỚC 3: TẠO PHỤ ĐỀ WORD-BY-WORD HIGHLIGHT CHUẨN ASS
  console.log(`[3/4] 📝 Đang sinh phụ đề chạy từng từ (Word-by-word Subtitles)...`);

  const subConfig = data.subtitles || {};
  let subResult;

  if (isReuseRequested && fs.existsSync(assOutputPath) && (!voiceResult.words || voiceResult.words.length === 0)) {
    console.log(`   [SUB] Tái sử dụng file phụ đề subtitles.ass đã tạo sẵn!`);
    subResult = { totalLines: 1 };
  } else if (voiceResult.words && voiceResult.words.length > 0) {
    subResult = generateAssSubtitles({
      words: voiceResult.words,
      outputPath: assOutputPath,
      fontName: subConfig.fontName || "Montserrat",
      fontSize: subConfig.fontSize || 72,
      baseColor: subConfig.baseColor || "#FFF8E7",       // Vàng nhạt / trắng dễ đọc
      highlightColor: subConfig.highlightColor || "#FFD200", // Vàng kim rực rỡ
      outlineColor: subConfig.outlineColor || "#000000",
      outlineWidth: subConfig.outlineWidth || 6,
      shadow: subConfig.shadow || 2,
      position: subConfig.position || "center",
      wordsPerChunk: subConfig.wordsPerChunk || 4,
      animation: subConfig.animation || "smooth",
    });
    console.log(`[PROGRESS:SUB] 100% — Đã tạo ${subResult.totalLines} sự kiện highlight từ ngữ\n`);
  } else {
    console.log(`   [SUB] Giữ nguyên phụ đề subtitles.ass hiện tại`);
    subResult = { totalLines: 1 };
  }

  if (options.noRender) {
    console.log(`⚡ Flag --no-render được bật. Đã hoàn tất khâu assets tại: ${workDir}`);
    return {
      workDir,
      voiceResult,
      subResult,
    };
  }

  // BƯỚC 4: GHÉP TẤT CẢ VÀ RENDER VIDEO CUỐI CÙNG QUA FFMPEG
  console.log(`[4/4] 🚀 Đang trộn âm thanh, chồng phụ đề và render video hoàn chỉnh...`);
  const finalVideoMp4 = path.join(OUTPUT_DIR, `${slug}.mp4`);

  const renderResult = await composeFinalVideo({
    backgroundVideoPath: bgOutputPath,
    voiceAudioPath: voiceOutputPath,
    assSubtitlesPath: assOutputPath,
    finalOutputPath: finalVideoMp4,
    duration: targetDuration,
    bgmPath: data.bgmPath || "",
    bgmVolume: data.bgmVolume ?? 0.12,
    voiceVolume: data.voiceVolume ?? 1.0,
    onProgress: (p) => {
      if (p.stage === "rendering_progress") {
        console.log(`[PROGRESS:RENDER] ${p.percent}%`);
      }
      if (options.onProgress) options.onProgress({ step: "render", ...p });
    },
  });

  // Dọn dẹp thư mục tạm sau khi hoàn tất nếu không cần giữ
  try {
    // Có thể giữ hoặc xóa workDir
  } catch {}

  console.log(`\n🎉 HOÀN TẤT XUẤT BẢN VIDEO B-ROLL!`);
  console.log(`   File xuất: output/${slug}.mp4`);
  console.log(`   Dung lượng: ${(renderResult.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Thời lượng: ${targetDuration}s\n`);

  return {
    success: true,
    slug,
    outputPath: renderResult.outputPath || finalVideoMp4,
    duration: targetDuration,
    sizeBytes: renderResult.sizeBytes,
  };
}

// Chạy trực tiếp qua CLI
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith("make-broll-video.mjs") ||
  process.argv[1].endsWith("make-broll-video")
);

if (isDirectRun) {
  const args = process.argv.slice(2);
  const options = {
    noRender: args.includes("--no-render"),
    reuseVoice: args.includes("--reuse-voice"),
  };
  const jsonFiles = args.filter((a) => !a.startsWith("--"));

  if (jsonFiles.length === 0) {
    console.log(`Cách dùng:`);
    console.log(`  node make-broll-video.mjs data/sample-broll.json`);
    console.log(`  node make-broll-video.mjs data/sample-broll.json --no-render`);
    process.exit(1);
  }

  processBrollVideo(jsonFiles[0], options).catch((err) => {
    console.error(`\n❌ LỖI SẢN XUẤT VIDEO:`, err);
    process.exit(1);
  });
}

