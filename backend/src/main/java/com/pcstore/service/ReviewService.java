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

    // Khởi tạo DAO dùng chung EntityManager để các bước lưu Review nằm trong cùng transaction.
    public ReviewService(EntityManager entityManager) {
        this.entityManager = entityManager;
        this.dao = new ReviewDao(entityManager);
    }

    // Tạo Review cho dòng đơn thuộc người mua đã nhận hàng; mỗi dòng chỉ có một Review, media lưu cùng bài.
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
            if (!line.getOrderStatus().equals("DELIVERED") || !line.getDeliveredAtPresent()) {
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

    // Sửa Review đang công khai của chính người mua; trường không gửi trong PATCH được giữ nguyên.
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

    // Xóa mềm Review của người mua bằng trạng thái DELETED; không cho tự xóa bài đang bị admin ẩn.
    public void delete(int userId, int reviewId) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireActiveCustomer(userId);
            ReviewDao.ReviewRow review = findOwnedReview(userId, reviewId, true);
            if (review.getStatus().equals("HIDDEN")) {
                throw reviewNotEditable();
            }
            if (!review.getStatus().equals("DELETED")) {
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

    // Khôi phục Review đã xóa về PUBLISHED; không cho chủ bài tự khôi phục bài bị admin ẩn.
    public ReviewDto.Response restore(int userId, int reviewId) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireActiveCustomer(userId);
            ReviewDao.ReviewRow review = findOwnedReview(userId, reviewId, true);
            if (review.getStatus().equals("HIDDEN")) {
                throw reviewNotEditable();
            }
            if (review.getStatus().equals("DELETED")) {
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

    // Lấy chi tiết Review thuộc khách hàng đang hoạt động, kể cả bài đã ẩn hoặc xóa.
    public ReviewDto.Response getOwn(int userId, int reviewId) {
        requireActiveCustomer(userId);
        return toResponse(findOwnedReview(userId, reviewId, false), userId);
    }

    // Tìm Review của người mua theo dòng đơn hàng để hiển thị lại đánh giá đã viết.
    public ReviewDto.Response getOwnByOrderItem(int userId, int orderItemId) {
        requireActiveCustomer(userId);
        ReviewDao.ReviewRow review =
                orderItemId <= 0 ? null : dao.findOwnedByOrderItem(userId, orderItemId);
        if (review == null) {
            throw reviewNotFound();
        }
        return toResponse(review, userId);
    }

    // Lọc, sắp xếp và phân trang Review công khai của sản phẩm, kèm thống kê và trạng thái like.
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

    // Lấy điểm trung bình và phân bố số sao của sản phẩm được phép hiển thị công khai.
    public ReviewDto.Summary summary(int productId) {
        requirePublicProduct(productId);
        return dao.summary(productId);
    }

    // Ghép dữ liệu Review, tác giả, media và lượt thích thành kết quả trả cho giao diện.
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

    // Tìm Review đúng chủ sở hữu, có thể khóa bản ghi trước khi sửa; báo lỗi nếu không tìm thấy.
    private ReviewDao.ReviewRow findOwnedReview(int userId, int reviewId, boolean lock) {
        ReviewDao.ReviewRow review = reviewId <= 0 ? null : dao.find(reviewId, userId, false, lock);
        if (review == null) {
            throw reviewNotFound();
        }
        return review;
    }

    // Chỉ cho xem Review công khai khi sản phẩm, danh mục và thương hiệu đều đang hoạt động.
    private void requirePublicProduct(int productId) {
        if (productId <= 0 || !dao.publicProduct(productId)) {
            throw new AppException(
                    404, "REVIEW_PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm công khai.");
        }
    }

    // Chỉ cho tài khoản CUSTOMER đang hoạt động thực hiện nghiệp vụ Review của người mua.
    private void requireActiveCustomer(int userId) {
        if (!dao.activeCustomer(userId)) {
            throw new AppException(
                    403, "FORBIDDEN", "Chỉ khách hàng đang hoạt động được dùng Review.");
        }
    }

    // Chỉ cho chỉnh sửa Review ở trạng thái PUBLISHED.
    private static void requireEditableReview(ReviewDao.ReviewRow review) {
        if (!review.getStatus().equals("PUBLISHED")) {
            throw reviewNotEditable();
        }
    }

    // Kiểm tra dữ liệu tạo Review và chuẩn hóa nội dung, danh sách media trước khi lưu.
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

    // Kiểm tra PATCH có ít nhất một trường cần sửa và các giá trị được gửi đều hợp lệ.
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

    // Kiểm tra điểm đánh giá là số nguyên từ 1 đến 5 sao.
    private static void validateRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw invalidReview("rating phải từ 1 đến 5.");
        }
    }

    // Bỏ khoảng trắng đầu cuối và yêu cầu nội dung có từ 1 đến 5000 ký tự.
    private static String validateContent(String content) {
        String clean = content == null ? "" : content.trim();
        if (clean.isEmpty() || clean.length() > MAX_CONTENT_LENGTH) {
            throw invalidReview(
                    "content phải có từ 1 đến 5000 ký tự sau khi bỏ khoảng trắng đầu/cuối.");
        }
        return clean;
    }

    // Kiểm tra Review có tối đa 6 mã media, không chứa null hoặc mã trùng.
    private static void validateMedia(List<UUID> ids) {
        if (ids.size() > 6
                || hasNullMedia(ids)
                || new HashSet<>(ids).size() != ids.size()) {
            throw new AppException(
                    422, "INVALID_REVIEW_MEDIA", "Review có tối đa 6 media và không được trùng.");
        }
    }

    // Tạo lỗi 400 kèm lý do dữ liệu Review không hợp lệ.
    private static AppException invalidReview(String message) {
        return new AppException(400, "INVALID_REVIEW", message);
    }

    // Tạo lỗi 409 khi dòng đơn hàng đã có Review, tránh tạo đánh giá trùng.
    private static AppException reviewAlreadyExists() {
        return new AppException(409, "REVIEW_ALREADY_EXISTS", "Dòng đơn hàng đã có Review.");
    }

    // Tạo lỗi 404 khi không tìm thấy Review theo phạm vi truy cập.
    private static AppException reviewNotFound() {
        return new AppException(404, "REVIEW_NOT_FOUND", "Không tìm thấy Review.");
    }

    // Tạo lỗi 409 khi trạng thái Review không cho phép thao tác sửa đổi.
    private static AppException reviewNotEditable() {
        return new AppException(
                409, "REVIEW_NOT_EDITABLE", "Review bị ẩn hoặc đã xóa nên không thể sửa.");
    }

    // Kiểm tra danh sách media có phần tử null trước khi xử lý các mã file.
    private static boolean hasNullMedia(List<UUID> ids) {
        for (UUID id : ids) {
            if (id == null) {
                return true;
            }
        }
        return false;
    }
}
