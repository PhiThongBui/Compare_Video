import fs from "node:fs";
import path from "node:path";
import { spawnSync, spawn } from "node:child_process";

/**
 * Lấy thời lượng của video bằng ffprobe
 */
export function probeVideoDuration(videoPath) {
  try {
    const probe = spawnSync(
      "ffprobe",
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        videoPath,
      ],
      { encoding: "utf8", windowsHide: true }
    );
    if (probe.status === 0) {
      const dur = parseFloat(probe.stdout.trim());
      if (!isNaN(dur) && dur > 0) return dur;
    }
  } catch {}
  return 5.0; // Fallback an toàn nếu không probe được
}

/**
 * Tìm tất cả các file video hợp lệ từ một thư mục hoặc danh sách file
 */
export function resolveVideoFiles(sources) {
  const validExts = [".mp4", ".mov", ".webm", ".mkv", ".m4v"];
  const videoFiles = [];

  if (typeof sources === "string") {
    const resolvedPath = path.resolve(sources);
    if (fs.existsSync(resolvedPath)) {
      const stat = fs.statSync(resolvedPath);
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(resolvedPath);
        for (const entry of entries) {
          const fullPath = path.join(resolvedPath, entry);
          if (validExts.includes(path.extname(entry).toLowerCase())) {
            videoFiles.push(fullPath);
          }
        }
      } else if (validExts.includes(path.extname(resolvedPath).toLowerCase())) {
        videoFiles.push(resolvedPath);
      }
    }
  } else if (Array.isArray(sources)) {
    for (const src of sources) {
      if (typeof src === "string") {
        const resolvedPath = path.resolve(src);
        if (fs.existsSync(resolvedPath) && validExts.includes(path.extname(resolvedPath).toLowerCase())) {
          videoFiles.push(resolvedPath);
        }
      }
    }
  }

  return videoFiles;
}

/**
 * Xử lý cắt ghép hoặc loop các video stock 9:16 sao cho vừa khít targetDuration
 */
export async function stitchBackgroundVideo({
  videoSources,
  targetDuration,
  outputPath,
  width = 1080,
  height = 1920,
  fps = 30,
  shotDuration = 3.8, // Thời lượng mỗi đoạn cắt b-roll (giây)
  onProgress = () => {},
}) {
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const durationNeeded = Math.max(1, Number(targetDuration) || 10);
  const foundVideos = resolveVideoFiles(videoSources);

  onProgress({
    stage: "probing",
    message: `Đã tìm thấy ${foundVideos.length} video stock từ máy tính. Cần chuẩn bị video nền ${durationNeeded}s...`,
  });

  // Trường hợp 0: Không có video nào được cung cấp -> Tạo video nền gradient dự phòng
  if (foundVideos.length === 0) {
    onProgress({
      stage: "fallback_background",
      message: "Không tìm thấy file video stock, đang tạo nền gradient thể thao chuyển động...",
    });

    const filter = `color=c=#0B1F17:s=${width}x${height}:d=${durationNeeded},fps=${fps},format=yuv420p`;
    await runFfmpeg([
      "-y",
      "-f", "lavfi",
      "-i", filter,
      "-t", durationNeeded.toString(),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-an",
      outputPath,
    ]);

    return { outputPath, duration: durationNeeded, videoCount: 0 };
  }

  // Trường hợp 1: Chỉ có 1 file video stock duy nhất
  if (foundVideos.length === 1) {
    const singleVideo = foundVideos[0];
    const singleDur = probeVideoDuration(singleVideo);

    onProgress({
      stage: "single_video",
      message: `Đang xử lý 1 video stock (${singleDur.toFixed(1)}s): tự động crop 9:16 và loop/cắt khớp ${durationNeeded}s...`,
    });

    const scaleCropFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p`;

    // Nếu video gốc ngắn hơn thời lượng cần -> loop vô hạn rồi cắt đúng durationNeeded
    // Nếu video gốc dài hơn -> cắt trực tiếp đúng durationNeeded
    const args = ["-y"];
    if (singleDur < durationNeeded) {
      args.push("-stream_loop", "-1");
    }
    args.push("-i", singleVideo);
    args.push("-t", durationNeeded.toString());
    args.push("-vf", scaleCropFilter);
    args.push("-c:v", "libx264");
    args.push("-preset", "veryfast");
    args.push("-pix_fmt", "yuv420p");
    args.push("-an");
    args.push(outputPath);

    await runFfmpeg(args);
    return { outputPath, duration: durationNeeded, videoCount: 1 };
  }

  // Trường hợp 2: Có nhiều file video stock -> Cắt ghép theo nhịp shotDuration (3-4 giây/shot)
  onProgress({
    stage: "multi_video_stitching",
    message: `Đang cắt và ghép ${foundVideos.length} clip video stock theo nhịp chuyển cảnh để đạt ${durationNeeded}s...`,
  });

  // Lập kế hoạch các phân đoạn (segments)
  const segments = [];
  let remainingTime = durationNeeded;
  let videoIndex = 0;

  while (remainingTime > 0.05) {
    const currentVideo = foundVideos[videoIndex % foundVideos.length];
    const clipDuration = probeVideoDuration(currentVideo);

    const segmentDuration = Math.min(remainingTime, Math.max(2.0, shotDuration));
    // Tránh cắt vượt quá độ dài clip thật
    const maxStart = Math.max(0, clipDuration - segmentDuration);
    // Chọn điểm bắt đầu ngẫu nhiên hoặc trượt nhẹ nếu clip dài
    const startOffset = Math.min(maxStart, (videoIndex * 1.5) % Math.max(1, maxStart));

    segments.push({
      file: currentVideo,
      start: Number(startOffset.toFixed(2)),
      duration: Number(segmentDuration.toFixed(2)),
    });

    remainingTime -= segmentDuration;
    videoIndex++;
  }

  // Tạo concat filter complex trong FFmpeg
  // Từng input được trim, scale, crop về đúng 1080x1920 rồi concat lại
  const ffmpegArgs = ["-y"];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    ffmpegArgs.push("-ss", seg.start.toString(), "-t", seg.duration.toString(), "-i", seg.file);
  }

  const filterParts = [];
  const concatInputs = [];

  for (let i = 0; i < segments.length; i++) {
    const label = `v${i}`;
    filterParts.push(
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p[${label}]`
    );
    concatInputs.push(`[${label}]`);
  }

  filterParts.push(
    `${concatInputs.join("")}concat=n=${segments.length}:v=1:a=0[outv]`
  );

  ffmpegArgs.push("-filter_complex", filterParts.join(";"));
  ffmpegArgs.push("-map", "[outv]");
  ffmpegArgs.push("-t", durationNeeded.toString());
  ffmpegArgs.push("-c:v", "libx264");
  ffmpegArgs.push("-preset", "veryfast");
  ffmpegArgs.push("-pix_fmt", "yuv420p");
  ffmpegArgs.push("-an");
  ffmpegArgs.push(outputPath);

  await runFfmpeg(ffmpegArgs);

  onProgress({
    stage: "stitching_done",
    message: `Đã ghép hoàn tất ${segments.length} đoạn video nền với độ dài chuẩn xác ${durationNeeded}s!`,
  });

  return {
    outputPath,
    duration: durationNeeded,
    videoCount: foundVideos.length,
    segmentsCount: segments.length,
  };
}

/**
 * Chạy lệnh FFmpeg dạng Promise kèm xử lý lỗi
 */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { windowsHide: true });
    let errorLog = "";

    child.stderr.on("data", (chunk) => {
      errorLog += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg thất bại (mã lỗi ${code}):\n${errorLog.slice(-500)}`));
      }
    });

    child.on("error", reject);
  });
}

