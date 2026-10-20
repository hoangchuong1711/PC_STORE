package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.BuildDto;
import com.pcstore.dto.CheckoutRequest;
import com.pcstore.dto.CompatibilityDto.Selection;
import com.pcstore.entity.enums.PaymentMethod;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;

import java.math.BigDecimal;
import java.sql.*;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class BuildServiceIT {
    private static Connection db;
    private static EntityManagerFactory factory;
    private static String schema;
    private static List<Selection> validParts;

    @BeforeAll static void setup() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"));
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"));
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"));
        schema = "t24_" + UUID.randomUUID().toString().replace("-", "");
        db = DriverManager.getConnection(url, user, password);
        execute("CREATE SCHEMA " + schema);
        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        Flyway.configure().dataSource(schemaUrl, user, password).locations("classpath:db/migration").load().migrate();
        execute("SET search_path TO " + schema);
        execute("INSERT INTO users(full_name,email,password_hash,role) VALUES " +
                "('Customer A','a@build.test','hash','CUSTOMER'),('Customer B','b@build.test','hash','CUSTOMER')");
        execute(java.nio.file.Files.readString(java.nio.file.Path.of("src/main/resources/db/seed/t09_catalog.sql")));
        execute(java.nio.file.Files.readString(java.nio.file.Path.of("src/main/resources/db/seed/t22_builder_specs.sql")));
        factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password);
        validParts = List.of(
                part("AMD Ryzen 5 5600"), part("MSI B550M PRO-VDH"),
                part("Corsair VENGEANCE LPX CMK16GX4M1E3200C16"),
                part("MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 8G OC"),
                part("Samsung 970 EVO Plus 250GB"), part("MSI MAG A650BN"),
                part("Corsair 3000D AIRFLOW Black"), part("DeepCool AG400 ARGB"));
    }

    @AfterEach void clearRows() throws Exception {
        execute("TRUNCATE pc_build_items, pc_builds, cart_items, carts RESTART IDENTITY CASCADE");
    }

    @AfterAll static void cleanup() throws Exception {
        if (factory != null) factory.close();
        if (db != null) {
            if (schema != null && schema.matches("t24_[a-f0-9]{32}")) execute("DROP SCHEMA " + schema + " CASCADE");
            db.close();
        }
    }

    @Test void savesIncompleteBuildAndRepricesFromCatalog() throws Exception {
        BuildDto.Response created = call(s -> s.create(1, new BuildDto.Request("  My PC  ", List.of(validParts.getFirst()))));
        assertEquals("My PC", created.name());
        assertEquals("UNKNOWN", created.compatibility().status().name());
        int id = created.buildId();
        assertEquals(1, call(s -> s.list(1)).size());
        BigDecimal price = created.items().getFirst().unitPrice();
        execute("UPDATE products SET price=price+12345 WHERE product_id=" + validParts.getFirst().productId());
        BuildDto.Response viewed = call(s -> s.get(1, id));
        assertEquals(0, price.add(BigDecimal.valueOf(12345)).compareTo(viewed.totalAmount()));
        assertEquals(0, viewed.items().getFirst().unitPrice().compareTo(viewed.totalAmount()));
    }

    @Test void ownershipAppliesToReadEditDeleteAndCart() throws Exception {
        int id = call(s -> s.create(1, new BuildDto.Request("A", validParts))).buildId();
        rejects(404, "BUILD_NOT_FOUND", () -> call(s -> s.get(2, id)));
        rejects(404, "BUILD_NOT_FOUND", () -> call(s -> s.update(2, id, new BuildDto.Request("B", validParts))));
        rejects(404, "BUILD_NOT_FOUND", () -> call(s -> s.addToCart(2, id)));
        rejects(404, "BUILD_NOT_FOUND", () -> call(s -> { s.delete(2, id); return null; }));
        assertEquals(0, call(s -> s.list(2)).size());
        assertEquals("A", call(s -> s.get(1, id)).name());
    }

    @Test void updateReplacesItemsAndDeleteRemovesBuild() throws Exception {
        int id = call(s -> s.create(1, new BuildDto.Request("A", validParts))).buildId();
        BuildDto.Response updated = call(s -> s.update(1, id, new BuildDto.Request("B", List.of(validParts.getFirst()))));
        assertEquals("B", updated.name());
        assertEquals(1, updated.items().size());
        assertEquals(1, scalar("SELECT count(*) FROM pc_build_items WHERE build_id=" + id));
        call(s -> { s.delete(1, id); return null; });
        rejects(404, "BUILD_NOT_FOUND", () -> call(s -> s.get(1, id)));
    }

    @Test void passBuildAddsExactItemsWithCurrentPrices() throws Exception {
        execute("UPDATE inventory SET quantity_on_hand=10, reserved_quantity=0");
        int id = call(s -> s.create(1, new BuildDto.Request("A", validParts))).buildId();
        execute("UPDATE products SET price=1234567 WHERE product_id=" + validParts.getFirst().productId());
        var cart = call(s -> s.addToCart(1, id));
        assertEquals(8, cart.items().size());
        for (Selection selection : validParts) {
            assertTrue(cart.items().stream().anyMatch(i -> i.productId() == selection.productId() && i.quantity() == 1));
        }
        assertEquals(0, BigDecimal.valueOf(1234567).compareTo(cart.items().stream()
                .filter(i -> i.productId() == validParts.getFirst().productId()).findFirst().orElseThrow().unitPrice()));
        BigDecimal total = cart.items().stream().map(i -> i.unitPrice().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, total.compareTo(cart.totalAmount()));
        assertEquals(8, scalar("SELECT count(*) FROM cart_items"));
    }

    @Test void incompleteOrOutOfStockBuildCannotPartiallyChangeCart() throws Exception {
        int incomplete = call(s -> s.create(1, new BuildDto.Request("Incomplete", List.of(validParts.getFirst())))).buildId();
        rejects(409, "BUILD_NOT_READY", () -> call(s -> s.addToCart(1, incomplete)));
        assertEquals(0, scalar("SELECT count(*) FROM cart_items"));
        int complete = call(s -> s.create(1, new BuildDto.Request("Complete", validParts))).buildId();
        execute("UPDATE inventory SET quantity_on_hand=10, reserved_quantity=0");
        execute("UPDATE inventory SET quantity_on_hand=0 WHERE product_id=" + validParts.getLast().productId());
        rejects(409, "OUT_OF_STOCK", () -> call(s -> s.addToCart(1, complete)));
        assertEquals(0, scalar("SELECT count(*) FROM cart_items"));
    }

    @Test void rejectsInvalidSelectionsWithoutPersisting() throws Exception {
        rejects(400, "INVALID_BUILD", () -> call(s -> s.create(1, new BuildDto.Request(" ", validParts))));
        rejects(400, "INVALID_BUILD", () -> call(s -> s.create(1,
                new BuildDto.Request("Duplicate", List.of(validParts.getFirst(), validParts.getFirst())))));
        assertEquals(0, scalar("SELECT count(*) FROM pc_builds"));
    }

    @Test void completeBuilderCartChecksOutToAnOrder() throws Exception {
        execute("UPDATE inventory SET quantity_on_hand=10, reserved_quantity=0");
        int buildId = call(s -> s.create(1, new BuildDto.Request("PC mua mới", validParts))).buildId();
        var cart = call(s -> s.addToCart(1, buildId));
        var outcome = new OrderService(factory).checkout(1, "builder-checkout-001",
                new CheckoutRequest("Nguyen Van A", "0901234567", "123 Test Street", PaymentMethod.COD));
        assertFalse(outcome.replayed());
        assertEquals(8, outcome.order().items().size());
        assertEquals(0, cart.totalAmount().compareTo(outcome.order().totalAmount()));
        for (Selection selection : validParts) {
            assertTrue(outcome.order().items().stream().anyMatch(item -> item.productId() == selection.productId()));
        }
        assertEquals(0, scalar("SELECT count(*) FROM cart_items"));
    }

    @Test void publicBuilderCatalogUsesRealProductsAndSpecs() throws Exception {
        execute("UPDATE inventory SET quantity_on_hand=10, reserved_quantity=0");
        try (var em = factory.createEntityManager()) {
            var catalog = new BuilderCatalogService(em);
            var rows = catalog.products();
            assertEquals(40, rows.size());
            assertEquals(8, rows.stream().map(row -> row.componentType()).distinct().count());
            var cpu = rows.stream().filter(row -> row.productId() == validParts.getFirst().productId())
                    .findFirst().orElseThrow();
            assertEquals("AM4", cpu.spec().get("socketCode"));
            assertTrue(cpu.availableQuantity() > 0);
            assertEquals("PASS", catalog.preview(validParts).status().name());
            assertEquals("UNKNOWN", catalog.preview(List.of(validParts.getFirst())).status().name());
        }
    }

    @Test void previewDoesNotExposeHiddenProducts() throws Exception {
        execute("UPDATE inventory SET quantity_on_hand=10, reserved_quantity=0");
        int id = validParts.getFirst().productId();
        execute("UPDATE products SET status='HIDDEN' WHERE product_id=" + id);
        try (var em = factory.createEntityManager()) {
            var catalog = new BuilderCatalogService(em);
            assertTrue(catalog.products().stream().noneMatch(row -> row.productId() == id));
            rejects(404, "RESOURCE_NOT_FOUND", () -> catalog.preview(List.of(validParts.getFirst())));
        } finally {
            execute("UPDATE products SET status='ACTIVE' WHERE product_id=" + id);
        }
    }

    @Test void missingSpecRemainsUnknownInPublicBuilder() throws Exception {
        int id = validParts.getFirst().productId();
        execute("UPDATE inventory SET quantity_on_hand=10, reserved_quantity=0");
        try (var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            try {
                em.createNativeQuery("DELETE FROM cpu_specs WHERE product_id=:id")
                        .setParameter("id", id).executeUpdate();
                var catalog = new BuilderCatalogService(em);
                var cpu = catalog.products().stream().filter(row -> row.productId() == id).findFirst().orElseThrow();
                assertNull(cpu.spec());
                assertEquals("UNKNOWN", catalog.preview(validParts).status().name());
            } finally {
                em.getTransaction().rollback();
            }
        }
    }

    private static Selection part(String name) throws Exception {
        try (Statement statement = db.createStatement(); ResultSet rows = statement.executeQuery(
                "SELECT product_id FROM products WHERE name='" + name.replace("'", "''") + "'")) {
            assertTrue(rows.next(), name);
            return new Selection(rows.getInt(1), 1);
        }
    }

    private static void execute(String sql) throws Exception {
        try (Statement statement = db.createStatement()) { statement.execute(sql); }
    }

    private static long scalar(String sql) throws Exception {
        try (Statement statement = db.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            assertTrue(rows.next()); return rows.getLong(1);
        }
    }

    private static <T> T call(java.util.function.Function<BuildService, T> operation) {
        try (var em = factory.createEntityManager()) { return operation.apply(new BuildService(em)); }
    }

    private static void rejects(int status, String code, Runnable operation) {
        AppException error = assertThrows(AppException.class, operation::run);
        assertEquals(status, error.getStatus());
        assertEquals(code, error.getCode());
    }
}
