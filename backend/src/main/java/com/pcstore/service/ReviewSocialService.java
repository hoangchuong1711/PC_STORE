package com.pcstore.service;

import com.pcstore.dao.ReviewDao;
import com.pcstore.dao.ReviewSocialDao;
import com.pcstore.dto.ModerateReviewRequest;
import com.pcstore.dto.ReviewDto;
import com.pcstore.dto.ReviewLikeResponse;
import com.pcstore.dto.ReviewModerationResponse;
import com.pcstore.entity.ProductReview;
import com.pcstore.entity.ReviewLike;
import com.pcstore.entity.User;
import com.pcstore.entity.enums.ReviewStatus;
import com.pcstore.entity.enums.UserRole;
import com.pcstore.entity.enums.UserStatus;
import com.pcstore.exception.AppException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ReviewSocialService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");
    private final EntityManager entityManager;
    private final ReviewSocialDao reviews;

    // Khởi tạo DAO và dùng chung EntityManager cho lượt thích, kiểm duyệt Review.
    public ReviewSocialService(EntityManager entityManager) {
        this.entityManager = entityManager;
        this.reviews = new ReviewSocialDao(entityManager);
    }

    // Kiểm tra quyền admin rồi ghép danh sách Review với media, lượt thích và thông tin kiểm duyệt.
    public List<Map<String, Object>> listAllForAdmin(int userId) {
        requireUser(userId, UserRole.ADMIN);
        List<?> rows = reviews.findAllForAdmin();
        List<Map<String, Object>> list = new ArrayList<>();
        ReviewDao reviewDao = new ReviewDao(entityManager);
        for (Object item : rows) {
            Object[] row = (Object[]) item;
            int reviewId = ((Number) row[0]).intValue();
            List<String> mediaList = new ArrayList<>();
            for (ReviewDto.Media media : reviewDao.media(reviewId)) {
                if (media.getContentUrl() != null) {
                    mediaList.add(media.getContentUrl());
                }
            }
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

    // Cho khách hàng thích Review đang công khai của người khác; gọi lại không tạo lượt thích trùng.
    public ReviewLikeResponse like(int userId, Integer reviewId) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireUser(userId, UserRole.CUSTOMER);
            ProductReview review = publishedReview(reviewId);
            int authorId = review.getOrderItem().getOrder().getUser().getUserId();
            if (authorId == userId) {
                throw new AppException(
                        403, "SELF_LIKE_NOT_ALLOWED", "Bạn không thể like review của mình.");
            }
            if (!reviews.isLiked(reviewId, userId)) {
                reviews.insertLike(new ReviewLike(reviewId, userId, now()));
            }
            entityManager.flush();
            ReviewLikeResponse result =
                    new ReviewLikeResponse(reviewId, reviews.countLikes(reviewId), true);
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    // Bỏ lượt thích Review đang công khai; nếu chưa thích thì giữ nguyên dữ liệu.
    public ReviewLikeResponse unlike(int userId, Integer reviewId) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireUser(userId, UserRole.CUSTOMER);
            publishedReview(reviewId);
            ReviewLike like = reviews.findLike(reviewId, userId);
            if (like != null) {
                reviews.deleteLike(like);
            }
            entityManager.flush();
            ReviewLikeResponse result =
                    new ReviewLikeResponse(reviewId, reviews.countLikes(reviewId), false);
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    // Cho admin ẩn hoặc công khai Review chưa bị chủ xóa; chỉ cập nhật lý do khi đổi trạng thái.
    public ReviewModerationResponse moderate(
            int userId, Integer reviewId, ModerateReviewRequest request) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            User admin = requireUser(userId, UserRole.ADMIN);
            ReviewStatus target = moderationStatus(request);
            String reason = moderationReason(request, target);
            ProductReview review = existingReview(reviewId);
            if (review.getStatus() == ReviewStatus.DELETED) {
                throw new AppException(
                        409, "REVIEW_DELETED", "Admin không thể kiểm duyệt review đã bị chủ xóa.");
            }
            // Retrying the same target does not replace another admin's reason or timestamp.
            if (review.getStatus() != target) {
                review.setStatus(target);
                review.setModerationReason(reason);
                review.setModeratedBy(admin);
                review.setModeratedAt(now());
                entityManager.flush();
            }
            ReviewModerationResponse result =
                    new ReviewModerationResponse(
                            review.getReviewId(),
                            review.getStatus(),
                            review.getModerationReason(),
                            review.getModeratedBy() == null
                                    ? null
                                    : review.getModeratedBy().getUserId(),
                            review.getModeratedAt());
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    // Kiểm tra tài khoản còn hoạt động và có đúng vai trò cần cho thao tác.
    private User requireUser(int userId, UserRole role) {
        User user = userId <= 0 ? null : reviews.findUser(userId);
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(401, "UNAUTHORIZED", "Phiên đăng nhập không còn hợp lệ.");
        }
        if (user.getRole() != role) {
            throw new AppException(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
        }
        return user;
    }

    // Kiểm tra mã Review và khóa bản ghi để các thao tác ghi không xung đột.
    private ProductReview existingReview(Integer reviewId) {
        if (reviewId == null || reviewId <= 0) {
            throw new AppException(400, "INVALID_ID", "Review ID phải là số nguyên dương.");
        }
        ProductReview review = reviews.lockReview(reviewId);
        if (review == null) {
            throw missing();
        }
        return review;
    }

    // Lấy và khóa Review đang công khai để xử lý like hoặc bỏ like.
    private ProductReview publishedReview(Integer reviewId) {
        ProductReview review = existingReview(reviewId);
        if (review.getStatus() != ReviewStatus.PUBLISHED) {
            throw missing();
        }
        return review;
    }

    // Chỉ chấp nhận trạng thái kiểm duyệt HIDDEN hoặc PUBLISHED.
    private static ReviewStatus moderationStatus(ModerateReviewRequest request) {
        if (request == null
                || request.getStatus() == null
                || !(request.getStatus().equals("PUBLISHED")
                        || request.getStatus().equals("HIDDEN"))) {
            throw new AppException(
                    400,
                    "INVALID_REVIEW_STATUS",
                    "Chỉ chấp nhận trạng thái HIDDEN hoặc PUBLISHED.");
        }
        return ReviewStatus.valueOf(request.getStatus());
    }

    // Ẩn bài phải có lý do 1–1000 ký tự; công khai lại không được gửi lý do.
    private static String moderationReason(ModerateReviewRequest request, ReviewStatus target) {
        String reason = request.getModerationReason();
        if (target == ReviewStatus.PUBLISHED) {
            if (reason != null) {
                throw invalidReason();
            }
            return null;
        }
        if (reason == null || reason.isBlank()) {
            throw invalidReason();
        }
        reason = reason.strip();
        if (reason.length() > 1000) {
            throw invalidReason();
        }
        return reason;
    }

    // Tạo lỗi 400 khi lý do kiểm duyệt không đúng quy định.
    private static AppException invalidReason() {
        return new AppException(
                400,
                "INVALID_MODERATION_REASON",
                "Ẩn bài cần lý do từ 1 đến 1000 ký tự; khôi phục không gửi lý do.");
    }

    // Tạo lỗi 404 khi không tìm thấy Review được phép thao tác.
    private static AppException missing() {
        return new AppException(404, "REVIEW_NOT_FOUND", "Không tìm thấy review.");
    }

    // Lấy thời gian kiểm duyệt hoặc like, giữ độ chính xác micro giây tương thích PostgreSQL.
    private static LocalDateTime now() {
        // PostgreSQL timestamp has microsecond precision: retry responses keep the same value.
        return LocalDateTime.now(ZONE).truncatedTo(ChronoUnit.MICROS);
    }
}
