package com.pcstore.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

/** HTTPS only. Never log provider response bodies, API keys or message contents. */
public class BrevoEmailSender {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpClient CLIENT = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final String key, from, name;
    private final URI endpoint;

    public static BrevoEmailSender fromEnvironment() {
        var env = System.getenv();
        return new BrevoEmailSender(env.get("BREVO_API_KEY"), env.get("MAIL_FROM_EMAIL"),
                env.getOrDefault("MAIL_FROM_NAME", "PC Store"),
                URI.create("https://api.brevo.com/v3/smtp/email"));
    }

    public BrevoEmailSender(String key, String from, String name, URI endpoint) {
        this.key = key;
        this.from = from;
        this.name = name;
        this.endpoint = endpoint;
    }
    public boolean isConfigured() {
        return key != null && !key.isBlank() && from != null && !from.isBlank();
    }
    public void welcome(String email, String fullName) {
        send(email, "Chào mừng bạn đến với PC Store!", "Xin chào " + fullName
                + ",\n\nCảm ơn bạn đã đăng ký tài khoản PC Store. Tài khoản của bạn đã được tạo thành công."
                + "\nBạn có thể đăng nhập và khám phá các sản phẩm ngay.\n\nPC Store");
    }
    public void otp(String email, String code) {
        send(email, "PC Store - Mã đặt lại mật khẩu", "Mã OTP của bạn là: " + code
                + "\n\nMã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai."
                + "\nNếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.\n\nPC Store");
    }
    public void passwordChanged(String email) {
        send(email, "PC Store - Mật khẩu đã được thay đổi", """
                Mật khẩu tài khoản PC Store của bạn vừa được đặt lại.
                Các phiên đăng nhập cũ đã hết hiệu lực.
                Nếu không phải bạn thực hiện, hãy đặt lại mật khẩu và liên hệ bộ phận hỗ trợ PC Store.
                """.stripTrailing());
    }
    private void send(String email, String subject, String text) {
        if (!isConfigured()) {
            throw new IllegalStateException("Email service is not configured");
        }
        try {
            // tạo nội dung JSON cho yêu cầu gửi email
            String body = JSON.writeValueAsString(Map.of(
                "sender", Map.of("name", name, "email", from),
                "to", List.of(Map.of("email", email)),
                "subject", subject,
                "textContent", text));

            // tạo yêu cầu HTTP POST đến API của Brevo
            var request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(8))
                    .header("api-key", key)
                    .header("accept", "application/json")
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            // gửi yêu cầu và kiểm tra mã trạng thái HTTP
            int status = CLIENT.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();

            if (status < 200 || status >= 300) {
                throw new IllegalStateException("Brevo rejected email (HTTP " + status + ")");
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Email request interrupted");
        } catch (java.io.IOException error) {
            throw new IllegalStateException("Email service unavailable");
        }
    }
}
