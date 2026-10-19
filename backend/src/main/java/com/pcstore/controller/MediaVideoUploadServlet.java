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

/** Receives one short review video; ffprobe/ffmpeg validate it before Cloudinary sees any bytes. */
@WebServlet(name = "mediaVideoUploadServlet", urlPatterns = "/api/customer/media/videos")
public class MediaVideoUploadServlet extends HttpServlet {
    private static final int MAX_BODY = 20_000_000;

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
            if (!MediaImageUploadServlet.allowedOrigin(request, origin)) {
                throw new AppException(403, "ORIGIN_NOT_ALLOWED", "Origin không được phép.");
            }
            if (!"REVIEW".equals(request.getHeader("X-Media-Module"))) {
                throw new AppException(400, "INVALID_MEDIA_MODULE", "Video chỉ dành cho Review.");
            }
            String mime = request.getContentType();
            byte[] input = readUpload(request, mime);
            CloudinaryImageStorage storage =
                    new CloudinaryImageStorage(
                            MediaImageUploadServlet.required("CLOUDINARY_CLOUD_NAME"),
                            MediaImageUploadServlet.required("CLOUDINARY_API_KEY"),
                            MediaImageUploadServlet.required("CLOUDINARY_API_SECRET"));
            MediaUploadService.UploadResult result =
                    new MediaUploadService(
                                    PersistenceManager.get(), new MediaImageService(), storage)
                            .uploadVideo(userId, "REVIEW", input, mime);
            JsonUtil.write(response, 201, result);
        } catch (AppException error) {
            JsonUtil.write(
                    response,
                    error.getStatus(),
                    Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) {
                getServletContext().log("Media video upload failed", error);
            }
            JsonUtil.write(
                    response,
                    500,
                    Map.of(
                            "code",
                            "INTERNAL_ERROR",
                            "message",
                            "Không thể tải video lên lúc này."));
        }
    }

    private byte[] readUpload(HttpServletRequest request, String mime) throws IOException {
        if (!"video/mp4".equals(mime) && !"video/quicktime".equals(mime)) {
            throw new AppException(415, "UNSUPPORTED_MEDIA_TYPE", "Chỉ hỗ trợ MP4 hoặc MOV.");
        }
        if (request.getContentLengthLong() > MAX_BODY) {
            throw new AppException(413, "MEDIA_TOO_LARGE", "Video vượt giới hạn 20 MB.");
        }
        byte[] input = request.getInputStream().readNBytes(MAX_BODY + 1);
        if (input.length > MAX_BODY) {
            throw new AppException(413, "MEDIA_TOO_LARGE", "Video vượt giới hạn 20 MB.");
        }
        return input;
    }
}
