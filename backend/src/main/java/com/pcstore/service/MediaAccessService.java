package com.pcstore.service;

import com.pcstore.dao.MediaLinkDao;
import com.pcstore.entity.MediaAsset;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Resolves an authenticated Cloudinary asset only after checking current publication state. */
public final class MediaAccessService {
    private final EntityManagerFactory factory;

    public record AccessibleMedia(String assetId, String mimeType, long sizeBytes) { }

    public MediaAccessService(EntityManagerFactory factory) { this.factory = factory; }

    public AccessibleMedia resolve(UUID id, Integer viewerId) {
        try (EntityManager em = factory.createEntityManager()) {
            var asset = id == null ? null : em.find(MediaAsset.class, id);
            if (asset == null || asset.getCloudinaryAssetId() == null) throw missing();
            if ("TEMP".equals(asset.getStatus())) {
                if (viewerId == null || asset.getOwnerId() != viewerId
                        || !asset.getExpiresAt().isAfter(LocalDateTime.now(ZoneOffset.UTC))) throw missing();
            } else if ("ATTACHED".equals(asset.getStatus())) {
                var dao = new MediaLinkDao(em);
                var state = "SETUP".equals(asset.getModule()) ? dao.setupVisibility(id) : dao.reviewVisibility(id);
                if (state == null) throw missing();
                boolean owner = viewerId != null && state.ownerId() == viewerId;
                String status = state.status();
                if (!"PUBLISHED".equals(status) && !(owner && "HIDDEN".equals(status))) throw missing();
            } else throw missing();
            return new AccessibleMedia(asset.getCloudinaryAssetId(), asset.getMimeType(), asset.getSizeBytes());
        }
    }

    private static AppException missing() {
        return new AppException(404, "MEDIA_NOT_FOUND", "Không tìm thấy file.");
    }
}
