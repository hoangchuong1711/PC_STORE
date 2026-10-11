package com.pcstore.dao;

import com.pcstore.entity.User;
import jakarta.persistence.EntityManager;
import java.util.Optional;

public interface UserDAO {
    Optional<User> findByEmail(EntityManager em, String normalizedEmail);
    Optional<User> findById(EntityManager em, int userId);
    User save(EntityManager em, User user);
    java.util.List<User> listUsers(EntityManager em, String role, String status, String query, int offset, int limit);
    Object[] getUserOrderStats(EntityManager em, int userId);
}
