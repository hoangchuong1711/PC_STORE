package com.pcstore.service;

import com.pcstore.dao.UserDAO;
import com.pcstore.dto.AuthResponse;
import com.pcstore.dto.ChangePasswordRequest;
import com.pcstore.dto.LoginRequest;
import com.pcstore.dto.RegisterRequest;
import com.pcstore.dto.UpdateProfileRequest;
import com.pcstore.entity.User;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.exception.AppException;
import com.pcstore.exception.UnauthorizedException;
import com.pcstore.exception.ValidationException;
import com.pcstore.util.PasswordUtil;
import java.util.logging.Logger;

public class AuthService {
    private static final Logger LOG = Logger.getLogger(AuthService.class.getName());
    public record LoginResult(AuthResponse user, long authVersion) { }

    private final UserDAO userDAO;
    private final BrevoEmailSender mail;

    public AuthService() {
        this(new UserDAO(), BrevoEmailSender.fromEnvironment());
    }

    public AuthService(UserDAO userDAO) {
        this(userDAO, BrevoEmailSender.fromEnvironment());
    }

    public AuthService(UserDAO userDAO, BrevoEmailSender mail) {
        this.userDAO = userDAO;
        this.mail = mail;
    }

    // Đăng ký tài khoản mới cho khách hàng
    public AuthResponse register(RegisterRequest request) {
        if (request == null) {
            throw new ValidationException("Request không hợp lệ.");
        }

        String name = null;
        if (request.fullName() != null) {
            name = request.fullName().trim();
        }

        String email = null;
        if (request.email() != null) {
            email = request.email().trim().toLowerCase();
        }

        String password = request.password();

        String phone = null;
        if (request.phone() != null) {
            phone = request.phone().trim();
        }

        if (name == null || name.isEmpty()) {
            throw new ValidationException("Họ và tên là bắt buộc.");
        }
        if (email == null || email.isEmpty() || !email.contains("@")) {
            throw new ValidationException("Email không hợp lệ.");
        }
        if (!PasswordUtil.isValidLength(password)) {
            throw new ValidationException("Mật khẩu phải dài từ 8 đến 128 ký tự.");
        }

        // Kiểm tra email đã tồn tại hay chưa
        if (userDAO.existsByEmail(email)) {
            throw new AppException(409, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng.");
        }

        // Băm mật khẩu và lưu qua DAO
        String passwordHash = PasswordUtil.hash(password);
        User user = userDAO.createCustomer(name, email, passwordHash, phone);

        // Gửi email chào mừng sau khi tài khoản đã được lưu.
        try {
            mail.welcome(email, name);
        } catch (RuntimeException error) {
            LOG.warning("Welcome email delivery failed; account remains registered.");
        }

        return AuthResponse.from(user);
    }

    // Đăng nhập
    public LoginResult login(LoginRequest request) {
        if (request == null || request.email() == null || request.password() == null) {
            throw new ValidationException("Email và mật khẩu là bắt buộc.");
        }

        String email = request.email().trim().toLowerCase();
        User user = userDAO.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Email hoặc mật khẩu không đúng."));

        // Kiểm tra tài khoản có bị khóa không
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(403, "ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        // Kiểm tra mật khẩu
        if (!PasswordUtil.verify(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Email hoặc mật khẩu không đúng.");
        }

        return new LoginResult(AuthResponse.from(user), user.getAuthVersion());
    }

    // Lấy thông tin người dùng theo ID
    public AuthResponse findById(int userId) {
        User user = userDAO.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ."));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(403, "ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa.");
        }

        return AuthResponse.from(user);
    }

    // Cập nhật thông tin cá nhân
    public AuthResponse updateProfile(int userId, UpdateProfileRequest request) {
        if (request == null) {
            throw new ValidationException("Request không hợp lệ.");
        }

        String name = null;
        if (request.fullName() != null) {
            name = request.fullName().trim();
        }

        String phone = null;
        if (request.phone() != null) {
            phone = request.phone().trim();
        }

        if (name == null || name.isEmpty()) {
            throw new ValidationException("Họ và tên là bắt buộc.");
        }

        User user = userDAO.updateProfile(userId, name, phone)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ."));

        return AuthResponse.from(user);
    }

    // Đổi mật khẩu
    public void changePassword(int userId, ChangePasswordRequest request) {
        if (request == null || request.oldPassword() == null || request.newPassword() == null) {
            throw new ValidationException("Vui lòng cung cấp mật khẩu cũ và mật khẩu mới.");
        }

        String newPass = request.newPassword();
        if (!PasswordUtil.isValidLength(newPass)) {
            throw new ValidationException("Mật khẩu mới phải dài từ 8 đến 128 ký tự.");
        }

        User user = userDAO.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ."));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa.");
        }

        if (!PasswordUtil.verify(request.oldPassword(), user.getPasswordHash())) {
            throw new AppException(400, "INVALID_OLD_PASSWORD", "Mật khẩu hiện tại không chính xác.");
        }

        if (!userDAO.updatePasswordIfCurrent(userId, user.getPasswordHash(), PasswordUtil.hash(newPass))) {
            throw new UnauthorizedException("Phiên đăng nhập không còn hợp lệ.");
        }
    }
}
