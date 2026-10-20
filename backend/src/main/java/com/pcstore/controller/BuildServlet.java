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
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

@WebServlet(name = "buildServlet", urlPatterns = "/api/customer/builds/*")
public class BuildServlet extends HttpServlet {
    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "DELETE");
    private final ObjectMapper mapper = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    @Override protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        try {
            Integer userId = SessionUtil.userId(req);
            if (userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            String method = req.getMethod();
            if (!METHODS.contains(method)) {
                res.setHeader("Allow", "GET, POST, PUT, DELETE, OPTIONS");
                throw new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ.");
            }
            String path = req.getPathInfo();
            Function<BuildService, Object> action;
            int status = 200;
            if (path == null || "/".equals(path)) {
                if ("GET".equals(method)) action = service -> service.list(userId);
                else if ("POST".equals(method)) {
                    BuildDto.Request body = read(req);
                    validate(body);
                    action = service -> service.create(userId, body);
                    status = 201;
                } else throw notFound();
            } else if (path.matches("/[^/]+")) {
                int id = id(path.substring(1));
                switch (method) {
                    case "GET" -> action = service -> service.get(userId, id);
                    case "PUT" -> {
                        BuildDto.Request body = read(req);
                        validate(body);
                        action = service -> service.update(userId, id, body);
                    }
                    case "DELETE" -> {
                        action = service -> { service.delete(userId, id); return null; };
                        status = 204;
                    }
                    default -> throw notFound();
                }
            } else if (path.matches("/[^/]+/cart") && "POST".equals(method)) {
                int id = id(path.substring(1, path.length() - 5));
                action = service -> service.addToCart(userId, id);
            } else throw notFound();

            Object result;
            try (var em = PersistenceManager.get().createEntityManager()) {
                result = action.apply(new BuildService(em));
            }
            if (status == 204) res.setStatus(status);
            else JsonUtil.write(res, status, result);
        } catch (AppException exception) {
            JsonUtil.write(res, exception.getStatus(), Map.of("code", exception.getCode(), "message", exception.getMessage()));
        } catch (RuntimeException exception) {
            if (getServletContext() != null) getServletContext().log("Build request failed", exception);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý build lúc này."));
        }
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

    private static void validate(BuildDto.Request body) {
        if (body.name() == null || body.name().trim().isEmpty() || body.name().trim().length() > 255
                || body.items() == null)
            throw new AppException(400, "INVALID_BUILD", "Tên và danh sách linh kiện không hợp lệ.");
        Set<Integer> ids = new HashSet<>();
        for (var item : body.items()) {
            if (item == null || item.productId() <= 0 || item.quantity() <= 0 || !ids.add(item.productId()))
                throw new AppException(400, "INVALID_BUILD", "Linh kiện hoặc số lượng không hợp lệ.");
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
