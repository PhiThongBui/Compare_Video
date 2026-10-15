import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

function getRootDir(): string {
  // If running from dashboard directory, root is ..
  // If running from repo root, root is .
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

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      category = "Kiến thức bóng đá",
      channel = "Phía sau sân cỏ",
      left,
      right,
      script,
      customSlug,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Tiêu đề không được để trống" }, { status: 400 });
    }

    if (!left?.name || !right?.name) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ tên Concept A và B" }, { status: 400 });
    }

    if (!Array.isArray(script) || script.length === 0) {
      return NextResponse.json({ error: "Kịch bản phải có ít nhất 1 câu thoại" }, { status: 400 });
    }

    const slug = (customSlug && customSlug.trim())
      ? slugify(customSlug.trim())
      : slugify(title);

    const ROOT_DIR = getRootDir();
    const DATA_DIR = path.join(ROOT_DIR, "data");
    const OUTPUT_DIR = path.join(ROOT_DIR, "output");

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Cấu trúc JSON chuẩn data-driven cho engine
    const videoPayload = {
      slug,
      category,
      channel,
      title,
      left: {
        name: left.name.trim().toUpperCase(),
        icon: left.icon || "default",
      },
      right: {
        name: right.name.trim().toUpperCase(),
        icon: right.icon || "default",
      },
      script: script.map((item: { tts?: string; caption?: string } | string) => {
        if (typeof item === "string") {
          return {
            tts: item.replace(/<[^>]+>/g, ""),
            caption: item,
          };
        }
        return {
          tts: item.tts || item.caption?.replace(/<[^>]+>/g, "") || "",
          caption: item.caption || item.tts || "",
        };
      }),
    };

    const jsonPath = path.join(DATA_DIR, `${slug}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(videoPayload, null, 2), "utf8");

    // Thực thi lệnh node make-video.mjs data/<slug>.json từ thư mục ROOT_DIR
    const command = `node make-video.mjs "data/${slug}.json"`;

    console.log(`[API /api/generate] Executing in ${ROOT_DIR}: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      cwd: ROOT_DIR,
      timeout: 300000, // 5 phút tối đa
      env: {
        ...process.env,
      },
    });

    const expectedMp4 = path.join(OUTPUT_DIR, `${slug}.mp4`);
    const isSuccess = fs.existsSync(expectedMp4);

    return NextResponse.json({
      success: isSuccess,
      slug,
      jsonPath: `data/${slug}.json`,
      videoUrl: `/api/videos/${slug}.mp4`,
      filename: `${slug}.mp4`,
      log: stdout + (stderr ? `\nSTDERR:\n${stderr}` : ""),
    });
  } catch (error: unknown) {
    const err = error as Error & { stdout?: string; stderr?: string };
    console.error("[API /api/generate] Error:", err);
    return NextResponse.json(
      {
        error: err.message || "Quá trình render thất bại",
        log: (err.stdout || "") + "\n" + (err.stderr || ""),
      },
      { status: 500 }
    );
  }
}
