package com.pcstore.controller;

import com.pcstore.dto.CheckoutRequest;
import com.pcstore.exception.AppException;
import com.pcstore.service.OrderService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

@WebServlet(name = "orderServlet", urlPatterns = {"/api/orders", "/api/orders/*"})
public class OrderServlet extends HttpServlet {
    private OrderService orderService;
    private com.pcstore.service.VNPayPaymentService vnPayPaymentService;
    private com.pcstore.service.VNPayQueryDrService vnPayQueryDrService;

    public OrderServlet() {
    }

    public OrderServlet(OrderService orderService, com.pcstore.service.VNPayPaymentService vnPayPaymentService) {
        this(orderService, vnPayPaymentService, null);
    }

    public OrderServlet(OrderService orderService, com.pcstore.service.VNPayPaymentService vnPayPaymentService, com.pcstore.service.VNPayQueryDrService vnPayQueryDrService) {
        this.orderService = orderService;
        this.vnPayPaymentService = vnPayPaymentService;
        this.vnPayQueryDrService = vnPayQueryDrService;
    }

    @Override
    public void init() {
        if (orderService == null) {
            orderService = new OrderService();
        }
        if (vnPayPaymentService == null) {
            vnPayPaymentService = new com.pcstore.service.VNPayPaymentService();
        }
        if (vnPayQueryDrService == null) {
            vnPayQueryDrService = new com.pcstore.service.VNPayQueryDrService();
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            int userId = requiredUserId(request);
            String path = normalizedPath(request);
            if (path.isEmpty()) {
                JsonUtil.write(response, HttpServletResponse.SC_OK, orderService.findOwnedOrders(userId));
                return;
            }
            Integer orderId = singleId(path);
            if (orderId == null) {
                notFound(response);
                return;
            }
            JsonUtil.write(response, HttpServletResponse.SC_OK, orderService.findOwnedOrder(userId, orderId));
        } catch (AppException exception) {
            writeError(response, exception);
        } catch (RuntimeException exception) {
            getServletContext().log("Order query failed", exception);
            internalError(response);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            int userId = requiredUserId(request);
            String path = normalizedPath(request);
            if (path.isEmpty()) {
                var result = orderService.checkout(userId, request.getHeader("Idempotency-Key"),
                        JsonUtil.read(request, CheckoutRequest.class));
                response.setHeader("Idempotent-Replayed", Boolean.toString(result.replayed()));
                JsonUtil.write(response, result.replayed() ? HttpServletResponse.SC_OK : HttpServletResponse.SC_CREATED,
                        result.order());
                return;
            }
            Integer cancelOrderId = actionId(path, "cancel");
            if (cancelOrderId != null) {
                JsonUtil.write(response, HttpServletResponse.SC_OK,
                        orderService.cancelOwnedOrder(userId, cancelOrderId));
                return;
            }
            Integer vnpayOrderId = paymentActionId(path, "vnpay-url");
            if (vnpayOrderId != null) {
                String clientIp = clientIp(request);
                var paymentUrlResponse = vnPayPaymentService.createPaymentUrl(userId, vnpayOrderId, clientIp);
                JsonUtil.write(response, HttpServletResponse.SC_OK, paymentUrlResponse);
                return;
            }
            Integer syncOrderId = paymentActionId(path, "sync");
            if (syncOrderId != null) {
                orderService.findOwnedOrder(userId, syncOrderId);
                vnPayQueryDrService.reconcileOrder(syncOrderId);
                JsonUtil.write(response, HttpServletResponse.SC_OK, orderService.findOwnedOrder(userId, syncOrderId));
                return;
            }
            notFound(response);
        } catch (AppException exception) {
            writeError(response, exception);
        } catch (IOException exception) {
            JsonUtil.write(response, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("code", "INVALID_JSON", "message", "JSON request không hợp lệ."));
        } catch (RuntimeException exception) {
            getServletContext().log("Order command failed", exception);
            internalError(response);
        }
    }

    private static int requiredUserId(HttpServletRequest request) {
        Integer userId = SessionUtil.userId(request);
        if (userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
        return userId;
    }

    static String normalizedPath(HttpServletRequest request) {
        String path = request.getPathInfo();
        if (path == null || path.equals("/")) return "";
        return path.startsWith("/") ? path.substring(1) : path;
    }

    static Integer singleId(String path) {
        if (path == null || path.isBlank() || path.contains("/")) return null;
        return positiveId(path);
    }

    static Integer actionId(String path, String action) {
        if (path == null) return null;
        String[] parts = path.split("/", -1);
        if (parts.length != 2 || !action.equals(parts[1])) return null;
        return positiveId(parts[0]);
    }

    static Integer paymentActionId(String path, String action) {
        if (path == null) return null;
        String[] parts = path.split("/", -1);
        if (parts.length != 3 || !"payment".equals(parts[1]) || !action.equals(parts[2])) return null;
        return positiveId(parts[0]);
    }

    static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static Integer positiveId(String value) {
        try {
            int id = Integer.parseInt(value);
            return id > 0 ? id : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static void writeError(HttpServletResponse response, AppException exception) throws IOException {
        JsonUtil.write(response, exception.getStatus(),
                Map.of("code", exception.getCode(), "message", exception.getMessage()));
    }

    private static void notFound(HttpServletResponse response) throws IOException {
        JsonUtil.write(response, HttpServletResponse.SC_NOT_FOUND,
                Map.of("code", "NOT_FOUND", "message", "Không tìm thấy endpoint."));
    }

    private static void internalError(HttpServletResponse response) throws IOException {
        JsonUtil.write(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                Map.of("code", "INTERNAL_ERROR", "message", "Lỗi máy chủ."));
    }
}
