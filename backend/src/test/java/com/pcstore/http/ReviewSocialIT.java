package com.pcstore.http;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.controller.AuthServlet;
import com.pcstore.controller.MediaContentServlet;
import com.pcstore.controller.ReviewLikeServlet;
import com.pcstore.controller.ReviewModerationServlet;
import com.pcstore.filter.*;
import com.pcstore.service.MediaAccessService;
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
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/** Real session/filter/Servlet/Service/JPA requests, in a disposable PostgreSQL schema. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Timeout(60)
class ReviewSocialIT {
    @TempDir static Path temp;
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String LIKE = "/api/customer/reviews/1/like";
    private static final String MODERATION = "/api/admin/reviews/1/moderation";
    private static final String HIDE = "{\"status\":\"HIDDEN\",\"moderationReason\":\"  Nội dung không phù hợp  \"}";
    private static final String RESTORE = "{\"status\":\"PUBLISHED\"}";
    private static final UUID MEDIA_ID = UUID.fromString("27000000-0000-0000-0000-000000000001");
    private Connection db;
    private String schema;
    private EntityManagerFactory factory;
    private EntityManagerFactory previousFactory;
    private boolean factoryInstalled;
    private Tomcat tomcat;
    private URI base;
    private String passwordHash;
    private final List<HttpClient> clients = new ArrayList<>();

    @BeforeAll void start() throws Exception {
        String url = Objects.requireNonNull(System.getenv("TEST_DB_URL"), "Set TEST_DB_URL to a separate test database");
        String user = Objects.requireNonNull(System.getenv("TEST_DB_USER"), "Set TEST_DB_USER");
        String password = Objects.requireNonNull(System.getenv("TEST_DB_PASSWORD"), "Set TEST_DB_PASSWORD");
        schema = "t27_http_" + UUID.randomUUID().toString().replace("-", "");
        db = DriverManager.getConnection(url, user, password);
        sql("CREATE SCHEMA " + schema);
        sql("SET search_path TO " + schema);
        factory = PersistenceManager.createEntityManagerFactory(url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema, user, password);
        var field = PersistenceManager.class.getDeclaredField("factory");
        field.setAccessible(true);
        previousFactory = (EntityManagerFactory) field.get(null);
        field.set(null, factory);
        factoryInstalled = true;
        passwordHash = PasswordUtil.hash("Test-pass-123");
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
        for (HttpServlet servlet : List.of(new AuthServlet(), new MediaContentServlet(), new ReviewLikeServlet(), new ReviewModerationServlet())) {
            var annotation = servlet.getClass().getAnnotation(WebServlet.class);
            var wrapper = Tomcat.addServlet(context, servlet.getClass().getSimpleName(), servlet);
            for (String pattern : annotation.urlPatterns()) context.addServletMappingDecoded(pattern, wrapper.getName());
        }
        tomcat.start();
        base = URI.create("http://127.0.0.1:" + tomcat.getConnector().getLocalPort());
    }

    @BeforeEach void fixture() throws Exception {
        clients.forEach(HttpClient::close);
        clients.clear();
        sql("TRUNCATE users,brands,categories RESTART IDENTITY CASCADE");
        try (var statement = db.prepareStatement("INSERT INTO users(full_name,email,password_hash,role) VALUES (?,?,?,?)")) {
            for (String email : List.of("a@example.test", "b@example.test", "admin@example.test", "c@example.test")) {
                statement.setString(1, email); statement.setString(2, email); statement.setString(3, passwordHash);
                statement.setString(4, email.startsWith("admin") ? "ADMIN" : "CUSTOMER");
                statement.executeUpdate();
            }
        }
        try (var stream = Objects.requireNonNull(getClass().getResourceAsStream("/fixtures/t27_review_social.sql"))) {
            sql(new String(stream.readAllBytes(), StandardCharsets.UTF_8));
        }
    }

    @AfterAll void stop() throws Exception {
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
                if (db != null) {
                    try { if (schema != null && schema.matches("t27_http_[a-f0-9]{32}")) sql("DROP SCHEMA " + schema + " CASCADE"); }
                    finally { db.close(); }
                }
            }
        }
    }

    @Test void repeatedLikeAndUnlikeKeepOneRowAndReturnCurrentCount() throws Exception {
        var customer = login("b@example.test");
        var first = send(customer, "PUT", LIKE, null);
        assertEquals(200, first.statusCode(), first.body());
        assertEquals(1, body(first).path("reviewId").asInt());
        assertEquals(1, body(first).path("likesCount").asLong());
        assertTrue(body(first).path("isLiked").asBoolean());
        String timestamp = scalar("SELECT created_at::text FROM review_likes");
        var repeated = send(customer, "PUT", LIKE, null);
        assertEquals(200, repeated.statusCode(), repeated.body());
        assertEquals(1, body(repeated).path("likesCount").asLong());
        assertTrue(body(repeated).path("isLiked").asBoolean());
        assertEquals(timestamp, scalar("SELECT created_at::text FROM review_likes"));
        assertEquals("1", scalar("SELECT count(*) FROM review_likes"));
        for (int i = 0; i < 2; i++) {
            var removed = send(customer, "DELETE", LIKE, null);
            assertEquals(200, removed.statusCode(), removed.body());
            assertEquals(0, body(removed).path("likesCount").asLong());
            assertFalse(body(removed).path("isLiked").asBoolean());
        }
        assertEquals("0", scalar("SELECT count(*) FROM review_likes"));
    }

    @Test void unlikeOnlyRemovesTheLoggedInCustomersLikeAndCountsOtherUsers() throws Exception {
        sql("INSERT INTO review_likes(review_id,user_id,created_at) VALUES (1,1,'2026-10-04 10:00'),(1,2,'2026-10-04 10:00')");
        var response = send(login("b@example.test"), "DELETE", LIKE, null);
        assertEquals(200, response.statusCode(), response.body());
        assertEquals(1, body(response).path("likesCount").asLong());
        assertFalse(body(response).path("isLiked").asBoolean());
        assertEquals("1", scalar("SELECT user_id FROM review_likes"));
        // The owner can remove a legacy self-like, but cannot create one.
        assertEquals(200, send(login("a@example.test"), "DELETE", LIKE, null).statusCode());
        assertEquals("0", scalar("SELECT count(*) FROM review_likes"));
    }

    @Test void authorIsDerivedFromThePurchasedOrderLineAndCannotSelfLike() throws Exception {
        error(send(login("a@example.test"), "PUT", LIKE, null), 403, "SELF_LIKE_NOT_ALLOWED");
        error(send(login("b@example.test"), "PUT", "/api/customer/reviews/2/like", null), 403, "SELF_LIKE_NOT_ALLOWED");
        assertEquals(200, send(login("a@example.test"), "PUT", "/api/customer/reviews/2/like", null).statusCode());
        assertEquals("1", scalar("SELECT count(*) FROM review_likes"));
    }

    @Test void guestAndWrongRoleCannotUseCustomerOrAdminEndpoints() throws Exception {
        var guest = client();
        error(send(guest, "PUT", LIKE, null), 401, "UNAUTHORIZED");
        error(send(guest, "DELETE", LIKE, null), 401, "UNAUTHORIZED");
        error(send(guest, "PATCH", MODERATION, HIDE), 401, "UNAUTHORIZED");
        error(send(login("admin@example.test"), "PUT", LIKE, null), 403, "FORBIDDEN");
        error(send(login("admin@example.test"), "DELETE", LIKE, null), 403, "FORBIDDEN");
        error(send(login("a@example.test"), "PATCH", MODERATION, HIDE), 403, "FORBIDDEN");
        assertEquals("0", scalar("SELECT count(*) FROM review_likes"));
        assertEquals("PUBLISHED", scalar("SELECT status FROM product_reviews WHERE review_id=1"));
    }

    @Test void serviceRechecksInactiveUsersAndChangedRolesDespiteExistingSession() throws Exception {
        var customer = login("b@example.test");
        var admin = login("admin@example.test");
        sql("UPDATE users SET status='INACTIVE' WHERE user_id=2");
        error(send(customer, "PUT", LIKE, null), 401, "UNAUTHORIZED");
        error(send(customer, "DELETE", LIKE, null), 401, "UNAUTHORIZED");
        sql("UPDATE users SET status='ACTIVE',role='ADMIN' WHERE user_id=2");
        error(send(customer, "PUT", LIKE, null), 403, "FORBIDDEN");
        sql("UPDATE users SET role='CUSTOMER' WHERE user_id=3");
        error(send(admin, "PATCH", MODERATION, HIDE), 403, "FORBIDDEN");
        sql("UPDATE users SET status='INACTIVE',role='ADMIN' WHERE user_id=3");
        error(send(admin, "PATCH", MODERATION, HIDE), 401, "UNAUTHORIZED");
        assertEquals("PUBLISHED", scalar("SELECT status FROM product_reviews WHERE review_id=1"));
    }

    @ParameterizedTest @ValueSource(ints = {3, 4, 999})
    void missingHiddenAndDeletedReviewsRejectBothLikeAndUnlike(int id) throws Exception {
        var customer = login("b@example.test");
        for (String method : List.of("PUT", "DELETE"))
            error(send(customer, method, "/api/customer/reviews/" + id + "/like", null), 404, "REVIEW_NOT_FOUND");
        assertEquals("0", scalar("SELECT count(*) FROM review_likes"));
    }

    @Test void hidingAndRestoringUpdateOnlyModerationAndPreserveReviewAndLikes() throws Exception {
        send(login("b@example.test"), "PUT", LIKE, null);
        var admin = login("admin@example.test");
        LocalDateTime before = LocalDateTime.now(ZoneId.of("Asia/Bangkok")).minusSeconds(1);
        var hidden = send(admin, "PATCH", MODERATION, HIDE);
        assertEquals(200, hidden.statusCode(), hidden.body());
        assertEquals("HIDDEN", body(hidden).path("status").asText());
        assertEquals("Nội dung không phù hợp", body(hidden).path("moderationReason").asText());
        assertEquals(3, body(hidden).path("moderatedBy").asInt());
        LocalDateTime at = LocalDateTime.parse(body(hidden).path("moderatedAt").asText());
        assertFalse(at.isBefore(before));
        assertFalse(at.isAfter(LocalDateTime.now(ZoneId.of("Asia/Bangkok")).plusSeconds(1)));
        var repeatedHide = send(admin, "PATCH", MODERATION, "{\"status\":\"HIDDEN\",\"moderationReason\":\"Another reason\"}");
        assertEquals(200, repeatedHide.statusCode(), repeatedHide.body());
        assertEquals(body(hidden), body(repeatedHide));
        var restored = send(admin, "PATCH", MODERATION, RESTORE);
        assertEquals(200, restored.statusCode(), restored.body());
        assertEquals("PUBLISHED", body(restored).path("status").asText());
        assertTrue(body(restored).path("moderationReason").isNull());
        assertEquals(3, body(restored).path("moderatedBy").asInt());
        var repeatedRestore = send(admin, "PATCH", MODERATION, RESTORE);
        assertEquals(body(restored), body(repeatedRestore));
        assertEquals("Published review by A", scalar("SELECT content FROM product_reviews WHERE review_id=1"));
        assertEquals("5", scalar("SELECT rating FROM product_reviews WHERE review_id=1"));
        assertEquals("1", scalar("SELECT count(*) FROM review_likes"));
    }

    @ParameterizedTest @ValueSource(strings = {"{}", "{\"status\":\"DELETED\"}", "{\"status\":null}"})
    void invalidModerationTargetCannotChangeReview(String json) throws Exception {
        error(send(login("admin@example.test"), "PATCH", MODERATION, json), 400, "INVALID_REVIEW_STATUS");
        assertEquals("PUBLISHED", scalar("SELECT status FROM product_reviews WHERE review_id=1"));
    }

    @Test void hideRequiresNonblankReasonAndRestoreRejectsAnUnusedReason() throws Exception {
        var admin = login("admin@example.test");
        for (String json : List.of("{\"status\":\"HIDDEN\"}", "{\"status\":\"HIDDEN\",\"moderationReason\":null}",
                "{\"status\":\"HIDDEN\",\"moderationReason\":\"  \\n \"}",
                "{\"status\":\"PUBLISHED\",\"moderationReason\":\"unused\"}",
                "{\"status\":\"HIDDEN\",\"moderationReason\":\"" + "x".repeat(1001) + "\"}"))
            error(send(admin, "PATCH", MODERATION, json), 400, "INVALID_MODERATION_REASON");
        assertEquals("PUBLISHED", scalar("SELECT status FROM product_reviews WHERE review_id=1"));
        assertEquals("0", scalar("SELECT count(*) FROM product_reviews WHERE review_id=1 AND moderated_at IS NOT NULL"));
    }

    @Test void adminCanRestoreHiddenButCannotHideOrRestoreDeletedReview() throws Exception {
        var admin = login("admin@example.test");
        var restored = send(admin, "PATCH", "/api/admin/reviews/3/moderation", RESTORE);
        assertEquals(200, restored.statusCode(), restored.body());
        assertEquals("PUBLISHED", body(restored).path("status").asText());
        for (String json : List.of(HIDE, RESTORE))
            error(send(admin, "PATCH", "/api/admin/reviews/4/moderation", json), 409, "REVIEW_DELETED");
        error(send(admin, "PATCH", "/api/admin/reviews/999/moderation", HIDE), 404, "REVIEW_NOT_FOUND");
        assertEquals("DELETED", scalar("SELECT status FROM product_reviews WHERE review_id=4"));
    }

    @Test void hiddenMediaIsBlockedByExistingT21EndpointAndRestoredVisibilityReturns() throws Exception {
        var access = new MediaAccessService(factory);
        assertEquals("t27-fixture-asset", access.resolve(MEDIA_ID, null).assetId());
        var admin = login("admin@example.test");
        assertEquals(200, send(admin, "PATCH", MODERATION, HIDE).statusCode());
        var denied = send(client(), "GET", "/api/media/" + MEDIA_ID + "/content", null);
        error(denied, 404, "MEDIA_NOT_FOUND");
        assertEquals("private, no-store", denied.headers().firstValue("Cache-Control").orElseThrow());
        error(send(login("b@example.test"), "GET", "/api/media/" + MEDIA_ID + "/content", null), 404, "MEDIA_NOT_FOUND");
        assertEquals("t27-fixture-asset", access.resolve(MEDIA_ID, 1).assetId());
        assertEquals(200, send(admin, "PATCH", MODERATION, RESTORE).statusCode());
        assertEquals("t27-fixture-asset", access.resolve(MEDIA_ID, null).assetId());
    }

    @ParameterizedTest @ValueSource(strings = {"{", "null", "", "[]", "{\"status\":\"HIDDEN\",\"moderationReason\":1}",
            "{\"status\":\"HIDDEN\",\"moderationReason\":true}", "{\"status\":\"HIDDEN\",\"moderationReason\":1.5}",
            "{\"status\":\"HIDDEN\",\"moderationReason\":\"ok\",\"moderatedBy\":2}", "{\"status\":\"PUBLISHED\"} {}"})
    void malformedOrForgedModerationBodiesAreRejected(String json) throws Exception {
        error(send(login("admin@example.test"), "PATCH", MODERATION, json), 400, "INVALID_JSON");
        assertEquals("PUBLISHED", scalar("SELECT status FROM product_reviews WHERE review_id=1"));
    }

    @ParameterizedTest @ValueSource(strings = {"0", "-1", "abc", "2147483648", "1.5"})
    void invalidIdsReturnJson400ForAllOperations(String id) throws Exception {
        var customer = login("b@example.test");
        for (String method : List.of("PUT", "DELETE"))
            error(send(customer, method, "/api/customer/reviews/" + id + "/like", null), 400, "INVALID_ID");
        error(send(login("admin@example.test"), "PATCH", "/api/admin/reviews/" + id + "/moderation", HIDE), 400, "INVALID_ID");
    }

    @Test void unsupportedMethodsAndUnknownPathsReturnJsonWithoutAddingT26Routes() throws Exception {
        var customer = login("b@example.test");
        error(send(customer, "POST", LIKE, null), 405, "METHOD_NOT_ALLOWED");
        error(send(customer, "PUT", "/api/customer/reviews/1/toggle", null), 404, "NOT_FOUND");
        error(send(customer, "PUT", "/api/customer/reviews/1/like/extra", null), 404, "NOT_FOUND");
        error(send(login("admin@example.test"), "PUT", MODERATION, HIDE), 405, "METHOD_NOT_ALLOWED");
    }

    @Test void likeAndUnlikeRejectBodiesInsteadOfAcceptingForgedUserIds() throws Exception {
        var customer = login("b@example.test");
        for (String method : List.of("PUT", "DELETE"))
            error(send(customer, method, LIKE, "{\"userId\":1}"), 400, "INVALID_JSON");
        assertEquals("0", scalar("SELECT count(*) FROM review_likes"));
    }

    @Test void concurrentRepeatedLikesAndUnlikesStayIdempotent() throws Exception {
        var customer = login("b@example.test");
        var likes = concurrently(() -> send(customer, "PUT", LIKE, null), () -> send(customer, "PUT", LIKE, null));
        for (var response : likes) {
            assertEquals(200, response.statusCode(), response.body());
            assertEquals(1, body(response).path("likesCount").asLong());
        }
        assertEquals("1", scalar("SELECT count(*) FROM review_likes"));
        var unlikes = concurrently(() -> send(customer, "DELETE", LIKE, null), () -> send(customer, "DELETE", LIKE, null));
        for (var response : unlikes) {
            assertEquals(200, response.statusCode(), response.body());
            assertEquals(0, body(response).path("likesCount").asLong());
        }
        assertEquals("0", scalar("SELECT count(*) FROM review_likes"));
    }

    @Test void concurrentLikeAndHideCannotLeaveReviewPublishedOrCreateDuplicates() throws Exception {
        var customer = login("b@example.test");
        var admin = login("admin@example.test");
        var responses = concurrently(() -> send(customer, "PUT", LIKE, null), () -> send(admin, "PATCH", MODERATION, HIDE));
        var like = responses.get(0);
        assertTrue(like.statusCode() == 200 || like.statusCode() == 404, like.body());
        if (like.statusCode() == 404) error(like, 404, "REVIEW_NOT_FOUND");
        assertEquals(200, responses.get(1).statusCode(), responses.get(1).body());
        assertEquals("HIDDEN", scalar("SELECT status FROM product_reviews WHERE review_id=1"));
        assertEquals(like.statusCode() == 200 ? "1" : "0", scalar("SELECT count(*) FROM review_likes"));
        error(send(customer, "PUT", LIKE, null), 404, "REVIEW_NOT_FOUND");
    }

    @Test void differentCustomersCanLikeTheSameReviewWithoutLosingCounts() throws Exception {
        var b = login("b@example.test");
        var c = login("c@example.test");
        var responses = concurrently(() -> send(b, "PUT", LIKE, null), () -> send(c, "PUT", LIKE, null));
        var counts = new ArrayList<Long>();
        for (var response : responses) {
            assertEquals(200, response.statusCode(), response.body());
            counts.add(body(response).path("likesCount").asLong());
            assertTrue(body(response).path("isLiked").asBoolean());
        }
        Collections.sort(counts);
        assertEquals(List.of(1L, 2L), counts);
        assertEquals("2", scalar("SELECT count(*) FROM review_likes"));
        var unlike = send(b, "DELETE", LIKE, null);
        assertEquals(1, body(unlike).path("likesCount").asLong());
        assertEquals("4", scalar("SELECT user_id FROM review_likes"));
    }

    @Test void concurrentHideRetriesKeepOneReasonAndOneModerationTimestamp() throws Exception {
        var admin = login("admin@example.test");
        var responses = concurrently(() -> send(admin, "PATCH", MODERATION, HIDE),
                () -> send(admin, "PATCH", MODERATION, "{\"status\":\"HIDDEN\",\"moderationReason\":\"Other reason\"}"));
        for (var response : responses) assertEquals(200, response.statusCode(), response.body());
        assertEquals(body(responses.get(0)), body(responses.get(1)));
        assertEquals("HIDDEN", scalar("SELECT status FROM product_reviews WHERE review_id=1"));
        assertEquals(body(responses.get(0)).path("moderationReason").asText(),
                scalar("SELECT moderation_reason FROM product_reviews WHERE review_id=1"));
    }

    @Test void concurrentLikeAndUnlikeResponsesMatchASerialOrder() throws Exception {
        var customer = login("b@example.test");
        var responses = concurrently(() -> send(customer, "PUT", LIKE, null), () -> send(customer, "DELETE", LIKE, null));
        assertEquals(200, responses.get(0).statusCode(), responses.get(0).body());
        assertEquals(200, responses.get(1).statusCode(), responses.get(1).body());
        assertEquals(1, body(responses.get(0)).path("likesCount").asLong());
        assertTrue(body(responses.get(0)).path("isLiked").asBoolean());
        assertEquals(0, body(responses.get(1)).path("likesCount").asLong());
        assertFalse(body(responses.get(1)).path("isLiked").asBoolean());
        assertTrue(List.of("0", "1").contains(scalar("SELECT count(*) FROM review_likes")));
    }

    private List<HttpResponse<String>> concurrently(Callable<HttpResponse<String>> first, Callable<HttpResponse<String>> second) throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            var barrier = new CyclicBarrier(2);
            var a = executor.submit(() -> { barrier.await(10, TimeUnit.SECONDS); return first.call(); });
            var b = executor.submit(() -> { barrier.await(10, TimeUnit.SECONDS); return second.call(); });
            return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
        }
    }

    private HttpClient client() {
        var client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).connectTimeout(Duration.ofSeconds(5)).build();
        clients.add(client);
        return client;
    }
    private HttpClient login(String email) throws Exception {
        var client = client();
        var response = send(client, "POST", "/api/auth/login", "{\"email\":\"" + email + "\",\"password\":\"Test-pass-123\"}");
        assertEquals(200, response.statusCode(), response.body());
        return client;
    }
    private HttpResponse<String> send(HttpClient client, String method, String path, String json) throws Exception {
        var request = HttpRequest.newBuilder(base.resolve(path)).timeout(Duration.ofSeconds(20)).header("Origin", base.toString());
        if (json != null) request.header("Content-Type", "application/json");
        request.method(method, json == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }
    private JsonNode body(HttpResponse<String> response) throws Exception { return JSON.readTree(response.body()); }
    private void error(HttpResponse<String> response, int status, String code) throws Exception {
        assertEquals(status, response.statusCode(), response.body());
        assertEquals(code, body(response).path("code").asText());
    }
    private void sql(String query) throws SQLException { try (var statement = db.createStatement()) { statement.execute(query); } }
    private String scalar(String query) throws SQLException {
        try (var statement = db.createStatement(); var rows = statement.executeQuery(query)) { assertTrue(rows.next()); return rows.getString(1); }
    }
}
