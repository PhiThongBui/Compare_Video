import { NextResponse } from "next/server";

interface VoiceItem {
  id: string;
  name: string;
  gender: "male" | "female";
  region: "North" | "Central" | "South" | "International";
  style: "natural" | "news" | "story" | "reading";
  description: string;
  provider: "vieneu" | "supertonic" | "edge";
  sampleRate: number;
  isCloned?: boolean;
  featured?: boolean;
}

const SUPERTONIC_VOICES: VoiceItem[] = [
  { id: "F1", name: "F1 (Nữ Quốc tế)", gender: "female", region: "International", style: "natural", description: "Nữ · Quốc tế · Đa ngôn ngữ (31 thứ tiếng) · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false, featured: true },
  { id: "F2", name: "F2 (Nữ Trẻ)", gender: "female", region: "International", style: "natural", description: "Nữ · Quốc tế · Đa ngôn ngữ · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false },
  { id: "F3", name: "F3 (Nữ Trưởng thành)", gender: "female", region: "International", style: "news", description: "Nữ · Quốc tế · Đa ngôn ngữ · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false },
  { id: "F4", name: "F4 (Nữ Trầm ấm)", gender: "female", region: "International", style: "story", description: "Nữ · Quốc tế · Đa ngôn ngữ · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false },
  { id: "F5", name: "F5 (Nữ Sinh động)", gender: "female", region: "International", style: "reading", description: "Nữ · Quốc tế · Đa ngôn ngữ · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false },
  { id: "M1", name: "M1 (Nam Trẻ)", gender: "male", region: "International", style: "natural", description: "Nam · Quốc tế · Đa ngôn ngữ · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false, featured: true },
  { id: "M2", name: "M2 (Nam Trầm)", gender: "male", region: "International", style: "news", description: "Nam · Quốc tế · Đa ngôn ngữ · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false },
  { id: "M3", name: "M3 (Nam Mạnh mẽ)", gender: "male", region: "International", style: "story", description: "Nam · Quốc tế · Đa ngôn ngữ · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false },
  { id: "M4", name: "M4 (Nam Kể chuyện)", gender: "male", region: "International", style: "reading", description: "Nam · Quốc tế · Đa ngôn ngữ · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false },
  { id: "M5", name: "M5 (Nam Tự nhiên)", gender: "male", region: "International", style: "natural", description: "Nam · Quốc tế · Đa ngôn ngữ · 44.1 kHz", provider: "supertonic", sampleRate: 44100, isCloned: false },
];

const EDGE_VOICES: VoiceItem[] = [
  { id: "vi-VN-NamMinhNeural", name: "Nam Minh (Edge)", gender: "male", region: "North", style: "news", description: "Nam · Bắc · Chuẩn phát thanh Microsoft · 24 kHz", provider: "edge", sampleRate: 24000, isCloned: false },
  { id: "vi-VN-HoaiMyNeural", name: "Hoài My (Edge)", gender: "female", region: "North", style: "story", description: "Nữ · Bắc · Truyền cảm Microsoft · 24 kHz", provider: "edge", sampleRate: 24000, isCloned: false },
];

const FALLBACK_VIENEU_VOICES: VoiceItem[] = [
  { id: "Hải Đăng", name: "Hải Đăng", gender: "male", region: "North", style: "natural", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz (Mặc định)", provider: "vieneu", sampleRate: 48000, isCloned: false, featured: true },
  { id: "Adam bựa", name: "Adam bựa", gender: "male", region: "North", style: "natural", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false, featured: true },
  { id: "Trúc Ly", name: "Trúc Ly", gender: "female", region: "North", style: "natural", description: "Nữ · Bắc · Phong cách tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false, featured: true },
  { id: "Thiện Minh", name: "Thiện Minh", gender: "male", region: "North", style: "story", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false, featured: true },
  { id: "Mai Anh", name: "Mai Anh", gender: "female", region: "North", style: "news", description: "Nữ · Bắc · Phong cách tin tức · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false, featured: true },
  { id: "Thùy Dung", name: "Thùy Dung", gender: "female", region: "South", style: "news", description: "Nữ · Nam · Phong cách tin tức · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false, featured: true },
  { id: "Thiền Tâm Đức", name: "Thiền Tâm Đức", gender: "male", region: "North", style: "story", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false, featured: true },
  { id: "Ngọc Huyền", name: "Ngọc Huyền", gender: "female", region: "North", style: "natural", description: "Nữ · Bắc · Giọng đọc tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Quang Sơn", name: "Quang Sơn", gender: "male", region: "Central", style: "natural", description: "Nam · Trung · Phong cách tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Ngọc Trân", name: "Ngọc Trân", gender: "female", region: "Central", style: "natural", description: "Nữ · Trung · Phong cách tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Minh Đức", name: "Minh Đức", gender: "male", region: "North", style: "news", description: "Nam · Bắc · Phong cách tin tức · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Phạm Tuyên", name: "Phạm Tuyên", gender: "male", region: "North", style: "natural", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Thái Sơn", name: "Thái Sơn", gender: "male", region: "South", style: "story", description: "Nam · Nam · Phong cách kể chuyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Xuân Vĩnh", name: "Xuân Vĩnh", gender: "male", region: "North", style: "natural", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Thanh Bình", name: "Thanh Bình", gender: "male", region: "North", style: "story", description: "Nam · Bắc · Phong cách kể chuyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Ngọc Linh", name: "Ngọc Linh", gender: "female", region: "North", style: "story", description: "Nữ · Bắc · Phong cách kể chuyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Đoan Trang", name: "Đoan Trang", gender: "female", region: "North", style: "natural", description: "Nữ · Bắc · Phong cách tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Thục Đoan", name: "Thục Đoan", gender: "female", region: "South", style: "story", description: "Nữ · Nam · Phong cách kể chuyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Minh Triết", name: "Minh Triết", gender: "male", region: "South", style: "news", description: "Nam · Nam · Phong cách tin tức · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Mỹ Duyên", name: "Mỹ Duyên", gender: "female", region: "South", style: "reading", description: "Nữ · Nam · Phong cách đọc truyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Quỳnh Anh", name: "Quỳnh Anh", gender: "female", region: "North", style: "reading", description: "Nữ · Bắc · Phong cách đọc truyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Đức Trí", name: "Đức Trí", gender: "male", region: "South", style: "reading", description: "Nam · Nam · Phong cách đọc truyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Kim Thanh", name: "Kim Thanh", gender: "female", region: "South", style: "reading", description: "Nữ · Nam · Phong cách đọc truyện · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Adam", name: "Adam", gender: "male", region: "South", style: "natural", description: "Nam · Nam · Giọng đọc tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
  { id: "Quốc Tuấn", name: "Quốc Tuấn", gender: "male", region: "North", style: "natural", description: "Nam · Bắc · Phong cách tự nhiên · 48 kHz", provider: "vieneu", sampleRate: 48000, isCloned: false },
];

function inferStyle(desc: string = ""): "natural" | "news" | "story" | "reading" {
  const lower = desc.toLowerCase();
  if (lower.includes("kể chuyện") || lower.includes("ke chuyen")) return "story";
  if (lower.includes("tin tức") || lower.includes("tin tuc")) return "news";
  if (lower.includes("đọc truyện") || lower.includes("doc truyen")) return "reading";
  return "natural";
}

function inferRegion(rawRegion: string = "", desc: string = ""): "North" | "Central" | "South" | "International" {
  const combined = `${rawRegion} ${desc}`.toLowerCase();
  if (combined.includes("trung") || combined.includes("central")) return "Central";
  if (combined.includes("nam") || combined.includes("south")) return "South";
  if (combined.includes("quốc tế") || combined.includes("inter")) return "International";
  return "North";
}

export async function GET() {
  const VIENEU_API_URL = (process.env.VIENEU_API_URL || "http://127.0.0.1:8001").replace(/\/+$/, "");
  const VIENEU_API_KEY = process.env.VIENEU_API_KEY || process.env.CIT_API_KEY || "";

  const headers: Record<string, string> = {};
  if (VIENEU_API_KEY) {
    headers["X-API-Key"] = VIENEU_API_KEY;
  }

  let isOnline = false;
  let engine = "VieNeu-TTS-v3-Turbo";
  let sampleRate = 48000;
  let device = "cpu";
  let backend = "onnx";
  let supportsCloning = true;
  let languages: Array<{ code: string; name: string }> = [];
  let citVoices: VoiceItem[] = [];

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

    if (healthRes && healthRes.ok) {
      const hData = await healthRes.json().catch(() => null);
      if (hData) {
        isOnline = true;
        engine = hData.engine || engine;
        sampleRate = hData.sample_rate || sampleRate;
        device = hData.device || device;
        backend = hData.backend || backend;
        supportsCloning = hData.supports_cloning ?? supportsCloning;
        languages = Array.isArray(hData.languages) ? hData.languages : [];
      }
    }

    if (voicesRes && voicesRes.ok) {
      const rawList = await voicesRes.json();
      if (Array.isArray(rawList) && rawList.length > 0) {
        citVoices = rawList.map((v: any) => ({
          id: v.id || v.name,
          name: v.name || v.id,
          gender: v.gender === "female" ? "female" : "male",
          region: inferRegion(v.region, v.description),
          style: inferStyle(v.description),
          description: v.description || `${v.name} · ${sampleRate / 1000} kHz`,
          provider: "vieneu" as const,
          sampleRate: sampleRate,
          isCloned: Boolean(v.isCloned),
          featured: Boolean(v.featured),
        }));
      }
    }
  } catch {}

  // Nếu không kết nối được CIT Voice Studio, dùng danh sách fallback
  const baseVoices = citVoices.length > 0 ? citVoices : FALLBACK_VIENEU_VOICES;

  // Hợp nhất toàn bộ: VieNeu + Supertonic + Edge
  const allVoices: VoiceItem[] = [...baseVoices, ...SUPERTONIC_VOICES, ...EDGE_VOICES];

  return NextResponse.json({
    online: isOnline,
    provider: "cit-voice-studio",
    engine,
    sample_rate: sampleRate,
    device,
    backend,
    supports_cloning: supportsCloning,
    languages,
    counts: {
      total: allVoices.length,
      vieneu: baseVoices.length,
      supertonic: SUPERTONIC_VOICES.length,
      edge: EDGE_VOICES.length,
      cloned: baseVoices.filter((v) => v.isCloned).length,
    },
    voices: allVoices,
  });
}
