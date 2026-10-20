package com.pcstore.controller;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.AddCartItemRequest;
import com.pcstore.dto.UpdateCartItemRequest;
import com.pcstore.exception.AppException;
import com.pcstore.service.CartService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.util.Map;

@WebServlet(name = "cartServlet", urlPatterns = "/api/customer/cart/*")
public class CartServlet extends HttpServlet {
    private static final String ALLOWED_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";
    private final ObjectMapper mapper = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    // Servlet 6.0 needs explicit PATCH dispatch. Keep the HTTP handlers separate.
    @Override
    protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        try {
            if (SessionUtil.userId(req) == null) {
                throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            }
            switch (req.getMethod()) {
                case "GET" -> doGet(req, res);
                case "POST" -> doPost(req, res);
                case "PATCH" -> updateItem(req, res);
                case "DELETE" -> doDelete(req, res);
                default -> {
                    res.setHeader("Allow", ALLOWED_METHODS);
                    throw new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ.");
                }
            }
        } catch (AppException exception) {
            JsonUtil.write(res, exception.getStatus(), Map.of("code", exception.getCode(), "message", exception.getMessage()));
        } catch (RuntimeException exception) {
            if (getServletContext() != null) getServletContext().log("Cart request failed", exception);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý giỏ lúc này."));
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse res) throws IOException {
        String path = req.getPathInfo();
        requirePath(path == null || "/".equals(path));
        Object result;
        try (var em = PersistenceManager.get().createEntityManager()) {
            CartService service = new CartService(em);
            result = service.getCart(SessionUtil.userId(req));
        }
        JsonUtil.write(res, HttpServletResponse.SC_OK, result);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse res) throws IOException {
        requirePath("/items".equals(req.getPathInfo()));
        AddCartItemRequest body = read(req, AddCartItemRequest.class);
        positive(body.productId(), "INVALID_ID");
        positive(body.quantity(), "INVALID_QUANTITY");
        Object result;
        try (var em = PersistenceManager.get().createEntityManager()) {
            CartService service = new CartService(em);
            result = service.addItem(SessionUtil.userId(req), body.productId(), body.quantity());
        }
        JsonUtil.write(res, HttpServletResponse.SC_OK, result);
    }

    private void updateItem(HttpServletRequest req, HttpServletResponse res) throws IOException {
        requirePath(isItemPath(req.getPathInfo()));
        int id = itemId(req.getPathInfo());
        UpdateCartItemRequest body = read(req, UpdateCartItemRequest.class);
        if (body.quantity() == null || body.quantity() < 0) {
            throw new AppException(400, "INVALID_QUANTITY", "Số lượng phải là số nguyên không âm.");
        }
        Object result;
        try (var em = PersistenceManager.get().createEntityManager()) {
            CartService service = new CartService(em);
            result = service.updateItem(SessionUtil.userId(req), id, body.quantity());
        }
        JsonUtil.write(res, HttpServletResponse.SC_OK, result);
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse res) {
        requirePath(isItemPath(req.getPathInfo()));
        int id = itemId(req.getPathInfo());
        try (var em = PersistenceManager.get().createEntityManager()) {
            new CartService(em).deleteItem(SessionUtil.userId(req), id);
        }
        res.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }

    private static void requirePath(boolean matches) {
        if (!matches) throw new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
    }

    private <T> T read(HttpServletRequest req, Class<T> type) {
        try {
            T body = mapper.readValue(req.getInputStream(), type);
            if (body == null) throw new IOException("Null request");
            return body;
        } catch (IOException exception) {
            throw new AppException(400, "INVALID_JSON", "JSON phải đúng cấu trúc và các số nguyên hợp lệ.");
        }
    }

    private static boolean isItemPath(String path) {
        return path != null && path.startsWith("/items/") && path.length() > 7 && path.indexOf('/', 7) < 0;
    }

    private static int itemId(String path) {
        try {
            int id = Integer.parseInt(path.substring(7));
            positive(id, "INVALID_ID");
            return id;
        } catch (NumberFormatException exception) {
            throw new AppException(400, "INVALID_ID", "ID dòng giỏ không hợp lệ.");
        }
    }

    private static void positive(Integer value, String code) {
        if (value == null || value <= 0) throw new AppException(400, code, "Giá trị phải là số nguyên dương.");
    }
}
