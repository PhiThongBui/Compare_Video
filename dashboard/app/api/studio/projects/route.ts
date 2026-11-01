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

function getProjectsDir(): string {
  const root = getRootDir();
  const dir = path.join(root, "data", "studio-projects");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function GET(req: NextRequest) {
  try {
    const projectsDir = getProjectsDir();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const safeId = path.basename(id).replace(/[^a-zA-Z0-9_-]/g, "");
      const filePath = path.join(projectsDir, `${safeId}.json`);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "Dự án không tồn tại" }, { status: 404 });
      }
      const raw = fs.readFileSync(filePath, "utf8");
      return NextResponse.json({ project: JSON.parse(raw) });
    }

    const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith(".json"));
    const projects = [];

    for (const f of files) {
      try {
        const full = path.join(projectsDir, f);
        const stat = fs.statSync(full);
        const raw = fs.readFileSync(full, "utf8");
        const parsed = JSON.parse(raw);
        projects.push({
          id: parsed.id || path.basename(f, ".json"),
          name: parsed.name || "Dự án chưa đặt tên",
          duration: parsed.duration || 0,
          aspectRatio: parsed.aspectRatio || "9:16",
          updatedAt: parsed.updatedAt || stat.mtimeMs,
          clipsCount: (parsed.tracks || []).reduce((acc: number, t: any) => acc + (t.clips ? t.clips.length : 0), 0),
        });
      } catch {}
    }

    projects.sort((a, b) => b.updatedAt - a.updatedAt);
    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectsDir = getProjectsDir();

    let id = body.id;
    if (!id || typeof id !== "string") {
      id = `proj_${Date.now()}`;
    }
    const safeId = path.basename(id).replace(/[^a-zA-Z0-9_-]/g, "");

    const projectData = {
      ...body,
      id: safeId,
      name: body.name || "Dự án mới",
      updatedAt: Date.now(),
    };

    const filePath = path.join(projectsDir, `${safeId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2), "utf8");

    return NextResponse.json({ success: true, project: projectData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID dự án" }, { status: 400 });
    }

    const safeId = path.basename(id).replace(/[^a-zA-Z0-9_-]/g, "");
    const projectsDir = getProjectsDir();
    const filePath = path.join(projectsDir, `${safeId}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

