package com.pcstore.dao;

import com.pcstore.entity.MediaAsset;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Query;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** JPA-backed operations for linking media to existing Setup and Review rows. */
public final class MediaLinkDao {
    private final EntityManager entityManager;

    public record Visibility(int ownerId, String status) {}

    // Nhận EntityManager dùng chung với transaction của bài Setup hoặc Review.
    public MediaLinkDao(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    // Khóa bài Setup đúng chủ sở hữu trước khi thay đổi liên kết ảnh.
    public boolean lockSetup(int ownerId, int postId) {
        String sql =
                "SELECT post_id FROM setup_posts WHERE post_id=:id AND user_id=:owner FOR"
                        + " UPDATE";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", postId);
        query.setParameter("owner", ownerId);
        return !query.getResultList().isEmpty();
    }

    // Khóa Review đúng chủ sở hữu trước khi thay đổi liên kết media.
    public boolean lockReview(int ownerId, int reviewId) {
        String sql =
                "SELECT r.review_id FROM product_reviews r JOIN order_items i ON"
                        + " i.order_item_id=r.order_item_id JOIN orders o ON"
                        + " o.order_id=i.order_id WHERE r.review_id=:id AND o.user_id=:owner"
                        + " FOR UPDATE OF r";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", reviewId);
        query.setParameter("owner", ownerId);
        return !query.getResultList().isEmpty();
    }

    // Khóa Review đúng chủ và chưa bị xóa mềm trước khi gắn hoặc thay media.
    public boolean lockActiveReview(int ownerId, int reviewId) {
        String sql =
                "SELECT r.review_id FROM product_reviews r JOIN order_items i ON"
                        + " i.order_item_id=r.order_item_id JOIN orders o ON"
                        + " o.order_id=i.order_id WHERE r.review_id=:id AND o.user_id=:owner"
                        + " AND r.status <> 'DELETED' FOR UPDATE OF r";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", reviewId);
        query.setParameter("owner", ownerId);
        return !query.getResultList().isEmpty();
    }

    // Đếm số ảnh đang gắn vào bài Setup để kiểm tra giới hạn ảnh.
    public long setupCount(int postId) {
        return count("SELECT count(*) FROM setup_images WHERE post_id=:id", postId);
    }

    // Đếm tổng số media đang gắn vào Review.
    public long reviewCount(int reviewId) {
        return count("SELECT count(*) FROM review_media WHERE review_id=:id", reviewId);
    }

    // Đếm số video trong Review để bảo đảm mỗi bài không quá một video.
    public long reviewVideoCount(int reviewId) {
        return count(
                "SELECT count(*) FROM review_media WHERE review_id=:id AND media_type='VIDEO'",
                reviewId);
    }

    // Tìm vị trí tiếp theo để thêm ảnh vào cuối danh sách ảnh Setup.
    public int nextSetupPosition(int postId) {
        return position("setup_images", "post_id", postId);
    }

    // Tìm vị trí tiếp theo để thêm file vào cuối danh sách media Review.
    public int nextReviewPosition(int reviewId) {
        return position("review_media", "review_id", reviewId);
    }

    // Khóa bản ghi media để tránh hai thao tác cùng gắn hoặc dọn một file.
    public MediaAsset lockAsset(UUID id) {
        return entityManager.find(MediaAsset.class, id, LockModeType.PESSIMISTIC_WRITE);
    }

    // Lưu liên kết ảnh với bài Setup, gồm URL xem qua backend và thứ tự hiển thị.
    public void insertSetup(int postId, UUID mediaId, int position) {
        String sql =
                "INSERT INTO setup_images(post_id,image_url,sort_order,media_asset_id) "
                        + "VALUES (:post,:url,:position,:media)";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("post", postId);
        query.setParameter("url", "/api/media/" + mediaId + "/content");
        query.setParameter("position", position);
        query.setParameter("media", mediaId);
        query.executeUpdate();
    }

    // Lưu liên kết ảnh hoặc video với Review cùng thông tin định dạng và thứ tự.
    public void insertReview(int reviewId, MediaAsset asset, int position) {
        boolean video = asset.getResourceType().equals("video");
        String sql =
                video
                        ? "INSERT INTO"
                              + " review_media(review_id,media_type,storage_key,mime_type,size_bytes,duration_second,sort_order,media_asset_id)"
                              + " VALUES"
                              + " (:review,'VIDEO',:key,:mime,:size,:duration,:position,:media)"
                        : "INSERT INTO"
                              + " review_media(review_id,media_type,storage_key,mime_type,size_bytes,sort_order,media_asset_id)"
                              + " VALUES (:review,'IMAGE',:key,:mime,:size,:position,:media)";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("review", reviewId);
        query.setParameter("key", "media:" + asset.getMediaId());
        query.setParameter("mime", asset.getMimeType());
        query.setParameter("size", asset.getSizeBytes());
        query.setParameter("position", position);
        query.setParameter("media", asset.getMediaId());
        if (video) {
            query.setParameter("duration", asset.getDurationSecond());
        }
        query.executeUpdate();
    }

    // Xóa liên kết một ảnh khỏi Setup, trả số dòng xóa được để xác nhận file thuộc bài.
    public int deleteSetup(int postId, UUID mediaId) {
        String sql = "DELETE FROM setup_images WHERE post_id=:parent AND media_asset_id=:media";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("parent", postId);
        query.setParameter("media", mediaId);
        return query.executeUpdate();
    }

    // Đặt lại thứ tự ảnh Setup theo danh sách mới, tạm dịch vị trí cũ để tránh trùng.
    public void reorderSetup(int postId, List<UUID> ids) {
        // Move existing positions out of the target range before assigning the final order.
        String sql = "UPDATE setup_images SET sort_order=sort_order+100 WHERE post_id=:post";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("post", postId);
        query.executeUpdate();
        for (int i = 0; i < ids.size(); i++) {
            String sql2 =
                    "UPDATE setup_images SET sort_order=:position WHERE post_id=:post AND"
                            + " media_asset_id=:media";
            Query query2 = entityManager.createNativeQuery(sql2);
            query2.setParameter("position", i);
            query2.setParameter("post", postId);
            query2.setParameter("media", ids.get(i));
            query2.executeUpdate();
        }
    }

    // Gỡ mọi ảnh khỏi Setup đúng chủ sở hữu và đánh dấu từng file chờ xóa.
    public void detachAllSetupImages(int ownerId, int postId) {
        if (!lockSetup(ownerId, postId)) {
            throw new com.pcstore.exception.AppException(
                    404, "SETUP_NOT_FOUND", "Không tìm thấy bài đăng.");
        }
        String sql = "SELECT media_asset_id FROM setup_images WHERE" + " post_id=:post";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("post", postId);
        for (Object value : new java.util.ArrayList<>(query.getResultList())) {
            UUID id = (UUID) value;
            MediaAsset asset = lockAsset(id);
            deleteSetup(postId, id);
            asset.detach();
        }
    }

    // Xóa liên kết media khỏi Review và trả số dòng đã xóa.
    public int deleteReview(int reviewId, UUID mediaId) {
        String sql =
                "DELETE FROM review_media WHERE review_id=:parent AND" + " media_asset_id=:media";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("parent", reviewId);
        query.setParameter("media", mediaId);
        return query.executeUpdate();
    }

    // Lấy các UUID media đã gắn vào Review theo thứ tự hiển thị.
    public List<UUID> reviewMediaIds(int reviewId) {
        String sql =
                "SELECT media_asset_id FROM review_media WHERE review_id=:review"
                        + " AND media_asset_id IS NOT NULL ORDER BY"
                        + " sort_order,media_id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("review", reviewId);
        List<?> rows = query.getResultList();
        List<UUID> mediaIds = new ArrayList<>();
        for (Object value : rows) {
            mediaIds.add((UUID) value);
        }
        return mediaIds;
    }

    // Cập nhật thứ tự media Review theo danh sách mới mà không trùng vị trí hiện có.
    public void reorderReview(int reviewId, List<UUID> ids) {
        String sql = "UPDATE review_media SET sort_order=sort_order+100 WHERE review_id=:review";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("review", reviewId);
        query.executeUpdate();
        for (int i = 0; i < ids.size(); i++) {
            String sql2 =
                    "UPDATE review_media SET sort_order=:position "
                            + "WHERE review_id=:review AND media_asset_id=:media";
            Query query2 = entityManager.createNativeQuery(sql2);
            query2.setParameter("position", i);
            query2.setParameter("review", reviewId);
            query2.setParameter("media", ids.get(i));
            query2.executeUpdate();
        }
    }

    // Lấy chủ sở hữu và trạng thái bài Setup chứa ảnh để kiểm tra quyền xem.
    public Visibility setupVisibility(UUID mediaId) {
        String sql =
                "SELECT p.user_id,p.status FROM setup_images i JOIN setup_posts p"
                        + " ON p.post_id=i.post_id WHERE i.media_asset_id=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", mediaId);
        return visibility(query.getResultList());
    }

    // Lấy chủ sở hữu và trạng thái Review chứa media để kiểm tra quyền xem.
    public Visibility reviewVisibility(UUID mediaId) {
        String sql =
                "SELECT o.user_id,r.status FROM review_media m JOIN product_reviews"
                        + " r ON r.review_id=m.review_id JOIN order_items i ON"
                        + " i.order_item_id=r.order_item_id JOIN orders o ON"
                        + " o.order_id=i.order_id WHERE m.media_asset_id=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", mediaId);
        return visibility(query.getResultList());
    }

    // Thực thi truy vấn đếm media theo mã bài và trả kết quả kiểu long.
    private long count(String sql, int id) {
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", id);
        return ((Number) query.getSingleResult()).longValue();
    }

    // Tính vị trí hiển thị tiếp theo bằng vị trí lớn nhất cộng một.
    private int position(String table, String foreignKey, int id) {
        String sql =
                "SELECT COALESCE(MAX(sort_order),-1)+1 FROM "
                        + table
                        + " WHERE "
                        + foreignKey
                        + "=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", id);
        return ((Number) query.getSingleResult()).intValue();
    }

    // Chuyển đúng một dòng SQL thành thông tin chủ sở hữu và trạng thái bài.
    private static Visibility visibility(List<?> rows) {
        if (rows.size() != 1) {
            return null;
        }
        Object[] row = (Object[]) rows.getFirst();
        return new Visibility(((Number) row[0]).intValue(), (String) row[1]);
    }

    // Lấy các UUID ảnh đang gắn vào Setup để so sánh với danh sách ảnh mới.
    @SuppressWarnings("unchecked")
    public List<UUID> setupMediaIds(int postId) {
        String sql = "SELECT media_asset_id FROM setup_images WHERE post_id=:post";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("post", postId);
        return query.getResultList();
    }
}
