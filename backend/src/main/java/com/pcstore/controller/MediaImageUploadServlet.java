package com.pcstore.controller;

import com.pcstore.config.PersistenceManager;
import com.pcstore.exception.AppException;
import com.pcstore.service.CloudinaryImageStorage;
import com.pcstore.service.MediaImageService;
import com.pcstore.service.MediaUploadService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Arrays;
import java.util.Map;

/** Accepts one image as the raw request body; no user-supplied Cloudinary parameters. */
@WebServlet(name = "mediaImageUploadServlet", urlPatterns = "/api/customer/media/images")
public class MediaImageUploadServlet extends HttpServlet {
    private static final int MAX_BODY = 8_000_000;

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse res) throws IOException {
        res.setHeader("Cache-Control", "no-store");
        try {
            Integer userId = SessionUtil.userId(req);
            if (userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            String origin = req.getHeader("Origin");
            if (origin == null || origin.isBlank())
                throw new AppException(403, "ORIGIN_REQUIRED", "Thiếu Origin của yêu cầu upload.");
            if (!allowedOrigin(req, origin))
                throw new AppException(403, "ORIGIN_NOT_ALLOWED", "Origin không được phép.");
            String mimeType = req.getContentType();
            if (!"image/jpeg".equals(mimeType) && !"image/png".equals(mimeType))
                throw new AppException(415, "UNSUPPORTED_MEDIA_TYPE", "Chỉ hỗ trợ JPEG hoặc PNG.");
            if (req.getContentLengthLong() > MAX_BODY)
                throw new AppException(413, "MEDIA_TOO_LARGE", "Ảnh vượt giới hạn 8 MB.");
            byte[] input = req.getInputStream().readNBytes(MAX_BODY + 1);
            if (input.length > MAX_BODY)
                throw new AppException(413, "MEDIA_TOO_LARGE", "Ảnh vượt giới hạn 8 MB.");
            var storage = new CloudinaryImageStorage(required("CLOUDINARY_CLOUD_NAME"),
                    required("CLOUDINARY_API_KEY"), required("CLOUDINARY_API_SECRET"));
            var service = new MediaUploadService(PersistenceManager.get(), new MediaImageService(), storage);
            var result = service.upload(userId, req.getHeader("X-Media-Module"), input, mimeType);
            JsonUtil.write(res, 201, result);
        } catch (AppException error) {
            JsonUtil.write(res, error.getStatus(), Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) getServletContext().log("Media upload failed", error);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể tải ảnh lên lúc này."));
        }
    }

    static boolean allowedOrigin(HttpServletRequest req, String origin) {
        String scheme = req.getScheme();
        String server = req.getServerName();
        int port = req.getServerPort();
        if (scheme != null && server != null) {
            String local = scheme + "://" + server
                    + (("http".equals(scheme) && port == 80) || ("https".equals(scheme) && port == 443) ? "" : ":" + port);
            if (origin.equals(local)) return true;
        }
        return Arrays.stream(System.getenv().getOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(","))
                .map(String::trim).anyMatch(origin::equals);
    }

    static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException("Missing " + name);
        return value;
    }
}
