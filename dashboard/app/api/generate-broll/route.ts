import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function getRootDir(): string {
  const current = process.cwd();
  if (fs.existsSync(path.join(current, "make-broll-video.mjs"))) {
    return current;
  }
  const parent = path.resolve(current, "..");
  if (fs.existsSync(path.join(parent, "make-broll-video.mjs"))) {
    return parent;
  }
  return current;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      script: rawScript,
      sections = [],
      provider = "vieneu",
      voice = "Hải Đăng",
      speed = 1.0,
      stockVideos = [],
      stockDir = "",
      bgmPath = "",
      bgmVolume = 0.12,
      subtitles = {},
      customSlug,
      reuseVoice = false,
    } = body;

    let script: string[] = [];
    if (Array.isArray(rawScript) && rawScript.length > 0) {
      script = rawScript;
    } else if (Array.isArray(sections) && sections.length > 0) {
      script = sections.map((s: any) => s.voiceover || "").filter(Boolean);
    }

    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: "Tiêu đề video không được để trống" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(script) || script.length === 0) {
      return new Response(JSON.stringify({ error: "Kịch bản phải có ít nhất 1 câu thoại giọng đọc AI" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const slug = (customSlug && customSlug.trim())
      ? slugify(customSlug.trim())
      : (slugify(title) || `broll-${Date.now()}`);

    const ROOT_DIR = getRootDir();
    const DATA_DIR = path.join(ROOT_DIR, "data");
    const OUTPUT_DIR = path.join(ROOT_DIR, "output");

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Payload chuẩn lưu vào file data/<slug>.json
    const brollPayload = {
      slug,
      title: title.trim(),
      provider,
      voice,
      speed: Number(speed) || 1.0,
      reuseVoice: Boolean(reuseVoice),
      sections: Array.isArray(sections) ? sections : [],
      script: script.map((item: any) =>
        typeof item === "string"
          ? item.replace(/<[^>]+>/g, "").replace(/\*\*/g, "").trim()
          : (item.tts || item.caption || "").replace(/<[^>]+>/g, "").replace(/\*\*/g, "").trim()
      ),
      stockVideos: Array.isArray(stockVideos) ? stockVideos : [],
      stockDir: stockDir || "",
      bgmPath: bgmPath || "",
      bgmVolume: Number(bgmVolume) || 0.12,
      subtitles: {
        fontName: subtitles.fontName || "Montserrat",
        fontSize: Number(subtitles.fontSize) || 72,
        baseColor: subtitles.baseColor || "#FFF8E7",
        highlightColor: subtitles.highlightColor || "#FFD200",
        outlineColor: subtitles.outlineColor || "#000000",
        outlineWidth: Number(subtitles.outlineWidth) || 6,
        position: subtitles.position || "center",
        wordsPerChunk: Number(subtitles.wordsPerChunk) || 4,
        animation: subtitles.animation || "smooth",
      },
    };

    const jsonPath = path.join(DATA_DIR, `${slug}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(brollPayload, null, 2), "utf8");

    // SSE Stream phản hồi tiến trình trực tiếp lên màn hình Dashboard
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (dataObj: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(dataObj)}\n\n`));
          } catch {}
        };

        sendEvent({
          type: "progress",
          percent: 5,
          phase: "start",
          message: reuseVoice
            ? `⚡ Đang cập nhật nền Stock cho ${slug} (Tái sử dụng Voiceover AI)...`
            : `Đã lưu kịch bản vào data/${slug}.json. Đang khởi động B-Roll Video Engine...`,
        });

        const scriptFile = path.join(ROOT_DIR, "make-broll-video.mjs");
        const command = `node "${scriptFile}" "data/${slug}.json"${reuseVoice ? " --reuse-voice" : ""}`;
        const child = spawn(command, {
          cwd: ROOT_DIR,
          shell: true,
          env: { ...process.env },
        });

        const handleChunk = (chunk: Buffer) => {
          const text = chunk.toString();
          sendEvent({ type: "log", text });

          // 1. Voice progress: [PROGRESS:VOICE] 100%
          if (text.includes("[PROGRESS:VOICE]")) {
            sendEvent({
              type: "progress",
              percent: 25,
              phase: "voice",
              message: text.includes("[VOICE REUSED]") || reuseVoice
                ? "⚡ Đã tái sử dụng Voiceover AI có sẵn siêu tốc!"
                : "Tạo Voiceover AI & trích xuất mốc thời gian từng từ thành công!",
            });
            return;
          }

          // 2. Stock video stitching: [PROGRESS:STOCK] 100%
          if (text.includes("[PROGRESS:STOCK]")) {
            sendEvent({
              type: "progress",
              percent: 50,
              phase: "stock",
              message: "Đã cắt ghép và đồng bộ video stock vừa khít thời lượng giọng đọc!",
            });
            return;
          }

          // 3. Subtitles: [PROGRESS:SUB] 100%
          if (text.includes("[PROGRESS:SUB]")) {
            sendEvent({
              type: "progress",
              percent: 65,
              phase: "sub",
              message: "Đã tạo phụ đề Word-by-word Highlight (chạy từng từ) sắc nét!",
            });
            return;
          }

          // 4. Render progress: [PROGRESS:RENDER] 45%
          const renderMatch = text.match(/\[PROGRESS:RENDER\]\s*(\d+)%/);
          if (renderMatch) {
            const p = parseInt(renderMatch[1], 10);
            const totalPct = Math.min(99, Math.round(65 + (p * 0.33)));
            sendEvent({
              type: "progress",
              percent: totalPct,
              phase: "render",
              message: `Đang kết xuất video qua FFmpeg: ${p}%...`,
            });
            return;
          }
        };

        child.stdout.on("data", handleChunk);
        child.stderr.on("data", handleChunk);

        child.on("close", (code) => {
          const finalMp4 = path.join(OUTPUT_DIR, `${slug}.mp4`);
          const fileExists = fs.existsSync(finalMp4);

          if (code === 0 && fileExists) {
            const stat = fs.statSync(finalMp4);
            sendEvent({
              type: "complete",
              success: true,
              percent: 100,
              filename: `${slug}.mp4`,
              url: `/api/videos/${slug}.mp4`,
              sizeBytes: stat.size,
              message: "🎉 Xuất bản video B-Roll thành công!",
            });
          } else {
            sendEvent({
              type: "error",
              success: false,
              message: `Lỗi trong quá trình render video (exit code: ${code}). Vui lòng xem chi tiết log.`,
            });
          }
          controller.close();
        });

        child.on("error", (err) => {
          sendEvent({
            type: "error",
            success: false,
            message: `Lỗi khởi chạy engine: ${err.message}`,
          });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message || "Lỗi xử lý yêu cầu tạo video" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// GET: Kiểm tra xem slug hoặc kịch bản này đã có bản thu âm AI (voice.mp3) sẵn trong output/.build-[slug] chưa
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSlug = searchParams.get("slug") || "";

  if (!rawSlug.trim()) {
    return Response.json({ error: "Missing slug" }, { status: 400 });
  }

  const slug = slugify(rawSlug);

  const ROOT_DIR = getRootDir();
  const workDir = path.join(ROOT_DIR, "output", `.build-${slug}`);
  const voiceMp3 = path.join(workDir, "voice.mp3");
  const voiceMeta = path.join(workDir, "voice-meta.json");
  const finalMp4 = path.join(ROOT_DIR, "output", `${slug}.mp4`);

  const hasCachedVoice = fs.existsSync(voiceMp3);
  let duration = 0;
  if (hasCachedVoice) {
    try {
      if (fs.existsSync(voiceMeta)) {
        const meta = JSON.parse(fs.readFileSync(voiceMeta, "utf8"));
        duration = meta.duration || 0;
      }
      if (!duration) {
        const stat = fs.statSync(voiceMp3);
        duration = Math.max(1, Math.round(stat.size / 24000));
      }
    } catch {}
  }

  return Response.json({
    slug,
    hasCachedVoice,
    duration,
    videoExists: fs.existsSync(finalMp4),
    videoUrl: fs.existsSync(finalMp4) ? `/api/videos/${slug}.mp4` : null,
  });
}

