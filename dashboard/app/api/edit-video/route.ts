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

function escapeFfmpegSubPath(filePath: string): string {
  const normalized = path.resolve(filePath).replace(/\\/g, "/");
  return normalized.replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sourceFilename,
      outputFilename,
      trimStart = 0,
      trimEnd,
      speed = 1.0,
      videoVolume = 1.0,
      bgmPath = "",
      bgmVolume = 0.12,
      colorFilter = "none",
      watermarkText = "",
      watermarkPosition = "bottom-center",
      watermarkSize = 32,
      watermarkOpacity = 0.85,
      // Tính năng mới: Đè / Thay Video Nền
      enableBackground = false,
      bgMode = "replace", // "replace" | "blur" | "pip" | "overlay"
      bgVideoPath = "",
      bgDim = 0.35,
      overwrite = false,
    } = body;

    if (!sourceFilename || typeof sourceFilename !== "string") {
      return new Response(JSON.stringify({ error: "Thiếu tên file video nguồn!" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ROOT_DIR = getRootDir();
    const sourcePath = path.isAbsolute(sourceFilename)
      ? sourceFilename
      : path.join(ROOT_DIR, "output", path.basename(sourceFilename));

    if (!fs.existsSync(sourcePath)) {
      return new Response(JSON.stringify({ error: `File video không tồn tại: ${sourceFilename}` }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ext = path.extname(sourcePath);
    const baseName = path.basename(sourcePath, ext);

    let finalOutName: string;
    if (overwrite) {
      finalOutName = `${baseName}${ext}`;
    } else if (outputFilename && outputFilename.trim()) {
      finalOutName = outputFilename.trim().endsWith(ext) ? outputFilename.trim() : `${outputFilename.trim()}${ext}`;
    } else {
      finalOutName = `${baseName}-edited${ext}`;
    }

    const outputDir = path.join(ROOT_DIR, "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const finalOutputPath = path.join(outputDir, finalOutName);
    const tempOutputPath = path.join(outputDir, `.editing-${Date.now()}-${finalOutName}`);

    // Thiết lập Server-Sent Events (SSE) để truyền log và tiến trình thời gian thực
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        sendEvent({
          type: "log",
          text: `[INFO] Bắt đầu chỉnh sửa video: "${path.basename(sourcePath)}" -> "${finalOutName}"`,
        });

        // 1. Phân tích FFmpeg arguments
        const args: string[] = ["-y"];

        // Input 0: Video nguồn
        // Nếu có trimStart, dùng -ss trước -i để seek nhanh hoặc sau -i để seek chính xác
        const startSec = Math.max(0, Number(trimStart) || 0);
        if (startSec > 0) {
          args.push("-ss", startSec.toString());
        }

        args.push("-i", sourcePath);

        // Kiểm tra xem video nguồn có file phụ đề .build-${slug}/subtitles.ass không
        const buildAssPath = path.join(ROOT_DIR, "output", `.build-${baseName}`, "subtitles.ass");
        const hasAssSubtitles = fs.existsSync(buildAssPath);

        // Input Video Nền nếu có
        let hasBgVideo = false;
        let resolvedBgPath = "";
        let bgInputIndex = -1;

        if (enableBackground && bgVideoPath && typeof bgVideoPath === "string") {
          const cleanBg = bgVideoPath.trim().replace(/^["']+|["']+$/g, "");
          const checkBg = path.isAbsolute(cleanBg)
            ? cleanBg
            : path.join(/*turbopackIgnore: true*/ ROOT_DIR, cleanBg);
          if (fs.existsSync(checkBg)) {
            hasBgVideo = true;
            resolvedBgPath = checkBg;
            bgInputIndex = 1;
            args.push("-stream_loop", "-1", "-i", resolvedBgPath);
          }
        }

        // Input Nhạc nền BGM nếu có
        let hasBgm = false;
        let resolvedBgmPath = "";
        let bgmInputIndex = -1;
        if (bgmPath && typeof bgmPath === "string") {
          const cleanBgm = bgmPath.trim().replace(/^["']+|["']+$/g, "");
          const checkBgm = path.isAbsolute(cleanBgm)
            ? cleanBgm
            : path.join(/*turbopackIgnore: true*/ ROOT_DIR, cleanBgm);
          if (fs.existsSync(checkBgm)) {
            hasBgm = true;
            resolvedBgmPath = checkBgm;
            bgmInputIndex = hasBgVideo ? 2 : 1;
            args.push("-stream_loop", "-1", "-i", resolvedBgmPath);
          }
        }

        // Tính thời lượng giới hạn nếu có trimEnd
        let durationLimit = 0;
        if (trimEnd && Number(trimEnd) > startSec) {
          durationLimit = Number(trimEnd) - startSec;
          args.push("-t", durationLimit.toString());
        }

        // 2. Xây dựng Filter Graph
        const filterComplexParts: string[] = [];
        let baseVideoNode = "0:v";

        const dimAlpha = Math.max(0, Math.min(0.9, Number(bgDim) || 0));

        if (enableBackground) {
          if (bgMode === "blur") {
            const dimFilter = dimAlpha > 0 ? `,drawbox=c=black@${dimAlpha.toFixed(2)}:t=fill` : "";
            filterComplexParts.push(
              `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5${dimFilter}[bgblur]`,
              `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fgmain]`,
              `[bgblur][fgmain]overlay=(W-w)/2:(H-h)/2[basev]`
            );
            baseVideoNode = "basev";
          } else if (hasBgVideo && bgInputIndex > 0) {
            const dimFilter = dimAlpha > 0 ? `,drawbox=c=black@${dimAlpha.toFixed(2)}:t=fill` : "";

            if (bgMode === "replace") {
              if (hasAssSubtitles) {
                const subFilterPath = escapeFfmpegSubPath(buildAssPath);
                filterComplexParts.push(
                  `[${bgInputIndex}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1${dimFilter},subtitles='${subFilterPath}'[basev]`
                );
              } else {
                filterComplexParts.push(
                  `[${bgInputIndex}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1${dimFilter}[basev]`
                );
              }
              baseVideoNode = "basev";
            } else if (bgMode === "pip") {
              filterComplexParts.push(
                `[${bgInputIndex}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1${dimFilter}[bgpip]`,
                `[0:v]scale=920:1635[fgpip]`,
                `[bgpip][fgpip]overlay=(W-w)/2:(H-h)/2[basev]`
              );
              baseVideoNode = "basev";
            } else if (bgMode === "overlay") {
              filterComplexParts.push(
                `[${bgInputIndex}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=rgba,colorchannelmixer=aa=0.45[ovl]`,
                `[0:v][ovl]overlay=0:0[basev]`
              );
              baseVideoNode = "basev";
            }
          }
        }

        const subsequentVideoFilters: string[] = [];

        // Tốc độ video: setpts
        const numSpeed = Math.min(2.0, Math.max(0.5, Number(speed) || 1.0));
        if (Math.abs(numSpeed - 1.0) > 0.01) {
          const ptsFactor = (1 / numSpeed).toFixed(4);
          subsequentVideoFilters.push(`setpts=${ptsFactor}*PTS`);
        }

        // Bộ lọc màu sắc (Color Presets)
        switch (colorFilter) {
          case "warm":
            subsequentVideoFilters.push("colorbalance=rs=0.08:gs=0.02:bs=-0.08,eq=contrast=1.06:saturation=1.12");
            break;
          case "vivid":
            subsequentVideoFilters.push("eq=contrast=1.12:saturation=1.35:brightness=0.02");
            break;
          case "vintage":
            subsequentVideoFilters.push("curves=vintage,eq=saturation=0.85:contrast=1.05");
            break;
          case "bw":
            subsequentVideoFilters.push("hue=s=0,eq=contrast=1.15:brightness=0.02");
            break;
          case "cool":
            subsequentVideoFilters.push("colorbalance=rs=-0.08:gs=0.02:bs=0.12,eq=contrast=1.06:saturation=1.08");
            break;
          default:
            break;
        }

        // Chèn Watermark / Chữ thương hiệu (drawtext)
        if (watermarkText && watermarkText.trim()) {
          const cleanText = watermarkText
            .trim()
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/:/g, "\\:")
            .replace(/%/g, "\\%");

          const size = Math.min(72, Math.max(18, Number(watermarkSize) || 32));
          const opacity = Math.min(1.0, Math.max(0.2, Number(watermarkOpacity) || 0.85));

          let xExpr = "(w-text_w)/2";
          let yExpr = "h-th-80";

          switch (watermarkPosition) {
            case "top-left":
              xExpr = "40";
              yExpr = "60";
              break;
            case "top-center":
              xExpr = "(w-text_w)/2";
              yExpr = "60";
              break;
            case "top-right":
              xExpr = "w-text_w-40";
              yExpr = "60";
              break;
            case "bottom-left":
              xExpr = "40";
              yExpr = "h-th-90";
              break;
            case "bottom-right":
              xExpr = "w-text_w-40";
              yExpr = "h-th-90";
              break;
            case "bottom-center":
            default:
              xExpr = "(w-text_w)/2";
              yExpr = "h-th-90";
              break;
          }

          subsequentVideoFilters.push(
            `drawtext=font='Arial':text='${cleanText}':fontsize=${size}:fontcolor=white@${opacity}:box=1:boxcolor=black@0.45:boxborderw=6:x=${xExpr}:y=${yExpr}`
          );
        }

        if (subsequentVideoFilters.length > 0) {
          filterComplexParts.push(`[${baseVideoNode}]${subsequentVideoFilters.join(",")}[outv]`);
        } else if (baseVideoNode !== "0:v") {
          filterComplexParts.push(`[${baseVideoNode}]null[outv]`);
        }

        // Audio pipeline
        const audioFilters: string[] = [];
        if (Math.abs(numSpeed - 1.0) > 0.01) {
          audioFilters.push(`atempo=${numSpeed.toFixed(2)}`);
        }

        const numVideoVol = Math.max(0, Number(videoVolume) ?? 1.0);
        if (Math.abs(numVideoVol - 1.0) > 0.01) {
          audioFilters.push(`volume=${numVideoVol.toFixed(2)}`);
        }

        if (hasBgm && bgmInputIndex > 0) {
          const vAudioPre = audioFilters.length > 0 ? `[0:a]${audioFilters.join(",")}[vaudio]` : `[0:a]anull[vaudio]`;
          filterComplexParts.push(vAudioPre);
          const bgmVol = Math.max(0.01, Math.min(1.0, Number(bgmVolume) || 0.12));
          filterComplexParts.push(`[${bgmInputIndex}:a]volume=${bgmVol.toFixed(2)}[bgmaudio]`);
          filterComplexParts.push(`[vaudio][bgmaudio]amix=inputs=2:duration=first:dropout_transition=2[outa]`);
        } else if (audioFilters.length > 0) {
          filterComplexParts.push(`[0:a]${audioFilters.join(",")}[outa]`);
        }

        const hasCustomVideo = filterComplexParts.some((p) => p.includes("[outv]"));
        const hasCustomAudio = filterComplexParts.some((p) => p.includes("[outa]"));

        if (filterComplexParts.length > 0) {
          args.push("-filter_complex", filterComplexParts.join(";"));
          args.push("-map", hasCustomVideo ? "[outv]" : `[${baseVideoNode}]`);
          args.push("-map", hasCustomAudio ? "[outa]" : "0:a?");
        } else {
          args.push("-map", "0:v", "-map", "0:a?");
        }

        // Codec & Output Settings
        args.push(
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "20",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", "192k",
          tempOutputPath
        );

        sendEvent({
          type: "progress",
          percent: 15,
          message: "Đang xử lý các hiệu ứng và render video qua FFmpeg...",
        });

        // 3. Thực thi FFmpeg
        const child = spawn("ffmpeg", args, { windowsHide: true });
        let errorLogs = "";

        child.stderr.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          errorLogs += text;

          // Phân tích tiến độ thời gian từ FFmpeg output
          const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
          if (timeMatch) {
            const curSec =
              parseInt(timeMatch[1], 10) * 3600 +
              parseInt(timeMatch[2], 10) * 60 +
              parseFloat(timeMatch[3]);

            let pct = 30;
            if (durationLimit > 0) {
              pct = Math.min(95, Math.round((curSec / durationLimit) * 100));
            } else {
              pct = Math.min(95, Math.round(curSec * 3));
            }

            sendEvent({
              type: "progress",
              percent: Math.max(20, pct),
              message: `Đang kết xuất video: ${curSec.toFixed(1)}s...`,
            });
          }
        });

        child.on("close", (code) => {
          if (code !== 0) {
            sendEvent({
              type: "error",
              message: `FFmpeg gặp lỗi (code ${code}): ${errorLogs.slice(-400)}`,
            });
            try {
              if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
            } catch {}
            controller.close();
            return;
          }

          // Hoàn tất an toàn - đổi tên file sang tên đích
          try {
            if (fs.existsSync(finalOutputPath)) {
              try {
                fs.unlinkSync(finalOutputPath);
              } catch {}
            }
            fs.renameSync(tempOutputPath, finalOutputPath);
          } catch {
            try {
              fs.copyFileSync(tempOutputPath, finalOutputPath);
              fs.unlinkSync(tempOutputPath);
            } catch {}
          }

          const stats = fs.existsSync(finalOutputPath) ? fs.statSync(finalOutputPath) : null;
          const sizeBytes = stats ? stats.size : 0;

          sendEvent({
            type: "complete",
            filename: finalOutName,
            url: `/api/videos/${finalOutName}`,
            sizeBytes,
            message: `Xuất bản video thành công (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)!`,
          });
          controller.close();
        });

        child.on("error", (err) => {
          sendEvent({
            type: "error",
            message: `Không thể khởi động FFmpeg: ${err.message}`,
          });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
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
