package com.pcstore.service;

import com.pcstore.dao.MediaAssetDao;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

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
                change(claim.id(), asset -> asset.cleanupSucceeded());
                removed++;
            } catch (RuntimeException failure) {
                change(claim.id(), asset -> asset.cleanupFailed(now));
            }
        }
        return removed;
    }

    private List<Claim> claim(LocalDateTime now) {
        try (EntityManager em = factory.createEntityManager()) {
            var tx = em.getTransaction();
            tx.begin();
            try {
                var dao = new MediaAssetDao(em);
                List<Claim> claims = new ArrayList<>();
                for (UUID id : dao.claimable(now)) {
                    var asset = dao.find(id);
                    asset.claimForCleanup(now.plusMinutes(15));
                    claims.add(new Claim(id, asset.getPublicId(), asset.getResourceType()));
                }
                tx.commit();
                return claims;
            } catch (RuntimeException error) {
                if (tx.isActive()) tx.rollback();
                throw error;
            }
        }
    }

    private void change(UUID id, java.util.function.Consumer<com.pcstore.entity.MediaAsset> action) {
        try (EntityManager em = factory.createEntityManager()) {
            var tx = em.getTransaction();
            tx.begin();
            try {
                var asset = em.find(com.pcstore.entity.MediaAsset.class, id);
                action.accept(asset);
                tx.commit();
            } catch (RuntimeException error) {
                if (tx.isActive()) tx.rollback();
                throw error;
            }
        }
    }

    private record Claim(UUID id, String publicId, String resourceType) { }
}
