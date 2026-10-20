package com.pcstore.controller;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.ReviewLikeResponse;
import com.pcstore.exception.AppException;
import com.pcstore.service.ReviewSocialService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;

import jakarta.persistence.EntityManager;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

// Note: @WebServlet is omitted because ReviewServlet already maps to /api/customer/reviews/*
// and delegates /{reviewId}/like requests here. Duplicate servlet mappings to the same URL pattern
// cause Tomcat deployment to fail with IllegalArgumentException.
public class ReviewLikeServlet extends HttpServlet {
    // Kiểm tra đăng nhập, đường dẫn và body rỗng trước khi chuyển sang like hoặc bỏ like.
    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setHeader(
                "Cache-Control",
                "private, no-store"); // không lưu cache cho các request like/unlike
        try {
            if (SessionUtil.userId(request) == null) {
                throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            }
            String method = request.getMethod();
            if (!method.equals("PUT") && !method.equals("DELETE")) {
                response.setHeader("Allow", "PUT, DELETE, OPTIONS");
                throw new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ.");
            }
            reviewId(request.getPathInfo());
            if (request.getInputStream().read() != -1) {
                throw new AppException(400, "INVALID_JSON", "Like/unlike không nhận request body.");
            }
            super.service(request, response);
        } catch (AppException error) {
            JsonUtil.write(
                    response,
                    error.getStatus(),
                    Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) {
                getServletContext().log("Review like request failed", error);
            }
            JsonUtil.write(
                    response,
                    500,
                    Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý like lúc này."));
        }
    }

    // Ghi nhận lượt thích Review của khách hàng và trả tổng lượt thích mới.
    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            ReviewSocialService reviews = new ReviewSocialService(entityManager);
            int userId = SessionUtil.userId(request);
            int reviewId = reviewId(request.getPathInfo());
            ReviewLikeResponse result = reviews.like(userId, reviewId);
            JsonUtil.write(response, 200, result);
        }
    }

    // Bỏ lượt thích Review của khách hàng và trả tổng lượt thích còn lại.
    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            ReviewSocialService reviews = new ReviewSocialService(entityManager);
            int userId = SessionUtil.userId(request);
            int reviewId = reviewId(request.getPathInfo());
            ReviewLikeResponse result = reviews.unlike(userId, reviewId);
            JsonUtil.write(response, 200, result);
        }
    }

    // Lấy mã Review từ đường dẫn /{id}/like và kiểm tra ID là số nguyên dương.
    private static int reviewId(String path) {
        if (path == null || !path.matches("/[^/]+/like")) {
            throw new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
        }
        try {
            int id = Integer.parseInt(path.substring(1, path.length() - 5));
            if (id > 0) {
                return id;
            }
        } catch (NumberFormatException ignored) {
        }
        throw new AppException(400, "INVALID_ID", "Review ID phải là số nguyên dương.");
    }
}
