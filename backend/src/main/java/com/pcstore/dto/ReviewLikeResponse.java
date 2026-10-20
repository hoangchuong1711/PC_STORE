package com.pcstore.dto;

public class ReviewLikeResponse {
    private int reviewId;
    private long likesCount;
    private boolean isLiked;

    public ReviewLikeResponse() {}

    public ReviewLikeResponse(int reviewId, long likesCount, boolean isLiked) {
        this.reviewId = reviewId;
        this.likesCount = likesCount;
        this.isLiked = isLiked;
    }

    public int getReviewId() {
        return reviewId;
    }

    public void setReviewId(int reviewId) {
        this.reviewId = reviewId;
    }

    public long getLikesCount() {
        return likesCount;
    }

    public void setLikesCount(long likesCount) {
        this.likesCount = likesCount;
    }

    public boolean getIsLiked() {
        return isLiked;
    }

    public void setIsLiked(boolean isLiked) {
        this.isLiked = isLiked;
    }
}
