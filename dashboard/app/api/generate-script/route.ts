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

const SYSTEM_PROMPT_COMPARE = `Bạn là một chuyên gia biên kịch video ngắn hàng đầu cho kênh bóng đá "Phía sau sân cỏ" (format clip dọc TikTok/Reels/Shorts 30-40 giây).
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

QUY TẮC TỰ ĐỘNG CHỌN ICON / EMOJI ĐẠI DIỆN (iconA và iconB):
- Hãy tự động phân tích tính chất đặc trưng của Concept A và Concept B để chọn 1 EMOJI DUY NHẤT (hoặc 1 mã icon ID) có tính biểu tượng trực quan mạnh mẽ nhất:
  + Cầu thủ / Siêu sao: Messi ("🐐" hoặc "🔟"), Ronaldo ("⚡" hoặc "7️⃣"), Haaland ("🤖"), Mbappe ("🐢"), Cầu thủ chung ("🎽"), Thủ môn ("🧤"), Huấn luyện viên ("📋"), v.v.
  + Đội bóng / Quốc gia: Real Madrid ("👑"), Barcelona ("🔵"), Đội bóng chung ("🛡️"), Cúp / Danh hiệu ("🏆").
  + Chủ đề tài chính / chuyển nhượng / tiền lương: "💰" hoặc "money".
  + Chủ đề công nghệ / trọng tài / VAR: "📺", "🟨", "card-penalty".
  + Áo thi đấu: "jersey-player" (áo cầu thủ), "jersey-fan" (áo fan).
  + Khái niệm khác: Sa bàn chiến thuật ("📋"), Trái bóng ("⚽"), Sức mạnh / Thể lực ("💪"), Tranh cãi ("🔥"), v.v.
- Ưu tiên trả về 1 Emoji duy nhất sinh động (ví dụ: "🐐", "⚡", "🤖", "📺", "🏆", "💰", "👑") hoặc mã preset: "money", "trophy", "jersey-player", "jersey-fan", "tactics", "card-penalty", "default".

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Chỉ trả về JSON thuần túy (RAW JSON), KHÔNG bọc trong markdown backticks \`\`\`json, KHÔNG kèm văn bản mở đầu hay kết thúc:
{
  "title": "Tiêu đề so sánh thu hút (dưới 50 ký tự)",
  "category": "Chuyên mục phù hợp (ví dụ: Siêu sao & Huyền thoại, Công nghệ & Trang bị, Tài chính & Chuyển nhượng, Chiến thuật, v.v.)",
  "conceptA": "TÊN VẾ A (VIẾT HOA, dưới 20 ký tự)",
  "conceptB": "TÊN VẾ B (VIẾT HOA, dưới 20 ký tự)",
  "iconA": "🐐",
  "iconB": "⚡",
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

const SYSTEM_PROMPT_PODCAST = `Bạn là một chuyên gia biên kịch video podcast ngắn đỉnh cao cho kênh "Phía sau sân cỏ • Podcast Talk" (format clip dọc TikTok/Reels/Shorts 30-50 giây, đối thoại 2 người: Host và Guest).
Nhiệm vụ của bạn là nhận chủ đề tranh luận, so sánh hoặc phân tích và xây dựng kịch bản đối thoại kịch tính giữa Host (người dẫn dắt, đặt vấn đề, hỏi xoáy) và Guest (chuyên gia phân tích, đưa ra luận điểm sắc bén, số liệu thực tế).

QUY TẮC BẮT BUỘC VỀ KỊCH BẢN PODCAST (4 ĐẾN 8 LƯỢT ĐỐI THOẠI):
- Luân phiên giữa speaker "host" và "guest".
- Lượt 1 (Host mở màn): Câu hỏi hoặc góc nhìn kích thích tò mò ("Này anh, giữa X và Y thì ai đỉnh hơn?").
- Lượt 2 (Guest phản hồi): Đưa ra nhận định gây bất ngờ + số liệu/chi tiết thực tế thuyết phục.
- Lượt 3 (Host vặn lại / phản biện): Đặt câu hỏi khó hoặc chỉ ra điểm nghịch lý / đối lập.
- Lượt 4 (Guest chốt hạ chuyên môn): Đưa ra góc nhìn sâu nhất, chốt hạ quan điểm đẳng cấp.
- Lượt 5/6 (Tuỳ chọn hoặc Host chốt): Kêu gọi người xem để lại bình luận tranh luận.
- Mỗi lượt có:
  + "speaker": "host" hoặc "guest"
  + "tts": Câu đọc thoại tự nhiên, khẩu ngữ đời thực, nhịp điệu podcast cuốn hút.
  + "caption": Phụ đề cô đọng, bọc 1-2 từ khóa đắt giá nhất trong dấu sao kép: **từ khóa** (ví dụ: "Này anh Minh, giữa **Haaland** và **Mbappe**, ai mới là **kế vị**?").

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Chỉ trả về JSON thuần túy (RAW JSON), KHÔNG bọc trong markdown backticks:
{
  "title": "Tiêu đề podcast cuốn hút (dưới 50 ký tự)",
  "host": {
    "name": "Hải Đăng",
    "role": "Host / BLV",
    "avatar": "🎙️"
  },
  "guest": {
    "name": "Thiện Minh",
    "role": "Chuyên gia phân tích",
    "avatar": "⭐"
  },
  "script": [
    {
      "speaker": "host",
      "tts": "Này anh Minh, giữa Haaland và Mbappe, ai mới thực sự là người kế vị xứng đáng của Messi và Ronaldo?",
      "caption": "Này anh Minh, giữa **Haaland** và **Mbappe**, ai mới là **kế vị**?"
    },
    {
      "speaker": "guest",
      "tts": "Mbappe kỹ thuật và toàn diện, nhưng nhìn vào hiệu suất ghi bàn của Haaland ở Ngoại hạng Anh, cậu ấy mới là cỗ máy săn bàn không thể cản phá!",
      "caption": "Mbappe toàn diện, nhưng **hiệu suất của Haaland** tại **Ngoại hạng Anh** là một **quái vật**!"
    }
  ],
  "keywordsToHighlight": ["Haaland", "Mbappe", "kế vị", "quái vật", "Ngoại hạng Anh"]
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
  cleaned = cleaned.trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idea, refinePrompt, currentScript, mode = "compare" } = body;
    const isPodcast = mode === "podcast";
    const isRefinement = Boolean(refinePrompt && refinePrompt.trim() && currentScript);

    if (!isRefinement && (!idea || !idea.trim())) {
      return NextResponse.json(
        { error: isPodcast ? "Vui lòng nhập chủ đề thảo luận podcast" : "Vui lòng nhập ý tưởng kịch bản so sánh" },
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

    const activeSystemPrompt = isPodcast ? SYSTEM_PROMPT_PODCAST : SYSTEM_PROMPT_COMPARE;

    // Xây dựng prompt phù hợp: Tạo mới hay Tinh chỉnh kịch bản cũ
    let promptText = "";
    if (isPodcast) {
      if (isRefinement) {
        const curLines = Array.isArray(currentScript?.script)
          ? currentScript.script
              .map(
                (s: { speaker?: string; tts?: string; caption?: string }, idx: number) =>
                  `  Lượt ${idx + 1} (${s.speaker || "host"}): "${s.tts || s.caption || ""}"`
              )
              .join("\n")
          : "";

        promptText = `BẠN ĐANG TRONG PHIÊN TINH CHỈNH KỊCH BẢN PODCAST Q&A 2 NGƯỜI (HOST & GUEST).
Chủ đề: "${(idea || currentScript?.title || "Podcast bóng đá").trim()}"
Host: "${currentScript?.host?.name || "Hải Đăng"}" (${currentScript?.host?.role || "Host"})
Guest: "${currentScript?.guest?.name || "Thiện Minh"}" (${currentScript?.guest?.role || "Khách mời"})

KỊCH BẢN HIỆN TẠI (PHIÊN BẢN TRƯỚC ĐÓ):
${curLines}

YÊU CẦU TINH CHỈNH CỦA NGƯỜI DÙNG:
"${refinePrompt.trim()}"

NHIỆM VỤ:
1. Viết lại hoặc điều chỉnh kịch bản podcast đáp ứng đúng yêu cầu tinh chỉnh của người dùng.
2. Giữ nguyên định dạng JSON chuẩn gồm title, host, guest, script (mỗi turn gồm speaker: 'host'|'guest', tts, caption có <span class="kw">...</span>), keywordsToHighlight.
3. Chỉ trả về RAW JSON.`;
      } else {
        promptText = `Chủ đề thảo luận Podcast Q&A 2 người: "${idea.trim()}". Hãy tạo kịch bản đối thoại kịch tính giữa Host và Guest theo đúng chuẩn JSON quy định.`;
      }
    } else {
      if (isRefinement) {
        const currentLines = Array.isArray(currentScript.script)
          ? currentScript.script.map((line: string, idx: number) => `  Câu ${idx + 1}: "${line}"`).join("\n")
          : "";

        promptText = `BẠN ĐANG TRONG PHIÊN TINH CHỈNH / NÂNG CẤP KỊCH BẢN CŨ.
Chủ đề / Đề tài: "${(idea || currentScript.title || "So sánh bóng đá").trim()}"

KỊCH BẢN HIỆN TẠI (PHIÊN BẢN TRƯỚC ĐÓ):
- Tiêu đề: "${currentScript.title || ""}"
- Chuyên mục: "${currentScript.category || "Kiến thức bóng đá"}"
- Concept A: "${currentScript.conceptA || ""}" (Icon hiện tại: "${currentScript.iconA || "default"}")
- Concept B: "${currentScript.conceptB || ""}" (Icon hiện tại: "${currentScript.iconB || "default"}")
- 12 câu kịch bản hiện thời:
${currentLines}

YÊU CẦU TINH CHỈNH CỦA NGƯỜI DÙNG:
"${refinePrompt.trim()}"

NHIỆM VỤ:
Dựa trên kịch bản hiện tại và yêu cầu tinh chỉnh của người dùng, hãy viết lại hoặc điều chỉnh các câu kịch bản tương ứng để đáp ứng tốt nhất yêu cầu:
1. Duy trì cấu trúc chuẩn 12 câu, format 3-zone, nhịp điệu bóng đá lôi cuốn.
2. Cập nhật lại các câu cần sửa (hoặc toàn bộ nếu yêu cầu thay đổi phong cách, số liệu hay góc nhìn).
3. Đề xuất iconA và iconB phù hợp nếu có thay đổi hoặc giữ nguyên emoji hiện có.
4. Tự động trích xuất lại keywordsToHighlight chính xác theo 12 câu kịch bản mới này.
5. Chỉ trả về RAW JSON đúng schema đã quy định, không kèm bất kỳ giải thích nào.`;
      } else {
        promptText = `Ý tưởng so sánh bóng đá của người dùng: "${idea.trim()}". Hãy tạo kịch bản 12 câu hoàn chỉnh đúng quy chuẩn JSON đã nêu.`;
      }
    }

    let rawOutput = "";

    // 1. Nếu là Gemini API Key (bắt đầu bằng AIza)
    if (apiKey.startsWith("AIza")) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const configuredModel = process.env.GEMINI_MODEL;
      const candidateModels = configuredModel
        ? [configuredModel, "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"]
        : [
            "gemini-3.8-flash",
            "gemini-3.7-flash",
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash-lite",
          ];

      let lastError: Error | null = null;
      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            },
            systemInstruction: activeSystemPrompt,
          });

          const result = await model.generateContent(promptText);
          const response = await result.response;
          rawOutput = response.text();
          if (rawOutput) {
            lastError = null;
            break;
          }
        } catch (err: unknown) {
          lastError = err as Error;
          console.warn(`[Gemini model ${modelName} issue, trying next model]:`, lastError.message);
        }
      }

      if (!rawOutput && lastError) {
        throw lastError;
      }
    } else {
      // 2. Mặc định là OpenAI (sk-...) hoặc OpenAI-compatible API
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: activeSystemPrompt },
          {
            role: "user",
            content: promptText,
          },
        ],
      });

      rawOutput = completion.choices[0]?.message?.content || "";
    }

    const cleanedJson = cleanJsonResponse(rawOutput);
    let parsedData: any;

    try {
      parsedData = JSON.parse(cleanedJson);
    } catch {
      throw new Error("Mô hình AI trả về dữ liệu không đúng định dạng JSON: " + rawOutput.slice(0, 100));
    }

    if (isPodcast) {
      const scriptTurns = Array.isArray(parsedData.script) ? parsedData.script : [];
      if (scriptTurns.length === 0) {
        throw new Error("Không tạo được danh sách lượt đối thoại podcast hợp lệ.");
      }

      return NextResponse.json({
        success: true,
        mode: "podcast",
        data: {
          title: parsedData.title || (idea ? idea.slice(0, 45) : "Podcast bóng đá"),
          host: {
            name: parsedData.host?.name || "Hải Đăng",
            role: parsedData.host?.role || "Host / Dẫn chương trình",
            avatar: parsedData.host?.avatar || "🎙️",
          },
          guest: {
            name: parsedData.guest?.name || "Thiện Minh",
            role: parsedData.guest?.role || "Chuyên gia phân tích",
            avatar: parsedData.guest?.avatar || "⭐",
          },
          script: scriptTurns.map((turn: any) => {
            const rawTts = (turn.tts || turn.caption || "").replace(/\*\*/g, "").replace(/<[^>]+>/g, "");
            let rawCaption = turn.caption || turn.tts || "";
            if (rawCaption.includes("**")) {
              rawCaption = rawCaption.replace(/\*\*(.*?)\*\*/g, '<span class="kw">$1</span>');
            }
            return {
              speaker: turn.speaker === "guest" ? "guest" : "host",
              tts: rawTts,
              caption: rawCaption,
            };
          }),
          keywordsToHighlight: Array.isArray(parsedData.keywordsToHighlight) ? parsedData.keywordsToHighlight : [],
        },
      });
    }

    // Đảm bảo cấu trúc an toàn cho compare mode
    const scriptArray = Array.isArray(parsedData.script) ? parsedData.script : [];
    if (scriptArray.length === 0) {
      throw new Error("Không tạo được danh sách 12 câu kịch bản hợp lệ.");
    }

    return NextResponse.json({
      success: true,
      mode: "compare",
      data: {
        title: parsedData.title || (idea ? idea.slice(0, 45) : "So sánh bóng đá"),
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
