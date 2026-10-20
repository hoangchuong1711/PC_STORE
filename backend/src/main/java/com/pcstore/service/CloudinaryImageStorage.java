package com.pcstore.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.exception.AppException;

/** Server-side signed upload; credentials and Cloudinary delivery URLs never go to clients. */
public final class CloudinaryImageStorage {
    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final URI apiOrigin;
    private final HttpClient http;
    private final ObjectMapper json = new ObjectMapper();

    public record StoredImage(String assetId, String publicId, long sizeBytes) { }

    // cấu hình Cloudinary được lấy từ biến môi trường, không hardcode trong mã nguồn
    public CloudinaryImageStorage(String cloudName, String apiKey, String apiSecret) {
        this(cloudName, apiKey, apiSecret, URI.create("https://api.cloudinary.com"));
    }

    // cấu hình Cloudinary có thể được tùy chỉnh, ví dụ để dùng với Cloudinary Private CDN
    CloudinaryImageStorage(String cloudName, String apiKey, String apiSecret, URI apiOrigin) {
        if (cloudName == null || !cloudName.matches("[A-Za-z0-9_-]+") || apiKey == null || apiKey.isBlank()
                || apiSecret == null || apiSecret.isBlank()) throw new IllegalArgumentException("Cloudinary configuration is incomplete");
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.apiOrigin = apiOrigin;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    // tải lên ảnh đã chuẩn bị (đã được chuẩn hóa và nén) với publicId tạm thời, trả về thông tin ảnh đã lưu
    public StoredImage upload(byte[] jpeg, String publicId) {
        return uploadResource(jpeg, publicId, "image", "image/jpeg", "image.jpg");
    }

    public StoredImage uploadVideo(byte[] mp4, String publicId) {
        if (publicId == null || !publicId.startsWith("pcstore/temp/review/"))
            throw new IllegalArgumentException("Review video requires a review public ID");
        return uploadResource(mp4, publicId, "video", "video/mp4", "video.mp4");
    }

    private StoredImage uploadResource(byte[] data, String publicId, String resourceType, String contentType, String filename) {
        if (data == null || data.length == 0 || publicId == null
                || !publicId.matches("pcstore/temp/(setup|review)/[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("Invalid prepared media or temporary public ID");
        }
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        String signed = "public_id=" + publicId + "&timestamp=" + timestamp + "&type=authenticated";
        String signature = sha1(signed + apiSecret);
        String boundary = "pcstore" + java.util.UUID.randomUUID().toString().replace("-", "");
        byte[] body = multipart(boundary, data, publicId, timestamp, signature, contentType, filename);
        URI url = apiOrigin.resolve("/v1_1/" + URLEncoder.encode(cloudName, StandardCharsets.UTF_8) + "/" + resourceType + "/upload");
        HttpRequest request = HttpRequest.newBuilder(url)
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body)).build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2)
                throw unavailable("upload " + providerCategory(response.body()), response.statusCode());
            JsonNode result = json.readTree(response.body());
            if (!publicId.equals(result.path("public_id").asText())
                    || !"authenticated".equals(result.path("type").asText())
                    || !resourceType.equals(result.path("resource_type").asText())
                    || result.path("asset_id").asText().isBlank()) throw unavailable();
            return new StoredImage(result.path("asset_id").asText(), publicId, result.path("bytes").asLong());
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException error) {
            throw unavailable();
        }
    }

    /** Idempotent removal of a temporary authenticated image. */
    public boolean delete(String publicId) {
        return delete(publicId, "image");
    }

    public boolean delete(String publicId, String resourceType) {
        if (publicId == null || !publicId.matches("pcstore/temp/(setup|review)/[A-Za-z0-9_-]+"))
            throw new IllegalArgumentException("Invalid temporary public ID");
        if (!"image".equals(resourceType) && !"video".equals(resourceType))
            throw new IllegalArgumentException("Invalid resource type");
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        String signature = sha1("public_id=" + publicId + "&timestamp=" + timestamp + "&type=authenticated" + apiSecret);
        String body = "api_key=" + URLEncoder.encode(apiKey, StandardCharsets.UTF_8)
                + "&public_id=" + URLEncoder.encode(publicId, StandardCharsets.UTF_8)
                + "&timestamp=" + timestamp + "&type=authenticated&signature=" + signature;
        URI url = apiOrigin.resolve("/v1_1/" + URLEncoder.encode(cloudName, StandardCharsets.UTF_8) + "/" + resourceType + "/destroy");
        HttpRequest request = HttpRequest.newBuilder(url)
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) throw unavailable("destroy", response.statusCode());
            String result = json.readTree(response.body()).path("result").asText();
            if ("ok".equals(result) || "not found".equals(result)) return true;
            throw unavailable();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException error) {
            throw unavailable();
        }
    }

    /** Backend-only private download. A strict byte bound protects the app from oversized upstream data. */
    public byte[] download(String assetId, int maxBytes) {
        if (assetId == null || !assetId.matches("[A-Za-z0-9_-]+") || maxBytes < 1 || maxBytes > 20_000_000)
            throw new IllegalArgumentException("Invalid asset ID or download limit");
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        String signature = sha1("asset_id=" + assetId + "&timestamp=" + timestamp + apiSecret);
        URI url = apiOrigin.resolve("/v1_1/" + cloudName + "/asset/download?asset_id="
                + URLEncoder.encode(assetId, StandardCharsets.UTF_8) + "&api_key="
                + URLEncoder.encode(apiKey, StandardCharsets.UTF_8) + "&timestamp=" + timestamp
                + "&signature=" + signature);
        var request = HttpRequest.newBuilder(url).timeout(Duration.ofSeconds(30)).GET().build();
        try {
            var response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
            try (var stream = response.body()) {
                if (response.statusCode() / 100 != 2) throw unavailable("download", response.statusCode());
                byte[] data = stream.readNBytes(maxBytes + 1);
                if (data.length > maxBytes) throw unavailable();
                return data;
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException error) {
            throw unavailable();
        }
    }

    private byte[] multipart(String boundary, byte[] data, String publicId, String timestamp, String signature,
                             String contentType, String filename) {
        var out = new ByteArrayOutputStream();
        field(out, boundary, "api_key", apiKey);
        field(out, boundary, "timestamp", timestamp);
        field(out, boundary, "public_id", publicId);
        field(out, boundary, "type", "authenticated");
        field(out, boundary, "signature", signature);
        write(out, "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n"
                + "Content-Type: " + contentType + "\r\n\r\n");
        out.writeBytes(data);
        write(out, "\r\n--" + boundary + "--\r\n");
        return out.toByteArray();
    }

    private static void field(ByteArrayOutputStream out, String boundary, String name, String value) {
        write(out, "--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name + "\"\r\n\r\n" + value + "\r\n");
    }

    private static void write(ByteArrayOutputStream out, String value) {
        out.writeBytes(value.getBytes(StandardCharsets.UTF_8));
    }

    private static String sha1(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private static AppException unavailable() {
        return new AppException(502, "MEDIA_STORAGE_UNAVAILABLE", "Không thể lưu ảnh lúc này.");
    }

    private static AppException unavailable(String operation, int status) {
        return new AppException(502, "MEDIA_STORAGE_UNAVAILABLE", "Không thể lưu ảnh lúc này.",
                new IllegalStateException("Cloudinary " + operation + " HTTP " + status));
    }

    private String providerCategory(String responseBody) {
        try {
            String message = json.readTree(responseBody).path("error").path("message").asText().toLowerCase(java.util.Locale.ROOT);
            if (message.contains("signature")) return "invalid signature";
            if (message.contains("permission")) return "permission denied";
            if (message.contains("disabled")) return "account disabled";
            if (message.contains("not allowed")) return "operation not allowed";
            if (message.contains("api key")) return "api key rejected";
            return "provider rejected";
        } catch (IOException error) { return "provider rejected"; }
    }
}
