package com.pcstore.config;

import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Persistence;
import org.flywaydb.core.Flyway;

import java.util.HashMap;
import java.util.Map;

/** Áp dụng migration trước khi kiểm tra mapping JPA trên PostgreSQL. */
public final class JpaConfig {
    private static final String PERSISTENCE_UNIT = "pcstore-persistence-unit";

    private JpaConfig() {
    }

    public static EntityManagerFactory createEntityManagerFactory() {
        return createEntityManagerFactory(required("DB_URL"), required("DB_USER"), required("DB_PASSWORD"));
    }

    /** Cho phép test dùng DB riêng nhưng vẫn đi qua cùng luồng khởi tạo của ứng dụng. */
    public static EntityManagerFactory createEntityManagerFactory(String url, String user, String password) {
        Flyway.configure()
                .dataSource(url, user, password)
                .locations("classpath:db/migration")
                .cleanDisabled(true)
                .load()
                .migrate();

        Map<String, Object> properties = new HashMap<>();
        properties.put("jakarta.persistence.jdbc.url", url);
        properties.put("jakarta.persistence.jdbc.user", user);
        properties.put("jakarta.persistence.jdbc.password", password);
        properties.put("hibernate.hbm2ddl.auto", "validate");
        properties.put("hibernate.show_sql", "false");
        return Persistence.createEntityManagerFactory(PERSISTENCE_UNIT, properties);
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Thiếu biến môi trường bắt buộc: " + name);
        }
        return value;
    }
}
