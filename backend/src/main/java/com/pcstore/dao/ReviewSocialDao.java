package com.pcstore.dao;

import com.pcstore.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

/** Queries only; permissions and transaction boundaries belong to ReviewSocialService. */
public class ReviewSocialDao {
    private final EntityManager em;

    public ReviewSocialDao(EntityManager em) { this.em = em; }

    public User findUser(int userId) { return em.find(User.class, userId); }

    // All like/unlike/moderation writes use the same review lock before reading its state.
    public ProductReview lockReview(int reviewId) {
        return em.find(ProductReview.class, reviewId, LockModeType.PESSIMISTIC_WRITE);
    }

    public boolean isLiked(int reviewId, int userId) { return findLike(reviewId, userId) != null; }

    public long countLikes(int reviewId) {
        return em.createQuery("SELECT COUNT(l) FROM ReviewLike l WHERE l.id.reviewId = :reviewId", Long.class)
                .setParameter("reviewId", reviewId).getSingleResult();
    }

    public ReviewLike findLike(int reviewId, int userId) {
        return em.find(ReviewLike.class, new ReviewLikeId(reviewId, userId));
    }

    public void insertLike(ReviewLike like) { em.persist(like); }
    public void deleteLike(ReviewLike like) { em.remove(like); }
}
