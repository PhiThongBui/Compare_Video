import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

function loadEnvKey(): string {
  if (process.env.AI_API_KEY) return process.env.AI_API_KEY;
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  try {
    const envPath = path.join(getRootDir(), ".env");
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, "utf8");
      for (const line of raw.split("\n")) {
        const m = line.trim().match(/^([A-Z_]+)=(.*)$/);
        if (m) {
          const key = m[1];
          const val = m[2].trim();
          if ((key === "AI_API_KEY" || key === "OPENAI_API_KEY" || key === "GEMINI_API_KEY") && val) {
            return val;
          }
        }
      }
    }
  } catch {}
  return "";
}

const SYSTEM_PROMPT = `Bạn là một chuyên gia biên kịch video ngắn hàng đầu cho kênh bóng đá "Phía sau sân cỏ" (format clip dọc TikTok/Reels/Shorts 30-40 giây).
Nhiệm vụ của bạn là nhận một ý tưởng hoặc chủ đề so sánh bóng đá từ người dùng và xây dựng kịch bản so sánh đúng chuẩn 12 câu kịch tính, ngắn gọn, cuốn hút theo đúng nhịp beat của series.

QUY TẮC BẮT BUỘC VỀ 12 CÂU KỊCH BẢN (ĐÚNG 12 CÂU, KHÔNG THIẾU KHÔNG THỪA):
- Câu 1 (Hook A): "Đây là [tên vế A]..." (ví dụ: "Đây là mức thu nhập khủng khiếp của Cristiano Ronaldo.")
- Câu 2 (Hook B): "Còn đây là [tên vế B]..." (ví dụ: "Còn đây là đãi ngộ không tưởng của Lionel Messi.")
- Câu 3 (Nút thắt): Đặt câu hỏi kích thích tò mò (ví dụ: "Con số chênh lệch thực sự là bao nhiêu?")
- Câu 4 (Giải A - ý 1): Luận điểm / thông số / đặc điểm đắt giá đầu tiên của A.
- Câu 5 (Giải A - ý 2): Đặc điểm nổi bật hoặc chi tiết tạo sự kinh ngạc của A.
- Câu 6 (Giải A - thực tế): 1 con số quy đổi hoặc ví dụ thực tế ấn tượng của A.
- Câu 7 (Giải B - ý 1): Luận điểm / thông số / đặc điểm đắt giá đầu tiên của B.
- Câu 8 (Giải B - ý 2): Đặc điểm nổi bật hoặc chi tiết tạo sự kinh ngạc của B.
- Câu 9 (Giải B - thực tế): 1 con số quy đổi hoặc ví dụ thực tế ấn tượng của B.
- Câu 10 (So sánh trực tiếp): Đối chiếu song song 2 bên trên cùng một bàn cân.
- Câu 11 (Cao trào): Đẩy cao trào tranh cãi hoặc nút thắt bất ngờ.
- Câu 12 (Payoff / CTA): Câu chốt hạ kích thích người xem để lại bình luận tranh luận (ví dụ: "Giữa hai siêu sao, bạn nể phục cỗ máy kiếm tiền nào hơn? Hãy để lại ý kiến!").

QUY TẮC TỪ KHÓA (keywordsToHighlight):
- Trích xuất 6 đến 12 từ/cụm từ quan trọng nhất xuất hiện trong 12 câu kịch bản (ví dụ: tên riêng, con số tài chính, danh hiệu, vị trí, thương hiệu).
- Các từ trong keywordsToHighlight PHẢI xuất hiện CHÍNH XÁC trong nội dung các câu trên để hệ thống tự động bôi màu làm nổi bật trên màn hình.

ICON HỢP LỆ (chọn 1 trong các id này cho iconA và iconB):
- "money": Tài chính, tiền lương, giá trị chuyển nhượng, thu nhập
- "trophy": Cúp vô địch, quả bóng vàng, danh hiệu, chiến tích
- "jersey-player": Cầu thủ thi đấu, áo đấu, trang bị thể thao
- "jersey-fan": Người hâm mộ, cổ động viên, áo fan
- "tactics": Chiến thuật, sa bàn, huấn luyện viên, sơ đồ
- "card-penalty": Thẻ phạt, trọng tài, VAR, tranh cãi, luật
- "default": Quả bóng đá, chung chung

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Chỉ trả về JSON thuần túy (RAW JSON), KHÔNG bọc trong markdown backticks \`\`\`json, KHÔNG kèm văn bản mở đầu hay kết thúc:
{
  "title": "Tiêu đề so sánh thu hút (dưới 50 ký tự)",
  "category": "Tài chính & Chuyển nhượng",
  "conceptA": "TÊN VẾ A (VIẾT HOA, dưới 20 ký tự)",
  "conceptB": "TÊN VẾ B (VIẾT HOA, dưới 20 ký tự)",
  "iconA": "money",
  "iconB": "money",
  "script": [
    "Câu 1...",
    "Câu 2...",
    "Câu 3...",
    "Câu 4...",
    "Câu 5...",
    "Câu 6...",
    "Câu 7...",
    "Câu 8...",
    "Câu 9...",
    "Câu 10...",
    "Câu 11...",
    "Câu 12..."
  ],
  "keywordsToHighlight": ["từ khóa 1", "từ khóa 2", "từ khóa 3"]
}`;

function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idea } = body;

    if (!idea || !idea.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập ý tưởng kịch bản so sánh (ví dụ: So sánh mức lương giữa Messi và Ronaldo)" },
        { status: 400 }
      );
    }

    const apiKey = loadEnvKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Chưa tìm thấy AI_API_KEY trong file .env. Vui lòng thêm AI_API_KEY=sk-... (OpenAI) hoặc AI_API_KEY=AIzaSy... (Gemini) vào file .env ở thư mục gốc!",
        },
        { status: 400 }
      );
    }

    let rawOutput = "";

    // 1. Nếu là Gemini API Key (bắt đầu bằng AIza)
    if (apiKey.startsWith("AIza")) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
        systemInstruction: SYSTEM_PROMPT,
      });

      const promptText = `Ý tưởng so sánh bóng đá của người dùng: "${idea.trim()}". Hãy tạo kịch bản 12 câu hoàn chỉnh đúng quy chuẩn JSON đã nêu.`;
      const result = await model.generateContent(promptText);
      const response = await result.response;
      rawOutput = response.text();
    } else {
      // 2. Mặc định là OpenAI (sk-...) hoặc OpenAI-compatible API
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Ý tưởng so sánh bóng đá: "${idea.trim()}". Hãy biên kịch thành video 12 câu hoàn chỉnh và trả về đúng định dạng JSON.`,
          },
        ],
      });

      rawOutput = completion.choices[0]?.message?.content || "";
    }

    const cleanedJson = cleanJsonResponse(rawOutput);
    let parsedData: {
      title?: string;
      category?: string;
      conceptA?: string;
      conceptB?: string;
      iconA?: string;
      iconB?: string;
      script?: string[];
      keywordsToHighlight?: string[];
    };

    try {
      parsedData = JSON.parse(cleanedJson);
    } catch {
      throw new Error("Mô hình AI trả về dữ liệu không đúng định dạng JSON: " + rawOutput.slice(0, 100));
    }

    // Đảm bảo cấu trúc an toàn
    const scriptArray = Array.isArray(parsedData.script) ? parsedData.script : [];
    if (scriptArray.length === 0) {
      throw new Error("Không tạo được danh sách 12 câu kịch bản hợp lệ.");
    }

    return NextResponse.json({
      success: true,
      data: {
        title: parsedData.title || idea.slice(0, 45),
        category: parsedData.category || "Kiến thức bóng đá",
        conceptA: (parsedData.conceptA || "VẾ A").toUpperCase().slice(0, 25),
        conceptB: (parsedData.conceptB || "VẾ B").toUpperCase().slice(0, 25),
        iconA: parsedData.iconA || "default",
        iconB: parsedData.iconB || "default",
        script: scriptArray,
        keywordsToHighlight: Array.isArray(parsedData.keywordsToHighlight)
          ? parsedData.keywordsToHighlight
          : [],
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API /api/generate-script] Error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi xử lý tạo kịch bản từ AI" },
      { status: 500 }
    );
  }
}
