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
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

@WebServlet(name = "setupServlet", urlPatterns = {"/api/setups/*", "/api/customer/setups/*"})
public final class SetupServlet extends HttpServlet {
    private final ObjectMapper mapper = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    @Override protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        try {
            String path = req.getRequestURI().substring(req.getContextPath().length());
            boolean owned = path.startsWith("/api/customer/setups");
            Integer userId = SessionUtil.userId(req);
            if (owned && userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            String tail = req.getPathInfo();
            String method = req.getMethod();
            int offset = number(req.getParameter("offset"), 0, 0, 1000000);
            int limit = number(req.getParameter("limit"), 20, 1, 50);
            Object result;
            int status = 200;
            try (var em = PersistenceManager.get().createEntityManager()) {
                var setups = new SetupService(em);
                if (tail == null || "/".equals(tail)) {
                    if ("GET".equals(method)) result = owned ? setups.listOwn(userId, offset, limit) : setups.listPublic(offset, limit);
                    else if (owned && "POST".equals(method)) {
                        result = setups.create(userId, read(req));
                        status = 201;
                    } else throw method();
                } else if (owned && "/eligibility".equals(tail) && "GET".equals(method)) {
                    result = setups.eligibility(userId);
                } else if (tail.matches("/[0-9]+")) {
                    int id = number(tail.substring(1), 0, 1, Integer.MAX_VALUE);
                    if ("GET".equals(method)) result = owned ? setups.getOwn(userId, id) : setups.getPublic(id);
                    else if (owned && "PUT".equals(method)) result = setups.update(userId, id, read(req));
                    else if (owned && "DELETE".equals(method)) {
                        setups.delete(userId, id);
                        result = null;
                        status = 204;
                    } else throw method();
                } else throw new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
            }
            if (status == 204) res.setStatus(204);
            else JsonUtil.write(res, status, result);
        } catch (AppException error) {
            JsonUtil.write(res, error.getStatus(), Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            getServletContext().log("Setup request failed", error);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý Setup lúc này."));
        }
    }

    private SetupDto.Request read(HttpServletRequest req) {
        try {
            SetupDto.Request body = mapper.readValue(req.getInputStream(), SetupDto.Request.class);
            if (body != null) return body;
        } catch (IOException ignored) { }
        throw new AppException(400, "INVALID_JSON", "JSON không hợp lệ.");
    }

    private static int number(String text, int fallback, int min, int max) {
        if (text == null) return fallback;
        try {
            int value = Integer.parseInt(text);
            if (value >= min && value <= max) return value;
        } catch (NumberFormatException ignored) { }
        throw new AppException(400, "INVALID_ID", "Tham số số không hợp lệ.");
    }

    private static AppException method() { return new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không hỗ trợ."); }
}
