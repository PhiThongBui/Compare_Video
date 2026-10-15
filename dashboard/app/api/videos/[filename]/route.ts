import { NextRequest, NextResponse } from "next/server";
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    const { filename } = await context.params;

    // Chặn directory traversal
    const safeFilename = path.basename(filename);
    if (!safeFilename.toLowerCase().endsWith(".mp4")) {
      return new NextResponse("File không hợp lệ", { status: 400 });
    }

    const ROOT_DIR = getRootDir();
    const filePath = path.join(ROOT_DIR, "output", safeFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Không tìm thấy video", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    fileHandle = await fs.promises.open(filePath, "r");

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
          "Content-Type": "video/mp4",
        },
      });
    } else {
      const buffer = await fileHandle.readFile();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
        },
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API /api/videos/[filename]] Error:", error);
    return new NextResponse("Lỗi server khi phát video: " + error.message, {
      status: 500,
    });
  } finally {
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {}
    }
  }
}
