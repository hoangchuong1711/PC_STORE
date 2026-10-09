package com.pcstore.service;

import com.pcstore.dao.SetupSocialDao;
import com.pcstore.dto.SetupSocialDto;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManager;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.function.Supplier;

public final class SetupSocialService {
    private final EntityManager em;
    private final SetupSocialDao dao;

    public SetupSocialService(EntityManager em) { this.em = em; dao = new SetupSocialDao(em); }

    public SetupSocialDto.Like getLike(int postId, Integer viewer) {
        return dao.likeResponse(post(postId, viewer, true, false));
    }

    public SetupSocialDto.Like setLike(Integer userId, int postId, boolean liked) {
        return transaction(() -> {
            authorize(userId, false);
            // Serialize with moderation and T29 edits/deletion using the same parent-row lock.
            post(postId, userId, true, true);
            dao.like(postId, userId, liked, now());
            return getLike(postId, userId);
        });
    }

    public List<SetupSocialDto.Ranked> ranking(Integer viewer, int offset, int limit) {
        pagination(offset, limit);
        return dao.list(viewer, "PUBLISHED", true, offset, limit).stream().map(dao::ranked).toList();
    }

    public List<SetupSocialDto.Moderated> listAdmin(Integer adminId, String status, int offset, int limit) {
        authorize(adminId, true);
        if (status != null) status(status);
        pagination(offset, limit);
        return dao.list(null, status, false, offset, limit).stream().map(dao::moderated).toList();
    }

    public SetupSocialDto.Moderated getAdmin(Integer adminId, int postId) {
        authorize(adminId, true);
        return dao.moderated(post(postId, null, false, false));
    }

    public SetupSocialDto.Moderated moderate(Integer adminId, int postId, SetupSocialDto.ModerationRequest request) {
        return transaction(() -> {
            authorize(adminId, true);
            if (request == null || request.reason() == null || request.reason().isBlank())
                throw new AppException(400, "INVALID_MODERATION", "Cần lý do kiểm duyệt.");
            status(request.status());
            post(postId, null, false, true);
            dao.moderate(postId, adminId, request.status(), request.reason().strip(), now());
            return dao.moderated(post(postId, null, false, false));
        });
    }

    private void authorize(Integer userId, boolean admin) {
        if (userId == null) throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
        if (!dao.activeUser(userId, admin)) throw new AppException(403, "FORBIDDEN", "Bạn không có quyền truy cập.");
    }

    private Object[] post(int id, Integer viewer, boolean publicOnly, boolean lock) {
        Object[] row = id <= 0 ? null : dao.find(id, viewer, publicOnly, lock);
        if (row == null) throw new AppException(404, "SETUP_NOT_FOUND", "Không tìm thấy bài đăng.");
        return row;
    }

    private static void status(String value) {
        if (!"PUBLISHED".equals(value) && !"HIDDEN".equals(value))
            throw new AppException(400, "INVALID_SETUP_STATUS", "Trạng thái Setup không hợp lệ.");
    }

    private static void pagination(int offset, int limit) {
        if (offset < 0 || offset > 1000000 || limit < 1 || limit > 50)
            throw new AppException(400, "INVALID_PAGINATION", "Phân trang không hợp lệ.");
    }

    private static LocalDateTime now() { return LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")); }

    private <T> T transaction(Supplier<T> operation) {
        var tx = em.getTransaction();
        tx.begin();
        try { T result = operation.get(); tx.commit(); return result; }
        catch (RuntimeException error) { if (tx.isActive()) tx.rollback(); throw error; }
    }
}
