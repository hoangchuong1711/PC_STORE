package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.SetupSocialDto;
import com.pcstore.exception.AppException;
import com.pcstore.service.SetupSocialService;
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
        name = "setupSocialServlet",
        urlPatterns = {"/api/setups/ranking", "/api/setup-likes/*", "/api/admin/setups/*"})
public final class SetupSocialServlet extends HttpServlet {
    private final ObjectMapper mapper =
            JsonMapper.builder()
                    .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .build();

    @Override
    protected void service(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            validateRoute(request);
            super.service(request, response);
        } catch (AppException error) {
            JsonUtil.write(
                    response,
                    error.getStatus(),
                    Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            if (getServletConfig() != null) {
                getServletContext().log("Setup social request failed", error);
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
            SetupSocialService setups = new SetupSocialService(entityManager);
            Integer userId = SessionUtil.userId(request);
            String route = request.getServletPath();
            String path = request.getPathInfo();
            Object result;
            if ("/api/setups/ranking".equals(route)) {
                int offset = parseInteger(request.getParameter("offset"), 0);
                int limit = parseInteger(request.getParameter("limit"), 20);
                result = setups.ranking(userId, offset, limit);
            } else if ("/api/setup-likes".equals(route)) {
                int postId = parseInteger(path.substring(1), 0);
                result = setups.getLike(postId, userId);
            } else if (path == null || "/".equals(path)) {
                String status = request.getParameter("status");
                int offset = parseInteger(request.getParameter("offset"), 0);
                int limit = parseInteger(request.getParameter("limit"), 20);
                result = setups.listAdmin(userId, status, offset, limit);
            } else {
                int postId = parseInteger(path.substring(1), 0);
                result = setups.getAdmin(userId, postId);
            }
            JsonUtil.write(response, 200, result);
        }
    }

    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            SetupSocialService setups = new SetupSocialService(entityManager);
            Integer userId = SessionUtil.userId(request);
            String path = request.getPathInfo();
            Object result;
            if ("/api/setup-likes".equals(request.getServletPath())) {
                int postId = parseInteger(path.substring(1), 0);
                result = setups.setLike(userId, postId, true);
            } else {
                int postId = parseInteger(path.split("/")[1], 0);
                SetupSocialDto.ModerationRequest body = readRequest(request);
                result = setups.moderate(userId, postId, body);
            }
            JsonUtil.write(response, 200, result);
        }
    }

    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try (EntityManager entityManager = PersistenceManager.get().createEntityManager()) {
            SetupSocialService setups = new SetupSocialService(entityManager);
            Integer userId = SessionUtil.userId(request);
            int postId = parseInteger(request.getPathInfo().substring(1), 0);
            SetupSocialDto.Like result = setups.setLike(userId, postId, false);
            JsonUtil.write(response, 200, result);
        }
    }

    private void validateRoute(HttpServletRequest request) {
        String route = request.getServletPath();
        String path = request.getPathInfo();
        String method = request.getMethod();
        if ("/api/setups/ranking".equals(route)) {
            require(method, "GET");
        } else if ("/api/setup-likes".equals(route) && path != null && path.matches("/[0-9]+")) {
            parseInteger(path.substring(1), 0);
            if (!"GET".equals(method) && !"PUT".equals(method) && !"DELETE".equals(method)) {
                throw methodNotAllowed();
            }
        } else if ("/api/admin/setups".equals(route)) {
            if (path == null || "/".equals(path) || path.matches("/[0-9]+")) {
                require(method, "GET");
            } else if (path.matches("/[0-9]+/status")) {
                require(method, "PUT");
            } else {
                throw endpointNotFound();
            }
        } else {
            throw endpointNotFound();
        }
    }

    private SetupSocialDto.ModerationRequest readRequest(HttpServletRequest request) {
        try {
            SetupSocialDto.ModerationRequest body =
                    mapper.readValue(
                            request.getInputStream(), SetupSocialDto.ModerationRequest.class);
            if (body != null) {
                return body;
            }
        } catch (IOException ignored) {
        }
        throw new AppException(400, "INVALID_JSON", "JSON không hợp lệ.");
    }

    private static int parseInteger(String text, int fallback) {
        if (text == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException error) {
            throw new AppException(400, "INVALID_ID", "Tham số số không hợp lệ.");
        }
    }

    private static void require(String actual, String expected) {
        if (!expected.equals(actual)) {
            throw methodNotAllowed();
        }
    }

    private static AppException methodNotAllowed() {
        return new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không hỗ trợ.");
    }

    private static AppException endpointNotFound() {
        return new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
    }
}
