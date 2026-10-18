package com.pcstore.dao;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.function.Function;

import com.pcstore.config.PersistenceManager;
import com.pcstore.entity.PasswordResetChallenge;
import com.pcstore.entity.User;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.util.PasswordUtil;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.LockModeType;

public class PasswordRecoveryDAO {
    private final EntityManagerFactory factory;

    public PasswordRecoveryDAO() {
        this(PersistenceManager.get());
    }

    public PasswordRecoveryDAO(EntityManagerFactory factory) {
        this.factory = factory;
    }

    public boolean storeOtp(String email, String hash, Instant expiresAt) {
        return transaction(em -> {
            User user = lockUser(em, email);
            if (user == null || user.getStatus() != UserStatus.ACTIVE) {
                return false;
            }
            PasswordResetChallenge existing = em.find(PasswordResetChallenge.class, user.getUserId());
            PasswordResetChallenge challenge = existing == null
                    ? new PasswordResetChallenge(user.getUserId()) : existing;
            challenge.setOtpHash(hash);
            challenge.setOtpExpiresAt(expiresAt);
            challenge.setAttempts(0);
            challenge.setTokenHash(null);
            challenge.setTokenExpiresAt(null);
            challenge.setAuthVersion(user.getAuthVersion());
            if (existing == null) {
                em.persist(challenge);
            }
            return true;
        });
    }

    public boolean verifyOtp(String email, String otp, String tokenHash, Instant now, Instant tokenExpiresAt) {
        return transaction(em -> {
            User user = lockUser(em, email);
            PasswordResetChallenge challenge = activeChallenge(em, user);
            if (challenge == null || challenge.getOtpHash() == null || challenge.getAttempts() >= 5
                    || !now.isBefore(challenge.getOtpExpiresAt())) {
                return false;
            }
            if (!PasswordUtil.verify(otp, challenge.getOtpHash())) {
                challenge.setAttempts(challenge.getAttempts() + 1);
                if (challenge.getAttempts() >= 5) {
                    challenge.setOtpHash(null);
                }
                return false; // Failed attempts must be committed.
            }
            challenge.setOtpHash(null);
            challenge.setTokenHash(tokenHash);
            challenge.setTokenExpiresAt(tokenExpiresAt);
            return true;
        });
    }

    public boolean resetPassword(String email, String tokenHash, String passwordHash, Instant now) {
        return transaction(em -> {
            User user = lockUser(em, email);
            PasswordResetChallenge challenge = activeChallenge(em, user);
            if (challenge == null || challenge.getTokenHash() == null || challenge.getTokenExpiresAt() == null
                    || !now.isBefore(challenge.getTokenExpiresAt())
                    || !MessageDigest.isEqual(tokenHash.getBytes(StandardCharsets.US_ASCII),
                            challenge.getTokenHash().getBytes(StandardCharsets.US_ASCII))) {
                return false;
            }
            user.setPasswordHash(passwordHash);
            user.setAuthVersion(user.getAuthVersion() + 1);
            em.remove(challenge);
            return true;
        });
    }

    public void revokeFailedDelivery(String email, String expectedHash) {
        transaction(em -> {
            User user = lockUser(em, email);
            PasswordResetChallenge challenge = user == null ? null : em.find(PasswordResetChallenge.class, user.getUserId());
            if (challenge != null && expectedHash.equals(challenge.getOtpHash())) {
                em.remove(challenge);
            }
            return null;
        });
    }

    public boolean consumeLimit(String key, Instant now, int seconds, int limit) {
        return transaction(em -> {
            em.createNativeQuery("DELETE FROM auth_rate_limits WHERE expires_at < :cutoff")
                    .setParameter("cutoff", now.minusSeconds(86400)).executeUpdate();
            return em.createNativeQuery("""
                    INSERT INTO auth_rate_limits(bucket_key, expires_at, request_count) VALUES (:key, :expiry, 1)
                    ON CONFLICT (bucket_key) DO UPDATE SET
                    expires_at = CASE WHEN auth_rate_limits.expires_at <= :now THEN :expiry ELSE auth_rate_limits.expires_at END,
                    request_count = CASE WHEN auth_rate_limits.expires_at <= :now THEN 1 ELSE auth_rate_limits.request_count + 1 END
                    WHERE auth_rate_limits.expires_at <= :now OR auth_rate_limits.request_count < :limit
                    """).setParameter("key", key).setParameter("now", now)
                    .setParameter("expiry", now.plusSeconds(seconds)).setParameter("limit", limit)
                    .executeUpdate() == 1;
        });
    }

    private User lockUser(EntityManager em, String email) {
        return em.createQuery("SELECT u FROM User u WHERE u.email = :email", User.class)
                .setParameter("email", email).setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .getResultStream().findFirst().orElse(null);
    }

    private PasswordResetChallenge activeChallenge(EntityManager em, User user) {
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            return null;
        }
        PasswordResetChallenge challenge = em.find(PasswordResetChallenge.class, user.getUserId());
        return challenge != null && challenge.getAuthVersion() == user.getAuthVersion() ? challenge : null;
    }

    private <T> T transaction(Function<EntityManager, T> action) {
        try (EntityManager em = factory.createEntityManager()) {
            em.getTransaction().begin();
            try {
                T result = action.apply(em);
                em.getTransaction().commit();
                return result;
            } catch (RuntimeException error) {
                if (em.getTransaction().isActive()) {
                    em.getTransaction().rollback();
                }
                throw error;
            }
        }
    }
}
