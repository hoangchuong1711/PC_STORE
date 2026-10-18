package com.pcstore.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.logging.Logger;

import com.pcstore.dao.PasswordRecoveryDAO;
import com.pcstore.exception.AppException;
import com.pcstore.exception.ValidationException;
import com.pcstore.util.PasswordUtil;

public final class PasswordRecoveryService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Logger LOG = Logger.getLogger(PasswordRecoveryService.class.getName());
    private final BrevoEmailSender mail;
    private final Clock clock;
    private final PasswordRecoveryDAO dao;

    public PasswordRecoveryService(PasswordRecoveryDAO dao, BrevoEmailSender mail, Clock clock) {
        this.dao = dao;
        this.mail = mail;
        this.clock = clock;
    }

    public void request(String rawEmail) {
        String email = email(rawEmail);
        if (!mail.isConfigured()) {
            throw new AppException(503, "MAIL_UNAVAILABLE", "Dịch vụ email chưa sẵn sàng. Vui lòng thử lại sau.");
        }

        // Mỗi email chỉ được yêu cầu một mã trong một phút.
        if (!dao.consumeLimit(digest("request-email-minute:" + email), clock.instant(), 60, 1)) {
            throw new AppException(429, "RATE_LIMITED", "Bạn thao tác quá nhanh. Vui lòng chờ 60 giây trước khi yêu cầu mã mới.");
        }

        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        String hash = PasswordUtil.hash(code);

        if (dao.storeOtp(email, hash, clock.instant().plusSeconds(300))) {
            try {
                mail.otp(email, code);
            } catch (RuntimeException error) {
                LOG.warning("Password reset email delivery failed; challenge revoked. Check provider logs.");
                dao.revokeFailedDelivery(email, hash);
            }
        }
    }

    public String verify(String rawEmail, String otp) {
        String email = email(rawEmail);
        if (otp == null || !otp.matches("[0-9]{6}")) {
            throw invalidOtp();
        }
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        if (!dao.verifyOtp(email, otp, digest(token), clock.instant(), clock.instant().plusSeconds(300))) {
            throw invalidOtp();
        }
        return token;
    }

    public void reset(String rawEmail, String token, String password) {
        String email = email(rawEmail);
        if (!PasswordUtil.isValidLength(password)) {
            throw new ValidationException("Mật khẩu phải dài từ 8 đến 128 ký tự.");
        }
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) {
            throw invalidToken();
        }
        if (!dao.resetPassword(email, digest(token), PasswordUtil.hash(password), clock.instant())) {
            throw invalidToken();
        }
        try {
            mail.passwordChanged(email);
        } catch (RuntimeException error) {
            LOG.warning("Password changed notification failed. Check provider logs.");
        }
    }

    private static String email(String raw) {
        String result = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (result.length() > 254 || !result.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ValidationException("Email không hợp lệ.");
        }
        return result;
    }
    private static String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }
    private static AppException invalidOtp() {
        return new AppException(400, "INVALID_OTP", "Mã OTP không đúng, đã hết hạn hoặc đã sử dụng. Vui lòng yêu cầu mã mới nếu cần.");
    }

    private static AppException invalidToken() {
        return new AppException(400, "INVALID_RESET_TOKEN", "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.");
    }
}
