package com.pcstore.dao;

import com.pcstore.entity.ProductReview;
import com.pcstore.entity.ReviewLike;
import com.pcstore.entity.ReviewLikeId;
import com.pcstore.entity.User;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Query;

import java.util.List;

/** Queries only; permissions and transaction boundaries belong to ReviewSocialService. */
public class ReviewSocialDao {
    private final EntityManager entityManager;

    public ReviewSocialDao(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public User findUser(int userId) {
        return entityManager.find(User.class, userId);
    }

    // All like/unlike/moderation writes use the same review lock before reading its state.
    public ProductReview lockReview(int reviewId) {
        return entityManager.find(ProductReview.class, reviewId, LockModeType.PESSIMISTIC_WRITE);
    }

    public boolean isLiked(int reviewId, int userId) {
        return findLike(reviewId, userId) != null;
    }

    public long countLikes(int reviewId) {
        return entityManager
                .createQuery(
                        "SELECT COUNT(l) FROM ReviewLike l WHERE l.id.reviewId = :reviewId",
                        Long.class)
                .setParameter("reviewId", reviewId)
                .getSingleResult();
    }

    public ReviewLike findLike(int reviewId, int userId) {
        return entityManager.find(ReviewLike.class, new ReviewLikeId(reviewId, userId));
    }

    public void insertLike(ReviewLike like) {
        entityManager.persist(like);
    }

    public void deleteLike(ReviewLike like) {
        entityManager.remove(like);
    }

    public List<?> findAllForAdmin() {
        String sql =
                "SELECT r.review_id, r.order_item_id, i.order_id, i.product_id, p.name, o.user_id,"
                    + " u.full_name, r.rating, r.content, r.status, r.moderation_reason,"
                    + " r.moderated_by, r.moderated_at, (SELECT count(*) FROM review_likes l WHERE"
                    + " l.review_id=r.review_id) as likes_count FROM product_reviews r JOIN"
                    + " order_items i ON i.order_item_id=r.order_item_id JOIN orders o ON"
                    + " o.order_id=i.order_id JOIN products p ON p.product_id=i.product_id JOIN"
                    + " users u ON u.user_id=o.user_id ORDER BY r.review_id DESC";
        Query query = entityManager.createNativeQuery(sql);
        return query.getResultList();
    }
}
