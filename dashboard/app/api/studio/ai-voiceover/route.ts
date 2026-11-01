import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

function getRootDir(): string {
  const current = process.cwd();
  if (fs.existsSync(path.join(current, "make-video.mjs"))) {
    return current;
  }
  const parent = path.resolve(current, "..");
  if (fs.existsSync(path.join(parent, "make-video.mjs"))) {
    return parent;
  }
  return current;
}

function probeAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let out = "";
    probe.stdout.on("data", (d) => (out += d.toString()));
    probe.on("close", () => {
      const val = parseFloat(out.trim());
      resolve(!isNaN(val) && val > 0 ? Number(val.toFixed(2)) : 3.0);
    });
    probe.on("error", () => resolve(3.0));
  });
}

/**
 * Tự động chuẩn hóa vị trí thẻ cảm xúc ([cười], [thở dài], [hắng giọng], [lấy hơi])
 * theo hướng dẫn cit-voice-studio.md
 */
function normalizeEmotionTags(text: string): string {
  if (!text) return "";
  let s = text;
  s = s.replace(
    /([a-zA-Z0-9À-ỹ]+)\s*([.,?!])\s*(\[(?:cười|thở dài|hắng giọng|lấy hơi)\])(\s*(?:\[nghỉ[^\]]*\]|$))/gu,
    (_match, word, punct, tag, trailing) => `${word} ${tag}${punct}${trailing}`
  );
  s = s.replace(
    /\b([a-zA-Z0-9À-ỹ]+)\s+(\[(?:cười|thở dài|hắng giọng|lấy hơi)\])$/gu,
    (_match, word, tag) => `${tag} ${word}`
  );
  return s;
}

function mapToEdgeVoice(voiceName: string = ""): string {
  if (voiceName.includes("Neural")) return voiceName;
  const femaleVoices = [
    "Trúc Ly", "Mai Anh", "Thùy Dung", "Ngọc Huyền", "Ngọc Trân",
    "Ngọc Linh", "Đoan Trang", "Thục Đoan", "Mỹ Duyên", "Quỳnh Anh", "Kim Thanh",
    "F1", "F2", "F3", "F4", "F5",
  ];
  if (femaleVoices.some((f) => voiceName.includes(f))) {
    return "vi-VN-HoaiMyNeural";
  }
  return "vi-VN-NamMinhNeural";
}

function interpolateWordsFromCues(cues: any[]): Array<{ word: string; start: number; end: number }> {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const allWords: Array<{ word: string; start: number; end: number }> = [];

  for (let cueIdx = 0; cueIdx < cues.length; cueIdx++) {
    const cue = cues[cueIdx];
    const cueStart = Number(cue.start);
    const cueEnd = Number(cue.end);
    const cueDuration = Math.max(cueEnd - cueStart, 0.2);

    const rawTokens = (cue.text || "")
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\r?\n/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length > 0);

    if (rawTokens.length === 0) continue;

    const weights = rawTokens.map((token: string) => {
      const cleanLen = token.replace(/[^a-zA-Z0-9À-ỹ]/g, "").length || 1;
      const hasPause = /[,.;:!?]/.test(token);
      return cleanLen + (hasPause ? 1.5 : 0);
    });

    const totalWeight = weights.reduce((sum: number, w: number) => sum + w, 0);
    let currentWordStart = cueStart;

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];
      const wordDur = (weights[i] / totalWeight) * cueDuration;
      const wordEnd = i === rawTokens.length - 1 ? cueEnd : currentWordStart + wordDur;

      allWords.push({
        word: token,
        start: Number(currentWordStart.toFixed(2)),
        end: Number(wordEnd.toFixed(2)),
      });

      currentWordStart = wordEnd;
    }
  }

  return allWords;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      voice_id,
      voice = voice_id || "Hải Đăng",
      provider = "vieneu",
      speed = 1.0,
      temperature = 0.7,
      use_pronunciation_dict = true,
      seed,
      language,
      format = "mp3",
      previewOnly = false,
    } = body;

    const rawText = (text || "").replace(/<[^>]+>/g, "").trim();
    if (!rawText) {
      return NextResponse.json({ error: "Vui lòng nhập nội dung câu thoại!" }, { status: 400 });
    }

    const cleanSpeechText = normalizeEmotionTags(rawText);
    const root = getRootDir();
    const uploadDir = path.join(root, "data", "stock-uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = format === "wav" ? "wav" : "mp3";
    const timestamp = Date.now();
    const filename = `voice-${timestamp}.${ext}`;
    const outPath = path.join(uploadDir, filename);

    let synthesized = false;
    let actualDuration = 3.0;
    let cues: any[] = [];
    let words: Array<{ word: string; start: number; end: number }> = [];
    let providerUsed = "vieneu-cit";

    // 1. KẾT NỐI CIT VOICE STUDIO (VieNeu-TTS / Supertonic) THEO CIT-VOICE-STUDIO.MD
    if (provider === "vieneu" || provider === "supertonic") {
      const vieneuUrl = (process.env.VIENEU_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
      const apiKey = process.env.VIENEU_API_KEY || process.env.CIT_API_KEY || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["X-API-Key"] = apiKey;

      try {
        const payload: Record<string, any> = {
          text: cleanSpeechText,
          voice_id: voice,
          speed: Number(speed) || 1.0,
          temperature: Number(temperature) || 0.7,
          format: ext,
          use_pronunciation_dict: Boolean(use_pronunciation_dict),
        };
        if (seed !== undefined && seed !== null && seed !== "") {
          payload.seed = parseInt(String(seed), 10);
        }
        if (language) {
          payload.language = language;
        }

        let res: Response | null = null;
        if (previewOnly) {
          res = await fetch(`${vieneuUrl}/api/tts/generate`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(12000),
          });
          if (res && res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const buf = Buffer.from(arrayBuffer);
            fs.writeFileSync(outPath, buf);
            synthesized = true;
            const durHeader = res.headers.get("X-Duration-Seconds");
            actualDuration = durHeader ? parseFloat(durHeader) : await probeAudioDuration(outPath);
          }
        }

        if (!synthesized) {
          res = await fetch(`${vieneuUrl}/api/tts/generate-with-subtitles`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
          });

          if (res && res.ok) {
            const data = await res.json();
            if (data.audio_base64) {
              const buf = Buffer.from(data.audio_base64, "base64");
              fs.writeFileSync(outPath, buf);
              synthesized = true;
              actualDuration = Number(data.duration_seconds) || (await probeAudioDuration(outPath));
              cues = data.cues || [];
              words = interpolateWordsFromCues(cues);
            }
          }
        }
      } catch (err: any) {
        console.warn("Lỗi gọi /api/tts/generate-with-subtitles của CIT Voice Studio:", err.message);
      }
    }

    // 2. DỰ PHÒNG BẰNG MSEDGETTS NẾU CIT VOICE STUDIO TẮT HOẶC LỖI
    if (!synthesized) {
      providerUsed = "edge-tts";
      const edgeVoice = mapToEdgeVoice(voice);
      const tts = new MsEdgeTTS();
      await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const edgeCleanText = cleanSpeechText.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
      const rateOffset = Math.round((speed - 1.0) * 100);
      const rateStr = `${rateOffset >= 0 ? "+" : ""}${rateOffset}%`;

      const { audioStream } = tts.toStream(edgeCleanText, { rate: rateStr });
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        audioStream.on("data", (chunk) => chunks.push(chunk));
        audioStream.on("error", reject);
        audioStream.on("close", () => {
          fs.writeFileSync(outPath, Buffer.concat(chunks));
          resolve();
        });
      });

      actualDuration = await probeAudioDuration(outPath);

      // Phân bổ từ ngữ theo trọng số độ dài
      const rawWords = cleanSpeechText
        .replace(/\[[^\]]+\]/g, "")
        .replace(/[.,!?;:—"']/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 0);

      const wordDuration = rawWords.length > 0 ? actualDuration / rawWords.length : 0.3;
      words = rawWords.map((w, idx) => ({
        word: w,
        start: Number((idx * wordDuration).toFixed(2)),
        end: Number(((idx + 1) * wordDuration).toFixed(2)),
      }));
    }

    // Nếu không có words từ cues, tự động phân rã
    if (words.length === 0) {
      const tokens = cleanSpeechText
        .replace(/\[[^\]]+\]/g, "")
        .replace(/[.,!?;:—"']/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 0);
      const wDur = tokens.length > 0 ? actualDuration / tokens.length : 0.3;
      words = tokens.map((token, i) => ({
        word: token,
        start: Number((i * wDur).toFixed(2)),
        end: Number(((i + 1) * wDur).toFixed(2)),
      }));
    }

    return NextResponse.json({
      success: true,
      filename,
      audioUrl: `/api/upload-stock?stream=1&filename=${encodeURIComponent(filename)}`,
      duration: actualDuration,
      voice,
      text: cleanSpeechText,
      words,
      cues,
      provider: providerUsed,
      format: ext,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tạo giọng đọc AI" }, { status: 500 });
  }
}
