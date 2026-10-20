package com.pcstore.controller;

import java.io.IOException;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import com.pcstore.dao.PasswordRecoveryDAO;
import com.pcstore.dao.UserDAO;
import com.pcstore.dto.ForgotPasswordRequest;
import com.pcstore.dto.LoginRequest;
import com.pcstore.dto.RegisterRequest;
import com.pcstore.dto.ResetPasswordRequest;
import com.pcstore.dto.VerifyResetOtpRequest;
import com.pcstore.exception.AppException;
import com.pcstore.exception.UnauthorizedException;
import com.pcstore.exception.ValidationException;
import com.pcstore.service.AuthService;
import com.pcstore.service.BrevoEmailSender;
import com.pcstore.service.PasswordRecoveryService;
import com.pcstore.util.JsonUtil;
import com.pcstore.util.SessionUtil;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet(name = "authServlet", urlPatterns = "/api/auth/*")
public class AuthServlet extends HttpServlet {
    private static final Logger LOG = Logger.getLogger(AuthServlet.class.getName());
    private AuthService authService;
    private final BrevoEmailSender mail;

    public AuthServlet() {
        this(BrevoEmailSender.fromEnvironment());
    }

    public AuthServlet(BrevoEmailSender mail) {
        this.mail = mail;
    }

    @Override
    public void init() {
        this.authService = new AuthService(new UserDAO(), mail);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        String path = req.getPathInfo();
        if (path == null) {
            path = "";
        }

        try {
            switch (path) {
                case "/register" -> {
                    RegisterRequest regBody = JsonUtil.read(req, RegisterRequest.class);
                    JsonUtil.write(resp, HttpServletResponse.SC_CREATED, authService.register(regBody));
                }

                case "/login" -> {
                    LoginRequest loginBody = JsonUtil.read(req, LoginRequest.class);
                    AuthService.LoginResult login = authService.login(loginBody);

                    // Lưu thông tin đăng nhập vào session
                    SessionUtil.login(req, login.user().userId(), login.user().role(), login.authVersion());
                    JsonUtil.write(resp, HttpServletResponse.SC_OK, login.user());
                }

                case "/forgot-password" -> {
                    ForgotPasswordRequest forgotBody = JsonUtil.read(req, ForgotPasswordRequest.class);
                    String email = null;

                    if (forgotBody != null) {
                        email = forgotBody.email();
                    }

                    // Gửi mã OTP đặt lại mật khẩu nếu email
                    recovery().request(email);
                    JsonUtil.write(resp, 200, Map.of("message", "Nếu email đã được đăng ký và tài khoản đang hoạt động, bạn sẽ nhận được mã OTP. Vui lòng kiểm tra cả thư mục Spam."));
                }

                case "/verify-reset-otp" -> {
                    VerifyResetOtpRequest otpBody = JsonUtil.read(req, VerifyResetOtpRequest.class);
                    if (otpBody == null) {
                        throw new ValidationException("Request không hợp lệ.");
                    }

                    // Xác thực OTP và nhận token đặt lại mật khẩu
                    String token = recovery().verify(otpBody.email(), otpBody.otp());
                    JsonUtil.write(resp, 200, Map.of("resetToken", token));
                }

                case "/reset-password" -> {
                    ResetPasswordRequest resetBody = JsonUtil.read(req, ResetPasswordRequest.class);
                    if (resetBody == null) {
                        throw new ValidationException("Request không hợp lệ.");
                    }

                    // Đặt lại mật khẩu và đăng xuất khỏi tất cả các phiên làm việc
                    recovery().reset(resetBody.email(), resetBody.resetToken(), resetBody.newPassword());
                    SessionUtil.logout(req);
                    JsonUtil.write(resp, 200, Map.of("message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."));
                }

                case "/logout" -> {
                    SessionUtil.logout(req);
                    resp.addHeader("Set-Cookie", "JSESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
                    resp.setStatus(HttpServletResponse.SC_NO_CONTENT);
                }

                default -> {
                    JsonUtil.write(resp, HttpServletResponse.SC_NOT_FOUND, Map.of("code", "NOT_FOUND", "message", "Không tìm thấy endpoint."));
                }
            }
        } catch (AppException e) {
            JsonUtil.write(resp, e.getStatus(), Map.of("code", e.getCode(), "message", e.getMessage()));
        } catch (IOException e) {
            JsonUtil.write(resp, 400, Map.of("code", "INVALID_JSON", "message", "JSON request không hợp lệ."));
        } catch (RuntimeException e) {
            LOG.log(Level.SEVERE, "Auth request failed", e);
            JsonUtil.write(resp, 500, Map.of("code", "INTERNAL_ERROR", "message", "Lỗi máy chủ nội bộ."));
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = req.getPathInfo();
        if (path == null) {
            path = "";
        }

        try {
            switch (path) {
                case "/me" -> {
                    Integer id = SessionUtil.userId(req);
                    if (id == null) {
                        throw new UnauthorizedException("Bạn cần đăng nhập.");
                    }
                    JsonUtil.write(resp, 200, authService.findById(id));
                }

                default -> {
                    JsonUtil.write(resp, 404, Map.of("code", "NOT_FOUND", "message", "Không tìm thấy endpoint."));
                }
            }
        } catch (AppException e) {
            JsonUtil.write(resp, e.getStatus(), Map.of("code", e.getCode(), "message", e.getMessage()));
        } catch (RuntimeException e) {
            LOG.log(Level.SEVERE, "Auth request failed", e);
            JsonUtil.write(resp, 500, Map.of("code", "INTERNAL_ERROR", "message", "Lỗi máy chủ nội bộ."));
        }
    }

    private PasswordRecoveryService recovery() {
        return new PasswordRecoveryService(new PasswordRecoveryDAO(), mail, java.time.Clock.systemUTC());
    }
}
