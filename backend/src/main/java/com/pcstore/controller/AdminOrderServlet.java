package com.pcstore.controller;

import com.pcstore.dto.OrderStatusUpdateRequest;
import com.pcstore.exception.AppException;
import com.pcstore.service.OrderService;
import com.pcstore.util.JsonUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

@WebServlet(name = "adminOrderServlet", urlPatterns = {"/api/admin/orders", "/api/admin/orders/*"})
public class AdminOrderServlet extends HttpServlet {
    private OrderService orderService;
    private com.pcstore.service.VNPayQueryDrService vnPayQueryDrService;

    public AdminOrderServlet() {
    }

    public AdminOrderServlet(OrderService orderService, com.pcstore.service.VNPayQueryDrService vnPayQueryDrService) {
        this.orderService = orderService;
        this.vnPayQueryDrService = vnPayQueryDrService;
    }

    @Override
    public void init() {
        if (orderService == null) {
            orderService = new OrderService();
        }
        if (vnPayQueryDrService == null) {
            vnPayQueryDrService = new com.pcstore.service.VNPayQueryDrService();
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            Integer orderId = OrderServlet.actionId(OrderServlet.normalizedPath(request), "reconcile");
            if (orderId == null) {
                notFound(response);
                return;
            }
            JsonUtil.write(response, HttpServletResponse.SC_OK,
                    vnPayQueryDrService.reconcileOrder(orderId));
        } catch (AppException exception) {
            writeError(response, exception);
        } catch (RuntimeException exception) {
            getServletContext().log("Admin order reconcile failed", exception);
            internalError(response);
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            String path = OrderServlet.normalizedPath(request);
            if (path.isEmpty()) {
                JsonUtil.write(response, HttpServletResponse.SC_OK, orderService.findAllOrders());
                return;
            }
            Integer orderId = OrderServlet.singleId(path);
            if (orderId == null) {
                notFound(response);
                return;
            }
            JsonUtil.write(response, HttpServletResponse.SC_OK, orderService.findOrderForAdmin(orderId));
        } catch (AppException exception) {
            writeError(response, exception);
        } catch (RuntimeException exception) {
            getServletContext().log("Admin order query failed", exception);
            internalError(response);
        }
    }

    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            Integer orderId = OrderServlet.actionId(OrderServlet.normalizedPath(request), "status");
            if (orderId == null) {
                notFound(response);
                return;
            }
            OrderStatusUpdateRequest body = JsonUtil.read(request, OrderStatusUpdateRequest.class);
            JsonUtil.write(response, HttpServletResponse.SC_OK,
                    orderService.updateStatusForAdmin(orderId, body == null ? null : body.status()));
        } catch (AppException exception) {
            writeError(response, exception);
        } catch (IOException exception) {
            JsonUtil.write(response, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("code", "INVALID_JSON", "message", "JSON request không hợp lệ."));
        } catch (RuntimeException exception) {
            getServletContext().log("Admin order update failed", exception);
            internalError(response);
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
