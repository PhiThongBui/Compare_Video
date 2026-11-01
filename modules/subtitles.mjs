import fs from "node:fs";
import path from "node:path";

/**
 * Chuyển đổi mã màu hex (#RRGGBB) sang định dạng màu ASS (&HAABBGGRR&)
 */
export function hexToAssColor(hex = "#FFFFFF", alpha = "00") {
  const cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length !== 6) return `&H${alpha}FFFFFF&`;
  const r = cleanHex.slice(0, 2);
  const g = cleanHex.slice(2, 4);
  const b = cleanHex.slice(4, 6);
  return `&H${alpha}${b}${g}${r}&`;
}

/**
 * Format số giây thành mốc thời gian chuẩn ASS (H:MM:SS.cs)
 */
export function formatAssTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const centis = Math.floor((s - Math.floor(s)) * 100);

  const hh = hrs.toString();
  const mm = mins.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");
  const cc = centis.toString().padStart(2, "0");

  return `${hh}:${mm}:${ss}.${cc}`;
}

/**
 * Gom các từ thành các cụm hiển thị (display chunks) từ 3 - 5 từ
 * để phụ đề hiển thị gọn gàng, không tràn màn hình dọc 9:16
 */
export function groupWordsIntoChunks(words, maxWordsPerChunk = 4) {
  if (!Array.isArray(words) || words.length === 0) return [];

  const chunks = [];
  let currentChunk = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentChunk.push(w);

    const isLastInCue = i === words.length - 1 || words[i + 1].cueIndex !== w.cueIndex;
    const hasPunctuation = /[,.!?…;:—]$/.test(w.word);

    if (currentChunk.length >= maxWordsPerChunk || (hasPunctuation && currentChunk.length >= 2) || isLastInCue) {
      chunks.push({
        words: [...currentChunk],
        start: currentChunk[0].start,
        end: currentChunk[currentChunk.length - 1].end,
      });
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({
      words: [...currentChunk],
      start: currentChunk[0].start,
      end: currentChunk[currentChunk.length - 1].end,
    });
  }

  return chunks;
}

/**
 * Tạo file phụ đề ASS có hiệu ứng Highlight mượt mà, triệt tiêu hiện tượng giật chữ, chớp nháy
 * Hỗ trợ các kiểu animation:
 * - "smooth" (mặc định): Bloom màu mềm mại + nảy nhẹ trục dọc + chữ trước crossfade êm ái + cố định trục ngang
 * - "bounce": Nảy đàn hồi trục dọc sinh động
 * - "glow": Tỏa sáng viền khi đọc
 * - "karaoke": Quét màu từ trái qua phải mượt mà chuẩn ASS \kf
 * - "classic": Đổi màu tức thì nhưng nối liền mạch không chớp đen
 */
export function generateAssSubtitles({
  words,
  outputPath,
  fontName = "Montserrat",
  fontSize = 72,
  baseColor = "#FFF8E7",        // Màu chữ thường (trắng hoặc vàng kem dịu mắt)
  highlightColor = "#FFD200",   // Màu từ đang nói (vàng kim rực rỡ)
  outlineColor = "#000000",     // Màu viền đen dày tương phản cao
  outlineWidth = 6,             // Độ dày viền đen
  shadow = 2,
  position = "center",          // "center" | "middle-bottom" | "bottom"
  wordsPerChunk = 4,
  animation = "smooth",         // "smooth" | "bounce" | "glow" | "karaoke" | "classic"
}) {
  const assBaseColor = hexToAssColor(baseColor);
  const assHighlightColor = hexToAssColor(highlightColor);
  const assOutlineColor = hexToAssColor(outlineColor);

  // Vị trí hiển thị trên khung hình dọc 1080x1920:
  // Alignment 5 = chính giữa tâm màn hình (X: 540, Y: 960)
  // Alignment 2 = căn giữa dưới, với MarginV cao để đặt ở vùng 2/3 màn hình
  let alignment = 5;
  let marginV = 0;
  if (position === "middle-bottom") {
    alignment = 2;
    marginV = 680;
  } else if (position === "bottom") {
    alignment = 2;
    marginV = 280;
  }

  const chunks = groupWordsIntoChunks(words, wordsPerChunk);
  const dialogueLines = [];

  if (animation === "karaoke") {
    // CHẾ ĐỘ KARAOKE: Quét màu mượt từ trái sang phải theo từng từ chuẩn ASS \kf
    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunk = chunks[cIdx];
      const chunkWords = chunk.words;
      const nextChunk = chunks[cIdx + 1];

      const chunkStart = chunkWords[0].start;
      const lastWord = chunkWords[chunkWords.length - 1];
      const maxLinger = lastWord.end + 0.35;
      const chunkEnd = nextChunk && nextChunk.words.length > 0
        ? Math.min(maxLinger, nextChunk.words[0].start)
        : maxLinger;

      let karaokeText = "";
      let prevTime = chunkStart;

      for (let i = 0; i < chunkWords.length; i++) {
        const w = chunkWords[i];
        const cleanWord = (w.word || "").replace(/[{}]/g, "");
        const gapSec = w.start - prevTime;
        if (gapSec > 0.05) {
          const gapCs = Math.round(gapSec * 100);
          karaokeText += `{\\k${gapCs}}`;
        }
        const durCs = Math.max(1, Math.round((w.end - w.start) * 100));
        karaokeText += `{\\kf${durCs}}${cleanWord} `;
        prevTime = w.end;
      }

      dialogueLines.push(
        `Dialogue: 0,${formatAssTime(chunkStart)},${formatAssTime(chunkEnd)},KaraokeStyle,,0,0,0,,{\\fad(80,80)}${karaokeText.trim()}`
      );
    }
  } else {
    // CHẾ ĐỘ WORD HIGHLIGHT (Smooth Bloom / Bounce / Glow / Classic):
    // Khắc phục hoàn toàn 2 lỗi giật cục:
    // 1. Không để khoảng trống thời gian giữa các từ (nối liền mạch từ này sang từ tiếp theo -> hết chớp đen)
    // 2. Không thay đổi độ rộng ký tự ngang (\fscx) -> trục ngang của câu đứng yên tuyệt đối, không rung lắc
    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunk = chunks[cIdx];
      const chunkWords = chunk.words;
      const nextChunk = chunks[cIdx + 1];

      for (let activeIdx = 0; activeIdx < chunkWords.length; activeIdx++) {
        const activeWord = chunkWords[activeIdx];
        const isFirst = activeIdx === 0;
        const isLast = activeIdx === chunkWords.length - 1;

        // Bắt đầu chính xác khi từ được phát âm
        const startSec = activeWord.start;

        // Nối liền mạch với từ kế tiếp (loại bỏ gap đen nhấp nháy)
        let endSec;
        if (!isLast) {
          endSec = chunkWords[activeIdx + 1].start;
        } else {
          // Từ cuối cụm: giữ lại thêm 0.35s cho người xem đọc trọn vẹn câu
          const maxLinger = activeWord.end + 0.35;
          if (nextChunk && nextChunk.words.length > 0) {
            endSec = Math.min(maxLinger, nextChunk.words[0].start);
          } else {
            endSec = maxLinger;
          }
        }

        if (endSec <= startSec) {
          endSec = startSec + 0.1;
        }

        const lineStart = formatAssTime(startSec);
        const lineEnd = formatAssTime(endSec);

        // Hiệu ứng Fade êm dịu khi cụm câu xuất hiện và biến mất
        let fadeTag = "";
        if (isFirst && isLast) {
          fadeTag = "{\\fad(80,80)}";
        } else if (isFirst) {
          fadeTag = "{\\fad(80,0)}";
        } else if (isLast) {
          fadeTag = "{\\fad(0,80)}";
        }

        // Định dạng từng từ trong cụm:
        const formattedWords = chunkWords.map((item, idx) => {
          const cleanWord = (item.word || "").replace(/[{}]/g, "");

          if (idx === activeIdx) {
            if (animation === "bounce") {
              // Nảy đàn hồi trục dọc (fscy) không làm lệch tâm ngang
              return `{\\c${assBaseColor}\\t(0,80,\\c${assHighlightColor}\\fscy112)\\t(80,160,\\fscy100)\\b1}${cleanWord}{\\r}`;
            }
            if (animation === "glow") {
              // Tỏa sáng viền rực rỡ
              return `{\\c${assBaseColor}\\t(0,80,\\c${assHighlightColor}\\3c${assHighlightColor}\\bord${outlineWidth + 3})\\t(80,160,\\3c${assOutlineColor}\\bord${outlineWidth})\\b1}${cleanWord}{\\r}`;
            }
            if (animation === "classic") {
              // Đổi màu trực tiếp
              return `{\\c${assHighlightColor}\\b1}${cleanWord}{\\r}`;
            }
            // Mặc định "smooth": Bloom màu êm ái trong 80ms + nảy nhẹ trục dọc 8%
            return `{\\c${assBaseColor}\\t(0,80,\\c${assHighlightColor}\\fscy108)\\t(80,160,\\fscy100)\\b1}${cleanWord}{\\r}`;
          } else if (idx === activeIdx - 1 && animation === "smooth") {
            // Từ vừa nói xong: hòa sắc dịu dàng từ màu highlight trở về màu chữ thường (80ms)
            return `{\\c${assHighlightColor}\\t(0,80,\\c${assBaseColor})\\b1}${cleanWord}{\\r}`;
          } else {
            // Các từ khác: giữ màu thường ổn định
            return `{\\c${assBaseColor}\\b1}${cleanWord}{\\r}`;
          }
        });

        const lineText = `${fadeTag}${formattedWords.join(" ")}`;
        dialogueLines.push(
          `Dialogue: 0,${lineStart},${lineEnd},Default,,0,0,0,,${lineText}`
        );
      }
    }
  }

  const assContent = [
    "[Script Info]",
    "Title: Word-by-Word Smooth Highlight Subtitles",
    "ScriptType: v4.00+",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.709",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${fontName},${fontSize},${assBaseColor},${assHighlightColor},${assOutlineColor},&H80000000,1,0,0,0,100,100,0,0,1,${outlineWidth},${shadow},${alignment},40,40,${marginV},1`,
    `Style: KaraokeStyle,${fontName},${fontSize},${assHighlightColor},${assBaseColor},${assOutlineColor},&H80000000,1,0,0,0,100,100,0,0,1,${outlineWidth},${shadow},${alignment},40,40,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...dialogueLines,
  ].join("\n");

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, assContent, "utf8");

  return {
    assPath: outputPath,
    totalLines: dialogueLines.length,
    chunksCount: chunks.length,
  };
}
