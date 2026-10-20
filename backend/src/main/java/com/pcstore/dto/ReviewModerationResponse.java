package com.pcstore.dto;

import com.pcstore.entity.enums.ReviewStatus;

import java.time.LocalDateTime;

public class ReviewModerationResponse {
    private int reviewId;
    private ReviewStatus status;
    private String moderationReason;
    private Integer moderatedBy;
    private LocalDateTime moderatedAt;

    public ReviewModerationResponse() {}

    public ReviewModerationResponse(
            int reviewId,
            ReviewStatus status,
            String moderationReason,
            Integer moderatedBy,
            LocalDateTime moderatedAt) {
        this.reviewId = reviewId;
        this.status = status;
        this.moderationReason = moderationReason;
        this.moderatedBy = moderatedBy;
        this.moderatedAt = moderatedAt;
    }

    public int getReviewId() {
        return reviewId;
    }

    public void setReviewId(int reviewId) {
        this.reviewId = reviewId;
    }

    public ReviewStatus getStatus() {
        return status;
    }

    public void setStatus(ReviewStatus status) {
        this.status = status;
    }

    public String getModerationReason() {
        return moderationReason;
    }

    public void setModerationReason(String moderationReason) {
        this.moderationReason = moderationReason;
    }

    public Integer getModeratedBy() {
        return moderatedBy;
    }

    public void setModeratedBy(Integer moderatedBy) {
        this.moderatedBy = moderatedBy;
    }

    public LocalDateTime getModeratedAt() {
        return moderatedAt;
    }

    public void setModeratedAt(LocalDateTime moderatedAt) {
        this.moderatedAt = moderatedAt;
    }
}
