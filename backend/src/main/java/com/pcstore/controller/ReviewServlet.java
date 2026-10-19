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

import jakarta.persistence.EntityManager;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;

@WebServlet(
        name = "reviewServlet",
        urlPatterns = {"/api/reviews/*", "/api/customer/reviews/*"})
public final class ReviewServlet extends HttpServlet {
    private final ReviewLikeServlet reviewLikeServlet = new ReviewLikeServlet();
    private final ObjectMapper mapper =
            JsonMapper.builder()
                    .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                    .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .build();

    // Servlet 6.0 chưa có doPatch. service chỉ điều phối HTTP và trả lỗi JSON.
    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            String path = request.getPathInfo();
            if (isCustomerRoute(request) && path != null && path.matches("/[^/]+/like")) {
                reviewLikeServlet.service(request, response);
                return;
            }
            if (isCustomerRoute(request) && SessionUtil.userId(request) == null) {
                throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            }
            validateRoute(request);
            if ("PATCH".equals(request.getMethod())) {
                updateReview(request, response);
            } else {
                super.service(request, response);
            }
        } catch (AppException error) {
            JsonUtil.write(
                    response,
                    error.getStatus(),
                    Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) {
                getServletContext().log("Review request failed", error);
            }
            JsonUtil.write(
                    response,
                    500,
                    Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý Review lúc này."));
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            ReviewService reviews = new ReviewService(entityManager);
            String path = request.getPathInfo();
            Integer userId = SessionUtil.userId(request);
            Object result;
            if (!isCustomerRoute(request)) {
                if ("/summary".equals(path)) {
                    result = reviews.summary(requiredQueryId(request, "productId"));
                } else {
                    result = listReviews(request, reviews, userId);
                }
            } else if (path.startsWith("/order-items/")) {
                int orderItemId = pathId(path.substring("/order-items/".length()));
                result = reviews.getOwnByOrderItem(userId, orderItemId);
            } else {
                result = reviews.getOwn(userId, pathId(path.substring(1)));
            }
            JsonUtil.write(response, 200, result);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            ReviewService reviews = new ReviewService(entityManager);
            int userId = SessionUtil.userId(request);
            String path = request.getPathInfo();
            if (isCollection(path)) {
                // Giống lấy email/firstName trong EmailListServlet, nhưng dữ liệu đến từ JSON.
                ReviewDto.CreateRequest body = readRequest(request, ReviewDto.CreateRequest.class);
                ReviewDto.Response result = reviews.create(userId, body);
                // Frontend Next.js nhận JSON; bài tập Murach dùng forward sang JSP.
                JsonUtil.write(response, 201, result);
            } else {
                String id = path.substring(1, path.length() - "/restore".length());
                ReviewDto.Response result = reviews.restore(userId, pathId(id));
                JsonUtil.write(response, 200, result);
            }
        }
    }

    private void updateReview(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            ReviewService reviews = new ReviewService(entityManager);
            int userId = SessionUtil.userId(request);
            int reviewId = pathId(request.getPathInfo().substring(1));
            ReviewDto.UpdateRequest body = readRequest(request, ReviewDto.UpdateRequest.class);
            ReviewDto.Response result = reviews.update(userId, reviewId, body);
            JsonUtil.write(response, 200, result);
        }
    }

    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            ReviewService reviews = new ReviewService(entityManager);
            int userId = SessionUtil.userId(request);
            int reviewId = pathId(request.getPathInfo().substring(1));
            reviews.delete(userId, reviewId);
            response.setStatus(204);
        }
    }

    private ReviewDto.PageResponse listReviews(
            HttpServletRequest request, ReviewService reviews, Integer userId) {
        int productId = requiredQueryId(request, "productId");
        int page = integer(request.getParameter("page"), 0, 0, 1_000_000, "page");
        int size = integer(request.getParameter("size"), 20, 1, 50, "size");
        Integer rating = optionalInteger(request.getParameter("rating"), 1, 5, "rating");
        Boolean hasMedia = optionalBoolean(request.getParameter("hasMedia"));
        ReviewDto.Sort sort = sort(request.getParameter("sort"));
        return reviews.listPublic(productId, page, size, rating, hasMedia, sort, userId);
    }

    private void validateRoute(HttpServletRequest request) {
        String path = request.getPathInfo();
        String method = request.getMethod();
        if (!isCustomerRoute(request)) {
            if (isCollection(path) || "/summary".equals(path)) {
                requireMethod(method, "GET");
            } else {
                throw notFound();
            }
        } else if (isCollection(path)) {
            requireMethod(method, "POST");
        } else if (path.matches("/order-items/[0-9]+")) {
            requireMethod(method, "GET");
        } else if (path.matches("/[0-9]+")) {
            // Parse before method validation to preserve INVALID_ID for overflowing IDs.
            pathId(path.substring(1));
            if (!"GET".equals(method) && !"PATCH".equals(method) && !"DELETE".equals(method)) {
                throw methodNotAllowed();
            }
        } else if (path.matches("/[0-9]+/restore")) {
            requireMethod(method, "POST");
        } else {
            throw notFound();
        }
    }

    private boolean isCustomerRoute(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return path.startsWith("/api/customer/reviews");
    }

    private boolean isCollection(String path) {
        return path == null || "/".equals(path);
    }

    private <T> T readRequest(HttpServletRequest request, Class<T> type) {
        try {
            T body = mapper.readValue(request.getInputStream(), type);
            if (body != null) {
                return body;
            }
        } catch (IOException ignored) {
        }
        throw new AppException(400, "INVALID_JSON", "JSON không hợp lệ.");
    }

    private static void requireMethod(String actual, String expected) {
        if (!expected.equals(actual)) {
            throw methodNotAllowed();
        }
    }

    private static int requiredQueryId(HttpServletRequest request, String name) {
        String value = request.getParameter(name);
        if (value == null) {
            throw query("Thiếu tham số " + name + ".");
        }
        return integer(value, 0, 1, Integer.MAX_VALUE, name);
    }

    private static int pathId(String value) {
        try {
            int id = Integer.parseInt(value);
            if (id > 0) {
                return id;
            }
        } catch (NumberFormatException ignored) {
        }
        throw new AppException(400, "INVALID_ID", "ID Review không hợp lệ.");
    }

    private static int integer(String text, int fallback, int min, int max, String name) {
        if (text == null) {
            return fallback;
        }
        try {
            int value = Integer.parseInt(text);
            if (value >= min && value <= max) {
                return value;
            }
        } catch (NumberFormatException ignored) {
        }
        throw query("Tham số " + name + " không hợp lệ.");
    }

    private static Integer optionalInteger(String text, int min, int max, String name) {
        return text == null ? null : integer(text, 0, min, max, name);
    }

    private static Boolean optionalBoolean(String text) {
        if (text == null) {
            return null;
        }
        if ("true".equalsIgnoreCase(text)) {
            return true;
        }
        if ("false".equalsIgnoreCase(text)) {
            return false;
        }
        throw query("Tham số hasMedia phải là true hoặc false.");
    }

    private static ReviewDto.Sort sort(String text) {
        if (text == null) {
            return ReviewDto.Sort.NEWEST;
        }
        try {
            return ReviewDto.Sort.valueOf(text.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw query("sort phải là newest, oldest, rating_desc, rating_asc hoặc helpful.");
        }
    }

    private static AppException query(String message) {
        return new AppException(400, "INVALID_REVIEW_QUERY", message);
    }

    private static AppException methodNotAllowed() {
        return new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không hỗ trợ.");
    }

    private static AppException notFound() {
        return new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
    }
}
