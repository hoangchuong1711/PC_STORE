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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
            ready.await();
            start.countDown();
            List<Object> outcomes = new ArrayList<>();
            for (var future : futures) outcomes.add(future.get());
            return outcomes;
        } finally {
            pool.shutdownNow();
        }
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
