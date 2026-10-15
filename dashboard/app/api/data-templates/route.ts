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

export async function GET() {
  try {
    const ROOT_DIR = getRootDir();
    const DATA_DIR = path.join(ROOT_DIR, "data");

    if (!fs.existsSync(DATA_DIR)) {
      return NextResponse.json({ templates: [] });
    }

    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
    const templates = files.map((file) => {
      try {
        const content = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
        const parsed = JSON.parse(content);
        return {
          filename: file,
          slug: parsed.slug || file.replace(".json", ""),
          title: parsed.title || file,
          data: parsed,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ templates });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
