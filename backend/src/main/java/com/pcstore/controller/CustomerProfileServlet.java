package com.pcstore.controller;

import java.io.IOException;
import java.util.Map;

import com.pcstore.dto.AuthResponse;
import com.pcstore.dto.ChangePasswordRequest;
import com.pcstore.dto.UpdateProfileRequest;
import com.pcstore.exception.AppException;
import com.pcstore.service.AuthService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet(name = "customerProfileServlet", urlPatterns = {"/api/customer/profile", "/api/customer/change-password"})
public class CustomerProfileServlet extends HttpServlet {
    private AuthService authService;

    @Override
    public void init() {
        authService = new AuthService();
    }

    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        if ("PATCH".equalsIgnoreCase(req.getMethod())) {
            doPatch(req, resp);
            return;
        }
        super.service(req, resp);
    }

    protected void doPatch(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            Integer userId = SessionUtil.userId(req);
            if (userId == null) {
                JsonUtil.write(resp, 401, Map.of("code", "UNAUTHORIZED", "message", "Bạn cần đăng nhập."));
                return;
            }
            String path = req.getRequestURI().substring(req.getContextPath().length());
            if ("/api/customer/profile".equals(path)) {
                UpdateProfileRequest body = JsonUtil.read(req, UpdateProfileRequest.class);
                AuthResponse updated = authService.updateProfile(userId, body);
                JsonUtil.write(resp, 200, updated);
            } else {
                JsonUtil.write(resp, 404, Map.of("code", "NOT_FOUND", "message", "Không tìm thấy endpoint."));
            }
        } catch (AppException e) {
            JsonUtil.write(resp, e.getStatus(), Map.of("code", e.getCode(), "message", e.getMessage()));
        } catch (IOException e) {
            JsonUtil.write(resp, 400, Map.of("code", "INVALID_JSON", "message", "JSON request không hợp lệ."));
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            Integer userId = SessionUtil.userId(req);
            if (userId == null) {
                JsonUtil.write(resp, 401, Map.of("code", "UNAUTHORIZED", "message", "Bạn cần đăng nhập."));
                return;
            }
            String path = req.getRequestURI().substring(req.getContextPath().length());
            if ("/api/customer/change-password".equals(path)) {
                ChangePasswordRequest body = JsonUtil.read(req, ChangePasswordRequest.class);
                authService.changePassword(userId, body);
                JsonUtil.write(resp, 200, Map.of("message", "Đổi mật khẩu thành công."));
            } else {
                JsonUtil.write(resp, 404, Map.of("code", "NOT_FOUND", "message", "Không tìm thấy endpoint."));
            }
        } catch (AppException e) {
            JsonUtil.write(resp, e.getStatus(), Map.of("code", e.getCode(), "message", e.getMessage()));
        } catch (IOException e) {
            JsonUtil.write(resp, 400, Map.of("code", "INVALID_JSON", "message", "JSON request không hợp lệ."));
        }
    }
}
