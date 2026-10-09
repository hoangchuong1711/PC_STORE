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
class SetupSocialHttpIT {
    @TempDir Path temp;
    private static final ObjectMapper JSON = new ObjectMapper();
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
        schema = "t30_http_" + UUID.randomUUID().toString().replace("-", "");
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
        for (HttpServlet servlet : List.of(new AuthServlet(), new SetupServlet(), new SetupSocialServlet(), new MediaContentServlet())) {
            WebServlet annotation = servlet.getClass().getAnnotation(WebServlet.class);
            var wrapper = Tomcat.addServlet(context, servlet.getClass().getSimpleName(), servlet);
            wrapper.setLoadOnStartup(1);
            for (String pattern : annotation.urlPatterns()) context.addServletMappingDecoded(pattern, wrapper.getName());
        }
        sql("INSERT INTO setup_posts(user_id,title,description,created_at,updated_at) VALUES (1,'Older','Desk','2026-01-01','2026-01-01'),(2,'Newer','Desk','2026-01-02','2026-01-02'),(1,'Newest','Desk','2026-01-02','2026-01-02')");
        sql("INSERT INTO setup_post_products(post_id,product_id) VALUES (1,1),(2,1),(3,1)");
        sql("INSERT INTO setup_images(post_id,image_url,sort_order) VALUES (1,'https://example.test/1.jpg',0),(2,'https://example.test/2.jpg',0),(3,'https://example.test/3.jpg',0)");
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
                    try { if (schema != null && schema.matches("t30_http_[a-f0-9]{32}")) sql("DROP SCHEMA " + schema + " CASCADE"); }
                    finally { connection.close(); }
                }
            }
        }
    }

    @Test void likesAreIdempotentAndRankingHasStablePagination() throws Exception {
        var guest = client(); var a = login("a@example.test"); var b = login("b@example.test");
        var initial = send(guest,"GET","/api/setups/ranking",null,null);
        assertEquals(200,initial.statusCode(),initial.body());
        assertEquals(3,body(initial).get(0).path("post").path("postId").asInt());
        for (int i=0;i<2;i++) {
            var liked = send(a,"PUT","/api/setup-likes/1",null,null);
            assertEquals(200,liked.statusCode(),liked.body());
            assertEquals(1,body(liked).path("likeCount").asInt());
            assertTrue(body(liked).path("liked").asBoolean());
        }
        assertEquals(200,send(b,"PUT","/api/setup-likes/1",null,null).statusCode());
        var ranking=body(send(a,"GET","/api/setups/ranking?limit=1",null,null));
        assertEquals(1,ranking.size());
        assertEquals(1,ranking.get(0).path("post").path("postId").asInt());
        assertEquals(2,ranking.get(0).path("likeCount").asInt());
        assertTrue(ranking.get(0).path("liked").asBoolean());
        assertEquals(1,ranking.get(0).path("post").path("products").get(0).path("productId").asInt());
        assertEquals(3,body(send(guest,"GET","/api/setups/ranking?offset=1&limit=1",null,null)).get(0).path("post").path("postId").asInt());
        for(int i=0;i<2;i++) {
            var unliked=send(a,"DELETE","/api/setup-likes/1",null,null);
            assertEquals(200,unliked.statusCode());
            assertEquals(1,body(unliked).path("likeCount").asInt());
            assertFalse(body(unliked).path("liked").asBoolean());
        }
        assertEquals(1,scalar("SELECT count(*) FROM setup_likes WHERE post_id=1"));
    }

    @Test void moderationHidesAndRestoresWithoutLosingLikes() throws Exception {
        var a=login("a@example.test"); var admin=login("admin@example.test");
        UUID media = UUID.randomUUID();
        sql("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,resource_type,created_at,expires_at,attached_at) VALUES ('" + media + "',1,'SETUP','ATTACHED','pcstore/temp/setup/" + media + "','asset','image/jpeg',100,4,4,'image',now(),now()+interval '2 hours',now())");
        sql("UPDATE setup_images SET media_asset_id='" + media + "' WHERE post_id=1");
        var access = new com.pcstore.service.MediaAccessService(factory);
        assertEquals("asset", access.resolve(media, null).assetId());
        assertEquals(200,send(a,"PUT","/api/setup-likes/1",null,null).statusCode());
        var hidden=send(admin,"PUT","/api/admin/setups/1/status","{\"status\":\"HIDDEN\",\"reason\":\"  Spam  \"}",null);
        assertEquals(200,hidden.statusCode(),hidden.body());
        assertEquals("Spam",body(hidden).path("moderationReason").asText());
        assertEquals(3,body(hidden).path("moderatedBy").asInt());
        assertFalse(body(hidden).path("moderatedAt").isNull());
        assertEquals(2,body(send(a,"GET","/api/setups/ranking",null,null)).size());
        error(send(a,"GET","/api/setups/1",null,null),404,"SETUP_NOT_FOUND");
        error(send(client(),"GET","/api/media/"+media+"/content",null,null),404,"MEDIA_NOT_FOUND");
        assertEquals("asset", access.resolve(media, 1).assetId());
        assertEquals(2,body(send(client(),"GET","/api/setups",null,null)).size());
        for(String method:List.of("GET","PUT","DELETE")) error(send(a,method,"/api/setup-likes/1",null,null),404,"SETUP_NOT_FOUND");
        assertEquals(1,body(send(admin,"GET","/api/admin/setups?status=HIDDEN",null,null)).size());
        assertEquals("HIDDEN",body(send(admin,"GET","/api/admin/setups/1",null,null)).path("post").path("status").asText());
        var restored=send(admin,"PUT","/api/admin/setups/1/status","{\"status\":\"PUBLISHED\",\"reason\":\"Reviewed\"}",null);
        assertEquals(200,restored.statusCode(),restored.body());
        var first=body(send(a,"GET","/api/setups/ranking",null,null)).get(0);
        assertEquals(1,first.path("post").path("postId").asInt());
        assertEquals(1,first.path("likeCount").asInt());
        assertTrue(first.path("liked").asBoolean());
        assertEquals("asset", access.resolve(media, null).assetId());
    }

    @Test void concurrentLikesRemainUniqueAndSerializeWithModeration() throws Exception {
        var a=login("a@example.test"); var admin=login("admin@example.test");
        try (var pool=java.util.concurrent.Executors.newFixedThreadPool(6)) {
            var gate=new java.util.concurrent.CountDownLatch(1);
            var requests=new ArrayList<java.util.concurrent.Future<HttpResponse<String>>>();
            for(int i=0;i<6;i++) requests.add(pool.submit(() -> { gate.await(); return send(a,"PUT","/api/setup-likes/1",null,null); }));
            gate.countDown();
            for(var request:requests) assertEquals(200,request.get().statusCode());
            assertEquals(1,scalar("SELECT count(*) FROM setup_likes WHERE post_id=1"));
            var race=new java.util.concurrent.CountDownLatch(1);
            var like=pool.submit(() -> { race.await(); return send(a,"PUT","/api/setup-likes/2",null,null); });
            var hide=pool.submit(() -> { race.await(); return send(admin,"PUT","/api/admin/setups/2/status","{\"status\":\"HIDDEN\",\"reason\":\"Spam\"}",null); });
            race.countDown();
            assertEquals(200,hide.get().statusCode());
            assertTrue(List.of(200,404).contains(like.get().statusCode()));
            error(send(a,"PUT","/api/setup-likes/2",null,null),404,"SETUP_NOT_FOUND");
            assertEquals(2,body(send(a,"GET","/api/setups/ranking",null,null)).size());
        }
    }

    @Test void permissionsAndInvalidInputsCannotMutatePosts() throws Exception {
        var guest=client(); var a=login("a@example.test"); var admin=login("admin@example.test");
        for(String method:List.of("PUT","DELETE")) error(send(guest,method,"/api/setup-likes/1",null,null),401,"UNAUTHORIZED");
        error(send(guest,"GET","/api/admin/setups",null,null),401,"UNAUTHORIZED");
        error(send(a,"PUT","/api/admin/setups/1/status","{}",null),403,"FORBIDDEN");
        for(String json:List.of("null","{}","{\"status\":\"HIDDEN\",\"reason\":\" \"}","{\"status\":\"DELETED\",\"reason\":\"x\"}"))
            assertEquals(400,send(admin,"PUT","/api/admin/setups/1/status",json,null).statusCode());
        assertEquals(400,send(guest,"GET","/api/setups/ranking?limit=0",null,null).statusCode());
        assertEquals(400,send(admin,"GET","/api/admin/setups?status=WRONG",null,null).statusCode());
        error(send(a,"PUT","/api/setup-likes/999",null,null),404,"SETUP_NOT_FOUND");
        assertEquals(405,send(a,"POST","/api/setup-likes/1",null,null).statusCode());
        sql("UPDATE users SET status='INACTIVE' WHERE user_id IN (1,3)");
        error(send(a,"PUT","/api/setup-likes/1",null,null),403,"FORBIDDEN");
        error(send(admin,"PUT","/api/admin/setups/1/status","{\"status\":\"HIDDEN\",\"reason\":\"x\"}",null),403,"FORBIDDEN");
        assertEquals(3,scalar("SELECT count(*) FROM setup_posts WHERE status='PUBLISHED'"));
        assertEquals(0,scalar("SELECT count(*) FROM setup_likes"));
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

