package com.pcstore.service;

import com.pcstore.dao.MediaLinkDao;
import com.pcstore.dao.SetupDao;
import com.pcstore.dto.SetupDto;
import com.pcstore.exception.AppException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

public final class SetupService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");
    private final EntityManager entityManager;
    private final SetupDao dao;
    private final MediaAttachmentService media = new MediaAttachmentService();

    // Khởi tạo DAO dùng chung EntityManager để lưu bài, sản phẩm và ảnh trong cùng transaction.
    public SetupService(EntityManager entityManager) {
        this.entityManager = entityManager;
        this.dao = new SetupDao(entityManager);
    }

    // Kiểm tra khách hàng có ít nhất một đơn đã giao để được đăng bài Setup.
    public SetupDto.Eligibility eligibility(int userId) {
        requireActiveCustomer(userId);
        boolean eligible = dao.delivered(userId);
        return new SetupDto.Eligibility(eligible, eligible ? null : "SETUP_PURCHASE_REQUIRED");
    }

    // Tạo bài Setup khi khách đã có đơn giao thành công; lưu bài, sản phẩm và ảnh cùng nhau.
    public SetupDto.Response create(int userId, SetupDto.Request request) {
        // Kiểm tra tiêu đề, nội dung, danh sách ảnh và sản phẩm.
        validate(request);
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireActiveCustomer(userId);
            // Bài tập email chỉ lưu một User; ở đây còn phải kiểm tra điều kiện đã mua hàng.
            if (!dao.delivered(userId)) {
                throw new AppException(
                        403, "SETUP_PURCHASE_REQUIRED", "Cần ít nhất một đơn đã giao.");
            }
            validateProducts(request.getProductIds());
            int id =
                    dao.insert(
                            userId,
                            request.getTitle().trim(),
                            request.getDescription().trim(),
                            LocalDateTime.now(ZONE));
            // Bài đăng, sản phẩm gắn kèm và ảnh phải được lưu cùng nhau.
            dao.replaceProducts(id, request.getProductIds());
            media.attachSetupImages(entityManager, userId, id, request.getMediaIds());
            SetupDto.Response result = toResponse(dao.find(id, userId, false, false));
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    // Sửa bài Setup đang công khai của chính người đăng, thay danh sách ảnh và sản phẩm đi kèm.
    public SetupDto.Response update(int userId, int postId, SetupDto.Request request) {
        // Kiểm tra tiêu đề, nội dung, danh sách ảnh và sản phẩm.
        validate(request);
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireActiveCustomer(userId);
            Object[] post = findOwnedPost(userId, postId, true);
            String status = (String) post[4];
            if (!status.equals("PUBLISHED")) {
                throw new AppException(409, "SETUP_NOT_EDITABLE", "Bài đang bị ẩn.");
            }
            validateProducts(request.getProductIds());
            media.replaceSetupImages(entityManager, userId, postId, request.getMediaIds());
            dao.replaceProducts(postId, request.getProductIds());
            dao.update(
                    postId,
                    request.getTitle().trim(),
                    request.getDescription().trim(),
                    LocalDateTime.now(ZONE));
            SetupDto.Response result = toResponse(dao.find(postId, userId, false, false));
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    // Xóa bài Setup của người đăng và đánh dấu các ảnh đã gỡ để dọn trên Cloudinary sau.
    public void delete(int userId, int postId) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            requireActiveCustomer(userId);
            findOwnedPost(userId, postId, true);
            new MediaLinkDao(entityManager).detachAllSetupImages(userId, postId);
            dao.delete(postId);
            transaction.commit();
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    // Lấy chi tiết bài Setup đang công khai; báo lỗi nếu bài không tồn tại hoặc đã ẩn.
    public SetupDto.Response getPublic(int postId) {
        Object[] post = dao.find(postId, null, true, false);
        if (post == null) {
            throw postNotFound();
        }
        return toResponse(post);
    }

    // Lấy bài Setup thuộc khách hàng đang hoạt động, kể cả bài bị ẩn.
    public SetupDto.Response getOwn(int userId, int postId) {
        requireActiveCustomer(userId);
        return toResponse(findOwnedPost(userId, postId, false));
    }

    // Lấy một trang các bài Setup công khai theo thứ tự mới nhất.
    public List<SetupDto.Response> listPublic(int offset, int limit) {
        List<SetupDto.Response> posts = new ArrayList<>();
        for (int postId : dao.ids(null, offset, limit)) {
            posts.add(getPublic(postId));
        }
        return posts;
    }

    // Lấy một trang bài Setup của chính khách hàng đang đăng nhập.
    public List<SetupDto.Response> listOwn(int userId, int offset, int limit) {
        requireActiveCustomer(userId);
        List<SetupDto.Response> posts = new ArrayList<>();
        for (int postId : dao.ids(userId, offset, limit)) {
            posts.add(getOwn(userId, postId));
        }
        return posts;
    }

    // Ghép thông tin bài, danh sách ảnh và sản phẩm thành dữ liệu trả cho giao diện.
    private SetupDto.Response toResponse(Object[] post) {
        // Thứ tự cột tương ứng SELECT trong SetupDao.find.
        int postId = ((Number) post[0]).intValue();
        int authorId = ((Number) post[1]).intValue();
        String title = (String) post[2];
        String description = (String) post[3];
        String status = (String) post[4];
        LocalDateTime createdAt = SetupDao.time(post[5]);
        LocalDateTime updatedAt = SetupDao.time(post[6]);
        List<UUID> mediaIds = dao.images(postId);
        List<SetupDto.Product> products = dao.linkedProducts(postId);
        return new SetupDto.Response(
                postId,
                authorId,
                title,
                description,
                status,
                createdAt,
                updatedAt,
                mediaIds,
                products);
    }

    // Tìm bài đúng chủ sở hữu, có thể khóa trước khi sửa hoặc xóa; báo lỗi nếu không tìm thấy.
    private Object[] findOwnedPost(int userId, int postId, boolean lock) {
        Object[] post = postId <= 0 ? null : dao.find(postId, userId, false, lock);
        if (post == null) {
            throw postNotFound();
        }
        return post;
    }

    // Tạo lỗi 404 khi không tìm thấy bài Setup theo phạm vi truy cập.
    private static AppException postNotFound() {
        return new AppException(404, "SETUP_NOT_FOUND", "Không tìm thấy bài đăng.");
    }

    // Yêu cầu tài khoản CUSTOMER đang hoạt động để quản lý bài Setup cá nhân.
    private void requireActiveCustomer(int userId) {
        if (!dao.activeCustomer(userId)) {
            throw new AppException(403, "FORBIDDEN", "Chỉ khách hàng được dùng Setup.");
        }
    }

    // Đảm bảo mọi sản phẩm gắn vào bài đều tồn tại và còn được bán công khai.
    private void validateProducts(List<Integer> ids) {
        if (dao.products(ids).size() != ids.size()) {
            throw new AppException(
                    422, "SETUP_PRODUCT_INVALID", "Sản phẩm không hợp lệ hoặc không bán.");
        }
    }

    // Kiểm tra tiêu đề, nội dung, 1–8 ảnh và ít nhất một sản phẩm; không chấp nhận mã trùng.
    private static void validate(SetupDto.Request request) {
        if (request == null
                || request.getTitle() == null
                || request.getTitle().trim().isEmpty()
                || request.getTitle().trim().length() > 255
                || request.getDescription() == null
                || request.getDescription().trim().isEmpty()) {
            throw new AppException(400, "INVALID_SETUP", "Tiêu đề và nội dung không hợp lệ.");
        }
        if (request.getMediaIds() == null || request.getMediaIds().isEmpty()) {
            throw new AppException(422, "SETUP_IMAGE_REQUIRED", "Bài cần ít nhất một ảnh.");
        }
        if (request.getMediaIds().size() > 8
                || hasNullMedia(request.getMediaIds())
                || new HashSet<>(request.getMediaIds()).size()
                        != request.getMediaIds().size()) {
            throw new AppException(422, "MEDIA_COUNT_LIMIT", "Ảnh không hợp lệ hoặc quá giới hạn.");
        }
        if (request.getProductIds() == null || request.getProductIds().isEmpty()) {
            throw new AppException(422, "SETUP_PRODUCT_REQUIRED", "Bài cần ít nhất một sản phẩm.");
        }
        for (Integer productId : request.getProductIds()) {
            if (productId == null || productId <= 0) {
                throw new AppException(
                        422, "SETUP_PRODUCT_INVALID", "Danh sách sản phẩm không hợp lệ.");
            }
        }
        if (new HashSet<>(request.getProductIds()).size() != request.getProductIds().size()) {
            throw new AppException(
                    422, "SETUP_PRODUCT_INVALID", "Danh sách sản phẩm không hợp lệ.");
        }
    }

    // Kiểm tra danh sách ảnh có chứa mã null hay không.
    private static boolean hasNullMedia(List<UUID> ids) {
        for (UUID id : ids) {
            if (id == null) {
                return true;
            }
        }
        return false;
    }
}
