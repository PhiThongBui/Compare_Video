import { NextResponse } from "next/server";

export async function GET() {
  const VIENEU_API_URL = (process.env.VIENEU_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
  const VIENEU_API_KEY = process.env.VIENEU_API_KEY || process.env.CIT_API_KEY || "";

  const headers: Record<string, string> = {};
  if (VIENEU_API_KEY) {
    headers["X-API-Key"] = VIENEU_API_KEY;
  }

  try {
    const [healthRes, voicesRes] = await Promise.all([
      fetch(`${VIENEU_API_URL}/health`, {
        method: "GET",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(3500),
      }).catch(() => null),
      fetch(`${VIENEU_API_URL}/voices`, {
        method: "GET",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(3500),
      }).catch(() => null),
    ]);

    let healthData = null;
    if (healthRes && healthRes.ok) {
      healthData = await healthRes.json().catch(() => null);
    }

    if (voicesRes && voicesRes.ok) {
      const data = await voicesRes.json();
      return NextResponse.json({
        online: true,
        provider: "vieneu",
        engine: healthData?.engine || "VieNeu-TTS-v3-Turbo",
        sample_rate: healthData?.sample_rate || 48000,
        device: healthData?.device || "cpu",
        supports_cloning: healthData?.supports_cloning ?? true,
        voices: data,
      });
    }
  } catch {}

  // Fallback 25 giọng chuẩn theo CIT Voice Studio 1.0 (VieNeu-TTS v3 Turbo)
  return NextResponse.json({
    online: false,
    provider: "vieneu",
    engine: "VieNeu-TTS-v3-Turbo",
    sample_rate: 48000,
    voices: [
      { id: "Hải Đăng", name: "Hải Đăng", gender: "male", region: "North", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz (Mặc định)", isCloned: false },
      { id: "Adam bựa", name: "Adam bựa", gender: "male", region: "North", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz", isCloned: false },
      { id: "Trúc Ly", name: "Trúc Ly", gender: "female", region: "North", description: "Nữ · Bắc · Phong cách tự nhiên · 48 kHz", isCloned: false },
      { id: "Thiện Minh", name: "Thiện Minh", gender: "male", region: "North", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz", isCloned: false },
      { id: "Mai Anh", name: "Mai Anh", gender: "female", region: "North", description: "Nữ · Bắc · Phong cách tin tức · 48 kHz", isCloned: false },
      { id: "Thùy Dung", name: "Thùy Dung", gender: "female", region: "South", description: "Nữ · Nam · Phong cách tin tức · 48 kHz", isCloned: false },
      { id: "Thiền Tâm Đức", name: "Thiền Tâm Đức", gender: "male", region: "North", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz", isCloned: false },
      { id: "Ngọc Huyền", name: "Ngọc Huyền", gender: "female", region: "North", description: "Nữ · Bắc · Giọng đọc tự nhiên · 48 kHz", isCloned: false },
      { id: "Quang Sơn", name: "Quang Sơn", gender: "male", region: "Central", description: "Nam · Trung · Phong cách tự nhiên · 48 kHz", isCloned: false },
      { id: "Ngọc Trân", name: "Ngọc Trân", gender: "female", region: "Central", description: "Nữ · Trung · Phong cách tự nhiên · 48 kHz", isCloned: false },
      { id: "Minh Đức", name: "Minh Đức", gender: "male", region: "North", description: "Nam · Bắc · Phong cách tin tức · 48 kHz", isCloned: false },
      { id: "Phạm Tuyên", name: "Phạm Tuyên", gender: "male", region: "North", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz", isCloned: false },
      { id: "Thái Sơn", name: "Thái Sơn", gender: "male", region: "South", description: "Nam · Nam · Phong cách kể chuyện · 48 kHz", isCloned: false },
      { id: "Xuân Vĩnh", name: "Xuân Vĩnh", gender: "male", region: "North", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz", isCloned: false },
      { id: "Thanh Bình", name: "Thanh Bình", gender: "male", region: "North", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz", isCloned: false },
      { id: "Ngọc Linh", name: "Ngọc Linh", gender: "female", region: "North", description: "Nữ · Bắc · Phong cách kể chuyện · 48 kHz", isCloned: false },
      { id: "Đoan Trang", name: "Đoan Trang", gender: "female", region: "North", description: "Nữ · Bắc · Phong cách tự nhiên · 48 kHz", isCloned: false },
      { id: "Thục Đoan", name: "Thục Đoan", gender: "female", region: "South", description: "Nữ · Nam · Phong cách kể chuyện · 48 kHz", isCloned: false },
      { id: "Minh Triết", name: "Minh Triết", gender: "male", region: "South", description: "Nam · Nam · Phong cách tin tức · 48 kHz", isCloned: false },
      { id: "Mỹ Duyên", name: "Mỹ Duyên", gender: "female", region: "South", description: "Nữ · Nam · Phong cách đọc truyện · 48 kHz", isCloned: false },
      { id: "Quỳnh Anh", name: "Quỳnh Anh", gender: "female", region: "North", description: "Nữ · Bắc · Phong cách đọc truyện · 48 kHz", isCloned: false },
      { id: "Đức Trí", name: "Đức Trí", gender: "male", region: "South", description: "Nam · Nam · Phong cách đọc truyện · 48 kHz", isCloned: false },
      { id: "Kim Thanh", name: "Kim Thanh", gender: "female", region: "South", description: "Nữ · Nam · Phong cách đọc truyện · 48 kHz", isCloned: false },
      { id: "Adam", name: "Adam", gender: "male", region: "South", description: "Nam · Nam · Giọng đọc tự nhiên · 48 kHz", isCloned: false },
      { id: "Quốc Tuấn", name: "Quốc Tuấn", gender: "male", region: "North", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz", isCloned: false },
    ],
  });
}
