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

QUY TẮC LỒNG GHÉP THẺ CẢM XÚC & NGẮT NHỊP CHO GIỌNG ĐỌC AI (VieNeu-TTS / CIT Voice Studio):
Trong 12 câu kịch bản so sánh, bạn BẮT BUỘC phải lồng ghép đầy đủ các thẻ cảm xúc sau vào các câu để giọng đọc kịch tính, lôi cuốn như bình luận viên thực thụ:
- [hắng giọng]: BẮT BUỘC chèn ở câu 3 (nút thắt) hoặc câu 10 (đối chiếu quyết định) để ngắt nhịp trịnh trọng.
- [cười]: BẮT BUỘC chèn ở câu châm biếm nhẹ, tự trào hoặc câu 12 (khiêu khích bình luận).
- [thở dài]: BẮT BUỘC chèn ở câu chỉ ra nhược điểm hoặc cái giá quá đắt của một bên.
- [lấy hơi]: Chèn trước khi nêu thông số bùng nổ hoặc trước câu chốt.
- [nghỉ 0.8s] hoặc [nghỉ 1s]: Chèn sau câu hỏi hoặc trước một con số kinh ngạc để kích thích tò mò.
* NGUYÊN TẮC VỊ TRÍ ĐẶT TAG: Luôn đặt thẻ ở ĐẦU CÂU hoặc GIỮA CÂU (ngay trước từ khóa trọng tâm). TUYỆT ĐỐI KHÔNG ĐẶT Ở CUỐI CÂU sau dấu chấm hoặc dấu chấm hỏi (Ví dụ ĐÚNG: 'Nhưng bạn có biết [thở dài] sự thật là gì?', KHÔNG VIẾT SAI: '...sự thật là gì? [thở dài]').

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

QUY TẮC LỒNG GHÉP THẺ CẢM XÚC VÀ NGẮT NGHỈ TRONG HỘI THOẠI PODCAST (VieNeu-TTS / CIT Voice Studio):
Để cuộc trò chuyện giữa Host và Guest tự nhiên và sinh động như podcast ngoài đời thực, bạn BẮT BUỘC phải lồng ghép các thẻ cảm xúc sau vào trường "tts":
- [cười]: Chèn khi Host trêu đùa hoặc Guest bật cười trước một nghịch lý hài hước (ví dụ: "Nói thật nhé [cười], tôi không nghĩ có ai cản nổi cậu ấy!").
- [hắng giọng]: Chèn khi Host chuẩn bị hỏi câu hóc búa, hoặc Guest bắt đầu đưa ra phân tích chuyên sâu (ví dụ: "[hắng giọng] Nhưng nhìn vào con số thực tế...").
- [thở dài]: Chèn khi nói về thất bại, tiếc nuối hoặc sự sa sút phong độ.
- [nghỉ 0.8s] hoặc [nghỉ 1s]: Chèn ngắt nhịp suy nghĩ trước khi chốt một luận điểm sắc bén.

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
      "tts": "[hắng giọng] Này anh Minh, [nghỉ 0.8s] giữa Haaland và Mbappe, ai mới thực sự là người kế vị xứng đáng của Messi và Ronaldo?",
      "caption": "Này anh Minh, giữa **Haaland** và **Mbappe**, ai mới là **kế vị**?"
    },
    {
      "speaker": "guest",
      "tts": "Mbappe kỹ thuật và toàn diện [cười], nhưng nhìn vào hiệu suất ghi bàn của Haaland ở Ngoại hạng Anh... [nghỉ 1s] cậu ấy mới là cỗ máy săn bàn không thể cản phá!",
      "caption": "Mbappe toàn diện, nhưng **hiệu suất của Haaland** tại **Ngoại hạng Anh** là một **quái vật**!"
    }
  ],
  "keywordsToHighlight": ["Haaland", "Mbappe", "kế vị", "quái vật", "Ngoại hạng Anh"]
}`;

const SYSTEM_PROMPT_BROLL = `Bạn là một chuyên gia biên kịch video ngắn (Short-form Content Strategist & Storyteller) hàng đầu về chủ đề triết lý sống, tâm lý học hành vi, thói quen và phát triển bản thân sâu sắc (định dạng B-Roll Voiceover 9:16, thời lượng chuẩn 55 - 75 giây, khoảng 140 - 180 từ tiếng Việt).

NHIỆM VỤ CỦA BẠN:
Nhận chủ đề từ người dùng và xây dựng kịch bản video ngắn tối ưu hóa tuyệt đối cho khả năng THẨM THẤU (Digestibility) và TÍNH ỨNG DỤNG THỰC TẾ (Actionability), xóa bỏ hoàn toàn cảm giác "nói đạo lý sáo rỗng, trôi tuột, khó ngấm".

QUY TẮC VÀNG "4 KHÔNG" BẮT BUỘC:
1. KHÔNG rao giảng đạo lý sáo rỗng hay "toxic positivity" (những lời khuyên chung chung như "hãy buông bỏ", "hãy tích cực lên", "cuộc đời ngắn ngủi đừng giận hờn"...).
2. KHÔNG mở đầu bằng trích dẫn cổ điển xa vời ("Đức Phật dạy...", "Khổng Tử từng nói..."). Người xem sẽ lướt qua ngay. Mở đầu BẮT BUỘC PHẢI BẰNG ĐỜI SỐNG THỰC TẾ, CƠN ĐAU ĐỜI THƯỜNG.
3. KHÔNG dừng lại ở chữ "CÁI GÌ" (What) mà BẮT BUỘC phải trả lời chữ "LÀM THẾ NÀO" (How): Đưa ra bài tập/công thức 2-3 bước hành động cụ thể để người xem có thể áp dụng ngay trong ngày mai.
4. KHÔNG viết câu liền tù tì không ngừng nghỉ: BẮT BUỘC chèn các khoảng nghỉ chiến lược [nghỉ 0.8s], [nghỉ 1.0s], [nghỉ 1.2s] giữa các đoạn chuyển ý để tạo "vùng thở", giúp não bộ người nghe kịp ngẫm nghĩ và thẩm thấu.

QUY TẮC BẮT BUỘC VỀ THẺ CẢM XÚC & KHOẢNG NGHỈ (TTS EMOTION & PAUSE TAGS - VIENEU-TTS):
Để giọng đọc AI (VieNeu-TTS / CIT Voice Studio) phát ra sống động, có hồn và truyền cảm xúc chạm đáy tâm lý người nghe, bạn BẮT BUỘC phải lồng ghép đầy đủ các thẻ cảm xúc sau vào câu "voiceover" của từng phân đoạn:
- [thở dài]: BẮT BUỘC chèn ở những khoảnh khắc trăn trở, thấu suốt (ở Hook hoặc ở Phân đoạn 2 khi chạm vào sự thật trần trụi).
- [cười]: BẮT BUỘC chèn ở những đoạn mỉm cười nhẹ nhõm, tự trào, hoặc câu kết ấm áp, truyền cảm hứng (ví dụ: "Khi bạn buông tay [cười], cả thế giới lại thuộc về bạn...").
- [hắng giọng]: BẮT BUỘC chèn trước khi đưa ra đòn bẩy tư duy hoặc công thức hành động quan trọng (ví dụ: "[hắng giọng] Lần tới khi cơn uất ức bùng lên, hãy làm đúng 2 bước này...").
- [lấy hơi]: BẮT BUỘC chèn trước khi đúc kết câu nói quan trọng hoặc trước một bước hành động.
- [nghỉ 0.8s], [nghỉ 1.0s], [nghỉ 1.2s]: BẮT BUỘC chèn đều đặn giữa các vế câu quan trọng để tạo "vùng thở", giúp giọng đọc ngắt nhịp thong thả, đĩnh đạc và người nghe kịp ngấm.
* QUY TẮC VÀNG VỀ VỊ TRÍ TAG: BẮT BUỘC đặt thẻ ở ĐẦU CÂU hoặc GIỮA CÂU (ngay trước từ khóa trọng tâm). TUYỆT ĐỐI KHÔNG ĐẶT Ở ĐUÔI CÂU sau dấu chấm hoặc dấu chấm hỏi (Ví dụ ĐÚNG: 'Nhưng sự thật trần trụi là: hận thù giống như việc bạn tự uống độc dược [thở dài], rồi ngồi chờ kẻ thù đổ bệnh.' - KHÔNG VIẾT SAI: '...chờ kẻ thù đổ bệnh. [thở dài]').

CẤU TRÚC 4 CỘT BẮT BUỘC CHO MỖI PHÂN ĐOẠN (SECTIONS theo mô hình P-A-S-A 55-75s):
1. Phần / Thời gian (section, tagline):
   - Phân đoạn 1: "HOOK THỰC TẾ (0 - 8s)", tagline: "(Đánh thức trải nghiệm đời thực)" -> Đánh thẳng vào một tình huống trớ trêu, ấm ức đời thực. Chèn [thở dài] ở giữa câu và [nghỉ 1.0s].
   - Phân đoạn 2: "GIẢI MÃ TÂM LÝ (8 - 25s)", tagline: "(Bẻ gãy lầm tưởng)" -> Bẻ gãy lầm tưởng, chạm sự thật cốt lõi. Chèn [lấy hơi] hoặc [thở dài] ở giữa câu và [nghỉ 1.2s].
   - Phân đoạn 3: "CÔNG CỤ THỰC HÀNH (25 - 55s)", tagline: "(Quy tắc hành động cụ thể)" -> Bắt đầu bằng [hắng giọng] rồi đưa ra 1 CÔNG THỨC RÕ RÀNG gồm 2 hoặc 3 bước cụ thể.
   - Phân đoạn 4: "LẮNG ĐỌNG & DƯ ÂM (55 - 70s)", tagline: "(Đúc kết chạm cảm xúc)" -> Giọng đọc chậm lại, ấm áp, thong thả có [cười] ở giữa câu. Dùng [nghỉ 0.8s], [nghỉ 1.0s] giữa các từ khóa cuối cùng để tạo dư âm.

2. Nội dung Hiển thị trên màn hình (textTo, visual):
   - textTo: Câu text ngắn gọn, đắt giá, chữ to nổi bật trên khung hình.
   - visual: Mô tả chi tiết cảnh quay b-roll (kèm gợi ý từ khóa tiếng Anh Stock Keyword để người dùng dễ chọn footage).

3. Giọng đọc AI (voiceover):
   - Câu thuyết minh hoàn chỉnh, sâu sắc, ngữ điệu tự nhiên, từ ngữ đắt giá, có lồng ghép đầy đủ các thẻ cảm xúc [thở dài], [cười], [hắng giọng], [nghỉ 1.0s].

4. Âm thanh & Hiệu ứng (audioEffect):
   - Gợi ý SFX (tiếng chuông, đồng hồ tích tắc...) và nhạc nền BGM (nhạc piano, thiền, ambient chillout...).

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:
Chỉ trả về JSON thuần túy (RAW JSON), KHÔNG bọc trong markdown backticks:
{
  "title": "Tiêu đề video ngắn hấp dẫn (dưới 50 ký tự)",
  "voiceStyle": "Trầm ấm, chiêm nghiệm, nhịp đọc đĩnh đạc (speed: 0.92 - 0.95)",
  "sections": [
    {
      "section": "HOOK THỰC TẾ (0 - 8s)",
      "tagline": "(Đánh thức trải nghiệm đời thực)",
      "textTo": "Trằn trọc lúc 1 giờ sáng vì một câu nói?",
      "visual": "Cận cảnh người ngồi tựa đầu vào cửa sổ xe ban đêm, ánh đèn thành phố mờ ảo. (Stock: lonely night window rain city lights cinematic vertical)",
      "voiceover": "Đêm qua, bạn có nằm trằn trọc lúc một giờ sáng chỉ vì ấm ức một câu xúc phạm của ai đó không? [thở dài] [nghỉ 1.2s]",
      "audioEffect": "Tiếng đồng hồ tích tắc chậm rãi, hòa cùng tiếng thở dài trầm nhẹ ở giây đầu tiên."
    },
    {
      "section": "GIẢI MÃ TÂM LÝ (8 - 25s)",
      "tagline": "(Bẻ gãy lầm tưởng)",
      "textTo": "Kẻ làm bạn đau... đã ngủ say từ lâu rồi.",
      "visual": "Hình ảnh ngọn lửa bùng cháy dữ dội trong đêm, tàn tro bay lơ lửng slow-motion. (Stock: fire burning dark slow motion embers cinematic)",
      "voiceover": "Lý do bạn không thể buông bỏ sự tức giận, không phải vì bạn yếu đuối. [nghỉ 0.8s] Mà vì tiềm thức đang nhầm lẫn rằng: tha thứ đồng nghĩa với việc chấp nhận mình thua cuộc. [thở dài] Nhưng sự thật là: kẻ làm bạn tổn thương, họ đã ngủ say từ lâu rồi. Chỉ có bạn là đang tự giam mình trong ngục tối do chính họ tạo ra. [nghỉ 1.2s]",
      "audioEffect": "BGM tiếng piano trầm buồn bắt đầu cất lên da diết, âm lượng 15%."
    },
    {
      "section": "CÔNG CỤ THỰC HÀNH (25 - 55s)",
      "tagline": "(Quy tắc hành động cụ thể)",
      "textTo": "Quy tắc 2 bước để cởi trói cảm xúc",
      "visual": "Bàn tay mở ra buông rơi một nắm cát trong gió biển, chuyển sang cảnh bước chân điềm tĩnh dạo bước giữa rừng cây xanh mướt. (Stock: hand releasing sand slow motion zen forest walk)",
      "voiceover": "[hắng giọng] Lần tới khi cơn uất ức bùng lên, hãy làm đúng hai bước này: [nghỉ 0.8s] Bước một: Đừng cố tha thứ ngay. Hãy hít thật sâu và tự nhắc mình: 'Chuyện đã qua rồi, cảm xúc này chỉ là vị khách qua đường, nó không phải là tôi.' [nghỉ 0.8s] Bước hai: Tách con người ra khỏi hành vi. Họ cư xử tệ hại vì tâm hồn họ chứa đầy rác rưởi, điều đó phản chiếu con người họ, chứ không quyết định giá trị của bạn. [nghỉ 1.2s]",
      "audioEffect": "Tiếng chuông xoay Tây Tạng (Singing Bowl) ngân vang tĩnh tại, âm điệu piano trở nên trong trẻo, nhẹ nhõm."
    },
    {
      "section": "LẮNG ĐỌNG & DƯ ÂM (55 - 70s)",
      "tagline": "(Đúc kết chạm cảm xúc)",
      "textTo": "Buông bỏ... là tự do.",
      "visual": "Góc quay rộng mặt hồ phẳng lặng như gương lúc bình minh, ánh nắng sớm xuyên qua sương mờ. (Stock: calm lake sunrise silhouette peaceful 4k vertical)",
      "voiceover": "Buông bỏ... [nghỉ 0.8s] không phải là làm hòa với đối phương. [cười] Mà là trả lại tự do... [nghỉ 0.8s] cho chính bản thân mình. [nghỉ 1.0s] Hôm nay, bạn đã sẵn sàng bước ra khỏi cánh cửa ngục đó chưa?",
      "audioEffect": "Tiếng chuông ngân dài vang vọng rồi nhỏ dần vào tiếng gió thoảng thanh bình."
    }
  ]
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
    const isBroll = mode === "broll" || mode === "stock";
    const isRefinement = Boolean(refinePrompt && refinePrompt.trim() && currentScript);

    if (!isRefinement && (!idea || !idea.trim())) {
      return NextResponse.json(
        { error: isPodcast ? "Vui lòng nhập chủ đề thảo luận podcast" : (isBroll ? "Vui lòng nhập chủ đề video B-roll" : "Vui lòng nhập ý tưởng kịch bản so sánh") },
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

    const activeSystemPrompt = isBroll
      ? SYSTEM_PROMPT_BROLL
      : isPodcast
      ? SYSTEM_PROMPT_PODCAST
      : SYSTEM_PROMPT_COMPARE;

    // Xây dựng prompt phù hợp: Tạo mới hay Tinh chỉnh kịch bản cũ
    let promptText = "";
    if (isBroll) {
      if (isRefinement) {
        const curLines = Array.isArray(currentScript?.script)
          ? currentScript.script.map((s: string, idx: number) => `  Câu ${idx + 1}: "${s}"`).join("\n")
          : "";
        promptText = `BẠN ĐANG TRONG PHIÊN TINH CHỈNH KỊCH BẢN B-ROLL THUYẾT MINH.
Chủ đề: "${(idea || currentScript?.title || "Video B-Roll").trim()}"
KỊCH BẢN HIỆN TẠI:
${curLines}
YÊU CẦU TINH CHỈNH:
"${refinePrompt.trim()}"
Hãy điều chỉnh lại kịch bản, từ khóa gợi ý video stock và chỉ trả về RAW JSON.`;
      } else {
        promptText = `Chủ đề video ngắn thuyết minh B-Roll: "${idea.trim()}". Hãy viết kịch bản 6-9 câu hấp dẫn, kèm từ khóa gợi ý video stock và giọng đọc VieNeu phù hợp nhất theo chuẩn JSON.`;
      }
    } else if (isPodcast) {
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

    if (isBroll) {
      let sections: any[] = [];
      if (Array.isArray(parsedData.sections) && parsedData.sections.length > 0) {
        sections = parsedData.sections.map((sec: any) => {
          let sectionTitle = (sec.section || "PHÂN ĐOẠN").trim();
          if (sec.timing && !sectionTitle.includes("(")) {
            sectionTitle = `${sectionTitle} (${sec.timing.trim()})`;
          }
          let tagline = (sec.tagline || "").trim();
          if (tagline && !tagline.startsWith("(")) {
            tagline = `(${tagline})`;
          }
          return {
            section: sectionTitle,
            tagline: tagline,
            textTo: sec.textTo || "",
            visual: sec.visual || "",
            voiceover: (sec.voiceover || "").replace(/\*\*/g, "").replace(/<[^>]+>/g, "").trim(),
            audioEffect: sec.audioEffect || "",
          };
        });
      } else if (Array.isArray(parsedData.script) && parsedData.script.length > 0) {
        // Fallback nếu AI trả về dạng script lines
        sections = parsedData.script.map((line: any, idx: number) => ({
          section: idx === 0 ? "HOOK (0 - 4s)" : idx === parsedData.script.length - 1 ? "OUTRO & CTA (30 - 40s)" : `THÂN BÀI ${idx} (${idx * 8} - ${(idx + 1) * 8}s)`,
          tagline: idx === 0 ? "(Đòn bẩy tâm lý)" : idx === parsedData.script.length - 1 ? "(Đúc kết & Kêu gọi)" : "(Triết lý cốt lõi)",
          textTo: typeof line === "string" ? line.slice(0, 35) + "..." : "",
          visual: "Cảnh quay b-roll phù hợp với nội dung",
          voiceover: typeof line === "string" ? line : (line.tts || line.caption || ""),
          audioEffect: "Nhạc nền hòa quyện",
        }));
      }

      if (sections.length === 0) {
        throw new Error("Không tạo được bảng kịch bản chi tiết hợp lệ.");
      }

      const script = sections.map((s) => s.voiceover).filter(Boolean);

      return NextResponse.json({
        success: true,
        mode: "broll",
        data: {
          title: parsedData.title || (idea ? idea.slice(0, 45) : ""),
          voiceStyle: parsedData.voiceStyle || "Trầm ấm, chậm rãi, truyền cảm",
          sections,
          script,
        },
      });
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
