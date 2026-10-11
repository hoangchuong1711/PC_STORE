package com.pcstore.dao;

import com.pcstore.entity.Address;
import com.pcstore.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import java.util.List;

public class AddressDao {
    private final EntityManager em;

    public AddressDao(EntityManager em) {
        this.em = em;
    }

    public List<Address> findByUserId(int userId) {
        return em.createQuery(
                "SELECT a FROM Address a WHERE a.user.userId = :userId ORDER BY a.isDefault DESC, a.addressId DESC",
                Address.class)
                .setParameter("userId", userId)
                .getResultList();
    }

    public Address findByIdAndUserId(int addressId, int userId) {
        List<Address> list = em.createQuery(
                "SELECT a FROM Address a WHERE a.addressId = :addressId AND a.user.userId = :userId",
                Address.class)
                .setParameter("addressId", addressId)
                .setParameter("userId", userId)
                .setMaxResults(1)
                .getResultList();
        return list.isEmpty() ? null : list.getFirst();
    }

    public void lockUser(int userId) {
        em.find(User.class, userId, LockModeType.PESSIMISTIC_WRITE);
    }

    public void unsetDefault(int userId) {
        em.createQuery("UPDATE Address a SET a.isDefault = false WHERE a.user.userId = :userId AND a.isDefault = true")
                .setParameter("userId", userId)
                .executeUpdate();
    }

    public void persist(Address address) {
        em.persist(address);
    }

    public void remove(Address address) {
        em.remove(address);
    }

    public long countByUserId(int userId) {
        return em.createQuery("SELECT COUNT(a) FROM Address a WHERE a.user.userId = :userId", Long.class)
                .setParameter("userId", userId)
                .getSingleResult();
    }

    public void flush() {
        em.flush();
    }
}
