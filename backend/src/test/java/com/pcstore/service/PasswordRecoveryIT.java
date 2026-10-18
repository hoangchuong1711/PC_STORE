package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.UserDAO;
import com.pcstore.dao.PasswordRecoveryDAO;
import com.pcstore.dto.RegisterRequest;
import com.pcstore.entity.User;
import com.pcstore.exception.AppException;
import com.pcstore.util.PasswordUtil;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class PasswordRecoveryIT {
    EntityManagerFactory factory;
    Connection connection;
    String schema;
    final TestClock clock = new TestClock();
    final RecordingMail mail = new RecordingMail();
    PasswordRecoveryService service;
    int userId;

    @BeforeEach void setup() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"));
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"));
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"));
        schema = "auth_" + UUID.randomUUID().toString().replace("-", "");
        connection = DriverManager.getConnection(url, user, password);
        connection.createStatement().execute("CREATE SCHEMA " + schema);
        connection.createStatement().execute("SET search_path TO " + schema);
        factory = PersistenceManager.createEntityManagerFactory(url + "?currentSchema=" + schema, user, password);
        service = new PasswordRecoveryService(new PasswordRecoveryDAO(factory), mail, clock);
        var registered = new AuthService(new UserDAO(() -> factory), mail)
                .register(new RegisterRequest("An <script>", "an@example.test", "old-password123", null));
        userId = registered.userId();
        try (var em = factory.createEntityManager()) {
            assertEquals(0, em.find(User.class, userId).getAuthVersion());
        }
    }

    @AfterEach void cleanup() throws Exception {
        if (factory != null) factory.close();
        if (connection != null) {
            if (schema != null && schema.matches("auth_[a-f0-9]{32}")) connection.createStatement().execute("DROP SCHEMA " + schema + " CASCADE");
            connection.close();
        }
    }

    @Test void registrationSendsWelcomeAfterCommitAndMailFailureDoesNotUndoAccount() {
        assertEquals(1, mail.welcomes);
        mail.fail = true;
        var created = new AuthService(new UserDAO(() -> factory), mail)
                .register(new RegisterRequest("B", "b@example.test", "password123", null));
        try (var em = factory.createEntityManager()) { assertNotNull(em.find(User.class, created.userId())); }
    }

    @Test void otpThenSingleUseTokenChangesPasswordAndRevokesSessions() throws Exception {
        service.request(" AN@example.test ");
        assertTrue(mail.otp.matches("[0-9]{6}"));
        try (var rs = connection.createStatement().executeQuery("SELECT otp_hash FROM password_reset_challenges")) {
            assertTrue(rs.next()); assertNotEquals(mail.otp, rs.getString(1));
        }
        String token = service.verify("an@example.test", mail.otp);
        assertTrue(token.matches("[A-Za-z0-9_-]{43}"));
        assertThrows(AppException.class, () -> service.verify("an@example.test", mail.otp));
        assertThrows(AppException.class, () -> service.reset("an@example.test", "x".repeat(43), "new-password123"));
        service.reset("an@example.test", token, "new-password123");
        try (var em = factory.createEntityManager()) {
            User user = em.find(User.class, userId);
            assertTrue(PasswordUtil.verify("new-password123", user.getPasswordHash()));
            assertFalse(PasswordUtil.verify("old-password123", user.getPasswordHash()));
            assertEquals(1, user.getAuthVersion());
        }
        assertEquals(1, mail.changed);
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "another-password"));
    }

    @Test void fifthWrongAttemptInvalidatesEvenCorrectOtp() {
        service.request("an@example.test");
        String wrong = mail.otp.equals("000000") ? "000001" : "000000";
        for (int i = 0; i < 5; i++) assertThrows(AppException.class, () -> service.verify("an@example.test", wrong));
        assertThrows(AppException.class, () -> service.verify("an@example.test", mail.otp));
    }

    @Test void expiredOtpAndExpiredResetPermissionCannotBeUsed() {
        service.request("an@example.test");
        clock.advance(300);
        assertThrows(AppException.class, () -> service.verify("an@example.test", mail.otp));
        service.request("an@example.test");
        String token = service.verify("an@example.test", mail.otp);
        clock.advance(300);
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "new-password123"));
    }

    @Test void resendInvalidatesPreviousOtpAndTokenAndCooldownSurvivesNewService() {
        service.request("an@example.test");
        String old = mail.otp;
        var another = new PasswordRecoveryService(new PasswordRecoveryDAO(factory), mail, clock);
        assertEquals(429, assertThrows(AppException.class, () -> another.request("an@example.test")).getStatus());
        clock.advance(60);
        another.request("an@example.test");
        // A resend creates a new hash even in the 1-in-a-million case of equal digits.
        if (!old.equals(mail.otp)) assertThrows(AppException.class, () -> service.verify("an@example.test", old));
        String token = service.verify("an@example.test", mail.otp);
        clock.advance(60);
        service.request("an@example.test");
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "new-password123"));
    }

    @Test void unknownAndLockedEmailsDoNotSendOtpAndAreStillRateLimited() throws Exception {
        service.request("missing@example.test");
        assertNull(mail.otp);
        assertEquals(429, assertThrows(AppException.class, () -> service.request("missing@example.test")).getStatus());
        connection.createStatement().execute("UPDATE users SET status='INACTIVE' WHERE user_id=" + userId);
        service.request("an@example.test");
        assertNull(mail.otp);
    }

    @Test void emailCooldownDoesNotBlockOtherEmailsOrRequestsAfterOneMinute() {
        service.request("an@example.test");
        assertEquals(429, assertThrows(AppException.class,
                () -> service.request("an@example.test")).getStatus());
        service.request("missing@example.test");
        clock.advance(60);
        for (int i = 0; i < 6; i++) {
            service.request("an@example.test");
            clock.advance(60);
        }
    }

    @Test void failedDeliveryDoesNotLeaveUsableChallengeAndDisabledMailIsExplicit() throws Exception {
        mail.fail = true;
        service.request("an@example.test"); // Same generic response for existing and unknown email.
        try (var rs = connection.createStatement().executeQuery("SELECT count(*) FROM password_reset_challenges WHERE otp_hash IS NOT NULL")) {
            rs.next(); assertEquals(0, rs.getInt(1));
        }
        mail.configured = false;
        assertEquals(503, assertThrows(AppException.class, () -> service.request("an@example.test")).getStatus());
    }

    @Test void concurrentResetConsumesTokenExactlyOnce() throws Exception {
        service.request("an@example.test");
        String token = service.verify("an@example.test", mail.otp);
        var gate = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<Boolean> attempt = () -> { gate.await(); try {
                service.reset("an@example.test", token, "new-password123"); return true;
            } catch (AppException e) { return false; } };
            var a = executor.submit(attempt); var b = executor.submit(attempt); gate.countDown();
            assertNotEquals(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS));
        }
    }

    @Test void tokenCannotResetAnotherAccountAndInvalidPasswordDoesNotConsumeIt() {
        service.request("an@example.test");
        String token = service.verify("an@example.test", mail.otp);
        assertThrows(AppException.class, () -> service.reset("other@example.test", token, "new-password123"));
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "short"));
        service.reset("an@example.test", token, "new-password123");
    }

    @Test void successfulProfilePasswordChangeInvalidatesPendingRecovery() throws Exception {
        service.request("an@example.test");
        String token = service.verify("an@example.test", mail.otp);
        new AuthService(new UserDAO(() -> factory), mail).changePassword(userId,
                new com.pcstore.dto.ChangePasswordRequest("old-password123", "profile-password123"));
        try (var rs = connection.createStatement().executeQuery("SELECT count(*) FROM password_reset_challenges WHERE user_id=" + userId)) {
            assertTrue(rs.next()); assertEquals(0, rs.getInt(1));
        }
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "new-password123"));
    }

    @Test void stalePasswordChangeCannotOverwriteANewerPassword() {
        String oldHash;
        try (var em = factory.createEntityManager()) {
            oldHash = em.find(User.class, userId).getPasswordHash();
        }
        UserDAO dao = new UserDAO(() -> factory);
        assertTrue(dao.updatePasswordIfCurrent(userId, oldHash, PasswordUtil.hash("first-password123")));
        assertFalse(dao.updatePasswordIfCurrent(userId, oldHash, PasswordUtil.hash("second-password123")));
        try (var em = factory.createEntityManager()) {
            User user = em.find(User.class, userId);
            assertTrue(PasswordUtil.verify("first-password123", user.getPasswordHash()));
            assertEquals(1, user.getAuthVersion());
        }
    }

    static class RecordingMail extends BrevoEmailSender {
        String otp; int welcomes; int changed; boolean fail; boolean configured = true;
        RecordingMail() {
            super("test-only-key", "sender@example.test", "PC Store", java.net.URI.create("http://127.0.0.1:1"));
        }
        @Override public boolean isConfigured() { return configured; }
        public void welcome(String email, String name) { if (fail) throw new IllegalStateException("mail unavailable"); welcomes++; }
        public void otp(String email, String code) { if (fail) throw new IllegalStateException("mail unavailable"); otp = code; }
        public void passwordChanged(String email) { if (fail) throw new IllegalStateException("mail unavailable"); changed++; }
    }
    static class TestClock extends Clock {
        Instant now = Instant.parse("2026-10-12T12:00:00Z");
        void advance(long seconds) { now = now.plusSeconds(seconds); }
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return now; }
    }
}
