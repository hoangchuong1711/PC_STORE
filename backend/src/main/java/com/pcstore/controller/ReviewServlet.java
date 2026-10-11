package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.ReviewDto;
import com.pcstore.exception.AppException;
import com.pcstore.service.ReviewService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

@WebServlet(name = "reviewServlet", urlPatterns = {"/api/reviews/*", "/api/customer/reviews/*"})
public final class ReviewServlet extends HttpServlet {
    private final ObjectMapper mapper = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    @Override protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        try {
            String requestPath = req.getRequestURI().substring(req.getContextPath().length());
            boolean customerRoute = requestPath.startsWith("/api/customer/reviews");
            Integer userId = SessionUtil.userId(req);
            if (customerRoute && userId == null)
                throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");

            String tail = req.getPathInfo();
            String method = req.getMethod();
            Object result;
            int status = 200;
            try (var em = PersistenceManager.get().createEntityManager()) {
                ReviewService reviews = new ReviewService(em);
                if (!customerRoute) {
                    if (tail == null || "/".equals(tail)) {
                        requireMethod(method, "GET");
                        int productId = requiredQueryId(req, "productId");
                        int page = integer(req.getParameter("page"), 0, 0, 1_000_000, "page");
                        int size = integer(req.getParameter("size"), 20, 1, 50, "size");
                        Integer rating = optionalInteger(req.getParameter("rating"), 1, 5, "rating");
                        Boolean hasMedia = optionalBoolean(req.getParameter("hasMedia"));
                        ReviewDto.Sort sort = sort(req.getParameter("sort"));
                        result = reviews.listPublic(productId, page, size, rating, hasMedia, sort, userId);
                    } else if ("/summary".equals(tail)) {
                        requireMethod(method, "GET");
                        result = reviews.summary(requiredQueryId(req, "productId"));
                    } else throw notFound();
                } else if (tail == null || "/".equals(tail)) {
                    requireMethod(method, "POST");
                    result = reviews.create(userId, read(req, ReviewDto.CreateRequest.class));
                    status = 201;
                } else if (tail.matches("/order-items/[0-9]+")) {
                    requireMethod(method, "GET");
                    result = reviews.getOwnByOrderItem(userId, pathId(tail.substring("/order-items/".length())));
                } else if (tail.matches("/[0-9]+")) {
                    int reviewId = pathId(tail.substring(1));
                    switch (method) {
                        case "GET" -> result = reviews.getOwn(userId, reviewId);
                        case "PATCH" -> result = reviews.update(userId, reviewId,
                                read(req, ReviewDto.UpdateRequest.class));
                        case "DELETE" -> {
                            reviews.delete(userId, reviewId);
                            result = null;
                            status = 204;
                        }
                        default -> throw method();
                    }
                } else if (tail.matches("/[0-9]+/restore")) {
                    requireMethod(method, "POST");
                    String id = tail.substring(1, tail.length() - "/restore".length());
                    result = reviews.restore(userId, pathId(id));
                } else throw notFound();
            }
            if (status == 204) res.setStatus(status);
            else JsonUtil.write(res, status, result);
        } catch (AppException error) {
            JsonUtil.write(res, error.getStatus(), Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletContext() != null) getServletContext().log("Review request failed", error);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý Review lúc này."));
        }
    }

    private <T> T read(HttpServletRequest req, Class<T> type) {
        try {
            T body = mapper.readValue(req.getInputStream(), type);
            if (body != null) return body;
        } catch (IOException ignored) { }
        throw new AppException(400, "INVALID_JSON", "JSON không hợp lệ.");
    }

    private static void requireMethod(String actual, String expected) {
        if (!expected.equals(actual)) throw method();
    }

    private static int requiredQueryId(HttpServletRequest request, String name) {
        String value = request.getParameter(name);
        if (value == null) throw query("Thiếu tham số " + name + ".");
        return integer(value, 0, 1, Integer.MAX_VALUE, name);
    }

    private static int pathId(String value) {
        try {
            int id = Integer.parseInt(value);
            if (id > 0) return id;
        } catch (NumberFormatException ignored) { }
        throw new AppException(400, "INVALID_ID", "ID Review không hợp lệ.");
    }

    private static int integer(String text, int fallback, int min, int max, String name) {
        if (text == null) return fallback;
        try {
            int value = Integer.parseInt(text);
            if (value >= min && value <= max) return value;
        } catch (NumberFormatException ignored) { }
        throw query("Tham số " + name + " không hợp lệ.");
    }

    private static Integer optionalInteger(String text, int min, int max, String name) {
        return text == null ? null : integer(text, 0, min, max, name);
    }

    private static Boolean optionalBoolean(String text) {
        if (text == null) return null;
        if ("true".equalsIgnoreCase(text)) return true;
        if ("false".equalsIgnoreCase(text)) return false;
        throw query("Tham số hasMedia phải là true hoặc false.");
    }

    private static ReviewDto.Sort sort(String text) {
        if (text == null) return ReviewDto.Sort.NEWEST;
        try {
            return ReviewDto.Sort.valueOf(text.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw query("sort phải là newest, oldest, rating_desc, rating_asc hoặc helpful.");
        }
    }

    private static AppException query(String message) {
        return new AppException(400, "INVALID_REVIEW_QUERY", message);
    }
    private static AppException method() {
        return new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không hỗ trợ.");
    }
    private static AppException notFound() {
        return new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
    }
}
