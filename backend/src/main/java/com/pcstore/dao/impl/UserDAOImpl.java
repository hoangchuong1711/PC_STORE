package com.pcstore.dao.impl;

import java.util.Optional;

import com.pcstore.dao.UserDAO;
import com.pcstore.entity.User;

import jakarta.persistence.EntityManager;

public class UserDAOImpl implements UserDAO {
    @Override public Optional<User> findByEmail(EntityManager em, String email) {
        return em.createQuery("SELECT u FROM User u WHERE u.email = :email", User.class)
                .setParameter("email", email).getResultStream().findFirst();
    }
    @Override public Optional<User> findById(EntityManager em, int id) {
        return Optional.ofNullable(em.find(User.class, id));
    }
    @Override public User save(EntityManager em, User user) {
        em.persist(user);
        return user;
    }
    @Override public java.util.List<User> listUsers(EntityManager em, String role, String status, String query, int offset, int limit) {
        StringBuilder jpql = new StringBuilder("SELECT u FROM User u WHERE 1=1");
        if (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) {
            jpql.append(" AND u.role = :role");
        }
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            jpql.append(" AND u.status = :status");
        }
        if (query != null && !query.isBlank()) {
            jpql.append(" AND (LOWER(u.fullName) LIKE :query OR LOWER(u.email) LIKE :query OR LOWER(u.phone) LIKE :query)");
        }
        jpql.append(" ORDER BY u.userId ASC");

        var q = em.createQuery(jpql.toString(), User.class);
        if (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) {
            try {
                q.setParameter("role", com.pcstore.entity.enums.UserRole.valueOf(role.trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            try {
                q.setParameter("status", com.pcstore.entity.enums.UserStatus.valueOf(status.trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (query != null && !query.isBlank()) {
            q.setParameter("query", "%" + query.trim().toLowerCase() + "%");
        }
        q.setFirstResult(Math.max(0, offset));
        q.setMaxResults(Math.min(100, Math.max(1, limit)));
        return q.getResultList();
    }
    @Override public Object[] getUserOrderStats(EntityManager em, int userId) {
        String sql = "SELECT COUNT(o.order_id), COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = :userId AND o.status <> 'CANCELLED'";
        return (Object[]) em.createNativeQuery(sql)
                .setParameter("userId", userId)
                .getSingleResult();
    }
}
