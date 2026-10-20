package com.pcstore.controller;

import com.pcstore.config.PersistenceManager;
import com.pcstore.exception.AppException;
import com.pcstore.service.CloudinaryImageStorage;
import com.pcstore.service.MediaAccessService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/** All reads pass through current Setup/Review visibility checks. */
@WebServlet(name = "mediaContentServlet", urlPatterns = "/api/media/*")
public class MediaContentServlet extends HttpServlet {
    // Kiểm tra quyền xem file, tải nội dung từ Cloudinary rồi trả ảnh hoặc video cho trình duyệt.
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        response.setHeader("Cache-Control", "private, no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        try {
            String path = request.getPathInfo();
            if (path == null || !path.matches("/[0-9a-fA-F-]{36}/content")) {
                throw missing();
            }
            UUID id;
            try {
                id = UUID.fromString(path.substring(1, 37));
            } catch (IllegalArgumentException error) {
                throw missing();
            }
            MediaAccessService.AccessibleMedia media =
                    new MediaAccessService(PersistenceManager.get())
                            .resolve(id, SessionUtil.userId(request));
            String mimeType = media.mimeType();
            if (mimeType == null || (!mimeType.equals("image/jpeg") && !mimeType.equals("video/mp4"))) {
                throw missing();
            }
            int maxBytes = mimeType.equals("image/jpeg") ? 1_000_000 : 4_000_000;
            byte[] content =
                    new CloudinaryImageStorage(
                                    required("CLOUDINARY_CLOUD_NAME"),
                                    required("CLOUDINARY_API_KEY"),
                                    required("CLOUDINARY_API_SECRET"))
                            .download(media.assetId(), maxBytes);
            writeContent(request, response, mimeType, content);
        } catch (AppException error) {
            JsonUtil.write(
                    response,
                    error.getStatus(),
                    Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) {
                getServletContext().log("Media delivery failed", error);
            }
            JsonUtil.write(
                    response,
                    500,
                    Map.of("code", "INTERNAL_ERROR", "message", "Không thể xem file lúc này."));
        }
    }

    // Trả toàn bộ file hoặc một đoạn byte theo Range để hỗ trợ phát và tua video.
    private void writeContent(
            HttpServletRequest request,
            HttpServletResponse response,
            String mimeType,
            byte[] content)
            throws IOException {
        response.setContentType(mimeType);
        response.setHeader("Accept-Ranges", "bytes");
        ByteRange range;
        try {
            range = parseRange(request.getHeader("Range"), content.length);
        } catch (IllegalArgumentException error) {
            response.setHeader("Content-Range", "bytes */" + content.length);
            response.setStatus(416);
            return;
        }
        if (range == null) {
            response.setContentLength(content.length);
            response.getOutputStream().write(content);
        } else {
            response.setStatus(206);
            response.setHeader(
                    "Content-Range",
                    "bytes " + range.start + "-" + range.end + "/" + content.length);
            response.setContentLength(range.end - range.start + 1);
            response.getOutputStream().write(content, range.start, range.end - range.start + 1);
        }
    }

    record ByteRange(int start, int end) {}

    // Đọc khoảng byte trình duyệt yêu cầu, từ chối khoảng sai hoặc vượt vị trí bắt đầu hợp lệ.
    static ByteRange parseRange(String value, int size) {
        if (value == null) {
            return null;
        }
        if (size <= 0 || !value.matches("bytes=(\\d+-\\d*|-\\d+)")) {
            throw new IllegalArgumentException();
        }
        String[] parts = value.substring(6).split("-", -1);
        try {
            int start;
            int end;
            if (parts[0].isEmpty()) {
                long suffix = Long.parseLong(parts[1]);
                if (suffix <= 0) {
                    throw new IllegalArgumentException();
                }
                start = (int) Math.max(0, size - suffix);
                end = size - 1;
            } else {
                long requestedStart = Long.parseLong(parts[0]);
                if (requestedStart >= size) {
                    throw new IllegalArgumentException();
                }
                start = Math.toIntExact(requestedStart);
                end =
                        parts[1].isEmpty()
                                ? size - 1
                                : (int) Math.min(Long.parseLong(parts[1]), size - 1);
                if (end < start) {
                    throw new IllegalArgumentException();
                }
            }
            return new ByteRange(start, end);
        } catch (NumberFormatException error) {
            throw new IllegalArgumentException(error);
        }
    }

    // Tạo lỗi 404 khi file không tồn tại hoặc người xem không được phép truy cập.
    private static AppException missing() {
        return new AppException(404, "MEDIA_NOT_FOUND", "Không tìm thấy file.");
    }

    // Đọc biến môi trường Cloudinary bắt buộc; báo lỗi nếu thiếu cấu hình.
    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing " + name);
        }
        return value;
    }
}
