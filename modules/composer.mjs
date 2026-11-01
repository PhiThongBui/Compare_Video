import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

/**
 * Chuẩn hoá đường dẫn file phụ đề cho bộ lọc subtitles của FFmpeg trên Windows
 */
function escapeFfmpegSubPath(filePath) {
  // Đổi backslash thành slash, escape dấu hai chấm của ổ đĩa (vd F: -> F\\:) và escape dấu ngoặc đơn
  const normalized = path.resolve(filePath).replace(/\\/g, "/");
  return normalized.replace(/:/g, "\\:").replace(/'/g, "\\'");
}

/**
 * Di chuyển file an toàn trên môi trường Windows
 * Xử lý triệt để lỗi EBUSY / EPERM khi Antivirus (Windows Defender) hoặc tiến trình khác
 * đang tạm thời khóa file MP4 ngay sau khi FFmpeg đóng handle.
 */
async function safeMoveFile(src, dest, maxRetries = 20, delayMs = 250) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (fs.existsSync(dest)) {
        try {
          fs.unlinkSync(dest);
        } catch {
          // Bỏ qua lỗi xóa tạm thời nếu file đang mở
        }
      }

      fs.renameSync(src, dest);
      return dest;
    } catch (err) {
      lastError = err;
      if (err.code === "EBUSY" || err.code === "EPERM" || err.code === "EACCES") {
        // Đợi Windows / Antivirus nhả handle rồi thử lại
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }

  // Nếu renameSync vẫn không thành công, thử copyFileSync + unlink
  try {
    fs.copyFileSync(src, dest);
    try {
      fs.unlinkSync(src);
    } catch {}
    return dest;
  } catch (copyErr) {
    // Trường hợp file đích bị khóa cứng (ví dụ trình phát video đang mở xem):
    // Tạo file mới có hậu tố timestamp để không bao giờ làm hỏng tiến trình render của user
    const ext = path.extname(dest);
    const base = path.basename(dest, ext);
    const altDest = path.join(
      path.dirname(dest),
      `${base}-${Date.now().toString().slice(-4)}${ext}`
    );
    try {
      fs.copyFileSync(src, altDest);
      try {
        fs.unlinkSync(src);
      } catch {}
      return altDest;
    } catch {}
    throw lastError || copyErr;
  }
}

/**
 * Trộn toàn bộ video nền, voiceover, nhạc nền BGM và đè phụ đề ASS chạy từng từ
 */
export async function composeFinalVideo({
  backgroundVideoPath,
  voiceAudioPath,
  assSubtitlesPath,
  finalOutputPath,
  duration,
  bgmPath = "",
  bgmVolume = 0.12,
  voiceVolume = 1.0,
  onProgress = () => {},
}) {
  const outDir = path.dirname(finalOutputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Tạm thời xuất ra file .tmp để tránh lỗi ghi đè dở dang
  const tempOutputMp4 = path.join(
    outDir,
    `.rendering-${Date.now()}-${path.basename(finalOutputPath)}`
  );

  const subFilterPath = escapeFfmpegSubPath(assSubtitlesPath);
  const totalDuration = Math.max(1, Number(duration) || 10);

  const hasBgm = bgmPath && fs.existsSync(bgmPath);

  const args = ["-y"];

  // Input 0: Video nền đã cắt ghép
  args.push("-i", backgroundVideoPath);

  // Input 1: Voiceover chính
  args.push("-i", voiceAudioPath);

  // Input 2: Nhạc nền BGM (nếu có)
  if (hasBgm) {
    args.push("-stream_loop", "-1", "-i", bgmPath);
  }

  // Bộ lọc Filter Complex
  const filterParts = [];

  // Chồng phụ đề ASS lên video nền
  filterParts.push(`[0:v]subtitles='${subFilterPath}'[outv]`);

  if (hasBgm) {
    // Trộn Voiceover và BGM (BGM được hạ nhỏ âm lượng và fade out êm đềm ở cuối clip tạo dư âm lắng đọng)
    const fadeStart = Math.max(0, totalDuration - 2.0).toFixed(2);
    filterParts.push(
      `[1:a]volume=${Number(voiceVolume).toFixed(2)}[vocal]`,
      `[2:a]volume=${Number(bgmVolume).toFixed(2)},afade=t=out:st=${fadeStart}:d=2.0[music]`,
      `[vocal][music]amix=inputs=2:duration=first:dropout_transition=2[outa]`
    );
  }

  args.push("-filter_complex", filterParts.join(";"));
  args.push("-map", "[outv]");

  if (hasBgm) {
    args.push("-map", "[outa]");
  } else {
    args.push("-map", "1:a");
  }

  // Thiết lập chuẩn nén tối ưu tương thích đa nền tảng (TikTok, Reels, Shorts)
  args.push(
    "-t", totalDuration.toString(),
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "19",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    tempOutputMp4
  );

  onProgress({
    stage: "rendering_start",
    message: `Bắt đầu render video MP4 hoàn chỉnh (${totalDuration}s)...`,
  });

  let resolvedOutputPath = finalOutputPath;

  await new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { windowsHide: true });
    let errorLog = "";

    const processLog = (chunk) => {
      const text = chunk.toString();
      errorLog += text;

      // Bắt tiến độ thời gian: time=00:00:12.34
      const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (timeMatch) {
        const currentTime =
          parseInt(timeMatch[1], 10) * 3600 +
          parseInt(timeMatch[2], 10) * 60 +
          parseFloat(timeMatch[3]);
        const percent = Math.min(99, Math.round((currentTime / totalDuration) * 100));

        onProgress({
          stage: "rendering_progress",
          percent,
          currentTime: Number(currentTime.toFixed(1)),
          totalDuration,
          message: `Đang render video: ${percent}% (${currentTime.toFixed(1)}s / ${totalDuration}s)`,
        });
      }
    };

    child.stderr.on("data", processLog);
    child.stdout.on("data", processLog);

    child.on("close", async (code) => {
      if (code === 0 && fs.existsSync(tempOutputMp4)) {
        try {
          // Delay nhỏ 150ms để Windows đóng hoàn toàn process handle
          await new Promise((r) => setTimeout(r, 150));

          resolvedOutputPath = await safeMoveFile(tempOutputMp4, finalOutputPath);

          const stat = fs.statSync(resolvedOutputPath);
          onProgress({
            stage: "rendering_done",
            percent: 100,
            outputPath: resolvedOutputPath,
            sizeBytes: stat.size,
            message: `Render video thành công! File xuất: ${path.basename(resolvedOutputPath)} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`,
          });
          resolve(resolvedOutputPath);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(
          new Error(
            `FFmpeg render thất bại (mã lỗi ${code}):\n${errorLog.slice(-600)}`
          )
        );
      }
    });

    child.on("error", reject);
  });

  const finalStat = fs.statSync(resolvedOutputPath);
  return {
    outputPath: resolvedOutputPath,
    sizeBytes: finalStat.size,
    duration: totalDuration,
  };
}

