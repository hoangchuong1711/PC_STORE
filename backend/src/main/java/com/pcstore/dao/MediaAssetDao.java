package com.pcstore.dao;

import com.pcstore.entity.MediaAsset;
import com.pcstore.entity.User;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Query;
import jakarta.persistence.TypedQuery;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class MediaAssetDao {
    private final EntityManager entityManager;

    public MediaAssetDao(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public User lockOwner(int userId) {
        return entityManager.find(User.class, userId, LockModeType.PESSIMISTIC_WRITE);
    }

    public long countSince(int userId, LocalDateTime since) {
        String jpql = "SELECT COUNT(m) FROM MediaAsset m WHERE m.user.userId = :userId "
                + "AND m.createdAt >= :since";
        TypedQuery<Long> query = entityManager.createQuery(jpql, Long.class);
        query.setParameter("userId", userId);
        query.setParameter("since", since);
        return query.getSingleResult();
    }

    public long countUploading(int userId) {
        String jpql = "SELECT COUNT(m) FROM MediaAsset m WHERE m.user.userId = :userId "
                + "AND m.status = 'UPLOADING'";
        TypedQuery<Long> query = entityManager.createQuery(jpql, Long.class);
        query.setParameter("userId", userId);
        return query.getSingleResult();
    }

    public long countOutstanding(int userId, LocalDateTime now) {
        String jpql = "SELECT COUNT(m) FROM MediaAsset m WHERE m.user.userId = :userId "
                + "AND (m.status = 'UPLOADING' OR (m.status = 'TEMP' AND m.expiresAt > :now))";
        TypedQuery<Long> query = entityManager.createQuery(jpql, Long.class);
        query.setParameter("userId", userId);
        query.setParameter("now", now);
        return query.getSingleResult();
    }

    public long bytesSince(int userId, LocalDateTime since) {
        String sql =
                "SELECT COALESCE(SUM(size_bytes),0) FROM media_assets "
                        + "WHERE user_id=:userId AND created_at>=:since";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("userId", userId);
        query.setParameter("since", since);
        Number bytes = (Number) query.getSingleResult();
        return bytes.longValue();
    }

    public void persist(MediaAsset asset) {
        entityManager.persist(asset);
    }

    public MediaAsset find(UUID id) {
        return entityManager.find(MediaAsset.class, id);
    }

    public List<UUID> claimable(LocalDateTime now) {
        String sql =
                "SELECT media_id FROM media_assets WHERE ((status IN ('TEMP','UPLOADING') AND"
                    + " expires_at <= :now) OR (status = 'DELETE_PENDING' AND (next_cleanup_at IS"
                    + " NULL OR next_cleanup_at <= :now))) ORDER BY created_at LIMIT 10 FOR UPDATE"
                    + " SKIP LOCKED";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("now", now);
        @SuppressWarnings("unchecked")
        List<UUID> ids = query.getResultList();
        return ids;
    }
}
