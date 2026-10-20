package com.pcstore;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.*;

import com.pcstore.service.CartService;
import java.util.function.Function;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/** T13 behavior against PostgreSQL; only this test's random schema is changed. */
class CartServiceIT {
    private static Connection db;
    private static EntityManagerFactory factory;
    private static String schema;
    private static final ObjectMapper JSON = new ObjectMapper();

    @BeforeAll static void migrate() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL");
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        schema = "t13_" + UUID.randomUUID().toString().replace("-", "");
        db = DriverManager.getConnection(url, user, password);
        execute("CREATE SCHEMA " + schema);
        execute("SET search_path TO " + schema);
        factory = PersistenceManager.createEntityManagerFactory(
                url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema, user, password);
    }

    @BeforeEach void fixture() throws Exception {
        execute("TRUNCATE users, brands, categories, products, inventory, carts, cart_items RESTART IDENTITY CASCADE");
        execute("INSERT INTO users(full_name,email,password_hash,role) VALUES " +
                "('Customer A','a@example.test','test-hash','CUSTOMER')," +
                "('Customer B','b@example.test','test-hash','CUSTOMER')," +
                "('Admin','admin@example.test','test-hash','ADMIN')");
        execute("INSERT INTO brands(name) VALUES ('Test brand')");
        execute("INSERT INTO categories(name) VALUES ('CPU')");
        execute("INSERT INTO products(name,price,status,category_id,brand_id) VALUES " +
                "('CPU',1000000,'ACTIVE',1,1),('RAM',200000,'ACTIVE',1,1)");
        execute("INSERT INTO inventory(product_id,quantity_on_hand,reserved_quantity) VALUES (1,10,2),(2,4,0)");
    }

    @AfterAll static void cleanup() throws Exception {
        if (factory != null) factory.close();
        if (db != null) {
            if (schema != null && schema.matches("t13_[a-f0-9]{32}")) execute("DROP SCHEMA " + schema + " CASCADE");
            db.close();
        }
    }

    private JsonNode call(Function<CartService, Object> operation) {
        try (var em = factory.createEntityManager()) {
            return JSON.valueToTree(operation.apply(new CartService(em)));
        }
    }

    private void money(String expected, JsonNode actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual.decimalValue()),
                "Expected VND amount " + expected + ", got " + actual);
    }

    private JsonNode cart(int userId) { return call(service -> service.getCart(userId)); }
    private JsonNode add(int userId, Integer productId, Integer quantity) {
        return call(service -> service.addItem(userId, productId, quantity));
    }
    private JsonNode update(int userId, Integer itemId, Integer quantity) {
        return call(service -> service.updateItem(userId, itemId, quantity));
    }
    private void delete(int userId, Integer itemId) {
        call(service -> { service.deleteItem(userId, itemId); return null; });
    }
    private int itemId(JsonNode cart) { return cart.path("items").get(0).path("cartItemId").asInt(); }
    private void rejects(int status, String code, Runnable operation) {
        AppException error = assertThrows(AppException.class, operation::run);
        assertEquals(status, error.getStatus());
        assertEquals(code, error.getCode());
    }
    private static void execute(String sql) throws SQLException {
        try (Statement statement = db.createStatement()) { statement.execute(sql); }
    }
    private long scalar(String sql) throws SQLException {
        try (Statement statement = db.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            assertTrue(rows.next());
            return rows.getLong(1);
        }
    }

    @Test void emptyCartHasZeroTotalAndDoesNotCreateRows() throws Exception {
        JsonNode result = cart(1);
        assertTrue(result.path("cartId").isNull());
        assertEquals(0, result.path("items").size());
        money("0", result.path("totalAmount"));
        assertEquals(0, scalar("SELECT count(*) FROM carts"));
    }

    @Test void repeatedAddsMergeOneLineUsingDatabasePriceWithoutReservingStock() throws Exception {
        int id = itemId(add(1, 1, 2));
        JsonNode result = add(1, 1, 1);
        assertEquals(id, itemId(result));
        assertEquals(1, result.path("items").size());
        assertEquals(3, result.path("items").get(0).path("quantity").asInt());
        money("1000000", result.path("items").get(0).path("unitPrice"));
        money("3000000", result.path("totalAmount"));
        assertEquals(1, scalar("SELECT count(*) FROM cart_items"));
        assertEquals(10, scalar("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(2, scalar("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
    }

    @Test void totalsIncludeAllProductsInTheCart() {
        add(1, 1, 2);
        JsonNode result = add(1, 2, 3);
        assertEquals(2, result.path("items").size());
        money("2600000", result.path("totalAmount"));
    }

    @Test void customerCartsAreIndependent() {
        JsonNode first = add(1, 1, 2);
        JsonNode second = add(2, 2, 1);
        assertNotEquals(first.path("cartId").asInt(), second.path("cartId").asInt());
        assertEquals(1, cart(1).path("items").get(0).path("productId").asInt());
        assertEquals(2, cart(2).path("items").get(0).path("productId").asInt());
    }

    @Test void cannotUpdateOrDeleteAnotherCustomersLine() {
        int id = itemId(add(1, 1, 2));
        rejects(404, "CART_ITEM_NOT_FOUND", () -> update(2, id, 1));
        rejects(404, "CART_ITEM_NOT_FOUND", () -> update(2, id, 0));
        rejects(404, "CART_ITEM_NOT_FOUND", () -> delete(2, id));
        assertEquals(2, cart(1).path("items").get(0).path("quantity").asInt());
        assertEquals(0, cart(2).path("items").size());
    }

    @Test void updateReplacesQuantityAndDeleteRemovesLine() throws Exception {
        int id = itemId(add(1, 1, 2));
        JsonNode result = update(1, id, 1);
        assertEquals(1, result.path("items").get(0).path("quantity").asInt());
        money("1000000", result.path("totalAmount"));
        delete(1, id);
        assertEquals(0, cart(1).path("items").size());
        assertEquals(0, scalar("SELECT count(*) FROM cart_items"));
    }

    @Test void missingCartItemCannotBeUpdatedOrDeleted() {
        rejects(404, "CART_ITEM_NOT_FOUND", () -> update(1, 999, 1));
        rejects(404, "CART_ITEM_NOT_FOUND", () -> update(1, 999, 0));
        rejects(404, "CART_ITEM_NOT_FOUND", () -> delete(1, 999));
    }

    @Test void zeroQuantityRemovesLineAndRecalculatesRemainingTotal() throws Exception {
        int id = itemId(add(1, 1, 2));
        JsonNode before = add(1, 2, 3);
        JsonNode result = assertDoesNotThrow(() -> update(1, id, 0));
        assertEquals(before.path("cartId"), result.path("cartId"));
        assertEquals(1, result.path("items").size());
        assertEquals(2, result.path("items").get(0).path("productId").asInt());
        assertEquals(3, result.path("items").get(0).path("quantity").asInt());
        money("600000", result.path("totalAmount"));
        assertEquals(0, scalar("SELECT count(*) FROM cart_items WHERE product_id=1"));
        assertEquals(1, scalar("SELECT count(*) FROM cart_items"));
        assertEquals(result, cart(1));
    }

    @Test void zeroQuantityRemovesLastLineWithoutRemovingCartOrChangingStock() throws Exception {
        JsonNode before = add(1, 1, 2);
        int id = itemId(before);
        execute("UPDATE carts SET updated_at='2020-01-01 00:00'");
        JsonNode result = assertDoesNotThrow(() -> update(1, id, 0));
        assertEquals(before.path("cartId"), result.path("cartId"));
        assertEquals(0, result.path("items").size());
        money("0", result.path("totalAmount"));
        assertEquals(1, scalar("SELECT count(*) FROM carts"));
        assertEquals(0, scalar("SELECT count(*) FROM cart_items"));
        assertEquals(10, scalar("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(2, scalar("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        assertTrue(scalar("SELECT extract(year FROM updated_at) FROM carts") > 2020);
        assertEquals(result, cart(1));
    }

    @Test void zeroQuantityCanRemoveUnavailableProduct() throws Exception {
        int id = itemId(add(1, 1, 2));
        execute("UPDATE products SET status='HIDDEN' WHERE product_id=1");
        execute("UPDATE inventory SET quantity_on_hand=2 WHERE product_id=1");
        JsonNode result = assertDoesNotThrow(() -> update(1, id, 0));
        assertEquals(0, result.path("items").size());
        money("0", result.path("totalAmount"));
        assertEquals(0, scalar("SELECT count(*) FROM cart_items"));
        assertEquals(2, scalar("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(2, scalar("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
    }

    @Test void priceChangesAreReflectedWhenReadingExistingCart() throws Exception {
        add(1, 1, 2);
        execute("UPDATE products SET price=1250000 WHERE product_id=1");
        JsonNode result = cart(1);
        money("1250000", result.path("items").get(0).path("unitPrice"));
        money("2500000", result.path("totalAmount"));
    }

    @Test void invalidQuantitiesDoNotChangeCart() throws Exception {
        int id = itemId(add(1, 1, 2));
        for (Integer quantity : Arrays.asList(null, -1)) {
            rejects(400, "INVALID_QUANTITY", () -> add(1, 1, quantity));
            rejects(400, "INVALID_QUANTITY", () -> update(1, id, quantity));
        }
        rejects(400, "INVALID_QUANTITY", () -> add(1, 1, 0));
        assertEquals(2, scalar("SELECT quantity FROM cart_items"));
    }

    @Test void invalidOrMissingProductsDoNotCreateCart() throws Exception {
        for (Integer id : Arrays.asList(null, 0, -1)) {
            rejects(400, "INVALID_ID", () -> add(1, id, 1));
        }
        rejects(404, "PRODUCT_NOT_FOUND", () -> add(1, 999, 1));
        assertEquals(0, scalar("SELECT count(*) FROM carts"));
    }

    @Test void addAndUpdateRespectAvailableStockIncludingMergedQuantity() {
        int id = itemId(add(1, 1, 6));
        rejects(409, "OUT_OF_STOCK", () -> add(1, 1, 3));
        rejects(409, "OUT_OF_STOCK", () -> update(1, id, 9));
        assertEquals(6, cart(1).path("items").get(0).path("quantity").asInt());
    }

    @Test void largeMergedQuantityCannotOverflowToNegative() {
        add(1, 1, 1);
        rejects(409, "OUT_OF_STOCK", () -> add(1, 1, Integer.MAX_VALUE));
        assertEquals(1, cart(1).path("items").get(0).path("quantity").asInt());
    }

    @Test void unavailableProductCategoryBrandOrMissingInventoryCannotBeAdded() throws Exception {
        for (String state : List.of("DRAFT", "HIDDEN", "INACTIVE", "OUT_OF_STOCK", "DISCONTINUED")) {
            execute("UPDATE products SET status='" + state + "' WHERE product_id=1");
            rejects(409, "PRODUCT_NOT_AVAILABLE", () -> add(1, 1, 1));
        }
        execute("UPDATE products SET status='ACTIVE' WHERE product_id=1");
        execute("UPDATE categories SET status='INACTIVE'");
        rejects(409, "PRODUCT_NOT_AVAILABLE", () -> add(1, 1, 1));
        execute("UPDATE categories SET status='ACTIVE'");
        execute("UPDATE brands SET status='INACTIVE'");
        rejects(409, "PRODUCT_NOT_AVAILABLE", () -> add(1, 1, 1));
        execute("UPDATE brands SET status='ACTIVE'");
        execute("DELETE FROM inventory WHERE product_id=1");
        rejects(409, "PRODUCT_NOT_AVAILABLE", () -> add(1, 1, 1));
        assertEquals(0, scalar("SELECT count(*) FROM carts"));
    }

    @Test void existingUnavailableLineIsVisibleAndCanStillBeDeleted() throws Exception {
        int id = itemId(add(1, 1, 3));
        execute("UPDATE inventory SET quantity_on_hand=4 WHERE product_id=1");
        JsonNode result = cart(1);
        assertEquals(2, result.path("items").get(0).path("availableQuantity").asInt());
        assertFalse(result.path("items").get(0).path("available").asBoolean());
        rejects(409, "OUT_OF_STOCK", () -> update(1, id, 3));
        execute("UPDATE products SET status='HIDDEN' WHERE product_id=1");
        rejects(409, "PRODUCT_NOT_AVAILABLE", () -> update(1, id, 1));
        assertEquals(1, cart(1).path("items").size());
        delete(1, id);
        assertEquals(0, cart(1).path("items").size());
    }

    @Test void invalidInactiveOrAdminUsersCannotUseCartService() throws Exception {
        int id = itemId(add(1, 1, 1));
        rejects(401, "UNAUTHORIZED", () -> cart(999));
        rejects(403, "FORBIDDEN", () -> cart(3));
        rejects(403, "FORBIDDEN", () -> update(3, id, 0));
        execute("UPDATE users SET status='INACTIVE' WHERE user_id=1");
        rejects(401, "UNAUTHORIZED", () -> add(1, 1, 1));
        rejects(401, "UNAUTHORIZED", () -> update(1, id, 0));
        assertEquals(1, scalar("SELECT count(*) FROM cart_items"));
        assertEquals(1, scalar("SELECT quantity FROM cart_items"));
    }

    @Test void cartTimestampChangesOnlyOnSuccessfulWrites() throws Exception {
        int id = itemId(add(1, 1, 1));
        execute("UPDATE carts SET updated_at='2020-01-01 00:00'");
        cart(1);
        assertEquals(2020, scalar("SELECT extract(year FROM updated_at) FROM carts"));
        rejects(409, "OUT_OF_STOCK", () -> update(1, id, 9));
        assertEquals(2020, scalar("SELECT extract(year FROM updated_at) FROM carts"));
        update(1, id, 2);
        assertTrue(scalar("SELECT extract(year FROM updated_at) FROM carts") > 2020);
    }

    @Test void concurrentFirstAddsCreateOneCartAndMergeOneLine() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CyclicBarrier start = new CyclicBarrier(2);
        try {
            Callable<JsonNode> request = () -> { start.await(10, TimeUnit.SECONDS); return add(1, 1, 1); };
            Future<JsonNode> first = executor.submit(request);
            Future<JsonNode> second = executor.submit(request);
            first.get(20, TimeUnit.SECONDS);
            second.get(20, TimeUnit.SECONDS);
            assertEquals(1, scalar("SELECT count(*) FROM carts"));
            assertEquals(1, scalar("SELECT count(*) FROM cart_items"));
            assertEquals(2, cart(1).path("items").get(0).path("quantity").asInt());
        } finally { executor.shutdownNow(); }
    }

    @Test void concurrentMergedAddsDoNotExceedStockOrLoseUpdates() throws Exception {
        add(1, 1, 7);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CyclicBarrier start = new CyclicBarrier(2);
        try {
            Callable<Integer> request = () -> {
                start.await(10, TimeUnit.SECONDS);
                try { add(1, 1, 1); return 200; }
                catch (AppException error) { return error.getStatus(); }
            };
            Future<Integer> first = executor.submit(request);
            Future<Integer> second = executor.submit(request);
            List<Integer> statuses = new ArrayList<>(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS)));
            Collections.sort(statuses);
            assertEquals(List.of(200, 409), statuses);
            assertEquals(8, cart(1).path("items").get(0).path("quantity").asInt());
        } finally { executor.shutdownNow(); }
    }
}
