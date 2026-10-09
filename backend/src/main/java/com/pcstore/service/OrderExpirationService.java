package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dao.OrderDao;
import com.pcstore.entity.Order;
import com.pcstore.entity.Payment;
import com.pcstore.entity.enums.OrderStatus;
import com.pcstore.entity.enums.PaymentMethod;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

public class OrderExpirationService {
    private final EntityManagerFactory entityManagerFactory;
    private final Clock clock;

    public OrderExpirationService() {
        this(PersistenceManager.get(), Clock.systemDefaultZone());
    }

    public OrderExpirationService(EntityManagerFactory entityManagerFactory) {
        this(entityManagerFactory, Clock.systemDefaultZone());
    }

    public OrderExpirationService(EntityManagerFactory entityManagerFactory, Clock clock) {
        this.entityManagerFactory = entityManagerFactory;
        this.clock = clock;
    }

    /**
     * Scans for PENDING orders with VNPay payment where paymentExpiresAt <= now.
     * Transitions them to EXPIRED_PENDING_RECONCILIATION.
     * INVARIANT: Stock reservation (reserved_quantity) remains held!
     * Returns the count of orders expired in this run.
     */
    public int expirePendingOrders() {
        LocalDateTime now = LocalDateTime.now(clock);
        try (EntityManager em = entityManagerFactory.createEntityManager()) {
            var tx = em.getTransaction();
            try {
                tx.begin();
                OrderDao orderDao = new OrderDao(em);

                List<Order> candidates = em.createQuery("""
                        select o from PurchaseOrder o
                        where o.status = :status
                        and o.paymentExpiresAt is not null
                        and o.paymentExpiresAt <= :now
                        """, Order.class)
                        .setParameter("status", OrderStatus.PENDING)
                        .setParameter("now", now)
                        .getResultList();

                int expiredCount = 0;
                for (Order order : candidates) {
                    Payment payment = orderDao.findPayment(order.getOrderId()).orElse(null);
                    if (payment != null && payment.getMethod() == PaymentMethod.VNPAY) {
                        order.setStatus(OrderStatus.EXPIRED_PENDING_RECONCILIATION);
                        expiredCount++;
                    }
                }

                em.flush();
                tx.commit();
                return expiredCount;
            } catch (Exception ex) {
                if (tx.isActive()) tx.rollback();
                throw ex;
            }
        }
    }
}
