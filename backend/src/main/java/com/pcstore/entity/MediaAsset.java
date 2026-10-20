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

    public MediaAsset() { }

    public MediaAsset(UUID mediaId, User user, String module, String publicId,
                      LocalDateTime createdAt, LocalDateTime expiresAt) {
        this(mediaId, user, module, "image", publicId, createdAt, expiresAt);
    }

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

    public void ready(String cloudinaryAssetId, String mimeType, long sizeBytes, int width, int height) {
        this.cloudinaryAssetId = cloudinaryAssetId;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.width = width;
        this.height = height;
        this.status = "TEMP";
    }

    public void readyVideo(String cloudinaryAssetId, long sizeBytes, int width, int height, int durationSecond) {
        this.cloudinaryAssetId = cloudinaryAssetId;
        this.mimeType = "video/mp4";
        this.sizeBytes = sizeBytes;
        this.width = width;
        this.height = height;
        this.durationSecond = durationSecond;
        this.status = "TEMP";
    }

    public void attach(LocalDateTime now) {
        this.status = "ATTACHED";
        this.attachedAt = now;
    }

    public void deletePending() { this.status = "DELETE_PENDING"; }
    public void detach() {
        this.status = "DELETE_PENDING";
        this.attachedAt = null;
        this.nextCleanupAt = null;
    }
    public void claimForCleanup(LocalDateTime nextAttempt) {
        this.status = "DELETE_PENDING";
        this.nextCleanupAt = nextAttempt;
    }
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
    public void cleanupSucceeded() {
        this.status = "DELETED";
        this.nextCleanupAt = null;
    }
    public UUID getMediaId() { return mediaId; }
    public String getModule() { return module; }
    public String getResourceType() { return resourceType; }
    public String getStatus() { return status; }
    public String getPublicId() { return publicId; }
    public int getOwnerId() { return user.getUserId(); }
    public String getMimeType() { return mimeType; }
    public Long getSizeBytes() { return sizeBytes; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public String getCloudinaryAssetId() { return cloudinaryAssetId; }
    public Integer getDurationSecond() { return durationSecond; }
}
