package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.cfg.CoercionAction;
import com.fasterxml.jackson.databind.cfg.CoercionInputShape;
import com.fasterxml.jackson.databind.type.LogicalType;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.ModerateReviewRequest;
import com.pcstore.exception.AppException;
import com.pcstore.service.ReviewSocialService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

@WebServlet(name = "reviewModerationServlet", urlPatterns = "/api/admin/reviews/*")
public class ReviewModerationServlet extends HttpServlet {
    private final ObjectMapper mapper = JsonMapper.builder()
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    public ReviewModerationServlet() {
        // Jackson's String deserializer otherwise converts 1/true into reason text.
        mapper.coercionConfigFor(LogicalType.Textual)
                .setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
                .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
                .setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail);
    }

    // Servlet 6.0 has no doPatch: dispatch the T27 PATCH endpoint explicitly.
    @Override protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        res.setHeader("Cache-Control", "private, no-store");
        try {
            Integer userId = SessionUtil.userId(req);
            if (userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            if (!"PATCH".equals(req.getMethod())) {
                res.setHeader("Allow", "PATCH, OPTIONS");
                throw new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ.");
            }
            int reviewId = reviewId(req.getPathInfo());
            ModerateReviewRequest body = read(req);
            try (var em = PersistenceManager.get().createEntityManager()) {
                var result = new ReviewSocialService(em).moderate(userId, reviewId, body);
                JsonUtil.write(res, 200, result);
            }
        } catch (AppException error) {
            JsonUtil.write(res, error.getStatus(), Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            getServletContext().log("Review moderation request failed", error);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể kiểm duyệt review lúc này."));
        }
    }

    private ModerateReviewRequest read(HttpServletRequest req) {
        try {
            var body = mapper.readValue(req.getInputStream(), ModerateReviewRequest.class);
            if (body == null) throw new IOException("Null request");
            return body;
        } catch (IOException error) {
            throw new AppException(400, "INVALID_JSON", "JSON kiểm duyệt không đúng cấu trúc.");
        }
    }

    private static int reviewId(String path) {
        if (path == null || !path.matches("/[^/]+/moderation"))
            throw new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
        try {
            int id = Integer.parseInt(path.substring(1, path.length() - 11));
            if (id > 0) return id;
        } catch (NumberFormatException ignored) { }
        throw new AppException(400, "INVALID_ID", "Review ID phải là số nguyên dương.");
    }
}
