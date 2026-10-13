package com.pcstore.config;

import com.pcstore.dao.BrandDao;
import com.pcstore.dao.CategoryDao;
import com.pcstore.dto.ProductSearchQuery;
import com.pcstore.service.ProductCatalogService;
import com.pcstore.util.PasswordUtil;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Objects;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DemoDataSeederIT {
    @Test
    void preservesEarlierAccountsAndAddsDemoAccounts() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL to a disposable PostgreSQL database");
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        String schema = "t36_rename_" + UUID.randomUUID().toString().replace("-", "");
        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;

        try (var admin = DriverManager.getConnection(url, user, password)) {
            try (var statement = admin.createStatement()) {
                statement.execute("CREATE SCHEMA " + schema);
            }
            try {
                Flyway.configure().dataSource(schemaUrl, user, password)
                        .locations("classpath:db/migration").load().migrate();
                try (var connection = DriverManager.getConnection(schemaUrl, user, password);
                     var statement = connection.createStatement()) {
                    statement.executeUpdate("INSERT INTO users (full_name,email,password_hash,role) VALUES "
                            + "('Old Admin','admin.demo@pcstore.test','old-hash','ADMIN'),"
                            + "('Old Customer','customer.demo@pcstore.test','old-hash','CUSTOMER')");
                }
                DemoDataSeeder.seed(schemaUrl, user, password, true, "admin123", "user123");
                try (var connection = DriverManager.getConnection(schemaUrl, user, password)) {
                    assertEquals(8, count(connection, "SELECT count(*) FROM users"));
                    try (var statement = connection.createStatement();
                         var rows = statement.executeQuery("SELECT user_id, email, password_hash FROM users ORDER BY user_id")) {
                        assertTrue(rows.next());
                        assertEquals(1, rows.getInt("user_id"));
                        assertEquals("admin.demo@pcstore.test", rows.getString("email"));
                        assertEquals("old-hash", rows.getString("password_hash"));
                        assertTrue(rows.next());
                        assertEquals(2, rows.getInt("user_id"));
                        assertEquals("customer.demo@pcstore.test", rows.getString("email"));
                        assertEquals("old-hash", rows.getString("password_hash"));
                    }
                }
            } finally {
                try (var statement = admin.createStatement()) {
                    statement.execute("DROP SCHEMA " + schema + " CASCADE");
                }
            }
        }
    }

    @Test
    void seedsSimpleLocalLoginAccountsWithoutResettingExistingPasswords() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL to a disposable PostgreSQL database");
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        String schema = "t36_seed_" + UUID.randomUUID().toString().replace("-", "");
        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;

        try (var admin = DriverManager.getConnection(url, user, password)) {
            try (var statement = admin.createStatement()) {
                statement.execute("CREATE SCHEMA " + schema);
            }
            try {
                Flyway.configure().dataSource(schemaUrl, user, password)
                        .locations("classpath:db/migration").load().migrate();

                DemoDataSeeder.seed(schemaUrl, user, password, true, "admin123", "user123");
                try (var connection = DriverManager.getConnection(schemaUrl, user, password);
                     var statement = connection.createStatement();
                     var rows = statement.executeQuery("SELECT email, password_hash, role, status FROM users WHERE email IN ('admin@gmail.com','user@gmail.com') ORDER BY email")) {
                    assertTrue(rows.next());
                    assertEquals("admin@gmail.com", rows.getString("email"));
                    assertTrue(PasswordUtil.verify("admin123", rows.getString("password_hash")));
                    assertEquals("ADMIN", rows.getString("role"));
                    assertEquals("ACTIVE", rows.getString("status"));
                    assertTrue(rows.next());
                    assertEquals("user@gmail.com", rows.getString("email"));
                    assertTrue(PasswordUtil.verify("user123", rows.getString("password_hash")));
                    assertEquals("CUSTOMER", rows.getString("role"));
                    assertEquals("ACTIVE", rows.getString("status"));
                    assertFalse(rows.next());
                }

                try (var connection = DriverManager.getConnection(schemaUrl, user, password);
                     var statement = connection.createStatement()) {
                    statement.executeUpdate("UPDATE users SET password_hash='manual-change' WHERE email='admin@gmail.com'");
                }
                DemoDataSeeder.seed(schemaUrl, user, password, true, "admin123", "user123");
                try (var connection = DriverManager.getConnection(schemaUrl, user, password)) {
                    assertEquals(6, count(connection, "SELECT count(*) FROM users"));
                    try (var statement = connection.createStatement();
                         var row = statement.executeQuery("SELECT password_hash FROM users WHERE email='admin@gmail.com'")) {
                        assertTrue(row.next());
                        assertEquals("manual-change", row.getString(1));
                    }
                }
                try (var connection = DriverManager.getConnection(schemaUrl, user, password);
                     var statement = connection.createStatement()) {
                    statement.executeUpdate("UPDATE users SET role='CUSTOMER' WHERE email='admin@gmail.com'");
                }
                assertThrows(IllegalStateException.class,
                        () -> DemoDataSeeder.seed(schemaUrl, user, password, true, "admin123", "user123"));
            } finally {
                try (var statement = admin.createStatement()) {
                    statement.execute("DROP SCHEMA " + schema + " CASCADE");
                }
            }
        }
    }

    @Test
    void seedsPublicCatalogWithoutDuplicatingRowsOrResettingStock() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL to a disposable PostgreSQL database");
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        String schema = "t05_seed_" + UUID.randomUUID().toString().replace("-", "");
        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;

        try (var admin = DriverManager.getConnection(url, user, password)) {
            try (var statement = admin.createStatement()) {
                statement.execute("CREATE SCHEMA " + schema);
            }
            try {
                Flyway.configure().dataSource(schemaUrl, user, password)
                        .locations("classpath:db/migration").load().migrate();

                DemoDataSeeder.seed(schemaUrl, user, password, false, null, null);
                DemoDataSeeder.seed(schemaUrl, user, password, false, null, null);

                try (var connection = DriverManager.getConnection(schemaUrl, user, password)) {
                    assertEquals(0, count(connection, "SELECT count(*) FROM brands WHERE name LIKE 'T05-DEMO %'"));
                    assertEquals(0, count(connection, "SELECT count(*) FROM categories WHERE name LIKE 'T05-DEMO %'"));
                    assertEquals(0, count(connection, "SELECT count(*) FROM products WHERE name LIKE 'T05-DEMO %'"));
                    assertEquals(0, count(connection, "SELECT count(*) FROM users"));
                    assertEquals(8, count(connection, "SELECT count(*) FROM products p JOIN inventory i ON i.product_id=p.product_id WHERE p.name IN ('PC Creator Pro X','ROG Strix G16 2025','TUF Gaming A15','Kingston Fury 32GB DDR5-6000','Samsung 990 Pro NVMe 2TB','Ultrawide Monitor 34','Keychron Q1 Pro Custom QMK','RTX 4070 Super Dual 12GB') AND p.status='ACTIVE' AND i.quantity_on_hand-i.reserved_quantity>0"));
                    assertEquals(8, count(connection, "SELECT count(*) FROM products p JOIN product_images image ON image.product_id=p.product_id WHERE p.name IN ('PC Creator Pro X','ROG Strix G16 2025','TUF Gaming A15','Kingston Fury 32GB DDR5-6000','Samsung 990 Pro NVMe 2TB','Ultrawide Monitor 34','Keychron Q1 Pro Custom QMK','RTX 4070 Super Dual 12GB') AND image.is_primary=true AND image.sort_order=0 AND image.image_url LIKE 'https://encrypted-tbn0.gstatic.com/images?%'"));
                    assertEquals(3, count(connection, "SELECT quantity_on_hand FROM inventory i JOIN products p ON p.product_id=i.product_id WHERE p.name='PC Creator Pro X'"));

                    try (var statement = connection.createStatement()) {
                        statement.executeUpdate("UPDATE inventory SET quantity_on_hand=7 WHERE product_id=(SELECT product_id FROM products WHERE name='PC Creator Pro X')");
                        statement.executeUpdate("UPDATE product_images SET image_url='https://admin.example.test/custom-pc.jpg' WHERE product_id=(SELECT product_id FROM products WHERE name='PC Creator Pro X')");
                        statement.executeUpdate("UPDATE product_images SET image_url='/products/community/rog-strix-g16-2025.jpg' WHERE product_id=(SELECT product_id FROM products WHERE name='ROG Strix G16 2025')");
                        statement.executeUpdate("UPDATE product_images SET image_url='/admin/products/laptop.svg' WHERE product_id=(SELECT product_id FROM products WHERE name='TUF Gaming A15')");
                    }
                }

                try (var factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password);
                     var entityManager = factory.createEntityManager()) {
                    assertTrue(new BrandDao(entityManager).findActive().size() >= 5);
                    assertTrue(new CategoryDao(entityManager).findActive().size() >= 4);
                    var catalog = new ProductCatalogService(entityManager);
                    var page = catalog.search(new ProductSearchQuery(null, null, null, null, null, 0, 20));
                    assertTrue(page.totalItems() >= 8);
                    assertFalse(page.items().isEmpty());
                    assertEquals(page.items().getFirst().productId(), catalog.find(page.items().getFirst().productId()).productId());
                }

                DemoDataSeeder.seed(schemaUrl, user, password, false, null, null);
                try (var connection = DriverManager.getConnection(schemaUrl, user, password)) {
                    assertEquals(7, count(connection, "SELECT quantity_on_hand FROM inventory i JOIN products p ON p.product_id=i.product_id WHERE p.name='PC Creator Pro X'"));
                    assertEquals(1, count(connection, "SELECT count(*) FROM product_images image JOIN products p ON p.product_id=image.product_id WHERE p.name='PC Creator Pro X' AND image.image_url='https://admin.example.test/custom-pc.jpg'"));
                    assertEquals(1, count(connection, "SELECT count(*) FROM product_images image JOIN products p ON p.product_id=image.product_id WHERE p.name='ROG Strix G16 2025' AND image.image_url LIKE 'https://encrypted-tbn0.gstatic.com/images?%'"));
                    assertEquals(1, count(connection, "SELECT count(*) FROM product_images image JOIN products p ON p.product_id=image.product_id WHERE p.name='TUF Gaming A15' AND image.image_url LIKE 'https://encrypted-tbn0.gstatic.com/images?%'"));
                }
            } finally {
                try (var statement = admin.createStatement()) {
                    statement.execute("DROP SCHEMA " + schema + " CASCADE");
                }
            }
        }
    }

    private long count(java.sql.Connection connection, String sql) throws SQLException {
        try (var statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getLong(1);
        }
    }
}
