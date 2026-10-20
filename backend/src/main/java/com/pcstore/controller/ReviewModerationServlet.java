package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.cfg.CoercionAction;
import com.fasterxml.jackson.databind.cfg.CoercionInputShape;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.type.LogicalType;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.ModerateReviewRequest;
import com.pcstore.dto.ReviewModerationResponse;
import com.pcstore.exception.AppException;
import com.pcstore.service.ReviewSocialService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;

import jakarta.persistence.EntityManager;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

@WebServlet(name = "reviewModerationServlet", urlPatterns = "/api/admin/reviews/*")
public class ReviewModerationServlet extends HttpServlet {
    private final ObjectMapper mapper =
            JsonMapper.builder()
                    .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .build();

    // Cấu hình đọc JSON để lý do kiểm duyệt phải là chuỗi, không tự đổi từ số hay boolean.
    public ReviewModerationServlet() {
        // Jackson's String deserializer otherwise converts 1/true into reason text.
        mapper.coercionConfigFor(LogicalType.Textual)
                .setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
                .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
                .setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail);
    }

    // Kiểm tra đăng nhập, điều phối xem danh sách hoặc PATCH kiểm duyệt và trả lỗi JSON.
    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setHeader("Cache-Control", "private, no-store");
        try {
            if (SessionUtil.userId(request) == null) {
                throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            }
            String method = request.getMethod();
            String path = request.getPathInfo();
            if (method.equals("GET") && (path == null || path.equals("/"))) {
                super.service(request, response);
            } else if (method.equals("PATCH")) {
                moderateReview(request, response);
            } else {
                response.setHeader("Allow", "GET, PATCH, OPTIONS");
                throw new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ.");
            }
        } catch (AppException error) {
            JsonUtil.write(
                    response,
                    error.getStatus(),
                    Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) {
                getServletContext().log("Review moderation request failed", error);
            }
            JsonUtil.write(
                    response,
                    500,
                    Map.of(
                            "code",
                            "INTERNAL_ERROR",
                            "message",
                            "Không thể kiểm duyệt review lúc này."));
        }
    }

    // Trả danh sách Review cho trang quản trị sau khi service kiểm tra quyền admin.
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            ReviewSocialService reviews = new ReviewSocialService(entityManager);
            int userId = SessionUtil.userId(request);
            JsonUtil.write(response, 200, reviews.listAllForAdmin(userId));
        }
    }

    // Đọc mã Review và JSON kiểm duyệt rồi yêu cầu service ẩn hoặc công khai bài.
    private void moderateReview(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        int userId = SessionUtil.userId(request);
        int reviewId = reviewId(request.getPathInfo());
        ModerateReviewRequest body = readRequest(request);
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            ReviewSocialService reviews = new ReviewSocialService(entityManager);
            ReviewModerationResponse result = reviews.moderate(userId, reviewId, body);
            JsonUtil.write(response, 200, result);
        }
    }

    // Đọc trạng thái và lý do kiểm duyệt từ JSON; báo lỗi nếu JSON sai cấu trúc.
    private ModerateReviewRequest readRequest(HttpServletRequest request) {
        try {
            ModerateReviewRequest body =
                    mapper.readValue(request.getInputStream(), ModerateReviewRequest.class);
            if (body == null) {
                throw new IOException("Null request");
            }
            return body;
        } catch (IOException error) {
            throw new AppException(400, "INVALID_JSON", "JSON kiểm duyệt không đúng cấu trúc.");
        }
    }

    // Lấy mã Review từ đường dẫn /{id}/moderation và kiểm tra ID hợp lệ.
    private static int reviewId(String path) {
        if (path == null || !path.matches("/[^/]+/moderation")) {
            throw new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
        }
        try {
            int id = Integer.parseInt(path.substring(1, path.length() - 11));
            if (id > 0) {
                return id;
            }
        } catch (NumberFormatException ignored) {
        }
        throw new AppException(400, "INVALID_ID", "Review ID phải là số nguyên dương.");
    }
}
