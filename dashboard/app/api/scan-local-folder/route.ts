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

function parseInputPaths(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Match all "..." or '...' blocks first if present (e.g. from Windows "Copy as path")
  const quotedRegex = /["']([^"']+)["']/g;
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = quotedRegex.exec(trimmed)) !== null) {
    const val = m[1].trim();
    if (val) matches.push(val);
  }

  if (matches.length > 0) {
    return matches;
  }

  // Otherwise split by newlines or semicolons
  return trimmed
    .split(/[\r\n;]+/)
    .map((line) => line.trim().replace(/^["']+|["']+$/g, ""))
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const { folderPath } = await req.json();

    if (!folderPath || typeof folderPath !== "string" || !folderPath.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập đường dẫn thư mục hoặc file video" }, { status: 400 });
    }

    const pathsToProcess = parseInputPaths(folderPath);
    if (pathsToProcess.length === 0) {
      return NextResponse.json({ error: "Đường dẫn không hợp lệ" }, { status: 400 });
    }

    const ROOT_DIR = getRootDir();
    const validExts = [".mp4", ".mov", ".webm", ".mkv", ".m4v", ".avi"];
    const videoFiles = [];
    const seenPaths = new Set<string>();
    let primaryFolder = "";

    for (const rawPath of pathsToProcess) {
      const resolved = path.isAbsolute(rawPath)
        ? rawPath
        : path.join(/*turbopackIgnore: true*/ ROOT_DIR, rawPath);

      if (!fs.existsSync(resolved)) {
        if (pathsToProcess.length === 1) {
          return NextResponse.json({ error: `Đường dẫn không tồn tại: ${resolved}` }, { status: 404 });
        }
        continue;
      }

      const stat = fs.statSync(resolved);

      // TRƯỜNG HỢP 1: Người dùng dán đường dẫn 1 FILE VIDEO cụ thể (từ "Copy as path")
      if (stat.isFile()) {
        const ext = path.extname(resolved).toLowerCase();
        if (!validExts.includes(ext)) {
          if (pathsToProcess.length === 1) {
            return NextResponse.json(
              { error: `Tệp đã chọn không phải định dạng video hỗ trợ (${validExts.join(", ")}): ${path.basename(resolved)}` },
              { status: 400 }
            );
          }
          continue;
        }

        if (!seenPaths.has(resolved)) {
          seenPaths.add(resolved);
          const duration = probeVideoDuration(resolved);
          videoFiles.push({
            name: path.basename(resolved),
            path: resolved,
            sizeBytes: stat.size,
            sizeFormatted: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
            duration,
          });
          if (!primaryFolder) primaryFolder = path.dirname(resolved);
        }
      }
      // TRƯỜNG HỢP 2: Người dùng dán đường dẫn THƯ MỤC -> quét tất cả video trong thư mục
      else if (stat.isDirectory()) {
        if (!primaryFolder) primaryFolder = resolved;
        try {
          const entries = fs.readdirSync(resolved);
          for (const entry of entries) {
            const fullPath = path.join(resolved, entry);
            try {
              const fileStat = fs.statSync(fullPath);
              if (fileStat.isFile() && validExts.includes(path.extname(entry).toLowerCase())) {
                if (!seenPaths.has(fullPath)) {
                  seenPaths.add(fullPath);
                  const duration = probeVideoDuration(fullPath);
                  videoFiles.push({
                    name: entry,
                    path: fullPath,
                    sizeBytes: fileStat.size,
                    sizeFormatted: `${(fileStat.size / 1024 / 1024).toFixed(2)} MB`,
                    duration,
                  });
                }
              }
            } catch {}
          }
        } catch {}
      }
    }

    if (videoFiles.length === 0) {
      return NextResponse.json(
        {
          error: `Không tìm thấy file video hợp lệ (${validExts.join(", ")}) tại đường dẫn đã cung cấp.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      folder: primaryFolder,
      count: videoFiles.length,
      files: videoFiles,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Lỗi quét thư mục hoặc tệp video" }, { status: 500 });
  }
}

