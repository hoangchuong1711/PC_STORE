package com.pcstore.service;

import java.util.Locale;
import java.util.regex.Pattern;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.UserDAO;
import com.pcstore.dao.impl.UserDAOImpl;
import com.pcstore.dto.AuthResponse;
import com.pcstore.dto.LoginRequest;
import com.pcstore.dto.RegisterRequest;
import com.pcstore.entity.User;
import com.pcstore.entity.enums.UserRole;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.exception.AppException;
import com.pcstore.exception.UnauthorizedException;
import com.pcstore.exception.ValidationException;
import com.pcstore.util.PasswordUtil;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;

public class AuthService {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^(0|\\+84)[35789]\\d{8}$");
    private final UserDAO userDAO;

    public AuthService() { this(new UserDAOImpl()); }
    public AuthService(UserDAO userDAO) { this.userDAO = userDAO; }

    public static String validateAndCleanPhone(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            return null;
        }
        String cleanPhone = rawPhone.trim().replaceAll("[\\s.-]", "");
        if (!PHONE_PATTERN.matcher(cleanPhone).matches()) {
            throw new ValidationException("Số điện thoại không đúng định dạng Việt Nam (Ví dụ: 0901234567 hoặc +84901234567).");
        }
        return cleanPhone;
    }

    // Đăng ký tài khoản mới
    public AuthResponse register(RegisterRequest request) {
        if (request == null) throw new ValidationException("Request không hợp lệ.");
        String name = clean(request.fullName());
        String email = normalizeEmail(request.email());
        String password = request.password();
        String phone = validateAndCleanPhone(request.phone());
        if (name == null || name.length() > 255) throw new ValidationException("Họ tên là bắt buộc và tối đa 255 ký tự.");
        if (email == null || email.length() > 254 || !EMAIL.matcher(email).matches()) throw new ValidationException("Email không hợp lệ.");
        if (password == null || password.length() < 8 || password.length() > 128) throw new ValidationException("Mật khẩu phải dài từ 8 đến 128 ký tự.");

        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            try {
                em.getTransaction().begin();
                if (userDAO.findByEmail(em, email).isPresent()) throw new AppException(409, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng.");
                // tạo tài khoản mới
                User user = new User();
                user.setFullName(name); user.setEmail(email); user.setPasswordHash(PasswordUtil.hash(password));
                user.setPhone(phone); user.setRole(UserRole.CUSTOMER); user.setStatus(UserStatus.ACTIVE);
                // lưu vào cơ sở dữ liệu
                userDAO.save(em, user);
                em.getTransaction().commit();
                // trả về thông tin người dùng
                return AuthResponse.from(user);
            } catch (PersistenceException exception) {
                // rollback nếu có lỗi xảy ra
                if (em.getTransaction().isActive()) em.getTransaction().rollback();
                // kiểm tra lỗi trùng lặp email
                if (hasSqlState(exception, "23505"))
                    throw new AppException(409, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng.");
                throw new AppException(500, "PERSISTENCE_ERROR", "Không thể tạo tài khoản lúc này.");
            } finally { em.close(); }
        }
    }

    // Đăng nhập
    public AuthResponse login(LoginRequest request) {
        if (request == null || request.password() == null) throw new ValidationException("Email và mật khẩu là bắt buộc.");
        String email = normalizeEmail(request.email());
        if (email == null || email.length() > 254) throw new UnauthorizedException("Email hoặc mật khẩu không đúng.");
        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            User user = userDAO.findByEmail(em, email).orElseThrow(() -> new UnauthorizedException("Email hoặc mật khẩu không đúng."));
            if (user.getStatus() != UserStatus.ACTIVE)
                throw new AppException(403, "ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
            if (!PasswordUtil.verify(request.password(), user.getPasswordHash()))
                throw new UnauthorizedException("Email hoặc mật khẩu không đúng.");
            return AuthResponse.from(user);
        }
    }

    // Lấy thông tin người dùng theo ID
    public AuthResponse findById(int userId) {
        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            User user = userDAO.findById(em, userId).orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ."));
            if (user.getStatus() != UserStatus.ACTIVE) throw new AppException(403, "ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa.");
            return AuthResponse.from(user);
        }
    }

    public AuthResponse updateProfile(int userId, com.pcstore.dto.UpdateProfileRequest request) {
        if (request == null) throw new ValidationException("Request không hợp lệ.");
        String name = clean(request.fullName());
        String phone = validateAndCleanPhone(request.phone());
        if (name == null || name.length() > 255)
            throw new ValidationException("Họ tên là bắt buộc và tối đa 255 ký tự.");

        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            em.getTransaction().begin();
            try {
                User user = userDAO.findById(em, userId)
                        .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ."));
                if (user.getStatus() != UserStatus.ACTIVE)
                    throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa.");
                user.setFullName(name);
                user.setPhone(phone);
                em.getTransaction().commit();
                return AuthResponse.from(user);
            } catch (RuntimeException e) {
                if (em.getTransaction().isActive()) em.getTransaction().rollback();
                throw e;
            }
        }
    }

    public void changePassword(int userId, com.pcstore.dto.ChangePasswordRequest request) {
        if (request == null || request.oldPassword() == null || request.newPassword() == null)
            throw new ValidationException("Vui lòng cung cấp mật khẩu cũ và mật khẩu mới.");
        String newPass = request.newPassword();
        if (newPass.length() < 6 || newPass.length() > 128)
            throw new ValidationException("Mật khẩu mới phải có từ 6 đến 128 ký tự.");

        try (EntityManager em = PersistenceManager.get().createEntityManager()) {
            em.getTransaction().begin();
            try {
                User user = userDAO.findById(em, userId)
                        .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không còn hợp lệ."));
                if (user.getStatus() != UserStatus.ACTIVE)
                    throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa.");
                if (!PasswordUtil.verify(request.oldPassword(), user.getPasswordHash()))
                    throw new AppException(400, "INVALID_OLD_PASSWORD", "Mật khẩu hiện tại không chính xác.");
                user.setPasswordHash(PasswordUtil.hash(newPass));
                em.getTransaction().commit();
            } catch (RuntimeException e) {
                if (em.getTransaction().isActive()) em.getTransaction().rollback();
                throw e;
            }
        }
    }

    // Chuẩn hóa email
    private static String normalizeEmail(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT); 
    }

    // Xóa khoảng trắng thừa và trả về null nếu chuỗi rỗng
    private static String clean(String value) {
        if (value == null) return null;
        String s = value.trim();
        return s.isEmpty() ? null : s;
    }
    // Kiểm tra xem lỗi có phải là lỗi SQLState cụ thể không
    private static boolean hasSqlState(Throwable error, String state) {
        for (Throwable cause = error; cause != null; cause = cause.getCause())
            if (cause instanceof java.sql.SQLException sql && state.equals(sql.getSQLState())) return true;
        return false;
    }
}
