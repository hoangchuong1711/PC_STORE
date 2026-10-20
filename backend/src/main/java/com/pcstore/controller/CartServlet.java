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
import java.util.Set;
import java.util.function.Function;

@WebServlet(name = "cartServlet", urlPatterns = "/api/customer/cart/*")
public class CartServlet extends HttpServlet {
    private static final Set<String> METHODS = Set.of("GET", "POST", "PATCH", "DELETE");
    private final ObjectMapper mapper = JsonMapper.builder()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .build();

    // Servlet 6.0 has no doPatch; dispatch PATCH together with the other cart methods.
    @Override protected void service(HttpServletRequest req, HttpServletResponse res) throws IOException {
        try {
            Integer userId = SessionUtil.userId(req);
            if (userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
            String method = req.getMethod();
            if (!METHODS.contains(method)) {
                res.setHeader("Allow", "GET, POST, PATCH, DELETE, OPTIONS");
                throw new AppException(405, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ.");
            }
            String path = req.getPathInfo();
            Function<CartService, Object> action;
            if ("GET".equals(method) && (path == null || "/".equals(path))) {
                action = service -> service.getCart(userId);
            } else if ("POST".equals(method) && "/items".equals(path)) {
                AddCartItemRequest body = read(req, AddCartItemRequest.class);
                positive(body.productId(), "INVALID_ID");
                positive(body.quantity(), "INVALID_QUANTITY");
                action = service -> service.addItem(userId, body.productId(), body.quantity());
            } else if (("PATCH".equals(method) || "DELETE".equals(method)) && isItemPath(path)) {
                int itemId = itemId(path);
                if ("PATCH".equals(method)) {
                    UpdateCartItemRequest body = read(req, UpdateCartItemRequest.class);
                    if (body.quantity() == null || body.quantity() < 0)
                        throw new AppException(400, "INVALID_QUANTITY", "Số lượng phải là số nguyên không âm.");
                    action = service -> service.updateItem(userId, itemId, body.quantity());
                } else {
                    action = service -> { service.deleteItem(userId, itemId); return null; };
                }
            } else {
                throw new AppException(404, "NOT_FOUND", "Không tìm thấy endpoint.");
            }
            Object result;
            try (var em = PersistenceManager.get().createEntityManager()) {
                result = action.apply(new CartService(em));
            }
            if ("DELETE".equals(method)) res.setStatus(HttpServletResponse.SC_NO_CONTENT);
            else JsonUtil.write(res, HttpServletResponse.SC_OK, result);
        } catch (AppException exception) {
            JsonUtil.write(res, exception.getStatus(), Map.of("code", exception.getCode(), "message", exception.getMessage()));
        } catch (RuntimeException exception) {
            if (getServletContext() != null) getServletContext().log("Cart request failed", exception);
            JsonUtil.write(res, 500, Map.of("code", "INTERNAL_ERROR", "message", "Không thể xử lý giỏ lúc này."));
        }
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
