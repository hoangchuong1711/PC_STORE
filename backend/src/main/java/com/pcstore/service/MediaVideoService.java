package com.pcstore.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.exception.AppException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

/** Probes actual streams, then transcodes short review videos to a bounded MP4. */
public final class MediaVideoService {
    private static final Semaphore TRANSCODES = new Semaphore(2);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_INPUT = 20_000_000;
    private static final int MAX_OUTPUT = 4_000_000;

    public record PreparedVideo(byte[] bytes, int width, int height, int durationSecond) {}

    public record VideoInfo(int width, int height, int durationSecond) {}

    // Kiểm tra video Review, dùng ffmpeg chuẩn hóa thành MP4 tối đa 4 MB và dọn file tạm.
    public PreparedVideo prepare(byte[] input, String claimedMimeType) {
        if (input == null || input.length == 0) {
            throw invalid();
        }
        if (input.length > MAX_INPUT) {
            throw new AppException(413, "MEDIA_TOO_LARGE", "Video vượt giới hạn 20 MB.");
        }
        if (claimedMimeType == null
                || (!claimedMimeType.equals("video/mp4") && !claimedMimeType.equals("video/quicktime"))) {
            throw invalid();
        }
        if (input.length < 12
                || input[4] != 'f'
                || input[5] != 't'
                || input[6] != 'y'
                || input[7] != 'p') {
            throw invalid();
        }
        if (!TRANSCODES.tryAcquire()) {
            throw new AppException(
                    429, "MEDIA_PROCESSING_BUSY", "Hệ thống đang xử lý video; thử lại sau.");
        }
        Path dir = null;
        try {
            dir = Files.createTempDirectory("pcstore-media-");
            Path source = dir.resolve("source");
            Path output = dir.resolve("normalized.mp4");
            Files.write(source, input);
            validateProbe(
                    run(
                            List.of(
                                    "ffprobe",
                                    "-v",
                                    "error",
                                    "-show_entries",
                                    "format=duration,format_name:stream=codec_name,codec_type,width,height,avg_frame_rate",
                                    "-of",
                                    "json",
                                    source.toString()),
                            dir.resolve("probe.log"),
                            15));
            run(
                    List.of(
                            "ffmpeg",
                            "-hide_banner",
                            "-loglevel",
                            "error",
                            "-nostdin",
                            "-y",
                            "-i",
                            source.toString(),
                            "-map",
                            "0:v:0",
                            "-map",
                            "0:a:0?",
                            "-map_metadata",
                            "-1",
                            "-map_chapters",
                            "-1",
                            "-t",
                            "9.9",
                            "-vf",
                            "scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p",
                            "-c:v",
                            "libx264",
                            "-preset",
                            "veryfast",
                            "-crf",
                            "29",
                            "-maxrate",
                            "2M",
                            "-bufsize",
                            "4M",
                            "-threads",
                            "2",
                            "-c:a",
                            "aac",
                            "-b:a",
                            "96k",
                            "-movflags",
                            "+faststart",
                            output.toString()),
                    dir.resolve("transcode.log"),
                    60);
            if (Files.size(output) == 0 || Files.size(output) > MAX_OUTPUT) {
                throw new AppException(
                        413, "MEDIA_TOO_LARGE", "Video sau xử lý vượt giới hạn 4 MB.");
            }
            VideoInfo normalized =
                    validateProbe(
                            run(
                                    List.of(
                                            "ffprobe",
                                            "-v",
                                            "error",
                                            "-show_entries",
                                            "format=duration,format_name:stream=codec_name,codec_type,width,height,avg_frame_rate",
                                            "-of",
                                            "json",
                                            output.toString()),
                                    dir.resolve("result.log"),
                                    15));
            return new PreparedVideo(
                    Files.readAllBytes(output),
                    normalized.width(),
                    normalized.height(),
                    normalized.durationSecond());
        } catch (IOException error) {
            throw new AppException(
                    503, "MEDIA_PROCESSING_UNAVAILABLE", "Không thể xử lý video lúc này.", error);
        } finally {
            if (dir != null) {
                deleteTemporaryFiles(dir);
            }
            TRANSCODES.release();
        }
    }

    // Xóa file và thư mục tạm của lần xử lý video; lỗi dọn không thay thế kết quả xử lý.
    private static void deleteTemporaryFiles(Path directory) {
        try (Stream<Path> paths = Files.walk(directory)) {
            // Xóa file con trước, rồi mới xóa thư mục tạm của lần xử lý này.
            List<Path> files = paths.sorted(Comparator.reverseOrder()).toList();
            for (Path file : files) {
                try {
                    Files.deleteIfExists(file);
                } catch (IOException ignored) {
                    // Lỗi dọn file không thay thế kết quả xử lý video.
                }
            }
        } catch (IOException ignored) {
            // Vẫn trả semaphore cho request kế tiếp khi không đọc được thư mục tạm.
        }
    }

    // Đọc kết quả ffprobe để kiểm tra định dạng, codec, kích thước, tốc độ khung hình và giới hạn 10 giây.
    static VideoInfo validateProbe(String output) {
        try {
            JsonNode root = JSON.readTree(output);
            JsonNode format = root.path("format");
            if (!format.path("format_name").asText().contains("mp4")
                    && !format.path("format_name").asText().contains("mov")) {
                throw invalid();
            }
            double seconds = Double.parseDouble(format.path("duration").asText());
            if (!Double.isFinite(seconds) || seconds <= 0) {
                throw invalid();
            }
            if (seconds > 10.0) {
                throw new AppException(422, "MEDIA_VIDEO_DURATION", "Video dài hơn 10 giây.");
            }
            int videoCount = 0;
            int audioCount = 0;
            int width = 0;
            int height = 0;
            for (JsonNode stream : root.path("streams")) {
                switch (stream.path("codec_type").asText()) {
                    case "video" -> {
                        videoCount++;
                        if (!stream.path("codec_name").asText().equals("h264")) {
                            throw invalid();
                        }
                        width = stream.path("width").asInt();
                        height = stream.path("height").asInt();
                        String[] fps = stream.path("avg_frame_rate").asText("0/1").split("/");
                        double rate = Double.parseDouble(fps[0]) / Double.parseDouble(fps[1]);
                        if (!Double.isFinite(rate) || rate <= 0 || rate > 60) {
                            throw invalid();
                        }
                    }
                    case "audio" -> {
                        audioCount++;
                        if (!stream.path("codec_name").asText().equals("aac")) {
                            throw invalid();
                        }
                    }
                    default -> throw invalid();
                }
            }
            if (videoCount != 1
                    || audioCount > 1
                    || width <= 0
                    || height <= 0
                    || width > 1920
                    || height > 1920
                    || (long) width * height > 2_100_000L) {
                throw invalid();
            }
            return new VideoInfo(width, height, (int) Math.ceil(seconds));
        } catch (AppException error) {
            throw error;
        } catch (Exception error) {
            throw invalid();
        }
    }

    // Chạy ffprobe hoặc ffmpeg với thời hạn, kiểm tra mã thoát rồi đọc kết quả từ file log.
    private static String run(List<String> command, Path log, int seconds) throws IOException {
        Process process =
                new ProcessBuilder(command)
                        .redirectErrorStream(true)
                        .redirectOutput(log.toFile())
                        .start();
        try {
            if (!process.waitFor(seconds, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new AppException(
                        503, "MEDIA_PROCESSING_TIMEOUT", "Xử lý video quá thời gian.");
            }
        } catch (InterruptedException error) {
            process.destroyForcibly();
            Thread.currentThread().interrupt();
            throw new AppException(503, "MEDIA_PROCESSING_TIMEOUT", "Xử lý video bị gián đoạn.");
        }
        if (process.exitValue() != 0) {
            throw invalid();
        }
        if (Files.size(log) > 100_000) {
            throw invalid();
        }
        return Files.readString(log);
    }

    // Tạo lỗi 400 khi video không đúng định dạng MP4/MOV với H.264 và AAC được hỗ trợ.
    private static AppException invalid() {
        return new AppException(400, "INVALID_MEDIA", "Video phải là MP4/MOV H.264 và AAC hợp lệ.");
    }
}
