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
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.util.Map;

@WebServlet(name = "setupSocialServlet", urlPatterns = {"/api/setups/ranking", "/api/setup-likes/*", "/api/admin/setups/*"})
public final class SetupSocialServlet extends HttpServlet {
    private final ObjectMapper mapper = JsonMapper.builder().disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();

    @Override protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        try {
            Integer user = SessionUtil.userId(req);
            String method = req.getMethod();
            String route = req.getServletPath();
            String tail = req.getPathInfo();
            Object result;
            try (var em = PersistenceManager.get().createEntityManager()) {
                var service = new SetupSocialService(em);
                if ("/api/setups/ranking".equals(route)) {
                    require(method, "GET");
                    result = service.ranking(user, number(req.getParameter("offset"), 0), number(req.getParameter("limit"), 20));
                } else if ("/api/setup-likes".equals(route) && tail != null && tail.matches("/[0-9]+")) {
                    int id = number(tail.substring(1), 0);
                    result = switch (method) {
                        case "GET" -> service.getLike(id, user);
                        case "PUT" -> service.setLike(user, id, true);
                        case "DELETE" -> service.setLike(user, id, false);
                        default -> throw method();
                    };
                } else if ("/api/admin/setups".equals(route)) {
                    if (tail == null || "/".equals(tail)) {
                        require(method, "GET");
                        result = service.listAdmin(user, req.getParameter("status"), number(req.getParameter("offset"), 0), number(req.getParameter("limit"), 20));
                    } else if (tail.matches("/[0-9]+")) {
                        require(method, "GET");
                        result = service.getAdmin(user, number(tail.substring(1), 0));
                    } else if (tail.matches("/[0-9]+/status")) {
                        require(method, "PUT");
                        result = service.moderate(user, number(tail.split("/")[1], 0), read(req));
                    } else throw missing();
                } else throw missing();
            }
            JsonUtil.write(res, 200, result);
        } catch (AppException error) {
            JsonUtil.write(res, error.getStatus(), Map.of("code", error.getCode(), "message", error.getMessage()));
        } catch (RuntimeException error) {
            getServletContext().log("Setup social request failed", error);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý Setup lúc này."));
        }
    }

    private SetupSocialDto.ModerationRequest read(HttpServletRequest req) {
        try {
            var body = mapper.readValue(req.getInputStream(), SetupSocialDto.ModerationRequest.class);
            if (body != null) return body;
        } catch (IOException ignored) { }
        throw new AppException(400, "INVALID_JSON", "JSON không hợp lệ.");
    }

    private static int number(String text, int fallback) {
        if (text == null) return fallback;
        try { return Integer.parseInt(text); }
        catch (NumberFormatException error) { throw new AppException(400, "INVALID_ID", "Tham số số không hợp lệ."); }
    }
    private static void require(String actual, String expected) { if (!expected.equals(actual)) throw method(); }
    private static AppException method() { return new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không hỗ trợ."); }
    private static AppException missing() { return new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint."); }
}
