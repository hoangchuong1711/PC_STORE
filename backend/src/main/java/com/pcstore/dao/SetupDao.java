package com.pcstore.dao;

import com.pcstore.dto.SetupDto;
import jakarta.persistence.EntityManager;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public final class SetupDao {
    private final EntityManager em;
    public SetupDao(EntityManager em) { this.em = em; }

    public boolean delivered(int userId) {
        return !em.createNativeQuery("SELECT order_id FROM orders WHERE user_id=:user AND status='DELIVERED' LIMIT 1")
                .setParameter("user", userId).getResultList().isEmpty();
    }

    public boolean activeCustomer(int userId) {
        return !em.createNativeQuery("SELECT user_id FROM users WHERE user_id=:user AND role='CUSTOMER' AND status='ACTIVE'")
                .setParameter("user", userId).getResultList().isEmpty();
    }

    public List<SetupDto.Product> products(List<Integer> ids) {
        if (ids.isEmpty()) return List.of();
        return em.createNativeQuery("SELECT p.product_id,p.name FROM products p "
                        + "JOIN categories c ON c.category_id=p.category_id JOIN brands b ON b.brand_id=p.brand_id "
                        + "WHERE p.product_id IN :ids AND p.status='ACTIVE' AND c.status='ACTIVE' AND b.status='ACTIVE'")
                .setParameter("ids", ids).getResultList().stream().map(row -> {
                    Object[] values = (Object[]) row;
                    return new SetupDto.Product(((Number) values[0]).intValue(), (String) values[1]);
                }).toList();
    }

    public int insert(int userId, String title, String description, LocalDateTime now) {
        return ((Number) em.createNativeQuery("INSERT INTO setup_posts(user_id,title,description,created_at,updated_at) "
                + "VALUES (:user,:title,:description,:now,:now) RETURNING post_id")
                .setParameter("user", userId).setParameter("title", title)
                .setParameter("description", description).setParameter("now", now).getSingleResult()).intValue();
    }

    public Object[] find(int postId, Integer ownerId, boolean publicOnly, boolean lock) {
        String query = "SELECT post_id,user_id,title,description,status,created_at,updated_at FROM setup_posts WHERE post_id=:id"
                + (publicOnly ? " AND status='PUBLISHED'" : ownerId == null ? "" : " AND user_id=:owner")
                + (lock ? " FOR UPDATE" : "");
        var q = em.createNativeQuery(query).setParameter("id", postId);
        if (!publicOnly && ownerId != null) q.setParameter("owner", ownerId);
        List<?> rows = q.getResultList();
        return rows.isEmpty() ? null : (Object[]) rows.getFirst();
    }

    public List<Integer> ids(Integer ownerId, int offset, int limit) {
        String where = ownerId == null ? "status='PUBLISHED'" : "user_id=:owner";
        var q = em.createNativeQuery("SELECT post_id FROM setup_posts WHERE " + where
                + " ORDER BY created_at DESC,post_id DESC OFFSET :offset LIMIT :limit")
                .setParameter("offset", offset).setParameter("limit", limit);
        if (ownerId != null) q.setParameter("owner", ownerId);
        return q.getResultList().stream().map(id -> ((Number) id).intValue()).toList();
    }

    public List<UUID> images(int postId) {
        return em.createNativeQuery("SELECT media_asset_id FROM setup_images WHERE post_id=:id ORDER BY sort_order,image_id")
                .setParameter("id", postId).getResultList().stream().map(value -> (UUID) value).toList();
    }

    public List<SetupDto.Product> linkedProducts(int postId) {
        return em.createNativeQuery("SELECT p.product_id,p.name FROM setup_post_products sp JOIN products p USING(product_id) "
                + "WHERE sp.post_id=:id ORDER BY p.product_id").setParameter("id", postId)
                .getResultList().stream().map(row -> {
                    Object[] values = (Object[]) row;
                    return new SetupDto.Product(((Number) values[0]).intValue(), (String) values[1]);
                }).toList();
    }

    public void replaceProducts(int postId, List<Integer> ids) {
        em.createNativeQuery("DELETE FROM setup_post_products WHERE post_id=:id").setParameter("id", postId).executeUpdate();
        for (int id : ids) em.createNativeQuery("INSERT INTO setup_post_products(post_id,product_id) VALUES (:post,:product)")
                .setParameter("post", postId).setParameter("product", id).executeUpdate();
    }

    public void update(int postId, String title, String description, LocalDateTime now) {
        em.createNativeQuery("UPDATE setup_posts SET title=:title,description=:description,updated_at=:now WHERE post_id=:id")
                .setParameter("title", title).setParameter("description", description)
                .setParameter("now", now).setParameter("id", postId).executeUpdate();
    }

    public void delete(int postId) { em.createNativeQuery("DELETE FROM setup_posts WHERE post_id=:id").setParameter("id", postId).executeUpdate(); }

    public static LocalDateTime time(Object value) {
        return value instanceof Timestamp stamp ? stamp.toLocalDateTime() : (LocalDateTime) value;
    }
}
