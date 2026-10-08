package com.pcstore.dao;

import com.pcstore.entity.MediaAsset;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.UUID;

/** JPA-backed operations for linking media to existing Setup and Review rows. */
public final class MediaLinkDao {
    private final EntityManager em;

    public record Visibility(int ownerId, String status) { }

    public MediaLinkDao(EntityManager em) { this.em = em; }

    public boolean lockSetup(int ownerId, int postId) {
        return !em.createNativeQuery("SELECT post_id FROM setup_posts WHERE post_id=:id AND user_id=:owner FOR UPDATE")
                .setParameter("id", postId).setParameter("owner", ownerId).getResultList().isEmpty();
    }

    public boolean lockReview(int ownerId, int reviewId) {
        return !em.createNativeQuery("SELECT r.review_id FROM product_reviews r JOIN order_items i ON i.order_item_id=r.order_item_id "
                        + "JOIN orders o ON o.order_id=i.order_id WHERE r.review_id=:id AND o.user_id=:owner FOR UPDATE OF r")
                .setParameter("id", reviewId).setParameter("owner", ownerId).getResultList().isEmpty();
    }

    public boolean lockActiveReview(int ownerId, int reviewId) {
        return !em.createNativeQuery("SELECT r.review_id FROM product_reviews r JOIN order_items i ON i.order_item_id=r.order_item_id "
                        + "JOIN orders o ON o.order_id=i.order_id WHERE r.review_id=:id AND o.user_id=:owner "
                        + "AND r.status <> 'DELETED' FOR UPDATE OF r")
                .setParameter("id", reviewId).setParameter("owner", ownerId).getResultList().isEmpty();
    }

    public long setupCount(int postId) { return count("SELECT count(*) FROM setup_images WHERE post_id=:id", postId); }
    public long reviewCount(int reviewId) { return count("SELECT count(*) FROM review_media WHERE review_id=:id", reviewId); }
    public long reviewVideoCount(int reviewId) {
        return count("SELECT count(*) FROM review_media WHERE review_id=:id AND media_type='VIDEO'", reviewId);
    }

    public int nextSetupPosition(int postId) { return position("setup_images", "post_id", postId); }
    public int nextReviewPosition(int reviewId) { return position("review_media", "review_id", reviewId); }

    public MediaAsset lockAsset(UUID id) { return em.find(MediaAsset.class, id, LockModeType.PESSIMISTIC_WRITE); }

    public void insertSetup(int postId, UUID mediaId, int position) {
        em.createNativeQuery("INSERT INTO setup_images(post_id,image_url,sort_order,media_asset_id) "
                        + "VALUES (:post,:url,:position,:media)")
                .setParameter("post", postId).setParameter("url", "/api/media/" + mediaId + "/content")
                .setParameter("position", position).setParameter("media", mediaId).executeUpdate();
    }

    public void insertReview(int reviewId, MediaAsset asset, int position) {
        boolean video = "video".equals(asset.getResourceType());
        var query = em.createNativeQuery(video
                ? "INSERT INTO review_media(review_id,media_type,storage_key,mime_type,size_bytes,duration_second,sort_order,media_asset_id) "
                  + "VALUES (:review,'VIDEO',:key,:mime,:size,:duration,:position,:media)"
                : "INSERT INTO review_media(review_id,media_type,storage_key,mime_type,size_bytes,sort_order,media_asset_id) "
                  + "VALUES (:review,'IMAGE',:key,:mime,:size,:position,:media)");
        query.setParameter("review", reviewId).setParameter("key", "media:" + asset.getMediaId())
                .setParameter("mime", asset.getMimeType()).setParameter("size", asset.getSizeBytes())
                .setParameter("position", position).setParameter("media", asset.getMediaId());
        if (video) query.setParameter("duration", asset.getDurationSecond());
        query.executeUpdate();
    }

    public int deleteSetup(int postId, UUID mediaId) {
        return em.createNativeQuery("DELETE FROM setup_images WHERE post_id=:parent AND media_asset_id=:media")
                .setParameter("parent", postId).setParameter("media", mediaId).executeUpdate();
    }

    public int deleteReview(int reviewId, UUID mediaId) {
        return em.createNativeQuery("DELETE FROM review_media WHERE review_id=:parent AND media_asset_id=:media")
                .setParameter("parent", reviewId).setParameter("media", mediaId).executeUpdate();
    }

    public Visibility setupVisibility(UUID mediaId) {
        return visibility(em.createNativeQuery("SELECT p.user_id,p.status FROM setup_images i "
                        + "JOIN setup_posts p ON p.post_id=i.post_id WHERE i.media_asset_id=:id")
                .setParameter("id", mediaId).getResultList());
    }

    public Visibility reviewVisibility(UUID mediaId) {
        return visibility(em.createNativeQuery("SELECT o.user_id,r.status FROM review_media m "
                        + "JOIN product_reviews r ON r.review_id=m.review_id "
                        + "JOIN order_items i ON i.order_item_id=r.order_item_id "
                        + "JOIN orders o ON o.order_id=i.order_id WHERE m.media_asset_id=:id")
                .setParameter("id", mediaId).getResultList());
    }

    private long count(String sql, int id) {
        return ((Number) em.createNativeQuery(sql).setParameter("id", id).getSingleResult()).longValue();
    }

    private int position(String table, String foreignKey, int id) {
        return ((Number) em.createNativeQuery("SELECT COALESCE(MAX(sort_order),-1)+1 FROM " + table + " WHERE " + foreignKey + "=:id")
                .setParameter("id", id).getSingleResult()).intValue();
    }

    private static Visibility visibility(List<?> rows) {
        if (rows.size() != 1) return null;
        Object[] row = (Object[]) rows.getFirst();
        return new Visibility(((Number) row[0]).intValue(), (String) row[1]);
    }
}
