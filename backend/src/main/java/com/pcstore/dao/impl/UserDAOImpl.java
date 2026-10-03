package com.pcstore.dao.impl;

import com.pcstore.dao.UserDAO;
import com.pcstore.entity.User;
import jakarta.persistence.EntityManager;
import java.util.Optional;

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
}
