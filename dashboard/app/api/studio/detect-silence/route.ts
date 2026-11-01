import { NextRequest, NextResponse } from "next/server";
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

function resolveMediaFilePath(target: string): string | null {
  if (!target) return null;
  const root = getRootDir();

  // Nếu là đường dẫn tuyệt đối
  if (path.isAbsolute(target) && fs.existsSync(target)) {
    return target;
  }

  // Nếu là URL kiểu /api/upload-stock?stream=1&filename=...
  if (target.includes("filename=")) {
    try {
      const parsedUrl = new URL(target, "http://localhost");
      const fname = parsedUrl.searchParams.get("filename");
      if (fname) {
        const p = path.join(root, "data", "stock-uploads", path.basename(fname));
        if (fs.existsSync(p)) return p;
      }
    } catch {}
  }

  // Thử tìm trong output/
  const outPath = path.join(root, "output", path.basename(target));
  if (fs.existsSync(outPath)) return outPath;

  // Thử tìm trong data/stock-uploads/
  const stockPath = path.join(root, "data", "stock-uploads", path.basename(target));
  if (fs.existsSync(stockPath)) return stockPath;

  // Thử tìm trong data/
  const dataPath = path.join(root, "data", path.basename(target));
  if (fs.existsSync(dataPath)) return dataPath;

  // Quét đệ quy trong output để tìm file
  const base = path.basename(target);
  try {
    const entries = fs.readdirSync(path.join(root, "output"));
    for (const e of entries) {
      const sub = path.join(root, "output", e);
      if (fs.statSync(sub).isDirectory()) {
        const candidate = path.join(sub, base);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch {}

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      source,
      noiseThreshold = -32, // dB (mặc định -32dB)
      minDuration = 0.35,   // giây (mặc định 0.35s)
    } = body;

    if (!source) {
      return NextResponse.json({ error: "Thiếu nguồn video/audio để phân tích khoảng lặng" }, { status: 400 });
    }

    const resolvedPath = resolveMediaFilePath(source);
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `Không tìm thấy file nguồn trên ổ đĩa: ${source}` },
        { status: 404 }
      );
    }

    // 1. Lấy tổng thời lượng video/audio bằng ffprobe
    const duration = await new Promise<number>((resolve) => {
      const ffprobe = spawn("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        resolvedPath,
      ]);
      let stdout = "";
      ffprobe.stdout.on("data", (d) => (stdout += d.toString()));
      ffprobe.on("close", () => {
        const val = parseFloat(stdout.trim());
        resolve(!isNaN(val) && val > 0 ? val : 30);
      });
      ffprobe.on("error", () => resolve(30));
    });

    // 2. Chạy FFmpeg silencedetect
    const silenceFilter = `silencedetect=noise=${noiseThreshold}dB:d=${minDuration}`;
    const ffmpegArgs = ["-i", resolvedPath, "-af", silenceFilter, "-f", "null", "-"];

    const silenceOutput = await new Promise<string>((resolve) => {
      const proc = spawn("ffmpeg", ffmpegArgs);
      let stderr = "";
      proc.stderr.on("data", (d) => (stderr += d.toString()));
      proc.on("close", () => resolve(stderr));
      proc.on("error", () => resolve(""));
    });

    // 3. Parse kết quả silencedetect
    const silenceIntervals: Array<{ start: number; end: number; duration: number }> = [];
    const lines = silenceOutput.split("\n");

    let currentStart: number | null = null;

    for (const line of lines) {
      const startMatch = line.match(/silence_start:\s*([0-9.]+)/);
      if (startMatch) {
        currentStart = parseFloat(startMatch[1]);
      }

      const endMatch = line.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/);
      if (endMatch) {
        const end = parseFloat(endMatch[1]);
        const dur = parseFloat(endMatch[2]);
        const start = currentStart !== null ? currentStart : Math.max(0, end - dur);

        silenceIntervals.push({
          start: Number(start.toFixed(3)),
          end: Number(end.toFixed(3)),
          duration: Number(dur.toFixed(3)),
        });
        currentStart = null;
      }
    }

    // Tính tổng thời gian khoảng lặng
    const totalSilence = silenceIntervals.reduce((acc, cur) => acc + cur.duration, 0);

    // 4. Tính toán các phân đoạn CÓ TIẾNG (Audible Segments) để dồn nhịp (Jump-cut)
    const audibleSegments: Array<{ start: number; end: number; duration: number }> = [];
    let curTime = 0;

    for (const s of silenceIntervals) {
      if (s.start > curTime + 0.08) {
        audibleSegments.push({
          start: Number(curTime.toFixed(3)),
          end: Number(s.start.toFixed(3)),
          duration: Number((s.start - curTime).toFixed(3)),
        });
      }
      curTime = s.end;
    }

    if (curTime < duration - 0.08) {
      audibleSegments.push({
        start: Number(curTime.toFixed(3)),
        end: Number(duration.toFixed(3)),
        duration: Number((duration - curTime).toFixed(3)),
      });
    }

    const totalAudible = audibleSegments.reduce((acc, cur) => acc + cur.duration, 0);

    return NextResponse.json({
      success: true,
      source: path.basename(resolvedPath),
      totalDuration: Number(duration.toFixed(3)),
      noiseThreshold,
      minDuration,
      silenceCount: silenceIntervals.length,
      totalSilenceDuration: Number(totalSilence.toFixed(2)),
      totalAudibleDuration: Number(totalAudible.toFixed(2)),
      savedPercent: duration > 0 ? Math.round((totalSilence / duration) * 100) : 0,
      silenceIntervals,
      audibleSegments,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi phân tích khoảng lặng" }, { status: 500 });
  }
}

