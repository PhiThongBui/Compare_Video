import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

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
      category = "Kiến thức bóng đá",
      channel = "Phía sau sân cỏ",
      provider = "vieneu",
      voice = "Minh Đức",
      left,
      right,
      script,
      customSlug,
    } = body;

    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: "Tiêu đề không được để trống" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!left?.name || !right?.name) {
      return new Response(JSON.stringify({ error: "Vui lòng nhập đầy đủ tên Concept A và B" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(script) || script.length === 0) {
      return new Response(JSON.stringify({ error: "Kịch bản phải có ít nhất 1 câu thoại" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const slug = (customSlug && customSlug.trim())
      ? slugify(customSlug.trim())
      : slugify(title);

    const ROOT_DIR = getRootDir();
    const DATA_DIR = path.join(ROOT_DIR, "data");
    const OUTPUT_DIR = path.join(ROOT_DIR, "output");

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Payload chuẩn
    const videoPayload = {
      slug,
      category,
      channel,
      provider,
      voice,
      title,
      left: {
        name: left.name.trim().toUpperCase(),
        icon: left.icon || "default",
      },
      right: {
        name: right.name.trim().toUpperCase(),
        icon: right.icon || "default",
      },
      script: script.map((item: { tts?: string; caption?: string } | string) => {
        if (typeof item === "string") {
          return {
            tts: item.replace(/<[^>]+>/g, ""),
            caption: item,
          };
        }
        return {
          tts: item.tts || item.caption?.replace(/<[^>]+>/g, "") || "",
          caption: item.caption || item.tts || "",
        };
      }),
    };

    const jsonPath = path.join(DATA_DIR, `${slug}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(videoPayload, null, 2), "utf8");

    // Tạo SSE ReadableStream để truyền log và tiến trình thời gian thực
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (dataObj: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(dataObj)}\n\n`));
          } catch {}
        };

        // Gửi trạng thái khởi đầu
        sendEvent({
          type: "progress",
          percent: 5,
          phase: "start",
          message: `Đã lưu kịch bản vào data/${slug}.json. Đang khởi động engine...`,
        });

        // Spawn child process
        const scriptFile = path.join(/*turbopackIgnore: true*/ ROOT_DIR, "make-video.mjs");
        const command = `node "${scriptFile}" "data/${slug}.json"`;
        const child = spawn(command, {
          cwd: ROOT_DIR,
          shell: true,
          env: { ...process.env },
        });

        const totalAudioCount = script.length || 12;

        const handleChunk = (chunk: Buffer) => {
          const text = chunk.toString();
          sendEvent({ type: "log", text });

          // 1. Parse Audio progress: [PROGRESS:AUDIO] 3/12
          const audioMatch = text.match(/\[PROGRESS:AUDIO\]\s*(\d+)\/(\d+)/);
          if (audioMatch) {
            const current = parseInt(audioMatch[1], 10);
            const total = parseInt(audioMatch[2], 10) || totalAudioCount;
            const pct = Math.round((current / total) * 25);
            sendEvent({
              type: "progress",
              percent: Math.max(5, pct),
              phase: "audio",
              current,
              total,
              message: `Đang tổng hợp giọng đọc Edge TTS: ${current}/${total} câu...`,
            });
            return;
          }

          // 2. Parse Build HTML progress: [PROGRESS:BUILD]
          if (text.includes("[PROGRESS:BUILD]")) {
            sendEvent({
              type: "progress",
              percent: 30,
              phase: "build",
              message: "Đã tổng hợp âm thanh. Đang cấu hình timeline GSAP...",
            });
            return;
          }

          // 3. Parse Render Frames progress: [PROGRESS:RENDER] 150/1521
          const renderMatch = text.match(/\[PROGRESS:RENDER\]\s*(\d+)\/(\d+)/);
          if (renderMatch) {
            const currentFrame = parseInt(renderMatch[1], 10);
            const totalFrames = parseInt(renderMatch[2], 10);
            const framePct = totalFrames > 0 ? (currentFrame / totalFrames) * 65 : 0;
            const totalPct = Math.min(98, Math.round(30 + framePct));
            sendEvent({
              type: "progress",
              percent: totalPct,
              phase: "render",
              currentFrame,
              totalFrames,
              message: `Đang render MP4: ${currentFrame}/${totalFrames} frames (${Math.round((currentFrame / totalFrames) * 100)}%)...`,
            });
            return;
          }

          // 4. Parse Render Percent fallback: [PROGRESS:RENDER_PERCENT] 45%
          const percentMatch = text.match(/\[PROGRESS:RENDER_PERCENT\]\s*(\d+)%/);
          if (percentMatch) {
            const p = parseInt(percentMatch[1], 10);
            const totalPct = Math.min(98, Math.round(30 + (p * 0.65)));
            sendEvent({
              type: "progress",
              percent: totalPct,
              phase: "render",
              message: `Đang render HyperFrames: ${p}%...`,
            });
            return;
          }
        };

        child.stdout.on("data", handleChunk);
        child.stderr.on("data", handleChunk);

        child.on("close", (code) => {
          const expectedMp4 = path.join(OUTPUT_DIR, `${slug}.mp4`);
          const isSuccess = code === 0 && fs.existsSync(expectedMp4);

          if (isSuccess) {
            sendEvent({
              type: "done",
              percent: 100,
              phase: "done",
              message: "Xuất video MP4 thành công!",
              slug,
              videoUrl: `/api/videos/${slug}.mp4`,
              filename: `${slug}.mp4`,
            });
          } else {
            sendEvent({
              type: "error",
              message: `Render thất bại với mã lỗi ${code}. Vui lòng kiểm tra log chi tiết.`,
            });
          }
          controller.close();
        });

        child.on("error", (err) => {
          sendEvent({
            type: "error",
            message: `Lỗi hệ thống: ${err.message}`,
          });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return new Response(JSON.stringify({ error: err.message || "Lỗi server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
