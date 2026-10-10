package com.pcstore.service;

import com.pcstore.dao.ReviewDao;
import com.pcstore.dto.ReviewDto;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;

import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

public final class ReviewService {
    private static final int MAX_CONTENT_LENGTH = 5000;
    private final EntityManager em;
    private final ReviewDao dao;
    private final MediaAttachmentService media = new MediaAttachmentService();

    public ReviewService(EntityManager em) {
        this.em = em;
        this.dao = new ReviewDao(em);
    }

    public ReviewDto.Response create(int userId, ReviewDto.CreateRequest request) {
        ValidCreate valid = validate(request);
        return transaction(() -> {
            customer(userId);
            ReviewDao.OrderLine line = dao.orderLine(valid.orderItemId(), true);
            if (line == null) throw new AppException(404, "REVIEW_ORDER_ITEM_NOT_FOUND", "Không tìm thấy dòng đơn hàng.");
            if (line.ownerId() != userId)
                throw new AppException(403, "REVIEW_ORDER_ITEM_NOT_OWNED", "Dòng đơn hàng không thuộc tài khoản này.");
            if (line.productId() != valid.productId())
                throw new AppException(409, "REVIEW_PRODUCT_MISMATCH", "Sản phẩm không khớp dòng đơn hàng.");
            if (!"DELIVERED".equals(line.orderStatus()) || !line.deliveredAtPresent())
                throw new AppException(409, "REVIEW_ORDER_NOT_DELIVERED", "Chỉ được đánh giá sau khi đơn đã giao.");
            if (dao.reviewIdForOrderItem(line.orderItemId()) != null) throw duplicate();
            final int reviewId;
            try {
                reviewId = dao.insert(line.orderItemId(), valid.rating(), valid.content());
            } catch (PersistenceException exception) {
                throw duplicate();
            }
            media.attachReviewMedia(em, userId, reviewId, valid.mediaIds());
            return response(dao.find(reviewId, userId, false, false), userId);
        });
    }

    public ReviewDto.Response update(int userId, int reviewId, ReviewDto.UpdateRequest request) {
        validate(request);
        return transaction(() -> {
            customer(userId);
            ReviewDao.ReviewRow review = owned(userId, reviewId, true);
            editable(review);
            int rating = request.rating() == null ? review.rating() : request.rating();
            String content = request.content() == null ? review.content() : request.content().trim();
            dao.update(reviewId, rating, content);
            if (request.mediaIds() != null) media.replaceReviewMedia(em, userId, reviewId, request.mediaIds());
            return response(dao.find(reviewId, userId, false, false), userId);
        });
    }

    public void delete(int userId, int reviewId) {
        transaction(() -> {
            customer(userId);
            ReviewDao.ReviewRow review = owned(userId, reviewId, true);
            if ("HIDDEN".equals(review.status())) throw notEditable();
            if (!"DELETED".equals(review.status())) dao.status(reviewId, "DELETED");
            return null;
        });
    }

    public ReviewDto.Response restore(int userId, int reviewId) {
        return transaction(() -> {
            customer(userId);
            ReviewDao.ReviewRow review = owned(userId, reviewId, true);
            if ("HIDDEN".equals(review.status())) throw notEditable();
            if ("DELETED".equals(review.status())) dao.status(reviewId, "PUBLISHED");
            return response(dao.find(reviewId, userId, false, false), userId);
        });
    }

    public ReviewDto.Response getOwn(int userId, int reviewId) {
        customer(userId);
        return response(owned(userId, reviewId, false), userId);
    }

    public ReviewDto.Response getOwnByOrderItem(int userId, int orderItemId) {
        customer(userId);
        ReviewDao.ReviewRow review = orderItemId <= 0 ? null : dao.findOwnedByOrderItem(userId, orderItemId);
        if (review == null) throw missing();
        return response(review, userId);
    }

    public ReviewDto.PageResponse listPublic(int productId, int page, int size, Integer rating,
                                             Boolean hasMedia, ReviewDto.Sort sort, Integer currentUserId) {
        requirePublicProduct(productId);
        if (rating != null && (rating < 1 || rating > 5))
            throw new AppException(400, "INVALID_REVIEW_FILTER", "rating phải từ 1 đến 5.");
        List<ReviewDto.Response> items = dao.publicIds(productId, page, size, rating, hasMedia, sort).stream()
                .map(id -> response(dao.find(id, null, true, false), currentUserId)).toList();
        long total = dao.publicCount(productId, rating, hasMedia);
        int pages = total == 0 ? 0 : (int) ((total + size - 1) / size);
        return new ReviewDto.PageResponse(items, page, size, total, pages, dao.summary(productId));
    }

    public ReviewDto.Summary summary(int productId) {
        requirePublicProduct(productId);
        return dao.summary(productId);
    }

    private ReviewDto.Response response(ReviewDao.ReviewRow review, Integer currentUserId) {
        return new ReviewDto.Response(review.reviewId(), review.orderItemId(), review.orderId(), review.productId(),
                review.productName(), new ReviewDto.Author(review.authorId(), review.authorName()),
                review.rating(), review.content(), review.status(), dao.media(review.reviewId()),
                dao.likeCount(review.reviewId()), dao.liked(review.reviewId(), currentUserId), true);
    }

    private ReviewDao.ReviewRow owned(int userId, int reviewId, boolean lock) {
        ReviewDao.ReviewRow review = reviewId <= 0 ? null : dao.find(reviewId, userId, false, lock);
        if (review == null) throw missing();
        return review;
    }

    private void requirePublicProduct(int productId) {
        if (productId <= 0 || !dao.publicProduct(productId))
            throw new AppException(404, "REVIEW_PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm công khai.");
    }

    private void customer(int userId) {
        if (!dao.activeCustomer(userId))
            throw new AppException(403, "FORBIDDEN", "Chỉ khách hàng đang hoạt động được dùng Review.");
    }

    private static void editable(ReviewDao.ReviewRow review) {
        if (!"PUBLISHED".equals(review.status())) throw notEditable();
    }

    private static ValidCreate validate(ReviewDto.CreateRequest request) {
        if (request == null || request.orderItemId() == null || request.orderItemId() <= 0
                || request.productId() == null || request.productId() <= 0)
            throw invalid("orderItemId và productId phải là số nguyên dương.");
        validateRating(request.rating());
        String content = validateContent(request.content());
        List<UUID> mediaIds = request.mediaIds() == null ? List.of() : List.copyOf(request.mediaIds());
        validateMedia(mediaIds);
        return new ValidCreate(request.orderItemId(), request.productId(), request.rating(), content, mediaIds);
    }

    private static void validate(ReviewDto.UpdateRequest request) {
        if (request == null || (request.rating() == null && request.content() == null && request.mediaIds() == null))
            throw invalid("Cần ít nhất một trường rating, content hoặc mediaIds.");
        if (request.rating() != null) validateRating(request.rating());
        if (request.content() != null) validateContent(request.content());
        if (request.mediaIds() != null) validateMedia(request.mediaIds());
    }

    private static void validateRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) throw invalid("rating phải từ 1 đến 5.");
    }

    private static String validateContent(String content) {
        String clean = content == null ? "" : content.trim();
        if (clean.isEmpty() || clean.length() > MAX_CONTENT_LENGTH)
            throw invalid("content phải có từ 1 đến 5000 ký tự sau khi bỏ khoảng trắng đầu/cuối.");
        return clean;
    }

    private static void validateMedia(List<UUID> ids) {
        if (ids.size() > 6 || ids.stream().anyMatch(id -> id == null)
                || new HashSet<>(ids).size() != ids.size())
            throw new AppException(422, "INVALID_REVIEW_MEDIA", "Review có tối đa 6 media và không được trùng.");
    }

    private <T> T transaction(Supplier<T> operation) {
        var tx = em.getTransaction();
        tx.begin();
        try {
            T result = operation.get();
            tx.commit();
            return result;
        } catch (RuntimeException exception) {
            if (tx.isActive()) tx.rollback();
            throw exception;
        }
    }

    private static AppException invalid(String message) { return new AppException(400, "INVALID_REVIEW", message); }
    private static AppException duplicate() { return new AppException(409, "REVIEW_ALREADY_EXISTS", "Dòng đơn hàng đã có Review."); }
    private static AppException missing() { return new AppException(404, "REVIEW_NOT_FOUND", "Không tìm thấy Review."); }
    private static AppException notEditable() { return new AppException(409, "REVIEW_NOT_EDITABLE", "Review bị ẩn hoặc đã xóa nên không thể sửa."); }

    private record ValidCreate(int orderItemId, int productId, int rating, String content,
                               List<UUID> mediaIds) { }
}
