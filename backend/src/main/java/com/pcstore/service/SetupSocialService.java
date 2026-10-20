package com.pcstore.service;

import com.pcstore.dao.SetupSocialDao;
import com.pcstore.dto.SetupSocialDto;
import com.pcstore.exception.AppException;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

public final class SetupSocialService {
    private final EntityManager entityManager;
    private final SetupSocialDao dao;

    // Khởi tạo DAO dùng chung EntityManager cho tương tác và kiểm duyệt Setup.
    public SetupSocialService(EntityManager entityManager) {
        this.entityManager = entityManager;
        dao = new SetupSocialDao(entityManager);
    }

    // Lấy tổng lượt thích và trạng thái đã thích của người xem trên bài Setup công khai.
    public SetupSocialDto.Like getLike(int postId, Integer viewer) {
        return dao.likeResponse(post(postId, viewer, true, false));
    }

    // Thêm hoặc bỏ like của tài khoản hoạt động trên bài công khai, khóa bài trong lúc cập nhật.
    public SetupSocialDto.Like setLike(Integer userId, int postId, boolean liked) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            authorize(userId, false);
            // Serialize with moderation and T29 edits/deletion using the same parent-row lock.
            post(postId, userId, true, true);
            dao.like(postId, userId, liked, now());
            SetupSocialDto.Like result = getLike(postId, userId);
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    // Lấy bảng xếp hạng bài Setup công khai theo lượt thích, có phân trang.
    public List<SetupSocialDto.Ranked> ranking(Integer viewer, int offset, int limit) {
        pagination(offset, limit);
        List<SetupSocialDto.Ranked> posts = new ArrayList<>();
        for (Object[] row : dao.list(viewer, "PUBLISHED", true, offset, limit)) {
            posts.add(dao.ranked(row));
        }
        return posts;
    }

    // Kiểm tra quyền admin rồi lấy danh sách bài Setup theo trạng thái và phân trang.
    public List<SetupSocialDto.Moderated> listAdmin(
            Integer adminId, String status, int offset, int limit) {
        authorize(adminId, true);
        if (status != null) {
            status(status);
        }
        pagination(offset, limit);
        List<SetupSocialDto.Moderated> posts = new ArrayList<>();
        for (Object[] row : dao.list(null, status, false, offset, limit)) {
            posts.add(dao.moderated(row));
        }
        return posts;
    }

    // Cho admin xem chi tiết bài Setup cùng thông tin kiểm duyệt.
    public SetupSocialDto.Moderated getAdmin(Integer adminId, int postId) {
        authorize(adminId, true);
        return dao.moderated(post(postId, null, false, false));
    }

    // Cho admin ẩn hoặc công khai bài Setup, lưu lý do, người duyệt và thời điểm duyệt.
    public SetupSocialDto.Moderated moderate(
            Integer adminId, int postId, SetupSocialDto.ModerationRequest request) {
        EntityTransaction transaction = entityManager.getTransaction();
        transaction.begin();
        try {
            authorize(adminId, true);
            if (request == null || request.getReason() == null || request.getReason().isBlank()) {
                throw new AppException(400, "INVALID_MODERATION", "Cần lý do kiểm duyệt.");
            }
            status(request.getStatus());
            post(postId, null, false, true);
            dao.moderate(postId, adminId, request.getStatus(), request.getReason().strip(), now());
            SetupSocialDto.Moderated result = dao.moderated(post(postId, null, false, false));
            transaction.commit();
            return result;
        } catch (RuntimeException error) {
            if (transaction.isActive()) {
                transaction.rollback();
            }
            throw error;
        }
    }

    // Yêu cầu đăng nhập, tài khoản hoạt động và quyền admin khi thao tác quản trị.
    private void authorize(Integer userId, boolean admin) {
        if (userId == null) {
            throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
        }
        if (!dao.activeUser(userId, admin)) {
            throw new AppException(403, "FORBIDDEN", "Bạn không có quyền truy cập.");
        }
    }

    // Tìm bài theo phạm vi công khai và tùy chọn khóa bản ghi; báo lỗi nếu không tìm thấy.
    private Object[] post(int id, Integer viewer, boolean publicOnly, boolean lock) {
        Object[] row = id <= 0 ? null : dao.find(id, viewer, publicOnly, lock);
        if (row == null) {
            throw new AppException(404, "SETUP_NOT_FOUND", "Không tìm thấy bài đăng.");
        }
        return row;
    }

    // Kiểm tra trạng thái Setup chỉ được là PUBLISHED hoặc HIDDEN.
    private static void status(String value) {
        if (value == null || (!value.equals("PUBLISHED") && !value.equals("HIDDEN"))) {
            throw new AppException(400, "INVALID_SETUP_STATUS", "Trạng thái Setup không hợp lệ.");
        }
    }

    // Kiểm tra offset hợp lệ và mỗi trang có từ 1 đến 50 bài.
    private static void pagination(int offset, int limit) {
        if (offset < 0 || offset > 1000000 || limit < 1 || limit > 50) {
            throw new AppException(400, "INVALID_PAGINATION", "Phân trang không hợp lệ.");
        }
    }

    // Lấy thời gian hiện tại theo múi giờ Việt Nam để lưu lượt thích và kiểm duyệt.
    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    }
}
