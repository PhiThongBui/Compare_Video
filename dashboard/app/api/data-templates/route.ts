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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function GET() {
  try {
    const ROOT_DIR = getRootDir();
    const DATA_DIR = path.join(ROOT_DIR, "data");

    if (!fs.existsSync(DATA_DIR)) {
      return NextResponse.json({ templates: [], count: 0, totalBytes: 0, totalFormatted: "0 B" });
    }

    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
    let totalBytes = 0;

    const templates = files
      .map((file) => {
        try {
          const filePath = path.join(DATA_DIR, file);
          const stat = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, "utf8");
          const parsed = JSON.parse(content);
          totalBytes += stat.size;

          // Kiểm tra và dọn dẹp các đường dẫn stock video đã bị xóa khỏi ổ đĩa
          if (Array.isArray(parsed.stockVideos)) {
            const originalLength = parsed.stockVideos.length;
            parsed.stockVideos = parsed.stockVideos.filter((p: string) => {
              try {
                return typeof p === "string" && p.trim() !== "" && fs.existsSync(p);
              } catch {
                return false;
              }
            });
            // Tự động đồng bộ lại file JSON nếu có clip đã bị xóa
            if (parsed.stockVideos.length !== originalLength) {
              try {
                fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf8");
              } catch {}
            }
          }

          let type: "broll" | "compare" | "podcast" | "general" = "general";
          let itemsCount = 0;
          if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            type = "broll";
            itemsCount = parsed.sections.length;
          } else if (parsed.host && parsed.guest) {
            type = "podcast";
            itemsCount = Array.isArray(parsed.script) ? parsed.script.length : 0;
          } else if (
            (parsed.conceptA && parsed.conceptB) ||
            (parsed.left && parsed.right) ||
            (Array.isArray(parsed.script) && !parsed.sections && !parsed.host)
          ) {
            type = "compare";
            itemsCount = Array.isArray(parsed.script) ? parsed.script.length : 0;
          } else if (Array.isArray(parsed.script)) {
            itemsCount = parsed.script.length;
          }

          return {
            filename: file,
            slug: parsed.slug || file.replace(".json", ""),
            title: parsed.title || file.replace(".json", ""),
            type,
            itemsCount,
            sizeBytes: stat.size,
            sizeFormatted: formatBytes(stat.size),
            updatedAt: stat.mtimeMs,
            createdDate: new Date(stat.mtimeMs).toLocaleString("vi-VN"),
            data: parsed,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b?.updatedAt || 0) - (a?.updatedAt || 0));

    return NextResponse.json({
      templates,
      count: templates.length,
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ROOT_DIR = getRootDir();
    const DATA_DIR = path.join(ROOT_DIR, "data");
    const { searchParams } = new URL(req.url);
    const filenameParam = searchParams.get("filename");
    const slugParam = searchParams.get("slug");

    let filenamesToDelete: string[] = [];

    if (filenameParam) {
      filenamesToDelete = [filenameParam];
    } else if (slugParam) {
      filenamesToDelete = [`${slugParam}.json`];
    } else {
      try {
        const body = await req.json();
        if (Array.isArray(body?.filenames) && body.filenames.length > 0) {
          filenamesToDelete = body.filenames;
        }
      } catch {}
    }

    if (filenamesToDelete.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy file JSON kịch bản cần xóa" }, { status: 400 });
    }

    let deletedCount = 0;
    for (const rawName of filenamesToDelete) {
      const safeName = path.basename(rawName);
      if (!safeName.endsWith(".json")) continue;
      const targetPath = path.join(DATA_DIR, safeName);
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        deletedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Đã xóa thành công ${deletedCount} file kịch bản JSON!`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
