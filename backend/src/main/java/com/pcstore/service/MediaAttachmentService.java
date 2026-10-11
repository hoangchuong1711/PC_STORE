package com.pcstore.service;

import com.pcstore.dao.MediaLinkDao;
import com.pcstore.entity.MediaAsset;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Called by Setup/Review services inside the same transaction that creates the parent. */
public final class MediaAttachmentService {
    public void attachSetupImages(EntityManager em, int ownerId, int postId, List<UUID> ids) {
        requireTransaction(em);
        checkCount(ids, 1, 8);
        var dao = new MediaLinkDao(em);
        if (!dao.lockSetup(ownerId, postId)) throw targetMissing();
        if (dao.setupCount(postId) + ids.size() > 8) throw invalidCount();
        int firstPosition = dao.nextSetupPosition(postId);
        for (int i = 0; i < ids.size(); i++) {
            var asset = lockAvailable(dao, ids.get(i), ownerId, "SETUP");
            dao.insertSetup(postId, asset.getMediaId(), firstPosition + i);
            asset.attach(LocalDateTime.now(ZoneOffset.UTC));
        }
    }

    public void attachReviewMedia(EntityManager em, int ownerId, int reviewId, List<UUID> ids) {
        requireTransaction(em);
        checkCount(ids, 0, 6);
        var dao = new MediaLinkDao(em);
        if (!dao.lockActiveReview(ownerId, reviewId)) throw targetMissing();
        if (dao.reviewCount(reviewId) + ids.size() > 6) throw invalidCount();
        int firstPosition = dao.nextReviewPosition(reviewId);
        long existingVideos = dao.reviewVideoCount(reviewId);
        var assets = new ArrayList<MediaAsset>();
        int newVideos = 0;
        for (UUID id : ids) {
            var asset = lockAvailable(dao, id, ownerId, "REVIEW");
            if ("video".equals(asset.getResourceType())) newVideos++;
            assets.add(asset);
        }
        if (existingVideos + newVideos > 1)
            throw new AppException(422, "MEDIA_VIDEO_LIMIT", "Mỗi Review chỉ được có một video.");
        for (int i = 0; i < ids.size(); i++) {
            var asset = assets.get(i);
            dao.insertReview(reviewId, asset, firstPosition + i);
            asset.attach(LocalDateTime.now(ZoneOffset.UTC));
        }
    }

    public void detachSetupImage(EntityManager em, int ownerId, int postId, UUID mediaId) {
        requireTransaction(em);
        var dao = new MediaLinkDao(em);
        if (!dao.lockSetup(ownerId, postId)) throw targetMissing();
        if (dao.setupCount(postId) <= 1) throw invalidCount();
        detachLinked(dao, mediaId, ownerId, "SETUP", postId);
    }

    public void replaceSetupImages(EntityManager em, int ownerId, int postId, List<UUID> ids) {
        requireTransaction(em);
        checkCount(ids, 1, 8);
        var dao = new MediaLinkDao(em);
        if (!dao.lockSetup(ownerId, postId)) throw targetMissing();
        List<UUID> previous = em.createNativeQuery("SELECT media_asset_id FROM setup_images WHERE post_id=:post")
                .setParameter("post", postId).getResultList();
        for (UUID id : previous) {
            if (!ids.contains(id)) {
                var asset = dao.lockAsset(id);
                dao.deleteSetup(postId, id);
                asset.detach();
            }
        }
        List<UUID> added = ids.stream().filter(id -> !previous.contains(id)).toList();
        if (!added.isEmpty()) attachSetupImages(em, ownerId, postId, added);
        dao.reorderSetup(postId, ids);
    }

    public void detachReviewMedia(EntityManager em, int ownerId, int reviewId, UUID mediaId) {
        requireTransaction(em);
        var dao = new MediaLinkDao(em);
        if (!dao.lockReview(ownerId, reviewId)) throw targetMissing();
        detachLinked(dao, mediaId, ownerId, "REVIEW", reviewId);
    }

    public void replaceReviewMedia(EntityManager em, int ownerId, int reviewId, List<UUID> ids) {
        requireTransaction(em);
        checkCount(ids, 0, 6);
        var dao = new MediaLinkDao(em);
        if (!dao.lockActiveReview(ownerId, reviewId)) throw targetMissing();
        List<UUID> previous = dao.reviewMediaIds(reviewId);
        for (UUID id : previous) {
            if (!ids.contains(id)) {
                MediaAsset asset = dao.lockAsset(id);
                dao.deleteReview(reviewId, id);
                asset.detach();
            }
        }
        List<UUID> added = ids.stream().filter(id -> !previous.contains(id)).toList();
        if (!added.isEmpty()) attachReviewMedia(em, ownerId, reviewId, added);
        dao.reorderReview(reviewId, ids);
    }

    private static void detachLinked(MediaLinkDao dao, UUID id, int ownerId, String module, int parentId) {
        var asset = id == null ? null : dao.lockAsset(id);
        if (asset == null || asset.getOwnerId() != ownerId || !module.equals(asset.getModule())
                || !"ATTACHED".equals(asset.getStatus()))
            throw new AppException(404, "MEDIA_NOT_FOUND", "Không tìm thấy file trong bài.");
        int removed = "SETUP".equals(module) ? dao.deleteSetup(parentId, id) : dao.deleteReview(parentId, id);
        if (removed != 1) throw new AppException(404, "MEDIA_NOT_FOUND", "Không tìm thấy file trong bài.");
        asset.detach();
    }

    private static MediaAsset lockAvailable(MediaLinkDao dao, UUID id, int ownerId, String module) {
        var asset = id == null ? null : dao.lockAsset(id);
        if (asset == null || asset.getOwnerId() != ownerId || !module.equals(asset.getModule())
                || !"TEMP".equals(asset.getStatus()) || !asset.getExpiresAt().isAfter(LocalDateTime.now(ZoneOffset.UTC)))
            throw new AppException(422, "MEDIA_NOT_AVAILABLE", "File tạm không hợp lệ hoặc đã hết hạn.");
        return asset;
    }

    private static void checkCount(List<UUID> ids, int min, int max) {
        if (ids == null || ids.size() < min || ids.size() > max) throw invalidCount();
        if (new HashSet<>(ids).size() != ids.size())
            throw new AppException(422, "DUPLICATE_MEDIA", "Danh sách file bị trùng.");
    }

    private static void requireTransaction(EntityManager em) {
        if (em == null || !em.getTransaction().isActive())
            throw new IllegalStateException("Media attachment needs the parent transaction");
    }

    private static AppException targetMissing() {
        return new AppException(404, "MEDIA_TARGET_NOT_FOUND", "Bài viết không tồn tại hoặc không thuộc tài khoản này.");
    }
    private static AppException invalidCount() {
        return new AppException(422, "MEDIA_COUNT_LIMIT", "Số lượng file vượt giới hạn.");
    }
}
