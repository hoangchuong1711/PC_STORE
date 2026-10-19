package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.SetupDto;
import com.pcstore.exception.AppException;
import com.pcstore.service.SetupService;
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

@WebServlet(
        name = "setupServlet",
        urlPatterns = {"/api/setups/*", "/api/customer/setups/*"})
public final class SetupServlet extends HttpServlet {
    private final ObjectMapper mapper =
            JsonMapper.builder()
                    .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                    .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .build();

    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            if (isCustomerRoute(request) && SessionUtil.userId(request) == null) {
                throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            }
            // Các tham số này luôn được kiểm tra, kể cả ở request ghi.
            parseInteger(request.getParameter("offset"), 0, 0, 1_000_000);
            parseInteger(request.getParameter("limit"), 20, 1, 50);
            validateRoute(request);
            super.service(request, response);
        } catch (AppException error) {
            JsonUtil.write(
                    response,
                    error.getStatus(),
                    Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) {
                getServletContext().log("Setup request failed", error);
            }
            JsonUtil.write(
                    response,
                    500,
                    Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý Setup lúc này."));
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            SetupService setups = new SetupService(entityManager);
            Integer userId = SessionUtil.userId(request);
            boolean customerRoute = isCustomerRoute(request);
            String path = request.getPathInfo();
            Object result;
            if (isCollection(path)) {
                int offset = parseInteger(request.getParameter("offset"), 0, 0, 1_000_000);
                int limit = parseInteger(request.getParameter("limit"), 20, 1, 50);
                if (customerRoute) {
                    result = setups.listOwn(userId, offset, limit);
                } else {
                    result = setups.listPublic(offset, limit);
                }
            } else if ("/eligibility".equals(path)) {
                result = setups.eligibility(userId);
            } else {
                int postId = parseInteger(path.substring(1), 0, 1, Integer.MAX_VALUE);
                if (customerRoute) {
                    result = setups.getOwn(userId, postId);
                } else {
                    result = setups.getPublic(postId);
                }
            }
            JsonUtil.write(response, 200, result);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            SetupService setups = new SetupService(entityManager);
            int userId = SessionUtil.userId(request);
            SetupDto.Request body = readRequest(request);
            SetupDto.Response result = setups.create(userId, body);
            JsonUtil.write(response, 201, result);
        }
    }

    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            SetupService setups = new SetupService(entityManager);
            int userId = SessionUtil.userId(request);
            int postId = parseInteger(request.getPathInfo().substring(1), 0, 1, Integer.MAX_VALUE);
            SetupDto.Request body = readRequest(request);
            SetupDto.Response result = setups.update(userId, postId, body);
            JsonUtil.write(response, 200, result);
        }
    }

    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response) {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            SetupService setups = new SetupService(entityManager);
            int userId = SessionUtil.userId(request);
            int postId = parseInteger(request.getPathInfo().substring(1), 0, 1, Integer.MAX_VALUE);
            setups.delete(userId, postId);
            response.setStatus(204);
        }
    }

    private void validateRoute(HttpServletRequest request) {
        String path = request.getPathInfo();
        String method = request.getMethod();
        boolean customerRoute = isCustomerRoute(request);
        if (isCollection(path)) {
            if (!"GET".equals(method) && !(customerRoute && "POST".equals(method))) {
                throw methodNotAllowed();
            }
        } else if (customerRoute && "/eligibility".equals(path) && "GET".equals(method)) {
            return;
        } else if (path.matches("/[0-9]+")) {
            parseInteger(path.substring(1), 0, 1, Integer.MAX_VALUE);
            if (!"GET".equals(method)
                    && !(customerRoute && ("PUT".equals(method) || "DELETE".equals(method)))) {
                throw methodNotAllowed();
            }
        } else {
            throw new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
        }
    }

    private boolean isCustomerRoute(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return path.startsWith("/api/customer/setups");
    }

    private boolean isCollection(String path) {
        return path == null || "/".equals(path);
    }

    private SetupDto.Request readRequest(HttpServletRequest request) {
        try {
            SetupDto.Request body =
                    mapper.readValue(request.getInputStream(), SetupDto.Request.class);
            if (body != null) {
                return body;
            }
        } catch (IOException ignored) {
        }
        throw new AppException(400, "INVALID_JSON", "JSON không hợp lệ.");
    }

    private static int parseInteger(String text, int fallback, int min, int max) {
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
        throw new AppException(400, "INVALID_ID", "Tham số số không hợp lệ.");
    }

    private static AppException methodNotAllowed() {
        return new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không hỗ trợ.");
    }
}
