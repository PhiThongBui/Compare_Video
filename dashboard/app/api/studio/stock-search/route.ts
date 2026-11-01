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

function loadPexelsKey(): string {
  if (process.env.PEXELS_API_KEY) return process.env.PEXELS_API_KEY;
  try {
    const envPath = path.join(getRootDir(), ".env");
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, "utf8");
      for (const line of raw.split("\n")) {
        const m = line.trim().match(/^PEXELS_API_KEY=(.*)$/);
        if (m && m[1].trim()) return m[1].trim();
      }
    }
  } catch {}
  return "";
}

// Kho stock video mẫu 9:16 miễn phí có sẵn (CDN trực tiếp không cần key)
const CURATED_STOCK_COLLECTION = [
  {
    id: "stock_fb_1",
    title: "Sân vận động rực sáng ban đêm (Stadium Floodlights)",
    category: "football",
    duration: 15,
    previewUrl: "https://assets.mixkit.co/videos/preview/mixkit-soccer-stadium-lights-at-night-42654-large.mp4",
    posterUrl: "https://images.pexels.com/photos/1884574/pexels-photo-1884574.jpeg?auto=compress&cs=tinysrgb&w=400",
    tags: ["football", "soccer", "stadium", "lights", "night"],
  },
  {
    id: "stock_fb_2",
    title: "Cầu thủ rê bóng trên sân cỏ (Player Dribbling Grass)",
    category: "football",
    duration: 12,
    previewUrl: "https://assets.mixkit.co/videos/preview/mixkit-legs-of-a-soccer-player-running-on-the-grass-42652-large.mp4",
    posterUrl: "https://images.pexels.com/photos/47730/the-ball-stadion-football-the-pitch-47730.jpeg?auto=compress&cs=tinysrgb&w=400",
    tags: ["football", "player", "grass", "dribble", "cleats"],
  },
  {
    id: "stock_fb_3",
    title: "Khán giả cổ vũ cuồng nhiệt (Crowd Cheering Celebration)",
    category: "crowd",
    duration: 10,
    previewUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-fans-cheering-at-a-concert-or-stadium-43093-large.mp4",
    posterUrl: "https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400",
    tags: ["crowd", "fans", "cheering", "celebration", "atmosphere"],
  },
  {
    id: "stock_fb_4",
    title: "Tập luyện thể lực đỉnh cao (Intense Gym Workout)",
    category: "fitness",
    duration: 14,
    previewUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-training-with-battle-ropes-in-gym-42668-large.mp4",
    posterUrl: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400",
    tags: ["fitness", "training", "gym", "athlete", "power"],
  },
  {
    id: "stock_fb_5",
    title: "Đếm tiền & Tài sản sang trọng (Luxury Wealth & Money)",
    category: "luxury",
    duration: 11,
    previewUrl: "https://assets.mixkit.co/videos/preview/mixkit-stacks-of-hundred-dollar-bills-rotating-42674-large.mp4",
    posterUrl: "https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=400",
    tags: ["money", "wealth", "luxury", "cash", "salary"],
  },
  {
    id: "stock_fb_6",
    title: "Khói sáng điện ảnh huyền ảo (Cinematic Dark Smoke)",
    category: "cinematic",
    duration: 16,
    previewUrl: "https://assets.mixkit.co/videos/preview/mixkit-thick-smoke-on-a-black-background-42661-large.mp4",
    posterUrl: "https://images.pexels.com/photos/60597/dahlia-red-blossom-bloom-60597.jpeg?auto=compress&cs=tinysrgb&w=400",
    tags: ["cinematic", "smoke", "dark", "background", "dramatic"],
  },
  {
    id: "stock_fb_7",
    title: "Bóng đá bay vào lưới khung thành (Goal Net Ripple)",
    category: "football",
    duration: 8,
    previewUrl: "https://assets.mixkit.co/videos/preview/mixkit-soccer-ball-hitting-the-net-slow-motion-42650-large.mp4",
    posterUrl: "https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=400",
    tags: ["football", "goal", "net", "slowmotion", "score"],
  },
  {
    id: "stock_fb_8",
    title: "Siêu xe di chuyển ban đêm (Luxury Supercar Night Drive)",
    category: "luxury",
    duration: 12,
    previewUrl: "https://assets.mixkit.co/videos/preview/mixkit-luxury-sports-car-driving-at-night-42680-large.mp4",
    posterUrl: "https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=400",
    tags: ["car", "luxury", "supercar", "ronaldo", "wealth"],
  },
];

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("query") || "").toLowerCase().trim();
    const category = (url.searchParams.get("category") || "all").toLowerCase().trim();
    const pexelsKey = loadPexelsKey();

    // 1. NẾU CÓ PEXELS API KEY -> GỌI TRỰC TIẾP API PEXELS CHÍNH THỨC
    if (pexelsKey && query) {
      try {
        const pexelsRes = await fetch(
          `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=12`,
          { headers: { Authorization: pexelsKey } }
        );

        if (pexelsRes.ok) {
          const data = await pexelsRes.json();
          const items = (data.videos || []).map((v: any) => {
            const sdFile = v.video_files.find((f: any) => f.quality === "hd" || f.quality === "sd") || v.video_files[0];
            return {
              id: `pexels_${v.id}`,
              title: `Pexels Video: ${query}`,
              category: "pexels",
              duration: v.duration,
              previewUrl: sdFile?.link || v.video_files[0]?.link,
              posterUrl: v.image,
              tags: [query],
            };
          });

          if (items.length > 0) {
            return NextResponse.json({ success: true, provider: "pexels-api", items });
          }
        }
      } catch (err: any) {
        console.warn("Lỗi Pexels API, dùng curated catalog:", err.message);
      }
    }

    // 2. TÌM KIẾM TRONG KHO STOCK CHUẨN BỊ SẴN (FREE ZERO-CONFIG)
    let filtered = CURATED_STOCK_COLLECTION;

    if (category && category !== "all") {
      filtered = filtered.filter((item) => item.category === category);
    }

    if (query) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.tags.some((t) => t.includes(query) || query.includes(t))
      );
    }

    // Nếu tìm kiếm không thấy, trả về toàn bộ danh mục tương ứng
    if (filtered.length === 0) {
      filtered = CURATED_STOCK_COLLECTION;
    }

    return NextResponse.json({
      success: true,
      provider: "curated-library",
      total: filtered.length,
      items: filtered,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tìm kiếm stock video" }, { status: 500 });
  }
}

// POST: Tải stock video về máy tính để đưa vào data/stock-uploads/
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoUrl, title = "Stock Clip" } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: "Thiếu URL video để tải" }, { status: 400 });
    }

    const root = getRootDir();
    const uploadDir = path.join(root, "data", "stock-uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanTitle = title.replace(/[^a-zA-Z0-9À-ỹ\s-]/g, "").trim().replace(/\s+/g, "-");
    const filename = `stock-${cleanTitle.slice(0, 30)}-${Date.now()}.mp4`;
    const targetPath = path.join(uploadDir, filename);

    // Tải video stream
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Không thể tải video từ nguồn (${response.statusText})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));

    const stats = fs.statSync(targetPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);

    return NextResponse.json({
      success: true,
      filename,
      localUrl: `/api/upload-stock?stream=1&filename=${encodeURIComponent(filename)}`,
      sizeFormatted: `${sizeMb} MB`,
      name: title,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi tải video stock" }, { status: 500 });
  }
}

