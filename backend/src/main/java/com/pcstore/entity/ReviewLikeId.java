package com.pcstore.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ReviewLikeId implements Serializable {
    @Column(name = "review_id")
    private Integer reviewId;
    @Column(name = "user_id")
    private Integer userId;

    public ReviewLikeId() { }
    public ReviewLikeId(Integer reviewId, Integer userId) {
        this.reviewId = reviewId;
        this.userId = userId;
    }
    public Integer getReviewId() { return reviewId; }
    public Integer getUserId() { return userId; }

    @Override public boolean equals(Object other) {
        return other instanceof ReviewLikeId id
                && Objects.equals(reviewId, id.reviewId) && Objects.equals(userId, id.userId);
    }
    @Override public int hashCode() { return Objects.hash(reviewId, userId); }
}
