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

    public record AccessibleMedia(String assetId, String mimeType, long sizeBytes) {}

    // Nhận EntityManagerFactory để mở phiên đọc dữ liệu khi kiểm tra quyền xem file.
    public MediaAccessService(EntityManagerFactory factory) {
        this.factory = factory;
    }

    // Cho xem file theo chủ sở hữu, hạn dùng và trạng thái bài; file tạm chỉ chủ được xem.
    public AccessibleMedia resolve(UUID id, Integer viewerId) {
        try (EntityManager entityManager = factory.createEntityManager()) {
            MediaAsset asset = id == null ? null : entityManager.find(MediaAsset.class, id);
            if (asset == null || asset.getCloudinaryAssetId() == null) {
                throw missing();
            }
            if (asset.getStatus().equals("TEMP")) {
                if (viewerId == null
                        || asset.getOwnerId() != viewerId
                        || !asset.getExpiresAt().isAfter(LocalDateTime.now(ZoneOffset.UTC))) {
                    throw missing();
                }
            } else if (asset.getStatus().equals("ATTACHED")) {
                MediaLinkDao dao = new MediaLinkDao(entityManager);
                MediaLinkDao.Visibility state =
                        asset.getModule().equals("SETUP")
                                ? dao.setupVisibility(id)
                                : dao.reviewVisibility(id);
                if (state == null) {
                    throw missing();
                }
                boolean owner = viewerId != null && state.ownerId() == viewerId;
                String status = state.status();
                if (!status.equals("PUBLISHED") && !(owner && status.equals("HIDDEN"))) {
                    throw missing();
                }
            } else {
                throw missing();
            }
            return new AccessibleMedia(
                    asset.getCloudinaryAssetId(), asset.getMimeType(), asset.getSizeBytes());
        }
    }

    // Trả lỗi 404 chung khi file không tồn tại, hết hạn hoặc không được phép xem.
    private static AppException missing() {
        return new AppException(404, "MEDIA_NOT_FOUND", "Không tìm thấy file.");
    }
}
