import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

function getRootDir(): string {
  const current = process.cwd();
  if (fs.existsSync(path.join(current, "make-podcast.mjs"))) {
    return current;
  }
  const parent = path.resolve(current, "..");
  if (fs.existsSync(path.join(parent, "make-podcast.mjs"))) {
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
      channel = "Phía sau sân cỏ • Podcast Talk",
      provider = "vieneu",
      host,
      guest,
      script,
      customSlug,
    } = body;

    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: "Tiêu đề Podcast không được để trống" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!host?.name || !guest?.name) {
      return new Response(JSON.stringify({ error: "Vui lòng nhập đầy đủ tên Host và Guest" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(script) || script.length === 0) {
      return new Response(JSON.stringify({ error: "Kịch bản Podcast phải có ít nhất 1 câu thoại" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const slug = (customSlug && customSlug.trim())
      ? slugify(customSlug.trim())
      : (slugify(title) || "podcast-" + Date.now());

    const ROOT_DIR = getRootDir();
    const DATA_DIR = path.join(ROOT_DIR, "data");
    const OUTPUT_DIR = path.join(ROOT_DIR, "output");

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Payload Podcast chuẩn
    const podcastPayload = {
      slug,
      title: title.trim(),
      channel,
      provider,
      host: {
        name: host.name.trim(),
        voice: host.voice || "Hải Đăng",
        role: host.role || "Host / Bình luận viên",
        avatar: host.avatar || "🎙️",
      },
      guest: {
        name: guest.name.trim(),
        voice: guest.voice || "Thiện Minh",
        role: guest.role || "Chuyên gia / Khách mời",
        avatar: guest.avatar || "⚽",
      },
      script: script.map((item: { speaker?: string; tts?: string; caption?: string } | string) => {
        if (typeof item === "string") {
          return {
            speaker: "host",
            tts: item.replace(/<[^>]+>/g, ""),
            caption: item,
          };
        }
        return {
          speaker: (item.speaker || "host").toLowerCase(),
          tts: item.tts || item.caption?.replace(/<[^>]+>/g, "") || "",
          caption: item.caption || item.tts || "",
        };
      }),
    };

    const jsonPath = path.join(DATA_DIR, `${slug}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(podcastPayload, null, 2), "utf8");

    // SSE Stream phản hồi tiến trình
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
          message: `Đã lưu kịch bản podcast vào data/${slug}.json. Đang khởi động Podcast Engine...`,
        });

        const scriptFile = path.join(ROOT_DIR, "make-podcast.mjs");
        const command = `node "${scriptFile}" "data/${slug}.json"`;
        const child = spawn(command, {
          cwd: ROOT_DIR,
          shell: true,
          env: { ...process.env },
        });

        const totalAudioCount = script.length || 4;

        const handleChunk = (chunk: Buffer) => {
          const text = chunk.toString();
          sendEvent({ type: "log", text });

          // 1. Audio progress: [PROGRESS:AUDIO] 2/4
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
              message: `Đang tổng hợp giọng nói đối thoại: ${current}/${total} câu...`,
            });
            return;
          }

          // 2. Build HTML: [PROGRESS:BUILD]
          if (text.includes("[PROGRESS:BUILD]")) {
            sendEvent({
              type: "progress",
              percent: 30,
              phase: "build",
              message: "Đã tổng hợp âm thanh. Đang cấu hình timeline Podcast GSAP...",
            });
            return;
          }

          // 3. Render frames: [PROGRESS:RENDER] 150/927
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
              message: `Đang render Podcast MP4: ${currentFrame}/${totalFrames} frames (${Math.round((currentFrame / totalFrames) * 100)}%)...`,
            });
            return;
          }

          // 4. Render percent: [PROGRESS:RENDER_PERCENT] 50%
          const percentMatch = text.match(/\[PROGRESS:RENDER_PERCENT\]\s*(\d+)%/);
          if (percentMatch) {
            const p = parseInt(percentMatch[1], 10);
            const totalPct = Math.min(98, Math.round(30 + (p * 0.65)));
            sendEvent({
              type: "progress",
              percent: totalPct,
              phase: "render",
              message: `Đang render HyperFrames Podcast: ${p}%...`,
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
              url: `/output/${slug}.mp4`,
              sizeBytes: stat.size,
              message: "🎉 Render video Podcast hoàn tất thành công!",
            });
          } else {
            sendEvent({
              type: "error",
              success: false,
              message: `Lỗi trong quá trình render Podcast (exit code: ${code}). Vui lòng kiểm tra log bên dưới.`,
            });
          }
          controller.close();
        });

        child.on("error", (err) => {
          sendEvent({
            type: "error",
            success: false,
            message: `Lỗi khởi chạy engine Podcast: ${err.message}`,
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
