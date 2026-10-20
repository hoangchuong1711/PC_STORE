package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.impl.UserDAOImpl;
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
        service = new PasswordRecoveryService(factory, mail, clock);
        var registered = new AuthService(new UserDAOImpl(), () -> factory, mail)
                .register(new RegisterRequest("An <script>", "an@example.test", "old-password123", null));
        userId = registered.userId();
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
        var created = new AuthService(new UserDAOImpl(), () -> factory, mail)
                .register(new RegisterRequest("B", "b@example.test", "password123", null));
        try (var em = factory.createEntityManager()) { assertNotNull(em.find(User.class, created.userId())); }
    }

    @Test void otpThenSingleUseTokenChangesPasswordAndRevokesSessions() throws Exception {
        service.request(" AN@example.test ", "127.0.0.1");
        assertTrue(mail.otp.matches("[0-9]{6}"));
        try (var rs = connection.createStatement().executeQuery("SELECT otp_hash FROM password_reset_challenges")) {
            assertTrue(rs.next()); assertNotEquals(mail.otp, rs.getString(1));
        }
        String token = service.verify("an@example.test", mail.otp, "127.0.0.1");
        assertTrue(token.matches("[A-Za-z0-9_-]{43}"));
        assertThrows(AppException.class, () -> service.verify("an@example.test", mail.otp, "127.0.0.1"));
        assertThrows(AppException.class, () -> service.reset("an@example.test", "x".repeat(43), "new-password123", "127.0.0.1"));
        service.reset("an@example.test", token, "new-password123", "127.0.0.1");
        try (var em = factory.createEntityManager()) {
            User user = em.find(User.class, userId);
            assertTrue(PasswordUtil.verify("new-password123", user.getPasswordHash()));
            assertFalse(PasswordUtil.verify("old-password123", user.getPasswordHash()));
            assertEquals(1, user.getAuthVersion());
        }
        assertEquals(1, mail.changed);
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "another-password", "127.0.0.1"));
    }

    @Test void fifthWrongAttemptInvalidatesEvenCorrectOtp() {
        service.request("an@example.test", "ip1");
        String wrong = mail.otp.equals("000000") ? "000001" : "000000";
        for (int i = 0; i < 5; i++) assertThrows(AppException.class, () -> service.verify("an@example.test", wrong, "ip1"));
        assertThrows(AppException.class, () -> service.verify("an@example.test", mail.otp, "ip1"));
    }

    @Test void expiredOtpAndExpiredResetPermissionCannotBeUsed() {
        service.request("an@example.test", "ip1");
        clock.advance(300);
        assertThrows(AppException.class, () -> service.verify("an@example.test", mail.otp, "ip1"));
        service.request("an@example.test", "ip1");
        String token = service.verify("an@example.test", mail.otp, "ip1");
        clock.advance(300);
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "new-password123", "ip1"));
    }

    @Test void resendInvalidatesPreviousOtpAndTokenAndCooldownSurvivesNewService() {
        service.request("an@example.test", "ip1");
        String old = mail.otp;
        var another = new PasswordRecoveryService(factory, mail, clock);
        assertEquals(429, assertThrows(AppException.class, () -> another.request("an@example.test", "ip2")).getStatus());
        clock.advance(60);
        another.request("an@example.test", "ip2");
        // A resend creates a new hash even in the 1-in-a-million case of equal digits.
        if (!old.equals(mail.otp)) assertThrows(AppException.class, () -> service.verify("an@example.test", old, "ip1"));
        String token = service.verify("an@example.test", mail.otp, "ip1");
        clock.advance(60);
        service.request("an@example.test", "ip1");
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "new-password123", "ip1"));
    }

    @Test void unknownAndLockedEmailsDoNotSendOtpAndAreStillRateLimited() throws Exception {
        service.request("missing@example.test", "ip1");
        assertNull(mail.otp);
        assertEquals(429, assertThrows(AppException.class, () -> service.request("missing@example.test", "ip1")).getStatus());
        connection.createStatement().execute("UPDATE users SET status='INACTIVE' WHERE user_id=" + userId);
        service.request("an@example.test", "ip1");
        assertNull(mail.otp);
    }

    @Test void ipLimitAppliesAcrossDifferentEmailsAndEmailLimitAcrossDifferentIps() {
        for (int i = 0; i < 20; i++) service.request("missing" + i + "@example.test", "shared-ip");
        assertEquals(429, assertThrows(AppException.class, () -> service.request("other@example.test", "shared-ip")).getStatus());
        for (int i = 0; i < 5; i++) { service.request("an@example.test", "ip" + i); clock.advance(60); }
        assertEquals(429, assertThrows(AppException.class, () -> service.request("an@example.test", "ip6")).getStatus());
    }

    @Test void failedDeliveryDoesNotLeaveUsableChallengeAndDisabledMailIsExplicit() throws Exception {
        mail.fail = true;
        service.request("an@example.test", "ip1"); // Same generic response for existing and unknown email.
        try (var rs = connection.createStatement().executeQuery("SELECT count(*) FROM password_reset_challenges WHERE otp_hash IS NOT NULL")) {
            rs.next(); assertEquals(0, rs.getInt(1));
        }
        mail.enabled = false;
        assertEquals(503, assertThrows(AppException.class, () -> service.request("an@example.test", "ip2")).getStatus());
    }

    @Test void concurrentResetConsumesTokenExactlyOnce() throws Exception {
        service.request("an@example.test", "ip1");
        String token = service.verify("an@example.test", mail.otp, "ip1");
        var gate = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<Boolean> attempt = () -> { gate.await(); try {
                service.reset("an@example.test", token, "new-password123", "ip1"); return true;
            } catch (AppException e) { return false; } };
            var a = executor.submit(attempt); var b = executor.submit(attempt); gate.countDown();
            assertNotEquals(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS));
        }
    }

    @Test void tokenCannotResetAnotherAccountAndInvalidPasswordDoesNotConsumeIt() {
        service.request("an@example.test", "ip1");
        String token = service.verify("an@example.test", mail.otp, "ip1");
        assertThrows(AppException.class, () -> service.reset("other@example.test", token, "new-password123", "ip1"));
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "short", "ip1"));
        service.reset("an@example.test", token, "new-password123", "ip1");
    }

    @Test void successfulProfilePasswordChangeInvalidatesPendingRecovery() throws Exception {
        service.request("an@example.test", "ip1");
        String token = service.verify("an@example.test", mail.otp, "ip1");
        new AuthService(new UserDAOImpl(), () -> factory, mail).changePassword(userId,
                new com.pcstore.dto.ChangePasswordRequest("old-password123", "profile-password123"));
        assertThrows(AppException.class, () -> service.reset("an@example.test", token, "new-password123", "ip1"));
    }

    static class RecordingMail implements EmailSender {
        String otp; int welcomes; int changed; boolean fail; boolean enabled = true;
        public boolean enabled() { return enabled; }
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
