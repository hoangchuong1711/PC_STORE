package com.pcstore.controller;

import java.io.IOException;
import java.util.Map;

import com.pcstore.dto.AuthResponse;
import com.pcstore.dto.LoginRequest;
import com.pcstore.dto.RegisterRequest;
import com.pcstore.exception.AppException;
import com.pcstore.service.AuthService;
import com.pcstore.service.PasswordRecoveryService;
import com.pcstore.service.BrevoEmailSender;
import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.ForgotPasswordRequest;
import com.pcstore.dto.VerifyResetOtpRequest;
import com.pcstore.dto.ResetPasswordRequest;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet(name = "authServlet", urlPatterns = "/api/auth/*")
public class AuthServlet extends HttpServlet {
    private AuthService authService;
    private final com.pcstore.service.EmailSender mail;
    public AuthServlet() { this(BrevoEmailSender.fromEnvironment()); }
    public AuthServlet(com.pcstore.service.EmailSender mail) { this.mail = mail; }
    @Override public void init() { authService = new AuthService(new com.pcstore.dao.impl.UserDAOImpl(), PersistenceManager::get, mail); }

    @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        try {
            String path = req.getPathInfo();
            if ("/register".equals(path)) {
                RegisterRequest body = JsonUtil.read(req, RegisterRequest.class);
                JsonUtil.write(resp, HttpServletResponse.SC_CREATED, authService.register(body));
            } else if ("/login".equals(path)) {
                AuthResponse user = authService.login(JsonUtil.read(req, LoginRequest.class));
                SessionUtil.login(req, user.userId(), user.role(), user.authVersion());
                JsonUtil.write(resp, HttpServletResponse.SC_OK, user);
            } else if ("/forgot-password".equals(path)) {
                var body = JsonUtil.read(req, ForgotPasswordRequest.class);
                recovery().request(body == null ? null : body.email(), req.getRemoteAddr());
                JsonUtil.write(resp, 200, Map.of("message", "Nếu email đã được đăng ký và tài khoản đang hoạt động, bạn sẽ nhận được mã OTP. Vui lòng kiểm tra cả thư mục Spam."));
            } else if ("/verify-reset-otp".equals(path)) {
                var body = JsonUtil.read(req, VerifyResetOtpRequest.class);
                if (body == null) throw new com.pcstore.exception.ValidationException("Request không hợp lệ.");
                String token = recovery().verify(body.email(), body.otp(), req.getRemoteAddr());
                JsonUtil.write(resp, 200, Map.of("resetToken", token));
            } else if ("/reset-password".equals(path)) {
                var body = JsonUtil.read(req, ResetPasswordRequest.class);
                if (body == null) throw new com.pcstore.exception.ValidationException("Request không hợp lệ.");
                recovery().reset(body.email(), body.resetToken(), body.newPassword(), req.getRemoteAddr());
                SessionUtil.logout(req);
                JsonUtil.write(resp, 200, Map.of("message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."));
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

    private PasswordRecoveryService recovery() {
        return new PasswordRecoveryService(PersistenceManager.get(), mail, java.time.Clock.systemUTC());
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
