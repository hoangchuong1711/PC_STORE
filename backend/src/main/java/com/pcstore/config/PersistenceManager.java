package com.pcstore.config;

import jakarta.persistence.EntityManagerFactory;

public final class PersistenceManager {
    private static volatile EntityManagerFactory factory;
    private PersistenceManager() {}
    public static EntityManagerFactory get() {
        if (factory == null) synchronized (PersistenceManager.class) {
            if (factory == null) factory = JpaConfig.createEntityManagerFactory();
        }
        return factory;
    }
    public static void close() { if (factory != null && factory.isOpen()) factory.close(); }
}
