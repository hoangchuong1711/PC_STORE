package com.pcstore.entity;

import com.pcstore.entity.enums.ReviewStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Maps the existing T10 table. The author comes from orderItem.order.user. */
@Entity
@Table(name = "product_reviews")
public class ProductReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Integer reviewId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id", nullable = false, unique = true)
    private OrderItem orderItem;

    @Column(name = "rating", nullable = false)
    private int rating;

    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private ReviewStatus status = ReviewStatus.PUBLISHED;

    @Column(name = "moderation_reason", columnDefinition = "text")
    private String moderationReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "moderated_by")
    private User moderatedBy;

    @Column(name = "moderated_at")
    private LocalDateTime moderatedAt;

    public ProductReview() { }

    public Integer getReviewId() { return reviewId; }
    public OrderItem getOrderItem() { return orderItem; }
    public void setOrderItem(OrderItem orderItem) { this.orderItem = orderItem; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public ReviewStatus getStatus() { return status; }
    public void setStatus(ReviewStatus status) { this.status = status; }
    public String getModerationReason() { return moderationReason; }
    public void setModerationReason(String reason) { this.moderationReason = reason; }
    public User getModeratedBy() { return moderatedBy; }
    public void setModeratedBy(User user) { this.moderatedBy = user; }
    public LocalDateTime getModeratedAt() { return moderatedAt; }
    public void setModeratedAt(LocalDateTime at) { this.moderatedAt = at; }
}
