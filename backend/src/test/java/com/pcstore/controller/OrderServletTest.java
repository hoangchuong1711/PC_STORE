package com.pcstore.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcstore.dto.VNPayUrlResponse;
import com.pcstore.service.OrderService;
import com.pcstore.service.VNPayPaymentService;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class OrderServletTest {
    private record Response(int status, JsonNode body) {
    }

    @Test
    void paymentActionId_parsesCorrectly() {
        assertEquals(12, OrderServlet.paymentActionId("12/payment/vnpay-url", "vnpay-url"));
        assertNull(OrderServlet.paymentActionId("12/cancel", "vnpay-url"));
        assertNull(OrderServlet.paymentActionId("12", "vnpay-url"));
        assertNull(OrderServlet.paymentActionId("-1/payment/vnpay-url", "vnpay-url"));
        assertNull(OrderServlet.paymentActionId("abc/payment/vnpay-url", "vnpay-url"));
        assertNull(OrderServlet.paymentActionId(null, "vnpay-url"));
    }

    @Test
    void unauthenticatedPaymentUrlRequest_returns401() throws Exception {
        Response response = executeRequest("POST", "/15/payment/vnpay-url", false, null);
        assertEquals(401, response.status());
        assertEquals("UNAUTHORIZED", response.body().path("code").asText());
    }

    @Test
    void authenticatedPaymentUrlRequest_returnsPaymentUrlResponse() throws Exception {
        VNPayPaymentService mockService = new VNPayPaymentService(null, null) {
            @Override
            public VNPayUrlResponse createPaymentUrl(int userId, int orderId, String clientIp) {
                return new VNPayUrlResponse(
                        orderId,
                        "VNPAY",
                        "PCS_15_1_123456789",
                        "https://sandbox.vnpayment.vn/test-url",
                        LocalDateTime.of(2026, 10, 9, 20, 0, 0)
                );
            }
        };

        OrderServlet servlet = new OrderServlet(null, mockService);
        Response response = executeWithServlet(servlet, "POST", "/15/payment/vnpay-url", true, "");

        assertEquals(200, response.status());
        assertEquals(15, response.body().path("orderId").asInt());
        assertEquals("VNPAY", response.body().path("paymentMethod").asText());
        assertEquals("PCS_15_1_123456789", response.body().path("referenceCode").asText());
        assertEquals("https://sandbox.vnpayment.vn/test-url", response.body().path("paymentUrl").asText());
    }

    private Response executeRequest(String method, String path, boolean loggedIn, String body) throws Exception {
        return executeWithServlet(new OrderServlet(), method, path, loggedIn, body);
    }

    private Response executeWithServlet(OrderServlet servlet, String method, String path, boolean loggedIn, String body) throws Exception {
        byte[] bytes = (body != null ? body : "").getBytes(StandardCharsets.UTF_8);
        ByteArrayInputStream input = new ByteArrayInputStream(bytes);
        ServletInputStream stream = new ServletInputStream() {
            @Override public int read() { return input.read(); }
            @Override public boolean isFinished() { return input.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener listener) { }
        };
        HttpSession session = (HttpSession) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpSession.class}, (proxy, invocation, args) -> {
                    if ("getAttribute".equals(invocation.getName()))
                        return SessionUtil.USER_ID.equals(args[0]) ? 1 : "CUSTOMER";
                    return null;
                });
        HttpServletRequest req = (HttpServletRequest) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletRequest.class}, (proxy, invocation, args) -> switch (invocation.getName()) {
                    case "getMethod" -> method;
                    case "getPathInfo" -> path;
                    case "getSession" -> loggedIn ? session : null;
                    case "getInputStream" -> stream;
                    case "getRemoteAddr" -> "127.0.0.1";
                    case "getHeader" -> null;
                    default -> null;
                });
        int[] status = {200};
        StringWriter output = new StringWriter();
        HttpServletResponse res = (HttpServletResponse) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletResponse.class}, (proxy, invocation, args) -> {
                    if ("setStatus".equals(invocation.getName())) status[0] = (Integer) args[0];
                    if ("getWriter".equals(invocation.getName())) return new PrintWriter(output);
                    return null;
                });

        servlet.service(req, res);
        return new Response(status[0], new ObjectMapper().readTree(output.toString()));
    }
}
