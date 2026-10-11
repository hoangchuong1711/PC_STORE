package com.pcstore.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.junit.jupiter.api.Assertions.assertEquals;

class CustomerAddressServletTest {
    private record Response(int status, JsonNode body) {}

    private Response request(String method, String path, String body, boolean loggedIn) throws Exception {
        ByteArrayInputStream input = new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8));
        ServletInputStream stream = new ServletInputStream() {
            @Override public int read() { return input.read(); }
            @Override public boolean isFinished() { return input.available() == 0; }
            @Override public boolean isReady() { return true; }
            @Override public void setReadListener(ReadListener listener) {}
        };
        HttpSession session = (HttpSession) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpSession.class}, (proxy, invocation, args) ->
                        "getAttribute".equals(invocation.getName())
                                ? (SessionUtil.USER_ID.equals(args[0]) ? 1 : "CUSTOMER") : null);
        HttpServletRequest req = (HttpServletRequest) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{HttpServletRequest.class}, (proxy, invocation, args) -> switch (invocation.getName()) {
                    case "getMethod" -> method;
                    case "getPathInfo" -> path;
                    case "getSession" -> loggedIn ? session : null;
                    case "getInputStream" -> stream;
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
        new CustomerAddressServlet().service(req, res);
        return new Response(status[0], output.toString().isEmpty() ? null : new ObjectMapper().readTree(output.toString()));
    }

    @Test
    void requiresSession() throws Exception {
        Response result = request("GET", null, "", false);
        assertEquals(401, result.status());
        assertEquals("UNAUTHORIZED", result.body().path("code").asText());
    }

    @Test
    void invalidBodyRejected() throws Exception {
        for (String body : new String[]{"{", "null", "{\"addressId\":1.5}"}) {
            Response result = request("POST", null, body, true);
            assertEquals(400, result.status());
        }
    }

    @Test
    void invalidIdRejected() throws Exception {
        Response result = request("GET", "/abc", "", true);
        assertEquals(400, result.status());
        assertEquals("INVALID_ID", result.body().path("code").asText());
    }
}
