package com.pcstore.service;

import com.pcstore.dao.MediaLinkDao;
import com.pcstore.entity.MediaAsset;
import com.pcstore.exception.AppException;

import jakarta.persistence.EntityManager;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

/** Called by Setup/Review services inside the same transaction that creates the parent. */
public final class MediaAttachmentService {
    // Gắn ảnh tạm còn hạn của đúng chủ vào Setup, giữ thứ tự và giới hạn tối đa 8 ảnh.
    public void attachSetupImages(
            EntityManager entityManager, int ownerId, int postId, List<UUID> ids) {
        requireTransaction(entityManager);
        checkCount(ids, 1, 8);
        MediaLinkDao dao = new MediaLinkDao(entityManager);
        if (!dao.lockSetup(ownerId, postId)) {
            throw targetMissing();
        }
        if (dao.setupCount(postId) + ids.size() > 8) {
            throw invalidCount();
        }
        int firstPosition = dao.nextSetupPosition(postId);
        for (int i = 0; i < ids.size(); i++) {
            MediaAsset asset = lockAvailable(dao, ids.get(i), ownerId, "SETUP");
            dao.insertSetup(postId, asset.getMediaId(), firstPosition + i);
            asset.attach(LocalDateTime.now(ZoneOffset.UTC));
        }
    }

    // Gắn media tạm của đúng chủ vào Review, tối đa 6 file và không quá một video.
    public void attachReviewMedia(
            EntityManager entityManager, int ownerId, int reviewId, List<UUID> ids) {
        requireTransaction(entityManager);
        checkCount(ids, 0, 6);
        MediaLinkDao dao = new MediaLinkDao(entityManager);
        if (!dao.lockActiveReview(ownerId, reviewId)) {
            throw targetMissing();
        }
        if (dao.reviewCount(reviewId) + ids.size() > 6) {
            throw invalidCount();
        }
        int firstPosition = dao.nextReviewPosition(reviewId);
        long existingVideos = dao.reviewVideoCount(reviewId);
        List<MediaAsset> assets = new ArrayList<>();
        int newVideos = 0;
        for (UUID id : ids) {
            MediaAsset asset = lockAvailable(dao, id, ownerId, "REVIEW");
            if (asset.getResourceType().equals("video")) {
                newVideos++;
            }
            assets.add(asset);
        }
        if (existingVideos + newVideos > 1) {
            throw new AppException(422, "MEDIA_VIDEO_LIMIT", "Mỗi Review chỉ được có một video.");
        }
        for (int i = 0; i < ids.size(); i++) {
            MediaAsset asset = assets.get(i);
            dao.insertReview(reviewId, asset, firstPosition + i);
            asset.attach(LocalDateTime.now(ZoneOffset.UTC));
        }
    }

    // Gỡ một ảnh khỏi Setup và cho vào hàng chờ xóa; bài phải còn ít nhất một ảnh.
    public void detachSetupImage(
            EntityManager entityManager, int ownerId, int postId, UUID mediaId) {
        requireTransaction(entityManager);
        MediaLinkDao dao = new MediaLinkDao(entityManager);
        if (!dao.lockSetup(ownerId, postId)) {
            throw targetMissing();
        }
        if (dao.setupCount(postId) <= 1) {
            throw invalidCount();
        }
        detachLinked(dao, mediaId, ownerId, "SETUP", postId);
    }

    // Giữ ảnh còn dùng, gỡ ảnh bị bỏ, gắn ảnh mới và sắp lại thứ tự theo yêu cầu.
    public void replaceSetupImages(
            EntityManager entityManager, int ownerId, int postId, List<UUID> ids) {
        requireTransaction(entityManager);
        checkCount(ids, 1, 8);
        MediaLinkDao dao = new MediaLinkDao(entityManager);
        if (!dao.lockSetup(ownerId, postId)) {
            throw targetMissing();
        }
        List<UUID> previous = dao.setupMediaIds(postId);
        for (UUID id : previous) {
            if (!ids.contains(id)) {
                MediaAsset asset = dao.lockAsset(id);
                dao.deleteSetup(postId, id);
                asset.detach();
            }
        }
        List<UUID> added = new ArrayList<>();
        for (UUID id : ids) {
            if (!previous.contains(id)) {
                added.add(id);
            }
        }
        if (!added.isEmpty()) {
            attachSetupImages(entityManager, ownerId, postId, added);
        }
        dao.reorderSetup(postId, ids);
    }

    // Gỡ media khỏi Review thuộc người đăng và đánh dấu file chờ xóa.
    public void detachReviewMedia(
            EntityManager entityManager, int ownerId, int reviewId, UUID mediaId) {
        requireTransaction(entityManager);
        MediaLinkDao dao = new MediaLinkDao(entityManager);
        if (!dao.lockReview(ownerId, reviewId)) {
            throw targetMissing();
        }
        detachLinked(dao, mediaId, ownerId, "REVIEW", reviewId);
    }

    // Thay danh sách media Review, chỉ gỡ file bị bỏ và giữ đúng thứ tự mới.
    public void replaceReviewMedia(
            EntityManager entityManager, int ownerId, int reviewId, List<UUID> ids) {
        requireTransaction(entityManager);
        checkCount(ids, 0, 6);
        MediaLinkDao dao = new MediaLinkDao(entityManager);
        if (!dao.lockActiveReview(ownerId, reviewId)) {
            throw targetMissing();
        }
        List<UUID> previous = dao.reviewMediaIds(reviewId);
        for (UUID id : previous) {
            if (!ids.contains(id)) {
                MediaAsset asset = dao.lockAsset(id);
                dao.deleteReview(reviewId, id);
                asset.detach();
            }
        }
        List<UUID> added = new ArrayList<>();
        for (UUID id : ids) {
            if (!previous.contains(id)) {
                added.add(id);
            }
        }
        if (!added.isEmpty()) {
            attachReviewMedia(entityManager, ownerId, reviewId, added);
        }
        dao.reorderReview(reviewId, ids);
    }

    // Kiểm tra file đúng chủ và đúng bài, xóa liên kết rồi chuyển file sang chờ dọn.
    private static void detachLinked(
            MediaLinkDao dao, UUID id, int ownerId, String module, int parentId) {
        MediaAsset asset = id == null ? null : dao.lockAsset(id);
        if (asset == null
                || asset.getOwnerId() != ownerId
                || !module.equals(asset.getModule())
                || !asset.getStatus().equals("ATTACHED")) {
            throw new AppException(404, "MEDIA_NOT_FOUND", "Không tìm thấy file trong bài.");
        }
        int removed =
                module.equals("SETUP")
                        ? dao.deleteSetup(parentId, id)
                        : dao.deleteReview(parentId, id);
        if (removed != 1) {
            throw new AppException(404, "MEDIA_NOT_FOUND", "Không tìm thấy file trong bài.");
        }
        asset.detach();
    }

    // Khóa và kiểm tra file TEMP còn hạn, đúng chủ sở hữu và đúng module trước khi gắn.
    private static MediaAsset lockAvailable(MediaLinkDao dao, UUID id, int ownerId, String module) {
        MediaAsset asset = id == null ? null : dao.lockAsset(id);
        if (asset == null
                || asset.getOwnerId() != ownerId
                || !module.equals(asset.getModule())
                || !asset.getStatus().equals("TEMP")
                || !asset.getExpiresAt().isAfter(LocalDateTime.now(ZoneOffset.UTC))) {
            throw new AppException(
                    422, "MEDIA_NOT_AVAILABLE", "File tạm không hợp lệ hoặc đã hết hạn.");
        }
        return asset;
    }

    // Kiểm tra số lượng file trong khoảng cho phép và không có mã bị trùng.
    private static void checkCount(List<UUID> ids, int min, int max) {
        if (ids == null || ids.size() < min || ids.size() > max) {
            throw invalidCount();
        }
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new AppException(422, "DUPLICATE_MEDIA", "Danh sách file bị trùng.");
        }
    }

    // Yêu cầu dùng transaction của bài đăng để bài và liên kết media cùng thành công hoặc hoàn tác.
    private static void requireTransaction(EntityManager entityManager) {
        if (entityManager == null || !entityManager.getTransaction().isActive()) {
            throw new IllegalStateException("Media attachment needs the parent transaction");
        }
    }

    // Tạo lỗi 404 khi bài cần gắn hoặc gỡ media không tồn tại hoặc không thuộc người dùng.
    private static AppException targetMissing() {
        return new AppException(
                404,
                "MEDIA_TARGET_NOT_FOUND",
                "Bài viết không tồn tại hoặc không thuộc tài khoản này.");
    }

    // Tạo lỗi 422 khi số lượng media không đáp ứng giới hạn của bài.
    private static AppException invalidCount() {
        return new AppException(422, "MEDIA_COUNT_LIMIT", "Số lượng file vượt giới hạn.");
    }
}
