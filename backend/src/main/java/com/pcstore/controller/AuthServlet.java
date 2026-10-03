package com.pcstore.controller;

import com.pcstore.dto.AuthResponse;
import com.pcstore.dto.LoginRequest;
import com.pcstore.dto.RegisterRequest;
import com.pcstore.exception.AppException;
import com.pcstore.service.AuthService;
import com.pcstore.service.impl.AuthServiceImpl;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

@WebServlet(name = "authServlet", urlPatterns = "/api/auth/*")
public class AuthServlet extends HttpServlet {
    private AuthService authService;
    @Override public void init() { authService = new AuthServiceImpl(); }

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            String path = req.getPathInfo();
            if ("/register".equals(path)) {
                RegisterRequest body = JsonUtil.read(req, RegisterRequest.class);
                JsonUtil.write(resp, HttpServletResponse.SC_CREATED, authService.register(body));
            } else if ("/login".equals(path)) {
                AuthResponse user = authService.login(JsonUtil.read(req, LoginRequest.class));
                SessionUtil.login(req, user.userId(), user.role());
                JsonUtil.write(resp, HttpServletResponse.SC_OK, user);
            } else if ("/logout".equals(path)) {
                SessionUtil.logout(req);
                resp.addHeader("Set-Cookie", "JSESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
                resp.setStatus(HttpServletResponse.SC_NO_CONTENT);
            } else {
                JsonUtil.write(resp, HttpServletResponse.SC_NOT_FOUND, Map.of("code", "NOT_FOUND", "message", "Không tìm thấy endpoint."));
            }
        } catch (AppException e) {
            JsonUtil.write(resp, e.getStatus(), Map.of("code", e.getCode(), "message", e.getMessage()));
        } catch (IOException e) {
            JsonUtil.write(resp, 400, Map.of("code", "INVALID_JSON", "message", "JSON request không hợp lệ."));
        }
    }

    @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (!"/me".equals(req.getPathInfo())) {
            JsonUtil.write(resp, 404, Map.of("code", "NOT_FOUND", "message", "Không tìm thấy endpoint."));
            return;
        }
        try {
            Integer id = SessionUtil.userId(req);
            if (id == null) throw new com.pcstore.exception.UnauthorizedException("Bạn cần đăng nhập.");
            JsonUtil.write(resp, 200, authService.findById(id));
        } catch (AppException e) { JsonUtil.write(resp, e.getStatus(), Map.of("code", e.getCode(), "message", e.getMessage())); }
    }
}
