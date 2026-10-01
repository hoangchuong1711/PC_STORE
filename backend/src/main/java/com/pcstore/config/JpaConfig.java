package com.pcstore.config;

import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Persistence;

import java.util.HashMap;
import java.util.Map;

/** Creates the persistence unit using credentials supplied by the runtime environment. */
public final class JpaConfig {
    private static final String PERSISTENCE_UNIT = "pcstore-persistence-unit";

    private JpaConfig() {
    }

    public static EntityManagerFactory createEntityManagerFactory() {
        Map<String, Object> properties = new HashMap<>();
        properties.put("jakarta.persistence.jdbc.url", required("DB_URL"));
        properties.put("jakarta.persistence.jdbc.user", required("DB_USER"));
        properties.put("jakarta.persistence.jdbc.password", required("DB_PASSWORD"));
        properties.put("hibernate.hbm2ddl.auto", "validate");
        properties.put("hibernate.show_sql", "false");
        return Persistence.createEntityManagerFactory(PERSISTENCE_UNIT, properties);
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Required environment variable is missing: " + name);
        }
        return value;
    }
}
