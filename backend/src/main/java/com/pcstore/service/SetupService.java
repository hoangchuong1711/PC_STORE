package com.pcstore.service;

import com.pcstore.dao.MediaLinkDao;
import com.pcstore.dao.SetupDao;
import com.pcstore.dto.SetupDto;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.function.Supplier;

public final class SetupService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");
    private final EntityManager em;
    private final SetupDao dao;
    private final MediaAttachmentService media = new MediaAttachmentService();

    public SetupService(EntityManager em) { this.em = em; this.dao = new SetupDao(em); }

    public SetupDto.Eligibility eligibility(int userId) {
        customer(userId);
        boolean eligible = dao.delivered(userId);
        return new SetupDto.Eligibility(eligible, eligible ? null : "SETUP_PURCHASE_REQUIRED");
    }

    public SetupDto.Response create(int userId, SetupDto.Request request) {
        validate(request);
        return transaction(() -> {
            customer(userId);
            if (!dao.delivered(userId)) throw new AppException(403, "SETUP_PURCHASE_REQUIRED", "Cần ít nhất một đơn đã giao.");
            products(request.productIds());
            int id = dao.insert(userId, request.title().trim(), request.description().trim(), LocalDateTime.now(ZONE));
            dao.replaceProducts(id, request.productIds());
            media.attachSetupImages(em, userId, id, request.mediaIds());
            return response(dao.find(id, userId, false, false));
        });
    }

    public SetupDto.Response update(int userId, int postId, SetupDto.Request request) {
        validate(request);
        return transaction(() -> {
            customer(userId);
            Object[] post = owned(userId, postId, true);
            if (!"PUBLISHED".equals(post[4])) throw new AppException(409, "SETUP_NOT_EDITABLE", "Bài đang bị ẩn.");
            products(request.productIds());
            media.replaceSetupImages(em, userId, postId, request.mediaIds());
            dao.replaceProducts(postId, request.productIds());
            dao.update(postId, request.title().trim(), request.description().trim(), LocalDateTime.now(ZONE));
            return response(dao.find(postId, userId, false, false));
        });
    }

    public void delete(int userId, int postId) {
        transaction(() -> {
            customer(userId);
            owned(userId, postId, true);
            new MediaLinkDao(em).detachAllSetupImages(userId, postId);
            dao.delete(postId);
            return null;
        });
    }

    public SetupDto.Response getPublic(int postId) {
        Object[] post = dao.find(postId, null, true, false);
        if (post == null) throw missing();
        return response(post);
    }

    public SetupDto.Response getOwn(int userId, int postId) { customer(userId); return response(owned(userId, postId, false)); }

    public List<SetupDto.Response> listPublic(int offset, int limit) {
        return dao.ids(null, offset, limit).stream().map(this::getPublic).toList();
    }

    public List<SetupDto.Response> listOwn(int userId, int offset, int limit) {
        customer(userId);
        return dao.ids(userId, offset, limit).stream().map(id -> getOwn(userId, id)).toList();
    }

    private SetupDto.Response response(Object[] post) {
        int id = ((Number) post[0]).intValue();
        return new SetupDto.Response(id, ((Number) post[1]).intValue(), (String) post[2], (String) post[3],
                (String) post[4], SetupDao.time(post[5]), SetupDao.time(post[6]), dao.images(id), dao.linkedProducts(id));
    }

    private Object[] owned(int userId, int postId, boolean lock) {
        Object[] post = postId <= 0 ? null : dao.find(postId, userId, false, lock);
        if (post == null) throw missing();
        return post;
    }

    private static AppException missing() { return new AppException(404, "SETUP_NOT_FOUND", "Không tìm thấy bài đăng."); }

    private void customer(int userId) {
        if (!dao.activeCustomer(userId)) throw new AppException(403, "FORBIDDEN", "Chỉ khách hàng được dùng Setup.");
    }

    private void products(List<Integer> ids) {
        if (dao.products(ids).size() != ids.size())
            throw new AppException(422, "SETUP_PRODUCT_INVALID", "Sản phẩm không hợp lệ hoặc không bán.");
    }

    private static void validate(SetupDto.Request request) {
        if (request == null || request.title() == null || request.title().trim().isEmpty()
                || request.title().trim().length() > 255 || request.description() == null
                || request.description().trim().isEmpty())
            throw new AppException(400, "INVALID_SETUP", "Tiêu đề và nội dung không hợp lệ.");
        if (request.mediaIds() == null || request.mediaIds().isEmpty())
            throw new AppException(422, "SETUP_IMAGE_REQUIRED", "Bài cần ít nhất một ảnh.");
        if (request.mediaIds().size() > 8 || request.mediaIds().stream().anyMatch(id -> id == null)
                || new HashSet<>(request.mediaIds()).size() != request.mediaIds().size())
            throw new AppException(422, "MEDIA_COUNT_LIMIT", "Ảnh không hợp lệ hoặc quá giới hạn.");
        if (request.productIds() == null || request.productIds().isEmpty())
            throw new AppException(422, "SETUP_PRODUCT_REQUIRED", "Bài cần ít nhất một sản phẩm.");
        if (request.productIds().stream().anyMatch(id -> id == null || id <= 0)
                || new HashSet<>(request.productIds()).size() != request.productIds().size())
            throw new AppException(422, "SETUP_PRODUCT_INVALID", "Danh sách sản phẩm không hợp lệ.");
    }

    private <T> T transaction(Supplier<T> operation) {
        var tx = em.getTransaction();
        tx.begin();
        try {
            T value = operation.get();
            tx.commit();
            return value;
        } catch (RuntimeException failure) {
            if (tx.isActive()) tx.rollback();
            throw failure;
        }
    }
}
