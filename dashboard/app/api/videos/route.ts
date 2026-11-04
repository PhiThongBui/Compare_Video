import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

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

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getVideoDuration(filePath: string): number {
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf-8", timeout: 2000 }
    ).trim();
    const dur = parseFloat(raw);
    return isFinite(dur) ? Number(dur.toFixed(2)) : 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const ROOT_DIR = getRootDir();
    const OUTPUT_DIR = path.join(ROOT_DIR, "output");

    if (!fs.existsSync(OUTPUT_DIR)) {
      return NextResponse.json({ videos: [] });
    }

    const files = fs.readdirSync(OUTPUT_DIR);
    const mp4Files = files.filter((f) => f.toLowerCase().endsWith(".mp4"));

    const videoList = mp4Files.map((filename) => {
      const fullPath = path.join(OUTPUT_DIR, filename);
      const stat = fs.statSync(fullPath);
      const duration = getVideoDuration(fullPath);
      return {
        filename,
        title: filename.replace(/\.mp4$/i, ""),
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        duration: duration || 0,
        createdAt: stat.birthtime || stat.mtime,
        updatedAt: stat.mtime,
        url: `/api/videos/${filename}`,
      };
    });

    // Sắp xếp video mới nhất lên đầu
    videoList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ videos: videoList });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[API /api/videos] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    let filename = "";
    const { searchParams } = new URL(req.url);
    filename = searchParams.get("file") || "";

    if (!filename) {
      try {
        const body = await req.json();
        filename = body?.filename || "";
      } catch {}
    }

    const safeFilename = path.basename(filename);
    if (!safeFilename || !safeFilename.toLowerCase().endsWith(".mp4")) {
      return NextResponse.json({ error: "Tên file video không hợp lệ" }, { status: 400 });
    }

    const ROOT_DIR = getRootDir();
    const filePath = path.join(ROOT_DIR, "output", safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Không tìm thấy file video để xóa" }, { status: 404 });
    }

    fs.unlinkSync(filePath);

    return NextResponse.json({
      success: true,
      message: `Đã xóa video ${safeFilename} thành công`,
      filename: safeFilename,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[API DELETE /api/videos] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

