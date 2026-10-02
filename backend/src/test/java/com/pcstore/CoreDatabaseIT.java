package com.pcstore;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import com.pcstore.config.PersistenceManager;
import com.pcstore.entity.*;
import com.pcstore.entity.enums.ComponentType;
import com.pcstore.entity.enums.OrderStatus;
import com.pcstore.entity.enums.PaymentMethod;
import com.pcstore.entity.enums.PaymentStatus;
import com.pcstore.entity.enums.ProductStatus;
import com.pcstore.entity.enums.UserRole;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import java.sql.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Real PostgreSQL contract tests. Each test owns an isolated schema. */
class CoreDatabaseIT {
    private Connection db;
    private String schema;
    private String url;
    private String user;
    private String password;

    @BeforeEach void migrate() throws Exception {
        url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL to a disposable PostgreSQL database");
        user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        db = DriverManager.getConnection(url, user, password);
        schema = "t03_" + UUID.randomUUID().toString().replace("-", "");
        execute("CREATE SCHEMA " + schema);
        execute("SET search_path TO " + schema);
        flyway().migrate();
    }

    private Flyway flyway() {
        return Flyway.configure().dataSource(url, user, password).defaultSchema(schema)
                .locations("classpath:db/migration").cleanDisabled(true).load();
    }

    @AfterEach void cleanup() throws Exception {
        if (db != null) {
            // Only the randomly named schema created by this test is removed.
            if (schema != null) execute("DROP SCHEMA " + schema + " CASCADE");
            db.close();
        }
    }

    @Test void migratesAllCoreTablesAndCanRunAgain() throws Exception {
        Set<String> tables = new HashSet<>();
        try (ResultSet rs = db.getMetaData().getTables(null, schema, "%", new String[]{"TABLE"})) {
            while (rs.next()) tables.add(rs.getString("TABLE_NAME"));
        }
        assertTrue(tables.containsAll(Set.of("users", "addresses", "brands", "categories", "products",
                "product_images", "inventory", "carts", "cart_items", "orders", "order_items", "payments")), tables.toString());
        assertEquals(0, flyway().migrate().migrationsExecuted);
    }

    private void execute(String sql) throws SQLException {
        try (Statement statement = db.createStatement()) { statement.execute(sql); }
    }

    private void fixture() throws SQLException {
        execute("INSERT INTO users(full_name,email,password_hash) VALUES ('Customer','customer@example.test','test-hash')");
        execute("INSERT INTO brands(name) VALUES ('Brand')");
        execute("INSERT INTO categories(name) VALUES ('CPU')");
        execute("INSERT INTO products(name,price,category_id,brand_id) VALUES ('CPU',1000000,1,1)");
        execute("INSERT INTO carts(user_id,created_at,updated_at) VALUES (1,'2026-10-01 10:00','2026-10-01 10:00')");
        execute("INSERT INTO orders(user_id,order_date,total_amount,shipping_name,shipping_phone,shipping_address_text) VALUES (1,'2026-10-01 10:00',1000000,'Customer','0123456789','Demo address')");
        execute("INSERT INTO order_items(order_id,product_id,quantity,base_unit_price,unit_price) VALUES (1,1,1,1000000,1000000)");
        execute("INSERT INTO payments(order_id,method,amount) VALUES (1,'COD',1000000)");
    }

    private void rejects(String state, String sql) {
        assertEquals(state, assertThrows(SQLException.class, () -> execute(sql)).getSQLState(), sql);
    }

    @Test void rejectsInvalidValuesAndPreservesOrderHistory() throws Exception {
        fixture();
        for (String sql : List.of(
                "UPDATE users SET email=' CUSTOMER@example.test '",
                "UPDATE users SET full_name='   '",
                "UPDATE users SET role='ROOT'",
                "UPDATE users SET status='LOCKED'",
                "UPDATE brands SET status='DELETED'",
                "UPDATE categories SET component_type='MONITOR'",
                "UPDATE products SET price=-1",
                "UPDATE products SET price='NaN'",
                "UPDATE products SET status='UNKNOWN'",
                "UPDATE orders SET total_amount=-1",
                "UPDATE orders SET status='DELIVERED'",
                "UPDATE orders SET delivered_at='2026-10-02'",
                "UPDATE order_items SET quantity=0",
                "UPDATE order_items SET unit_price=1000001",
                "UPDATE payments SET method='CARD'",
                "UPDATE payments SET amount=-1",
                "UPDATE payments SET status='PAID'",
                "UPDATE payments SET paid_at='2026-10-02'")) rejects("23514", sql);
        rejects("23502", "UPDATE products SET brand_id=NULL");
        rejects("23503", "UPDATE products SET category_id=999");
        rejects("23503", "DELETE FROM users WHERE user_id=1");
        rejects("23503", "DELETE FROM products WHERE product_id=1");
        rejects("23503", "DELETE FROM orders WHERE order_id=1");
        rejects("23505", "INSERT INTO users(full_name,email,password_hash) VALUES ('Other','customer@example.test','hash')");
        rejects("23505", "INSERT INTO carts(user_id,created_at,updated_at) VALUES (1,now(),now())");
        rejects("23505", "INSERT INTO order_items(order_id,product_id,quantity,base_unit_price,unit_price) VALUES (1,1,1,1,1)");
        rejects("23505", "INSERT INTO payments(order_id,method,amount) VALUES (1,'BANK_TRANSFER',1000000)");
        execute("UPDATE orders SET status='DELIVERED', delivered_at='2026-10-02 10:00'");
        execute("UPDATE payments SET status='PAID', paid_at='2026-10-02 10:00'");
    }

    @Test void enforcesInventoryCartAndPartialUniqueIndexes() throws Exception {
        fixture();
        execute("INSERT INTO inventory(product_id) VALUES (1)");
        rejects("23505", "INSERT INTO inventory(product_id) VALUES (1)");
        rejects("23514", "UPDATE inventory SET quantity_on_hand=-1");
        rejects("23514", "UPDATE inventory SET reserved_quantity=-1");
        rejects("23514", "UPDATE inventory SET reserved_quantity=1");
        execute("UPDATE inventory SET quantity_on_hand=5,reserved_quantity=5");
        execute("INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (1,1,1)");
        rejects("23505", "INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (1,1,2)");
        rejects("23514", "UPDATE cart_items SET quantity=0");
        execute("INSERT INTO addresses(user_id,address_detail,is_default) VALUES (1,'Same address',true),(1,'Same address',false)");
        rejects("23505", "UPDATE addresses SET is_default=true");
        execute("INSERT INTO product_images(product_id,image_url,is_primary,sort_order) VALUES (1,'https://example.test/1.png',true,0),(1,'https://example.test/2.png',false,1)");
        rejects("23505", "UPDATE product_images SET is_primary=true");
        rejects("23505", "UPDATE product_images SET sort_order=0");
        rejects("23514", "UPDATE product_images SET sort_order=-1");
        execute("DELETE FROM carts WHERE cart_id=1");
        assertEquals(0, scalar("SELECT count(*) FROM cart_items"));
        execute("INSERT INTO products(name,price,category_id,brand_id) VALUES ('Disposable',0,1,1)");
        execute("INSERT INTO inventory(product_id) VALUES (2)");
        execute("INSERT INTO product_images(product_id,image_url,is_primary,sort_order) VALUES (2,'https://example.test/3.png',false,0)");
        execute("DELETE FROM products WHERE product_id=2");
        assertEquals(0, scalar("SELECT count(*) FROM inventory WHERE product_id=2"));
        assertEquals(0, scalar("SELECT count(*) FROM product_images WHERE product_id=2"));
    }

    private long scalar(String sql) throws SQLException {
        try (Statement statement = db.createStatement(); ResultSet rs = statement.executeQuery(sql)) {
            assertTrue(rs.next());
            return rs.getLong(1);
        }
    }

    @Test void validatesAndRegistersAllCoreMappings() throws Exception {
        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        try (var factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password)) {
            Set<String> mapped = factory.getMetamodel().getEntities().stream()
                    .map(e -> e.getJavaType().getSimpleName()).collect(Collectors.toSet());
            assertEquals(Set.of("User", "Address", "Category", "Brand", "Product", "ProductImage",
                    "Inventory", "Cart", "CartItem", "Order", "OrderItem", "Payment"), mapped);
        }
    }

    @Test void persistsAndReloadsCoreGraphWithIndependentPriceSnapshots() throws Exception {
        String schemaUrl = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        try (var factory = PersistenceManager.createEntityManagerFactory(schemaUrl, user, password);
             var em = factory.createEntityManager()) {
            em.getTransaction().begin();
            var customer = new User();
            customer.setFullName("Test customer");
            customer.setEmail("jpa@example.test");
            customer.setPasswordHash("test-only-hash");
            em.persist(customer);
            var address = new Address();
            address.setUser(customer);
            address.setAddressDetail("Demo address");
            address.setDefault(true);
            em.persist(address);
            var brand = new Brand("B".repeat(255));
            em.persist(brand);
            var category = new Category();
            category.setName("CPU");
            category.setComponentType(ComponentType.CPU);
            em.persist(category);
            var product = new Product();
            product.setName("CPU demo");
            product.setCategory(category);
            product.setBrand(brand);
            product.setPrice(new BigDecimal("1000000"));
            em.persist(product);
            var image = new ProductImage();
            image.setProduct(product);
            image.setImageUrl("https://example.test/cpu.png");
            image.setPrimary(true);
            image.setSortOrder(0);
            em.persist(image);
            var inventory = new Inventory();
            inventory.setProduct(product);
            inventory.setQuantityOnHand(3);
            inventory.setReservedQuantity(1);
            em.persist(inventory);
            var time = LocalDateTime.of(2026, 10, 1, 10, 30);
            var cart = new Cart();
            cart.setUser(customer);
            cart.setCreatedAt(time);
            cart.setUpdatedAt(time);
            em.persist(cart);
            var cartItem = new CartItem();
            cartItem.setCart(cart);
            cartItem.setProduct(product);
            cartItem.setQuantity(1);
            em.persist(cartItem);
            var order = new com.pcstore.entity.Order();
            order.setUser(customer);
            order.setOrderDate(time);
            order.setTotalAmount(new BigDecimal("1000000"));
            order.setShippingName("Test customer");
            order.setShippingPhone("0123456789");
            order.setShippingAddressText("Demo address");
            em.persist(order);
            var item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(1);
            item.setBaseUnitPrice(new BigDecimal("1000000"));
            item.setUnitPrice(new BigDecimal("1000000"));
            em.persist(item);
            var payment = new Payment();
            payment.setOrder(order);
            payment.setMethod(PaymentMethod.BANK_TRANSFER);
            payment.setAmount(new BigDecimal("1000000"));
            em.persist(payment);
            em.getTransaction().commit();
            em.clear();

            var loaded = em.find(com.pcstore.entity.Order.class, order.getOrderId());
            assertEquals(time, loaded.getOrderDate());
            assertEquals(OrderStatus.PENDING, loaded.getStatus());
            assertEquals("jpa@example.test", loaded.getUser().getEmail());
            assertEquals(UserRole.CUSTOMER, loaded.getUser().getRole());
            assertEquals(1, loaded.getItems().size());
            assertEquals(product.getProductId(), loaded.getItems().getFirst().getProduct().getProductId());
            assertEquals(1, em.find(Cart.class, cart.getCartId()).getItems().size());
            assertTrue(loaded.getUser().getAddresses().getFirst().isDefault());
            assertTrue(em.find(Product.class, product.getProductId()).getImages().getFirst().isPrimary());
            assertEquals(1, em.find(Inventory.class, inventory.getInventoryId()).getReservedQuantity());
            assertEquals(PaymentMethod.BANK_TRANSFER, em.find(Payment.class, payment.getPaymentId()).getMethod());
            assertEquals(PaymentStatus.PENDING, em.find(Payment.class, payment.getPaymentId()).getStatus());
            assertNull(em.find(Payment.class, payment.getPaymentId()).getPaidAt());
            assertEquals(ProductStatus.DRAFT, em.find(Product.class, product.getProductId()).getStatus());
            assertEquals(255, em.find(Brand.class, brand.getBrandId()).getName().length());
            em.getTransaction().begin();
            em.find(Product.class, product.getProductId()).setPrice(new BigDecimal("2000000"));
            em.getTransaction().commit();
            em.clear();
            assertEquals(new BigDecimal("1000000"), em.find(OrderItem.class, item.getOrderItemId()).getUnitPrice());
            assertEquals(new BigDecimal("2000000"), em.find(CartItem.class, cartItem.getCartItemId()).getProduct().getPrice());
        }
    }

    @Test void upgradesExistingV1BrandsWithoutLosingData() throws Exception {
        String upgradeSchema = schema + "_upgrade";
        execute("CREATE SCHEMA " + upgradeSchema);
        try {
            Flyway.configure().dataSource(url, user, password).defaultSchema(upgradeSchema)
                    .target("1").load().migrate();
            execute("SET search_path TO " + upgradeSchema);
            execute("INSERT INTO brands(name) VALUES ('Existing brand')");
            var upgrade = Flyway.configure().dataSource(url, user, password).defaultSchema(upgradeSchema).load();
            assertEquals(1, upgrade.migrate().migrationsExecuted);
            assertEquals(1, scalar("SELECT count(*) FROM brands WHERE name='Existing brand' AND brand_id=1"));
            rejects("428C9", "INSERT INTO brands(brand_id,name) VALUES (99,'Explicit identity')");
            execute("INSERT INTO brands(name) VALUES ('New brand')");
            assertEquals(2, scalar("SELECT brand_id FROM brands WHERE name='New brand'"));
            assertEquals(0, upgrade.migrate().migrationsExecuted);
        } finally {
            execute("SET search_path TO " + schema);
            execute("DROP SCHEMA " + upgradeSchema + " CASCADE");
        }
    }
}
