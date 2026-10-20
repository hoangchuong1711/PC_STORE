package com.pcstore;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Objects;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DemoTransactionsSeedIT {
    @Test void createsPurchasesAndVerifiedReviewsOnce() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"));
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"));
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"));
        String schema = "demo_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection db = DriverManager.getConnection(url, user, password)) {
            try {
                run(db, "CREATE SCHEMA " + schema);
                Flyway.configure().dataSource(url, user, password).defaultSchema(schema)
                        .locations("classpath:db/migration").load().migrate();
                run(db, "SET search_path TO " + schema);
                run(db, Files.readString(Path.of("src/main/resources/db/seed/t09_catalog.sql")));
                run(db, "SELECT set_config('pcstore.demo_admin_hash', 'test-admin-hash', false)");
                run(db, "SELECT set_config('pcstore.demo_customer_hash', 'test-customer-hash', false)");
                run(db, Files.readString(Path.of("src/main/resources/db/seed/t36_demo_accounts.sql")));
                String seed = Files.readString(Path.of("src/main/resources/db/seed/demo_transactions.sql"));
                run(db, seed);
                run(db, seed);
                assertEquals(6, count(db, "orders"));
                assertEquals(9, count(db, "order_items"));
                assertEquals(6, count(db, "payments"));
                assertEquals(5, count(db, "product_reviews"));
                assertEquals(0, queryInt(db, "SELECT count(*) FROM product_reviews r JOIN order_items i ON i.order_item_id = r.order_item_id JOIN orders o ON o.order_id = i.order_id WHERE o.status <> 'DELIVERED'"));
            } finally {
                run(db, "DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    private static void run(Connection db, String sql) throws Exception {
        try (Statement statement = db.createStatement()) { statement.execute(sql); }
    }

    private static int count(Connection db, String table) throws Exception {
        return queryInt(db, "SELECT count(*) FROM " + table);
    }

    private static int queryInt(Connection db, String sql) throws Exception {
        try (Statement statement = db.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            rows.next();
            return rows.getInt(1);
        }
    }
}
