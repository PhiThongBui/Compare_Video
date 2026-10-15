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
      customSlug,
      title,
    } = body;

    if (!Array.isArray(script) || script.length === 0) {
      return NextResponse.json(
        { error: "Kịch bản phải có ít nhất 1 câu thoại để nghe thử" },
        { status: 400 }
      );
    }

    const ROOT_DIR = getRootDir();
    const PREVIEWS_DIR = path.join(ROOT_DIR, "output", "previews");
    fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

    // Trích xuất các câu thoại dạng text thuần
    const linesText = script.map((item: { tts?: string; caption?: string } | string) => {
      if (typeof item === "string") {
        return item.replace(/<[^>]+>/g, "").trim();
      }
      return (item.tts || item.caption?.replace(/<[^>]+>/g, "") || "").trim();
    }).filter(Boolean);

    if (linesText.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy nội dung thoại nào" },
        { status: 400 }
      );
    }

    // Ghép các câu lại với dấu ngắt quãng hợp lý để TTS đọc liền mạch
    const fullSpeechText = linesText.join(" ... ");

    const slug = customSlug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "audio");
    const filename = `preview-${slug}.mp3`;
    const outPath = path.join(PREVIEWS_DIR, filename);

    const VIENEU_API_URL = (process.env.VIENEU_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
    const VIENEU_API_KEY = process.env.VIENEU_API_KEY || process.env.CIT_API_KEY || "";

    if (provider === "vieneu") {
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
          speed: 1.0,
          format: "mp3",
          use_pronunciation_dict: true,
        }),
      });

      if (!res.ok) {
        throw new Error(
          `VieNeu TTS API tại ${VIENEU_API_URL} trả về lỗi ${res.status}: ${res.statusText}. Vui lòng kiểm tra CIT Voice Studio đang bật!`
        );
      }

      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
    } else {
      // Edge TTS
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(fullSpeechText, { rate: "+10%" });

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

    const audioUrl = `/api/preview-audio?file=${filename}&t=${Date.now()}`;

    return NextResponse.json({
      success: true,
      audioUrl,
      filename,
      voice,
      lineCount: linesText.length,
      message: `Đã sinh xong bản nghe thử giọng ${voice} trong giây lát!`,
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
