package com.pcstore.dao;

import com.pcstore.config.PersistenceManager;
import com.pcstore.entity.User;
import com.pcstore.entity.PasswordResetChallenge;
import com.pcstore.entity.enums.UserRole;
import com.pcstore.entity.enums.UserStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityTransaction;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import jakarta.persistence.EntityManagerFactory;

public class UserDAO {
    private final Supplier<EntityManagerFactory> factory;

    public UserDAO() {
        this(PersistenceManager::get);
    }

    public UserDAO(Supplier<EntityManagerFactory> factory) {
        this.factory = factory;
    }

    private EntityManager getEntityManager() {
        return factory.get().createEntityManager();
    }

    public Optional<User> findByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return Optional.empty();
        }
        try (EntityManager em = getEntityManager()) {
            List<User> list = em.createQuery("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)", User.class)
                    .setParameter("email", email.trim())
                    .getResultList();
            if (list.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(list.get(0));
        }
    }

    public boolean existsByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        try (EntityManager em = getEntityManager()) {
            Long count = em.createQuery("SELECT COUNT(u) FROM User u WHERE LOWER(u.email) = LOWER(:email)", Long.class)
                    .setParameter("email", email.trim())
                    .getSingleResult();
            return count != null && count > 0;
        }
    }

    public Optional<User> findById(int id) {
        try (EntityManager em = getEntityManager()) {
            return Optional.ofNullable(em.find(User.class, id));
        }
    }

    public User createCustomer(String name, String email, String passwordHash, String phone) {
        try (EntityManager em = getEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            try {
                tx.begin();
                User user = new User();
                user.setFullName(name);
                user.setEmail(email.trim().toLowerCase());
                user.setPasswordHash(passwordHash);
                user.setPhone(phone);
                user.setRole(UserRole.CUSTOMER);
                user.setStatus(UserStatus.ACTIVE);
                em.persist(user);
                tx.commit();
                return user;
            } catch (RuntimeException e) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw e;
            }
        }
    }

    public Optional<User> updateProfile(int userId, String name, String phone) {
        try (EntityManager em = getEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            try {
                tx.begin();
                User user = em.find(User.class, userId);
                if (user == null) {
                    tx.rollback();
                    return Optional.empty();
                }
                user.setFullName(name);
                user.setPhone(phone);
                tx.commit();
                return Optional.of(user);
            } catch (RuntimeException e) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw e;
            }
        }
    }

    public boolean updatePasswordIfCurrent(int userId, String expectedHash, String passwordHash) {
        try (EntityManager em = getEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            try {
                tx.begin();
                User user = em.find(User.class, userId, LockModeType.PESSIMISTIC_WRITE);
                if (user == null || user.getStatus() != UserStatus.ACTIVE
                        || !expectedHash.equals(user.getPasswordHash())) {
                    tx.rollback();
                    return false;
                }
                user.setPasswordHash(passwordHash);
                user.setAuthVersion(user.getAuthVersion() + 1);
                PasswordResetChallenge challenge = em.find(PasswordResetChallenge.class, userId);
                if (challenge != null) {
                    em.remove(challenge);
                }
                tx.commit();
                return true;
            } catch (RuntimeException e) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw e;
            }
        }
    }

    public Optional<User> updateStatus(int userId, UserStatus status) {
        try (EntityManager em = getEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            tx.begin();
            try {
                User user = em.find(User.class, userId);
                if (user == null) {
                    tx.rollback();
                    return Optional.empty();
                }
                user.setStatus(status);
                tx.commit();
                return Optional.of(user);
            } catch (RuntimeException error) {
                if (tx.isActive()) {
                    tx.rollback();
                }
                throw error;
            }
        }
    }

    public List<User> listUsers(UserRole role, UserStatus status, String query, int offset, int limit) {
        try (EntityManager em = getEntityManager()) {
            return queryUsers(em, role, status, query, offset, limit);
        }
    }

    private List<User> queryUsers(EntityManager em, UserRole role, UserStatus status, String query, int offset, int limit) {
        StringBuilder jpql = new StringBuilder("SELECT u FROM User u WHERE 1=1");
        if (role != null) {
            jpql.append(" AND u.role = :role");
        }
        if (status != null) {
            jpql.append(" AND u.status = :status");
        }
        if (query != null && !query.isBlank()) {
            jpql.append(" AND (LOWER(u.fullName) LIKE :query OR LOWER(u.email) LIKE :query OR LOWER(u.phone) LIKE :query)");
        }
        jpql.append(" ORDER BY u.userId ASC");

        var q = em.createQuery(jpql.toString(), User.class);
        if (role != null) {
            q.setParameter("role", role);
        }
        if (status != null) {
            q.setParameter("status", status);
        }
        if (query != null && !query.isBlank()) {
            q.setParameter("query", "%" + query.trim().toLowerCase() + "%");
        }
        q.setFirstResult(Math.max(0, offset));
        q.setMaxResults(Math.min(100, Math.max(1, limit)));
        return q.getResultList();
    }

    public Object[] getUserOrderStats(int userId) {
        String sql = "SELECT COUNT(o.order_id), COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.user_id = :userId AND o.status <> 'CANCELLED'";
        try (EntityManager em = getEntityManager()) {
            return (Object[]) em.createNativeQuery(sql).setParameter("userId", userId).getSingleResult();
        }
    }
}
