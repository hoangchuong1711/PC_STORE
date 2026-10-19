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
import java.util.Map;

/** Accepts one image as the raw request body; no user-supplied Cloudinary parameters. */
@WebServlet(name = "mediaImageUploadServlet", urlPatterns = "/api/customer/media/images")
public class MediaImageUploadServlet extends HttpServlet {
    private static final int MAX_BODY = 8_000_000;

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        response.setHeader("Cache-Control", "no-store");
        try {
            Integer userId = SessionUtil.userId(request);
            if (userId == null) {
                throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            }
            String origin = request.getHeader("Origin");
            if (origin == null || origin.isBlank()) {
                throw new AppException(403, "ORIGIN_REQUIRED", "Thiếu Origin của yêu cầu upload.");
            }
            if (!allowedOrigin(request, origin)) {
                throw new AppException(403, "ORIGIN_NOT_ALLOWED", "Origin không được phép.");
            }
            String mimeType = request.getContentType();
            byte[] input = readUpload(request, mimeType);
            CloudinaryImageStorage storage =
                    new CloudinaryImageStorage(
                            required("CLOUDINARY_CLOUD_NAME"),
                            required("CLOUDINARY_API_KEY"),
                            required("CLOUDINARY_API_SECRET"));
            MediaUploadService service =
                    new MediaUploadService(
                            PersistenceManager.get(), new MediaImageService(), storage);
            MediaUploadService.UploadResult result =
                    service.upload(userId, request.getHeader("X-Media-Module"), input, mimeType);
            JsonUtil.write(response, 201, result);
        } catch (AppException error) {
            JsonUtil.write(
                    response,
                    error.getStatus(),
                    Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) {
                getServletContext().log("Media upload failed", error);
            }
            JsonUtil.write(
                    response,
                    500,
                    Map.of("code", "INTERNAL_ERROR", "message", "Không thể tải ảnh lên lúc này."));
        }
    }

    private byte[] readUpload(HttpServletRequest request, String mimeType) throws IOException {
        if (!"image/jpeg".equals(mimeType) && !"image/png".equals(mimeType)) {
            throw new AppException(415, "UNSUPPORTED_MEDIA_TYPE", "Chỉ hỗ trợ JPEG hoặc PNG.");
        }
        if (request.getContentLengthLong() > MAX_BODY) {
            throw new AppException(413, "MEDIA_TOO_LARGE", "Ảnh vượt giới hạn 8 MB.");
        }
        byte[] input = request.getInputStream().readNBytes(MAX_BODY + 1);
        if (input.length > MAX_BODY) {
            throw new AppException(413, "MEDIA_TOO_LARGE", "Ảnh vượt giới hạn 8 MB.");
        }
        return input;
    }

    static boolean allowedOrigin(HttpServletRequest request, String origin) {
        String scheme = request.getScheme();
        String server = request.getServerName();
        int port = request.getServerPort();
        if (scheme != null && server != null) {
            String local = scheme + "://" + server;
            boolean defaultPort =
                    ("http".equals(scheme) && port == 80)
                            || ("https".equals(scheme) && port == 443);
            if (!defaultPort) {
                local += ":" + port;
            }
            if (origin.equals(local)) {
                return true;
            }
        }
        String configured =
                System.getenv().getOrDefault("CORS_ALLOWED_ORIGINS", "http://localhost:3000");
        for (String allowed : configured.split(",")) {
            if (origin.equals(allowed.trim())) {
                return true;
            }
        }
        return false;
    }

    static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing " + name);
        }
        return value;
    }
}
