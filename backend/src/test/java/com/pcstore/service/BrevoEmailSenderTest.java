package com.pcstore.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import java.net.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class BrevoEmailSenderTest {
    HttpServer server;
    final List<String> bodies = new ArrayList<>();
    final List<String> keys = new ArrayList<>();
    final List<String> methods = new ArrayList<>();
    int status = 201;
    BrevoEmailSender mail;
    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v3/smtp/email", exchange -> {
            keys.add(exchange.getRequestHeaders().getFirst("api-key"));
            methods.add(exchange.getRequestMethod());
            bodies.add(new String(exchange.getRequestBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
            byte[] response = "{\"messageId\":\"test\"}".getBytes();
            exchange.sendResponseHeaders(status, response.length);
            exchange.getResponseBody().write(response); exchange.close();
        });
        server.start();
        mail = new BrevoEmailSender(true, "test-only-key", "sender@example.test", "PC Store",
                URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v3/smtp/email"));
    }
    @AfterEach void stop() { server.stop(0); }

    @Test void deliversWelcomeOtpAndChangeNoticeThroughJsonHttpApi() throws Exception {
        mail.welcome("a@example.test", "An <script>");
        mail.otp("a@example.test", "012345");
        mail.passwordChanged("a@example.test");
        assertEquals(List.of("POST", "POST", "POST"), methods);
        assertEquals(List.of("test-only-key", "test-only-key", "test-only-key"), keys);
        var json = new ObjectMapper();
        var welcome = json.readTree(bodies.get(0));
        assertEquals("sender@example.test", welcome.path("sender").path("email").asText());
        assertEquals("a@example.test", welcome.path("to").get(0).path("email").asText());
        assertTrue(welcome.path("textContent").asText().contains("An <script>"));
        assertFalse(welcome.has("htmlContent")); // Names remain text, never executable markup.
        assertTrue(json.readTree(bodies.get(1)).path("textContent").asText().contains("012345"));
        assertTrue(json.readTree(bodies.get(2)).path("textContent").asText().contains("đặt lại"));
    }

    @Test void providerFailureIsNotReportedAsSuccess() {
        status = 401;
        var failure = assertThrows(IllegalStateException.class, () -> mail.otp("a@example.test", "123456"));
        assertTrue(failure.getMessage().contains("401"));
        assertFalse(failure.getMessage().contains("test-only-key"));
    }

    @Test void disabledSenderDoesNotSendWelcomeAndRejectsOtp() {
        var disabled = new BrevoEmailSender(false, "key", "a@example.test", "PC", URI.create("http://127.0.0.1:1"));
        assertFalse(disabled.enabled());
        disabled.welcome("a@example.test", "A");
        assertThrows(IllegalStateException.class, () -> disabled.otp("a@example.test", "123456"));
        assertTrue(bodies.isEmpty());
    }
}
