package com.pcstore.service;

import com.sun.net.httpserver.HttpServer;
import com.pcstore.config.PersistenceManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class MediaUploadServiceIT {
    @Test void uploadsValidatedImageAndRecordsTemporaryOwner() throws Exception {
        String base = System.getenv("TEST_DB_URL");
        String user = System.getenv("TEST_DB_USER");
        String password = System.getenv("TEST_DB_PASSWORD");
        String schema = "t21_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(base, user, password); var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            try {
                String url = base + (base.contains("?") ? "&" : "?") + "currentSchema=" + schema;
                var emf = PersistenceManager.createEntityManagerFactory(url, user, password);
                try {
                    statement.execute("SET search_path TO " + schema);
                    statement.execute("INSERT INTO users(full_name,email,password_hash,role,status) VALUES ('A','a@demo.test','hash','CUSTOMER','ACTIVE')");
                    AtomicInteger uploads = new AtomicInteger();
                    HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
                    server.createContext("/v1_1/demo/image/upload", exchange -> {
                        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1);
                        String marker = "name=\"public_id\"\r\n\r\n";
                        int from = body.indexOf(marker) + marker.length();
                        String publicId = body.substring(from, body.indexOf("\r\n", from));
                        byte[] response = ("{\"asset_id\":\"cloud-" + uploads.incrementAndGet() + "\",\"public_id\":\"" + publicId
                                + "\",\"type\":\"authenticated\",\"resource_type\":\"image\",\"bytes\":100}")
                                .getBytes(StandardCharsets.UTF_8);
                        exchange.sendResponseHeaders(200, response.length);
                        exchange.getResponseBody().write(response);
                        exchange.close();
                    });
                    server.createContext("/v1_1/demo/video/upload", exchange -> {
                        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1);
                        String marker = "name=\"public_id\"\r\n\r\n";
                        int from = body.indexOf(marker) + marker.length();
                        String publicId = body.substring(from, body.indexOf("\r\n", from));
                        byte[] response = ("{\"asset_id\":\"video-1\",\"public_id\":\"" + publicId
                                + "\",\"type\":\"authenticated\",\"resource_type\":\"video\",\"bytes\":4}")
                                .getBytes(StandardCharsets.UTF_8);
                        exchange.sendResponseHeaders(200, response.length);
                        exchange.getResponseBody().write(response);
                        exchange.close();
                    });
                    server.start();
                    try {
                        var storage = new CloudinaryImageStorage("demo", "key", "secret",
                                URI.create("http://127.0.0.1:" + server.getAddress().getPort()));
                        var service = new MediaUploadService(emf, new MediaImageService(), storage);
                        byte[] sample = png();
                        var result = service.upload(1, "SETUP", sample, "image/png");
                        assertEquals("TEMP", result.status());
                        assertEquals("SETUP", result.module());
                        assertEquals(1, count(statement, "SELECT count(*) FROM media_assets WHERE media_id='" + result.mediaId()
                                + "' AND user_id=1 AND status='TEMP' AND cloudinary_asset_id='cloud-1'"));
                        assertEquals(0, count(statement, "SELECT count(*) FROM media_assets WHERE status='UPLOADING'"));
                        var videos = new MediaUploadService(emf, new MediaImageService(), storage,
                                (data, mime) -> new MediaVideoService.PreparedVideo(new byte[]{1, 2, 3, 4}, 720, 480, 10));
                        var video = videos.uploadVideo(1, "REVIEW", new byte[]{1}, "video/mp4");
                        assertEquals(1, count(statement, "SELECT count(*) FROM media_assets WHERE media_id='" + video.mediaId()
                                + "' AND mime_type='video/mp4' AND duration_second=10 AND status='TEMP'"));
                        for (int n = 0; n < 10; n++) {
                            UUID id = UUID.randomUUID();
                            statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,created_at,expires_at) VALUES ('"
                                    + id + "',1,'SETUP','TEMP','pcstore/temp/setup/" + id
                                    + "','asset-" + id + "','image/jpeg',100,4,4,now(),now()+interval '2 hours')");
                        }
                        var tempLimit = assertThrows(com.pcstore.exception.AppException.class,
                                () -> service.upload(1, "SETUP", sample, "image/png"));
                        assertEquals("MEDIA_TEMP_LIMIT", tempLimit.getCode());
                        AtomicInteger transcodes = new AtomicInteger();
                        var videoBeforeQuota = new MediaUploadService(emf, new MediaImageService(), storage,
                                (data, mime) -> {
                                    transcodes.incrementAndGet();
                                    return new MediaVideoService.PreparedVideo(new byte[]{1}, 720, 480, 1);
                                });
                        var videoLimit = assertThrows(com.pcstore.exception.AppException.class,
                                () -> videoBeforeQuota.uploadVideo(1, "REVIEW", new byte[]{1}, "video/mp4"));
                        assertEquals("MEDIA_TEMP_LIMIT", videoLimit.getCode());
                        assertEquals(0, transcodes.get());
                        statement.execute("UPDATE media_assets SET status='DELETED' WHERE status='TEMP'");
                        UUID large = UUID.randomUUID();
                        statement.execute("INSERT INTO media_assets(media_id,user_id,module,status,public_id,cloudinary_asset_id,mime_type,size_bytes,width,height,created_at,expires_at,attached_at) VALUES ('"
                                + large + "',1,'SETUP','ATTACHED','pcstore/temp/setup/" + large
                                + "','asset-" + large + "','image/jpeg',100000000,4,4,now(),now()+interval '2 hours',now())");
                        var byteLimit = assertThrows(com.pcstore.exception.AppException.class,
                                () -> service.upload(1, "SETUP", sample, "image/png"));
                        assertEquals("MEDIA_DAILY_BYTES_LIMIT", byteLimit.getCode());
                    } finally {
                        server.stop(0);
                    }
                } finally {
                    emf.close();
                }
            } finally {
                statement.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    private static byte[] png() throws Exception {
        var out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", out);
        return out.toByteArray();
    }

    private static int count(java.sql.Statement statement, String sql) throws Exception {
        try (var rows = statement.executeQuery(sql)) { rows.next(); return rows.getInt(1); }
    }
}
