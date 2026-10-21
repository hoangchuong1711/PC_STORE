package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.BuildDto;
import com.pcstore.exception.AppException;
import com.pcstore.service.BuildService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.util.Map;
import java.util.function.Function;

@WebServlet(name = "buildServlet", urlPatterns = "/api/customer/builds/*")
public class BuildServlet extends HttpServlet {
    private final ObjectMapper mapper = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    @Override protected void doGet(HttpServletRequest req, HttpServletResponse res) throws IOException {
        handle(req, res, userId -> {
            String path = req.getPathInfo();
            if (path == null || "/".equals(path)) {
                execute(res, 200, service -> service.list(userId));
            } else if (path.matches("/[^/]+")) {
                int buildId = id(path.substring(1));
                execute(res, 200, service -> service.get(userId, buildId));
            } else throw notFound();
        });
    }

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse res) throws IOException {
        handle(req, res, userId -> {
            String path = req.getPathInfo();
            if (path == null || "/".equals(path)) {
                BuildDto.Request body = read(req);
                BuildService.validateRequest(body);
                execute(res, 201, service -> service.create(userId, body));
            } else if (path.matches("/[^/]+/cart")) {
                int buildId = id(path.substring(1, path.length() - 5));
                execute(res, 200, service -> service.addToCart(userId, buildId));
            } else throw notFound();
        });
    }

    @Override protected void doPut(HttpServletRequest req, HttpServletResponse res) throws IOException {
        handle(req, res, userId -> {
            String path = req.getPathInfo();
            if (path == null || !path.matches("/[^/]+")) throw notFound();
            int buildId = id(path.substring(1));
            BuildDto.Request body = read(req);
            BuildService.validateRequest(body);
            execute(res, 200, service -> service.update(userId, buildId, body));
        });
    }

    @Override protected void doDelete(HttpServletRequest req, HttpServletResponse res) throws IOException {
        handle(req, res, userId -> {
            String path = req.getPathInfo();
            if (path == null || !path.matches("/[^/]+")) throw notFound();
            int buildId = id(path.substring(1));
            execute(res, 204, service -> {
                service.delete(userId, buildId);
                return null;
            });
        });
    }

    private void handle(HttpServletRequest req, HttpServletResponse res, RequestAction action)
            throws IOException {
        try {
            Integer userId = SessionUtil.userId(req);
            if (userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            action.run(userId);
        } catch (AppException exception) {
            JsonUtil.write(res, exception.getStatus(),
                    Map.of("code", exception.getCode(), "message", exception.getMessage()));
        } catch (RuntimeException exception) {
            if (getServletContext() != null) getServletContext().log("Build request failed", exception);
            JsonUtil.write(res, 500,
                    Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý build lúc này."));
        }
    }

    @FunctionalInterface
    private interface RequestAction {
        void run(int userId) throws IOException;
    }

    private void execute(HttpServletResponse res, int status, Function<BuildService, Object> action)
            throws IOException {
        Object result;
        try (var em = PersistenceManager.get().createEntityManager()) {
            result = action.apply(new BuildService(em));
        }
        if (status == 204) res.setStatus(status);
        else JsonUtil.write(res, status, result);
    }

    private BuildDto.Request read(HttpServletRequest req) {
        try {
            BuildDto.Request body = mapper.readValue(req.getInputStream(), BuildDto.Request.class);
            if (body == null) throw new IOException("Null request");
            return body;
        } catch (IOException exception) {
            throw new AppException(400, "INVALID_JSON", "JSON phải đúng cấu trúc và các số nguyên hợp lệ.");
        }
    }

    private static int id(String value) {
        try {
            int id = Integer.parseInt(value);
            if (id > 0) return id;
        } catch (NumberFormatException ignored) { }
        throw new AppException(400, "INVALID_ID", "ID build không hợp lệ.");
    }

    private static AppException notFound() {
        return new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
    }
}
