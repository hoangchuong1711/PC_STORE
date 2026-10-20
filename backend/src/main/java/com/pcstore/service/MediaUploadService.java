package com.pcstore.service;

import com.pcstore.dao.MediaAssetDao;
import com.pcstore.entity.MediaAsset;
import com.pcstore.entity.User;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.exception.AppException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityTransaction;

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
    interface VideoPreparer {
        MediaVideoService.PreparedVideo prepare(byte[] data, String mimeType);
    }

    public record UploadResult(UUID mediaId, String module, String status) {}

    // Khởi tạo dịch vụ upload với bộ xử lý ảnh, video và nơi lưu Cloudinary.
    public MediaUploadService(
            EntityManagerFactory factory,
            MediaImageService images,
            CloudinaryImageStorage storage) {
        this(factory, images, storage, new MediaVideoService()::prepare);
    }

    // Cho phép truyền bộ xử lý video riêng để kiểm thử luồng upload.
    MediaUploadService(
            EntityManagerFactory factory,
            MediaImageService images,
            CloudinaryImageStorage storage,
            VideoPreparer videos) {
        this.factory = factory;
        this.images = images;
        this.storage = storage;
        this.videos = videos;
    }

    // Chuẩn hóa ảnh, tạo bản ghi upload rồi gửi Cloudinary; thành công chuyển file sang TEMP chờ gắn bài.
    public UploadResult upload(int userId, String module, byte[] input, String mimeType) {
        if (module == null || (!module.equals("SETUP") && !module.equals("REVIEW"))) {
            throw new AppException(400, "INVALID_MEDIA_MODULE", "Module media không hợp lệ.");
        }
        MediaImageService.PreparedImage prepared = images.prepare(input, mimeType);
        // Lưu mã file và chủ sở hữu trước khi gọi dịch vụ ngoài để có thể dọn nếu upload lỗi.
        UUID id = reserve(userId, module, "image", prepared.bytes().length);
        try {
            CloudinaryImageStorage.StoredImage stored =
                    storage.upload(prepared.bytes(), publicId(module, id));
            // Cloudinary đã nhận ảnh; đổi trạng thái trong DB từ UPLOADING sang TEMP.
            markImageReady(id, stored.assetId(), prepared);
            return new UploadResult(id, module, "TEMP");
        } catch (RuntimeException error) {
            pendingOnError(id, error);
            throw error;
        }
    }

    // Kiểm tra hạn mức, xử lý video dành cho Review rồi upload thành file TEMP chờ gắn bài.
    public UploadResult uploadVideo(int userId, String module, byte[] input, String mimeType) {
        if (module == null || !module.equals("REVIEW")) {
            throw new AppException(400, "INVALID_MEDIA_MODULE", "Video chỉ dành cho Review.");
        }
        preflight(userId);
        MediaVideoService.PreparedVideo prepared = videos.prepare(input, mimeType);
        UUID id = reserve(userId, module, "video", prepared.bytes().length);
        try {
            CloudinaryImageStorage.StoredImage stored =
                    storage.uploadVideo(prepared.bytes(), publicId(module, id));
            markVideoReady(id, stored.assetId(), prepared);
            return new UploadResult(id, module, "TEMP");
        } catch (RuntimeException error) {
            pendingOnError(id, error);
            throw error;
        }
    }

    // Khóa tài khoản, kiểm tra hạn mức và lưu file UPLOADING có hạn dùng trước khi gọi Cloudinary.
    private UUID reserve(int userId, String module, String resourceType, int preparedSize) {
        UUID id = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        try (EntityManager entityManager = factory.createEntityManager()) {
            EntityTransaction transaction = entityManager.getTransaction();
            transaction.begin();
            try {
                MediaAssetDao dao = new MediaAssetDao(entityManager);
                User owner = dao.lockOwner(userId);
                checkQuota(dao, owner, userId, now, preparedSize);
                MediaAsset asset =
                        new MediaAsset(
                                id,
                                owner,
                                module,
                                resourceType,
                                publicId(module, id),
                                now,
                                now.plusHours(2));
                dao.persist(asset);
                transaction.commit();
            } catch (RuntimeException error) {
                if (transaction.isActive()) {
                    transaction.rollback();
                }
                throw error;
            }
        }
        return id;
    }

    // Kiểm tra tài khoản và hạn mức trước khi chạy xử lý video tốn tài nguyên.
    private void preflight(int userId) {
        try (EntityManager entityManager = factory.createEntityManager()) {
            EntityTransaction transaction = entityManager.getTransaction();
            transaction.begin();
            try {
                MediaAssetDao dao = new MediaAssetDao(entityManager);
                User owner = dao.lockOwner(userId);
                checkQuota(dao, owner, userId, LocalDateTime.now(ZoneOffset.UTC), 0);
                transaction.commit();
            } catch (RuntimeException error) {
                if (transaction.isActive()) {
                    transaction.rollback();
                }
                throw error;
            }
        }
    }

    // Kiểm tra tài khoản, số lần upload, số file tạm và tổng dung lượng trong ngày.
    private static void checkQuota(
            MediaAssetDao dao, User owner, int userId, LocalDateTime now, int preparedSize) {
        if (owner == null || owner.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(401, "UNAUTHORIZED", "Tài khoản không hợp lệ.");
        }
        if (dao.countSince(userId, now.minusMinutes(10)) >= 20
                || dao.countSince(userId, now.minusDays(1)) >= 50
                || dao.countUploading(userId) >= 2) {
            throw new AppException(
                    429, "MEDIA_RATE_LIMIT", "Đã đạt giới hạn upload; vui lòng thử lại sau.");
        }
        if (dao.countOutstanding(userId, now) >= 12) {
            throw new AppException(
                    429, "MEDIA_TEMP_LIMIT", "Đã đạt giới hạn file tạm; vui lòng thử lại sau.");
        }
        if (dao.bytesSince(userId, now.minusDays(1)) + preparedSize > 100_000_000L) {
            throw new AppException(
                    429, "MEDIA_DAILY_BYTES_LIMIT", "Đã đạt giới hạn dung lượng trong ngày.");
        }
    }

    // Tạo tên file Cloudinary từ module và UUID do backend cấp.
    private static String publicId(String module, UUID id) {
        return "pcstore/temp/" + module.toLowerCase(java.util.Locale.ROOT) + "/" + id;
    }

    // Lưu thông tin ảnh đã upload và chuyển trạng thái sang TEMP để có thể gắn vào bài.
    private void markImageReady(UUID id, String assetId, MediaImageService.PreparedImage image) {
        try (EntityManager entityManager = factory.createEntityManager()) {
            EntityTransaction transaction = entityManager.getTransaction();
            transaction.begin();
            try {
                MediaAsset asset = new MediaAssetDao(entityManager).find(id);
                asset.ready(
                        assetId,
                        image.mimeType(),
                        image.bytes().length,
                        image.width(),
                        image.height());
                transaction.commit();
            } catch (RuntimeException error) {
                if (transaction.isActive()) {
                    transaction.rollback();
                }
                throw error;
            }
        }
    }

    // Lưu thông tin video đã upload, gồm thời lượng, rồi chuyển sang TEMP.
    private void markVideoReady(UUID id, String assetId, MediaVideoService.PreparedVideo video) {
        try (EntityManager entityManager = factory.createEntityManager()) {
            EntityTransaction transaction = entityManager.getTransaction();
            transaction.begin();
            try {
                MediaAsset asset = new MediaAssetDao(entityManager).find(id);
                asset.readyVideo(
                        assetId,
                        video.bytes().length,
                        video.width(),
                        video.height(),
                        video.durationSecond());
                transaction.commit();
            } catch (RuntimeException error) {
                if (transaction.isActive()) {
                    transaction.rollback();
                }
                throw error;
            }
        }
    }

    // Đánh dấu file DELETE_PENDING để tác vụ dọn dẹp xóa trên Cloudinary sau.
    private void markDeletePending(UUID id) {
        try (EntityManager entityManager = factory.createEntityManager()) {
            EntityTransaction transaction = entityManager.getTransaction();
            transaction.begin();
            try {
                MediaAsset asset = new MediaAssetDao(entityManager).find(id);
                asset.deletePending();
                transaction.commit();
            } catch (RuntimeException error) {
                if (transaction.isActive()) {
                    transaction.rollback();
                }
                throw error;
            }
        }
    }

    // Đánh dấu file chờ dọn khi upload lỗi, đồng thời giữ lại lỗi gốc để báo cho bên gọi.
    private void pendingOnError(UUID id, RuntimeException error) {
        // Cloudinary có thể đã nhận file trước khi timeout; giữ public ID để dọn lại.
        try {
            markDeletePending(id);
        } catch (RuntimeException recoveryFailure) {
            error.addSuppressed(recoveryFailure);
        }
    }
}
