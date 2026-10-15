#!/usr/bin/env node
/**
 * make-video.mjs — Data-Driven Video Production Engine for "Phía sau sân cỏ"
 *
 * Usage:
 *   node make-video.mjs data/ao-player-vs-ao-fan.json
 *   node make-video.mjs data/ao-player-vs-ao-fan.json --no-render  (chỉ sinh assets & HTML, không render MP4)
 *   node make-video.mjs data/ao-player-vs-ao-fan.json --preview    (bật preview browser sau khi build)
 *   node make-video.mjs --all                                     (render tất cả file trong data/)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import getMp3Duration from "get-mp3-duration";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname);
const TEMPLATE_DIR = path.join(ROOT, "template");
const OUTPUT_DIR = path.join(ROOT, "output");
const DATA_DIR = path.join(ROOT, "data");

// Ensure ffmpeg/ffprobe from WinGet is in process.env.PATH
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

// ---------- 1. Load .env config ----------
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
const EDGE_VOICE = ENV.EDGE_VOICE || "vi-VN-NamMinhNeural";
const VIENEU_API_URL = (ENV.VIENEU_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
const VIENEU_API_KEY = ENV.VIENEU_API_KEY || ENV.CIT_API_KEY || "";
const VIENEU_VOICE = ENV.VIENEU_VOICE || "Hải Đăng";
const DEFAULT_PROVIDER = ENV.TTS_PROVIDER || "vieneu";
const CHANNEL_DEFAULT = ENV.CHANNEL || "Phía sau sân cỏ";

// ---------- 2. Football SVG Icon Library Presets ----------
const ICON_PRESETS = {
  "jersey-player": `
    <svg width="240" height="280" viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M75 35 L40 70 L15 60 L35 130 L65 110 L65 260 L175 260 L175 110 L205 130 L225 60 L200 70 L165 35 C150 55 90 55 75 35 Z" fill="#143D2E" stroke="#FFD200" stroke-width="4" stroke-linejoin="round"/>
      <g fill="#FFD200" opacity="0.35">
        <circle cx="85" cy="140" r="3"/><circle cx="105" cy="140" r="3"/><circle cx="125" cy="140" r="3"/><circle cx="145" cy="140" r="3"/>
        <circle cx="95" cy="160" r="3"/><circle cx="115" cy="160" r="3"/><circle cx="135" cy="160" r="3"/><circle cx="155" cy="160" r="3"/>
        <circle cx="85" cy="180" r="3"/><circle cx="105" cy="180" r="3"/><circle cx="125" cy="180" r="3"/><circle cx="145" cy="180" r="3"/>
        <circle cx="95" cy="200" r="3"/><circle cx="115" cy="200" r="3"/><circle cx="135" cy="200" r="3"/><circle cx="155" cy="200" r="3"/>
        <circle cx="85" cy="220" r="3"/><circle cx="105" cy="220" r="3"/><circle cx="125" cy="220" r="3"/><circle cx="145" cy="220" r="3"/>
      </g>
      <rect x="85" y="80" width="28" height="34" rx="4" fill="#FFD200" opacity="0.9"/>
      <path d="M140 85 C148 78 158 80 156 95 C154 105 142 112 135 115 C138 108 138 98 140 85 Z" fill="#FF334B"/>
      <path d="M135 115 L155 90" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

  "jersey-fan": `
    <svg width="240" height="280" viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M70 35 L30 75 L5 65 L28 140 L60 120 L55 260 L185 260 L180 120 L212 140 L235 65 L210 75 L170 35 C152 60 88 60 70 35 Z" fill="#143D2E" stroke="#EBF8F2" stroke-width="4" stroke-linejoin="round"/>
      <path d="M85 85 L115 85 L115 115 C115 125 100 135 100 135 C100 135 85 125 85 115 Z" fill="#EBF8F2" stroke="#FFD200" stroke-width="3"/>
      <path d="M92 95 L108 95 M100 95 L100 120" stroke="#081C15" stroke-width="3" stroke-linecap="round"/>
      <path d="M60 250 L180 250" stroke="#EBF8F2" stroke-width="3" stroke-dasharray="6 4"/>
      <path d="M30 130 L55 112" stroke="#EBF8F2" stroke-width="3" stroke-dasharray="6 4"/>
      <path d="M210 130 L185 112" stroke="#EBF8F2" stroke-width="3" stroke-dasharray="6 4"/>
      <circle cx="150" cy="105" r="16" fill="#081C15" stroke="#FFD200" stroke-width="3"/>
      <path d="M144 105 L148 109 L157 100" stroke="#FFD200" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

  "tactics": `
    <svg width="240" height="280" viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="30" width="190" height="220" rx="16" fill="#0F2D22" stroke="#EBF8F2" stroke-width="3"/>
      <line x1="25" y1="140" x2="215" y2="140" stroke="#EBF8F2" stroke-width="2" stroke-dasharray="4 4"/>
      <circle cx="120" cy="140" r="35" stroke="#EBF8F2" stroke-width="2"/>
      <!-- Player X -->
      <g stroke="#FFD200" stroke-width="3" stroke-linecap="round">
        <line x1="55" y1="70" x2="75" y2="90"/><line x1="75" y1="70" x2="55" y2="90"/>
        <line x1="155" y1="70" x2="175" y2="90"/><line x1="175" y1="70" x2="155" y2="90"/>
      </g>
      <!-- Player O -->
      <circle cx="120" cy="80" r="12" fill="#FF334B" stroke="#FFFFFF" stroke-width="2"/>
      <!-- Passing arrow -->
      <path d="M75 90 Q120 120 155 90" stroke="#FFD200" stroke-width="3" stroke-dasharray="5 3" fill="none"/>
      <polygon points="155,90 145,88 150,98" fill="#FFD200"/>
    </svg>`,

  "trophy": `
    <svg width="240" height="280" viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M70 50 L170 50 L160 140 C160 170 135 190 120 190 C105 190 80 170 80 140 Z" fill="#FFD200" stroke="#FFFFFF" stroke-width="3"/>
      <!-- Handles -->
      <path d="M70 65 C40 65 40 125 75 130" stroke="#FFD200" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M170 65 C200 65 200 125 165 130" stroke="#FFD200" stroke-width="6" stroke-linecap="round" fill="none"/>
      <!-- Base -->
      <rect x="110" y="190" width="20" height="35" fill="#FFD200"/>
      <rect x="80" y="225" width="80" height="25" rx="6" fill="#143D2E" stroke="#FFD200" stroke-width="3"/>
      <!-- Champion Star -->
      <polygon points="120,80 124,92 136,92 126,100 130,112 120,104 110,112 114,100 104,92 116,92" fill="#081C15"/>
    </svg>`,

  "money": `
    <svg width="240" height="280" viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M120 60 C105 60 95 70 95 85 L60 130 C45 155 50 220 120 220 C190 220 195 155 180 130 L145 85 C145 70 135 60 120 60 Z" fill="#143D2E" stroke="#FFD200" stroke-width="4"/>
      <!-- Tie ribbon -->
      <path d="M90 85 Q120 95 150 85" stroke="#FF334B" stroke-width="6" stroke-linecap="round"/>
      <!-- Euro / Dollar Symbol -->
      <circle cx="120" cy="155" r="32" fill="#081C15" stroke="#FFD200" stroke-width="3"/>
      <text x="120" y="167" font-size="34" font-weight="900" fill="#FFD200" text-anchor="middle" font-family="Be Vietnam Pro, sans-serif">€</text>
    </svg>`,

  "card-penalty": `
    <svg width="240" height="280" viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Yellow Card -->
      <rect x="50" y="50" width="90" height="135" rx="8" fill="#FFD200" transform="rotate(-15 50 50)" stroke="#FFFFFF" stroke-width="2" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.5))"/>
      <!-- Red Card -->
      <rect x="110" y="70" width="90" height="135" rx="8" fill="#FF334B" transform="rotate(12 110 70)" stroke="#FFFFFF" stroke-width="2" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.5))"/>
    </svg>`,

  "default": `
    <svg width="240" height="280" viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="140" r="75" fill="#EBF8F2" stroke="#081C15" stroke-width="4"/>
      <!-- Classic Pentagons -->
      <polygon points="120,115 138,128 131,148 109,148 102,128" fill="#081C15"/>
      <polygon points="120,80 132,95 120,115 102,128 90,105" stroke="#081C15" stroke-width="3" fill="none"/>
      <polygon points="155,105 160,125 138,128 120,115 132,95" stroke="#081C15" stroke-width="3" fill="none"/>
      <polygon points="131,148 145,170 170,165 175,145 138,128" stroke="#081C15" stroke-width="3" fill="none"/>
      <polygon points="109,148 95,170 70,165 65,145 102,128" stroke="#081C15" stroke-width="3" fill="none"/>
    </svg>`
};

function resolveIcon(item) {
  if (!item) return ICON_PRESETS.default;
  if (item.svg && item.svg.trim().startsWith("<svg")) return item.svg;
  if (item.icon && ICON_PRESETS[item.icon]) return ICON_PRESETS[item.icon];
  return ICON_PRESETS.default;
}

// ---------- 3. Voice Synthesis with Retry ----------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateSingleVoice(text, outPath, provider = "vieneu", voice = "Hải Đăng") {
  if (provider === "vieneu") {
    const headers = { "Content-Type": "application/json" };
    if (VIENEU_API_KEY) {
      headers["X-API-Key"] = VIENEU_API_KEY;
    }

    const res = await fetch(`${VIENEU_API_URL}/api/tts/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text,
        voice_id: voice || VIENEU_VOICE || "Hải Đăng",
        speed: 1.0,
        format: "mp3",
        use_pronunciation_dict: true,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`VieNeu TTS API tại ${VIENEU_API_URL} trả về lỗi ${res.status}: ${res.statusText} ${errText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
  } else {
    const tts = new MsEdgeTTS();
    const v = voice || EDGE_VOICE;
    await tts.setMetadata(v, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate: "+10%" });
    return new Promise((resolve, reject) => {
      const chunks = [];
      audioStream.on("data", (chunk) => chunks.push(chunk));
      audioStream.on("error", reject);
      audioStream.on("close", () => {
        fs.writeFileSync(outPath, Buffer.concat(chunks));
        resolve();
      });
    });
  }
}

async function synthesizeAllLines(scriptLines, voDir, customProvider, customVoice) {
  fs.mkdirSync(voDir, { recursive: true });
  const durations = {};
  const provider = customProvider || DEFAULT_PROVIDER;
  const voice = customVoice || (provider === "vieneu" ? VIENEU_VOICE : EDGE_VOICE);
  const cacheKey = `${provider}:${voice}`;

  // Cache invalidation if voice or provider changed
  const voiceFile = path.join(voDir, "voice.txt");
  let prevVoice = "";
  if (fs.existsSync(voiceFile)) {
    try { prevVoice = fs.readFileSync(voiceFile, "utf8").trim(); } catch {}
  }
  if (prevVoice !== cacheKey) {
    try {
      const files = fs.readdirSync(voDir);
      for (const f of files) {
        if (f.startsWith("line-") && f.endsWith(".mp3")) {
          fs.unlinkSync(path.join(voDir, f));
        }
      }
    } catch {}
    fs.writeFileSync(voiceFile, cacheKey, "utf8");
  }

  console.log(`\n🎙️  Bắt đầu sinh giọng đọc (${provider.toUpperCase()}: ${voice})...`);

  for (let i = 0; i < scriptLines.length; i++) {
    const n = i + 1;
    const item = scriptLines[i];
    const textToSpeak = typeof item === "string" ? item.replace(/<[^>]+>/g, "") : (item.tts || item.caption.replace(/<[^>]+>/g, ""));
    const outPath = path.join(voDir, `line-${n}.mp3`);

    process.stdout.write(`   [${n}/${scriptLines.length}] "${textToSpeak.slice(0, 35)}..." `);

    let exists = false;
    try {
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
        exists = true;
      }
    } catch {}

    if (!exists) {
      let attempts = 0;
      while (attempts < 5) {
        try {
          attempts++;
          await generateSingleVoice(textToSpeak, outPath, provider, voice);
          break;
        } catch (err) {
          if (attempts >= 5) throw err;
          process.stdout.write(`(retry ${attempts})... `);
          await sleep(2000);
        }
      }
      if (provider !== "vieneu") {
        await sleep(1000);
      }
    }

    const buffer = fs.readFileSync(outPath);
    const durSeconds = Number((getMp3Duration(buffer) / 1000).toFixed(2));
    durations[`line-${n}`] = durSeconds;
    console.log(`✔ ${durSeconds}s`);
    console.log(`[PROGRESS:AUDIO] ${n}/${scriptLines.length}`);
  }

  fs.writeFileSync(path.join(voDir, "durations.json"), JSON.stringify(durations, null, 2));
  return durations;
}

// ---------- 4. Calculate Beat Timing & VO Dictionary ----------
function calculateTiming(scriptCount, durations) {
  // Gaps: 0.35s cùng beat, 0.45s chuyển beat
  const gaps = {
    1: 0.55, 2: 0.35,
    3: 0.45,
    4: 0.45, 5: 0.30, 6: 0.30,
    7: 0.45, 8: 0.30, 9: 0.30,
    10: 0.45, 11: 0.35,
    12: 0.45
  };

  let cur = 0.55;
  const VO = {};
  for (let i = 1; i <= scriptCount; i++) {
    if (i > 1) cur += (gaps[i] || 0.35);
    const dur = durations[`line-${i}`] || 3.0;
    VO[i] = {
      start: Number(cur.toFixed(2)),
      dur: dur
    };
    cur += dur;
  }

  const rootDuration = Number((cur + 1.2).toFixed(1));
  return { VO, rootDuration };
}

// ---------- 5. Build HTML from Master Template ----------
function buildHtml(data, VO, rootDuration) {
  const templatePath = path.join(TEMPLATE_DIR, "index.template.txt");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Không tìm thấy template mẫu tại: ${templatePath}`);
  }

  let html = fs.readFileSync(templatePath, "utf8");

  // Format caption lines
  const captionLinesHtml = data.script.map((item, idx) => {
    const n = idx + 1;
    const textHtml = typeof item === "string" ? item : (item.caption || item.tts);
    return `          <div class="caption-line" id="line-${n}"><span class="caption-line-text">${textHtml}</span></div>`;
  }).join("\n");

  // Format audio tags
  const audioTagsHtml = data.script.map((_, idx) => {
    const n = idx + 1;
    const vo = VO[n];
    return `      <audio data-hf-id="hf-vo-${n}" id="vo-${n}" src="assets/vo/line-${n}.mp3" data-start="${vo.start}" data-duration="${vo.dur}" data-track-index="20"></audio>`;
  }).join("\n");

  // Replace placeholders
  html = html
    .replaceAll("{{TITLE}}", data.title || `${data.left?.name || "A"} vs ${data.right?.name || "B"}`)
    .replaceAll("{{ROOT_DURATION}}", rootDuration.toString())
    .replaceAll("{{EYEBROW}}", data.channel || CHANNEL_DEFAULT)
    .replaceAll("{{LEFT_LABEL}}", data.left?.name || "A")
    .replaceAll("{{RIGHT_LABEL}}", data.right?.name || "B")
    .replaceAll("{{LEFT_ICON_SVG}}", resolveIcon(data.left))
    .replaceAll("{{RIGHT_ICON_SVG}}", resolveIcon(data.right))
    .replaceAll("{{CAPTION_LINES_HTML}}", captionLinesHtml)
    .replaceAll("{{AUDIO_TAGS_HTML}}", audioTagsHtml)
    .replaceAll("{{VO_DICT_JSON}}", JSON.stringify(VO, null, 8).replace(/\n\s{8}/g, " "));

  const targetHtmlPath = path.join(TEMPLATE_DIR, "index.html");
  fs.writeFileSync(targetHtmlPath, html, "utf8");
  console.log(`\n📝 Đã inject dữ liệu vào: template/index.html (Tổng thời lượng: ${rootDuration}s)`);
  console.log(`[PROGRESS:BUILD] 100%`);
}

// ---------- 6. Main Process Single Video ----------
async function processVideo(jsonFile, options = {}) {
  const filePath = path.resolve(jsonFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file: ${filePath}`);
  }

  console.log(`\n============================================================`);
  console.log(`⚽ XỬ LÝ VIDEO: ${path.basename(filePath)}`);
  console.log(`============================================================`);

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const slug = data.slug || path.basename(filePath, ".json");

  const provider = data.provider || (data.voice?.includes("Neural") ? "edge" : DEFAULT_PROVIDER);
  const voice = data.voice || (provider === "vieneu" ? VIENEU_VOICE : EDGE_VOICE);

  // 1. Synthesize Audio
  const voDir = path.join(TEMPLATE_DIR, "assets", "vo");
  const durations = await synthesizeAllLines(data.script, voDir, provider, voice);

  // 2. Compute Timing
  const { VO, rootDuration } = calculateTiming(data.script.length, durations);

  // 3. Build HTML
  buildHtml(data, VO, rootDuration);

  // 4. Handle Preview
  if (options.preview) {
    console.log(`\n🚀 Đang mở preview server...`);
    spawn("npx", ["--yes", "hyperframes@0.7.58", "preview", "template"], { stdio: "inherit", shell: true });
    return;
  }

  // 5. Render Video
  if (!options.noRender) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const finalOutputMp4 = path.join(OUTPUT_DIR, `${slug}.mp4`);
    const tempOutputMp4 = path.join(OUTPUT_DIR, `.build-${slug}-${Date.now()}.mp4`);

    console.log(`\n🎬 Đang render video MP4 qua HyperFrames engine...`);
    console.log(`   Đích xuất: output/${slug}.mp4`);

    await new Promise((resolve, reject) => {
      const child = spawn(
        "npx",
        ["--yes", "hyperframes@0.7.58", "render", "template", "-o", tempOutputMp4],
        { stdio: ["inherit", "pipe", "pipe"], shell: true }
      );

      const processOutput = (chunk) => {
        const text = chunk.toString();
        process.stdout.write(text);

        // Regex for frame progress e.g. "120/1521" or "Rendered 120/1521" or "(8%)"
        const frameMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
        if (frameMatch) {
          console.log(`[PROGRESS:RENDER] ${frameMatch[1]}/${frameMatch[2]}`);
        } else {
          const percentMatch = text.match(/(\d+)%/);
          if (percentMatch) {
            console.log(`[PROGRESS:RENDER_PERCENT] ${percentMatch[1]}%`);
          }
        }
      };

      child.stdout.on("data", processOutput);
      child.stderr.on("data", processOutput);

      child.on("close", async (code) => {
        if (code === 0 && fs.existsSync(tempOutputMp4)) {
          try {
            // An toàn ghi đè file cuối cùng trên Windows
            for (let i = 0; i < 10; i++) {
              try {
                if (fs.existsSync(finalOutputMp4)) {
                  try { fs.unlinkSync(finalOutputMp4); } catch {}
                }
                fs.renameSync(tempOutputMp4, finalOutputMp4);
                break;
              } catch (e) {
                if (i === 9) {
                  fs.copyFileSync(tempOutputMp4, finalOutputMp4);
                  try { fs.unlinkSync(tempOutputMp4); } catch {}
                } else {
                  await sleep(800);
                }
              }
            }
            console.log(`\n🎉 XUẤT VIDEO THÀNH CÔNG!`);
            console.log(`👉 File MP4: ${finalOutputMp4}`);
            console.log(`[PROGRESS:DONE] ${slug}.mp4`);
            resolve();
          } catch (finalizeErr) {
            reject(new Error(`Không thể hoàn tất file video: ${finalizeErr.message}`));
          }
        } else {
          console.error(`\n❌ Render thất bại với exit code: ${code}`);
          reject(new Error(`Render thất bại với exit code ${code}`));
        }
      });
    });
  } else {
    console.log(`\n⚡ Chế độ --no-render: Đã bỏ qua bước render MP4.`);
  }
}

// ---------- 7. CLI Entrypoint ----------
async function main() {
  const args = process.argv.slice(2);
  const noRender = args.includes("--no-render");
  const preview = args.includes("--preview");
  const isAll = args.includes("--all");
  const fileArg = args.find((a) => !a.startsWith("--"));

  if (args.includes("--help") || (!fileArg && !isAll)) {
    console.log(`
Engine sản xuất video Data-Driven cho kênh "Phía sau sân cỏ"

Cú pháp:
  node make-video.mjs <file.json> [options]
  node make-video.mjs --all [options]

Tùy chọn:
  --no-render   Chỉ tạo giọng đọc và index.html, không render ra MP4
  --preview     Mở dev preview browser sau khi build xong
  --all         Xử lý lần lượt tất cả file trong thư mục data/
  --help        Hiển thị hướng dẫn này
    `);
    process.exit(0);
  }

  if (isAll) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
      console.log(`Thư mục data/ chưa có file .json nào.`);
      return;
    }
    console.log(`Tìm thấy ${files.length} file kịch bản trong data/. Bắt đầu xử lý hàng loạt...`);
    for (const f of files) {
      await processVideo(path.join(DATA_DIR, f), { noRender, preview });
    }
  } else {
    await processVideo(fileArg, { noRender, preview });
  }
}

main().catch((err) => {
  console.error(`\n❌ LỖI ENGINE:`, err.message);
  process.exit(1);
});
