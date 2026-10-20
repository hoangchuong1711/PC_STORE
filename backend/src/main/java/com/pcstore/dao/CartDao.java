package com.pcstore.dao;

import com.pcstore.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.List;

public class CartDao {
    private final EntityManager em;

    public CartDao(EntityManager em) { this.em = em; }

    public User findUser(int userId, boolean lock) {
        return em.find(User.class, userId, lock ? LockModeType.PESSIMISTIC_WRITE : LockModeType.NONE);
    }

    public Cart findCart(int userId, boolean lock) {
        var query = em.createQuery("select c from Cart c where c.user.userId = :userId", Cart.class)
                .setParameter("userId", userId);
        if (lock) query.setLockMode(LockModeType.PESSIMISTIC_WRITE);
        var rows = query.getResultList();
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public List<CartItem> findItems(int cartId) {
        return em.createQuery("select i from CartItem i join fetch i.product p " +
                "join fetch p.category join fetch p.brand where i.cart.cartId = :cartId " +
                "order by i.cartItemId", CartItem.class).setParameter("cartId", cartId).getResultList();
    }

    public CartItem findItem(int cartId, int itemId) {
        var rows = em.createQuery("select i from CartItem i join fetch i.product p " +
                "join fetch p.category join fetch p.brand " +
                "where i.cart.cartId = :cartId and i.cartItemId = :itemId", CartItem.class)
                .setParameter("cartId", cartId).setParameter("itemId", itemId).getResultList();
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public CartItem findItemByProduct(int cartId, int productId) {
        var rows = em.createQuery("select i from CartItem i where i.cart.cartId = :cartId " +
                "and i.product.productId = :productId", CartItem.class)
                .setParameter("cartId", cartId).setParameter("productId", productId).getResultList();
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public Product findProduct(int productId) {
        var rows = em.createQuery("select p from Product p join fetch p.category join fetch p.brand " +
                "where p.productId = :productId", Product.class)
                .setParameter("productId", productId).getResultList();
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public Inventory findInventory(int productId) {
        var rows = em.createQuery("select i from Inventory i where i.product.productId = :productId", Inventory.class)
                .setParameter("productId", productId).getResultList();
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public void save(Cart cart) { em.persist(cart); }
    public void save(CartItem item) { em.persist(item); }
    public void delete(CartItem item) { em.remove(item); }
}