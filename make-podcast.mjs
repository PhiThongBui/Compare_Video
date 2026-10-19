#!/usr/bin/env node
/**
 * make-podcast.mjs — Data-Driven Video Production Engine for Podcast Q&A (2-Person Dialogue)
 *
 * Usage:
 *   node make-podcast.mjs data/sample-podcast.json
 *   node make-podcast.mjs data/sample-podcast.json --no-render  (chỉ sinh assets & HTML, không render MP4)
 *   node make-podcast.mjs data/sample-podcast.json --preview    (bật preview browser sau khi build)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import getMp3Duration from "get-mp3-duration";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname);
const TEMPLATE_DIR = path.join(ROOT, "template-podcast");
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
const EDGE_VOICE_MALE = ENV.EDGE_VOICE || "vi-VN-NamMinhNeural";
const EDGE_VOICE_FEMALE = "vi-VN-HoaiMyNeural";
const VIENEU_API_URL = (ENV.VIENEU_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
const VIENEU_API_KEY = ENV.VIENEU_API_KEY || ENV.CIT_API_KEY || "";
const DEFAULT_HOST_VOICE = "Hải Đăng";
const DEFAULT_GUEST_VOICE = "Thiện Minh";
const DEFAULT_PROVIDER = ENV.TTS_PROVIDER || "vieneu";
const CHANNEL_DEFAULT = "Phía sau sân cỏ • Podcast Talk";

// ---------- 2. Avatar Resolver ----------
function resolveAvatarHtml(speakerObj, defaultEmoji = "🎙️") {
  if (!speakerObj) {
    return `<span class="avatar-icon-fallback" aria-hidden="true">${defaultEmoji}</span>`;
  }
  const raw = (speakerObj.avatar || "").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:image/")) {
    return `<img src="${raw}" alt="${speakerObj.name || "avatar"}" />`;
  }
  if (raw) {
    return `<span class="avatar-icon-fallback" aria-hidden="true">${raw}</span>`;
  }
  return `<span class="avatar-icon-fallback" aria-hidden="true">${defaultEmoji}</span>`;
}

// ---------- 3. Voice Synthesis with Retry ----------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateSingleVoice(text, outPath, provider = "vieneu", voice = "Hải Đăng") {
  if (provider === "vieneu") {
    const headers = { "Content-Type": "application/json" };
    if (VIENEU_API_KEY) {
      headers["X-API-Key"] = VIENEU_API_KEY;
    }

    try {
      // 1. Thử endpoint tiêu chuẩn /api/tts/generate
      const res = await fetch(`${VIENEU_API_URL}/api/tts/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          text,
          voice_id: voice || DEFAULT_HOST_VOICE,
          speed: 1.0,
          format: "mp3",
          use_pronunciation_dict: true,
        }),
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
        return;
      }

      // 2. Nếu 404, thử fallback sang /api/tts
      if (res.status === 404) {
        const res2 = await fetch(`${VIENEU_API_URL}/api/tts`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            text,
            voice: voice || DEFAULT_HOST_VOICE,
            speed: 1.0,
          }),
        });
        if (res2.ok) {
          const arrayBuffer2 = await res2.arrayBuffer();
          fs.writeFileSync(outPath, Buffer.from(arrayBuffer2));
          return;
        }
      }

      const errText = await res.text().catch(() => "");
      throw new Error(`VieNeu TTS API tại ${VIENEU_API_URL} trả về lỗi ${res.status}: ${res.statusText} ${errText}`);
    } catch (vieneuErr) {
      console.warn(`\n   ⚠️ VieNeu TTS không phản hồi (${vieneuErr.message}), tự động fallback sang Edge TTS...`);
      // Fallback sang Edge TTS
      const fallbackVoice = voice?.toLowerCase().includes("nữ") || voice?.toLowerCase().includes("ly") || voice?.toLowerCase().includes("anh")
        ? EDGE_VOICE_FEMALE
        : EDGE_VOICE_MALE;
      return generateEdgeVoice(text, outPath, fallbackVoice);
    }
  } else {
    return generateEdgeVoice(text, outPath, voice);
  }
}

async function generateEdgeVoice(text, outPath, voice = EDGE_VOICE_MALE) {
  const tts = new MsEdgeTTS();
  const v = voice.includes("Neural") ? voice : EDGE_VOICE_MALE;
  await tts.setMetadata(v, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: "+8%" });
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

async function synthesizePodcastDialogue(scriptLines, hostConfig, guestConfig, voDir, defaultProvider) {
  fs.mkdirSync(voDir, { recursive: true });
  const durations = {};

  const hostVoice = hostConfig?.voice || DEFAULT_HOST_VOICE;
  const guestVoice = guestConfig?.voice || DEFAULT_GUEST_VOICE;

  console.log(`\n🎙️  Bắt đầu sinh giọng đọc Podcast Q&A:`);
  console.log(`   - HOST: ${hostConfig?.name || "Host"} (Giọng: ${hostVoice})`);
  console.log(`   - GUEST: ${guestConfig?.name || "Guest"} (Giọng: ${guestVoice})`);

  for (let i = 0; i < scriptLines.length; i++) {
    const n = i + 1;
    const item = scriptLines[i];
    const isGuest = (item.speaker || "").toLowerCase() === "guest";
    const speakerLabel = isGuest ? "GUEST" : "HOST";
    const voiceToUse = isGuest ? guestVoice : hostVoice;
    const providerToUse = voiceToUse.includes("Neural") ? "edge" : (defaultProvider || DEFAULT_PROVIDER);

    const textToSpeak = typeof item === "string"
      ? item.replace(/<[^>]+>/g, "")
      : (item.tts || item.caption?.replace(/<[^>]+>/g, "") || "");

    const outPath = path.join(voDir, `line-${n}.mp3`);

    process.stdout.write(`   [${n}/${scriptLines.length}] [${speakerLabel}] "${textToSpeak.slice(0, 35)}..." `);

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
          await generateSingleVoice(textToSpeak, outPath, providerToUse, voiceToUse);
          break;
        } catch (err) {
          if (attempts >= 5) throw err;
          process.stdout.write(`(retry ${attempts})... `);
          await sleep(1500);
        }
      }
      if (providerToUse !== "vieneu") {
        await sleep(800);
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
function calculatePodcastTiming(scriptLines, durations) {
  let cur = 0.6; // Đợi 0.6s sau hiệu ứng vào
  const VO = {};
  const gapBetweenTurns = 0.35; // Khoảng dừng tự nhiên giữa các lượt hội thoại

  for (let i = 1; i <= scriptLines.length; i++) {
    if (i > 1) cur += gapBetweenTurns;
    const dur = durations[`line-${i}`] || 3.0;
    VO[i] = {
      start: Number(cur.toFixed(2)),
      dur: dur,
    };
    cur += dur;
  }

  const rootDuration = Number((cur + 1.2).toFixed(1));
  return { VO, rootDuration };
}

// ---------- 5. Build HTML from Master Podcast Template ----------
function buildPodcastHtml(data, VO, rootDuration) {
  const templatePath = path.join(TEMPLATE_DIR, "index.template.txt");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Không tìm thấy template mẫu tại: ${templatePath}`);
  }

  let html = fs.readFileSync(templatePath, "utf8");

  // Caption lines HTML
  const captionLinesHtml = data.script.map((item, idx) => {
    const n = idx + 1;
    const textHtml = typeof item === "string" ? item : (item.caption || item.tts);
    return `          <div class="caption-line" id="line-${n}"><span class="caption-text">${textHtml}</span></div>`;
  }).join("\n");

  // Audio tags HTML
  const audioTagsHtml = data.script.map((_, idx) => {
    const n = idx + 1;
    const vo = VO[n];
    return `      <audio data-hf-id="hf-vo-${n}" id="vo-${n}" src="assets/vo/line-${n}.mp3" data-start="${vo.start}" data-duration="${vo.dur}" data-track-index="20"></audio>`;
  }).join("\n");

  // Script metadata JSON for speaker-tracking
  const scriptMeta = data.script.map((item, idx) => ({
    index: idx + 1,
    speaker: (item.speaker || "host").toLowerCase(),
  }));

  const hostName = data.host?.name || "HẢI ĐĂNG";
  const guestName = data.guest?.name || "KHÁCH MỜI";
  const hostRole = data.host?.role || "Host / Bình luận viên";
  const guestRole = data.guest?.role || "Chuyên gia / Khách mời";
  const channel = data.channel || CHANNEL_DEFAULT;

  html = html
    .replaceAll("{{TITLE}}", data.title || "Podcast Q&A")
    .replaceAll("{{ROOT_DURATION}}", rootDuration.toString())
    .replaceAll("{{CHANNEL}}", channel)
    .replaceAll("{{HOST_NAME}}", hostName)
    .replaceAll("{{HOST_ROLE}}", hostRole)
    .replaceAll("{{HOST_AVATAR_HTML}}", resolveAvatarHtml(data.host, "🎙️"))
    .replaceAll("{{GUEST_NAME}}", guestName)
    .replaceAll("{{GUEST_ROLE}}", guestRole)
    .replaceAll("{{GUEST_AVATAR_HTML}}", resolveAvatarHtml(data.guest, "⚽"))
    .replaceAll("{{CAPTION_LINES_HTML}}", captionLinesHtml)
    .replaceAll("{{AUDIO_TAGS_HTML}}", audioTagsHtml)
    .replaceAll("{{VO_DICT_JSON}}", JSON.stringify(VO, null, 8).replace(/\n\s{8}/g, " "))
    .replaceAll("{{SCRIPT_METADATA_JSON}}", JSON.stringify(scriptMeta));

  const targetHtmlPath = path.join(TEMPLATE_DIR, "index.html");
  fs.writeFileSync(targetHtmlPath, html, "utf8");
  console.log(`\n📝 Đã inject dữ liệu vào: template-podcast/index.html (Tổng thời lượng: ${rootDuration}s)`);
  console.log(`[PROGRESS:BUILD] 100%`);
}

// ---------- 6. Main Process Podcast Video ----------
async function processPodcast(jsonFile, options = {}) {
  const filePath = path.resolve(jsonFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file kịch bản podcast: ${filePath}`);
  }

  console.log(`\n============================================================`);
  console.log(`🎙️ XỬ LÝ PODCAST Q&A: ${path.basename(filePath)}`);
  console.log(`============================================================`);

  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const slug = data.slug || path.basename(filePath, ".json");

  // 1. Synthesize Audio cho cả Host và Guest
  const voDir = path.join(TEMPLATE_DIR, "assets", "vo");
  const durations = await synthesizePodcastDialogue(
    data.script,
    data.host,
    data.guest,
    voDir,
    data.provider
  );

  // 2. Compute Timing
  const { VO, rootDuration } = calculatePodcastTiming(data.script, durations);

  // 3. Build HTML
  buildPodcastHtml(data, VO, rootDuration);

  // 4. Handle Preview
  if (options.preview) {
    console.log(`\n🚀 Đang mở preview server cho Podcast Template...`);
    spawn("npx", ["--yes", "hyperframes@0.7.58", "preview", "template-podcast"], { stdio: "inherit", shell: true });
    return;
  }

  // 5. Render Video
  if (!options.noRender) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const finalOutputMp4 = path.join(OUTPUT_DIR, `${slug}.mp4`);
    const tempOutputMp4 = path.join(OUTPUT_DIR, `.build-${slug}-${Date.now()}.mp4`);

    console.log(`\n🎬 Đang render video Podcast MP4 qua HyperFrames engine...`);
    console.log(`   Đích xuất: output/${slug}.mp4`);

    await new Promise((resolve, reject) => {
      const child = spawn(
        "npx",
        ["--yes", "hyperframes@0.7.58", "render", "template-podcast", "-o", tempOutputMp4],
        { stdio: ["inherit", "pipe", "pipe"], shell: true }
      );

      const processOutput = (chunk) => {
        const text = chunk.toString();
        process.stdout.write(text);

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
            for (let i = 0; i < 10; i++) {
              try {
                if (fs.existsSync(finalOutputMp4)) {
                  try { fs.unlinkSync(finalOutputMp4); } catch {}
                }
                fs.renameSync(tempOutputMp4, finalOutputMp4);
                break;
              } catch (e) {
                await sleep(300);
              }
            }
            console.log(`\n🎉 RENDER PODCAST HOÀN TẤT! File xuất: output/${slug}.mp4`);
            resolve();
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`Quá trình render HyperFrames kết thúc với mã lỗi: ${code}`));
        }
      });
    });
  }
}

// ---------- CLI Argument Parser ----------
const args = process.argv.slice(2);
const options = {
  noRender: args.includes("--no-render"),
  preview: args.includes("--preview"),
};
const jsonFiles = args.filter((a) => !a.startsWith("--"));

if (jsonFiles.length === 0) {
  console.log(`Cách dùng:`);
  console.log(`  node make-podcast.mjs data/sample-podcast.json`);
  console.log(`  node make-podcast.mjs data/sample-podcast.json --no-render`);
  console.log(`  node make-podcast.mjs data/sample-podcast.json --preview`);
  process.exit(1);
}

processPodcast(jsonFiles[0], options).catch((err) => {
  console.error(`\n❌ LỖI XỬ LÝ PODCAST:`, err);
  process.exit(1);
});
