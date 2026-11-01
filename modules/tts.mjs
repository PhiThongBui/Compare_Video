import fs from "node:fs";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import getMp3Duration from "get-mp3-duration";

/**
 * Danh sách 25 giọng chuẩn của Model VieNeu-TTS v3 Turbo (48 kHz)
 * Theo tài liệu cit-voice-studio.md & API của CIT Voice Studio
 */
export const VIENEU_V3_TURBO_VOICES = [
  { id: "Hải Đăng", name: "Hải Đăng", gender: "male", region: "North", style: "Tự nhiên", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz (Mặc định)" },
  { id: "Adam bựa", name: "Adam bựa", gender: "male", region: "North", style: "Tự nhiên / Hài hước", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Trúc Ly", name: "Trúc Ly", gender: "female", region: "North", style: "Tự nhiên / Truyền cảm", description: "Nữ · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Thiện Minh", name: "Thiện Minh", gender: "male", region: "North", style: "Kể chuyện", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz" },
  { id: "Mai Anh", name: "Mai Anh", gender: "female", region: "North", style: "Tin tức", description: "Nữ · Bắc · Phong cách tin tức · 48 kHz" },
  { id: "Thùy Dung", name: "Thùy Dung", gender: "female", region: "South", style: "Tin tức", description: "Nữ · Nam · Phong cách tin tức · 48 kHz" },
  { id: "Thiền Tâm Đức", name: "Thiền Tâm Đức", gender: "male", region: "North", style: "Kể chuyện", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz" },
  { id: "Ngọc Huyền", name: "Ngọc Huyền", gender: "female", region: "North", style: "Tự nhiên", description: "Nữ · Bắc · Giọng đọc tự nhiên · 48 kHz" },
  { id: "Quang Sơn", name: "Quang Sơn", gender: "male", region: "Central", style: "Tự nhiên", description: "Nam · Trung · Phong cách tự nhiên · 48 kHz" },
  { id: "Ngọc Trân", name: "Ngọc Trân", gender: "female", region: "Central", style: "Tự nhiên", description: "Nữ · Trung · Phong cách tự nhiên · 48 kHz" },
  { id: "Minh Đức", name: "Minh Đức", gender: "male", region: "North", style: "Tin tức", description: "Nam · Bắc · Phong cách tin tức · 48 kHz" },
  { id: "Phạm Tuyên", name: "Phạm Tuyên", gender: "male", region: "North", style: "Tự nhiên", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Thái Sơn", name: "Thái Sơn", gender: "male", region: "South", style: "Kể chuyện", description: "Nam · Nam · Phong cách kể chuyện · 48 kHz" },
  { id: "Xuân Vĩnh", name: "Xuân Vĩnh", gender: "male", region: "North", style: "Tự nhiên", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Thanh Bình", name: "Thanh Bình", gender: "male", region: "North", style: "Kể chuyện", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz" },
  { id: "Ngọc Linh", name: "Ngọc Linh", gender: "female", region: "North", style: "Kể chuyện", description: "Nữ · Bắc · Phong cách kể chuyện · 48 kHz" },
  { id: "Đoan Trang", name: "Đoan Trang", gender: "female", region: "North", style: "Tự nhiên", description: "Nữ · Bắc · Phong cách tự nhiên · 48 kHz" },
  { id: "Thục Đoan", name: "Thục Đoan", gender: "female", region: "South", style: "Kể chuyện", description: "Nữ · Nam · Phong cách kể chuyện · 48 kHz" },
  { id: "Minh Triết", name: "Minh Triết", gender: "male", region: "South", style: "Tin tức", description: "Nam · Nam · Phong cách tin tức · 48 kHz" },
  { id: "Mỹ Duyên", name: "Mỹ Duyên", gender: "female", region: "South", style: "Đọc truyện", description: "Nữ · Nam · Phong cách đọc truyện · 48 kHz" },
  { id: "Quỳnh Anh", name: "Quỳnh Anh", gender: "female", region: "North", style: "Đọc truyện", description: "Nữ · Bắc · Phong cách đọc truyện · 48 kHz" },
  { id: "Đức Trí", name: "Đức Trí", gender: "male", region: "South", style: "Đọc truyện", description: "Nam · Nam · Phong cách đọc truyện · 48 kHz" },
  { id: "Kim Thanh", name: "Kim Thanh", gender: "female", region: "South", style: "Đọc truyện", description: "Nữ · Nam · Phong cách đọc truyện · 48 kHz" },
  { id: "Adam", name: "Adam", gender: "male", region: "South", style: "Tự nhiên", description: "Nam · Nam · Giọng đọc tự nhiên · 48 kHz" },
  { id: "Quốc Tuấn", name: "Quốc Tuấn", gender: "male", region: "North", style: "Tự nhiên", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz" },
];

/**
 * Tự động chuẩn hóa vị trí thẻ cảm xúc ([cười], [thở dài], [hắng giọng], [lấy hơi])
 * để VieNeu-TTS luôn phát âm 100%, không bị nuốt âm khi tag nằm ở cuối câu.
 */
function normalizeEmotionTags(text) {
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

function cleanScriptText(text) {
  if (Array.isArray(text)) {
    const cleanedItems = text
      .map((item) => (typeof item === "string" ? item : item.tts || item.caption || item.voiceover || ""))
      .map((t) => t.replace(/<[^>]+>/g, "").replace(/\*\*/g, "").trim())
      .filter(Boolean);

    if (cleanedItems.length === 0) return "";

    // Tự động chèn khoảng nghỉ thở thông minh giữa các phân đoạn:
    // - Giữa các phần thân bài: nghỉ 0.4s
    // - Trước phân đoạn OUTRO & CTA: "Khoảng lặng vàng" (Golden Pause) 0.8s để lắng đọng
    //   tạo bước đệm chuyển từ chiêm nghiệm sang truyền cảm hứng, đánh thức
    let result = "";
    for (let i = 0; i < cleanedItems.length; i++) {
      const segment = cleanedItems[i];
      if (i === 0) {
        result += segment;
      } else if (i === cleanedItems.length - 1) {
        // Trước phân đoạn kết bài (Outro)
        const hasPauseAlready = /\[(?:nghỉ|pause)\b/i.test(segment);
        result += hasPauseAlready ? ` ${segment}` : ` [nghỉ 0.8s] ${segment}`;
      } else {
        // Giữa các đoạn thân bài
        const hasPauseAlready = /\[(?:nghỉ|pause)\b/i.test(segment);
        result += hasPauseAlready ? ` ${segment}` : ` [nghỉ 0.4s] ${segment}`;
      }
    }
    return normalizeEmotionTags(result);
  }
  return normalizeEmotionTags((text || "").replace(/<[^>]+>/g, "").replace(/\*\*/g, "").trim());
}

/**
 * Phân tích word-level timestamps từ câu và cues của VieNeu TTS
 */
function interpolateWordsFromCues(cues) {
  const allWords = [];

  for (let cueIdx = 0; cueIdx < cues.length; cueIdx++) {
    const cue = cues[cueIdx];
    const cueStart = Number(cue.start);
    const cueEnd = Number(cue.end);
    const cueDuration = Math.max(cueEnd - cueStart, 0.2);

    // Chuẩn hóa text của cue, xóa bỏ thẻ điều khiển [cười], [nghỉ ...], tách từ giữ nguyên dấu câu
    const rawTokens = cue.text
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\r?\n/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (rawTokens.length === 0) continue;

    // Tính trọng số độ dài của từng từ để chia thời gian tỷ lệ chuẩn xác
    const weights = rawTokens.map((token) => {
      const cleanLen = token.replace(/[^a-zA-Z0-9À-ỹ]/g, "").length || 1;
      // Dấu chấm / phẩy ở cuối từ tăng thêm trọng lượng để mô phỏng ngắt nhịp
      const hasPause = /[,.;:!?]/.test(token);
      return cleanLen + (hasPause ? 1.5 : 0);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let currentWordStart = cueStart;

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];
      const wordDur = (weights[i] / totalWeight) * cueDuration;
      const wordEnd = i === rawTokens.length - 1 ? cueEnd : currentWordStart + wordDur;

      allWords.push({
        word: token,
        cleanWord: token.replace(/[^a-zA-Z0-9À-ỹ]/g, ""),
        start: Number(currentWordStart.toFixed(3)),
        end: Number(wordEnd.toFixed(3)),
        duration: Number((wordEnd - currentWordStart).toFixed(3)),
        cueIndex: cueIdx,
      });

      currentWordStart = wordEnd;
    }
  }

  return allWords;
}

/**
 * Tạo Voiceover bằng VieNeu TTS (Ưu tiên) hoặc Edge TTS (Dự phòng)
 * Trả về đường dẫn file audio, thời lượng thật và mốc thời gian chi tiết từng từ.
 */
export async function synthesizeVoiceover({
  text,
  voice = "Hải Đăng",
  provider = "vieneu",
  speed = 1.0,
  apiUrl = "http://127.0.0.1:8001",
  apiKey = "",
  outputPath,
  onProgress = () => {},
}) {
  const cleanText = cleanScriptText(text);
  if (!cleanText) {
    throw new Error("Nội dung kịch bản không được để trống!");
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. VieNeu-TTS (CIT Voice Studio)
  if (provider === "vieneu") {
    onProgress({ stage: "vieneu_request", message: `Đang kết nối VieNeu-TTS (Giọng: ${voice})...` });

    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const normalizedApiUrl = apiUrl.replace(/\/+$/, "");

    let response;
    try {
      response = await fetch(`${normalizedApiUrl}/api/tts/generate-with-subtitles`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: cleanText,
          voice_id: voice,
          speed: Number(speed) || 1.0,
          format: "mp3",
          use_pronunciation_dict: true,
        }),
      });
    } catch (fetchErr) {
      throw new Error(
        `Không thể kết nối đến VieNeu-TTS tại ${normalizedApiUrl}. Hãy kiểm tra xem CIT Voice Studio đã mở chưa. Lỗi: ${fetchErr.message}`
      );
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`VieNeu TTS API trả về mã lỗi ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (!data.audio_base64) {
      throw new Error("VieNeu-TTS không trả về dữ liệu audio base64");
    }

    const audioBuffer = Buffer.from(data.audio_base64, "base64");
    fs.writeFileSync(outputPath, audioBuffer);

    const durationSeconds = Number(data.duration_seconds) || Number((getMp3Duration(audioBuffer) / 1000).toFixed(2));
    const cues = Array.isArray(data.cues) ? data.cues : [{ start: 0, end: durationSeconds, text: cleanText }];
    const words = interpolateWordsFromCues(cues);

    onProgress({
      stage: "voice_done",
      message: `Tạo giọng đọc thành công: ${durationSeconds}s (${words.length} từ)`,
      duration: durationSeconds,
      wordsCount: words.length,
    });

    return {
      audioPath: outputPath,
      duration: durationSeconds,
      words,
      cues,
      srt: data.srt || "",
      provider: "vieneu",
      voice,
    };
  }

  // 2. Edge-TTS Fallback
  onProgress({ stage: "edge_request", message: `Đang kết nối Edge TTS (Giọng: ${voice})...` });
  const tts = new MsEdgeTTS();
  const edgeVoice = voice.includes("Neural") ? voice : "vi-VN-NamMinhNeural";

  await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const edgeText = cleanText.replace(/\[(?:nghỉ|pause)[^\]]*\]/gi, "... ");
  const { audioStream } = tts.toStream(edgeText, { rate: "+8%" });

  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on("data", (chunk) => chunks.push(chunk));
    audioStream.on("error", reject);
    audioStream.on("close", resolve);
  });

  const audioBuffer = Buffer.concat(chunks);
  fs.writeFileSync(outputPath, audioBuffer);

  const durationSeconds = Number((getMp3Duration(audioBuffer) / 1000).toFixed(2));

  // Phân tích từ cơ bản cho Edge TTS dựa trên độ dài
  const cues = [{ start: 0, end: durationSeconds, text: cleanText }];
  const words = interpolateWordsFromCues(cues);

  onProgress({
    stage: "voice_done",
    message: `Tạo giọng đọc Edge TTS thành công: ${durationSeconds}s (${words.length} từ)`,
    duration: durationSeconds,
    wordsCount: words.length,
  });

  return {
    audioPath: outputPath,
    duration: durationSeconds,
    words,
    cues,
    srt: "",
    provider: "edge",
    voice: edgeVoice,
  };
}

