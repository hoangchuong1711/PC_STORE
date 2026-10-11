package com.pcstore.controller;

import com.pcstore.config.PersistenceManager;
import com.pcstore.exception.AppException;
import com.pcstore.service.ReviewSocialService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

@WebServlet(name = "reviewLikeServlet", urlPatterns = "/api/customer/reviews/*")
public class ReviewLikeServlet extends HttpServlet {
    @Override protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        res.setHeader("Cache-Control", "private, no-store");
        try {
            Integer userId = SessionUtil.userId(req);
            if (userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            String method = req.getMethod();
            if (!"PUT".equals(method) && !"DELETE".equals(method)) {
                res.setHeader("Allow", "PUT, DELETE, OPTIONS");
                throw new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ.");
            }
            int reviewId = reviewId(req.getPathInfo());
            if (req.getInputStream().read() != -1)
                throw new AppException(400, "INVALID_JSON", "Like/unlike không nhận request body.");
            try (var em = PersistenceManager.get().createEntityManager()) {
                var service = new ReviewSocialService(em);
                var result = "PUT".equals(method) ? service.like(userId, reviewId) : service.unlike(userId, reviewId);
                JsonUtil.write(res, 200, result);
            }
        } catch (AppException error) {
            JsonUtil.write(res, error.getStatus(), Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            getServletContext().log("Review like request failed", error);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý like lúc này."));
        }
    }

    private static int reviewId(String path) {
        if (path == null || !path.matches("/[^/]+/like"))
            throw new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
        try {
            int id = Integer.parseInt(path.substring(1, path.length() - 5));
            if (id > 0) return id;
        } catch (NumberFormatException ignored) { }
        throw new AppException(400, "INVALID_ID", "Review ID phải là số nguyên dương.");
    }
}
