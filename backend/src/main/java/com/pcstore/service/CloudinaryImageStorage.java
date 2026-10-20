package com.pcstore.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.exception.AppException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
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

/** Server-side signed upload; credentials and Cloudinary delivery URLs never go to clients. */
public final class CloudinaryImageStorage {
    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final URI apiOrigin;
    private final HttpClient http;
    private final ObjectMapper json = new ObjectMapper();

    public record StoredImage(String assetId, String publicId, long sizeBytes) {}

    // Nhận cấu hình từ backend để kết nối API Cloudinary, không ghi cứng khóa trong mã nguồn.
    public CloudinaryImageStorage(String cloudName, String apiKey, String apiSecret) {
        this(cloudName, apiKey, apiSecret, URI.create("https://api.cloudinary.com"));
    }

    // Kiểm tra cấu hình và cho phép đổi địa chỉ API để dùng máy chủ giả khi kiểm thử.
    CloudinaryImageStorage(String cloudName, String apiKey, String apiSecret, URI apiOrigin) {
        if (cloudName == null
                || !cloudName.matches("[A-Za-z0-9_-]+")
                || apiKey == null
                || apiKey.isBlank()
                || apiSecret == null
                || apiSecret.isBlank()) {
            throw new IllegalArgumentException("Cloudinary configuration is incomplete");
        }
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.apiOrigin = apiOrigin;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    // Gửi ảnh JPEG đã chuẩn hóa lên Cloudinary với mã file tạm do backend tạo.
    public StoredImage upload(byte[] jpeg, String publicId) {
        return uploadResource(jpeg, publicId, "image", "image/jpeg", "image.jpg");
    }

    // Gửi video MP4 đã chuẩn hóa, chỉ chấp nhận mã file thuộc module Review.
    public StoredImage uploadVideo(byte[] mp4, String publicId) {
        if (publicId == null || !publicId.startsWith("pcstore/temp/review/")) {
            throw new IllegalArgumentException("Review video requires a review public ID");
        }
        return uploadResource(mp4, publicId, "video", "video/mp4", "video.mp4");
    }

    // Ký yêu cầu, gửi file riêng tư (authenticated) và kiểm tra thông tin Cloudinary trả về.
    private StoredImage uploadResource(
            byte[] data,
            String publicId,
            String resourceType,
            String contentType,
            String filename) {
        if (data == null
                || data.length == 0
                || publicId == null
                || !publicId.matches("pcstore/temp/(setup|review)/[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("Invalid prepared media or temporary public ID");
        }
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        String signed = "public_id=" + publicId + "&timestamp=" + timestamp + "&type=authenticated";
        String signature = sign(signed);
        String boundary = "pcstore" + java.util.UUID.randomUUID().toString().replace("-", "");
        byte[] body =
                multipart(boundary, data, publicId, timestamp, signature, contentType, filename);
        URI url =
                apiOrigin.resolve(
                        "/v1_1/"
                                + URLEncoder.encode(cloudName, StandardCharsets.UTF_8)
                                + "/"
                                + resourceType
                                + "/upload");
        HttpRequest request =
                HttpRequest.newBuilder(url)
                        .timeout(Duration.ofSeconds(30))
                        .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                        .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                        .build();
        try {
            HttpResponse<String> response =
                    http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw unavailable(
                        "upload " + providerCategory(response.body()), response.statusCode());
            }
            JsonNode result = json.readTree(response.body());
            if (!publicId.equals(result.path("public_id").asText())
                    || !result.path("type").asText().equals("authenticated")
                    || !resourceType.equals(result.path("resource_type").asText())
                    || result.path("asset_id").asText().isBlank()) {
                throw unavailable();
            }
            return new StoredImage(
                    result.path("asset_id").asText(), publicId, result.path("bytes").asLong());
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException error) {
            throw unavailable();
        }
    }

    // Xóa ảnh riêng tư theo publicId; ảnh đã không còn cũng được xem là thành công.
    public boolean delete(String publicId) {
        return delete(publicId, "image");
    }

    // Ký yêu cầu xóa ảnh hoặc video trên Cloudinary; gọi lại sau khi đã xóa vẫn thành công.
    public boolean delete(String publicId, String resourceType) {
        if (publicId == null || !publicId.matches("pcstore/temp/(setup|review)/[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("Invalid temporary public ID");
        }
        if (resourceType == null || (!resourceType.equals("image") && !resourceType.equals("video"))) {
            throw new IllegalArgumentException("Invalid resource type");
        }
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        String signature =
                sign("public_id=" + publicId + "&timestamp=" + timestamp + "&type=authenticated");
        String body =
                "api_key="
                        + URLEncoder.encode(apiKey, StandardCharsets.UTF_8)
                        + "&public_id="
                        + URLEncoder.encode(publicId, StandardCharsets.UTF_8)
                        + "&timestamp="
                        + timestamp
                        + "&type=authenticated&signature="
                        + signature;
        URI url =
                apiOrigin.resolve(
                        "/v1_1/"
                                + URLEncoder.encode(cloudName, StandardCharsets.UTF_8)
                                + "/"
                                + resourceType
                                + "/destroy");
        HttpRequest request =
                HttpRequest.newBuilder(url)
                        .timeout(Duration.ofSeconds(30))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build();
        try {
            HttpResponse<String> response =
                    http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw unavailable("destroy", response.statusCode());
            }
            String result = json.readTree(response.body()).path("result").asText();
            if (result.equals("ok") || result.equals("not found")) {
                return true;
            }
            throw unavailable();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException error) {
            throw unavailable();
        }
    }

    // Backend ký yêu cầu tải file riêng tư và giới hạn số byte nhận về trước khi trả cho người xem.
    public byte[] download(String assetId, int maxBytes) {
        if (assetId == null
                || !assetId.matches("[A-Za-z0-9_-]+")
                || maxBytes < 1
                || maxBytes > 20_000_000) {
            throw new IllegalArgumentException("Invalid asset ID or download limit");
        }
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        String signature = sign("asset_id=" + assetId + "&timestamp=" + timestamp);
        URI url =
                apiOrigin.resolve(
                        "/v1_1/"
                                + cloudName
                                + "/asset/download?asset_id="
                                + URLEncoder.encode(assetId, StandardCharsets.UTF_8)
                                + "&api_key="
                                + URLEncoder.encode(apiKey, StandardCharsets.UTF_8)
                                + "&timestamp="
                                + timestamp
                                + "&signature="
                                + signature);
        HttpRequest request =
                HttpRequest.newBuilder(url).timeout(Duration.ofSeconds(30)).GET().build();
        try {
            HttpResponse<InputStream> response =
                    http.send(request, HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream stream = response.body()) {
                if (response.statusCode() / 100 != 2) {
                    throw unavailable("download", response.statusCode());
                }
                byte[] data = stream.readNBytes(maxBytes + 1);
                if (data.length > maxBytes) {
                    throw unavailable();
                }
                return data;
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException error) {
            throw unavailable();
        }
    }

    // Đóng gói file và các tham số xác thực thành body multipart/form-data để upload.
    private byte[] multipart(
            String boundary,
            byte[] data,
            String publicId,
            String timestamp,
            String signature,
            String contentType,
            String filename) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        field(out, boundary, "api_key", apiKey);
        field(out, boundary, "timestamp", timestamp);
        field(out, boundary, "public_id", publicId);
        field(out, boundary, "type", "authenticated");
        field(out, boundary, "signature", signature);
        write(
                out,
                "--"
                        + boundary
                        + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\""
                        + filename
                        + "\"\r\n"
                        + "Content-Type: "
                        + contentType
                        + "\r\n\r\n");
        out.writeBytes(data);
        write(out, "\r\n--" + boundary + "--\r\n");
        return out.toByteArray();
    }

    // Thêm một trường tên–giá trị vào body multipart gửi Cloudinary.
    private static void field(
            ByteArrayOutputStream out, String boundary, String name, String value) {
        write(
                out,
                "--"
                        + boundary
                        + "\r\nContent-Disposition: form-data; name=\""
                        + name
                        + "\"\r\n\r\n"
                        + value
                        + "\r\n");
    }

    // Ghi chuỗi thành byte UTF-8 khi tạo body HTTP.
    private static void write(ByteArrayOutputStream out, String value) {
        out.writeBytes(value.getBytes(StandardCharsets.UTF_8));
    }

    // Thêm API secret vào chuỗi tham số đã sắp theo tên rồi tạo chữ ký Cloudinary.
    private String sign(String parameters) {
        return sha1(parameters + apiSecret);
    }

    // Tạo chuỗi băm SHA-1 dạng hex để ký tham số theo giao thức Cloudinary.
    private static String sha1(String value) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-1")
                                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    // Tạo lỗi 502 khi backend không thể hoàn tất thao tác với Cloudinary.
    private static AppException unavailable() {
        return new AppException(502, "MEDIA_STORAGE_UNAVAILABLE", "Không thể lưu ảnh lúc này.");
    }

    // Tạo lỗi 502 và giữ tên thao tác, mã HTTP của Cloudinary để phục vụ ghi log.
    private static AppException unavailable(String operation, int status) {
        return new AppException(
                502,
                "MEDIA_STORAGE_UNAVAILABLE",
                "Không thể lưu ảnh lúc này.",
                new IllegalStateException("Cloudinary " + operation + " HTTP " + status));
    }

    // Rút gọn phản hồi lỗi Cloudinary thành nhóm nguyên nhân để ghi log.
    private String providerCategory(String responseBody) {
        try {
            String message =
                    json.readTree(responseBody)
                            .path("error")
                            .path("message")
                            .asText()
                            .toLowerCase(java.util.Locale.ROOT);
            if (message.contains("signature")) {
                return "invalid signature";
            }
            if (message.contains("permission")) {
                return "permission denied";
            }
            if (message.contains("disabled")) {
                return "account disabled";
            }
            if (message.contains("not allowed")) {
                return "operation not allowed";
            }
            if (message.contains("api key")) {
                return "api key rejected";
            }
            return "provider rejected";
        } catch (IOException error) {
            return "provider rejected";
        }
    }
}
