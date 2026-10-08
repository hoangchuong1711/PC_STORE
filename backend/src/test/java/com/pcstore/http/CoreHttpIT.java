package com.pcstore.http;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.controller.*;
import com.pcstore.filter.*;
import com.pcstore.util.PasswordUtil;
import jakarta.persistence.EntityManagerFactory;
import jakarta.servlet.Filter;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import org.apache.catalina.startup.Tomcat;
import org.apache.tomcat.util.descriptor.web.FilterDef;
import org.apache.tomcat.util.descriptor.web.FilterMap;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.*;
import java.net.http.*;
import java.nio.file.Path;
import java.sql.*;
import java.time.Duration;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/** Real HTTP/session/filter/Servlet/Service/JPA tests on an isolated PostgreSQL schema.
 * Run with mvn -Pdb-test verify and TEST_DB_URL/USER/PASSWORD. No application DB is used.
 */
@Timeout(60)
class CoreHttpIT {
    @TempDir Path temp;
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String CHECKOUT = "{\"shippingName\":\"Customer\",\"shippingPhone\":\"0901234567\",\"shippingAddressText\":\"Test address\",\"paymentMethod\":\"COD\"}";
    private Connection connection;
    private String schema;
    private EntityManagerFactory factory;
    private EntityManagerFactory previousFactory;
    private boolean factoryInstalled;
    private Tomcat tomcat;
    private URI base;
    private final List<HttpClient> clients = new ArrayList<>();

    @BeforeEach
    void start() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL to a disposable PostgreSQL database");
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        schema = "t19_http_" + UUID.randomUUID().toString().replace("-", "");
        connection = DriverManager.getConnection(url, user, password);
        sql("CREATE SCHEMA " + schema);
        sql("SET search_path TO " + schema);
        factory = PersistenceManager.createEntityManagerFactory(url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema, user, password);
        // Test-only injection of the real isolated factory; no fake service or login endpoint.
        // Surefire/Failsafe run these tests sequentially; restore the previous global on teardown.
        var field = PersistenceManager.class.getDeclaredField("factory");
        field.setAccessible(true);
        previousFactory = (EntityManagerFactory) field.get(null);
        field.set(null, factory);
        factoryInstalled = true;
        try (var statement = connection.prepareStatement("INSERT INTO users(full_name,email,password_hash,role) VALUES (?,?,?,?)")) {
            String hash = PasswordUtil.hash("Test-pass-123");
            for (String email : List.of("a@example.test", "b@example.test", "admin@example.test")) {
                statement.setString(1, email); statement.setString(2, email); statement.setString(3, hash);
                statement.setString(4, email.startsWith("admin") ? "ADMIN" : "CUSTOMER");
                statement.executeUpdate();
            }
        }
        sql("INSERT INTO brands(name) VALUES ('Test brand')");
        sql("INSERT INTO categories(name) VALUES ('CPU')");
        sql("INSERT INTO products(name,price,status,brand_id,category_id) VALUES ('CPU',1000000,'ACTIVE',1,1)");
        sql("INSERT INTO inventory(product_id,quantity_on_hand,reserved_quantity) VALUES (1,2,0)");
        tomcat = new Tomcat();
        tomcat.setBaseDir(temp.resolve("tomcat").toString());
        tomcat.setPort(0);
        tomcat.getConnector().setProperty("address", "127.0.0.1");
        var context = tomcat.addContext("", temp.toString());
        context.setParentClassLoader(getClass().getClassLoader());
        for (Filter filter : List.of(new CorsFilter(), new AuthenticationFilter(), new AdminAuthorizationFilter())) {
            String name = filter.getClass().getSimpleName();
            var definition = new FilterDef(); definition.setFilterName(name); definition.setFilter(filter);
            context.addFilterDef(definition);
            var mapping = new FilterMap(); mapping.setFilterName(name);
            for (String pattern : filter.getClass().getAnnotation(WebFilter.class).urlPatterns()) mapping.addURLPattern(pattern);
            context.addFilterMap(mapping);
        }
        for (HttpServlet servlet : List.of(new AuthServlet(), new CartServlet(), new OrderServlet(), new AdminOrderServlet(), new AdminTaxonomyServlet(), new CategoryServlet(), new BrandServlet())) {
            WebServlet annotation = servlet.getClass().getAnnotation(WebServlet.class);
            var wrapper = Tomcat.addServlet(context, servlet.getClass().getSimpleName(), servlet);
            wrapper.setLoadOnStartup(1);
            for (String pattern : annotation.urlPatterns()) context.addServletMappingDecoded(pattern, wrapper.getName());
        }
        tomcat.start();
        base = URI.create("http://127.0.0.1:" + tomcat.getConnector().getLocalPort());
    }

    @AfterEach
    void stop() throws Exception {
        try {
            clients.forEach(HttpClient::close);
            if (tomcat != null) { try { tomcat.stop(); } finally { tomcat.destroy(); } }
        } finally {
            try {
                if (factoryInstalled) {
                    var field = PersistenceManager.class.getDeclaredField("factory");
                    field.setAccessible(true); field.set(null, previousFactory);
                }
                if (factory != null) factory.close();
            } finally {
                if (connection != null) {
                    try { if (schema != null && schema.matches("t19_http_[a-f0-9]{32}")) sql("DROP SCHEMA " + schema + " CASCADE"); }
                    finally { connection.close(); }
                }
            }
        }
    }

    @Test
    void loginCartCheckoutReplayAndAdminDeliveryWorkOverHttp() throws Exception {
        var customer = login("a@example.test");
        addCart(customer);
        var created = send(customer, "POST", "/api/orders", CHECKOUT, "http-checkout-001");
        assertEquals(201, created.statusCode());
        assertEquals("false", created.headers().firstValue("Idempotent-Replayed").orElseThrow());
        int id = body(created).path("orderId").asInt();
        assertTrue(id > 0);
        var replay = send(customer, "POST", "/api/orders", CHECKOUT, "http-checkout-001");
        assertEquals(200, replay.statusCode());
        assertEquals("true", replay.headers().firstValue("Idempotent-Replayed").orElseThrow());
        assertEquals(id, body(replay).path("orderId").asInt());
        assertEquals(0, body(send(customer, "GET", "/api/customer/cart", null, null)).path("items").size());
        var admin = login("admin@example.test");
        for (String status : List.of("CONFIRMED", "SHIPPING", "DELIVERED")) {
            var changed = send(admin, "PUT", "/api/admin/orders/" + id + "/status", "{\"status\":\"" + status + "\"}", null);
            assertEquals(200, changed.statusCode(), changed.body());
            assertEquals(status, body(changed).path("status").asText());
        }
        var order = body(send(customer, "GET", "/api/orders/" + id, null, null));
        assertEquals("DELIVERED", order.path("status").asText());
        assertEquals("PAID", order.path("payment").path("status").asText());
        assertFalse(order.path("deliveredAt").isNull());
        assertEquals(1, scalar("SELECT count(*) FROM orders"));
        assertEquals(1, scalar("SELECT count(*) FROM payments"));
        assertEquals(1, scalar("SELECT quantity_on_hand FROM inventory"));
        assertEquals(0, scalar("SELECT reserved_quantity FROM inventory"));
    }

    @Test
    void sessionsEnforceGuestRoleAndOwnershipBoundaries() throws Exception {
        var guest = client();
        for (String path : List.of("/api/orders", "/api/orders/1", "/api/admin/orders", "/api/customer/cart")) error(send(guest, "GET", path, null, null), 401, "UNAUTHORIZED");
        var a = login("a@example.test");
        var b = login("b@example.test");
        addCart(a);
        int id = body(send(a, "POST", "/api/orders", CHECKOUT, "http-private-001")).path("orderId").asInt();
        error(send(b, "GET", "/api/orders/" + id, null, null), 404, "RESOURCE_NOT_FOUND");
        error(send(b, "POST", "/api/orders/" + id + "/cancel", null, null), 404, "RESOURCE_NOT_FOUND");
        assertEquals(0, body(send(b, "GET", "/api/orders", null, null)).size());
        error(send(a, "PUT", "/api/admin/orders/" + id + "/status", "{\"status\":\"CONFIRMED\"}", null), 403, "FORBIDDEN");
        error(send(login("admin@example.test"), "POST", "/api/orders", CHECKOUT, "admin-order-001"), 403, "FORBIDDEN");
        assertEquals("PENDING", body(send(a, "GET", "/api/orders/" + id, null, null)).path("status").asText());
    }

    @Test
    void logoutInvalidatesSessionForProtectedRoutes() throws Exception {
        var customer = login("a@example.test");
        assertEquals(204, send(customer, "POST", "/api/auth/logout", null, null).statusCode());
        error(send(customer, "GET", "/api/orders", null, null), 401, "UNAUTHORIZED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "", "{\"paymentMethod\":\"INVALID\"}", "{\"price\":0}", "{\"userId\":2}", "{\"role\":\"ADMIN\"}"})
    void malformedAndForgedCheckoutBodiesCannotCreateOrders(String json) throws Exception {
        var customer = login("a@example.test"); addCart(customer);
        error(send(customer, "POST", "/api/orders", json, "invalid-json-001"), 400, "INVALID_JSON");
        assertEquals(0, scalar("SELECT count(*) FROM orders"));
        assertEquals(1, scalar("SELECT count(*) FROM cart_items"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "short", "invalid key", "bad/key"})
    void invalidIdempotencyKeyDoesNotMutateCart(String key) throws Exception {
        var customer = login("a@example.test"); addCart(customer);
        var response = send(customer, "POST", "/api/orders", CHECKOUT, key.isEmpty() ? null : key);
        assertEquals(400, response.statusCode());
        assertEquals(0, scalar("SELECT count(*) FROM orders"));
        assertEquals(1, scalar("SELECT count(*) FROM cart_items"));
        assertEquals(0, scalar("SELECT reserved_quantity FROM inventory"));
    }

    @Test
    void changedBodyWithUsedKeyReturnsConflict() throws Exception {
        var customer = login("a@example.test"); addCart(customer);
        assertEquals(201, send(customer, "POST", "/api/orders", CHECKOUT, "http-reuse-001").statusCode());
        error(send(customer, "POST", "/api/orders", CHECKOUT.replace("Test address", "Another address"), "http-reuse-001"), 409, "IDEMPOTENCY_KEY_REUSED");
        assertEquals(1, scalar("SELECT count(*) FROM orders"));
        assertEquals(1, scalar("SELECT reserved_quantity FROM inventory"));
    }

    @Test
    void stockChangedAfterAddingCartReturnsConflictAndPreservesCart() throws Exception {
        var customer = login("a@example.test"); addCart(customer);
        sql("UPDATE inventory SET quantity_on_hand=0");
        error(send(customer, "POST", "/api/orders", CHECKOUT, "http-stock-001"), 409, "OUT_OF_STOCK");
        assertEquals(0, scalar("SELECT count(*) FROM orders"));
        assertEquals(1, scalar("SELECT count(*) FROM cart_items"));
    }

    @Test
    void invalidAdminStatusAndMalformedBodyLeaveOrderUnchanged() throws Exception {
        var customer = login("a@example.test"); addCart(customer);
        int id = body(send(customer, "POST", "/api/orders", CHECKOUT, "admin-invalid-001")).path("orderId").asInt();
        var admin = login("admin@example.test");
        String path = "/api/admin/orders/" + id + "/status";
        for (String json : List.of("{", "{\"status\":\"UNKNOWN\"}")) error(send(admin, "PUT", path, json, null), 400, "INVALID_JSON");
        assertEquals(400, send(admin, "PUT", path, "{}", null).statusCode());
        error(send(admin, "PUT", path, "{\"status\":\"DELIVERED\"}", null), 409, "INVALID_ORDER_STATUS");
        assertEquals("PENDING", body(send(customer, "GET", "/api/orders/" + id, null, null)).path("status").asText());
        assertEquals(2, scalar("SELECT quantity_on_hand FROM inventory"));
        assertEquals(1, scalar("SELECT reserved_quantity FROM inventory"));
    }

    @Test
    void malformedOrderIdsAndUnknownPathsReturnJson404() throws Exception {
        var customer = login("a@example.test");
        for (String id : List.of("0", "-1", "abc", "2147483648", "1/extra")) {
            error(send(customer, "GET", "/api/orders/" + id, null, null), 404, "NOT_FOUND");
        }
        error(send(customer, "GET", "/api/orders/999", null, null), 404, "RESOURCE_NOT_FOUND");
        var admin = login("admin@example.test");
        error(send(admin, "PUT", "/api/admin/orders/abc/status", "{\"status\":\"CONFIRMED\"}", null), 404, "NOT_FOUND");
    }

    @Test
    void failedLoginDoesNotCreateAuthenticatedSession() throws Exception {
        var client = client();
        error(send(client, "POST", "/api/auth/login", "{\"email\":\"a@example.test\",\"password\":\"wrong\"}", null), 401, "UNAUTHORIZED");
        error(send(client, "GET", "/api/orders", null, null), 401, "UNAUTHORIZED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"categories", "brands"})
    void adminTaxonomyPersistsAcrossSessionsAndHidesFromPublic(String kind) throws Exception {
        var admin = login("admin@example.test");
        String endpoint = "/api/admin/" + kind;
        String extra = kind.equals("categories") ? "\"componentType\":\"RAM\"" : "\"logoUrl\":\"https://example.test/logo.png\"";
        String payload = "{\"name\":\"  New taxonomy  \",\"description\":\" New description \",\"status\":\"ACTIVE\"," + extra + "}";
        var created = send(admin, "POST", endpoint, payload, null);
        assertEquals(201, created.statusCode(), created.body());
        int id = body(created).path("id").asInt();
        assertTrue(id > 0);
        assertEquals("New taxonomy", body(created).path("name").asText());
        assertEquals(0, body(created).path("productCount").asInt());
        assertEquals(2, body(send(login("admin@example.test"), "GET", endpoint, null, null)).size());
        var changed = send(admin, "PUT", endpoint + "/" + id, payload.replace("New taxonomy", "Updated taxonomy"), null);
        assertEquals(200, changed.statusCode(), changed.body());
        assertEquals("Updated taxonomy", body(changed).path("name").asText());
        assertEquals(200, send(admin, "PUT", endpoint + "/" + id + "/status", "{\"status\":\"INACTIVE\"}", null).statusCode());
        assertEquals(1, body(send(client(), "GET", "/api/" + kind, null, null)).size());
        assertEquals(1, scalar("SELECT count(*) FROM " + kind + " WHERE name='Updated taxonomy' AND status='INACTIVE'"));
        var listed = body(send(admin, "GET", endpoint, null, null));
        assertEquals(2, listed.size());
        assertEquals(1, listed.get(0).path("productCount").asInt());
        assertEquals(200, send(admin, "PUT", endpoint + "/" + id + "/status", "{\"status\":\"ACTIVE\"}", null).statusCode());
        assertEquals(2, body(send(client(), "GET", "/api/" + kind, null, null)).size());
    }

    @ParameterizedTest
    @ValueSource(strings = {"categories", "brands"})
    void adminTaxonomyRejectsInvalidWritesAndProtectsPermissions(String kind) throws Exception {
        String endpoint = "/api/admin/" + kind;
        var guest = client();
        var customer = login("a@example.test");
        for (String method : List.of("GET", "POST", "PUT", "DELETE")) {
            error(send(guest, method, endpoint, "{}", null), 401, "UNAUTHORIZED");
            error(send(customer, method, endpoint, "{}", null), 403, "FORBIDDEN");
        }
        var admin = login("admin@example.test");
        for (String invalid : List.of("null", "{}", "{\"name\":\"   \",\"status\":\"ACTIVE\"}",
                "{\"name\":\"X\",\"status\":\"HIDDEN\"}", "{\"name\":\"X\",\"status\":\"ACTIVE\",\"slug\":\"x\"}")) {
            assertEquals(400, send(admin, "POST", endpoint, invalid, null).statusCode());
        }
        assertEquals(404, send(admin, "PUT", endpoint + "/999/status", "{\"status\":\"INACTIVE\"}", null).statusCode());
        assertEquals(404, send(admin, "PUT", endpoint + "/invalid/status", "{\"status\":\"INACTIVE\"}", null).statusCode());
        assertEquals(405, send(admin, "DELETE", endpoint + "/1", null, null).statusCode());
        assertEquals(1, scalar("SELECT count(*) FROM " + kind));
    }

    @Test
    void adminTaxonomyValidatesUrlsAndPreservesLinkedComponentType() throws Exception {
        var admin = login("admin@example.test");
        assertEquals(400, send(admin, "POST", "/api/admin/brands", "{\"name\":\"X\",\"status\":\"ACTIVE\",\"logoUrl\":\"javascript:alert(1)\"}", null).statusCode());
        assertEquals(409, send(admin, "PUT", "/api/admin/categories/1", "{\"name\":\"CPU\",\"status\":\"ACTIVE\",\"componentType\":\"RAM\"}", null).statusCode());
        assertEquals(1, scalar("SELECT count(*) FROM categories WHERE category_id=1 AND component_type IS NULL"));
    }

    private HttpClient client() {
        var client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).connectTimeout(Duration.ofSeconds(5)).build();
        clients.add(client);
        return client;
    }
    private HttpClient login(String email) throws Exception {
        var client = client();
        var result = send(client, "POST", "/api/auth/login", "{\"email\":\"" + email + "\",\"password\":\"Test-pass-123\"}", null);
        assertEquals(200, result.statusCode(), result.body());
        assertTrue(result.headers().allValues("Set-Cookie").stream().anyMatch(cookie -> cookie.startsWith("JSESSIONID=")));
        return client;
    }
    private void addCart(HttpClient client) throws Exception { assertEquals(200, send(client, "POST", "/api/customer/cart/items", "{\"productId\":1,\"quantity\":1}", null).statusCode()); }
    private HttpResponse<String> send(HttpClient client, String method, String path, String json, String key) throws Exception {
        var request = HttpRequest.newBuilder(base.resolve(path)).timeout(Duration.ofSeconds(10)).header("Content-Type", "application/json");
        if (key != null) request.header("Idempotency-Key", key);
        return client.send(request.method(method, json == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json)).build(), HttpResponse.BodyHandlers.ofString());
    }
    private JsonNode body(HttpResponse<String> response) throws Exception { return JSON.readTree(response.body()); }
    private void error(HttpResponse<String> response, int status, String code) throws Exception {
        assertEquals(status, response.statusCode(), response.body());
        assertTrue(response.headers().firstValue("Content-Type").orElse("").startsWith("application/json"));
        assertEquals(code, body(response).path("code").asText());
        assertFalse(body(response).path("message").asText().isBlank());
    }
    private void sql(String command) throws SQLException { try (var statement = connection.createStatement()) { statement.execute(command); } }
    private int scalar(String query) throws SQLException { try (var statement = connection.createStatement(); var rows = statement.executeQuery(query)) { assertTrue(rows.next()); return rows.getInt(1); } }
}
