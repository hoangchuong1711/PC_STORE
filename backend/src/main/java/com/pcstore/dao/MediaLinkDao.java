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

    public MediaLinkDao(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public boolean lockSetup(int ownerId, int postId) {
        String sql =
                "SELECT post_id FROM setup_posts WHERE post_id=:id AND user_id=:owner FOR"
                        + " UPDATE";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", postId);
        query.setParameter("owner", ownerId);
        return !query.getResultList().isEmpty();
    }

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

    public long setupCount(int postId) {
        return count("SELECT count(*) FROM setup_images WHERE post_id=:id", postId);
    }

    public long reviewCount(int reviewId) {
        return count("SELECT count(*) FROM review_media WHERE review_id=:id", reviewId);
    }

    public long reviewVideoCount(int reviewId) {
        return count(
                "SELECT count(*) FROM review_media WHERE review_id=:id AND media_type='VIDEO'",
                reviewId);
    }

    public int nextSetupPosition(int postId) {
        return position("setup_images", "post_id", postId);
    }

    public int nextReviewPosition(int reviewId) {
        return position("review_media", "review_id", reviewId);
    }

    public MediaAsset lockAsset(UUID id) {
        return entityManager.find(MediaAsset.class, id, LockModeType.PESSIMISTIC_WRITE);
    }

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

    public void insertReview(int reviewId, MediaAsset asset, int position) {
        boolean video = "video".equals(asset.getResourceType());
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

    public int deleteSetup(int postId, UUID mediaId) {
        String sql = "DELETE FROM setup_images WHERE post_id=:parent AND media_asset_id=:media";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("parent", postId);
        query.setParameter("media", mediaId);
        return query.executeUpdate();
    }

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

    public int deleteReview(int reviewId, UUID mediaId) {
        String sql =
                "DELETE FROM review_media WHERE review_id=:parent AND" + " media_asset_id=:media";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("parent", reviewId);
        query.setParameter("media", mediaId);
        return query.executeUpdate();
    }

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

    public Visibility setupVisibility(UUID mediaId) {
        String sql =
                "SELECT p.user_id,p.status FROM setup_images i JOIN setup_posts p"
                        + " ON p.post_id=i.post_id WHERE i.media_asset_id=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", mediaId);
        return visibility(query.getResultList());
    }

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

    private long count(String sql, int id) {
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", id);
        return ((Number) query.getSingleResult()).longValue();
    }

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

    private static Visibility visibility(List<?> rows) {
        if (rows.size() != 1) {
            return null;
        }
        Object[] row = (Object[]) rows.getFirst();
        return new Visibility(((Number) row[0]).intValue(), (String) row[1]);
    }

    @SuppressWarnings("unchecked")
    public List<UUID> setupMediaIds(int postId) {
        String sql = "SELECT media_asset_id FROM setup_images WHERE post_id=:post";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("post", postId);
        return query.getResultList();
    }
}
