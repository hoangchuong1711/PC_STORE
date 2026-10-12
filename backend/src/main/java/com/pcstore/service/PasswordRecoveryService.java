package com.pcstore.service;

import com.pcstore.dao.PasswordRecoveryDAO;
import com.pcstore.entity.*;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.exception.*;
import com.pcstore.util.PasswordUtil;
import jakarta.persistence.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import java.util.logging.Logger;

public final class PasswordRecoveryService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Logger LOG = Logger.getLogger(PasswordRecoveryService.class.getName());
    private final EntityManagerFactory factory;
    private final EmailSender mail;
    private final Clock clock;
    private final PasswordRecoveryDAO dao = new PasswordRecoveryDAO();

    public PasswordRecoveryService(EntityManagerFactory factory, EmailSender mail, Clock clock) {
        this.factory = factory; this.mail = mail; this.clock = clock;
    }

    public void request(String rawEmail, String ip) {
        String email = email(rawEmail);
        if (!mail.enabled()) throw new AppException(503, "MAIL_UNAVAILABLE", "Dịch vụ email chưa sẵn sàng. Vui lòng thử lại sau.");
        limit("request-ip:" + ip, 3600, 20);
        limit("request-email-hour:" + email, 3600, 5);
        limit("request-email-minute:" + email, 60, 1);
        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        // Compute even for unknown addresses to avoid a trivial hashing-time enumeration signal.
        String hash = PasswordUtil.hash(code);
        Integer userId = null;
        try (var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            try {
                User user = dao.lockUser(em, email);
                if (user != null && user.getStatus() == UserStatus.ACTIVE) {
                    userId = user.getUserId();
                    var challenge = dao.find(em, userId);
                    boolean fresh = challenge == null;
                    if (fresh) challenge = new PasswordResetChallenge(userId);
                    challenge.setOtpHash(hash); challenge.setOtpExpiresAt(clock.instant().plusSeconds(300));
                    challenge.setAttempts(0); challenge.setTokenHash(null); challenge.setTokenExpiresAt(null);
                    challenge.setAuthVersion(user.getAuthVersion());
                    if (fresh) dao.save(em, challenge);
                }
                em.getTransaction().commit();
            } finally { rollback(em); }
        }
        if (userId != null) {
            try { mail.otp(email, code); }
            catch (RuntimeException error) {
                LOG.warning("Password reset email delivery failed; challenge revoked. Check provider logs.");
                revokeFailedDelivery(email, hash);
            }
        }
    }

    public String verify(String rawEmail, String otp, String ip) {
        String email = email(rawEmail);
        if (otp == null || !otp.matches("[0-9]{6}")) throw invalidOtp();
        limit("verify-ip:" + ip, 300, 60);
        try (var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            try {
                User user = dao.lockUser(em, email);
                var challenge = activeChallenge(em, user);
                if (challenge == null || challenge.getOtpHash() == null || challenge.getAttempts() >= 5
                        || !clock.instant().isBefore(challenge.getOtpExpiresAt())) throw invalidOtp();
                if (!PasswordUtil.verify(otp, challenge.getOtpHash())) {
                    challenge.setAttempts(challenge.getAttempts() + 1);
                    if (challenge.getAttempts() == 5) challenge.setOtpHash(null);
                    em.getTransaction().commit(); // Failed guesses must survive the error response.
                    throw invalidOtp();
                }
                byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
                String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
                challenge.setOtpHash(null); challenge.setTokenHash(digest(token));
                challenge.setTokenExpiresAt(clock.instant().plusSeconds(300));
                em.getTransaction().commit();
                return token;
            } finally { rollback(em); }
        }
    }

    public void reset(String rawEmail, String token, String password, String ip) {
        String email = email(rawEmail);
        if (password == null || password.length() < 8 || password.length() > 128)
            throw new ValidationException("Mật khẩu phải dài từ 8 đến 128 ký tự.");
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalidToken();
        limit("reset-ip:" + ip, 300, 60);
        try (var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            try {
                User user = dao.lockUser(em, email);
                var challenge = activeChallenge(em, user);
                if (challenge == null || challenge.getTokenHash() == null || challenge.getTokenExpiresAt() == null
                        || !clock.instant().isBefore(challenge.getTokenExpiresAt())
                        || !MessageDigest.isEqual(digest(token).getBytes(StandardCharsets.US_ASCII),
                            challenge.getTokenHash().getBytes(StandardCharsets.US_ASCII))) throw invalidToken();
                user.setPasswordHash(PasswordUtil.hash(password));
                user.setAuthVersion(user.getAuthVersion() + 1);
                dao.delete(em, challenge);
                em.getTransaction().commit();
            } finally { rollback(em); }
        }
        try { mail.passwordChanged(email); }
        catch (RuntimeException error) { LOG.warning("Password changed notification failed. Check provider logs."); }
    }

    private PasswordResetChallenge activeChallenge(EntityManager em, User user) {
        if (user == null || user.getStatus() != UserStatus.ACTIVE) return null;
        var challenge = dao.find(em, user.getUserId());
        return challenge != null && challenge.getAuthVersion() == user.getAuthVersion() ? challenge : null;
    }
    private void revokeFailedDelivery(String email, String expectedHash) {
        try (var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            try {
                User user = dao.lockUser(em, email);
                var challenge = user == null ? null : dao.find(em, user.getUserId());
                if (challenge != null && expectedHash.equals(challenge.getOtpHash())) dao.delete(em, challenge);
                em.getTransaction().commit();
            } finally { rollback(em); }
        }
    }
    private void limit(String bucket, int seconds, int max) {
        try (var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            boolean allowed;
            try {
                dao.cleanupLimits(em, clock.instant());
                allowed = dao.consume(em, digest(bucket), clock.instant(), seconds, max);
                em.getTransaction().commit();
            } finally { rollback(em); }
            if (!allowed) throw new AppException(429, "RATE_LIMITED", "Bạn thao tác quá nhanh. Vui lòng chờ ít nhất 60 giây; nếu vẫn bị giới hạn, thử lại sau một giờ.");
        }
    }
    private static void rollback(EntityManager em) { if (em.getTransaction().isActive()) em.getTransaction().rollback(); }
    private static String email(String raw) {
        String result = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (result.length() > 254 || !result.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw new ValidationException("Email không hợp lệ.");
        return result;
    }
    private static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
    private static AppException invalidOtp() { return new AppException(400, "INVALID_OTP", "Mã OTP không đúng, đã hết hạn hoặc đã sử dụng. Vui lòng yêu cầu mã mới nếu cần."); }
    private static AppException invalidToken() { return new AppException(400, "INVALID_RESET_TOKEN", "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới."); }
}
