package com.pcstore.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class CloudinaryImageStorageTest {
    @Test void uploadsAndDeletesAuthenticatedReviewVideo() throws Exception {
        var requests = new AtomicReference<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1_1/demo/video/upload", exchange -> {
            requests.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1));
            byte[] result = "{\"asset_id\":\"vid-1\",\"public_id\":\"pcstore/temp/review/test\",\"type\":\"authenticated\",\"resource_type\":\"video\",\"bytes\":4}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, result.length);
            exchange.getResponseBody().write(result);
            exchange.close();
        });
        server.createContext("/v1_1/demo/video/destroy", exchange -> {
            byte[] result = "{\"result\":\"ok\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, result.length);
            exchange.getResponseBody().write(result);
            exchange.close();
        });
        server.start();
        try {
            var storage = new CloudinaryImageStorage("demo", "key", "secret",
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort()));
            assertEquals("vid-1", storage.uploadVideo(new byte[]{1, 2, 3, 4}, "pcstore/temp/review/test").assetId());
            assertTrue(requests.get().contains("Content-Type: video/mp4"));
            assertTrue(storage.delete("pcstore/temp/review/test", "video"));
        } finally { server.stop(0); }
    }
    @Test void downloadsPrivateAssetByIdWithSignedRequest() throws Exception {
        var query = new AtomicReference<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1_1/demo/asset/download", exchange -> {
            query.set(exchange.getRequestURI().getRawQuery());
            byte[] body = new byte[]{1, 2, 3};
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            var storage = new CloudinaryImageStorage("demo", "key", "secret",
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort()));
            assertArrayEquals(new byte[]{1, 2, 3}, storage.download("asset-123", 1_000_000));
            assertEquals("asset-123", urlField(query.get(), "asset_id"));
            String timestamp = urlField(query.get(), "timestamp");
            String expected = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(
                    ("asset_id=asset-123&timestamp=" + timestamp + "secret").getBytes(StandardCharsets.UTF_8)));
            assertEquals(expected, urlField(query.get(), "signature"));
        } finally { server.stop(0); }
    }
    @Test void deletesAuthenticatedImageWithSignedRequest() throws Exception {
        var received = new AtomicReference<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1_1/demo/image/destroy", exchange -> {
            received.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] response = "{\"result\":\"ok\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        try {
            var storage = new CloudinaryImageStorage("demo", "key", "secret",
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort()));
            assertTrue(storage.delete("pcstore/temp/setup/test"));
            String body = received.get();
            assertNotNull(body);
            assertTrue(body.contains("type=authenticated"));
            assertTrue(body.contains("public_id=pcstore%2Ftemp%2Fsetup%2Ftest"));
            String timestamp = urlField(body, "timestamp");
            String expected = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(
                    ("public_id=pcstore/temp/setup/test&timestamp=" + timestamp + "&type=authenticatedsecret")
                            .getBytes(StandardCharsets.UTF_8)));
            assertEquals(expected, urlField(body, "signature"));
        } finally {
            server.stop(0);
        }
    }

    private static String urlField(String body, String name) {
        for (String part : body.split("&")) if (part.startsWith(name + "=")) return part.substring(name.length() + 1);
        fail("Missing " + name);
        return "";
    }

    @Test void uploadsAuthenticatedImageWithSignedParameters() throws Exception {
        var received = new AtomicReference<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1_1/demo/image/upload", exchange -> {
            received.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1));
            var response = "{\"asset_id\":\"asset-123\",\"public_id\":\"pcstore/temp/setup/test\",\"type\":\"authenticated\",\"resource_type\":\"image\",\"bytes\":4}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        try {
            var storage = new CloudinaryImageStorage("demo", "key", "secret",
                    URI.create("http://127.0.0.1:" + server.getAddress().getPort()));
            var result = storage.upload(new byte[]{1, 2, 3, 4}, "pcstore/temp/setup/test");
            assertEquals("asset-123", result.assetId());
            assertEquals("pcstore/temp/setup/test", result.publicId());
            var body = received.get();
            assertNotNull(body);
            assertTrue(body.contains("name=\"type\"\r\n\r\nauthenticated"));
            assertTrue(body.contains("name=\"api_key\"\r\n\r\nkey"));
            assertTrue(body.contains("name=\"file\""));
            assertFalse(body.contains("secret"));
            var timestamp = field(body, "timestamp");
            assertTrue(Math.abs(Instant.now().getEpochSecond() - Long.parseLong(timestamp)) < 60);
            var expected = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(
                    ("public_id=pcstore/temp/setup/test&timestamp=" + timestamp + "&type=authenticatedsecret")
                            .getBytes(StandardCharsets.UTF_8)));
            assertEquals(expected, field(body, "signature"));
        } finally {
            server.stop(0);
        }
    }

    private static String field(String body, String name) {
        var start = body.indexOf("name=\"" + name + "\"\r\n\r\n");
        assertTrue(start >= 0, name);
        start += ("name=\"" + name + "\"\r\n\r\n").length();
        return body.substring(start, body.indexOf("\r\n", start));
    }
}
