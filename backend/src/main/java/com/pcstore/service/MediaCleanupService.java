package com.pcstore.service;

import com.pcstore.dao.MediaAssetDao;
import com.pcstore.entity.MediaAsset;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityTransaction;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Claims bounded batches so multiple app instances do not delete the same asset together. */
public final class MediaCleanupService {
    private final EntityManagerFactory factory;
    private final CloudinaryImageStorage storage;

    public MediaCleanupService(EntityManagerFactory factory, CloudinaryImageStorage storage) {
        this.factory = factory;
        this.storage = storage;
    }

    public int runOnce(LocalDateTime now) {
        List<Claim> claims = claim(now);
        int removed = 0;
        for (Claim claim : claims) {
            try {
                storage.delete(claim.publicId(), claim.resourceType());
                recordCleanup(claim.id(), true, now);
                removed++;
            } catch (RuntimeException failure) {
                recordCleanup(claim.id(), false, now);
            }
        }
        return removed;
    }

    private List<Claim> claim(LocalDateTime now) {
        try (EntityManager entityManager = factory.createEntityManager()) {
            EntityTransaction transaction = entityManager.getTransaction();
            transaction.begin();
            try {
                MediaAssetDao dao = new MediaAssetDao(entityManager);
                List<Claim> claims = new ArrayList<>();
                for (UUID id : dao.claimable(now)) {
                    MediaAsset asset = dao.find(id);
                    asset.claimForCleanup(now.plusMinutes(15));
                    claims.add(new Claim(id, asset.getPublicId(), asset.getResourceType()));
                }
                transaction.commit();
                return claims;
            } catch (RuntimeException error) {
                if (transaction.isActive()) {
                    transaction.rollback();
                }
                throw error;
            }
        }
    }

    private void recordCleanup(UUID id, boolean succeeded, LocalDateTime now) {
        try (EntityManager entityManager = factory.createEntityManager()) {
            EntityTransaction transaction = entityManager.getTransaction();
            transaction.begin();
            try {
                MediaAsset asset = entityManager.find(MediaAsset.class, id);
                if (succeeded) {
                    asset.cleanupSucceeded();
                } else {
                    asset.cleanupFailed(now);
                }
                transaction.commit();
            } catch (RuntimeException error) {
                if (transaction.isActive()) {
                    transaction.rollback();
                }
                throw error;
            }
        }
    }

    private record Claim(UUID id, String publicId, String resourceType) {}
}
