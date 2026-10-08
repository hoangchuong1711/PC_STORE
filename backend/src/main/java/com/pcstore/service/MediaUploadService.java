package com.pcstore.service;

import com.pcstore.dao.MediaAssetDao;
import com.pcstore.entity.MediaAsset;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Reserves a durable owner-bound upload before calling Cloudinary. */
public final class MediaUploadService {
    private final EntityManagerFactory factory;
    private final MediaImageService images;
    private final CloudinaryImageStorage storage;
    private final VideoPreparer videos;

    @FunctionalInterface
    interface VideoPreparer { MediaVideoService.PreparedVideo prepare(byte[] data, String mimeType); }

    public record UploadResult(UUID mediaId, String module, String status) { }

    public MediaUploadService(EntityManagerFactory factory, MediaImageService images, CloudinaryImageStorage storage) {
        this(factory, images, storage, new MediaVideoService()::prepare);
    }

    MediaUploadService(EntityManagerFactory factory, MediaImageService images, CloudinaryImageStorage storage,
                       VideoPreparer videos) {
        this.factory = factory;
        this.images = images;
        this.storage = storage;
        this.videos = videos;
    }

    public UploadResult upload(int userId, String module, byte[] input, String mimeType) {
        if (!"SETUP".equals(module) && !"REVIEW".equals(module))
            throw new AppException(400, "INVALID_MEDIA_MODULE", "Module media không hợp lệ.");
        var prepared = images.prepare(input, mimeType);
        UUID id = reserve(userId, module, "image", prepared.bytes().length);
        try {
            var stored = storage.upload(prepared.bytes(), publicId(module, id));
            transaction(em -> new MediaAssetDao(em).find(id).ready(stored.assetId(), prepared.mimeType(),
                    prepared.bytes().length, prepared.width(), prepared.height()));
            return new UploadResult(id, module, "TEMP");
        } catch (RuntimeException error) {
            pendingOnError(id, error);
            throw error;
        }
    }

    public UploadResult uploadVideo(int userId, String module, byte[] input, String mimeType) {
        if (!"REVIEW".equals(module))
            throw new AppException(400, "INVALID_MEDIA_MODULE", "Video chỉ dành cho Review.");
        preflight(userId);
        var prepared = videos.prepare(input, mimeType);
        UUID id = reserve(userId, module, "video", prepared.bytes().length);
        try {
            var stored = storage.uploadVideo(prepared.bytes(), publicId(module, id));
            transaction(em -> new MediaAssetDao(em).find(id).readyVideo(stored.assetId(), prepared.bytes().length,
                    prepared.width(), prepared.height(), prepared.durationSecond()));
            return new UploadResult(id, module, "TEMP");
        } catch (RuntimeException error) {
            pendingOnError(id, error);
            throw error;
        }
    }

    private UUID reserve(int userId, String module, String resourceType, int preparedSize) {
        UUID id = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        transaction(em -> {
            var dao = new MediaAssetDao(em);
            var owner = dao.lockOwner(userId);
            checkQuota(dao, owner, userId, now, preparedSize);
            dao.persist(new MediaAsset(id, owner, module, resourceType, publicId(module, id), now, now.plusHours(2)));
        });
        return id;
    }

    private void preflight(int userId) {
        transaction(em -> {
            var dao = new MediaAssetDao(em);
            checkQuota(dao, dao.lockOwner(userId), userId, LocalDateTime.now(ZoneOffset.UTC), 0);
        });
    }

    private static void checkQuota(MediaAssetDao dao, com.pcstore.entity.User owner, int userId,
                                   LocalDateTime now, int preparedSize) {
        if (owner == null || owner.getStatus() != UserStatus.ACTIVE)
            throw new AppException(401, "UNAUTHORIZED", "Tài khoản không hợp lệ.");
        if (dao.countSince(userId, now.minusMinutes(10)) >= 20
                || dao.countSince(userId, now.minusDays(1)) >= 50
                || dao.countUploading(userId) >= 2)
            throw new AppException(429, "MEDIA_RATE_LIMIT", "Đã đạt giới hạn upload; vui lòng thử lại sau.");
        if (dao.countOutstanding(userId, now) >= 12)
            throw new AppException(429, "MEDIA_TEMP_LIMIT", "Đã đạt giới hạn file tạm; vui lòng thử lại sau.");
        if (dao.bytesSince(userId, now.minusDays(1)) + preparedSize > 100_000_000L)
            throw new AppException(429, "MEDIA_DAILY_BYTES_LIMIT", "Đã đạt giới hạn dung lượng trong ngày.");
    }

    private static String publicId(String module, UUID id) {
        return "pcstore/temp/" + module.toLowerCase(java.util.Locale.ROOT) + "/" + id;
    }

    private void pendingOnError(UUID id, RuntimeException error) {
        // A timeout may mean Cloudinary accepted the file. Keep its public ID for later reconciliation.
        try { transaction(em -> new MediaAssetDao(em).find(id).deletePending()); }
        catch (RuntimeException recoveryFailure) { error.addSuppressed(recoveryFailure); }
    }

    private void transaction(java.util.function.Consumer<EntityManager> action) {
        try (EntityManager em = factory.createEntityManager()) {
            var tx = em.getTransaction();
            tx.begin();
            try {
                action.accept(em);
                tx.commit();
            } catch (RuntimeException error) {
                if (tx.isActive()) tx.rollback();
                throw error;
            }
        }
    }
}
