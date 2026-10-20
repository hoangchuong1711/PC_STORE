package com.pcstore.service;

import com.pcstore.config.PersistenceManager;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class MediaCleanupServiceIT {
    @Test void retriesFailedDeleteAfterOneMinuteAndTreatsNotFoundAsSuccess() throws Exception {
        String base = System.getenv("TEST_DB_URL");
        String user = System.getenv("TEST_DB_USER");
        String password = System.getenv("TEST_DB_PASSWORD");
        String schema = "t21_" + UUID.randomUUID().toString().replace("-", "");
        LocalDateTime now = LocalDateTime.of(2026, 10, 7, 12, 0);
        try (var connection = DriverManager.getConnection(base, user, password); var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            try {
                String url = base + (base.contains("?") ? "&" : "?") + "currentSchema=" + schema;
                var emf = PersistenceManager.createEntityManagerFactory(url, user, password);
                try {
                    statement.execute("SET search_path TO " + schema);
                    statement.execute("INSERT INTO users(full_name,email,password_hash,role,status) VALUES ('A','a@demo.test','hash','CUSTOMER','ACTIVE')");
                    insert(statement, "33333333-3333-3333-3333-333333333333", "TEMP", "retry", "2026-10-07 10:00:00", null);
                    AtomicInteger calls = new AtomicInteger();
                    HttpServer cloudinary = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
                    cloudinary.createContext("/v1_1/demo/image/destroy", exchange -> {
                        int attempt = calls.incrementAndGet();
                        byte[] response = (attempt == 1 ? "{\"error\":\"temporary\"}" : "{\"result\":\"not found\"}")
                                .getBytes(StandardCharsets.UTF_8);
                        exchange.sendResponseHeaders(attempt == 1 ? 503 : 200, response.length);
                        exchange.getResponseBody().write(response);
                        exchange.close();
                    });
                    cloudinary.start();
                    try {
                        var storage = new CloudinaryImageStorage("demo", "key", "secret",
                                URI.create("http://127.0.0.1:" + cloudinary.getAddress().getPort()));
                        var cleanup = new MediaCleanupService(emf, storage);
                        assertEquals(0, cleanup.runOnce(now));
                        assertEquals("DELETE_PENDING", status(statement, "33333333-3333-3333-3333-333333333333"));
                        assertEquals(0, cleanup.runOnce(now.plusSeconds(30)));
                        assertEquals(1, calls.get());
                        assertEquals(1, cleanup.runOnce(now.plusMinutes(1)));
                        assertEquals(2, calls.get());
                        assertEquals("DELETED", status(statement, "33333333-3333-3333-3333-333333333333"));
                    } finally { cloudinary.stop(0); }
                } finally { emf.close(); }
            } finally { statement.execute("DROP SCHEMA " + schema + " CASCADE"); }
        }
    }

    @Test void removesExpiredTempButKeepsAttachedMedia() throws Exception {
        String base = System.getenv("TEST_DB_URL");
        String user = System.getenv("TEST_DB_USER");
        String password = System.getenv("TEST_DB_PASSWORD");
        String schema = "t21_" + UUID.randomUUID().toString().replace("-", "");
        LocalDateTime now = LocalDateTime.of(2026, 10, 7, 12, 0);
        try (var connection = DriverManager.getConnection(base, user, password); var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            try {
                String url = base + (base.contains("?") ? "&" : "?") + "currentSchema=" + schema;
                var emf = PersistenceManager.createEntityManagerFactory(url, user, password);
                try {
                    statement.execute("SET search_path TO " + schema);
                    statement.execute("INSERT INTO users(full_name,email,password_hash,role,status) VALUES ('A','a@demo.test','hash','CUSTOMER','ACTIVE')");
                    insert(statement, "11111111-1111-1111-1111-111111111111", "TEMP", "expired", "2026-10-07 10:00:00", null);
                    insert(statement, "22222222-2222-2222-2222-222222222222", "ATTACHED", "attached", "2026-10-07 10:00:00", "2026-10-07 11:00:00");
                    statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,duration_second,resource_type,created_at,expires_at) "
                            + "VALUES ('88888888-8888-8888-8888-888888888888',1,'REVIEW','TEMP','pcstore/temp/review/expired-video','video-asset','video/mp4',1000,720,480,10,'video','2026-10-07 09:00:00','2026-10-07 10:00:00')");
                    AtomicInteger deletes = new AtomicInteger();
                    AtomicInteger videoDeletes = new AtomicInteger();
                    HttpServer cloudinary = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
                    cloudinary.createContext("/v1_1/demo/image/destroy", exchange -> {
                        deletes.incrementAndGet();
                        byte[] response = "{\"result\":\"ok\"}".getBytes(StandardCharsets.UTF_8);
                        exchange.sendResponseHeaders(200, response.length);
                        exchange.getResponseBody().write(response);
                        exchange.close();
                    });
                    cloudinary.createContext("/v1_1/demo/video/destroy", exchange -> {
                        deletes.incrementAndGet();
                        videoDeletes.incrementAndGet();
                        byte[] response = "{\"result\":\"ok\"}".getBytes(StandardCharsets.UTF_8);
                        exchange.sendResponseHeaders(200, response.length);
                        exchange.getResponseBody().write(response);
                        exchange.close();
                    });
                    cloudinary.start();
                    try {
                        var storage = new CloudinaryImageStorage("demo", "key", "secret",
                                URI.create("http://127.0.0.1:" + cloudinary.getAddress().getPort()));
                        assertEquals(2, new MediaCleanupService(emf, storage).runOnce(now));
                        assertEquals(2, deletes.get());
                        assertEquals(1, videoDeletes.get());
                        assertEquals("DELETED", status(statement, "11111111-1111-1111-1111-111111111111"));
                        assertEquals("ATTACHED", status(statement, "22222222-2222-2222-2222-222222222222"));
                        assertEquals("DELETED", status(statement, "88888888-8888-8888-8888-888888888888"));
                    } finally { cloudinary.stop(0); }
                } finally { emf.close(); }
            } finally { statement.execute("DROP SCHEMA " + schema + " CASCADE"); }
        }
    }

    private static void insert(java.sql.Statement statement, String id, String status, String name,
                               String expires, String attached) throws Exception {
        statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,created_at,expires_at,attached_at) VALUES ('"
                + id + "',1,'SETUP','" + status + "','pcstore/temp/setup/" + name
                + "','asset-" + name + "','image/jpeg',100,4,4,'2026-10-07 09:00:00','" + expires + "',"
                + (attached == null ? "NULL" : "'" + attached + "'") + ")");
    }

    private static String status(java.sql.Statement statement, String id) throws Exception {
        try (var rows = statement.executeQuery("SELECT status FROM media_assets WHERE media_id='" + id + "'")) {
            rows.next();
            return rows.getString(1);
        }
    }
}
