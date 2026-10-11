package com.pcstore.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "review_likes")
public class ReviewLike {
    @EmbeddedId
    private ReviewLikeId id;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public ReviewLike() { }
    public ReviewLike(int reviewId, int userId, LocalDateTime createdAt) {
        this.id = new ReviewLikeId(reviewId, userId);
        this.createdAt = createdAt;
    }
    public ReviewLikeId getId() { return id; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
