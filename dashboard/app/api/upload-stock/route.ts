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

function getUploadDir(): string {
  const root = getRootDir();
  const dir = path.join(root, "data", "stock-uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * GET: Lấy thống kê dung lượng thư mục stock-uploads hoặc stream video xem trước
 */
export async function GET(req: NextRequest) {
  try {
    const uploadDir = getUploadDir();
    const url = new URL(req.url);

    // Stream media (video / audio) xem thử
    const streamFile = url.searchParams.get("filename");
    if (url.searchParams.get("stream") === "1" && streamFile) {
      const safeName = path.basename(streamFile);
      const filePath = path.join(uploadDir, safeName);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(safeName).toLowerCase();
        let contentType = "video/mp4";
        if (ext === ".mp3") contentType = "audio/mpeg";
        else if (ext === ".wav") contentType = "audio/wav";
        else if (ext === ".ogg") contentType = "audio/ogg";
        else if (ext === ".webm") contentType = "video/webm";

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Length": stat.size.toString(),
            "Accept-Ranges": "bytes",
          },
        });
      }
      return new NextResponse("File không tồn tại", { status: 404 });
    }

    const entries = fs.readdirSync(uploadDir);
    const files = [];
    let totalBytes = 0;

    for (const entry of entries) {
      const fullPath = path.join(uploadDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          totalBytes += stat.size;
          // Tên hiển thị thân thiện (bỏ tiền tố timestamp vd 1793434973754-abc.mp4 -> abc.mp4)
          const friendlyName = entry.replace(/^\d+-/, "");
          files.push({
            name: entry,
            displayName: friendlyName,
            path: fullPath,
            sizeBytes: stat.size,
            sizeFormatted: `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
            createdAt: stat.mtimeMs,
            createdDate: new Date(stat.mtimeMs).toLocaleString("vi-VN"),
            previewUrl: `/api/upload-stock?filename=${encodeURIComponent(entry)}&stream=1`,
          });
        }
      } catch {}
    }

    // Sắp xếp file mới nhất lên đầu
    files.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      count: files.length,
      totalBytes,
      totalFormatted: `${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
      files,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Tải file stock video lên và lưu tạm vào data/stock-uploads
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Không có file nào được tải lên" }, { status: 400 });
    }

    const uploadDir = getUploadDir();
    const uploadedFiles = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const destPath = path.join(uploadDir, safeName);
      fs.writeFileSync(destPath, buffer);

      uploadedFiles.push({
        name: file.name,
        savedName: safeName,
        path: destPath,
        sizeBytes: buffer.length,
        sizeFormatted: `${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Lỗi tải file lên" }, { status: 500 });
  }
}

// Tự động đồng bộ dọn dẹp các đường dẫn stock video đã bị xóa khỏi các file kịch bản data/*.json
function syncTemplatesStockVideos() {
  try {
    const rootDir = getRootDir();
    const dataDir = path.join(rootDir, "data");
    if (!fs.existsSync(dataDir)) return;
    const jsonFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
    for (const jf of jsonFiles) {
      try {
        const fullPath = path.join(dataDir, jf);
        const content = fs.readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.stockVideos)) {
          const originalLen = parsed.stockVideos.length;
          parsed.stockVideos = parsed.stockVideos.filter((p: string) => {
            try {
              return typeof p === "string" && p.trim() !== "" && fs.existsSync(p);
            } catch {
              return false;
            }
          });
          if (parsed.stockVideos.length !== originalLen) {
            fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), "utf8");
          }
        }
      } catch {}
    }
  } catch {}
}

/**
 * DELETE: Xóa 1 file, nhiều file được chọn hoặc xóa toàn bộ trong data/stock-uploads
 */
export async function DELETE(req: NextRequest) {
  try {
    const uploadDir = getUploadDir();
    const url = new URL(req.url);
    const targetFilename = url.searchParams.get("filename");
    const isDeleteAll = url.searchParams.get("all") === "1";

    let filenamesToDelete: string[] = [];

    if (targetFilename) {
      filenamesToDelete = [targetFilename];
    } else if (!isDeleteAll) {
      try {
        const body = await req.json();
        if (Array.isArray(body?.filenames) && body.filenames.length > 0) {
          filenamesToDelete = body.filenames;
        }
      } catch {}
    }

    // Xóa theo danh sách filenames (1 hoặc nhiều file được chọn)
    if (filenamesToDelete.length > 0) {
      let deletedCount = 0;
      let freedBytes = 0;

      for (const fn of filenamesToDelete) {
        const safeTarget = path.basename(fn);
        const filePath = path.join(uploadDir, safeTarget);
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          fs.unlinkSync(filePath);
          freedBytes += stat.size;
          deletedCount++;
        }
      }

      syncTemplatesStockVideos();

      return NextResponse.json({
        success: true,
        deletedCount,
        freedBytes,
        freedFormatted: `${(freedBytes / 1024 / 1024).toFixed(2)} MB`,
        message: `Đã xóa ${deletedCount} file stock, giải phóng ${(freedBytes / 1024 / 1024).toFixed(2)} MB!`,
      });
    }

    // Xóa toàn bộ file nếu không có danh sách cụ thể
    const entries = fs.readdirSync(uploadDir);
    let deletedCount = 0;
    let freedBytes = 0;

    for (const entry of entries) {
      const fullPath = path.join(uploadDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          freedBytes += stat.size;
          fs.unlinkSync(fullPath);
          deletedCount++;
        }
      } catch {}
    }

    syncTemplatesStockVideos();

    return NextResponse.json({
      success: true,
      deletedCount,
      freedBytes,
      freedFormatted: `${(freedBytes / 1024 / 1024).toFixed(2)} MB`,
      message: `Đã dọn dẹp sạch sẽ toàn bộ ${deletedCount} file stock upload, giải phóng ${(freedBytes / 1024 / 1024).toFixed(2)} MB ổ đĩa!`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Lỗi khi xóa file stock" }, { status: 500 });
  }
}
