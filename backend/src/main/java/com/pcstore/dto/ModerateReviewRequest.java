package com.pcstore.dto;

public class ModerateReviewRequest {
    private String status;
    private String moderationReason;

    public ModerateReviewRequest() {}

    public ModerateReviewRequest(String status, String moderationReason) {
        this.status = status;
        this.moderationReason = moderationReason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getModerationReason() {
        return moderationReason;
    }

    public void setModerationReason(String moderationReason) {
        this.moderationReason = moderationReason;
    }
}
