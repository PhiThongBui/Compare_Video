import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
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

// Map Vietnamese voice name to Edge TTS fallback
function mapToEdgeVoice(voiceName: string = ""): string {
  if (voiceName.includes("Neural")) return voiceName;

  const femaleVoices = ["Trúc Ly", "Mai Anh", "Thùy Dung", "Ngọc Huyền", "Ngọc Trân", "Ngọc Linh", "Đoan Trang", "Thục Đoan", "Mỹ Duyên", "Quỳnh Anh", "Kim Thanh"];
  if (femaleVoices.some((f) => voiceName.includes(f))) {
    return "vi-VN-HoaiMyNeural";
  }
  return "vi-VN-NamMinhNeural";
}

// GET: Serve the generated preview audio file
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("file");

    if (!filename) {
      return new NextResponse("Thiếu tên file preview", { status: 400 });
    }

    const safeFilename = path.basename(filename);
    if (!safeFilename.toLowerCase().endsWith(".mp3")) {
      return new NextResponse("File không hợp lệ", { status: 400 });
    }

    const ROOT_DIR = getRootDir();
    const filePath = path.join(ROOT_DIR, "output", "previews", safeFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Không tìm thấy file preview", { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return new NextResponse("Lỗi đọc file preview: " + error.message, { status: 500 });
  }
}

// POST: Synthesize voiceover preview without rendering video (Super fast in seconds)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      script,
      provider = "vieneu",
      voice = "Hải Đăng",
      speed = 1.0,
      customSlug,
      title,
    } = body;

    // Chuẩn hóa input: chấp nhận string, object đơn hoặc array
    let rawItems: any[] = [];
    if (Array.isArray(script)) {
      rawItems = script;
    } else if (typeof script === "string") {
      rawItems = [script];
    } else if (script && typeof script === "object") {
      rawItems = [script];
    }

    // Trích xuất các câu thoại dạng text thuần
    const linesText = rawItems
      .map((item: any) => {
        if (typeof item === "string") {
          return item.replace(/<[^>]+>/g, "").replace(/\*\*/g, "").trim();
        }
        return (item?.tts || item?.voiceover || item?.caption?.replace(/<[^>]+>/g, "") || "").replace(/\*\*/g, "").trim();
      })
      .filter(Boolean);

    if (linesText.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng nhập nội dung thoại để nghe thử" },
        { status: 400 }
      );
    }

    const ROOT_DIR = getRootDir();
    const PREVIEWS_DIR = path.join(ROOT_DIR, "output", "previews");
    fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

/**
 * Tự động chuẩn hóa vị trí thẻ cảm xúc ([cười], [thở dài], [hắng giọng], [lấy hơi])
 * để VieNeu-TTS / CIT Voice Studio luôn phát âm 100% không bao giờ bị nuốt/bỏ qua âm:
 * Nếu tag cảm xúc đứng ở cuối câu sau dấu chấm/hỏi (vd: "đau nhói chưa? [thở dài] [nghỉ 1s]"):
 * Chuyển tag vào trước dấu kết thúc câu ("đau nhói chưa [thở dài]? [nghỉ 1s]").
 */
function normalizeEmotionTags(text: string): string {
  if (!text) return "";
  let s = text;
  // 1. Tag cảm xúc đứng sau dấu câu và trước khoảng nghỉ hoặc kết thúc
  s = s.replace(
    /([a-zA-Z0-9À-ỹ]+)\s*([.,?!])\s*(\[(?:cười|thở dài|hắng giọng|lấy hơi)\])(\s*(?:\[nghỉ[^\]]*\]|$))/gu,
    (_match, word, punct, tag, trailing) => `${word} ${tag}${punct}${trailing}`
  );
  // 2. Tag cảm xúc đứng trơ trọi ở cuối chuỗi
  s = s.replace(
    /\b([a-zA-Z0-9À-ỹ]+)\s+(\[(?:cười|thở dài|hắng giọng|lấy hơi)\])$/gu,
    (_match, word, tag) => `${tag} ${word}`
  );
  return s;
}

    // Ghép các câu lại với dấu ngắt quãng hợp lý để TTS đọc liền mạch
    const rawSpeechText = linesText.join(" ... ");
    const fullSpeechText = normalizeEmotionTags(rawSpeechText);

    const slug = customSlug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `preview-${Date.now()}`);
    const filename = `preview-${slug}.mp3`;
    const outPath = path.join(PREVIEWS_DIR, filename);

    let synthesized = false;

    // 1. Thử VieNeu TTS Local trước nếu được chọn
    if (provider === "vieneu") {
      const VIENEU_API_URL = (process.env.VIENEU_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
      const VIENEU_API_KEY = process.env.VIENEU_API_KEY || process.env.CIT_API_KEY || "";

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (VIENEU_API_KEY) {
          headers["X-API-Key"] = VIENEU_API_KEY;
        }

        const res = await fetch(`${VIENEU_API_URL}/api/tts/generate`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            text: fullSpeechText,
            voice_id: voice || "Hải Đăng",
            speed: Number(speed) || 1.0,
            format: "mp3",
            use_pronunciation_dict: true,
          }),
          signal: AbortSignal.timeout(30000), // Timeout 30s đủ cho model VieNeu xử lý trên CPU
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
          synthesized = true;
        } else {
          console.warn(`[VieNeu TTS Error ${res.status}]: Tự động chuyển dự phòng sang Edge TTS`);
        }
      } catch (err: unknown) {
        console.warn("[VieNeu TTS Offline / Unreachable]: Tự động chuyển dự phòng sang Edge TTS");
      }
    }

    // 2. Nếu VieNeu chưa sinh được (hoặc chọn Edge TTS), dùng Edge TTS dự phòng
    if (!synthesized) {
      const edgeVoice = mapToEdgeVoice(voice);
      const tts = new MsEdgeTTS();
      await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      // Edge TTS không hiểu thẻ [cười], [thở dài], [hắng giọng], [lấy hơi] -> lọc bỏ thẻ để tránh đọc thành tiếng
      const edgeCleanText = fullSpeechText
        .replace(/\[(?:nghỉ|pause)[^\]]*\]/gi, "... ")
        .replace(/\[(?:cười|hắng giọng|thở dài|lấy hơi)[^\]]*\]/gi, "");

      const rateOffset = Math.round(((Number(speed) || 1.0) - 1.0) * 100);
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
    }

    const audioUrl = `/api/preview-audio?file=${encodeURIComponent(filename)}&t=${Date.now()}`;

    return NextResponse.json({
      success: true,
      audioUrl,
      url: audioUrl,
      filename,
      voice,
      lineCount: linesText.length,
      message: `Đã sinh xong bản nghe thử giọng ${voice} thành công!`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API /api/preview-audio] Error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi tạo audio preview" },
      { status: 500 }
    );
  }
}
