import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

function probeVideoDuration(filePath: string): number {
  try {
    const probe = spawnSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
      { encoding: "utf8", windowsHide: true }
    );
    if (probe.status === 0) {
      const dur = parseFloat(probe.stdout.trim());
      if (!isNaN(dur) && dur > 0) return Number(dur.toFixed(1));
    }
  } catch {}
  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const { folderPath } = await req.json();

    if (!folderPath || typeof folderPath !== "string" || !folderPath.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập đường dẫn thư mục" }, { status: 400 });
    }

    const cleanFolder = folderPath.trim().replace(/^["']+|["']+$/g, "");
    const ROOT_DIR = getRootDir();
    const resolved = path.isAbsolute(cleanFolder)
      ? cleanFolder
      : path.join(/*turbopackIgnore: true*/ ROOT_DIR, cleanFolder);
    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: `Thư mục không tồn tại: ${resolved}` }, { status: 404 });
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: `Đường dẫn không phải là thư mục: ${resolved}` }, { status: 400 });
    }

    const validExts = [".mp4", ".mov", ".webm", ".mkv", ".m4v"];
    const entries = fs.readdirSync(resolved);
    const videoFiles = [];

    for (const entry of entries) {
      const fullPath = path.join(resolved, entry);
      try {
        const fileStat = fs.statSync(fullPath);
        if (fileStat.isFile() && validExts.includes(path.extname(entry).toLowerCase())) {
          const duration = probeVideoDuration(fullPath);
          videoFiles.push({
            name: entry,
            path: fullPath,
            sizeBytes: fileStat.size,
            sizeFormatted: `${(fileStat.size / 1024 / 1024).toFixed(2)} MB`,
            duration,
          });
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      folder: resolved,
      count: videoFiles.length,
      files: videoFiles,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Lỗi quét thư mục" }, { status: 500 });
  }
}

