package com.pcstore.dao;

import com.pcstore.entity.PaymentAttempt;
import com.pcstore.entity.enums.PaymentAttemptStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public class PaymentAttemptDao {
    private final EntityManager em;

    public PaymentAttemptDao(EntityManager em) {
        this.em = em;
    }

    public PaymentAttempt persist(PaymentAttempt attempt) {
        em.persist(attempt);
        return attempt;
    }

    public Optional<PaymentAttempt> findByReferenceCode(String referenceCode) {
        return em.createQuery("select a from PaymentAttempt a where a.referenceCode = :code", PaymentAttempt.class)
                .setParameter("code", referenceCode)
                .getResultStream()
                .findFirst();
    }

    public Optional<PaymentAttempt> lockByReferenceCode(String referenceCode) {
        return em.createQuery("select a from PaymentAttempt a where a.referenceCode = :code", PaymentAttempt.class)
                .setParameter("code", referenceCode)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .getResultStream()
                .findFirst();
    }

    public List<PaymentAttempt> findByOrderId(int orderId) {
        return em.createQuery("select a from PaymentAttempt a where a.order.orderId = :orderId order by a.createdAt desc, a.attemptId desc", PaymentAttempt.class)
                .setParameter("orderId", orderId)
                .getResultList();
    }

    public Optional<PaymentAttempt> findLatestByOrderId(int orderId) {
        return em.createQuery("select a from PaymentAttempt a where a.order.orderId = :orderId order by a.createdAt desc, a.attemptId desc", PaymentAttempt.class)
                .setParameter("orderId", orderId)
                .setMaxResults(1)
                .getResultStream()
                .findFirst();
    }

    public long countByOrderId(int orderId) {
        return em.createQuery("select count(a) from PaymentAttempt a where a.order.orderId = :orderId", Long.class)
                .setParameter("orderId", orderId)
                .getSingleResult();
    }

    public List<PaymentAttempt> findPendingReconciliationAttempts() {
        return em.createQuery("""
                select a from PaymentAttempt a
                join fetch a.order o
                where a.status in (:statuses)
                and (a.nextRetryAt is null or a.nextRetryAt <= CURRENT_TIMESTAMP)
                and a.requiresAdminReview = false
                order by a.createdAt asc
                """, PaymentAttempt.class)
                .setParameter("statuses", List.of(PaymentAttemptStatus.INITIATED, PaymentAttemptStatus.PENDING, PaymentAttemptStatus.UNKNOWN))
                .setMaxResults(50)
                .getResultList();
    }
}
