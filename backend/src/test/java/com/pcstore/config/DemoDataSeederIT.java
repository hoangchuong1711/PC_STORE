package com.pcstore.config;

import com.pcstore.dao.BrandDao;
import com.pcstore.dao.CategoryDao;
import com.pcstore.dto.ProductSearchQuery;
import com.pcstore.service.ProductCatalogService;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Objects;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DemoDataSeederIT {
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

                DemoDataSeeder.seed(schemaUrl, user, password);
                DemoDataSeeder.seed(schemaUrl, user, password);

                try (var connection = DriverManager.getConnection(schemaUrl, user, password)) {
                    assertEquals(2, count(connection, "SELECT count(*) FROM brands WHERE name LIKE 'T05-DEMO %'"));
                    assertEquals(2, count(connection, "SELECT count(*) FROM categories WHERE name LIKE 'T05-DEMO %'"));
                    assertEquals(3, count(connection, "SELECT count(*) FROM products WHERE name LIKE 'T05-DEMO %'"));
                    assertEquals(2, count(connection, "SELECT count(*) FROM products p JOIN categories c ON c.category_id=p.category_id JOIN brands b ON b.brand_id=p.brand_id JOIN inventory i ON i.product_id=p.product_id WHERE p.name LIKE 'T05-DEMO %' AND p.status='ACTIVE' AND c.status='ACTIVE' AND b.status='ACTIVE' AND i.quantity_on_hand-i.reserved_quantity>0"));

                    try (var statement = connection.createStatement()) {
                        statement.executeUpdate("UPDATE inventory SET quantity_on_hand=7 WHERE product_id=(SELECT product_id FROM products WHERE name='T05-DEMO Ryzen 5 7600')");
                    }
                }

                try (var factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password);
                     var entityManager = factory.createEntityManager()) {
                    assertEquals(2, new BrandDao(entityManager).findActive().size());
                    assertEquals(2, new CategoryDao(entityManager).findActive().size());
                    var catalog = new ProductCatalogService(entityManager);
                    var page = catalog.search(new ProductSearchQuery(null, null, null, null, null, 0, 20));
                    assertEquals(2, page.totalItems());
                    assertEquals(2, page.items().size());
                    assertEquals(page.items().getFirst().productId(), catalog.find(page.items().getFirst().productId()).productId());
                }

                DemoDataSeeder.seed(schemaUrl, user, password);
                try (var connection = DriverManager.getConnection(schemaUrl, user, password)) {
                    assertEquals(7, count(connection, "SELECT quantity_on_hand FROM inventory i JOIN products p ON p.product_id=i.product_id WHERE p.name='T05-DEMO Ryzen 5 7600'"));
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
