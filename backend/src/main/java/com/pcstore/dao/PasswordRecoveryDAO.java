package com.pcstore.dao;

import com.pcstore.entity.*;
import jakarta.persistence.*;
import java.time.Instant;

public class PasswordRecoveryDAO {
    public User lockUser(EntityManager em, String email) {
        return em.createQuery("SELECT u FROM User u WHERE u.email = :email", User.class)
                .setParameter("email", email).setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .getResultStream().findFirst().orElse(null);
    }
    public PasswordResetChallenge find(EntityManager em, int userId) { return em.find(PasswordResetChallenge.class, userId); }
    public void save(EntityManager em, PasswordResetChallenge challenge) { em.persist(challenge); }
    public void delete(EntityManager em, PasswordResetChallenge challenge) { em.remove(challenge); }
    public boolean consume(EntityManager em, String key, Instant now, int seconds, int limit) {
        return em.createNativeQuery("""
                INSERT INTO auth_rate_limits(bucket_key, expires_at, request_count) VALUES (:key, :expiry, 1)
                ON CONFLICT (bucket_key) DO UPDATE SET
                  expires_at = CASE WHEN auth_rate_limits.expires_at <= :now THEN :expiry ELSE auth_rate_limits.expires_at END,
                  request_count = CASE WHEN auth_rate_limits.expires_at <= :now THEN 1 ELSE auth_rate_limits.request_count + 1 END
                WHERE auth_rate_limits.expires_at <= :now OR auth_rate_limits.request_count < :limit
                """).setParameter("key", key).setParameter("now", now).setParameter("expiry", now.plusSeconds(seconds))
                .setParameter("limit", limit).executeUpdate() == 1;
    }
    public void cleanupLimits(EntityManager em, Instant now) {
        em.createNativeQuery("DELETE FROM auth_rate_limits WHERE expires_at < :cutoff")
                .setParameter("cutoff", now.minusSeconds(86400)).executeUpdate();
    }
}
