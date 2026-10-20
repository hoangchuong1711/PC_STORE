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

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse res) throws IOException {
        res.setHeader("Cache-Control", "no-store");
        try {
            Integer userId = SessionUtil.userId(req);
            if (userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            String origin = req.getHeader("Origin");
            if (origin == null || origin.isBlank())
                throw new AppException(403, "ORIGIN_REQUIRED", "Thiếu Origin của yêu cầu upload.");
            if (!MediaImageUploadServlet.allowedOrigin(req, origin))
                throw new AppException(403, "ORIGIN_NOT_ALLOWED", "Origin không được phép.");
            if (!"REVIEW".equals(req.getHeader("X-Media-Module")))
                throw new AppException(400, "INVALID_MEDIA_MODULE", "Video chỉ dành cho Review.");
            String mime = req.getContentType();
            if (!"video/mp4".equals(mime) && !"video/quicktime".equals(mime))
                throw new AppException(415, "UNSUPPORTED_MEDIA_TYPE", "Chỉ hỗ trợ MP4 hoặc MOV.");
            if (req.getContentLengthLong() > MAX_BODY)
                throw new AppException(413, "MEDIA_TOO_LARGE", "Video vượt giới hạn 20 MB.");
            byte[] input = req.getInputStream().readNBytes(MAX_BODY + 1);
            if (input.length > MAX_BODY)
                throw new AppException(413, "MEDIA_TOO_LARGE", "Video vượt giới hạn 20 MB.");
            var storage = new CloudinaryImageStorage(MediaImageUploadServlet.required("CLOUDINARY_CLOUD_NAME"),
                    MediaImageUploadServlet.required("CLOUDINARY_API_KEY"),
                    MediaImageUploadServlet.required("CLOUDINARY_API_SECRET"));
            var result = new MediaUploadService(PersistenceManager.get(), new MediaImageService(), storage)
                    .uploadVideo(userId, "REVIEW", input, mime);
            JsonUtil.write(res, 201, result);
        } catch (AppException error) {
            JsonUtil.write(res, error.getStatus(), Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) getServletContext().log("Media video upload failed", error);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể tải video lên lúc này."));
        }
    }
}
