package com.pcstore.service;

import com.pcstore.dao.ReviewDao;
import com.pcstore.dto.ReviewDto;
import com.pcstore.exception.AppException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.persistence.PersistenceException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

public final class ReviewService {
    private static final int MAX_CONTENT_LENGTH = 5000;
    private final EntityManager entityManager;
    private final ReviewDao dao;
    private final MediaAttachmentService media = new MediaAttachmentService();

    public ReviewService(EntityManager entityManager) {
        this.entityManager = entityManager;
        this.dao = new ReviewDao(entityManager);
    }

    public ReviewDto.Response create(int userId, ReviewDto.CreateRequest request) {
        // 1. Kiểm tra đầu vào và bỏ khoảng trắng thừa trước khi mở transaction.
        ReviewDto.CreateRequest valid = validate(request);
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            // 2. Kiểm tra người mua, dòng đơn, sản phẩm và trạng thái giao hàng.
            requireActiveCustomer(userId);
            ReviewDao.OrderLine line = dao.orderLine(valid.getOrderItemId(), true);
            if (line == null) {
                throw new AppException(
                        404, "REVIEW_ORDER_ITEM_NOT_FOUND", "Không tìm thấy dòng đơn hàng.");
            }
            if (line.getOwnerId() != userId) {
                throw new AppException(
                        403,
                        "REVIEW_ORDER_ITEM_NOT_OWNED",
                        "Dòng đơn hàng không thuộc tài khoản này.");
            }
            if (line.getProductId() != valid.getProductId()) {
                throw new AppException(
                        409, "REVIEW_PRODUCT_MISMATCH", "Sản phẩm không khớp dòng đơn hàng.");
            }
            if (!"DELIVERED".equals(line.getOrderStatus()) || !line.getDeliveredAtPresent()) {
                throw new AppException(
                        409,
                        "REVIEW_ORDER_NOT_DELIVERED",
                        "Chỉ được đánh giá sau khi đơn đã giao.");
            }
            if (dao.reviewIdForOrderItem(line.getOrderItemId()) != null) {
                throw reviewAlreadyExists();
            }
            // 3. Lưu review và gắn media trong cùng transaction: lỗi thì hoàn tác tất cả.
            final int reviewId;
            try {
                reviewId = dao.insert(line.getOrderItemId(), valid.getRating(), valid.getContent());
            } catch (PersistenceException exception) {
                throw reviewAlreadyExists();
            }
            media.attachReviewMedia(entityManager, userId, reviewId, valid.getMediaIds());
            ReviewDto.Response result =
                    toResponse(dao.find(reviewId, userId, false, false), userId);
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    public ReviewDto.Response update(int userId, int reviewId, ReviewDto.UpdateRequest request) {
        validate(request);
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireActiveCustomer(userId);
            ReviewDao.ReviewRow review = findOwnedReview(userId, reviewId, true);
            requireEditableReview(review);
            int rating = request.getRating() == null ? review.getRating() : request.getRating();
            String content =
                    request.getContent() == null
                            ? review.getContent()
                            : request.getContent().trim();
            dao.update(reviewId, rating, content);
            if (request.getMediaIds() != null) {
                media.replaceReviewMedia(entityManager, userId, reviewId, request.getMediaIds());
            }
            ReviewDto.Response result =
                    toResponse(dao.find(reviewId, userId, false, false), userId);
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    public void delete(int userId, int reviewId) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireActiveCustomer(userId);
            ReviewDao.ReviewRow review = findOwnedReview(userId, reviewId, true);
            if ("HIDDEN".equals(review.getStatus())) {
                throw reviewNotEditable();
            }
            if (!"DELETED".equals(review.getStatus())) {
                dao.status(reviewId, "DELETED");
            }
            transaction.commit();
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    public ReviewDto.Response restore(int userId, int reviewId) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireActiveCustomer(userId);
            ReviewDao.ReviewRow review = findOwnedReview(userId, reviewId, true);
            if ("HIDDEN".equals(review.getStatus())) {
                throw reviewNotEditable();
            }
            if ("DELETED".equals(review.getStatus())) {
                dao.status(reviewId, "PUBLISHED");
            }
            ReviewDto.Response result =
                    toResponse(dao.find(reviewId, userId, false, false), userId);
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    public ReviewDto.Response getOwn(int userId, int reviewId) {
        requireActiveCustomer(userId);
        return toResponse(findOwnedReview(userId, reviewId, false), userId);
    }

    public ReviewDto.Response getOwnByOrderItem(int userId, int orderItemId) {
        requireActiveCustomer(userId);
        ReviewDao.ReviewRow review =
                orderItemId <= 0 ? null : dao.findOwnedByOrderItem(userId, orderItemId);
        if (review == null) {
            throw reviewNotFound();
        }
        return toResponse(review, userId);
    }

    public ReviewDto.PageResponse listPublic(
            int productId,
            int page,
            int size,
            Integer rating,
            Boolean hasMedia,
            ReviewDto.Sort sort,
            Integer currentUserId) {
        requirePublicProduct(productId);
        if (rating != null && (rating < 1 || rating > 5)) {
            throw new AppException(400, "INVALID_REVIEW_FILTER", "rating phải từ 1 đến 5.");
        }
        List<ReviewDto.Response> items = new ArrayList<>();
        for (int reviewId : dao.publicIds(productId, page, size, rating, hasMedia, sort)) {
            ReviewDao.ReviewRow review = dao.find(reviewId, null, true, false);
            items.add(toResponse(review, currentUserId));
        }
        long total = dao.publicCount(productId, rating, hasMedia);
        int pages = total == 0 ? 0 : (int) ((total + size - 1) / size);
        return new ReviewDto.PageResponse(items, page, size, total, pages, dao.summary(productId));
    }

    public ReviewDto.Summary summary(int productId) {
        requirePublicProduct(productId);
        return dao.summary(productId);
    }

    private ReviewDto.Response toResponse(ReviewDao.ReviewRow review, Integer currentUserId) {
        return new ReviewDto.Response(
                review.getReviewId(),
                review.getOrderItemId(),
                review.getOrderId(),
                review.getProductId(),
                review.getProductName(),
                new ReviewDto.Author(review.getAuthorId(), review.getAuthorName()),
                review.getRating(),
                review.getContent(),
                review.getStatus(),
                dao.media(review.getReviewId()),
                dao.likeCount(review.getReviewId()),
                dao.liked(review.getReviewId(), currentUserId),
                true);
    }

    private ReviewDao.ReviewRow findOwnedReview(int userId, int reviewId, boolean lock) {
        ReviewDao.ReviewRow review = reviewId <= 0 ? null : dao.find(reviewId, userId, false, lock);
        if (review == null) {
            throw reviewNotFound();
        }
        return review;
    }

    private void requirePublicProduct(int productId) {
        if (productId <= 0 || !dao.publicProduct(productId)) {
            throw new AppException(
                    404, "REVIEW_PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm công khai.");
        }
    }

    private void requireActiveCustomer(int userId) {
        if (!dao.activeCustomer(userId)) {
            throw new AppException(
                    403, "FORBIDDEN", "Chỉ khách hàng đang hoạt động được dùng Review.");
        }
    }

    private static void requireEditableReview(ReviewDao.ReviewRow review) {
        if (!"PUBLISHED".equals(review.getStatus())) {
            throw reviewNotEditable();
        }
    }

    private static ReviewDto.CreateRequest validate(ReviewDto.CreateRequest request) {
        if (request == null
                || request.getOrderItemId() == null
                || request.getOrderItemId() <= 0
                || request.getProductId() == null
                || request.getProductId() <= 0) {
            throw invalidReview("orderItemId và productId phải là số nguyên dương.");
        }
        validateRating(request.getRating());
        String content = validateContent(request.getContent());
        List<UUID> mediaIds =
                request.getMediaIds() == null ? List.of() : List.copyOf(request.getMediaIds());
        validateMedia(mediaIds);
        return new ReviewDto.CreateRequest(
                request.getOrderItemId(),
                request.getProductId(),
                request.getRating(),
                content,
                mediaIds);
    }

    private static void validate(ReviewDto.UpdateRequest request) {
        if (request == null
                || (request.getRating() == null
                        && request.getContent() == null
                        && request.getMediaIds() == null)) {
            throw invalidReview("Cần ít nhất một trường rating, content hoặc mediaIds.");
        }
        if (request.getRating() != null) {
            validateRating(request.getRating());
        }
        if (request.getContent() != null) {
            validateContent(request.getContent());
        }
        if (request.getMediaIds() != null) {
            validateMedia(request.getMediaIds());
        }
    }

    private static void validateRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw invalidReview("rating phải từ 1 đến 5.");
        }
    }

    private static String validateContent(String content) {
        String clean = content == null ? "" : content.trim();
        if (clean.isEmpty() || clean.length() > MAX_CONTENT_LENGTH) {
            throw invalidReview(
                    "content phải có từ 1 đến 5000 ký tự sau khi bỏ khoảng trắng đầu/cuối.");
        }
        return clean;
    }

    private static void validateMedia(List<UUID> ids) {
        if (ids.size() > 6
                || hasNullMedia(ids)
                || new HashSet<>(ids).size() != ids.size()) {
            throw new AppException(
                    422, "INVALID_REVIEW_MEDIA", "Review có tối đa 6 media và không được trùng.");
        }
    }

    private static AppException invalidReview(String message) {
        return new AppException(400, "INVALID_REVIEW", message);
    }

    private static AppException reviewAlreadyExists() {
        return new AppException(409, "REVIEW_ALREADY_EXISTS", "Dòng đơn hàng đã có Review.");
    }

    private static AppException reviewNotFound() {
        return new AppException(404, "REVIEW_NOT_FOUND", "Không tìm thấy Review.");
    }

    private static AppException reviewNotEditable() {
        return new AppException(
                409, "REVIEW_NOT_EDITABLE", "Review bị ẩn hoặc đã xóa nên không thể sửa.");
    }

    private static boolean hasNullMedia(List<UUID> ids) {
        for (UUID id : ids) {
            if (id == null) {
                return true;
            }
        }
        return false;
    }
}
