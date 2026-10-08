package com.pcstore.dao;

import com.pcstore.entity.MediaAsset;
import com.pcstore.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

public final class MediaAssetDao {
    private final EntityManager em;

    public MediaAssetDao(EntityManager em) { this.em = em; }

    public User lockOwner(int userId) {
        return em.find(User.class, userId, LockModeType.PESSIMISTIC_WRITE);
    }

    public long countSince(int userId, LocalDateTime since) {
        return em.createQuery("SELECT COUNT(m) FROM MediaAsset m WHERE m.user.userId = :userId AND m.createdAt >= :since", Long.class)
                .setParameter("userId", userId).setParameter("since", since).getSingleResult();
    }

    public long countUploading(int userId) {
        return em.createQuery("SELECT COUNT(m) FROM MediaAsset m WHERE m.user.userId = :userId AND m.status = 'UPLOADING'", Long.class)
                .setParameter("userId", userId).getSingleResult();
    }

    public long countOutstanding(int userId, LocalDateTime now) {
        return em.createQuery("SELECT COUNT(m) FROM MediaAsset m WHERE m.user.userId = :userId "
                        + "AND (m.status = 'UPLOADING' OR (m.status = 'TEMP' AND m.expiresAt > :now))", Long.class)
                .setParameter("userId", userId).setParameter("now", now).getSingleResult();
    }

    public long bytesSince(int userId, LocalDateTime since) {
        Number bytes = (Number) em.createNativeQuery("SELECT COALESCE(SUM(size_bytes),0) FROM media_assets "
                        + "WHERE user_id=:userId AND created_at>=:since")
                .setParameter("userId", userId).setParameter("since", since).getSingleResult();
        return bytes.longValue();
    }

    public void persist(MediaAsset asset) { em.persist(asset); }
    public MediaAsset find(UUID id) { return em.find(MediaAsset.class, id); }

    public List<UUID> claimable(LocalDateTime now) {
        @SuppressWarnings("unchecked")
        List<UUID> ids = em.createNativeQuery("SELECT media_id FROM media_assets WHERE "
                        + "((status IN ('TEMP','UPLOADING') AND expires_at <= :now) "
                        + "OR (status = 'DELETE_PENDING' AND (next_cleanup_at IS NULL OR next_cleanup_at <= :now))) "
                        + "ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED")
                .setParameter("now", now).getResultList();
        return ids;
    }
}
