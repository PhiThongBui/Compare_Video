import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

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
      return {
        filename,
        title: filename.replace(/\.mp4$/i, ""),
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
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
