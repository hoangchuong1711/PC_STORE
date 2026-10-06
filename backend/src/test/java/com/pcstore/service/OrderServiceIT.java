package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.pcstore.dto.CheckoutRequest;
import com.pcstore.entity.enums.OrderStatus;
import com.pcstore.entity.enums.PaymentMethod;
import com.pcstore.exception.AppException;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Timeout(60)
class OrderServiceIT {
    private Connection adminConnection;
    private Connection schemaConnection;
    private EntityManagerFactory factory;
    private OrderService service;
    private String schema;

    @BeforeEach
    void setup() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL to a disposable PostgreSQL database");
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        schema = "t14_" + UUID.randomUUID().toString().replace("-", "");
        adminConnection = DriverManager.getConnection(url, user, password);
        execute(adminConnection, "CREATE SCHEMA " + schema);
        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password);
        schemaConnection = DriverManager.getConnection(schemaUrl, user, password);
        service = new OrderService(factory);
    }

    @AfterEach
    void cleanup() throws Exception {
        if (schemaConnection != null) schemaConnection.close();
        if (factory != null) factory.close();
        if (adminConnection != null) {
            if (schema != null) execute(adminConnection, "DROP SCHEMA " + schema + " CASCADE");
            adminConnection.close();
        }
    }

    @Test
    void checkoutSnapshotsPriceAndAddressAndReplaysSameKey() throws Exception {
        salesFixture(2, false);
        CheckoutRequest request = request("221B Baker Street");

        var created = service.checkout(1, "checkout-snapshot-001", request);
        assertFalse(created.replayed());
        assertEquals(new BigDecimal("1000000"), created.order().totalAmount());
        assertEquals("221B Baker Street", created.order().shippingAddressText());
        assertEquals("PENDING", created.order().status());
        assertEquals("COD", created.order().payment().method());
        assertEquals("PENDING", created.order().payment().status());
        assertEquals(1, scalarInt("SELECT count(*) FROM orders"));
        assertEquals(1, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        assertEquals(2, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(0, scalarInt("SELECT count(*) FROM cart_items WHERE cart_id=1"));

        execute(schemaConnection, "UPDATE products SET price=2000000 WHERE product_id=1");
        var replay = service.checkout(1, "checkout-snapshot-001", request);
        assertTrue(replay.replayed());
        assertEquals(created.order().orderId(), replay.order().orderId());
        assertEquals(new BigDecimal("1000000"), replay.order().items().getFirst().unitPrice());
        assertEquals(1, scalarInt("SELECT count(*) FROM orders"));
        assertEquals(1, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));

        AppException reused = assertThrows(AppException.class,
                () -> service.checkout(1, "checkout-snapshot-001", request("Different address")));
        assertEquals(409, reused.getStatus());
        assertEquals("IDEMPOTENCY_KEY_REUSED", reused.getCode());

        AppException hidden = assertThrows(AppException.class,
                () -> service.findOwnedOrder(2, created.order().orderId()));
        assertEquals(404, hidden.getStatus());
    }

    @Test
    void cancellationReleasesReservationOnlyOnceAndNeverQualifiesAsDelivered() throws Exception {
        salesFixture(2, false);
        int orderId = service.checkout(1, "checkout-cancel-001", request("Cancel address")).order().orderId();

        var cancelled = service.cancelOwnedOrder(1, orderId);
        assertEquals("CANCELLED", cancelled.status());
        assertNull(cancelled.deliveredAt());
        assertEquals(0, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        assertEquals(2, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));

        var repeated = service.cancelOwnedOrder(1, orderId);
        assertEquals("CANCELLED", repeated.status());
        assertEquals(0, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        assertEquals(0, scalarInt("SELECT count(*) FROM orders WHERE order_id=" + orderId + " AND status='DELIVERED'"));
    }

    @Test
    void adminLifecycleConsumesReservedStockAndWritesDeliveredAtOnce() throws Exception {
        salesFixture(3, false);
        int orderId = service.checkout(1, "checkout-delivery-001", request("Delivery address")).order().orderId();

        assertEquals("CONFIRMED", service.updateStatusForAdmin(orderId, OrderStatus.CONFIRMED).status());
        var shipping = service.updateStatusForAdmin(orderId, OrderStatus.SHIPPING);
        assertEquals("SHIPPING", shipping.status());
        assertEquals(2, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(0, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));

        var delivered = service.updateStatusForAdmin(orderId, OrderStatus.DELIVERED);
        LocalDateTime deliveredAt = delivered.deliveredAt();
        LocalDateTime paidAt = delivered.payment().paidAt();
        assertNotNull(deliveredAt);
        assertNotNull(paidAt);
        assertEquals("PAID", delivered.payment().status());

        var repeated = service.updateStatusForAdmin(orderId, OrderStatus.DELIVERED);
        assertEquals(deliveredAt, repeated.deliveredAt());
        assertEquals(paidAt, repeated.payment().paidAt());
        assertEquals(2, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(1, scalarInt("SELECT count(*) FROM orders WHERE order_id=" + orderId + " AND status='DELIVERED' AND delivered_at IS NOT NULL"));

        AppException invalid = assertThrows(AppException.class,
                () -> service.updateStatusForAdmin(orderId, OrderStatus.CANCELLED));
        assertEquals("INVALID_ORDER_STATUS", invalid.getCode());
    }

    @Test
    void concurrentCustomersCannotOversellLastUnit() throws Exception {
        salesFixture(1, true);
        var outcomes = concurrentCheckouts(List.of(
                new CheckoutCall(1, "checkout-race-user-001", request("First address")),
                new CheckoutCall(2, "checkout-race-user-002", request("Second address"))));

        assertEquals(1, outcomes.stream().filter(OrderService.CheckoutOutcome.class::isInstance).count());
        List<AppException> failures = outcomes.stream().filter(AppException.class::isInstance)
                .map(AppException.class::cast).toList();
        assertEquals(1, failures.size());
        assertEquals("OUT_OF_STOCK", failures.getFirst().getCode());
        assertEquals(1, scalarInt("SELECT count(*) FROM orders"));
        assertEquals(1, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(1, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        assertEquals(1, scalarInt("SELECT count(*) FROM cart_items"));
    }

    @Test
    void concurrentDuplicateCheckoutCreatesOneOrder() throws Exception {
        salesFixture(2, false);
        CheckoutRequest request = request("Duplicate address");
        var outcomes = concurrentCheckouts(List.of(
                new CheckoutCall(1, "checkout-duplicate-001", request),
                new CheckoutCall(1, "checkout-duplicate-001", request)));

        List<OrderService.CheckoutOutcome> successes = outcomes.stream()
                .filter(OrderService.CheckoutOutcome.class::isInstance)
                .map(OrderService.CheckoutOutcome.class::cast).toList();
        assertEquals(2, successes.size());
        assertEquals(1, successes.stream().filter(OrderService.CheckoutOutcome::replayed).count());
        assertEquals(successes.get(0).order().orderId(), successes.get(1).order().orderId());
        assertEquals(1, scalarInt("SELECT count(*) FROM orders"));
        assertEquals(1, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        assertEquals(0, scalarInt("SELECT count(*) FROM cart_items"));
    }

    private List<Object> concurrentCheckouts(List<CheckoutCall> calls) throws Exception {
        var pool = Executors.newFixedThreadPool(calls.size());
        CountDownLatch ready = new CountDownLatch(calls.size());
        CountDownLatch start = new CountDownLatch(1);
        try {
            var futures = calls.stream().map(call -> pool.submit(() -> {
                ready.countDown();
                start.await();
                try {
                    return (Object) service.checkout(call.userId(), call.key(), call.request());
                } catch (AppException exception) {
                    return exception;
                }
            })).toList();
            assertTrue(ready.await(10, TimeUnit.SECONDS), "Checkout workers did not become ready");
            start.countDown();
            List<Object> outcomes = new ArrayList<>();
            for (var future : futures) outcomes.add(future.get(20, TimeUnit.SECONDS));
            return outcomes;
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void emptyCartCannotCreateOrderOrPayment() throws Exception {
        salesFixture(2, false);
        execute(schemaConnection, "DELETE FROM cart_items");
        rejects("CART_EMPTY", () -> service.checkout(1, "empty-cart-001", request("Address")));
        assertUnchangedCheckout(0, 0);
    }

    @ParameterizedTest
    @ValueSource(strings = {"products", "categories", "brands"})
    void productMadeUnavailableAfterAddingToCartCannotCheckout(String table) throws Exception {
        salesFixture(2, false);
        execute(schemaConnection, "UPDATE " + table + " SET status='" + (table.equals("products") ? "HIDDEN" : "INACTIVE") + "'");
        rejects("PRODUCT_NOT_SELLABLE", () -> service.checkout(1, "hidden-product-001", request("Address")));
        assertUnchangedCheckout(1, 0);
    }

    @Test
    void oneUnavailableLineRollsBackReservationsForEntireCart() throws Exception {
        salesFixture(3, false);
        secondProduct(0, 1);
        rejects("OUT_OF_STOCK", () -> service.checkout(1, "multi-stock-001", request("Address")));
        assertUnchangedCheckout(2, 0);
        assertEquals(3, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
    }

    @Test
    void databaseFailureAfterOrderWritesRollsBackAndSameKeyCanBeRetried() throws Exception {
        salesFixture(3, false);
        // Failure occurs when checkout clears the cart, after persisting order/items/payment.
        execute(schemaConnection, "CREATE FUNCTION reject_cart_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'T19 injected failure'; END $$");
        execute(schemaConnection, "CREATE TRIGGER t19_fail_delete BEFORE DELETE ON cart_items FOR EACH ROW EXECUTE FUNCTION reject_cart_delete()");
        rejects("CHECKOUT_CONFLICT", () -> service.checkout(1, "rollback-retry-001", request("Address")));
        assertUnchangedCheckout(1, 0);
        execute(schemaConnection, "DROP TRIGGER t19_fail_delete ON cart_items");
        var result = service.checkout(1, "rollback-retry-001", request("Address"));
        assertFalse(result.replayed());
        assertEquals(1, scalarInt("SELECT count(*) FROM orders"));
        assertEquals(1, scalarInt("SELECT count(*) FROM payments"));
        assertEquals(1, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
    }

    @Test
    void checkoutRepricesMultipleLinesAndPaymentMatchesPersistedTotal() throws Exception {
        salesFixture(5, false);
        execute(schemaConnection, "UPDATE cart_items SET quantity=2");
        secondProduct(5, 3);
        execute(schemaConnection, "UPDATE products SET price=1250000 WHERE product_id=1");
        var order = service.checkout(1, "multi-price-001", request("Original address")).order();
        assertEquals(new BigDecimal("3100000"), order.totalAmount());
        assertEquals(new BigDecimal("3100000"), order.payment().amount());
        assertEquals(2, order.items().size());
        assertEquals(1, scalarInt("SELECT count(*) FROM payments"));
        execute(schemaConnection, "UPDATE products SET price=9");
        var reloaded = service.findOwnedOrder(1, order.orderId());
        assertEquals(new BigDecimal("3100000"), reloaded.totalAmount());
        assertEquals("Original address", reloaded.shippingAddressText());
        assertEquals(new BigDecimal("1250000"), reloaded.items().stream().filter(i -> i.productId() == 1).findFirst().orElseThrow().unitPrice());
        assertEquals(5, scalarInt("SELECT sum(reserved_quantity) FROM inventory"));
    }

    @Test
    void overflowingTotalDoesNotReserveStockOrClearCart() throws Exception {
        salesFixture(3, false);
        execute(schemaConnection, "UPDATE products SET price=9999999999999999999");
        execute(schemaConnection, "UPDATE cart_items SET quantity=2");
        rejects("TOTAL_TOO_LARGE", () -> service.checkout(1, "overflow-total-001", request("Address")));
        assertUnchangedCheckout(1, 0);
    }

    @Test
    void otherCustomerCannotCancelAndOrderListsArePrivate() throws Exception {
        salesFixture(3, true);
        int first = service.checkout(1, "shared-key-001", request("First")).order().orderId();
        int second = service.checkout(2, "shared-key-001", request("Second")).order().orderId();
        assertEquals(List.of(first), service.findOwnedOrders(1).stream().map(o -> o.orderId()).toList());
        assertEquals(List.of(second), service.findOwnedOrders(2).stream().map(o -> o.orderId()).toList());
        assertEquals(404, assertThrows(AppException.class, () -> service.cancelOwnedOrder(2, first)).getStatus());
        assertEquals("PENDING", service.findOwnedOrder(1, first).status());
        assertEquals(2, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
    }

    @Test
    void inactiveCustomerCannotCreateNewCheckout() throws Exception {
        salesFixture(2, false);
        execute(schemaConnection, "UPDATE users SET status='INACTIVE' WHERE user_id=1");
        assertEquals(401, assertThrows(AppException.class, () -> service.checkout(1, "inactive-user-001", request("Address"))).getStatus());
        assertUnchangedCheckout(1, 0);
    }

    @ParameterizedTest
    @CsvSource({"PENDING,SHIPPING", "PENDING,DELIVERED", "CONFIRMED,PENDING", "CONFIRMED,DELIVERED", "SHIPPING,PENDING", "SHIPPING,CONFIRMED", "SHIPPING,CANCELLED", "DELIVERED,PENDING", "DELIVERED,CONFIRMED", "DELIVERED,SHIPPING", "DELIVERED,CANCELLED", "CANCELLED,PENDING", "CANCELLED,CONFIRMED", "CANCELLED,SHIPPING", "CANCELLED,DELIVERED"})
    void invalidTransitionsLeaveOrderAndInventoryUnchanged(OrderStatus from, OrderStatus to) throws Exception {
        salesFixture(3, false);
        int id = orderAt(from);
        var before = service.findOwnedOrder(1, id);
        int onHand = scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1");
        int reserved = scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1");
        rejects("INVALID_ORDER_STATUS", () -> service.updateStatusForAdmin(id, to));
        assertEquals(before, service.findOwnedOrder(1, id));
        assertEquals(onHand, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(reserved, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
    }

    @Test
    void onlyAdminCanCancelConfirmedOrderAndReleasesReservationOnce() throws Exception {
        salesFixture(3, false);
        int id = orderAt(OrderStatus.CONFIRMED);
        rejects("INVALID_ORDER_STATUS", () -> service.cancelOwnedOrder(1, id));
        assertEquals(1, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        service.updateStatusForAdmin(id, OrderStatus.CANCELLED);
        service.updateStatusForAdmin(id, OrderStatus.CANCELLED);
        assertEquals(0, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        assertEquals(3, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
    }

    @Test
    void paidOrderCannotBeCancelledByCustomerOrAdmin() throws Exception {
        salesFixture(3, false);
        int id = orderAt(OrderStatus.PENDING);
        execute(schemaConnection, "UPDATE payments SET status='PAID',paid_at=now()");
        rejects("PAID_ORDER_CANNOT_BE_CANCELLED", () -> service.cancelOwnedOrder(1, id));
        rejects("PAID_ORDER_CANNOT_BE_CANCELLED", () -> service.updateStatusForAdmin(id, OrderStatus.CANCELLED));
        assertEquals("PENDING", service.findOwnedOrder(1, id).status());
        assertEquals(1, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
    }

    @Test
    void repeatedShippingDoesNotConsumeInventoryTwice() throws Exception {
        salesFixture(3, false);
        int id = orderAt(OrderStatus.SHIPPING);
        service.updateStatusForAdmin(id, OrderStatus.SHIPPING);
        assertEquals(2, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(0, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
    }

    @Test
    void bankTransferRequiresPaymentBeforeShipping() throws Exception {
        salesFixture(3, false);
        int id = orderAt(OrderStatus.CONFIRMED);
        // Existing bank-transfer order fixture; this does not claim checkout supports this method.
        execute(schemaConnection, "UPDATE payments SET method='BANK_TRANSFER'");
        rejects("PAYMENT_REQUIRED", () -> service.updateStatusForAdmin(id, OrderStatus.SHIPPING));
        assertEquals(3, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
        assertEquals(1, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        execute(schemaConnection, "UPDATE payments SET status='PAID',paid_at='2026-01-01 12:00:00'");
        service.updateStatusForAdmin(id, OrderStatus.SHIPPING);
        var delivered = service.updateStatusForAdmin(id, OrderStatus.DELIVERED);
        assertEquals(LocalDateTime.of(2026, 1, 1, 12, 0), delivered.payment().paidAt());
        assertEquals("PAID", delivered.payment().status());
    }

    @Test
    void differentKeysAgainstSameCartCannotCreateTwoOrders() throws Exception {
        salesFixture(3, false);
        var results = concurrentCheckouts(List.of(new CheckoutCall(1, "different-key-001", request("Address")), new CheckoutCall(1, "different-key-002", request("Address"))));
        assertEquals(1, results.stream().filter(OrderService.CheckoutOutcome.class::isInstance).count());
        var failure = results.stream().filter(AppException.class::isInstance).map(AppException.class::cast).findFirst().orElseThrow();
        assertEquals("CART_EMPTY", failure.getCode());
        assertEquals(1, scalarInt("SELECT count(*) FROM orders"));
        assertEquals(1, scalarInt("SELECT count(*) FROM payments"));
        assertEquals(1, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
    }

    @Test
    void concurrentCancelAndShippingPreserveInventory() throws Exception {
        salesFixture(3, false);
        int id = orderAt(OrderStatus.CONFIRMED);
        var pool = Executors.newFixedThreadPool(2);
        var start = new java.util.concurrent.CyclicBarrier(2);
        try {
            var futures = List.of(OrderStatus.CANCELLED, OrderStatus.SHIPPING).stream().map(target -> pool.submit(() -> {
                start.await(10, TimeUnit.SECONDS);
                try { service.updateStatusForAdmin(id, target); return "OK"; }
                catch (AppException error) { return error.getCode(); }
            })).toList();
            var results = new ArrayList<String>();
            for (var future : futures) results.add(future.get(20, TimeUnit.SECONDS));
            assertEquals(1, results.stream().filter("OK"::equals).count());
            assertEquals(1, results.stream().filter("INVALID_ORDER_STATUS"::equals).count());
            String status = service.findOwnedOrder(1, id).status();
            assertTrue(List.of("CANCELLED", "SHIPPING").contains(status));
            assertEquals(status.equals("SHIPPING") ? 2 : 3, scalarInt("SELECT quantity_on_hand FROM inventory WHERE product_id=1"));
            assertEquals(0, scalarInt("SELECT reserved_quantity FROM inventory WHERE product_id=1"));
        } finally { pool.shutdownNow(); }
    }

    private int orderAt(OrderStatus target) {
        int id = service.checkout(1, "status-fixture-001", request("Address")).order().orderId();
        if (target == OrderStatus.CANCELLED) service.cancelOwnedOrder(1, id);
        if (List.of(OrderStatus.CONFIRMED, OrderStatus.SHIPPING, OrderStatus.DELIVERED).contains(target)) service.updateStatusForAdmin(id, OrderStatus.CONFIRMED);
        if (List.of(OrderStatus.SHIPPING, OrderStatus.DELIVERED).contains(target)) service.updateStatusForAdmin(id, OrderStatus.SHIPPING);
        if (target == OrderStatus.DELIVERED) service.updateStatusForAdmin(id, target);
        return id;
    }

    private void assertUnchangedCheckout(int cartLines, int reserved) throws SQLException {
        for (String table : List.of("orders", "order_items", "payments")) assertEquals(0, scalarInt("SELECT count(*) FROM " + table), table);
        assertEquals(cartLines, scalarInt("SELECT count(*) FROM cart_items"));
        assertEquals(reserved, scalarInt("SELECT sum(reserved_quantity) FROM inventory"));
    }

    private void rejects(String code, org.junit.jupiter.api.function.Executable action) {
        assertEquals(code, assertThrows(AppException.class, action).getCode());
    }

    private void secondProduct(int stock, int quantity) throws SQLException {
        execute(schemaConnection, "INSERT INTO products(name,price,status,category_id,brand_id) VALUES ('RAM',200000,'ACTIVE',1,1)");
        execute(schemaConnection, "INSERT INTO inventory(product_id,quantity_on_hand,reserved_quantity) VALUES (2," + stock + ",0)");
        execute(schemaConnection, "INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (1,2," + quantity + ")");
    }

    private void salesFixture(int stock, boolean secondCustomerCart) throws SQLException {
        execute(schemaConnection, "INSERT INTO users(full_name,email,password_hash) VALUES ('Customer One','one@example.test','hash'),('Customer Two','two@example.test','hash')");
        execute(schemaConnection, "INSERT INTO brands(name) VALUES ('Brand')");
        execute(schemaConnection, "INSERT INTO categories(name) VALUES ('CPU')");
        execute(schemaConnection, "INSERT INTO products(name,price,status,category_id,brand_id) VALUES ('CPU',1000000,'ACTIVE',1,1)");
        execute(schemaConnection, "INSERT INTO inventory(product_id,quantity_on_hand,reserved_quantity) VALUES (1," + stock + ",0)");
        execute(schemaConnection, "INSERT INTO carts(user_id,created_at,updated_at) VALUES (1,now(),now())");
        execute(schemaConnection, "INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (1,1,1)");
        if (secondCustomerCart) {
            execute(schemaConnection, "INSERT INTO carts(user_id,created_at,updated_at) VALUES (2,now(),now())");
            execute(schemaConnection, "INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (2,1,1)");
        }
    }

    private static CheckoutRequest request(String address) {
        return new CheckoutRequest("Nguyen Van A", "0901234567", address, PaymentMethod.COD);
    }

    private int scalarInt(String sql) throws SQLException {
        try (Statement statement = schemaConnection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            assertTrue(result.next());
            return result.getInt(1);
        }
    }

    private static void execute(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private record CheckoutCall(int userId, String key, CheckoutRequest request) {
    }
}
