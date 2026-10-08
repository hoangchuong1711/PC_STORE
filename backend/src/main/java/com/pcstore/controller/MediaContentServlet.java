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
    @Override protected void doGet(HttpServletRequest req, HttpServletResponse res) throws IOException {
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        try {
            String path = req.getPathInfo();
            if (path == null || !path.matches("/[0-9a-fA-F-]{36}/content")) throw missing();
            UUID id;
            try { id = UUID.fromString(path.substring(1, 37)); }
            catch (IllegalArgumentException error) { throw missing(); }
            var media = new MediaAccessService(PersistenceManager.get()).resolve(id, SessionUtil.userId(req));
            if (!"image/jpeg".equals(media.mimeType()) && !"video/mp4".equals(media.mimeType())) throw missing();
            int maxBytes = "image/jpeg".equals(media.mimeType()) ? 1_000_000 : 4_000_000;
            byte[] content = new CloudinaryImageStorage(required("CLOUDINARY_CLOUD_NAME"),
                    required("CLOUDINARY_API_KEY"), required("CLOUDINARY_API_SECRET"))
                    .download(media.assetId(), maxBytes);
            res.setContentType(media.mimeType());
            res.setHeader("Accept-Ranges", "bytes");
            ByteRange range;
            try { range = parseRange(req.getHeader("Range"), content.length); }
            catch (IllegalArgumentException error) {
                res.setHeader("Content-Range", "bytes */" + content.length);
                res.setStatus(416);
                return;
            }
            if (range == null) {
                res.setContentLength(content.length);
                res.getOutputStream().write(content);
            } else {
                res.setStatus(206);
                res.setHeader("Content-Range", "bytes " + range.start + "-" + range.end + "/" + content.length);
                res.setContentLength(range.end - range.start + 1);
                res.getOutputStream().write(content, range.start, range.end - range.start + 1);
            }
        } catch (AppException error) {
            JsonUtil.write(res, error.getStatus(), Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) getServletContext().log("Media delivery failed", error);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể xem file lúc này."));
        }
    }

    record ByteRange(int start, int end) { }

    static ByteRange parseRange(String value, int size) {
        if (value == null) return null;
        if (size <= 0 || !value.matches("bytes=(\\d+-\\d*|-\\d+)")) throw new IllegalArgumentException();
        String[] parts = value.substring(6).split("-", -1);
        try {
            int start;
            int end;
            if (parts[0].isEmpty()) {
                long suffix = Long.parseLong(parts[1]);
                if (suffix <= 0) throw new IllegalArgumentException();
                start = (int) Math.max(0, size - suffix);
                end = size - 1;
            } else {
                long requestedStart = Long.parseLong(parts[0]);
                if (requestedStart >= size) throw new IllegalArgumentException();
                start = Math.toIntExact(requestedStart);
                end = parts[1].isEmpty() ? size - 1 : (int) Math.min(Long.parseLong(parts[1]), size - 1);
                if (end < start) throw new IllegalArgumentException();
            }
            return new ByteRange(start, end);
        } catch (NumberFormatException error) { throw new IllegalArgumentException(error); }
    }

    private static AppException missing() {
        return new AppException(404, "MEDIA_NOT_FOUND", "Không tìm thấy file.");
    }
    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException("Missing " + name);
        return value;
    }
}
