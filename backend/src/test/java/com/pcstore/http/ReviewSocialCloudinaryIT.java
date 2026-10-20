package com.pcstore.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.config.PersistenceManager;
import com.pcstore.controller.AuthServlet;
import com.pcstore.controller.MediaContentServlet;
import com.pcstore.controller.ReviewModerationServlet;
import com.pcstore.entity.MediaAsset;
import com.pcstore.filter.AdminAuthorizationFilter;
import com.pcstore.filter.AuthenticationFilter;
import com.pcstore.filter.CorsFilter;
import com.pcstore.service.CloudinaryImageStorage;
import com.pcstore.service.MediaAttachmentService;
import com.pcstore.service.MediaImageService;
import com.pcstore.service.MediaUploadService;
import com.pcstore.util.PasswordUtil;
import jakarta.persistence.EntityManagerFactory;
import jakarta.servlet.Filter;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import org.apache.catalina.startup.Tomcat;
import org.apache.tomcat.util.descriptor.web.FilterDef;
import org.apache.tomcat.util.descriptor.web.FilterMap;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Opt-in only: real authenticated image, real HTTP, and a schema owned by this test. */
@EnabledIfEnvironmentVariable(named = "RUN_T27_CLOUDINARY", matches = "true")
class ReviewSocialCloudinaryIT {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int REVIEW_ID = 2;
    private static final int OWNER_ID = 2;
    private static final String MODERATION = "/api/admin/reviews/2/moderation";
    @TempDir Path temp;
    private Connection db;
    private String schema;
    private boolean schemaCreated;
    private EntityManagerFactory factory;
    private EntityManagerFactory previousFactory;
    private boolean factoryInstalled;
    private Tomcat tomcat;
    private URI base;
    private CloudinaryImageStorage storage;
    private boolean uploadAttempted;
    private final Set<String> ownedPublicIds = new LinkedHashSet<>();
    private final List<HttpClient> clients = new ArrayList<>();

    @Test
    @Timeout(180)
    void authenticatedReviewImageFollowsHideAndRestoreThroughHttp() throws Exception {
        Throwable testFailure = null;
        try {
            start();
            fixture();
            var guest = client();
            var owner = login("b@example.test");
            var otherCustomer = login("a@example.test");
            var admin = login("admin@example.test");
            UUID mediaId = uploadAndAttach();
            String mediaPath = "/api/media/" + mediaId + "/content";
            String originalLink = mediaSnapshot(mediaId);

            byte[] published = readImage(guest, mediaPath);
            System.out.println("T27 Cloudinary: PUBLISHED guest GET 200, JPEG decoded");
            moderate(admin, "{\"status\":\"HIDDEN\",\"moderationReason\":\"Cloudinary integration test\"}", "HIDDEN");
            assertEquals(originalLink, mediaSnapshot(mediaId), "Hide must preserve the media link and metadata");
            assertMissing(guest, mediaPath);
            assertMissing(otherCustomer, mediaPath);
            assertArrayEquals(published, readImage(owner, mediaPath));
            System.out.println("T27 Cloudinary: HIDDEN guest/other customer GET 404, owner GET 200");

            moderate(admin, "{\"status\":\"PUBLISHED\"}", "PUBLISHED");
            assertEquals(originalLink, mediaSnapshot(mediaId), "Restore must preserve the media link and metadata");
            assertArrayEquals(published, readImage(guest, mediaPath));
            System.out.println("T27 Cloudinary: restored PUBLISHED guest GET 200, JPEG decoded");
        } catch (Exception | AssertionError error) {
            testFailure = error;
            throw error;
        } finally {
            cleanup(testFailure);
        }
    }

    private void start() throws Exception {
        String url = required("TEST_DB_URL");
        // Never migrate, seed or drop anything in the application database.
        if (!"jdbc:postgresql://127.0.0.1:55433/pcstore_test".equals(url))
            throw new IllegalStateException("Use only the dedicated pcstore_test database at 127.0.0.1:55433");
        storage = new CloudinaryImageStorage(required("CLOUDINARY_CLOUD_NAME"),
                required("CLOUDINARY_API_KEY"), required("CLOUDINARY_API_SECRET"));
        String user = required("TEST_DB_USER");
        String password = required("TEST_DB_PASSWORD");
        db = DriverManager.getConnection(url, user, password);
        schema = "t27_cloudinary_" + UUID.randomUUID().toString().replace("-", "");
        sql("CREATE SCHEMA " + schema);
        schemaCreated = true;
        sql("SET search_path TO " + schema);
        factory = PersistenceManager.createEntityManagerFactory(url + "?currentSchema=" + schema, user, password);
        var field = PersistenceManager.class.getDeclaredField("factory");
        field.setAccessible(true);
        previousFactory = (EntityManagerFactory) field.get(null);
        field.set(null, factory);
        factoryInstalled = true;
        tomcat = new Tomcat();
        tomcat.setBaseDir(temp.resolve("tomcat").toString());
        tomcat.setPort(0);
        tomcat.getConnector().setProperty("address", "127.0.0.1");
        var context = tomcat.addContext("", temp.toString());
        context.setParentClassLoader(getClass().getClassLoader());
        for (Filter filter : List.of(new CorsFilter(), new AuthenticationFilter(), new AdminAuthorizationFilter())) {
            String name = filter.getClass().getSimpleName();
            var definition = new FilterDef();
            definition.setFilterName(name);
            definition.setFilter(filter);
            context.addFilterDef(definition);
            var mapping = new FilterMap();
            mapping.setFilterName(name);
            for (String pattern : filter.getClass().getAnnotation(WebFilter.class).urlPatterns())
                mapping.addURLPattern(pattern);
            context.addFilterMap(mapping);
        }
        for (HttpServlet servlet : List.of(new AuthServlet(), new MediaContentServlet(), new ReviewModerationServlet())) {
            var wrapper = Tomcat.addServlet(context, servlet.getClass().getSimpleName(), servlet);
            for (String pattern : servlet.getClass().getAnnotation(WebServlet.class).urlPatterns())
                context.addServletMappingDecoded(pattern, wrapper.getName());
        }
        tomcat.start();
        base = URI.create("http://127.0.0.1:" + tomcat.getConnector().getLocalPort());
        System.out.println("T27 Cloudinary: started isolated schema " + schema);
    }

    private void fixture() throws Exception {
        String hash = PasswordUtil.hash("Test-pass-123");
        try (var statement = db.prepareStatement("INSERT INTO users(full_name,email,password_hash,role) VALUES (?,?,?,?)")) {
            for (String email : List.of("a@example.test", "b@example.test", "admin@example.test", "c@example.test")) {
                statement.setString(1, email);
                statement.setString(2, email);
                statement.setString(3, hash);
                statement.setString(4, email.startsWith("admin") ? "ADMIN" : "CUSTOMER");
                statement.executeUpdate();
            }
        }
        try (var stream = Objects.requireNonNull(getClass().getResourceAsStream("/fixtures/t27_review_social.sql"))) {
            sql(new String(stream.readAllBytes(), StandardCharsets.UTF_8));
        }
        // The fixture's fake asset belongs to customer A/review 1. Only B/review 2 uses Cloudinary here.
        try (var statement = db.createStatement();
             var rows = statement.executeQuery("SELECT count(*) FROM media_assets WHERE user_id=2")) {
            assertTrue(rows.next());
            assertEquals(0, rows.getInt(1));
        }
    }

    private UUID uploadAndAttach() throws Exception {
        var png = new ByteArrayOutputStream();
        assertTrue(ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", png));
        uploadAttempted = true;
        var uploaded = new MediaUploadService(factory, new MediaImageService(), storage)
                .upload(OWNER_ID, "REVIEW", png.toByteArray(), "image/png");
        UUID mediaId = uploaded.mediaId();
        // The ID is generated by T21. Remember it before any assertion or attachment can fail.
        ownedPublicIds.add("pcstore/temp/review/" + mediaId);
        assertEquals("REVIEW", uploaded.module());
        assertEquals("TEMP", uploaded.status());
        try (var em = factory.createEntityManager()) {
            var asset = em.find(MediaAsset.class, mediaId);
            assertNotNull(asset);
            assertEquals(OWNER_ID, asset.getOwnerId());
            assertEquals("REVIEW", asset.getModule());
            assertEquals("image", asset.getResourceType());
            assertEquals("TEMP", asset.getStatus());
            assertEquals("image/jpeg", asset.getMimeType());
            assertEquals("pcstore/temp/review/" + mediaId, asset.getPublicId());
            assertNotNull(asset.getCloudinaryAssetId());
            assertFalse(asset.getCloudinaryAssetId().isBlank());
            assertTrue(asset.getSizeBytes() > 0);
            var tx = em.getTransaction();
            tx.begin();
            try {
                new MediaAttachmentService().attachReviewMedia(em, OWNER_ID, REVIEW_ID, List.of(mediaId));
                tx.commit();
            } catch (RuntimeException error) {
                if (tx.isActive()) tx.rollback();
                throw error;
            }
            assertEquals("ATTACHED", asset.getStatus());
        }
        System.out.println("T27 Cloudinary: uploaded and attached " + "pcstore/temp/review/" + mediaId);
        return mediaId;
    }

    private void moderate(HttpClient admin, String json, String status) throws Exception {
        var response = send(admin, "PATCH", MODERATION, json);
        assertEquals(200, response.statusCode(), "Admin moderation request failed");
        var body = JSON.readTree(response.body());
        assertEquals(REVIEW_ID, body.path("reviewId").asInt());
        assertEquals(status, body.path("status").asText());
    }

    private byte[] readImage(HttpClient client, String path) throws Exception {
        var response = send(client, "GET", path, null);
        assertEquals(200, response.statusCode(), "Expected a readable image from the backend");
        assertEquals("image/jpeg", response.headers().firstValue("Content-Type").orElseThrow());
        assertEquals("private, no-store", response.headers().firstValue("Cache-Control").orElseThrow());
        try (var stream = new ByteArrayInputStream(response.body())) {
            var image = ImageIO.read(stream);
            assertNotNull(image, "The HTTP body must decode as an actual image");
            assertEquals(4, image.getWidth());
            assertEquals(4, image.getHeight());
        }
        return response.body();
    }

    private void assertMissing(HttpClient client, String path) throws Exception {
        var response = send(client, "GET", path, null);
        assertEquals(404, response.statusCode());
        assertEquals("MEDIA_NOT_FOUND", JSON.readTree(response.body()).path("code").asText());
        assertEquals("private, no-store", response.headers().firstValue("Cache-Control").orElseThrow());
    }

    private String mediaSnapshot(UUID mediaId) throws SQLException {
        try (var statement = db.prepareStatement(
                "SELECT json_build_object('asset',row_to_json(a),'link',row_to_json(r))::text "
                + "FROM media_assets a JOIN review_media r ON r.media_asset_id=a.media_id "
                + "WHERE a.media_id=? AND r.review_id=?")) {
            statement.setObject(1, mediaId);
            statement.setInt(2, REVIEW_ID);
            try (var rows = statement.executeQuery()) {
                assertTrue(rows.next(), "The real image must stay linked to the review");
                String snapshot = rows.getString(1);
                assertFalse(rows.next());
                return snapshot;
            }
        }
    }

    private HttpClient client() {
        var client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .connectTimeout(Duration.ofSeconds(5)).build();
        clients.add(client);
        return client;
    }

    private HttpClient login(String email) throws Exception {
        var client = client();
        var response = send(client, "POST", "/api/auth/login",
                "{\"email\":\"" + email + "\",\"password\":\"Test-pass-123\"}");
        assertEquals(200, response.statusCode(), "Fixture user must log in through the real auth API");
        return client;
    }

    private HttpResponse<byte[]> send(HttpClient client, String method, String path, String json) throws Exception {
        var request = HttpRequest.newBuilder(base.resolve(path)).timeout(Duration.ofSeconds(45))
                .header("Origin", base.toString());
        if (json != null) request.header("Content-Type", "application/json");
        request.method(method, json == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
    }

    private void cleanup(Throwable testFailure) throws Exception {
        var failures = new ArrayList<Exception>();
        if (uploadAttempted && db != null) {
            // If upload timed out before returning mediaId, T21 still reserved its ID in this test schema.
            attemptCleanup(failures, "collect test upload IDs in " + schema, () -> {
                try (var statement = db.createStatement();
                     var rows = statement.executeQuery("SELECT public_id FROM media_assets WHERE user_id=2 AND module='REVIEW'")) {
                    while (rows.next()) {
                        String id = rows.getString(1);
                        if (!id.matches("pcstore/temp/review/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}"))
                            throw new IllegalStateException("Refusing cleanup of an unexpected public ID");
                        ownedPublicIds.add(id);
                    }
                }
            });
        }
        for (String publicId : ownedPublicIds) {
            attemptCleanup(failures, "Cloudinary delete " + publicId, () -> {
                if (!storage.delete(publicId)) throw new IllegalStateException("Cloudinary did not confirm deletion");
            });
        }
        for (HttpClient client : clients) attemptCleanup(failures, "HTTP client close", client::close);
        if (tomcat != null) {
            attemptCleanup(failures, "Tomcat stop", tomcat::stop);
            attemptCleanup(failures, "Tomcat destroy", tomcat::destroy);
        }
        if (factoryInstalled) attemptCleanup(failures, "restore previous persistence factory", () -> {
            var field = PersistenceManager.class.getDeclaredField("factory");
            field.setAccessible(true);
            field.set(null, previousFactory);
        });
        if (factory != null) attemptCleanup(failures, "test persistence factory close", factory::close);
        if (schemaCreated && db != null) attemptCleanup(failures, "schema drop " + schema, () -> {
            if (!schema.matches("t27_cloudinary_[a-f0-9]{32}"))
                throw new IllegalStateException("Refusing cleanup of an unexpected schema");
            sql("DROP SCHEMA " + schema + " CASCADE");
        });
        if (db != null) attemptCleanup(failures, "test database connection close", db::close);
        if (testFailure != null) {
            failures.forEach(testFailure::addSuppressed);
        } else if (!failures.isEmpty()) {
            Exception failure = failures.getFirst();
            failures.stream().skip(1).forEach(failure::addSuppressed);
            throw failure;
        }
    }

    private void attemptCleanup(List<Exception> failures, String label, CleanupAction action) {
        try {
            action.run();
            System.out.println("T27 Cloudinary cleanup OK: " + label);
        } catch (Exception error) {
            System.err.println("T27 Cloudinary cleanup FAILED: " + label);
            failures.add(new IllegalStateException("Cleanup failed: " + label, error));
        }
    }

    @FunctionalInterface
    private interface CleanupAction { void run() throws Exception; }

    private void sql(String query) throws SQLException {
        try (var statement = db.createStatement()) { statement.execute(query); }
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalStateException("Missing " + name);
        return value;
    }
}
