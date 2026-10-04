package com.pcstore.dao;

import com.pcstore.entity.Cart;
import com.pcstore.entity.CartItem;
import com.pcstore.entity.Inventory;
import com.pcstore.entity.Order;
import com.pcstore.entity.OrderItem;
import com.pcstore.entity.Payment;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public class OrderDao {
    private final EntityManager em;

    public OrderDao(EntityManager em) {
        this.em = em;
    }

    public Optional<Order> findByCheckoutKey(int userId, String key) {
        return em.createQuery("select o from PurchaseOrder o where o.user.userId=:userId and o.checkoutIdempotencyKey=:key", Order.class)
                .setParameter("userId", userId)
                .setParameter("key", key)
                .getResultStream()
                .findFirst();
    }

    public Optional<Cart> lockCartByUser(int userId) {
        return em.createQuery("select c from Cart c where c.user.userId=:userId", Cart.class)
                .setParameter("userId", userId)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .getResultStream()
                .findFirst();
    }

    public List<CartItem> findCartItems(int cartId) {
        return em.createQuery("""
                select ci from CartItem ci
                join fetch ci.product p
                join fetch p.category
                join fetch p.brand
                where ci.cart.cartId=:cartId
                order by p.productId
                """, CartItem.class)
                .setParameter("cartId", cartId)
                .getResultList();
    }

    public List<Inventory> lockInventories(List<Integer> productIds) {
        if (productIds.isEmpty()) return List.of();
        return em.createQuery("""
                select i from Inventory i
                join fetch i.product p
                where p.productId in :productIds
                order by p.productId
                """, Inventory.class)
                .setParameter("productIds", productIds)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .getResultList();
    }

    public Order persist(Order order) {
        em.persist(order);
        return order;
    }

    public void persist(OrderItem item) {
        em.persist(item);
    }

    public void persist(Payment payment) {
        em.persist(payment);
    }

    public void removeCartItems(List<CartItem> items) {
        items.forEach(em::remove);
    }

    public Optional<Order> find(int orderId) {
        return Optional.ofNullable(em.find(Order.class, orderId));
    }

    public Optional<Order> lock(int orderId) {
        return Optional.ofNullable(em.find(Order.class, orderId, LockModeType.PESSIMISTIC_WRITE));
    }

    public List<OrderItem> findItems(int orderId) {
        return em.createQuery("""
                select oi from OrderItem oi
                join fetch oi.product p
                where oi.order.orderId=:orderId
                order by oi.orderItemId
                """, OrderItem.class)
                .setParameter("orderId", orderId)
                .getResultList();
    }

    public Optional<Payment> findPayment(int orderId) {
        return em.createQuery("select p from Payment p where p.order.orderId=:orderId", Payment.class)
                .setParameter("orderId", orderId)
                .getResultStream()
                .findFirst();
    }

    public List<Integer> findIdsByOwner(int userId) {
        return em.createQuery("""
                select o.orderId from PurchaseOrder o
                where o.user.userId=:userId
                order by o.orderDate desc, o.orderId desc
                """, Integer.class)
                .setParameter("userId", userId)
                .getResultList();
    }

    public List<Integer> findAllIds() {
        return em.createQuery("""
                select o.orderId from PurchaseOrder o
                order by o.orderDate desc, o.orderId desc
                """, Integer.class)
                .getResultList();
    }
}
