package com.pcstore.dao;

import com.pcstore.dto.ReviewDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class ReviewDao {
    private final EntityManager em;

    public ReviewDao(EntityManager em) { this.em = em; }

    public record OrderLine(int orderItemId, int productId, int ownerId, String orderStatus,
                            boolean deliveredAtPresent) { }

    public record ReviewRow(int reviewId, int orderItemId, int orderId, int productId,
                            String productName, int authorId, String authorName,
                            int rating, String content, String status) { }

    public boolean activeCustomer(int userId) {
        return !em.createNativeQuery("SELECT user_id FROM users WHERE user_id=:user "
                        + "AND role='CUSTOMER' AND status='ACTIVE'")
                .setParameter("user", userId).getResultList().isEmpty();
    }

    public boolean publicProduct(int productId) {
        return !em.createNativeQuery("SELECT p.product_id FROM products p "
                        + "JOIN categories c ON c.category_id=p.category_id "
                        + "JOIN brands b ON b.brand_id=p.brand_id "
                        + "WHERE p.product_id=:product AND p.status='ACTIVE' "
                        + "AND c.status='ACTIVE' AND b.status='ACTIVE'")
                .setParameter("product", productId).getResultList().isEmpty();
    }

    public OrderLine orderLine(int orderItemId, boolean lock) {
        String sql = "SELECT i.order_item_id,i.product_id,o.user_id,o.status,o.delivered_at "
                + "FROM order_items i JOIN orders o ON o.order_id=i.order_id "
                + "WHERE i.order_item_id=:id" + (lock ? " FOR UPDATE OF i" : "");
        List<?> rows = em.createNativeQuery(sql).setParameter("id", orderItemId).getResultList();
        if (rows.isEmpty()) return null;
        Object[] row = (Object[]) rows.getFirst();
        return new OrderLine(number(row[0]), number(row[1]), number(row[2]),
                (String) row[3], row[4] != null);
    }

    public Integer reviewIdForOrderItem(int orderItemId) {
        List<?> rows = em.createNativeQuery("SELECT review_id FROM product_reviews WHERE order_item_id=:item")
                .setParameter("item", orderItemId).getResultList();
        return rows.isEmpty() ? null : number(rows.getFirst());
    }

    public int insert(int orderItemId, int rating, String content) {
        return number(em.createNativeQuery("INSERT INTO product_reviews(order_item_id,rating,content) "
                        + "VALUES (:item,:rating,:content) RETURNING review_id")
                .setParameter("item", orderItemId).setParameter("rating", rating)
                .setParameter("content", content).getSingleResult());
    }

    public void update(int reviewId, int rating, String content) {
        em.createNativeQuery("UPDATE product_reviews SET rating=:rating,content=:content WHERE review_id=:id")
                .setParameter("rating", rating).setParameter("content", content)
                .setParameter("id", reviewId).executeUpdate();
    }

    public void status(int reviewId, String status) {
        em.createNativeQuery("UPDATE product_reviews SET status=:status WHERE review_id=:id")
                .setParameter("status", status).setParameter("id", reviewId).executeUpdate();
    }

    public ReviewRow find(int reviewId, Integer ownerId, boolean publicOnly, boolean lock) {
        StringBuilder sql = new StringBuilder("SELECT r.review_id,r.order_item_id,i.order_id,i.product_id,p.name,"
                + "o.user_id,u.full_name,r.rating,r.content,r.status FROM product_reviews r "
                + "JOIN order_items i ON i.order_item_id=r.order_item_id "
                + "JOIN orders o ON o.order_id=i.order_id JOIN products p ON p.product_id=i.product_id "
                + "JOIN users u ON u.user_id=o.user_id WHERE r.review_id=:id");
        if (ownerId != null) sql.append(" AND o.user_id=:owner");
        if (publicOnly) sql.append(" AND r.status='PUBLISHED'");
        if (lock) sql.append(" FOR UPDATE OF r");
        Query query = em.createNativeQuery(sql.toString()).setParameter("id", reviewId);
        if (ownerId != null) query.setParameter("owner", ownerId);
        List<?> rows = query.getResultList();
        return rows.isEmpty() ? null : row((Object[]) rows.getFirst());
    }

    public ReviewRow findOwnedByOrderItem(int userId, int orderItemId) {
        List<?> ids = em.createNativeQuery("SELECT r.review_id FROM product_reviews r "
                        + "JOIN order_items i ON i.order_item_id=r.order_item_id "
                        + "JOIN orders o ON o.order_id=i.order_id "
                        + "WHERE r.order_item_id=:item AND o.user_id=:owner")
                .setParameter("item", orderItemId).setParameter("owner", userId).getResultList();
        return ids.isEmpty() ? null : find(number(ids.getFirst()), userId, false, false);
    }

    public List<Integer> publicIds(int productId, int page, int size, Integer rating,
                                   Boolean hasMedia, ReviewDto.Sort sort) {
        String order = switch (sort) {
            case OLDEST -> "r.review_id ASC";
            case RATING_DESC -> "r.rating DESC,r.review_id DESC";
            case RATING_ASC -> "r.rating ASC,r.review_id DESC";
            case HELPFUL -> "(SELECT count(*) FROM review_likes l WHERE l.review_id=r.review_id) DESC,r.review_id DESC";
            case NEWEST -> "r.review_id DESC";
        };
        Query query = em.createNativeQuery("SELECT r.review_id FROM product_reviews r "
                        + "JOIN order_items i ON i.order_item_id=r.order_item_id WHERE "
                        + publicWhere(rating, hasMedia) + " ORDER BY " + order
                        + " OFFSET :offset LIMIT :limit")
                .setParameter("product", productId).setParameter("offset", page * size)
                .setParameter("limit", size);
        bindFilters(query, rating);
        return query.getResultList().stream().map(ReviewDao::number).toList();
    }

    public long publicCount(int productId, Integer rating, Boolean hasMedia) {
        Query query = em.createNativeQuery("SELECT count(*) FROM product_reviews r "
                        + "JOIN order_items i ON i.order_item_id=r.order_item_id WHERE "
                        + publicWhere(rating, hasMedia)).setParameter("product", productId);
        bindFilters(query, rating);
        return ((Number) query.getSingleResult()).longValue();
    }

    public ReviewDto.Summary summary(int productId) {
        Object[] totals = (Object[]) em.createNativeQuery("SELECT COALESCE(avg(r.rating),0),count(*) "
                        + "FROM product_reviews r JOIN order_items i ON i.order_item_id=r.order_item_id "
                        + "WHERE i.product_id=:product AND r.status='PUBLISHED'")
                .setParameter("product", productId).getSingleResult();
        long total = ((Number) totals[1]).longValue();
        double average = Math.round(((Number) totals[0]).doubleValue() * 100.0) / 100.0;
        long[] counts = new long[6];
        for (Object value : em.createNativeQuery("SELECT r.rating,count(*) FROM product_reviews r "
                        + "JOIN order_items i ON i.order_item_id=r.order_item_id "
                        + "WHERE i.product_id=:product AND r.status='PUBLISHED' GROUP BY r.rating")
                .setParameter("product", productId).getResultList()) {
            Object[] row = (Object[]) value;
            counts[number(row[0])] = ((Number) row[1]).longValue();
        }
        List<ReviewDto.Distribution> distribution = new ArrayList<>();
        for (int rating = 5; rating >= 1; rating--) {
            double percentage = total == 0 ? 0 : Math.round(counts[rating] * 1000.0 / total) / 10.0;
            distribution.add(new ReviewDto.Distribution(rating, counts[rating], percentage));
        }
        return new ReviewDto.Summary(productId, average, total, distribution);
    }

    public List<ReviewDto.Media> media(int reviewId) {
        return em.createNativeQuery("SELECT media_asset_id,media_type,mime_type,size_bytes,duration_second,sort_order "
                        + "FROM review_media WHERE review_id=:review ORDER BY sort_order,media_id")
                .setParameter("review", reviewId).getResultList().stream().map(value -> {
                    Object[] row = (Object[]) value;
                    UUID id = (UUID) row[0];
                    return new ReviewDto.Media(id, (String) row[1], (String) row[2],
                            ((Number) row[3]).longValue(), row[4] == null ? null : number(row[4]),
                            number(row[5]), id == null ? null : "/api/media/" + id + "/content");
                }).toList();
    }

    public long likeCount(int reviewId) {
        return ((Number) em.createNativeQuery("SELECT count(*) FROM review_likes WHERE review_id=:review")
                .setParameter("review", reviewId).getSingleResult()).longValue();
    }

    public boolean liked(int reviewId, Integer userId) {
        return userId != null && !em.createNativeQuery("SELECT review_id FROM review_likes "
                        + "WHERE review_id=:review AND user_id=:user")
                .setParameter("review", reviewId).setParameter("user", userId).getResultList().isEmpty();
    }

    private static String publicWhere(Integer rating, Boolean hasMedia) {
        return "i.product_id=:product AND r.status='PUBLISHED'"
                + (rating == null ? "" : " AND r.rating=:rating")
                + (hasMedia == null ? "" : hasMedia
                ? " AND EXISTS (SELECT 1 FROM review_media m WHERE m.review_id=r.review_id)"
                : " AND NOT EXISTS (SELECT 1 FROM review_media m WHERE m.review_id=r.review_id)");
    }

    private static void bindFilters(Query query, Integer rating) {
        if (rating != null) query.setParameter("rating", rating);
    }

    private static ReviewRow row(Object[] row) {
        return new ReviewRow(number(row[0]), number(row[1]), number(row[2]), number(row[3]),
                (String) row[4], number(row[5]), (String) row[6], number(row[7]),
                (String) row[8], (String) row[9]);
    }

    private static int number(Object value) { return ((Number) value).intValue(); }
}
