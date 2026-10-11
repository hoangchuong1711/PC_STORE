package com.pcstore.controller;

import java.io.IOException;
import java.util.Map;

import com.pcstore.dto.AdminUserDto;
import com.pcstore.dto.UpdateUserStatusRequest;
import com.pcstore.exception.AppException;
import com.pcstore.service.AdminUserService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet(name = "adminUserServlet", urlPatterns = {"/api/admin/users", "/api/admin/users/*"})
public class AdminUserServlet extends HttpServlet {
    private AdminUserService adminUserService;

    public AdminUserServlet() {
    }

    public AdminUserServlet(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @Override
    public void init() {
        if (adminUserService == null) {
            adminUserService = new AdminUserService();
        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            String path = OrderServlet.normalizedPath(request);
            if (path.isEmpty()) {
                String role = request.getParameter("role");
                String status = request.getParameter("status");
                String query = request.getParameter("query");
                int offset = parsePositive(request.getParameter("offset"), 0);
                int limit = parsePositive(request.getParameter("limit"), 50);

                var users = adminUserService.listUsers(role, status, query, offset, limit);
                JsonUtil.write(response, HttpServletResponse.SC_OK, users);
                return;
            }
            notFound(response);
        } catch (AppException exception) {
            writeError(response, exception);
        } catch (RuntimeException exception) {
            getServletContext().log("Admin user query failed", exception);
            internalError(response);
        }
    }

    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response) throws IOException {
        try {
            String path = OrderServlet.normalizedPath(request);
            Integer userId = OrderServlet.actionId(path, "status");
            if (userId == null) {
                userId = OrderServlet.singleId(path);
            }
            if (userId == null) {
                notFound(response);
                return;
            }

            Integer adminUserId = SessionUtil.userId(request);
            if (adminUserId == null) {
                JsonUtil.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                        Map.of("code", "UNAUTHORIZED", "message", "Bạn cần đăng nhập quản trị viên."));
                return;
            }

            UpdateUserStatusRequest body = JsonUtil.read(request, UpdateUserStatusRequest.class);
            AdminUserDto updated = adminUserService.updateUserStatus(adminUserId, userId, body);
            JsonUtil.write(response, HttpServletResponse.SC_OK, updated);
        } catch (AppException exception) {
            writeError(response, exception);
        } catch (IOException exception) {
            JsonUtil.write(response, HttpServletResponse.SC_BAD_REQUEST,
                    Map.of("code", "INVALID_JSON", "message", "JSON request không hợp lệ."));
        } catch (RuntimeException exception) {
            getServletContext().log("Admin user status update failed", exception);
            internalError(response);
        }
    }

    private static int parsePositive(String raw, int defaultValue) {
        if (raw == null || raw.isBlank()) return defaultValue;
        try {
            int parsed = Integer.parseInt(raw.trim());
            return Math.max(0, parsed);
        } catch (NumberFormatException e) {
            return defaultValue;
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
