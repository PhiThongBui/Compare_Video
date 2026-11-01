import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

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

export async function GET(req: NextRequest) {
  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    const rawAudioPath = req.nextUrl.searchParams.get("path");

    if (!rawAudioPath || typeof rawAudioPath !== "string") {
      return new NextResponse("Thiếu đường dẫn file âm thanh", { status: 400 });
    }

    const audioPath = rawAudioPath.trim().replace(/^["']+|["']+$/g, "");

    const ROOT_DIR = getRootDir();
    const resolvedPath = path.isAbsolute(audioPath)
      ? audioPath
      : path.join(/*turbopackIgnore: true*/ ROOT_DIR, audioPath);

    if (!fs.existsSync(resolvedPath)) {
      return new NextResponse("Không tìm thấy file âm thanh", { status: 404 });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType =
      ext === ".mp4"
        ? "video/mp4"
        : ext === ".mov"
        ? "video/quicktime"
        : ext === ".webm"
        ? "video/webm"
        : ext === ".mkv"
        ? "video/x-matroska"
        : ext === ".mp3"
        ? "audio/mpeg"
        : ext === ".wav"
        ? "audio/wav"
        : ext === ".ogg"
        ? "audio/ogg"
        : ext === ".m4a" || ext === ".aac"
        ? "audio/aac"
        : "application/octet-stream";

    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    fileHandle = await fs.promises.open(resolvedPath, "r");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const buffer = Buffer.alloc(chunksize);
      await fileHandle.read(buffer, 0, chunksize, start);

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
        },
      });
    }

    const fileStream = fs.createReadStream(resolvedPath);
    return new NextResponse(fileStream as any, {
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
      },
    });
  } catch (error: any) {
    if (error?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Lỗi stream audio:", error);
    return new NextResponse("Lỗi đọc file âm thanh", { status: 500 });
  } finally {
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {}
    }
  }
}
