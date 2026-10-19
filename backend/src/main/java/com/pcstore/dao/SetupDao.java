package com.pcstore.dao;

import com.pcstore.dto.SetupDto;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class SetupDao {
    private final EntityManager entityManager;

    public SetupDao(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public boolean delivered(int userId) {
        String sql =
                "SELECT order_id FROM orders WHERE user_id=:user AND status='DELIVERED'"
                        + " LIMIT 1";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("user", userId);
        return !query.getResultList().isEmpty();
    }

    public boolean activeCustomer(int userId) {
        String sql =
                "SELECT user_id FROM users WHERE user_id=:user AND role='CUSTOMER' AND"
                        + " status='ACTIVE'";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("user", userId);
        return !query.getResultList().isEmpty();
    }

    public List<SetupDto.Product> products(List<Integer> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        String sql =
                "SELECT p.product_id,p.name FROM products p JOIN categories c ON"
                        + " c.category_id=p.category_id JOIN brands b ON"
                        + " b.brand_id=p.brand_id WHERE p.product_id IN :ids AND"
                        + " p.status='ACTIVE' AND c.status='ACTIVE' AND"
                        + " b.status='ACTIVE'";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("ids", ids);
        List<?> rows = query.getResultList();
        List<SetupDto.Product> products = new ArrayList<>();
        for (Object row : rows) {
            Object[] values = (Object[]) row;
            int productId = ((Number) values[0]).intValue();
            String productName = (String) values[1];
            products.add(new SetupDto.Product(productId, productName));
        }
        return products;
    }

    public int insert(int userId, String title, String description, LocalDateTime now) {
        String sql =
                "INSERT INTO"
                        + " setup_posts(user_id,title,description,created_at,updated_at)"
                        + " VALUES (:user,:title,:description,:now,:now)"
                        + " RETURNING post_id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("user", userId);
        query.setParameter("title", title);
        query.setParameter("description", description);
        query.setParameter("now", now);
        return ((Number) query.getSingleResult()).intValue();
    }

    public Object[] find(int postId, Integer ownerId, boolean publicOnly, boolean lock) {
        String sql =
                "SELECT post_id,user_id,title,description,status,created_at,updated_at FROM"
                        + " setup_posts WHERE post_id=:id";
        if (publicOnly) {
            sql += " AND status='PUBLISHED'";
        } else if (ownerId != null) {
            sql += " AND user_id=:owner";
        }
        if (lock) {
            sql += " FOR UPDATE";
        }
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", postId);
        if (!publicOnly && ownerId != null) {
            query.setParameter("owner", ownerId);
        }
        List<?> rows = query.getResultList();
        return rows.isEmpty() ? null : (Object[]) rows.getFirst();
    }

    public List<Integer> ids(Integer ownerId, int offset, int limit) {
        String where = ownerId == null ? "status='PUBLISHED'" : "user_id=:owner";
        String sql =
                "SELECT post_id FROM setup_posts WHERE "
                        + where
                        + " ORDER BY created_at DESC,post_id DESC OFFSET :offset"
                        + " LIMIT :limit";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("offset", offset);
        query.setParameter("limit", limit);
        if (ownerId != null) {
            query.setParameter("owner", ownerId);
        }
        List<Integer> postIds = new ArrayList<>();
        for (Object value : query.getResultList()) {
            postIds.add(((Number) value).intValue());
        }
        return postIds;
    }

    public List<UUID> images(int postId) {
        String sql =
                "SELECT media_asset_id FROM setup_images WHERE post_id=:id ORDER BY"
                        + " sort_order,image_id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", postId);
        List<?> rows = query.getResultList();
        List<UUID> mediaIds = new ArrayList<>();
        for (Object value : rows) {
            mediaIds.add((UUID) value);
        }
        return mediaIds;
    }

    public List<SetupDto.Product> linkedProducts(int postId) {
        String sql =
                "SELECT p.product_id,p.name FROM setup_post_products sp JOIN"
                        + " products p USING(product_id) WHERE sp.post_id=:id ORDER BY"
                        + " p.product_id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", postId);
        List<?> rows = query.getResultList();
        List<SetupDto.Product> products = new ArrayList<>();
        for (Object row : rows) {
            Object[] values = (Object[]) row;
            int productId = ((Number) values[0]).intValue();
            String productName = (String) values[1];
            products.add(new SetupDto.Product(productId, productName));
        }
        return products;
    }

    public void replaceProducts(int postId, List<Integer> ids) {
        String sql = "DELETE FROM setup_post_products WHERE post_id=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", postId);
        query.executeUpdate();
        for (int id : ids) {
            String sql2 =
                    "INSERT INTO setup_post_products(post_id,product_id) VALUES"
                            + " (:post,:product)";
            Query query2 = entityManager.createNativeQuery(sql2);
            query2.setParameter("post", postId);
            query2.setParameter("product", id);
            query2.executeUpdate();
        }
    }

    public void update(int postId, String title, String description, LocalDateTime now) {
        String sql =
                "UPDATE setup_posts SET"
                        + " title=:title,description=:description,updated_at=:now WHERE"
                        + " post_id=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("title", title);
        query.setParameter("description", description);
        query.setParameter("now", now);
        query.setParameter("id", postId);
        query.executeUpdate();
    }

    public void delete(int postId) {
        String sql = "DELETE FROM setup_posts WHERE post_id=:id";
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("id", postId);
        query.executeUpdate();
    }

    public static LocalDateTime time(Object value) {
        return value instanceof Timestamp stamp ? stamp.toLocalDateTime() : (LocalDateTime) value;
    }
}
