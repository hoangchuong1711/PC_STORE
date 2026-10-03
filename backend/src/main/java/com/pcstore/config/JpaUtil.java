package com.pcstore.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

/** Shared JPA factory; each request creates and closes its own EntityManager. */
public final class JpaUtil {
    private static volatile EntityManagerFactory factory;

    private JpaUtil() { }

    public static EntityManagerFactory getEntityManagerFactory() {
        EntityManagerFactory current = factory;
        if (current == null || !current.isOpen()) {
            synchronized (JpaUtil.class) {
                current = factory;
                if (current == null || !current.isOpen()) {
                    factory = current = JpaConfig.createEntityManagerFactory();
                }
            }
        }
        return current;
    }

    public static EntityManager createEntityManager() {
        return getEntityManagerFactory().createEntityManager();
    }

    public static synchronized void close() {
        if (factory != null && factory.isOpen()) factory.close();
        factory = null;
    }
}
