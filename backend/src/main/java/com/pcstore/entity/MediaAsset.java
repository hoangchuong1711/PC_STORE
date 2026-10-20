package com.pcstore.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "media_assets")
public class MediaAsset {
    @Id
    @Column(name = "media_id", nullable = false)
    private UUID mediaId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "module", nullable = false, length = 16)
    private String module;

    @Column(name = "resource_type", nullable = false, length = 8)
    private String resourceType;

    @Column(name = "status", nullable = false, length = 16)
    private String status;

    @Column(name = "public_id", nullable = false, length = 255)
    private String publicId;

    @Column(name = "cloudinary_asset_id", length = 255)
    private String cloudinaryAssetId;

    @Column(name = "mime_type", length = 64)
    private String mimeType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "duration_second")
    private Integer durationSecond;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "attached_at")
    private LocalDateTime attachedAt;

    @Column(name = "cleanup_attempts", nullable = false)
    private int cleanupAttempts;

    @Column(name = "next_cleanup_at")
    private LocalDateTime nextCleanupAt;

    // Constructor rỗng để JPA tạo đối tượng khi đọc bản ghi media từ database.
    public MediaAsset() { }

    // Khởi tạo bản ghi upload ảnh với chủ sở hữu, module và thời hạn file tạm.
    public MediaAsset(UUID mediaId, User user, String module, String publicId,
                      LocalDateTime createdAt, LocalDateTime expiresAt) {
        this(mediaId, user, module, "image", publicId, createdAt, expiresAt);
    }

    // Khởi tạo bản ghi file ảnh hoặc video ở trạng thái UPLOADING trước khi gọi Cloudinary.
    public MediaAsset(UUID mediaId, User user, String module, String resourceType, String publicId,
                      LocalDateTime createdAt, LocalDateTime expiresAt) {
        this.mediaId = mediaId;
        this.user = user;
        this.module = module;
        this.resourceType = resourceType;
        this.status = "UPLOADING";
        this.publicId = publicId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    // Lưu thông tin ảnh đã upload và chuyển sang TEMP, sẵn sàng gắn vào bài.
    public void ready(String cloudinaryAssetId, String mimeType, long sizeBytes, int width, int height) {
        this.cloudinaryAssetId = cloudinaryAssetId;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.width = width;
        this.height = height;
        this.status = "TEMP";
    }

    // Lưu thông tin video MP4 đã upload, gồm thời lượng, rồi chuyển sang TEMP.
    public void readyVideo(String cloudinaryAssetId, long sizeBytes, int width, int height, int durationSecond) {
        this.cloudinaryAssetId = cloudinaryAssetId;
        this.mimeType = "video/mp4";
        this.sizeBytes = sizeBytes;
        this.width = width;
        this.height = height;
        this.durationSecond = durationSecond;
        this.status = "TEMP";
    }

    // Chuyển file sang ATTACHED và ghi thời điểm file được gắn vào bài.
    public void attach(LocalDateTime now) {
        this.status = "ATTACHED";
        this.attachedAt = now;
    }

    // Đánh dấu file chờ tác vụ nền xóa trên Cloudinary.
    public void deletePending() { this.status = "DELETE_PENDING"; }
    // Chuyển file đã gỡ khỏi bài sang chờ xóa và bỏ thông tin thời điểm gắn.
    public void detach() {
        this.status = "DELETE_PENDING";
        this.attachedAt = null;
        this.nextCleanupAt = null;
    }
    // Đánh dấu file đang được nhận để dọn và hẹn thời điểm có thể nhận lại nếu cần.
    public void claimForCleanup(LocalDateTime nextAttempt) {
        this.status = "DELETE_PENDING";
        this.nextCleanupAt = nextAttempt;
    }
    // Tăng số lần dọn lỗi và hẹn thử lại sau 1, 5, 30 hoặc tối đa 120 phút.
    public void cleanupFailed(LocalDateTime now) {
        this.cleanupAttempts++;
        int minutes = switch (Math.min(cleanupAttempts, 4)) {
            case 1 -> 1;
            case 2 -> 5;
            case 3 -> 30;
            default -> 120;
        };
        this.nextCleanupAt = now.plusMinutes(minutes);
    }
    // Ghi nhận file đã xóa trên Cloudinary bằng trạng thái DELETED và bỏ lịch thử lại.
    public void cleanupSucceeded() {
        this.status = "DELETED";
        this.nextCleanupAt = null;
    }
    // Lấy UUID dùng để tham chiếu file trong database và API media.
    public UUID getMediaId() { return mediaId; }
    // Lấy phạm vi sử dụng file: SETUP hoặc REVIEW.
    public String getModule() { return module; }
    // Lấy loại tài nguyên Cloudinary: image hoặc video.
    public String getResourceType() { return resourceType; }
    // Lấy trạng thái vòng đời hiện tại của file.
    public String getStatus() { return status; }
    // Lấy tên tài nguyên Cloudinary dùng khi upload hoặc xóa file.
    public String getPublicId() { return publicId; }
    // Lấy mã người đã upload file để kiểm tra quyền sở hữu.
    public int getOwnerId() { return user.getUserId(); }
    // Lấy định dạng nội dung thực tế sau khi file đã được xử lý.
    public String getMimeType() { return mimeType; }
    // Lấy dung lượng file đã xử lý, tính theo byte.
    public Long getSizeBytes() { return sizeBytes; }
    // Lấy thời điểm file tạm hết hạn sử dụng.
    public LocalDateTime getExpiresAt() { return expiresAt; }
    // Lấy mã tài nguyên Cloudinary dùng để tải nội dung qua backend.
    public String getCloudinaryAssetId() { return cloudinaryAssetId; }
    // Lấy thời lượng video theo giây; ảnh không có thời lượng.
    public Integer getDurationSecond() { return durationSecond; }
}
