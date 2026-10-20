package com.pcstore.service;

import com.pcstore.dao.ReviewSocialDao;
import com.pcstore.dto.*;
import com.pcstore.entity.*;
import com.pcstore.entity.enums.*;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;

import com.pcstore.dao.ReviewDao;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Supplier;

public class ReviewSocialService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");
    private final EntityManager em;
    private final ReviewSocialDao reviews;

    public ReviewSocialService(EntityManager em) {
        this.em = em;
        this.reviews = new ReviewSocialDao(em);
    }

    public List<Map<String, Object>> listAllForAdmin(int userId) {
        requireUser(userId, UserRole.ADMIN);
        String sql = "SELECT r.review_id, r.order_item_id, i.order_id, i.product_id, p.name, "
                + "o.user_id, u.full_name, r.rating, r.content, r.status, "
                + "r.moderation_reason, r.moderated_by, r.moderated_at, "
                + "(SELECT count(*) FROM review_likes l WHERE l.review_id=r.review_id) as likes_count "
                + "FROM product_reviews r "
                + "JOIN order_items i ON i.order_item_id=r.order_item_id "
                + "JOIN orders o ON o.order_id=i.order_id "
                + "JOIN products p ON p.product_id=i.product_id "
                + "JOIN users u ON u.user_id=o.user_id "
                + "ORDER BY r.review_id DESC";
        List<?> rows = em.createNativeQuery(sql).getResultList();
        List<Map<String, Object>> list = new ArrayList<>();
        ReviewDao reviewDao = new ReviewDao(em);
        for (Object item : rows) {
            Object[] row = (Object[]) item;
            int reviewId = ((Number) row[0]).intValue();
            var mediaList = reviewDao.media(reviewId).stream()
                    .map(ReviewDto.Media::contentUrl).filter(Objects::nonNull).toList();
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("reviewId", reviewId);
            map.put("orderItemId", ((Number) row[1]).intValue());
            map.put("orderId", ((Number) row[2]).intValue());
            map.put("productId", ((Number) row[3]).intValue());
            map.put("productName", row[4]);
            map.put("userId", ((Number) row[5]).intValue());
            map.put("userName", row[6]);
            map.put("rating", ((Number) row[7]).intValue());
            map.put("content", row[8]);
            map.put("status", row[9]);
            map.put("moderationReason", row[10]);
            map.put("moderatedBy", row[11] == null ? null : ((Number) row[11]).intValue());
            map.put("moderatedAt", row[12] == null ? null : row[12].toString());
            map.put("likesCount", ((Number) row[13]).longValue());
            map.put("images", mediaList);
            map.put("verifiedBuyer", true);
            list.add(map);
        }
        return list;
    }

    public ReviewLikeResponse like(int userId, Integer reviewId) {
        return transaction(() -> {
            requireUser(userId, UserRole.CUSTOMER);
            ProductReview review = publishedReview(reviewId);
            int authorId = review.getOrderItem().getOrder().getUser().getUserId();
            if (authorId == userId)
                throw new AppException(403, "SELF_LIKE_NOT_ALLOWED", "Bạn không thể like review của mình.");
            if (!reviews.isLiked(reviewId, userId))
                reviews.insertLike(new ReviewLike(reviewId, userId, now()));
            em.flush();
            return new ReviewLikeResponse(reviewId, reviews.countLikes(reviewId), true);
        });
    }

    public ReviewLikeResponse unlike(int userId, Integer reviewId) {
        return transaction(() -> {
            requireUser(userId, UserRole.CUSTOMER);
            publishedReview(reviewId);
            ReviewLike like = reviews.findLike(reviewId, userId);
            if (like != null) reviews.deleteLike(like);
            em.flush();
            return new ReviewLikeResponse(reviewId, reviews.countLikes(reviewId), false);
        });
    }

    public ReviewModerationResponse moderate(int userId, Integer reviewId, ModerateReviewRequest request) {
        return transaction(() -> {
            User admin = requireUser(userId, UserRole.ADMIN);
            ReviewStatus target = moderationStatus(request);
            String reason = moderationReason(request, target);
            ProductReview review = existingReview(reviewId);
            if (review.getStatus() == ReviewStatus.DELETED)
                throw new AppException(409, "REVIEW_DELETED", "Admin không thể kiểm duyệt review đã bị chủ xóa.");
            // Retrying the same target does not replace another admin's reason or timestamp.
            if (review.getStatus() != target) {
                review.setStatus(target);
                review.setModerationReason(reason);
                review.setModeratedBy(admin);
                review.setModeratedAt(now());
                em.flush();
            }
            return new ReviewModerationResponse(review.getReviewId(), review.getStatus(),
                    review.getModerationReason(), review.getModeratedBy() == null ? null : review.getModeratedBy().getUserId(),
                    review.getModeratedAt());
        });
    }

    private User requireUser(int userId, UserRole role) {
        User user = userId <= 0 ? null : reviews.findUser(userId);
        if (user == null || user.getStatus() != UserStatus.ACTIVE)
            throw new AppException(401, "UNAUTHORIZED", "Phiên đăng nhập không còn hợp lệ.");
        if (user.getRole() != role)
            throw new AppException(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
        return user;
    }

    private ProductReview existingReview(Integer reviewId) {
        if (reviewId == null || reviewId <= 0)
            throw new AppException(400, "INVALID_ID", "Review ID phải là số nguyên dương.");
        ProductReview review = reviews.lockReview(reviewId);
        if (review == null) throw missing();
        return review;
    }

    private ProductReview publishedReview(Integer reviewId) {
        ProductReview review = existingReview(reviewId);
        if (review.getStatus() != ReviewStatus.PUBLISHED) throw missing();
        return review;
    }

    private static ReviewStatus moderationStatus(ModerateReviewRequest request) {
        if (request == null || !("PUBLISHED".equals(request.status()) || "HIDDEN".equals(request.status())))
            throw new AppException(400, "INVALID_REVIEW_STATUS", "Chỉ chấp nhận trạng thái HIDDEN hoặc PUBLISHED.");
        return ReviewStatus.valueOf(request.status());
    }

    private static String moderationReason(ModerateReviewRequest request, ReviewStatus target) {
        String reason = request.moderationReason();
        if (target == ReviewStatus.PUBLISHED) {
            if (reason != null) throw invalidReason();
            return null;
        }
        if (reason == null || reason.isBlank()) throw invalidReason();
        reason = reason.strip();
        if (reason.length() > 1000) throw invalidReason();
        return reason;
    }

    private static AppException invalidReason() {
        return new AppException(400, "INVALID_MODERATION_REASON", "Ẩn bài cần lý do từ 1 đến 1000 ký tự; khôi phục không gửi lý do.");
    }
    private static AppException missing() { return new AppException(404, "REVIEW_NOT_FOUND", "Không tìm thấy review."); }
    private static LocalDateTime now() {
        // PostgreSQL timestamp has microsecond precision: retry responses keep the same value.
        return LocalDateTime.now(ZONE).truncatedTo(ChronoUnit.MICROS);
    }

    private <T> T transaction(Supplier<T> operation) {
        var transaction = em.getTransaction();
        transaction.begin();
        try {
            T result = operation.get();
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) transaction.rollback();
            throw error;
        }
    }
}
