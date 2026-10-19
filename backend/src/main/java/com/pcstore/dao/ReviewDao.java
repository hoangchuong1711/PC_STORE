package com.pcstore.dao;

import com.pcstore.dto.ReviewDto;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class ReviewDao {
    private final EntityManager entityManager;

    public ReviewDao(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public static class OrderLine {
        private int orderItemId;
        private int productId;
        private int ownerId;
        private String orderStatus;
        private boolean deliveredAtPresent;

        public OrderLine(
                int orderItemId,
                int productId,
                int ownerId,
                String orderStatus,
                boolean deliveredAtPresent) {
            this.orderItemId = orderItemId;
            this.productId = productId;
            this.ownerId = ownerId;
            this.orderStatus = orderStatus;
            this.deliveredAtPresent = deliveredAtPresent;
        }

        public int getOrderItemId() {
            return orderItemId;
        }

        public int getProductId() {
            return productId;
        }

        public int getOwnerId() {
            return ownerId;
        }

        public String getOrderStatus() {
            return orderStatus;
        }

        public boolean getDeliveredAtPresent() {
            return deliveredAtPresent;
        }
    }

    public static class ReviewRow {
        private int reviewId;
        private int orderItemId;
        private int orderId;
        private int productId;
        private String productName;
        private int authorId;
        private String authorName;
        private int rating;
        private String content;
        private String status;

        public ReviewRow(
                int reviewId,
                int orderItemId,
                int orderId,
                int productId,
                String productName,
                int authorId,
                String authorName,
                int rating,
                String content,
                String status) {
            this.reviewId = reviewId;
            this.orderItemId = orderItemId;
            this.orderId = orderId;
            this.productId = productId;
            this.productName = productName;
            this.authorId = authorId;
            this.authorName = authorName;
            this.rating = rating;
            this.content = content;
            this.status = status;
        }

        public int getReviewId() {
            return reviewId;
        }

        public int getOrderItemId() {
            return orderItemId;
        }

        public int getOrderId() {
            return orderId;
        }

        public int getProductId() {
            return productId;
        }

        public String getProductName() {
            return productName;
        }

        public int getAuthorId() {
            return authorId;
        }

        public String getAuthorName() {
            return authorName;
        }

        public int getRating() {
            return rating;
        }

        public String getContent() {
            return content;
        }

        public String getStatus() {
            return status;
        }
    }

    public boolean activeCustomer(int userId) {
        String sql =
                "SELECT user_id FROM users WHERE user_id=:user "
                        + "AND role='CUSTOMER' AND status='ACTIVE'";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("user", userId);
        return !query.getResultList().isEmpty();
    }

    public boolean publicProduct(int productId) {
        String sql =
                "SELECT p.product_id FROM products p "
                        + "JOIN categories c ON c.category_id=p.category_id "
                        + "JOIN brands b ON b.brand_id=p.brand_id "
                        + "WHERE p.product_id=:product AND p.status='ACTIVE' "
                        + "AND c.status='ACTIVE' AND b.status='ACTIVE'";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("product", productId);
        return !query.getResultList().isEmpty();
    }

    public OrderLine orderLine(int orderItemId, boolean lock) {
        String sql =
                "SELECT i.order_item_id,i.product_id,o.user_id,o.status,o.delivered_at "
                        + "FROM order_items i JOIN orders o ON o.order_id=i.order_id "
                        + "WHERE i.order_item_id=:id"
                        + (lock ? " FOR UPDATE OF i" : "");
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", orderItemId);
        List<?> rows = query.getResultList();
        if (rows.isEmpty()) {
            return null;
        }
        Object[] row = (Object[]) rows.getFirst();
        return new OrderLine(
                number(row[0]), number(row[1]), number(row[2]), (String) row[3], row[4] != null);
    }

    public Integer reviewIdForOrderItem(int orderItemId) {
        String sql = "SELECT review_id FROM product_reviews WHERE order_item_id=:item";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("item", orderItemId);
        List<?> rows = query.getResultList();
        return rows.isEmpty() ? null : number(rows.getFirst());
    }

    public int insert(int orderItemId, int rating, String content) {
        String sql =
                "INSERT INTO product_reviews(order_item_id,rating,content) "
                        + "VALUES (:item,:rating,:content) RETURNING review_id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("item", orderItemId);
        query.setParameter("rating", rating);
        query.setParameter("content", content);
        return number(query.getSingleResult());
    }

    public void update(int reviewId, int rating, String content) {
        String sql =
                "UPDATE product_reviews SET rating=:rating,content=:content WHERE"
                        + " review_id=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("rating", rating);
        query.setParameter("content", content);
        query.setParameter("id", reviewId);
        query.executeUpdate();
    }

    public void status(int reviewId, String status) {
        String sql = "UPDATE product_reviews SET status=:status WHERE review_id=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("status", status);
        query.setParameter("id", reviewId);
        query.executeUpdate();
    }

    public ReviewRow find(int reviewId, Integer ownerId, boolean publicOnly, boolean lock) {
        StringBuilder queryText =
                new StringBuilder(
                        "SELECT"
                            + " r.review_id,r.order_item_id,i.order_id,i.product_id,p.name,o.user_id,u.full_name,r.rating,r.content,r.status"
                            + " FROM product_reviews r JOIN order_items i ON"
                            + " i.order_item_id=r.order_item_id JOIN orders o ON"
                            + " o.order_id=i.order_id JOIN products p ON p.product_id=i.product_id"
                            + " JOIN users u ON u.user_id=o.user_id WHERE r.review_id=:id");
        if (ownerId != null) {
            queryText.append(" AND o.user_id=:owner");
        }
        if (publicOnly) {
            queryText.append(" AND r.status='PUBLISHED'");
        }
        if (lock) {
            queryText.append(" FOR UPDATE OF r");
        }
        String sql = queryText.toString();
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", reviewId);
        if (ownerId != null) {
            query.setParameter("owner", ownerId);
        }
        List<?> rows = query.getResultList();
        return rows.isEmpty() ? null : row((Object[]) rows.getFirst());
    }

    public ReviewRow findOwnedByOrderItem(int userId, int orderItemId) {
        String sql =
                "SELECT r.review_id FROM product_reviews r "
                        + "JOIN order_items i ON i.order_item_id=r.order_item_id "
                        + "JOIN orders o ON o.order_id=i.order_id "
                        + "WHERE r.order_item_id=:item AND o.user_id=:owner";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("item", orderItemId);
        query.setParameter("owner", userId);
        List<?> ids = query.getResultList();
        return ids.isEmpty() ? null : find(number(ids.getFirst()), userId, false, false);
    }

    public List<Integer> publicIds(
            int productId,
            int page,
            int size,
            Integer rating,
            Boolean hasMedia,
            ReviewDto.Sort sort) {
        String order;
        switch (sort) {
            case OLDEST:
                order = "r.review_id ASC";
                break;
            case RATING_DESC:
                order = "r.rating DESC,r.review_id DESC";
                break;
            case RATING_ASC:
                order = "r.rating ASC,r.review_id DESC";
                break;
            case HELPFUL:
                order =
                        "(SELECT count(*) FROM review_likes l WHERE l.review_id=r.review_id)"
                            + " DESC,r.review_id DESC";
                break;
            case NEWEST:
            default:
                order = "r.review_id DESC";
                break;
        }
        String sql =
                "SELECT r.review_id FROM product_reviews r JOIN order_items i ON"
                        + " i.order_item_id=r.order_item_id WHERE "
                        + publicWhere(rating, hasMedia)
                        + " ORDER BY "
                        + order
                        + " OFFSET :offset LIMIT :limit";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("product", productId);
        query.setParameter("offset", page * size);
        query.setParameter("limit", size);
        bindFilters(query, rating);
        List<Integer> reviewIds = new ArrayList<>();
        for (Object value : query.getResultList()) {
            reviewIds.add(number(value));
        }
        return reviewIds;
    }

    public long publicCount(int productId, Integer rating, Boolean hasMedia) {
        String sql =
                "SELECT count(*) FROM product_reviews r JOIN order_items i ON"
                        + " i.order_item_id=r.order_item_id WHERE "
                        + publicWhere(rating, hasMedia);
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("product", productId);
        bindFilters(query, rating);
        return ((Number) query.getSingleResult()).longValue();
    }

    public ReviewDto.Summary summary(int productId) {
        String sql =
                "SELECT COALESCE(avg(r.rating),0),count(*) FROM"
                        + " product_reviews r JOIN order_items i ON"
                        + " i.order_item_id=r.order_item_id WHERE"
                        + " i.product_id=:product AND r.status='PUBLISHED'";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("product", productId);
        Object[] totals = (Object[]) query.getSingleResult();
        long total = ((Number) totals[1]).longValue();
        double average = Math.round(((Number) totals[0]).doubleValue() * 100.0) / 100.0;
        long[] counts = new long[6];
        String sql2 =
                "SELECT r.rating,count(*) FROM product_reviews r JOIN order_items i"
                        + " ON i.order_item_id=r.order_item_id WHERE"
                        + " i.product_id=:product AND r.status='PUBLISHED' GROUP BY"
                        + " r.rating";
        Query query2 = entityManager.createNativeQuery(sql2);
        query2.setParameter("product", productId);
        for (Object value : query2.getResultList()) {
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
        String sql =
                "SELECT media_asset_id,media_type,mime_type,size_bytes,duration_second,sort_order"
                    + " FROM review_media WHERE review_id=:review ORDER BY sort_order,media_id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("review", reviewId);
        List<?> rows = query.getResultList();
        List<ReviewDto.Media> media = new ArrayList<>();
        for (Object value : rows) {
            Object[] row = (Object[]) value;
            UUID mediaId = (UUID) row[0];
            Integer duration = null;
            String contentUrl = null;
            if (row[4] != null) {
                duration = number(row[4]);
            }
            if (mediaId != null) {
                contentUrl = "/api/media/" + mediaId + "/content";
            }
            media.add(
                    new ReviewDto.Media(
                            mediaId,
                            (String) row[1],
                            (String) row[2],
                            ((Number) row[3]).longValue(),
                            duration,
                            number(row[5]),
                            contentUrl));
        }
        return media;
    }

    public long likeCount(int reviewId) {
        String sql = "SELECT count(*) FROM review_likes WHERE review_id=:review";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("review", reviewId);
        return ((Number) query.getSingleResult()).longValue();
    }

    public boolean liked(int reviewId, Integer userId) {
        String sql =
                "SELECT review_id FROM review_likes " + "WHERE review_id=:review AND user_id=:user";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("review", reviewId);
        query.setParameter("user", userId);
        return userId != null && !query.getResultList().isEmpty();
    }

    private static String publicWhere(Integer rating, Boolean hasMedia) {
        String where = "i.product_id=:product AND r.status='PUBLISHED'";
        if (rating != null) {
            where += " AND r.rating=:rating";
        }
        if (Boolean.TRUE.equals(hasMedia)) {
            where += " AND EXISTS (SELECT 1 FROM review_media m WHERE m.review_id=r.review_id)";
        } else if (Boolean.FALSE.equals(hasMedia)) {
            where += " AND NOT EXISTS (SELECT 1 FROM review_media m WHERE m.review_id=r.review_id)";
        }
        return where;
    }

    private static void bindFilters(Query query, Integer rating) {
        if (rating != null) {
            query.setParameter("rating", rating);
        }
    }

    private static ReviewRow row(Object[] row) {
        return new ReviewRow(
                number(row[0]),
                number(row[1]),
                number(row[2]),
                number(row[3]),
                (String) row[4],
                number(row[5]),
                (String) row[6],
                number(row[7]),
                (String) row[8],
                (String) row[9]);
    }

    private static int number(Object value) {
        return ((Number) value).intValue();
    }
}
